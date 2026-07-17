import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, onSnapshot, addDoc, updateDoc, serverTimestamp } from '../../lib/firebase';
import { db } from '../../lib/firebase';
import { useTenant } from '../../lib/TenantContext';
import { LayoutTemplate, Menu, Save, Loader2, Image as ImageIcon, Plus, Trash2, X, AlertCircle, Upload, LayoutGrid } from 'lucide-react';
import { uploadImage } from '../../lib/imgbb';
import { cn } from '../../lib/utils';

export interface BlockConfig {
  id: string;
  active: boolean;
  design: string;
  // Generic fields for flexibility
  headline?: string;
  subheadline?: string;
  description?: string;
  badge?: string;
  primaryButtonText?: string;
  primaryButtonLink?: string;
  secondaryButtonText?: string;
  secondaryButtonLink?: string;
  image?: string;
  heroImages?: string[];
  youtubeUrl?: string;
  menuId?: string;
  tourIds?: string[];
}

export interface CustomMenu {
  id: string;
  name: string;
  location: 'top-nav' | 'main-nav' | 'footer-1' | 'footer-2' | 'footer-3' | 'footer-bottom' | 'none';
  links: { label: string; url: string }[];
}

export interface WebsiteBuilderSettings {
  blocks: BlockConfig[];
  menus: CustomMenu[];
}

const DEFAULT_BLOCKS: BlockConfig[] = [
  { id: 'topNav', active: true, design: 'default' },
  { id: 'mainNav', active: true, design: 'default' },
  { id: 'hero', active: true, design: 'slideshow-atv', headline: 'Discover the extraordinary.', subheadline: 'Unforgettable adventures await.' },
  { id: 'featuredTours', active: true, design: 'default', tourIds: [] },
  { id: 'guestFavorites', active: true, design: 'default', tourIds: [] },
  { id: 'reviews', active: true, design: 'slider' },
  { id: 'blog', active: true, design: 'carousel' },
  { id: 'footer', active: true, design: 'default' }
];

