import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { 
  BookOpen, Search, ChevronRight, ChevronLeft, Image as ImageIcon, 
  ExternalLink, Layers, Copy, Check, Sparkles, FileText,
  HelpCircle, ArrowLeft, ArrowRight, Menu, X, Edit3, Plus, Globe,
  CheckCircle2, ListOrdered, Share2
} from 'lucide-react';
import { db, collection, getDocs, onSnapshot, query, where, orderBy } from '../../lib/firebase';
import { useTenant } from '../../lib/TenantContext';

export interface DocArticle {
  id: string;
  slug: string;
  title: string;
  subTitle?: string;
  subSubTitle?: string;
  category: string;
  categoryOrder?: number;
  description: string;
  content: string; // Markdown or HTML string
  steps?: { title: string; desc: string; image?: string }[];
  images?: string[];
  order: number;
  status: 'published' | 'draft';
  updatedAt?: any;
  createdAt?: any;
}

const DEFAULT_DOC_ARTICLES: DocArticle[] = [
  {
    id: 'getting-started',
    slug: 'getting-started',
    title: 'Getting Started with Tripbone SaaS',
    subTitle: 'System Introduction',
    subSubTitle: 'Overview & Prerequisites',
    category: 'Getting Started',
    categoryOrder: 1,
    description: 'Learn how to set up your travel website, configure branding, and publish your first tour product in under 10 minutes.',
    content: `
      <h2>Welcome to Tripbone Travel SaaS</h2>
      <p>Tripbone is an all-in-one travel commerce platform designed to power tour operators, travel agencies, and activity vendors worldwide with automated bookings, multi-gateway payments, and AI itineraries.</p>

      <h3>Key Capabilities</h3>
      <ul>
        <li><strong>Multi-Currency & Instant Conversion:</strong> Charge customers in their local currency automatically.</li>
        <li><strong>BYOPG (Bring Your Own Payment Gateway):</strong> Connect Stripe, Midtrans, Xendit, Razorpay, or PayPal directly.</li>
        <li><strong>AI Tour Magic Generator:</strong> Generate full multi-day itineraries with photos, inclusions, and prices in seconds.</li>
      </ul>
    `,
    steps: [
      {
        title: 'Step 1: Access Admin Console',
        desc: 'Log in to your workspace dashboard using your merchant credentials or impersonate session from SuperAdmin.',
        image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80'
      },
      {
        title: 'Step 2: Configure Workspace Branding',
        desc: 'Upload your company logo, set primary theme colors, and connect your custom domain under Workspace Settings.',
        image: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80'
      },
      {
        title: 'Step 3: Publish Your First Tour',
        desc: 'Head to Tour Manager, click "Add New Tour" or use AI Magic to create complete tour packages with galleries and pricing.'
      }
    ],
    images: [
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80'
    ],
    order: 1,
    status: 'published'
  },
  {
    id: 'payment-gateways-setup',
    slug: 'payment-gateways-setup',
    title: 'Connecting Payment Gateways (BYOPG)',
    subTitle: 'Financial Configuration',
    subSubTitle: 'Stripe, Midtrans, Xendit & PayPal',
    category: 'Payment Integration',
    categoryOrder: 2,
    description: 'A step-by-step guide to setting up automated payment processors to collect guest payments directly into your account.',
    content: `
      <h2>Universal Payment Gateway Architecture</h2>
      <p>Tripbone allows you to enable multiple payment options simultaneously. Guest transactions are routed directly to your merchant gateway accounts without platform middleman holds.</p>

      <h3>Supported Gateways</h3>
      <p>Configure keys for <strong>Stripe</strong>, <strong>Midtrans</strong>, <strong>Xendit</strong>, <strong>Razorpay</strong>, <strong>Adyen</strong>, <strong>PayPal</strong>, <strong>Bank Transfer</strong>, or <strong>Pay on Arrival</strong>.</p>
    `,
    steps: [
      {
        title: 'Step 1: Navigate to Payment Settings',
        desc: 'Open Admin Console -> Settings -> Payment Manager.'
      },
      {
        title: 'Step 2: Enter API Credentials',
        desc: 'Toggle your preferred gateway (e.g. Stripe) to Enabled. Paste your Publishable Key and Secret Key.',
        image: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=800&q=80'
      },
      {
        title: 'Step 3: Save & Diagnostic Check',
        desc: 'Click "Save Settings". The system validates credentials and verifies Firestore synchronization.'
      }
    ],
    order: 1,
    status: 'published'
  },
  {
    id: 'custom-domain-setup',
    slug: 'custom-domain-setup',
    title: 'Setting Up Custom Domains & CNAME',
    subTitle: 'Domain & SSL Settings',
    subSubTitle: 'DNS Records & Cloudflare Routing',
    category: 'Domain & SEO',
    categoryOrder: 3,
    description: 'Point your custom website domain (e.g., tours.yourbrand.com) to your Tripbone website cluster seamlessly.',
    content: `
      <h2>Custom Domain Configuration</h2>
      <p>Connect your custom domain name with free automated SSL certificates and global CDN edge acceleration.</p>
    `,
    steps: [
      {
        title: 'Step 1: Add CNAME Record',
        desc: 'In your DNS provider (Cloudflare, GoDaddy, Namecheap), add a CNAME record pointing to tripbone.com.'
      },
      {
        title: 'Step 2: Update Workspace Settings',
        desc: 'Enter your domain name under Workspace Settings -> Domain Mapping.'
      }
    ],
    order: 1,
    status: 'published'
  }
];

