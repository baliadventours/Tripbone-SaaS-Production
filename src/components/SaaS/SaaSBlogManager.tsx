import React, { useState, useEffect } from 'react';
import { db, collection, getDocs, addDoc, updateDoc, doc, deleteDoc, onSnapshot, serverTimestamp } from '../../lib/firebase';
import { BlogPost } from '../../types';
import { 
  Sparkles, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Eye, 
  FileText, 
  Check, 
  X, 
  Loader2, 
  Globe, 
  Wand2, 
  Image as ImageIcon, 
  Tag, 
  Calendar, 
  User, 
  Clock, 
  ArrowLeft,
  Share2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface SaaSBlogManagerProps {
  isDarkMode?: boolean;
}

export default function SaaSBlogManager({ isDarkMode = false }: SaaSBlogManagerProps) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  
  // View mode: 'list' | 'editor'
  const [viewMode, setViewMode] = useState<'list' | 'editor'>('list');
  const [editingPost, setEditingPost] = useState<Partial<BlogPost> | null>(null);

  // AI Generator state
  const [aiTopic, setAiTopic] = useState('');
  const [aiAudience, setAiAudience] = useState('Tour Operators & Travel Agencies');
  const [aiTone, setAiTone] = useState('Engaging, Professional & Authoritative');
  const [aiLanguage, setAiLanguage] = useState('English');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiSuccess, setAiSuccess] = useState('');

  // Save loading state
  const [isSaving, setIsSaving] = useState(false);

  // Fetch blog posts from Firestore in real-time
  useEffect(() => {
    const postsRef = collection(db, 'posts');
    const unsubscribe = onSnapshot(postsRef, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as BlogPost));

      // Sort latest first
      postsData.sort((a, b) => {
        const getMillis = (val: any) => {
          if (!val) return 0;
          if (typeof val.toMillis === 'function') return val.toMillis();
          if (typeof val.seconds === 'number') return val.seconds * 1000;
          if (val instanceof Date) return val.getTime();
          return new Date(val).getTime() || 0;
        };
        return getMillis(b.createdAt) - getMillis(a.createdAt);
      });

      setPosts(postsData);
      setLoading(false);
    }, (error) => {
      console.error("[SaaSBlogManager Snapshot Error]:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const categories = ['All', ...new Set(posts.map(p => p.category).filter(Boolean))];

  const filteredPosts = posts.filter(post => {
    const matchesSearch = !searchTerm || 
      post.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.excerpt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.category?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'published' && (post.status === 'published' || post.status === 'active')) ||
      (statusFilter === 'draft' && post.status === 'draft');

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleCreateNew = () => {
    setEditingPost({
      title: '',
      slug: '',
      excerpt: '',
      category: 'Industry Insights',
      content: '',
      coverImage: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80',
      author: 'Tripbone Editorial',
      readTime: '5 min read',
      status: 'published',
      tags: ['SaaS', 'Travel Tech', 'Automation']
    });
    setAiTopic('');
    setAiError('');
    setAiSuccess('');
    setViewMode('editor');
  };

  const handleEditPost = (post: BlogPost) => {
    setEditingPost({ ...post });
    setAiError('');
    setAiSuccess('');
    setViewMode('editor');
  };

  const handleDeletePost = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this blog post? This action cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, 'posts', id));
    } catch (err) {
      console.error("[Delete Post Error]:", err);
      alert("Failed to delete post. Please try again.");
    }
  };

  const handleToggleStatus = async (post: BlogPost) => {
    const newStatus = post.status === 'published' || post.status === 'active' ? 'draft' : 'published';
    try {
      await updateDoc(doc(db, 'posts', post.id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("[Toggle Status Error]:", err);
    }
  };

  const handleGenerateAIPost = async () => {
    if (!aiTopic.trim()) {
      setAiError("Please enter a blog topic or keyword prompt.");
      return;
    }

    setIsGenerating(true);
    setAiError('');
    setAiSuccess('');

    try {
      const response = await fetch('/api/generate-blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiTopic,
          audience: aiAudience,
          tone: aiTone,
          language: aiLanguage
        })
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to generate blog article");
      }

      const coverQuery = encodeURIComponent(data.coverImageQuery || 'travel adventure');
      const coverImg = `https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80`;

      setEditingPost({
        title: data.title || aiTopic,
        slug: data.slug || aiTopic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
        excerpt: data.excerpt || '',
        category: data.category || 'Industry Insights',
        content: data.content || '<p>Article content...</p>',
        author: data.author || 'Tripbone Editorial',
        readTime: data.readTime || '5 min read',
        coverImage: coverImg,
        status: 'published',
        tags: data.seoKeywords || ['Travel SaaS', 'Tour Operators']
      });

      setAiSuccess("AI blog article generated successfully! Review and edit below.");
    } catch (err: any) {
      console.error("[AI Generate Error]:", err);
      setAiError(err.message || "AI generation failed. Please check your network and try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSavePost = async () => {
    if (!editingPost?.title?.trim()) {
      alert("Article title is required.");
      return;
    }

    setIsSaving(true);

    try {
      const slugVal = editingPost.slug || editingPost.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      const postData = {
        title: editingPost.title.trim(),
        slug: slugVal.trim(),
        excerpt: editingPost.excerpt || '',
        category: editingPost.category || 'General',
        content: editingPost.content || '',
        coverImage: editingPost.coverImage || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80',
        author: editingPost.author || 'Tripbone Team',
        readTime: editingPost.readTime || '5 min read',
        status: editingPost.status || 'published',
        tags: editingPost.tags || [],
        updatedAt: serverTimestamp()
      };

      if (editingPost.id) {
        // Update existing post
        await updateDoc(doc(db, 'posts', editingPost.id), postData);
      } else {
        // Add new post
        await addDoc(collection(db, 'posts'), {
          ...postData,
          createdAt: serverTimestamp()
        });
      }

      setViewMode('list');
      setEditingPost(null);
    } catch (err: any) {
      console.error("[Save Post Error]:", err);
      alert("Failed to save post: " + (err.message || "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`space-y-6 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
      
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-500" />
            <span>Blog & Updates Manager</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Publish SEO-optimized articles, platform updates, and news with built-in AI generation.
          </p>
        </div>

        {viewMode === 'list' ? (
          <button
            onClick={handleCreateNew}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Blog Post</span>
          </button>
        ) : (
          <button
            onClick={() => setViewMode('list')}
            className="px-4 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Blog List</span>
          </button>
        )}
      </div>

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <div className="space-y-6">
          
          {/* Filters Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search articles by title, excerpt..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 text-xs font-semibold rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
                  isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-200 text-gray-900'
                }`}
              />
            </div>

            {/* Category Select */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={`py-2 px-3 text-xs font-semibold rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-200 text-gray-900'
              }`}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>Category: {cat}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className={`py-2 px-3 text-xs font-semibold rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-200 text-gray-900'
              }`}
            >
              <option value="all">Status: All Posts</option>
              <option value="published">Status: Published Only</option>
              <option value="draft">Status: Drafts Only</option>
            </select>
          </div>

          {/* Table Container */}
          <div className={`rounded-2xl border overflow-hidden ${isDarkMode ? 'border-slate-800 bg-slate-900/40' : 'border-gray-200 bg-white shadow-xs'}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`border-b text-[11px] font-mono uppercase tracking-wider ${
                    isDarkMode ? 'border-slate-800 bg-slate-950/60 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-600'
                  }`}>
                    <th className="py-3.5 px-4">Article</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Author</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-gray-100'}`}>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center">
                        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin mx-auto mb-2" />
                        <p className="text-xs text-gray-500">Loading articles...</p>
                      </td>
                    </tr>
                  ) : filteredPosts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center">
                        <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2 opacity-50" />
                        <p className="text-sm font-bold">No blog articles found</p>
                        <p className="text-xs text-gray-500 mt-1">Create your first blog post or generate one with AI.</p>
                        <button
                          onClick={handleCreateNew}
                          className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Generate Article with AI</span>
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredPosts.map((post) => {
                      const isPub = post.status === 'published' || post.status === 'active';
                      return (
                        <tr key={post.id} className={`text-xs transition-colors ${
                          isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-gray-50'
                        }`}>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-3">
                              <img
                                src={post.coverImage || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=200&q=80'}
                                alt={post.title}
                                className="w-12 h-10 rounded-lg object-cover bg-slate-200 dark:bg-slate-800 shrink-0 border border-gray-200 dark:border-slate-700"
                              />
                              <div>
                                <h4 className="font-bold text-gray-900 dark:text-white line-clamp-1 max-w-xs">{post.title}</h4>
                                <p className="text-[10px] text-gray-500 font-mono line-clamp-1 max-w-xs">/blog/{post.slug}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                              {post.category || 'General'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-1.5 text-gray-600 dark:text-gray-300">
                              <User className="w-3 h-3 text-gray-400" />
                              <span className="font-medium text-[11px]">{post.author || 'Editorial'}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => handleToggleStatus(post)}
                              title="Click to toggle status"
                              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-transform hover:scale-105 cursor-pointer ${
                                isPub 
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isPub ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                              <span>{isPub ? 'Published' : 'Draft'}</span>
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <a
                                href={`/blog/${post.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="View on Live Site"
                                className={`p-1.5 rounded-lg transition-colors ${
                                  isDarkMode ? 'hover:bg-slate-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
                                }`}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </a>
                              <button
                                onClick={() => handleEditPost(post)}
                                title="Edit Article"
                                className={`p-1.5 rounded-lg transition-colors ${
                                  isDarkMode ? 'hover:bg-indigo-900/50 text-indigo-400' : 'hover:bg-indigo-50 text-indigo-600'
                                }`}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeletePost(post.id)}
                                title="Delete Article"
                                className={`p-1.5 rounded-lg transition-colors ${
                                  isDarkMode ? 'hover:bg-rose-900/50 text-rose-400' : 'hover:bg-rose-50 text-rose-600'
                                }`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* EDITOR VIEW */}
      {viewMode === 'editor' && editingPost && (
        <div className="space-y-8 max-w-5xl mx-auto">
          
          {/* AI Generator Box */}
          <div className={`p-6 rounded-2xl border relative overflow-hidden transition-all ${
            isDarkMode ? 'bg-gradient-to-br from-indigo-950/40 via-slate-900 to-purple-950/20 border-indigo-500/30' : 'bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/60 border-indigo-200'
          }`}>
            <div className="flex items-center space-x-2 mb-3">
              <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">AI Content Generator</h3>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-mono">
                Gemini 3.5 Flash
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
              Enter any topic or prompt, and Gemini AI will generate a complete, SEO-friendly article formatted in HTML.
            </p>

            {aiError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{aiError}</span>
              </div>
            )}

            {aiSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{aiSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Topic or Prompt
                </label>
                <input
                  type="text"
                  placeholder="e.g. Top 7 Automation Tools for Tour Operators in 2026..."
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  className={`w-full px-3.5 py-2 text-xs font-semibold rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Target Audience
                </label>
                <select
                  value={aiAudience}
                  onChange={(e) => setAiAudience(e.target.value)}
                  className={`w-full px-3 py-2 text-xs font-semibold rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                >
                  <option value="Tour Operators & Travel Agencies">Tour Operators & Agencies</option>
                  <option value="Travelers & Adventure Enthusiasts">Travelers & Adventurers</option>
                  <option value="B2B SaaS & Tech Decision Makers">B2B SaaS & Tech Leaders</option>
                  <option value="Hospitality & Local Guides">Hospitality & Local Guides</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Tone
                </label>
                <select
                  value={aiTone}
                  onChange={(e) => setAiTone(e.target.value)}
                  className={`w-full px-3 py-2 text-xs font-semibold rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                >
                  <option value="Engaging, Professional & Authoritative">Engaging & Professional</option>
                  <option value="Inspiring & Storytelling">Inspiring Storytelling</option>
                  <option value="Educational & How-To Guide">Educational How-To</option>
                  <option value="Casual & Conversational">Casual Conversational</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerateAIPost}
              disabled={isGenerating}
              className="w-full py-3 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Gemini AI is crafting your article...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>Generate Complete Article with AI</span>
                </>
              )}
            </button>
          </div>

          {/* Main Article Fields Form */}
          <div className={`p-6 rounded-2xl border space-y-6 ${
            isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-gray-200 shadow-xs'
          }`}>
            <h3 className="text-sm font-black uppercase tracking-wider text-gray-500 border-b pb-3 dark:border-slate-800">
              {editingPost.id ? 'Edit Article Details' : 'New Article Details'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Article Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 10 Proven Strategies to Scale Your Tour Operator Business"
                  value={editingPost.title || ''}
                  onChange={(e) => {
                    const newTitle = e.target.value;
                    const autoSlug = newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                    setEditingPost({ ...editingPost, title: newTitle, slug: editingPost.id ? editingPost.slug : autoSlug });
                  }}
                  className={`w-full px-3.5 py-2.5 text-sm font-bold rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>

              {/* URL Slug */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  URL Slug
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-400">/blog/</span>
                  <input
                    type="text"
                    value={editingPost.slug || ''}
                    onChange={(e) => setEditingPost({ ...editingPost, slug: e.target.value })}
                    className={`w-full pl-16 pr-3.5 py-2 text-xs font-mono rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
                      isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-200 text-gray-900'
                    }`}
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  placeholder="e.g. Industry Insights, Operator Guide..."
                  value={editingPost.category || ''}
                  onChange={(e) => setEditingPost({ ...editingPost, category: e.target.value })}
                  className={`w-full px-3.5 py-2 text-xs font-semibold rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>

              {/* Author */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Author Name
                </label>
                <input
                  type="text"
                  value={editingPost.author || ''}
                  onChange={(e) => setEditingPost({ ...editingPost, author: e.target.value })}
                  className={`w-full px-3.5 py-2 text-xs font-semibold rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>

              {/* Reading Time */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Reading Time
                </label>
                <input
                  type="text"
                  placeholder="e.g. 5 min read"
                  value={editingPost.readTime || ''}
                  onChange={(e) => setEditingPost({ ...editingPost, readTime: e.target.value })}
                  className={`w-full px-3.5 py-2 text-xs font-semibold rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>

              {/* Cover Image URL */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Cover Image URL
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={editingPost.coverImage || ''}
                    onChange={(e) => setEditingPost({ ...editingPost, coverImage: e.target.value })}
                    className={`flex-1 px-3.5 py-2 text-xs font-semibold rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
                      isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-200 text-gray-900'
                    }`}
                  />
                  {editingPost.coverImage && (
                    <img
                      src={editingPost.coverImage}
                      alt="Cover preview"
                      className="w-12 h-9 rounded-lg object-cover border border-gray-200 dark:border-slate-800 shrink-0"
                    />
                  )}
                </div>
              </div>

              {/* Excerpt */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Excerpt / Short Summary
                </label>
                <textarea
                  rows={2}
                  placeholder="Summarize the core takeaways of this article..."
                  value={editingPost.excerpt || ''}
                  onChange={(e) => setEditingPost({ ...editingPost, excerpt: e.target.value })}
                  className={`w-full px-3.5 py-2 text-xs font-medium rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>

              {/* HTML Content Body */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Article Body Content (HTML / Rich Text)
                </label>
                <textarea
                  rows={14}
                  placeholder="<h2>Subheading</h2><p>Article body text...</p>"
                  value={editingPost.content || ''}
                  onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })}
                  className={`w-full px-3.5 py-3 text-xs font-mono rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-emerald-400' : 'bg-slate-50 border-gray-200 text-gray-900'
                  }`}
                />
              </div>

              {/* Publication Status */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Publication Status
                </label>
                <select
                  value={editingPost.status || 'published'}
                  onChange={(e) => setEditingPost({ ...editingPost, status: e.target.value as any })}
                  className={`w-full px-3.5 py-2 text-xs font-semibold rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                >
                  <option value="published">Published (Live on Website)</option>
                  <option value="draft">Draft (Hidden)</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-gray-200 dark:border-slate-800 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePost}
                disabled={isSaving}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save & Publish Post</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
