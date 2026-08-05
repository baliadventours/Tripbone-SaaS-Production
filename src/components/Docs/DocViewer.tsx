import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { 
  BookOpen, Search, ChevronRight, ChevronLeft, Image as ImageIcon, 
  ExternalLink, Layers, Copy, Check, Sparkles, FileText,
  HelpCircle, ArrowLeft, Menu, X, Plus, Globe,
  CheckCircle2, ListOrdered, Share2
} from 'lucide-react';
import { db, collection, onSnapshot } from '../../lib/firebase';
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

  // Table of Contents
  const tableOfContents = useMemo(() => {
    if (!activeArticle) return [];
    const toc: { id: string; text: string; level: number }[] = [];

    if (activeArticle.subTitle) {
      toc.push({ id: 'overview-subtitle', text: activeArticle.subTitle, level: 1 });
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
    <div className="min-h-screen bg-[#090d16] text-slate-100 font-sans antialiased selection:bg-cyan-500/20 selection:text-cyan-300">
      
      {/* Top Bar Navigation */}
      <header className="sticky top-0 z-40 bg-[#090d16]/95 backdrop-blur-md border-b border-slate-800/60 px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700/50"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link to="/docs" className="flex items-center space-x-3 group">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-bold transition group-hover:bg-cyan-500/20">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-sm tracking-tight text-white group-hover:text-cyan-400 transition">
                  docs.tripbone.com
                </span>
                <span className="text-[10px] font-mono font-bold bg-slate-800/90 text-cyan-400 border border-slate-700 px-1.5 py-0.5 rounded">
                  v2.5
                </span>
              </div>
            </Link>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-sm hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs font-medium text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 transition"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-[11px]"
              >
                Clear
              </button>
            )}
          </div>

          {/* Action Links */}
          <div className="flex items-center space-x-2">
            {onOpenManageModal && (
              <button
                onClick={onOpenManageModal}
                className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 font-bold text-xs flex items-center space-x-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Manage Docs</span>
              </button>
            )}
            <Link
              to="/admin"
              className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center space-x-1.5 border border-slate-700/60 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Back office</span>
            </Link>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="mt-2.5 sm:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search docs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </header>

      {/* Main Documentation Grid Layout */}
      <div className="max-w-7xl mx-auto flex min-h-[calc(100vh-57px)]">
        
        {/* Sidebar Index Navigation */}
        <aside className={`
          fixed lg:sticky top-[57px] z-30 w-64 h-[calc(100vh-57px)] bg-[#090d16] lg:bg-transparent border-r border-slate-800/60
          overflow-y-auto p-4 transition-transform duration-200 shrink-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          {searchQuery && (
            <div className="mb-4 bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                <span>Search ({searchResults.length})</span>
                <button onClick={() => setSearchQuery('')} className="text-cyan-400">Clear</button>
              </div>
              {searchResults.length === 0 ? (
                <p className="text-xs text-slate-500">No matching docs.</p>
              ) : (
                searchResults.map(art => (
                  <button
                    key={art.id}
                    onClick={() => {
                      navigate(`/docs/${art.slug || art.id}`);
                      setSearchQuery('');
                      setIsSidebarOpen(false);
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-800/80 transition group"
                  >
                    <p className="text-xs font-bold text-slate-200 group-hover:text-cyan-400">{art.title}</p>
                    <p className="text-[10px] text-slate-400 line-clamp-1">{art.category}</p>
                  </button>
                ))
              )}
            </div>
          )}

          <div className="space-y-6">
            {Object.keys(groupedCategories).map((category) => (
              <div key={category} className="space-y-1">
                <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 px-2 py-1 flex items-center justify-between">
                  <span>{category}</span>
                  <span className="text-[10px] font-mono bg-slate-800/80 px-1.5 py-0.2 rounded text-slate-400">
                    {groupedCategories[category].length}
                  </span>
                </h4>

                <div className="space-y-0.5 border-l border-slate-800 ml-2 pl-2">
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
                          w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition flex items-center justify-between group
                          ${isActive 
                            ? 'bg-cyan-500/10 text-cyan-400 font-semibold border-l-2 border-cyan-400 -ml-[9px] pl-3' 
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
        </aside>

        {/* Center Main Doc Reader */}
        <main className="flex-1 min-w-0 p-6 lg:p-10 border-r border-slate-800/60">
          {activeArticle ? (
            <article className="max-w-3xl space-y-8">
              
              {/* Breadcrumb */}
              <div className="flex items-center space-x-2 text-xs font-medium text-slate-400">
                <Link to="/docs" className="hover:text-cyan-400 transition">Docs</Link>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-slate-300">{activeArticle.category}</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-cyan-400 font-medium truncate">{activeArticle.title}</span>
              </div>

              {/* Title Section */}
              <div className="space-y-3 pb-6 border-b border-slate-800/80">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {activeArticle.category}
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
                      {activeArticle.title}
                    </h1>
                  </div>

                  <button
                    onClick={handleCopyShare}
                    title="Share Link"
                    className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs shrink-0 border border-slate-700/50"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{copiedLink ? 'Copied' : 'Share'}</span>
                  </button>
                </div>

                {activeArticle.subTitle && (
                  <h2 id="overview-subtitle" className="text-base font-semibold text-slate-300">
                    {activeArticle.subTitle}
                  </h2>
                )}

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-1">
                  {activeArticle.description}
                </p>
              </div>

              {/* HTML / Body Content */}
              {activeArticle.content && (
                <div 
                  className="prose prose-invert prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-100 prose-p:text-slate-300 prose-a:text-cyan-400 prose-strong:text-slate-100 text-xs sm:text-sm leading-relaxed space-y-4"
                  dangerouslySetInnerHTML={{ __html: activeArticle.content }}
                />
              )}

              {/* Step-by-Step Instructions */}
              {activeArticle.steps && activeArticle.steps.length > 0 && (
                <div id="steps-section" className="space-y-4 pt-2">
                  <div className="flex items-center space-x-2 border-b border-slate-800/80 pb-2.5">
                    <ListOrdered className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Step-by-Step Instructions</h3>
                  </div>

                  <div className="space-y-4">
                    {activeArticle.steps.map((step, idx) => (
                      <div 
                        key={idx} 
                        id={`step-${idx}`}
                        className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2 hover:border-slate-700/80 transition"
                      >
                        <div className="flex items-center space-x-2.5">
                          <span className="w-6 h-6 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-extrabold text-xs flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <h4 className="font-bold text-slate-100 text-xs sm:text-sm">{step.title}</h4>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed pl-8">
                          {step.desc}
                        </p>
                        {step.image && (
                          <div className="pl-8 pt-2">
                            <img 
                              src={step.image} 
                              alt={step.title} 
                              className="rounded-lg border border-slate-800 max-h-72 object-cover shadow-md"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Images Reference */}
              {activeArticle.images && activeArticle.images.length > 0 && (
                <div id="gallery-section" className="space-y-3 pt-2">
                  <div className="flex items-center space-x-2 border-b border-slate-800/80 pb-2.5">
                    <ImageIcon className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Visual Reference</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeArticle.images.map((imgUrl, i) => (
                      <a 
                        key={i} 
                        href={imgUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="group relative rounded-xl overflow-hidden border border-slate-800 hover:border-cyan-500/40 transition bg-slate-900 block"
                      >
                        <img src={imgUrl} alt={`Ref ${i}`} className="w-full h-40 object-cover group-hover:scale-105 transition duration-300" />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-xs font-bold text-white gap-1">
                          <ExternalLink className="w-3.5 h-3.5" /> Expand
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Navigation Pagination Buttons */}
              <div className="pt-8 mt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                {prevArticle ? (
                  <button
                    onClick={() => navigate(`/docs/${prevArticle.slug || prevArticle.id}`)}
                    className="w-full sm:w-auto px-4 py-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition text-left group flex items-center space-x-3"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition" />
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Previous</span>
                      <p className="text-xs font-semibold text-slate-200 group-hover:text-cyan-400 truncate max-w-[180px]">
                        {prevArticle.title}
                      </p>
                    </div>
                  </button>
                ) : <div />}

                {nextArticle ? (
                  <button
                    onClick={() => navigate(`/docs/${nextArticle.slug || nextArticle.id}`)}
                    className="w-full sm:w-auto px-4 py-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition text-right group flex items-center justify-end space-x-3 ml-auto"
                  >
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Next</span>
                      <p className="text-xs font-semibold text-slate-200 group-hover:text-cyan-400 truncate max-w-[180px]">
                        {nextArticle.title}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition" />
                  </button>
                ) : <div />}
              </div>

            </article>
          ) : (
            <div className="text-center py-20 space-y-3">
              <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-300">No article selected</h3>
              <p className="text-xs text-slate-500">Select a guide from the sidebar index to view content.</p>
            </div>
          )}
        </main>

        {/* Right Table of Contents */}
        <aside className="hidden xl:block w-56 h-[calc(100vh-57px)] sticky top-[57px] p-5 overflow-y-auto shrink-0">
          <div className="space-y-4">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              On This Page
            </p>

            {tableOfContents.length > 0 ? (
              <nav className="space-y-1 text-xs">
                {tableOfContents.map((item, idx) => (
                  <a
                    key={idx}
                    href={`#${item.id}`}
                    className={`
                      block truncate transition hover:text-cyan-400 py-0.5
                      ${item.level === 1 ? 'font-semibold text-slate-300' : 'pl-2.5 text-slate-400'}
                    `}
                  >
                    {item.text}
                  </a>
                ))}
              </nav>
            ) : (
              <p className="text-xs text-slate-500 italic">No section headers</p>
            )}

            <div className="pt-5 border-t border-slate-800 space-y-2">
              <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20 space-y-1.5">
                <p className="text-xs font-bold text-cyan-400">Need Assistance?</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Have questions about setup or custom APIs? Contact merchant support.
                </p>
                <Link
                  to="/contact"
                  className="inline-flex items-center space-x-1 text-xs font-semibold text-cyan-400 hover:underline pt-1"
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