interface DocViewerProps {
  onOpenManageModal?: () => void;
  isSuperAdmin?: boolean;
}

export default function DocViewer({ onOpenManageModal, isSuperAdmin = false }: DocViewerProps) {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const { isMaster } = useTenant();

  const [articles, setArticles] = useState<DocArticle[]>(DEFAULT_DOC_ARTICLES);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Load articles from Firestore `documentation_articles`
  useEffect(() => {
    const q = collection(db, 'documentation_articles');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as DocArticle[];
        docs.sort((a, b) => (a.order || 0) - (b.order || 0));
        setArticles(docs);
      }
    }, (error) => {
      console.warn("Docs collection snapshot fallback:", error);
    });

    return () => unsubscribe();
  }, []);

  // Filtered published articles
  const publishedArticles = useMemo(() => {
    return articles.filter(a => a.status === 'published' || isSuperAdmin);
  }, [articles, isSuperAdmin]);

  // Group articles by Category
  const groupedCategories = useMemo(() => {
    const groups: { [key: string]: DocArticle[] } = {};
    publishedArticles.forEach(art => {
      const cat = art.category || 'General';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(art);
    });

    // Sort items within each category
    Object.keys(groups).forEach(cat => {
      groups[cat].sort((a, b) => (a.order || 0) - (b.order || 0));
    });

    return groups;
  }, [publishedArticles]);

  // Active Article selection
  const activeArticle = useMemo(() => {
    if (slug) {
      const found = publishedArticles.find(a => a.slug === slug || a.id === slug);
      if (found) return found;
    }
    return publishedArticles[0] || DEFAULT_DOC_ARTICLES[0];
  }, [slug, publishedArticles]);

  // Search Results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const queryLower = searchQuery.toLowerCase();
    return publishedArticles.filter(art => 
      art.title.toLowerCase().includes(queryLower) ||
      art.description.toLowerCase().includes(queryLower) ||
      art.category.toLowerCase().includes(queryLower) ||
      art.subTitle?.toLowerCase().includes(queryLower) ||
      art.subSubTitle?.toLowerCase().includes(queryLower)
    );
  }, [searchQuery, publishedArticles]);

  // Flattened ordered list for Prev / Next navigation
  const flatArticles = useMemo(() => {
    const list: DocArticle[] = [];
    Object.keys(groupedCategories).forEach(cat => {
      list.push(...groupedCategories[cat]);
    });
    return list;
  }, [groupedCategories]);

  const currentIndex = useMemo(() => {
    return flatArticles.findIndex(a => a.id === activeArticle?.id || a.slug === activeArticle?.slug);
  }, [flatArticles, activeArticle]);

  const prevArticle = currentIndex > 0 ? flatArticles[currentIndex - 1] : null;
  const nextArticle = currentIndex < flatArticles.length - 1 ? flatArticles[currentIndex + 1] : null;

  // Generate Table of Contents (ToC) from active article
  const tableOfContents = useMemo(() => {
    if (!activeArticle) return [];
    const toc: { id: string; text: string; level: number }[] = [];

    if (activeArticle.subTitle) {
      toc.push({ id: 'overview-subtitle', text: activeArticle.subTitle, level: 1 });
    }
    if (activeArticle.subSubTitle) {
      toc.push({ id: 'overview-subsubtitle', text: activeArticle.subSubTitle, level: 2 });
    }

    if (activeArticle.steps && activeArticle.steps.length > 0) {
      toc.push({ id: 'steps-section', text: 'Step-by-Step Instructions', level: 1 });
      activeArticle.steps.forEach((step, idx) => {
        toc.push({ id: `step-${idx}`, text: step.title, level: 2 });
      });
    }

    if (activeArticle.images && activeArticle.images.length > 0) {
      toc.push({ id: 'gallery-section', text: 'Visual Reference', level: 1 });
    }

    return toc;
  }, [activeArticle]);

  const handleCopyShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Header / Brand Nav */}
      <header className="sticky top-0 z-40 bg-[#0f172a]/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link to="/docs" className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-black shadow-lg shadow-cyan-500/20">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                  docs.tripbone.com
                  <span className="text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                    v2.5
                  </span>
                </span>
                <p className="text-[10px] text-slate-400 font-medium">Tripbone SaaS Knowledge Engine</p>
              </div>
            </Link>
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 max-w-md hidden sm:block">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search guides, APIs, steps, keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700/70 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs font-bold"
              >
                Clear
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            {onOpenManageModal && (
              <button
                onClick={onOpenManageModal}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-cyan-500/20 transition"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Manage Docs</span>
              </button>
            )}
            <Link
              to="/admin"
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center space-x-1 border border-slate-700/60"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Back office</span>
            </Link>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="mt-3 sm:hidden">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search docs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </header>

      {/* Main Docusaurus Layout Container */}
      <div className="max-w-7xl mx-auto flex min-h-[calc(100vh-65px)]">
        
        {/* Left Sidebar Navigation */}
        <aside className={`
          fixed lg:sticky top-[65px] z-30 w-72 h-[calc(100vh-65px)] bg-[#0f172a] lg:bg-transparent border-r border-slate-800/80 
          overflow-y-auto p-5 transition-transform duration-200 shrink-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          {/* Search Dropdown overlay if search active */}
          {searchQuery && (
            <div className="mb-6 bg-slate-800/90 border border-slate-700 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
                <span>Search Results ({searchResults.length})</span>
                <button onClick={() => setSearchQuery('')} className="text-cyan-400">Close</button>
              </div>
              {searchResults.length === 0 ? (
                <p className="text-xs text-slate-400 p-2">No matching documentation found.</p>
              ) : (
                searchResults.map(art => (
                  <button
                    key={art.id}
                    onClick={() => {
                      navigate(`/docs/${art.slug || art.id}`);
                      setSearchQuery('');
                      setIsSidebarOpen(false);
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-700/60 transition group"
                  >
                    <p className="text-xs font-bold text-slate-200 group-hover:text-cyan-400">{art.title}</p>
                    <p className="text-[10px] text-slate-400 line-clamp-1">{art.category} • {art.description}</p>
                  </button>
                ))
              )}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-3 px-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                Documentation Index
              </p>
              
              <div className="space-y-5">
                {Object.keys(groupedCategories).map((category) => (
                  <div key={category} className="space-y-1">
                    <h4 className="text-xs font-extrabold text-slate-300 px-2 py-1 tracking-wide flex items-center justify-between">
                      <span>{category}</span>
                      <span className="text-[10px] font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
                        {groupedCategories[category].length}
                      </span>
                    </h4>

                    <div className="space-y-0.5 pl-1 border-l border-slate-800 ml-2">
                      {groupedCategories[category].map((art) => {
                        const isActive = activeArticle?.id === art.id || activeArticle?.slug === art.slug;
                        return (
                          <button
                            key={art.id}
                            onClick={() => {
                              navigate(`/docs/${art.slug || art.id}`);
                              setIsSidebarOpen(false);
                            }}
                            className={`
                              w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center justify-between group
                              ${isActive 
                                ? 'bg-cyan-500/10 text-cyan-400 font-bold border-l-2 border-cyan-400 -ml-[1px]' 
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}
                            `}
                          >
                            <span className="truncate">{art.title}</span>
                            {isActive && <ChevronRight className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Center Main Article Content */}
        <main className="flex-1 min-w-0 p-6 lg:p-10 border-r border-slate-800/80">
          {activeArticle ? (
            <article className="max-w-3xl space-y-8">
              
              {/* Breadcrumbs */}
              <div className="flex items-center space-x-2 text-xs font-medium text-slate-400">
                <Link to="/docs" className="hover:text-cyan-400">Docs</Link>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-slate-300">{activeArticle.category}</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-cyan-400 font-bold truncate">{activeArticle.title}</span>
              </div>

              {/* Title & Titles Stack */}
              <div className="space-y-3 pb-6 border-b border-slate-800">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mb-2">
                      {activeArticle.category}
                    </span>
                    <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                      {activeArticle.title}
                    </h1>
                  </div>

                  <button
                    onClick={handleCopyShare}
                    title="Share Documentation Link"
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs shrink-0"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                    <span className="hidden sm:inline">{copiedLink ? 'Copied' : 'Share'}</span>
                  </button>
                </div>

                {activeArticle.subTitle && (
                  <h2 id="overview-subtitle" className="text-lg font-bold text-slate-300">
                    {activeArticle.subTitle}
                  </h2>
                )}

                {activeArticle.subSubTitle && (
                  <h3 id="overview-subsubtitle" className="text-sm font-semibold text-cyan-400/90 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    {activeArticle.subSubTitle}
                  </h3>
                )}

                <p className="text-sm text-slate-300 leading-relaxed font-normal pt-2">
                  {activeArticle.description}
                </p>
              </div>

              {/* HTML / Markdown Description Body */}
              {activeArticle.content && (
                <div 
                  className="prose prose-invert prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-100 prose-p:text-slate-300 prose-a:text-cyan-400 prose-strong:text-slate-100 text-sm leading-relaxed space-y-4"
                  dangerouslySetInnerHTML={{ __html: activeArticle.content }}
                />
              )}

              {/* Structured Steps Section */}
              {activeArticle.steps && activeArticle.steps.length > 0 && (
                <div id="steps-section" className="space-y-6 pt-4">
                  <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
                    <ListOrdered className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-lg font-bold text-white">Step-by-Step Instructions</h3>
                  </div>

                  <div className="space-y-6">
                    {activeArticle.steps.map((step, idx) => (
                      <div 
                        key={idx} 
                        id={`step-${idx}`}
                        className="bg-slate-800/40 border border-slate-800 rounded-2xl p-5 space-y-3 transition hover:border-slate-700"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-extrabold text-xs flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <h4 className="font-bold text-slate-100 text-sm">{step.title}</h4>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed pl-10">
                          {step.desc}
                        </p>
                        {step.image && (
                          <div className="pl-10 pt-2">
                            <img 
                              src={step.image} 
                              alt={step.title} 
                              className="rounded-xl border border-slate-700/60 max-h-80 object-cover shadow-lg"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Visual Reference / Image Gallery */}
              {activeArticle.images && activeArticle.images.length > 0 && (
                <div id="gallery-section" className="space-y-4 pt-4">
                  <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
                    <ImageIcon className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-lg font-bold text-white">Visual Reference</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {activeArticle.images.map((imgUrl, i) => (
                      <a 
                        key={i} 
                        href={imgUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="group relative rounded-2xl overflow-hidden border border-slate-800 hover:border-cyan-500/50 transition bg-slate-900 block"
                      >
                        <img src={imgUrl} alt={`Ref ${i}`} className="w-full h-48 object-cover group-hover:scale-105 transition duration-300" />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-xs font-bold text-white gap-1">
                          <ExternalLink className="w-4 h-4" /> Expand
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Previous & Next Page Buttons */}
              <div className="pt-10 mt-10 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                {prevArticle ? (
                  <button
                    onClick={() => navigate(`/docs/${prevArticle.slug || prevArticle.id}`)}
                    className="w-full sm:w-auto p-4 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition text-left group flex items-center space-x-3"
                  >
                    <ChevronLeft className="w-5 h-5 text-slate-400 group-hover:text-cyan-400 transition" />
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Previous</span>
                      <p className="text-xs font-bold text-slate-200 group-hover:text-cyan-400 truncate max-w-[180px] sm:max-w-[220px]">
                        {prevArticle.title}
                      </p>
                    </div>
                  </button>
                ) : <div />}

                {nextArticle ? (
                  <button
                    onClick={() => navigate(`/docs/${nextArticle.slug || nextArticle.id}`)}
                    className="w-full sm:w-auto p-4 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition text-right group flex items-center justify-end space-x-3 ml-auto"
                  >
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Next</span>
                      <p className="text-xs font-bold text-slate-200 group-hover:text-cyan-400 truncate max-w-[180px] sm:max-w-[220px]">
                        {nextArticle.title}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-cyan-400 transition" />
                  </button>
                ) : <div />}
              </div>

            </article>
          ) : (
            <div className="text-center py-20 space-y-4">
              <BookOpen className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-lg font-bold text-slate-300">No article selected</h3>
              <p className="text-xs text-slate-400">Select a guide from the sidebar navigation to get started.</p>
            </div>
          )}
        </main>

        {/* Right Sidebar: Dynamic Table of Contents (ToC) */}
        <aside className="hidden xl:block w-64 h-[calc(100vh-65px)] sticky top-[65px] p-6 overflow-y-auto shrink-0">
          <div className="space-y-4">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              On This Page
            </p>

            {tableOfContents.length > 0 ? (
              <nav className="space-y-1.5 text-xs">
                {tableOfContents.map((item, idx) => (
                  <a
                    key={idx}
                    href={`#${item.id}`}
                    className={`
                      block truncate transition hover:text-cyan-400
                      ${item.level === 1 ? 'font-bold text-slate-300' : 'pl-3 font-normal text-slate-400'}
                    `}
                  >
                    {item.text}
                  </a>
                ))}
              </nav>
            ) : (
              <p className="text-xs text-slate-400 italic">No section headers</p>
            )}

            <div className="pt-6 border-t border-slate-800 space-y-3">
              <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 space-y-2">
                <p className="text-xs font-bold text-cyan-300">Need Assistance?</p>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Have questions about setup or custom API integration? Contact merchant support.
                </p>
                <Link
                  to="/contact"
                  className="inline-flex items-center space-x-1 text-xs font-bold text-cyan-400 hover:text-cyan-300 pt-1"
                >
                  <span>Contact Support</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
}
