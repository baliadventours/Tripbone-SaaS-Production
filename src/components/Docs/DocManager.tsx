import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Save, Trash2, Edit3, Image as ImageIcon, Upload, 
  Layers, Check, Sparkles, AlertCircle, Loader2, ListOrdered, BookOpen
} from 'lucide-react';
import { db, collection, addDoc, updateDoc, doc, deleteDoc, onSnapshot, serverTimestamp } from '../../lib/firebase';
import { uploadImage } from '../../lib/imgbb';
import { DocArticle } from './DocViewer';
import { sanitizeFirestoreData } from '../../services/payment/PaymentService';

interface DocManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DocManager({ isOpen, onClose }: DocManagerProps) {
  const [articles, setArticles] = useState<DocArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Editing form state
  const [form, setForm] = useState<Partial<DocArticle>>({
    title: '',
    subTitle: '',
    subSubTitle: '',
    category: 'Getting Started',
    description: '',
    content: '',
    steps: [{ title: '', desc: '', image: '' }],
    images: [],
    order: 1,
    status: 'published'
  });

  // Load articles real-time
  useEffect(() => {
    if (!isOpen) return;
    const q = collection(db, 'documentation_articles');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as DocArticle[];
      list.sort((a, b) => (a.order || 0) - (b.order || 0));
      setArticles(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleEditArticle = (art: DocArticle) => {
    setForm({
      ...art,
      steps: art.steps && art.steps.length > 0 ? art.steps : [{ title: '', desc: '', image: '' }],
      images: art.images || []
    });
    setIsEditing(true);
  };

  const handleCreateNew = () => {
    setForm({
      title: '',
      subTitle: '',
      subSubTitle: '',
      category: 'Getting Started',
      description: '',
      content: '',
      steps: [{ title: '', desc: '', image: '' }],
      images: [],
      order: (articles.length + 1),
      status: 'published'
    });
    setIsEditing(true);
  };

  const handleStepChange = (index: number, field: string, val: string) => {
    const nextSteps = [...(form.steps || [])];
    nextSteps[index] = { ...nextSteps[index], [field]: val };
    setForm({ ...form, steps: nextSteps });
  };

  const handleAddStep = () => {
    setForm({
      ...form,
      steps: [...(form.steps || []), { title: '', desc: '', image: '' }]
    });
  };

  const handleRemoveStep = (index: number) => {
    const nextSteps = (form.steps || []).filter((_, i) => i !== index);
    setForm({ ...form, steps: nextSteps });
  };

  // Image Upload helper
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetStepIndex?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const url = await uploadImage(file);
      if (targetStepIndex !== undefined) {
        handleStepChange(targetStepIndex, 'image', url);
      } else {
        setForm(prev => ({ ...prev, images: [...(prev.images || []), url] }));
      }
    } catch (err) {
      console.error("Failed to upload image:", err);
      alert("Error uploading image. Please check image format.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.category) {
      alert("Please provide a Title and Category.");
      return;
    }

    setIsSaving(true);
    try {
      const slug = form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      const filteredSteps = (form.steps || []).filter(s => s.title.trim() || s.desc.trim());

      const payload = sanitizeFirestoreData({
        slug,
        title: form.title,
        subTitle: form.subTitle || '',
        subSubTitle: form.subSubTitle || '',
        category: form.category,
        description: form.description || '',
        content: form.content || '',
        steps: filteredSteps,
        images: form.images || [],
        order: Number(form.order) || 1,
        status: form.status || 'published',
        updatedAt: new Date().toISOString()
      });

      if (form.id) {
        await updateDoc(doc(db, 'documentation_articles', form.id), payload);
      } else {
        await addDoc(collection(db, 'documentation_articles'), {
          ...payload,
          createdAt: serverTimestamp()
        });
      }

      setIsEditing(false);
      setForm({});
    } catch (err) {
      console.error("Error saving documentation article:", err);
      alert("Failed to save article.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Delete documentation article "${title}"?`)) {
      try {
        await deleteDoc(doc(db, 'documentation_articles', id));
      } catch (err) {
        console.error("Error deleting article:", err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl text-slate-100 overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/80 sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Documentation Manager</h2>
              <p className="text-xs text-slate-400">Manage docs.tripbone.com titles, subtitles, steps, and image uploads.</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!isEditing && (
              <button
                onClick={handleCreateNew}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-cyan-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>New Article</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">
                  {form.id ? 'Edit Documentation Page' : 'Create New Documentation Page'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-slate-400 hover:text-white underline"
                >
                  Cancel
                </button>
              </div>

              {/* Title, Sub Title, Sub-Sub Title Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1 md:col-span-3">
                  <label className="text-xs font-bold text-slate-300">Article Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Getting Started with Tripbone SaaS"
                    value={form.title || ''}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Sub Title</label>
                  <input
                    type="text"
                    placeholder="e.g. System Overview"
                    value={form.subTitle || ''}
                    onChange={(e) => setForm({ ...form, subTitle: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Sub - Sub Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Prerequisites & Setup"
                    value={form.subSubTitle || ''}
                    onChange={(e) => setForm({ ...form, subSubTitle: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Category *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Getting Started"
                    value={form.category || ''}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Description & HTML/Markdown Body */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Short Summary / Description</label>
                  <textarea
                    rows={2}
                    placeholder="A brief summary shown at the top and in search cards..."
                    value={form.description || ''}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Full Article Description / Body (HTML / Markdown)</label>
                  <textarea
                    rows={6}
                    placeholder="<p>Full detailed guide content...</p>"
                    value={form.content || ''}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Step-by-Step Builder */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                    <ListOrdered className="w-4 h-4" /> Step-by-Step Instructions
                  </label>
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Step
                  </button>
                </div>

                <div className="space-y-3">
                  {(form.steps || []).map((step, idx) => (
                    <div key={idx} className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 space-y-3 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400">Step {idx + 1}</span>
                        {(form.steps || []).length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveStep(idx)}
                            className="text-red-400 hover:text-red-300 text-xs"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        placeholder="Step Title (e.g., Step 1: Open Settings)"
                        value={step.title}
                        onChange={(e) => handleStepChange(idx, 'title', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      />

                      <textarea
                        rows={2}
                        placeholder="Step Description..."
                        value={step.desc}
                        onChange={(e) => handleStepChange(idx, 'desc', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-200"
                      />

                      <div className="flex items-center space-x-3">
                        <input
                          type="text"
                          placeholder="Image URL (optional)"
                          value={step.image || ''}
                          onChange={(e) => handleStepChange(idx, 'image', e.target.value)}
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                        />
                        <label className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-bold text-white cursor-pointer flex items-center space-x-1 shrink-0">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Image</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageUpload(e, idx)}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order & Status */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-300">Display Order Priority</label>
                  <input
                    type="number"
                    value={form.order || 1}
                    onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300">Status</label>
                  <select
                    value={form.status || 'published'}
                    onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-cyan-500/20"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Article</span>
                </button>
              </div>

            </form>
          ) : (
            /* Articles List Table */
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold px-1">
                <span>All Documentation Articles ({articles.length})</span>
                <span>Category & Order</span>
              </div>

              {loading ? (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                  <p className="text-xs">Loading articles...</p>
                </div>
              ) : articles.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-3">
                  <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs">No articles created yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {articles.map((art) => (
                    <div
                      key={art.id}
                      className="bg-slate-800/50 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex items-center justify-between gap-4 transition"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-bold uppercase bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/20">
                            {art.category}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">#{art.order}</span>
                        </div>
                        <h4 className="text-sm font-bold text-white truncate mt-1">{art.title}</h4>
                        <p className="text-xs text-slate-400 truncate">{art.description}</p>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          onClick={() => handleEditArticle(art)}
                          className="p-2 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-slate-200 hover:text-white transition"
                          title="Edit Article"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(art.id, art.title)}
                          className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                          title="Delete Article"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