export default function WebsiteBuilder() {
  const { tenantId } = useTenant();
  const [activeTab, setActiveTab] = useState<'blocks' | 'menus' | 'pages'>('blocks');
  const [settings, setSettings] = useState<WebsiteBuilderSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);

  const [pagesList, setPagesList] = useState<any[]>([]);
  const [selectedPageSlug, setSelectedPageSlug] = useState<string>('about');
  const [pageEditorState, setPageEditorState] = useState<{
    id?: string;
    title: string;
    subtitle: string;
    heroImage: string;
    content: string;
    seoTitle: string;
    seoDescription: string;
    layout: string;
    phone: string;
    whatsapp: string;
    email: string;
    address: string;
    mapsEmbed: string;
    facebook: string;
    instagram: string;
    youtube: string;
    twitter: string;
    featuredImages: string[];
    showContactForm: boolean;
  }>({
    title: '',
    subtitle: '',
    heroImage: '',
    content: '',
    seoTitle: '',
    seoDescription: '',
    layout: 'standard',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    mapsEmbed: '',
    facebook: '',
    instagram: '',
    youtube: '',
    twitter: '',
    featuredImages: [],
    showContactForm: true,
  });
  const [savingPage, setSavingPage] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    const unsubscribe = onSnapshot(collection(db, 'pages'), (snapshot) => {
      setPagesList(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsubscribe;
  }, [tenantId]);

  useEffect(() => {
    const existing = pagesList.find(p => p.slug === selectedPageSlug);
    if (existing) {
      setPageEditorState({
        id: existing.id,
        title: existing.title || '',
        subtitle: existing.subtitle || '',
        heroImage: existing.heroImage || '',
        content: existing.content || '',
        seoTitle: existing.seo?.title || '',
        seoDescription: existing.seo?.description || '',
        layout: existing.layout || 'standard',
        phone: existing.phone || '',
        whatsapp: existing.whatsapp || '',
        email: existing.email || '',
        address: existing.address || '',
        mapsEmbed: existing.mapsEmbed || '',
        facebook: existing.socialMedia?.facebook || '',
        instagram: existing.socialMedia?.instagram || '',
        youtube: existing.socialMedia?.youtube || '',
        twitter: existing.socialMedia?.twitter || '',
        featuredImages: existing.featuredImages || [],
        showContactForm: existing.showContactForm ?? true,
      });
    } else {
      setPageEditorState({
        title: '',
        subtitle: '',
        heroImage: '',
        content: '',
        seoTitle: '',
        seoDescription: '',
        layout: 'standard',
        phone: '',
        whatsapp: '',
        email: '',
        address: '',
        mapsEmbed: '',
        facebook: '',
        instagram: '',
        youtube: '',
        twitter: '',
        featuredImages: [],
        showContactForm: true,
      });
    }
  }, [selectedPageSlug, pagesList]);

  useEffect(() => {
    async function loadData() {
      if (!tenantId) return;
      try {
        const docRef = doc(db, 'website_builder', tenantId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data() as WebsiteBuilderSettings;
          // Merge defaults if missing blocks
          const mergedBlocks = DEFAULT_BLOCKS.map(dbk => {
            const existing = data.blocks?.find(b => b.id === dbk.id);
            return existing || dbk;
          });
          setSettings({ blocks: mergedBlocks, menus: data.menus || [] });
        } else {
          setSettings({ blocks: DEFAULT_BLOCKS, menus: [] });
        }
      } catch (err) {
        console.error("Failed to load website builder settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [tenantId]);

  const handleSave = async () => {
    if (!tenantId || !settings) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'website_builder', tenantId), settings);
      alert('Website Builder settings saved successfully!');
    } catch (error) {
      console.error(error);
      alert('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const updateBlock = (id: string, updates: Partial<BlockConfig>) => {
    if (!settings) return;
    setSettings({
      ...settings,
      blocks: settings.blocks.map(b => b.id === id ? { ...b, ...updates } : b)
    });
  };

  const getDesignOptions = (blockId: string) => {
    switch(blockId) {
      case 'hero':
        return [
          { value: 'slideshow-atv', label: 'Multi-Image Slideshow Hero' },
          { value: 'airbnb-classic', label: 'Single Image Hero' },
          { value: 'youtube-video', label: 'YouTube Video Hero' }
        ];
      case 'featuredTours':
      case 'guestFavorites':
        return [
          { value: 'default', label: 'Horizontal Carousel' },
          { value: 'minimal-grid', label: 'Minimalist Grid Layout' },
          { value: 'premium-full', label: 'Premium Large Display' }
        ];
      case 'reviews':
        return [
          { value: 'slider', label: 'Interactive Card Slider' },
          { value: 'grid', label: 'Masonry Grid Layout' }
        ];
      case 'blog':
        return [
          { value: 'carousel', label: 'Horizontal Carousel' },
          { value: 'grid', label: 'Card Grid Layout' }
        ];
      default:
        return [
          { value: 'default', label: 'Standard Layout' }
        ];
    }
  };

  const [uploadingImage, setUploadingImage] = useState(false);
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, blockId: string, isMulti: boolean = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploadingImage(true);
    try {
      if (isMulti) {
        const urls = await Promise.all(Array.from(files).map(f => uploadImage(f)));
        const block = settings?.blocks.find(b => b.id === blockId);
        const existing = block?.heroImages || [];
        updateBlock(blockId, { heroImages: [...existing, ...urls] });
      } else {
        const url = await uploadImage(files[0]);
        updateBlock(blockId, { image: url });
      }
    } catch (err) {
      console.error(err);
      alert('Failed to upload image(s).');
    } finally {
      setUploadingImage(false);
    }
  };

  const blockLabels: Record<string, string> = {
    topNav: 'Top Navigation Bar',
    mainNav: 'Main Navigation',
    hero: 'Hero Section',
    featuredTours: 'Featured Tours',
    guestFavorites: 'Guest Favorites',
    reviews: 'Customer Reviews',
    blog: 'Latest Blog Posts',
    footer: 'Footer'
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Website Builder</h2>
          <p className="text-gray-500 font-medium">Design and structure your storefront by toggling blocks and creating custom menus.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-primary text-white font-bold rounded-xl flex items-center gap-2 hover:bg-orange-700 transition shadow-sm"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          SAVE CHANGES
        </button>
      </div>

      <div className="flex border-b border-gray-200">
        <button
          className={cn("py-4 px-8 font-bold border-b-2 transition-colors", activeTab === 'blocks' ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700")}
          onClick={() => setActiveTab('blocks')}
        >
          <div className="flex items-center gap-2"><LayoutTemplate className="w-4 h-4" /> Page Builder (Blocks)</div>
        </button>
        <button
          className={cn("py-4 px-8 font-bold border-b-2 transition-colors", activeTab === 'menus' ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700")}
          onClick={() => setActiveTab('menus')}
        >
          <div className="flex items-center gap-2"><Menu className="w-4 h-4" /> Custom Menus</div>
        </button>
        <button
          className={cn("py-4 px-8 font-bold border-b-2 transition-colors", activeTab === 'pages' ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700")}
          onClick={() => setActiveTab('pages')}
        >
          <div className="flex items-center gap-2"><ImageIcon className="w-4 h-4" /> System Page Design</div>
        </button>
      </div>

      {activeTab === 'blocks' && (
        <div className="space-y-4 max-w-4xl">
          {settings?.blocks.map(block => (
            <div key={block.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 sm:px-6 flex items-center justify-between bg-gray-50/50 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setExpandedBlock(expandedBlock === block.id ? null : block.id)}>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); updateBlock(block.id, { active: !block.active }); }}
                      className={cn("w-12 h-6 rounded-full transition-colors relative", block.active ? 'bg-primary' : 'bg-gray-300')}
                    >
                      <div className={cn("w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform", block.active ? 'left-6' : 'left-0.5')} />
                    </button>
                    <span className="text-sm font-bold text-gray-900 w-16">{block.active ? 'ACTIVE' : 'HIDDEN'}</span>
                  </div>
                  <h3 className="font-black text-gray-900">{blockLabels[block.id] || block.id}</h3>
                </div>
                <div className="text-gray-400">
                  {expandedBlock === block.id ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
              </div>

              {expandedBlock === block.id && (
                <div className="p-6 border-t border-gray-100 space-y-6">
                  {/* Design Selector */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Design Layout</label>
                    <div className="flex flex-wrap gap-4">
                      {getDesignOptions(block.id).map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => updateBlock(block.id, { design: opt.value })}
                          className={cn(
                            "px-6 py-3 rounded-xl border-2 font-bold text-sm transition-all text-left", 
                            block.design === opt.value ? "border-primary text-primary bg-orange-50" : "border-gray-200 text-gray-500 hover:border-gray-300"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Headline, Subheadline & Description (Only for some blocks like Hero) */}
                  {['hero', 'featuredTours', 'guestFavorites'].includes(block.id) && (
                    <div className="grid grid-cols-1 gap-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Headline</label>
                          <input
                            type="text"
                            value={block.headline || ''}
                            onChange={(e) => updateBlock(block.id, { headline: e.target.value })}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                            placeholder="Section Title"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Subheadline</label>
                          <input
                            type="text"
                            value={block.subheadline || ''}
                            onChange={(e) => updateBlock(block.id, { subheadline: e.target.value })}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                            placeholder="Short description..."
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Description</label>
                        <textarea
                          value={block.description || ''}
                          onChange={(e) => updateBlock(block.id, { description: e.target.value })}
                          rows={3}
                          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                          placeholder="Long description or paragraph text..."
                        />
                      </div>
                    </div>
                  )}

                  {/* Additional fields for Hero (Badge & Buttons) */}
                  {block.id === 'hero' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Badge Text (e.g. Ubud, Bali)</label>
                        <input
                          type="text"
                          value={block.badge || ''}
                          onChange={(e) => updateBlock(block.id, { badge: e.target.value })}
                          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                          placeholder="Badge Text"
                        />
                      </div>
                      <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-4 border border-gray-200 rounded-xl bg-gray-50/50">
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-4">Primary Button</label>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Text</label>
                              <input
                                type="text"
                                value={block.primaryButtonText || ''}
                                onChange={(e) => updateBlock(block.id, { primaryButtonText: e.target.value })}
                                className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm"
                                placeholder="e.g. Book ATV Tour Now"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Link</label>
                              <input
                                type="text"
                                value={block.primaryButtonLink || ''}
                                onChange={(e) => updateBlock(block.id, { primaryButtonLink: e.target.value })}
                                className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm"
                                placeholder="e.g. /tours?search=atv"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="p-4 border border-gray-200 rounded-xl bg-gray-50/50">
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-4">Secondary Button</label>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Text</label>
                              <input
                                type="text"
                                value={block.secondaryButtonText || ''}
                                onChange={(e) => updateBlock(block.id, { secondaryButtonText: e.target.value })}
                                className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm"
                                placeholder="e.g. Inquire / Contact"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Link</label>
                              <input
                                type="text"
                                value={block.secondaryButtonLink || ''}
                                onChange={(e) => updateBlock(block.id, { secondaryButtonLink: e.target.value })}
                                className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm"
                                placeholder="e.g. /contact"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Image/Video Inputs (Hero only) */}
                  {block.id === 'hero' && block.design === 'youtube-video' && (
                    <div>
                       <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">YouTube Video URL</label>
                       <input
                          type="text"
                          value={block.youtubeUrl || ''}
                          onChange={(e) => updateBlock(block.id, { youtubeUrl: e.target.value })}
                          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                          placeholder="https://www.youtube.com/watch?v=..."
                        />
                    </div>
                  )}

                  {block.id === 'hero' && block.design === 'airbnb-classic' && (
                    <div>
                       <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Background Image</label>
                       {block.image && (
                         <div className="mb-4 relative w-48 aspect-video rounded-xl overflow-hidden shadow-sm">
                           <img src={block.image} className="w-full h-full object-cover" alt="Hero background" />
                           <button onClick={() => updateBlock(block.id, { image: '' })} className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70">
                             <X className="w-4 h-4" />
                           </button>
                         </div>
                       )}
                       <div className="relative">
                         <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, block.id, false)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={uploadingImage}
                          />
                          <div className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl text-center hover:border-primary transition-colors bg-gray-50">
                            {uploadingImage ? (
                              <div className="flex items-center justify-center gap-2 text-gray-500 font-bold"><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</div>
                            ) : (
                              <div className="flex flex-col items-center gap-1 text-gray-500">
                                <Upload className="w-6 h-6 mb-1 text-gray-400" />
                                <span className="font-bold text-sm">Click to upload a single image</span>
                              </div>
                            )}
                          </div>
                       </div>
                    </div>
                  )}

                  {block.id === 'hero' && block.design === 'slideshow-atv' && (
                    <div>
                       <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Slideshow Images (Multi-upload)</label>
                       {block.heroImages && block.heroImages.length > 0 && (
                         <div className="flex flex-wrap gap-4 mb-4">
                           {block.heroImages.map((img, idx) => (
                             <div key={idx} className="relative w-32 aspect-video rounded-xl overflow-hidden shadow-sm border border-gray-200">
                               <img src={img} className="w-full h-full object-cover" alt={`Hero image ${idx+1}`} />
                               <button 
                                 onClick={() => {
                                   const newImgs = [...(block.heroImages || [])];
                                   newImgs.splice(idx, 1);
                                   updateBlock(block.id, { heroImages: newImgs });
                                 }} 
                                 className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
                               >
                                 <X className="w-3 h-3" />
                               </button>
                             </div>
                           ))}
                         </div>
                       )}
                       <div className="relative">
                         <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => handleImageUpload(e, block.id, true)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={uploadingImage}
                          />
                          <div className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl text-center hover:border-primary transition-colors bg-gray-50">
                            {uploadingImage ? (
                              <div className="flex items-center justify-center gap-2 text-gray-500 font-bold"><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</div>
                            ) : (
                              <div className="flex flex-col items-center gap-1 text-gray-500">
                                <Upload className="w-6 h-6 mb-1 text-gray-400" />
                                <span className="font-bold text-sm">Click to upload multiple images</span>
                              </div>
                            )}
                          </div>
                       </div>
                    </div>
                  )}

                  {/* Menu Picker (Navs only) */}
                  {['topNav', 'mainNav', 'footer'].includes(block.id) && (
                    <div>
                       <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Assigned Menu</label>
                       <select
                          value={block.menuId || ''}
                          onChange={(e) => updateBlock(block.id, { menuId: e.target.value })}
                          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                       >
                         <option value="">-- Select a custom menu --</option>
                         {settings.menus.map(m => (
                           <option key={m.id} value={m.id}>{m.name}</option>
                         ))}
                       </select>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'menus' && (
        <div className="space-y-6 max-w-4xl">
          <div className="p-6 bg-blue-50 text-blue-800 rounded-2xl flex items-start gap-4">
            <AlertCircle className="w-6 h-6 shrink-0 text-blue-600 mt-1" />
            <div>
              <h3 className="font-bold text-lg">Menu Management</h3>
              <p className="text-sm opacity-90 mt-1">Create menus here, then assign them to specific locations (Top Nav, Main Nav, Footers) in the Page Builder tab.</p>
            </div>
          </div>
          
          <button 
            onClick={() => {
              const newMenu: CustomMenu = { id: `menu_${Date.now()}`, name: 'New Custom Menu', location: 'none', links: [] };
              if (settings) setSettings({ ...settings, menus: [...settings.menus, newMenu] });
            }}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold rounded-lg text-sm transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create New Menu
          </button>

          <div className="space-y-4">
            {settings?.menus.map(menu => (
              <div key={menu.id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <input
                    type="text"
                    value={menu.name}
                    onChange={(e) => {
                      const updated = settings.menus.map(m => m.id === menu.id ? { ...m, name: e.target.value } : m);
                      setSettings({ ...settings, menus: updated });
                    }}
                    className="text-xl font-black bg-transparent border-none outline-none border-b-2 border-transparent focus:border-primary px-0 py-1"
                    placeholder="Menu Name"
                  />
                  <button 
                    onClick={() => {
                      if(confirm('Delete this menu?')) {
                        setSettings({ ...settings, menus: settings.menus.filter(m => m.id !== menu.id) });
                      }
                    }}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-2 mb-4">
                  <label className="block text-xs font-bold text-gray-700 uppercase">Links</label>
                  {menu.links.map((link, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input 
                        type="text" 
                        value={link.label}
                        onChange={(e) => {
                          const newLinks = [...menu.links];
                          newLinks[idx].label = e.target.value;
                          const updated = settings.menus.map(m => m.id === menu.id ? { ...m, links: newLinks } : m);
                          setSettings({ ...settings, menus: updated });
                        }}
                        className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" placeholder="Link Label (e.g. About Us)" 
                      />
                      <input 
                        type="text" 
                        value={link.url}
                        onChange={(e) => {
                          const newLinks = [...menu.links];
                          newLinks[idx].url = e.target.value;
                          const updated = settings.menus.map(m => m.id === menu.id ? { ...m, links: newLinks } : m);
                          setSettings({ ...settings, menus: updated });
                        }}
                        className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" placeholder="URL (e.g. /about)" 
                      />
                      <button onClick={() => {
                        const newLinks = menu.links.filter((_, i) => i !== idx);
                        const updated = settings.menus.map(m => m.id === menu.id ? { ...m, links: newLinks } : m);
                        setSettings({ ...settings, menus: updated });
                      }} className="p-2 text-gray-400 hover:text-red-500 transition"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                  <button 
                    onClick={() => {
                      const newLinks = [...menu.links, { label: '', url: '' }];
                      const updated = settings.menus.map(m => m.id === menu.id ? { ...m, links: newLinks } : m);
                      setSettings({ ...settings, menus: updated });
                    }}
                    className="text-primary font-bold text-sm hover:underline mt-2 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Link
                  </button>
                </div>
              </div>
            ))}
            {settings?.menus.length === 0 && (
              <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
                No custom menus created yet.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'pages' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Page Selector Sidebar */}
          <div className="lg:col-span-1 space-y-3">
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl">
              <h3 className="font-extrabold text-xs text-gray-400 uppercase tracking-widest mb-3 font-mono">Select Page</h3>
              <div className="space-y-1">
                {[
                  { slug: 'about', title: 'About Us', url: '/about' },
                  { slug: 'contact', title: 'Contact Us', url: '/contact' },
                  { slug: 'privacy', title: 'Privacy Policy', url: '/privacy' },
                  { slug: 'tours', title: 'Tours Directory', url: '/tours' },
                  { slug: 'blog', title: 'Blog Page', url: '/blog' },
                  { slug: 'destinations', title: 'Destinations', url: '/destinations' },
                  { slug: 'ai-hub', title: 'AI Hub', url: '/ai-hub' }
                ].map(page => (
                  <button
                    key={page.slug}
                    onClick={() => setSelectedPageSlug(page.slug)}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex flex-col gap-0.5",
                      selectedPageSlug === page.slug
                        ? "bg-primary text-white shadow-md shadow-orange-200"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    )}
                  >
                    <span>{page.title}</span>
                    <span className={cn("text-[10px] font-mono font-medium", selectedPageSlug === page.slug ? "text-orange-100" : "text-gray-400")}>{page.url}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Page Editor Form */}
          <div className="lg:col-span-3 bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-xl font-black text-gray-900 uppercase">
                  Customize: {selectedPageSlug.toUpperCase()}
                </h3>
                <p className="text-gray-500 text-xs font-medium mt-1">Configure banner details, hero imagery, custom narrative sections, and SEO tags.</p>
              </div>
              <button
                onClick={async () => {
                  setSavingPage(true);
                  try {
                    const pageData = {
                      title: pageEditorState.title,
                      slug: selectedPageSlug,
                      subtitle: pageEditorState.subtitle || '',
                      heroImage: pageEditorState.heroImage || '',
                      content: pageEditorState.content || '',
                      seo: {
                        title: pageEditorState.seoTitle || '',
                        description: pageEditorState.seoDescription || ''
                      },
                      layout: pageEditorState.layout || 'standard',
                      phone: pageEditorState.phone || '',
                      whatsapp: pageEditorState.whatsapp || '',
                      email: pageEditorState.email || '',
                      address: pageEditorState.address || '',
                      mapsEmbed: pageEditorState.mapsEmbed || '',
                      socialMedia: {
                        facebook: pageEditorState.facebook || '',
                        instagram: pageEditorState.instagram || '',
                        youtube: pageEditorState.youtube || '',
                        twitter: pageEditorState.twitter || ''
                      },
                      featuredImages: pageEditorState.featuredImages || [],
                      showContactForm: pageEditorState.showContactForm ?? true,
                      updatedAt: serverTimestamp()
                    };

                    if (pageEditorState.id) {
                      await updateDoc(doc(db, 'pages', pageEditorState.id), pageData);
                    } else {
                      await addDoc(collection(db, 'pages'), pageData);
                    }
                    alert('Page design updated successfully!');
                  } catch (err) {
                    console.error(err);
                    alert('Failed to save page configuration.');
                  } finally {
                    setSavingPage(false);
                  }
                }}
                disabled={savingPage}
                className="px-6 py-3 bg-primary text-white font-bold rounded-xl flex items-center gap-2 hover:bg-orange-700 transition"
              >
                {savingPage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Page Design
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">Hero Title / Main Heading</label>
                <input
                  type="text"
                  required
                  value={pageEditorState.title}
                  onChange={e => setPageEditorState(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. About Our Journey"
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-primary focus:bg-white focus:outline-none font-bold text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">Hero Subtitle / Description</label>
                <input
                  type="text"
                  value={pageEditorState.subtitle}
                  onChange={e => setPageEditorState(prev => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="e.g. Premium tours curated by local experts in Bali."
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-primary focus:bg-white focus:outline-none text-sm font-medium"
                />
              </div>
            </div>

            {/* Page Banner Upload */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">Hero Background Image</label>
              {pageEditorState.heroImage && (
                <div className="mb-4 relative w-full max-w-md aspect-video rounded-xl overflow-hidden shadow-sm border border-gray-100">
                  <img src={pageEditorState.heroImage} className="w-full h-full object-cover" alt="Hero background preview" />
                  <button 
                    onClick={() => setPageEditorState(prev => ({ ...prev, heroImage: '' }))} 
                    className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const files = e.target.files;
                    if (!files || files.length === 0) return;
                    setUploadingImage(true);
                    try {
                      const url = await uploadImage(files[0]);
                      setPageEditorState(prev => ({ ...prev, heroImage: url }));
                    } catch (err) {
                      console.error(err);
                      alert('Failed to upload image.');
                    } finally {
                      setUploadingImage(false);
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={uploadingImage}
                />
                <div className="w-full p-4 border-2 border-dashed border-gray-200 rounded-xl text-center hover:border-primary transition-colors bg-gray-50">
                  {uploadingImage ? (
                    <div className="flex items-center justify-center gap-2 text-gray-500 font-bold">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" /> Uploading...
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-gray-500">
                      <Upload className="w-6 h-6 mb-1 text-gray-400" />
                      <span className="font-bold text-sm">Click to upload custom page banner image</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Page Design Template Section */}
            <div className="pt-6 border-t border-gray-150 space-y-6">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Page Layout & Content Blocks</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: 'standard', name: 'Standard Narrative', desc: 'A clean, full-width content page featuring standard markdown text descriptions.' },
                  { id: 'about-grid', name: 'About Bento Grid', desc: 'A modern multi-column layout with office details, Google Map iframe, phone, email, and a featured image gallery.' },
                  { id: 'contact-grid', name: 'Contact Columns Grid', desc: 'Two-column design including an active customer contact form on the left, and rich touchpoints/socials on the right.' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPageEditorState(prev => ({ ...prev, layout: item.id }))}
                    className={cn(
                      "text-left p-5 rounded-2xl border-2 transition-all flex flex-col gap-2 h-full",
                      pageEditorState.layout === item.id 
                        ? "border-primary bg-orange-50/20" 
                        : "border-gray-100 hover:border-gray-200"
                    )}
                  >
                    <span className="font-extrabold text-sm text-gray-900">{item.name}</span>
                    <span className="text-xs text-gray-500 font-medium leading-normal">{item.desc}</span>
                  </button>
                ))}
              </div>

              {pageEditorState.layout !== 'standard' && (
                <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  <h5 className="text-xs font-black text-gray-800 uppercase tracking-wider mb-2">Configure Layout Block Elements</h5>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-extrabold text-gray-600 uppercase">Contact Email</label>
                      <input
                        type="email"
                        value={pageEditorState.email}
                        onChange={e => setPageEditorState(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="e.g. hello@baliadventours.com"
                        className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:border-primary focus:outline-none font-bold"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-extrabold text-gray-600 uppercase">Direct Phone / Hotline</label>
                      <input
                        type="text"
                        value={pageEditorState.phone}
                        onChange={e => setPageEditorState(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="e.g. +62 812 4650 2939"
                        className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:border-primary focus:outline-none font-bold"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-extrabold text-gray-600 uppercase">WhatsApp Number (e.g. 6281246502939)</label>
                      <input
                        type="text"
                        value={pageEditorState.whatsapp}
                        onChange={e => setPageEditorState(prev => ({ ...prev, whatsapp: e.target.value }))}
                        placeholder="e.g. 6281246502939"
                        className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:border-primary focus:outline-none font-bold"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-extrabold text-gray-600 uppercase">Office Address</label>
                      <input
                        type="text"
                        value={pageEditorState.address}
                        onChange={e => setPageEditorState(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="e.g. Jln. Raya Ubud, Ubud, Gianyar, Bali"
                        className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:border-primary focus:outline-none font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-gray-600 uppercase">Google Maps Embed URL / Iframe Code</label>
                    <textarea
                      value={pageEditorState.mapsEmbed}
                      onChange={e => {
                        const val = e.target.value;
                        if (val.trim().startsWith('<iframe')) {
                          const match = val.match(/src="([^"]+)"/);
                          if (match && match[1]) {
                            setPageEditorState(prev => ({ ...prev, mapsEmbed: match[1] }));
                            return;
                          }
                        }
                        setPageEditorState(prev => ({ ...prev, mapsEmbed: val }));
                      }}
                      placeholder="Paste your Google Maps embed URL (https://www.google.com/maps/embed?...) or full iframe HTML"
                      rows={2}
                      className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:border-primary focus:outline-none font-mono"
                    />
                    <p className="text-[10px] text-gray-400 font-medium">Tip: On Google Maps, click Share to Embed a map to Copy HTML. Paste it here and we will extract the exact coordinate source automatically!</p>
                  </div>

                  {/* Social Media Block */}
                  <div className="space-y-3 pt-4 border-t border-gray-100">
                    <label className="text-[10px] font-black text-gray-700 uppercase tracking-wider">Social Media Links</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Instagram Link</span>
                        <input
                          type="text"
                          value={pageEditorState.instagram}
                          onChange={e => setPageEditorState(prev => ({ ...prev, instagram: e.target.value }))}
                          placeholder="e.g. https://instagram.com/baliadventours"
                          className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs focus:border-primary focus:outline-none font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Facebook Link</span>
                        <input
                          type="text"
                          value={pageEditorState.facebook}
                          onChange={e => setPageEditorState(prev => ({ ...prev, facebook: e.target.value }))}
                          placeholder="e.g. https://facebook.com/baliadventours"
                          className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs focus:border-primary focus:outline-none font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">YouTube Link</span>
                        <input
                          type="text"
                          value={pageEditorState.youtube}
                          onChange={e => setPageEditorState(prev => ({ ...prev, youtube: e.target.value }))}
                          placeholder="e.g. https://youtube.com/@baliadventours"
                          className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs focus:border-primary focus:outline-none font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Twitter / X Link</span>
                        <input
                          type="text"
                          value={pageEditorState.twitter}
                          onChange={e => setPageEditorState(prev => ({ ...prev, twitter: e.target.value }))}
                          placeholder="e.g. https://x.com/baliadventours"
                          className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs focus:border-primary focus:outline-none font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Featured Images Block */}
                  <div className="space-y-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-gray-700 uppercase tracking-wider">Featured Images Grid Gallery</label>
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={async (e) => {
                            const files = e.target.files;
                            if (!files || files.length === 0) return;
                            setUploadingImage(true);
                            try {
                              const uploadedUrls: string[] = [];
                              for (let i = 0; i < files.length; i++) {
                                const url = await uploadImage(files[i]);
                                uploadedUrls.push(url);
                              }
                              setPageEditorState(prev => ({
                                ...prev,
                                featuredImages: [...prev.featuredImages, ...uploadedUrls]
                              }));
                            } catch (err) {
                              console.error(err);
                              alert('Failed to upload image gallery files.');
                            } finally {
                              setUploadingImage(false);
                            }
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          disabled={uploadingImage}
                        />
                        <button type="button" className="px-4 py-2 bg-gray-950 text-white font-bold rounded-lg text-[10px] uppercase tracking-widest hover:bg-gray-800 transition">
                          + Upload Gallery Image
                        </button>
                      </div>
                    </div>

                    {pageEditorState.featuredImages.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {pageEditorState.featuredImages.map((img, idx) => (
                          <div key={idx} className="relative aspect-video rounded-xl overflow-hidden shadow-sm border border-gray-100 group">
                            <img src={img} className="w-full h-full object-cover" alt="Gallery item" />
                            <button
                              type="button"
                              onClick={() => setPageEditorState(prev => ({
                                ...prev,
                                featuredImages: prev.featuredImages.filter((_, i) => i !== idx)
                              }))}
                              className="absolute top-1.5 right-1.5 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-gray-400 font-bold">No gallery images added yet. Click upload to build a showcase portfolio!</p>
                    )}
                  </div>

                  {pageEditorState.layout === 'contact-grid' && (
                    <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                      <input
                        type="checkbox"
                        id="showContactForm"
                        checked={pageEditorState.showContactForm}
                        onChange={e => setPageEditorState(prev => ({ ...prev, showContactForm: e.target.checked }))}
                        className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                      />
                      <label htmlFor="showContactForm" className="text-[10px] font-black text-gray-700 uppercase tracking-wider cursor-pointer">
                        Enable Interactive Customer Contact Form (Integrated with Mail Settings)
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Body Content Textarea */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">Page Body / Custom Content Narrative (Markdown/HTML supported)</label>
              <textarea
                value={pageEditorState.content}
                onChange={e => setPageEditorState(prev => ({ ...prev, content: e.target.value }))}
                rows={12}
                placeholder="Write your custom narrative, intro, mission, or description details here..."
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-primary focus:bg-white focus:outline-none text-sm font-medium min-h-[250px] font-sans"
              />
            </div>

            {/* SEO Section */}
            <div className="pt-6 border-t border-gray-100 space-y-4 bg-gray-50/30 p-4 rounded-xl border border-gray-100">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-primary" />
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">SEO Search Metadata (Optional overrides)</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase">Search Page Title (Meta Title)</label>
                  <input
                    value={pageEditorState.seoTitle}
                    onChange={e => setPageEditorState(prev => ({ ...prev, seoTitle: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 p-3 text-xs focus:border-primary outline-none"
                    placeholder="Page Browser Meta Title"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase">Search Snippet Description (Meta Desc)</label>
                  <textarea
                    value={pageEditorState.seoDescription}
                    onChange={e => setPageEditorState(prev => ({ ...prev, seoDescription: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 p-3 text-xs focus:border-primary outline-none resize-none"
                    rows={2}
                    placeholder="Short SEO snippet overview..."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
