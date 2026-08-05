import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Save, Trash2, Edit3, Image as ImageIcon, Upload, 
  Layers, Check, Sparkles, AlertCircle, Loader2, ListOrdered, BookOpen,
  FolderPlus, Tag, Folder, Settings
} from 'lucide-react';
import { db, collection, addDoc, updateDoc, doc, deleteDoc, onSnapshot, serverTimestamp } from '../../lib/firebase';
import { uploadImage } from '../../lib/imgbb';
import { DocArticle, DocCategory, DEFAULT_DOC_ARTICLES, DEFAULT_DOC_CATEGORIES } from './DocViewer';
import { sanitizeFirestoreData } from '../../services/payment/PaymentService';

interface DocManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DocManager({ isOpen, onClose }: DocManagerProps) {
  const [activeTab, setActiveTab] = useState<'articles' | 'categories'>('articles');
  const [articles, setArticles] = useState<DocArticle[]>([]);
  const [categories, setCategories] = useState<DocCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Article Editing State
  const [isEditingArticle, setIsEditingArticle] = useState(false);
  const [isSavingArticle, setIsSavingArticle] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [articleForm, setArticleForm] = useState<Partial<DocArticle>>({
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

  // Category Editing State
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [categoryForm, setCategoryForm] = useState<Partial<DocCategory>>({
    name: '',
    description: '',
    order: 1
  });

  // Load articles real-time
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    const q = collection(db, 'documentation_articles');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const list = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        })) as DocArticle[];
        list.sort((a, b) => (a.order || 0) - (b.order || 0));
        setArticles(list);
      } else {
        setArticles(DEFAULT_DOC_ARTICLES);
      }
      setLoading(false);
    }, (err) => {
      console.warn("Docs articles fallback:", err);
      setArticles(DEFAULT_DOC_ARTICLES);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen]);

  // Load categories real-time
  useEffect(() => {
    if (!isOpen) return;
    setCategoriesLoading(true);
    const q = collection(db, 'documentation_categories');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const list = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        })) as DocCategory[];
        list.sort((a, b) => (a.order || 0) - (b.order || 0));
        setCategories(list);
      } else {
        setCategories(DEFAULT_DOC_CATEGORIES);
      }
      setCategoriesLoading(false);
    }, (err) => {
      console.warn("Docs categories fallback:", err);
      setCategories(DEFAULT_DOC_CATEGORIES);
      setCategoriesLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  // --- Article Handlers ---
  const handleEditArticle = (art: DocArticle) => {
    setArticleForm({
      ...art,
      steps: art.steps && art.steps.length > 0 ? art.steps : [{ title: '', desc: '', image: '' }],
      images: art.images || []
    });
    setIsEditingArticle(true);
  };

  const handleCreateNewArticle = () => {
    const defaultCat = categories.length > 0 ? categories[0].name : 'Getting Started';
    setArticleForm({
      title: '',
      subTitle: '',
      subSubTitle: '',
      category: defaultCat,
      description: '',
      content: '',
      steps: [{ title: '', desc: '', image: '' }],
      images: [],
      order: (articles.length + 1),
      status: 'published'
    });
    setIsEditingArticle(true);
  };

  const handleStepChange = (index: number, field: string, val: string) => {
    const nextSteps = [...(articleForm.steps || [])];
    nextSteps[index] = { ...nextSteps[index], [field]: val };
    setArticleForm({ ...articleForm, steps: nextSteps });
  };

  const handleAddStep = () => {
    setArticleForm({
      ...articleForm,
      steps: [...(articleForm.steps || []), { title: '', desc: '', image: '' }]
    });
  };

  const handleRemoveStep = (index: number) => {
    const nextSteps = (articleForm.steps || []).filter((_, i) => i !== index);
    setArticleForm({ ...articleForm, steps: nextSteps });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetStepIndex?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const url = await uploadImage(file);
      if (targetStepIndex !== undefined) {
        handleStepChange(targetStepIndex, 'image', url);
      } else {
        setArticleForm(prev => ({ ...prev, images: [...(prev.images || []), url] }));
      }
    } catch (err) {
      console.error("Failed to upload image:", err);
      alert("Error uploading image. Please check image format.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!articleForm.title || !articleForm.category) {
      alert("Please provide a Title and Category.");
      return;
    }

    setIsSavingArticle(true);
    try {
      const slug = articleForm.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      const filteredSteps = (articleForm.steps || []).filter(s => s.title.trim() || s.desc.trim());

      const payload = sanitizeFirestoreData({
        slug,
        title: articleForm.title,
        subTitle: articleForm.subTitle || '',
        subSubTitle: articleForm.subSubTitle || '',
        category: articleForm.category,
        description: articleForm.description || '',
        content: articleForm.content || '',
        steps: filteredSteps,
        images: articleForm.images || [],
        order: Number(articleForm.order) || 1,
        status: articleForm.status || 'published',
        updatedAt: new Date().toISOString()
      });

      if (articleForm.id) {
        await updateDoc(doc(db, 'documentation_articles', articleForm.id), payload);
      } else {
        await addDoc(collection(db, 'documentation_articles'), {
          ...payload,
          createdAt: serverTimestamp()
        });
      }

      setIsEditingArticle(false);
      setArticleForm({});
    } catch (err) {
      console.error("Error saving documentation article:", err);
      alert("Failed to save article.");
    } finally {
      setIsSavingArticle(false);
    }
  };

  const handleDeleteArticle = async (id: string, title: string) => {
    if (confirm(`Delete documentation article "${title}"?`)) {
      try {
        await deleteDoc(doc(db, 'documentation_articles', id));
      } catch (err) {
        console.error("Error deleting article:", err);
      }
    }
  };

  // --- Category Handlers ---
  const handleEditCategory = (cat: DocCategory) => {
    setCategoryForm(cat);
    setIsEditingCategory(true);
  };

  const handleCreateNewCategory = () => {
    setCategoryForm({
      name: '',
      description: '',
      order: (categories.length + 1)
    });
    setIsEditingCategory(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name) {
      alert("Please enter a category name.");
      return;
    }

    setIsSavingCategory(true);
    try {
      const payload = sanitizeFirestoreData({
        name: categoryForm.name.trim(),
        description: categoryForm.description || '',
        order: Number(categoryForm.order) || 1,
        updatedAt: new Date().toISOString()
      });

      if (categoryForm.id) {
        await updateDoc(doc(db, 'documentation_categories', categoryForm.id), payload);
      } else {
        await addDoc(collection(db, 'documentation_categories'), {
          ...payload,
          createdAt: serverTimestamp()
        });
      }

      setIsEditingCategory(false);
      setCategoryForm({});
    } catch (err) {
      console.error("Error saving documentation category:", err);
      alert("Failed to save category.");
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (confirm(`Delete category "${name}"? Articles in this category will remain.`)) {
      try {
        await deleteDoc(doc(db, 'documentation_categories', id));
      } catch (err) {
        console.error("Error deleting category:", err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl text-slate-100 overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-10 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Docs Knowledge Center Manager</h2>
              <p className="text-xs text-slate-400">Manage docs.tripbone.com articles, step-by-step guides, and categories.</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Tab Switcher */}
            <div className="bg-slate-800 p-1 rounded-xl flex items-center space-x-1 border border-slate-700">
              <button
                onClick={() => { setActiveTab('articles'); setIsEditingArticle(false); setIsEditingCategory(false); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                  activeTab === 'articles' ? 'bg-cyan-500 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Articles ({articles.length})</span>
              </button>
              <button
                onClick={() => { setActiveTab('categories'); setIsEditingArticle(false); setIsEditingCategory(false); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                  activeTab === 'categories' ? 'bg-cyan-500 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Categories ({categories.length})</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition border border-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">

          {/* TAB 1: ARTICLES MANAGEMENT */}
          {activeTab === 'articles' && (
            <div>
              {isEditingArticle ? (
                /* Article Editing Form */
                <form onSubmit={handleSaveArticle} className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">
                      {articleForm.id ? 'Edit Documentation Article' : 'Create New Article'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsEditingArticle(false)}
                      className="text-xs text-slate-400 hover:text-white underline"
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Title, Subtitle, Category */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1 md:col-span-3">
                      <label className="text-xs font-bold text-slate-300">Article Title *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Getting Started with Tripbone SaaS"
                        value={articleForm.title || ''}
                        onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300">Sub Title</label>
                      <input
                        type="text"
                        placeholder="e.g. System Overview"
                        value={articleForm.subTitle || ''}
                        onChange={(e) => setArticleForm({ ...articleForm, subTitle: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300">Sub - Sub Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Prerequisites & Setup"
                        value={articleForm.subSubTitle || ''}
                        onChange={(e) => setArticleForm({ ...articleForm, subSubTitle: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300">Category *</label>
                      <select
                        value={articleForm.category || ''}
                        onChange={(e) => setArticleForm({ ...articleForm, category: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      >
                        {categories.map((c) => (
                          <option key={c.id || c.name} value={c.name}>{c.name}</option>
                        ))}
                        <option value="Getting Started">Getting Started</option>
                        <option value="Payment Integration">Payment Integration</option>
                        <option value="Domain & SEO">Domain & SEO</option>
                        <option value="AI & Automation">AI & Automation</option>
                        <option value="API & Webhooks">API & Webhooks</option>
                      </select>
                    </div>
                  </div>

                  {/* Summary & Body Content */}
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300">Short Summary / Description</label>
                      <textarea
                        rows={2}
                        placeholder="A brief summary shown at the top and in search cards..."
                        value={articleForm.description || ''}
                        onChange={(e) => setArticleForm({ ...articleForm, description: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300">Full Body / Description Content (HTML / Markdown)</label>
                      <textarea
                        rows={6}
                        placeholder="<h2>Guide Overview</h2><p>Detailed explanation...</p>"
                        value={articleForm.content || ''}
                        onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  {/* Step-by-Step Instructions */}
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
                      {(articleForm.steps || []).map((step, idx) => (
                        <div key={idx} className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 space-y-3 relative">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-400">Step {idx + 1}</span>
                            {(articleForm.steps || []).length > 1 && (
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
                      <label className="text-xs font-bold text-slate-300">Display Priority Order</label>
                      <input
                        type="number"
                        value={articleForm.order || 1}
                        onChange={(e) => setArticleForm({ ...articleForm, order: parseInt(e.target.value) || 1 })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-300">Status</label>
                      <select
                        value={articleForm.status || 'published'}
                        onChange={(e) => setArticleForm({ ...articleForm, status: e.target.value as any })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white"
                      >
                        <option value="published">Published</option>
                        <option value="draft">Draft</option>
                      </select>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsEditingArticle(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingArticle}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-cyan-500/20"
                    >
                      {isSavingArticle ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span>Save Article</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* Article Listing */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-400 font-bold">
                      Articles List ({articles.length})
                    </div>
                    <button
                      onClick={handleCreateNewArticle}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-cyan-500/20"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New Article</span>
                    </button>
                  </div>

                  {loading ? (
                    <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                      <p className="text-xs">Loading articles...</p>
                    </div>
                  ) : articles.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 space-y-3">
                      <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="text-xs">No documentation articles found.</p>
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
                              onClick={() => handleDeleteArticle(art.id, art.title)}
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
          )}

          {/* TAB 2: CATEGORIES MANAGEMENT */}
          {activeTab === 'categories' && (
            <div>
              {isEditingCategory ? (
                /* Category Editing Form */
                <form onSubmit={handleSaveCategory} className="space-y-5 bg-slate-800/60 p-5 rounded-2xl border border-slate-700">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                    <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">
                      {categoryForm.id ? 'Edit Category' : 'Create New Category'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsEditingCategory(false)}
                      className="text-xs text-slate-400 hover:text-white underline"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-bold text-slate-300">Category Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Payment Integration"
                        value={categoryForm.name || ''}
                        onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300">Order Priority</label>
                      <input
                        type="number"
                        value={categoryForm.order || 1}
                        onChange={(e) => setCategoryForm({ ...categoryForm, order: parseInt(e.target.value) || 1 })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white"
                      />
                    </div>

                    <div className="space-y-1 md:col-span-3">
                      <label className="text-xs font-bold text-slate-300">Category Description</label>
                      <textarea
                        rows={2}
                        placeholder="Brief summary of articles in this category..."
                        value={categoryForm.description || ''}
                        onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-700">
                    <button
                      type="button"
                      onClick={() => setIsEditingCategory(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingCategory}
                      className="px-5 py-2 rounded-xl bg-cyan-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-cyan-500/20"
                    >
                      {isSavingCategory ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span>Save Category</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* Category Listing */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-400 font-bold">
                      Categories List ({categories.length})
                    </div>
                    <button
                      onClick={handleCreateNewCategory}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-cyan-500/20"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New Category</span>
                    </button>
                  </div>

                  {categoriesLoading ? (
                    <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                      <p className="text-xs">Loading categories...</p>
                    </div>
                  ) : categories.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 space-y-3">
                      <Folder className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="text-xs">No categories created yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {categories.map((cat) => (
                        <div
                          key={cat.id || cat.name}
                          className="bg-slate-800/50 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex items-center justify-between gap-4 transition"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-white">{cat.name}</span>
                              <span className="text-[10px] text-cyan-400 font-mono bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                                Order #{cat.order}
                              </span>
                            </div>
                            {cat.description && (
                              <p className="text-xs text-slate-400 truncate mt-1">{cat.description}</p>
                            )}
                          </div>

                          <div className="flex items-center space-x-2 shrink-0">
                            <button
                              onClick={() => handleEditCategory(cat)}
                              className="p-2 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-slate-200 hover:text-white transition"
                              title="Edit Category"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(cat.id, cat.name)}
                              className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                              title="Delete Category"
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
          )}

        </div>

      </div>
    </div>
  );
}
