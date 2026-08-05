import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { 
  BookOpen, Search, ChevronRight, ChevronLeft, Image as ImageIcon, 
  ExternalLink, Layers, Copy, Check, Sparkles, FileText,
  HelpCircle, ArrowLeft, Menu, X, Plus, Globe,
  CheckCircle2, ListOrdered, Share2, Sun, Moon, Settings, FolderPlus
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

export interface DocCategory {
  id: string;
  name: string;
  description?: string;
  order: number;
}

export const DEFAULT_DOC_CATEGORIES: DocCategory[] = [
  { id: 'cat-1', name: 'Getting Started', description: 'Platform introduction, features, AI capabilities, and USP comparison', order: 1 },
  { id: 'cat-2', name: 'Requirement', description: 'System prerequisites: Email, Payment, Gemini, WhatsApp, Domain & Cloudflare', order: 2 },
  { id: 'cat-3', name: 'Installation', description: 'Step-by-step setup and workspace initialization guide', order: 3 },
  { id: 'cat-4', name: 'Website Setting', description: 'Global website configurations: Communication, BYOPG Payments, Branding & SEO', order: 4 },
  { id: 'cat-5', name: 'Website Builder', description: 'Presets, page layouts, header, hero, custom menu, and landing pages', order: 5 },
  { id: 'cat-6', name: 'Manage Website', description: 'Tours CRUD, Step-by-step guides, Locations, Add-Ons, Transport, Destinations, Drivers & Tiered Pricing', order: 6 },
  { id: 'cat-7', name: 'Manage Booking', description: 'Order processing, manual/CSV booking import, and Channel Manager integration', order: 7 },
  { id: 'cat-8', name: 'Inquiry & Sales', description: 'Incoming inquiries, AI Proposal Generator, and discount coupons', order: 8 },
  { id: 'cat-9', name: 'Support & Ticket', description: 'Customer support ticketing system and helpdesk management', order: 9 },
  { id: 'cat-10', name: 'Blog', description: 'Managing blog posts, travel news, SEO articles, and categories', order: 10 },
  { id: 'cat-11', name: 'Pages & Landing Page Generator', description: 'Custom pages creation and AI-powered Landing Page Generator', order: 11 },
  { id: 'cat-12', name: 'Pop Up', description: 'Promotional popups, announcement banners, and exit-intent lead forms', order: 12 },
  { id: 'cat-13', name: 'Reviews', description: 'Customer feedback collection, moderation, and rating badges', order: 13 },
  { id: 'cat-14', name: 'User Management', description: 'Team members, staff roles, vendor access, and permission management', order: 14 },
  { id: 'cat-15', name: 'Finance Report', description: 'Financial analytics, sales breakdown, payouts, and revenue reporting', order: 15 },
];

export const DEFAULT_DOC_ARTICLES: DocArticle[] = [
  {
    id: 'getting-started-intro',
    slug: 'getting-started-intro',
    title: 'Introduction to Tripbone Travel SaaS',
    subTitle: 'System Introduction',
    subSubTitle: 'Features, AI Power & Unique Selling Points',
    category: 'Getting Started',
    categoryOrder: 1,
    description: 'Discover Tripbone\'s core capabilities, native AI magic, multi-tenant BYOPG architecture, and why it outperforms traditional booking engines.',
    content: `
      <h2>Welcome to Tripbone Travel SaaS</h2>
      <p>Tripbone is an enterprise-grade multi-tenant travel commerce platform purpose-built for tour operators, DMCs, and travel agencies. Unlike legacy booking engines that lock you into high transaction fees and fixed payment gateways, Tripbone puts complete control back in your hands.</p>

      <h3>1. Core Capabilities</h3>
      <ul>
        <li><strong>Multi-Currency & Instant FX Conversion:</strong> Process guest payments in 50+ fiat currencies with automated real-time conversion rates.</li>
        <li><strong>BYOPG (Bring Your Own Payment Gateway):</strong> Connect Stripe, Midtrans, Xendit, Razorpay, Adyen, PayPal, Bank Transfer, or Pay on Arrival directly to your account with 0% platform commission.</li>
        <li><strong>Multi-Tenant Workspace:</strong> Each merchant operates on an isolated tenant environment with dedicated custom domain, custom CSS/themes, and analytics.</li>
      </ul>

      <h3>2. AI-Powered Magic Engine</h3>
      <ul>
        <li><strong>AI Tour Itinerary Generator:</strong> Create full multi-day itineraries with photos, inclusions, exclusions, and pricing tiers in seconds via Google Gemini.</li>
        <li><strong>AI Proposal Generator:</strong> Generate personalized quote proposals for custom guest inquiries automatically.</li>
        <li><strong>AI Copywriting & SEO:</strong> Auto-optimize tour descriptions, meta titles, and tags for maximum search engine visibility.</li>
      </ul>

      <h3>3. Why Tripbone is Different from Legacy Booking Engines</h3>
      <table border="1" cellpadding="8" style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr style="background-color: #1e293b; color: #38bdf8;">
            <th>Feature</th>
            <th>Legacy Booking Engines</th>
            <th>Tripbone SaaS</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Commission Fees</strong></td>
            <td>1.5% - 6% per transaction</td>
            <td><strong>0% Platform Commission</strong> (Direct BYOPG)</td>
          </tr>
          <tr>
            <td><strong>Payment Gateways</strong></td>
            <td>Single tied provider with payout holds</td>
            <td><strong>Multi-Gateway Simultaneous Enablement</strong></td>
          </tr>
          <tr>
            <td><strong>AI Capabilities</strong></td>
            <td>Basic search or no AI</td>
            <td><strong>Native Gemini AI Tour & Proposal Generation</strong></td>
          </tr>
          <tr>
            <td><strong>Custom Domain & Branding</strong></td>
            <td>iFrame widgets or generic subdomains</td>
            <td><strong>Full White-Label & Custom Domain (CNAME)</strong></td>
          </tr>
        </tbody>
      </table>
    `,
    steps: [
      {
        title: 'Step 1: Access Your Admin Console',
        desc: 'Log in to your workspace dashboard using your merchant credentials or superadmin impersonation session.'
      },
      {
        title: 'Step 2: Review Workspace Features',
        desc: 'Explore the sidebar modules including Tour Manager, Website Builder, Booking Engine, and Financial Analytics.'
      }
    ],
    order: 1,
    status: 'published'
  },
  {
    id: 'requirements-prerequisites',
    slug: 'requirements-prerequisites',
    title: 'System Requirements & Technical Prerequisites',
    subTitle: 'System Setup',
    subSubTitle: 'Third-Party Services & API Keys',
    category: 'Requirement',
    categoryOrder: 2,
    description: 'Complete list of external services and API keys required to unlock full Tripbone capabilities.',
    content: `
      <h2>Prerequisites Checklist</h2>
      <p>Before launching your travel agency workspace, make sure you have prepared the following essential third-party service accounts:</p>

      <h3>1. Email Server (Transactional Emails)</h3>
      <ul>
        <li><strong>Supported Providers:</strong> Resend, Mailjet, SendGrid, or SMTP.</li>
        <li><strong>Purpose:</strong> Sending instant booking confirmations, voucher PDFs, and inquiry notifications to guests and staff.</li>
      </ul>

      <h3>2. Payment Gateways (BYOPG)</h3>
      <ul>
        <li><strong>Supported Providers:</strong> Stripe, PayPal, Midtrans, Xendit, Razorpay, Adyen, Bank Transfer, Pay on Arrival.</li>
        <li><strong>Purpose:</strong> Collecting deposit payments directly into your merchant bank account.</li>
      </ul>

      <h3>3. Gemini API Key</h3>
      <ul>
        <li><strong>Provider:</strong> Google AI Studio (Gemini 2.5 Flash / Pro).</li>
        <li><strong>Purpose:</strong> Powers AI Tour Itinerary Generator, Proposal Generator, and automated content translation.</li>
      </ul>

      <h3>4. WhatsApp API Key / Gateway</h3>
      <ul>
        <li><strong>Provider:</strong> WhatsApp Business Cloud API or Third-Party Provider (e.g. Fonnte / Wablas).</li>
        <li><strong>Purpose:</strong> Instant WhatsApp booking alerts and automated guest departure reminders.</li>
      </ul>

      <h3>5. Domain & Cloudflare DNS</h3>
      <ul>
        <li><strong>Provider:</strong> Cloudflare (Recommended for SSL & CDN), GoDaddy, Namecheap.</li>
        <li><strong>Purpose:</strong> Mapping your custom domain (e.g., tours.yourbrand.com) with automatic HTTPS/SSL routing.</li>
      </ul>
    `,
    order: 1,
    status: 'published'
  },
  {
    id: 'installation-guide',
    slug: 'installation-guide',
    title: 'Step-by-Step Installation Guide',
    subTitle: 'System Deployment',
    subSubTitle: 'Workspace Initialization & Activation',
    category: 'Installation',
    categoryOrder: 3,
    description: 'Detailed walk-through for initial workspace deployment, database provisioning, and first-time configuration.',
    content: `
      <h2>Installation & Provisioning Workflow</h2>
      <p>Setting up your Tripbone workspace takes less than 5 minutes. Follow these sequential steps to initialize your account.</p>
    `,
    steps: [
      {
        title: 'Step 1: Account & Tenant Provisioning',
        desc: 'Register a new tenant workspace or activate a client instance from the SaaS SuperAdmin Control Panel.'
      },
      {
        title: 'Step 2: Database Initialization',
        desc: 'The system automatically provisions isolated Firestore collections for tours, bookings, inquiries, and settings.'
      },
      {
        title: 'Step 3: Connect API Credentials',
        desc: 'Enter your Resend/Mailjet Email API key, Gemini API key, and Payment Gateway credentials under Admin -> Settings.'
      },
      {
        title: 'Step 4: Verify Domain & Publish',
        desc: 'Point your DNS CNAME record to the Tripbone cluster and activate your live travel portal.'
      }
    ],
    order: 1,
    status: 'published'
  },
  {
    id: 'website-setting-guide',
    slug: 'website-setting-guide',
    title: 'Website Settings & Configuration',
    subTitle: 'Global Configurations',
    subSubTitle: 'Communication, BYOPG Payments & Localization',
    category: 'Website Setting',
    categoryOrder: 4,
    description: 'Configure tenant-wide options including branding, currencies, deposit rules, email settings, and payment gateways.',
    content: `
      <h2>Workspace Settings Breakdown</h2>
      <p>Customize every operational facet of your travel portal from the central settings dashboard.</p>

      <h3>1. Communication & Email Settings</h3>
      <p>Configure transactional email templates, sender name, reply-to address, and SMTP/API keys for automated guest emails.</p>

      <h3>2. BYOPG Payment Gateway Settings</h3>
      <p>Configure deposit rules (fixed amount or percentage-based deposits), enable multiple active payment gateways, and configure keys.</p>

      <h3>3. Localization & Currencies</h3>
      <p>Set default display currency, secondary currencies, tax rates, and date formats.</p>
    `,
    order: 1,
    status: 'published'
  },
  {
    id: 'website-builder-guide',
    slug: 'website-builder-guide',
    title: 'Website Builder & Visual Customization',
    subTitle: 'Design & Layout',
    subSubTitle: 'Presets, Custom Header, Hero Section & Menus',
    category: 'Website Builder',
    categoryOrder: 5,
    description: 'Learn how to customize your travel portal design using layout presets, dynamic hero sliders, custom navigation, and footer builders.',
    content: `
      <h2>Visual Website Builder</h2>
      <p>Tailor your website appearance without touching code.</p>

      <h3>1. Choose Layout Presets</h3>
      <p>Select from modern travel agency themes (Luxury Escapes, Adventure Explorer, Tropical Island, Coastal Vibes).</p>

      <h3>2. Custom Header & Navigation Menus</h3>
      <p>Add custom menu items, dropdowns, language selectors, and currency switchers.</p>

      <h3>3. Hero Banner & Search Engine</h3>
      <p>Configure background video/image sliders, search filters (Destination, Date, Duration, Budget), and call-to-action badges.</p>
    `,
    order: 1,
    status: 'published'
  },
  {
    id: 'manage-website-tours',
    slug: 'manage-website-tours',
    title: 'Managing Tours & Product Catalog',
    subTitle: 'Catalog Management',
    subSubTitle: 'Tours CRUD, Attributes, Cloning & Tiered Pricing',
    category: 'Manage Website',
    categoryOrder: 6,
    description: 'Comprehensive guide to creating, updating, cloning, and managing tour products, itineraries, add-ons, and pricing tiers.',
    content: `
      <h2>Tour Catalog Management</h2>
      <p>Build rich tour packages with step-by-step itineraries, pricing rules, and media galleries.</p>

      <h3>1. Tour CRUD Operations</h3>
      <ul>
        <li><strong>Create:</strong> Add title, duration, capacity, itinerary steps, inclusions/exclusions, photos, and meeting points.</li>
        <li><strong>Clone Tour:</strong> Instantly duplicate an existing tour to build variations (e.g. Private vs Group Tour) with 1 click.</li>
      </ul>

      <h3>2. Tour Taxonomy & Attributes</h3>
      <ul>
        <li><strong>Locations & Destinations:</strong> Group tours by regions or cities.</li>
        <li><strong>Add-Ons & Extra Services:</strong> Offer airport transfers, gear rentals, or private photographic packages.</li>
        <li><strong>Transport & Logistics:</strong> Assign vehicles, boats, or shuttles to tours.</li>
        <li><strong>Driver & Guide Assignment:</strong> Assign specific personnel to tour schedules.</li>
        <li><strong>Urgency Points & Labels:</strong> Add badges like "Best Seller", "Limited Seats", or "50% Off".</li>
      </ul>

      <h3>3. Package & Tier Pricing</h3>
      <p>Set tiered pricing based on group size (1-2 pax, 3-5 pax, 6+ pax), seasonal peak surcharges, or adult/child rates.</p>
    `,
    order: 1,
    status: 'published'
  },
  {
    id: 'manage-booking-guide',
    slug: 'manage-booking-guide',
    title: 'Booking Management, CSV Import & Channel Sync',
    subTitle: 'Operations & Fulfillment',
    subSubTitle: 'Order Processing, CSV Imports & OTA Connections',
    category: 'Manage Booking',
    categoryOrder: 7,
    description: 'Handle guest bookings, issue e-vouchers, manually import external reservations, and sync inventory with OTAs.',
    content: `
      <h2>Booking Operations</h2>
      <p>Track every reservation from pending deposit to completed tour departure.</p>

      <h3>1. Booking Processing</h3>
      <p>Filter reservations by status (Confirmed, Pending Payment, Completed, Cancelled), re-send e-vouchers, or adjust guest notes.</p>

      <h3>2. Import Booking</h3>
      <p>Bulk import historical or offline bookings via CSV spreadsheet upload.</p>

      <h3>3. Channel Manager Integrations</h3>
      <p>Connect iCal/API sync with Viator, GetYourGuide, TripAdvisor, and Booking.com to prevent double bookings.</p>
    `,
    order: 1,
    status: 'published'
  },
  {
    id: 'inquiry-sales-guide',
    slug: 'inquiry-sales-guide',
    title: 'Inquiry Management, AI Proposals & Coupons',
    subTitle: 'Sales & Marketing',
    subSubTitle: 'Custom Inquiries, Proposal Generator & Discount Codes',
    category: 'Inquiry & Sales',
    categoryOrder: 8,
    description: 'Convert guest leads into paid bookings with custom inquiries, AI-generated quotation proposals, and promotional coupon codes.',
    content: `
      <h2>Inquiry & Sales Engine</h2>
      <p>Manage custom group requests and tailor personalized quotes for high-value clients.</p>

      <h3>1. Incoming Inquiries</h3>
      <p>Review custom trip requests submitted by visitors on your website.</p>

      <h3>2. AI Proposal Generator</h3>
      <p>Use Gemini AI to instantly draft custom PDF/web itineraries with itemized cost estimates based on guest preferences.</p>

      <h3>3. Discount Coupons</h3>
      <p>Create percentage-based or fixed discount codes with expiration dates and usage limits.</p>
    `,
    order: 1,
    status: 'published'
  },
  {
    id: 'support-ticket-guide',
    slug: 'support-ticket-guide',
    title: 'Customer Support & Helpdesk Tickets',
    subTitle: 'Customer Service',
    subSubTitle: 'Ticket Management & Live Chat',
    category: 'Support & Ticket',
    categoryOrder: 9,
    description: 'Manage guest inquiries, post-booking questions, and support tickets in an integrated dashboard.',
    content: `
      <h2>Support Ticket System</h2>
      <p>Ensure high guest satisfaction by responding to pre-sale and post-sale questions promptly.</p>
    `,
    order: 1,
    status: 'published'
  },
  {
    id: 'blog-content-guide',
    slug: 'blog-content-guide',
    title: 'Blog & Content Marketing',
    subTitle: 'SEO & Content',
    subSubTitle: 'Travel Articles, News & Destination Guides',
    category: 'Blog',
    categoryOrder: 10,
    description: 'Publish engaging travel articles, destination guides, and SEO-rich blog posts to drive organic search traffic.',
    content: `
      <h2>Blog Manager</h2>
      <p>Create blog posts with rich media, embedded tour widgets, category tags, and SEO meta tags.</p>
    `,
    order: 1,
    status: 'published'
  },
  {
    id: 'pages-landing-generator',
    slug: 'pages-landing-generator',
    title: 'Custom Pages & AI Landing Page Generator',
    subTitle: 'Page Publishing',
    subSubTitle: 'Dynamic Content Pages & High-Converting Landing Pages',
    category: 'Pages & Landing Page Generator',
    categoryOrder: 11,
    description: 'Create custom content pages (About Us, Terms, Privacy) and generate high-converting promotional landing pages using AI.',
    content: `
      <h2>Pages & Landing Page Engine</h2>
      <p>Build custom static pages or use AI to generate dedicated campaign landing pages for seasonal marketing promotions.</p>
    `,
    order: 1,
    status: 'published'
  },
  {
    id: 'popup-announcements',
    slug: 'popup-announcements',
    title: 'Promotional Popups & Lead Banners',
    subTitle: 'Conversion Optimization',
    subSubTitle: 'Exit-Intent Banners, Coupon Modals & Announcements',
    category: 'Pop Up',
    categoryOrder: 12,
    description: 'Drive conversions with eye-catching popups, discount notification bars, and newsletter signup modals.',
    content: `
      <h2>Popup & Lead Capture Manager</h2>
      <p>Configure trigger conditions (e.g. exit-intent, time delay, page scroll depth) for custom promo popups.</p>
    `,
    order: 1,
    status: 'published'
  },
  {
    id: 'reviews-management',
    slug: 'reviews-management',
    title: 'Customer Reviews & Feedback Moderation',
    subTitle: 'Social Proof',
    subSubTitle: 'Review Invitations, Moderation & Trust Badges',
    category: 'Reviews',
    categoryOrder: 13,
    description: 'Collect, moderate, and display authentic guest reviews and Tripadvisor trust badges on your website.',
    content: `
      <h2>Reviews Engine</h2>
      <p>Automate post-tour feedback emails and showcase 5-star guest testimonials on tour detail pages.</p>
    `,
    order: 1,
    status: 'published'
  },
  {
    id: 'user-management-roles',
    slug: 'user-management-roles',
    title: 'User Management & Team Permissions',
    subTitle: 'Access Control',
    subSubTitle: 'Staff Roles, Vendor Portals & Access Control',
    category: 'User Management',
    categoryOrder: 14,
    description: 'Manage staff accounts, assign granular role permissions (Admin, Manager, Guide, Accountant), and handle vendor access.',
    content: `
      <h2>User & Role Management</h2>
      <p>Grant team members specific access rights based on their operational responsibilities.</p>
    `,
    order: 1,
    status: 'published'
  },
  {
    id: 'finance-report-analytics',
    slug: 'finance-report-analytics',
    title: 'Financial Reporting & Revenue Analytics',
    subTitle: 'Financial Intelligence',
    subSubTitle: 'Sales Reports, Payout Tracking & Tax Summaries',
    category: 'Finance Report',
    categoryOrder: 15,
    description: 'Analyze revenue streams, gross profits, gateway fee breakdowns, and export accounting reports for tax compliance.',
    content: `
      <h2>Financial Analytics & Reporting</h2>
      <p>Real-time financial dashboard providing insight into revenue growth, top-performing tours, payment gateway balances, and pending balances.</p>
    `,
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

  // Theme Mode: 'dark' | 'light'
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tripbone_docs_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'dark';
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('tripbone_docs_theme', nextTheme);
  };

  const [articles, setArticles] = useState<DocArticle[]>(DEFAULT_DOC_ARTICLES);
  const [categories, setCategories] = useState<DocCategory[]>(DEFAULT_DOC_CATEGORIES);
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

  // Load categories from Firestore `documentation_categories`
  useEffect(() => {
    const q = collection(db, 'documentation_categories');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const cats = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as DocCategory[];
        cats.sort((a, b) => (a.order || 0) - (b.order || 0));
        setCategories(cats);
      }
    }, (error) => {
      console.warn("Docs categories snapshot fallback:", error);
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

    // Ensure category ordering matching `categories` list if available
    const categoryOrderMap: { [catName: string]: number } = {};
    categories.forEach(c => {
      categoryOrderMap[c.name] = c.order || 99;
    });

    const sortedCategoryNames = Object.keys(groups).sort((a, b) => {
      const orderA = categoryOrderMap[a] ?? 99;
      const orderB = categoryOrderMap[b] ?? 99;
      return orderA - orderB;
    });

    const orderedGroups: { [key: string]: DocArticle[] } = {};
    sortedCategoryNames.forEach(cat => {
      orderedGroups[cat] = groups[cat].sort((a, b) => (a.order || 0) - (b.order || 0));
    });

    return orderedGroups;
  }, [publishedArticles, categories]);

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

  // Theme-dependent class names
  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen font-sans antialiased transition-colors duration-200 ${
      isDark 
        ? 'bg-[#090d16] text-slate-100 selection:bg-cyan-500/20 selection:text-cyan-300' 
        : 'bg-slate-50 text-slate-800 selection:bg-cyan-500/30 selection:text-cyan-900'
    }`}>
      
      {/* Top Bar Navigation (Spacious & Clean Header) */}
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b px-6 lg:px-10 py-4 transition-colors ${
        isDark 
          ? 'bg-[#090d16]/95 border-slate-800/80' 
          : 'bg-white/95 border-slate-200/90 shadow-xs'
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
          
          {/* Logo & Mobile Menu Toggle */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`lg:hidden p-2.5 rounded-xl border transition ${
                isDark 
                  ? 'bg-slate-800/80 text-slate-300 hover:text-white border-slate-700/50' 
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200'
              }`}
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <Link to="/docs" className="flex items-center space-x-3.5 group">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold transition ${
                isDark 
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 group-hover:bg-cyan-500/20' 
                  : 'bg-cyan-50 border-cyan-200 text-cyan-600 group-hover:bg-cyan-100'
              }`}>
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center space-x-2">
                  <span className={`font-extrabold text-base tracking-tight transition ${
                    isDark ? 'text-white group-hover:text-cyan-400' : 'text-slate-900 group-hover:text-cyan-600'
                  }`}>
                    docs.tripbone.com
                  </span>
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                    isDark ? 'bg-slate-800/90 text-cyan-400 border-slate-700' : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                  }`}>
                    v2.5
                  </span>
                </div>
                <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Documentation & Knowledge Center
                </span>
              </div>
            </Link>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-md hidden sm:block">
            <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-400'}`} />
            <input
              type="text"
              placeholder="Search guides, tutorials & APIs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full border rounded-xl pl-10 pr-4 py-2 text-xs font-medium transition focus:outline-none ${
                isDark 
                  ? 'bg-slate-900/90 border-slate-800 text-slate-200 placeholder-slate-500 focus:border-cyan-500/60' 
                  : 'bg-slate-100/80 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-cyan-500 focus:bg-white'
              }`}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className={`absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-bold ${
                  isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Clear
              </button>
            )}
          </div>

          {/* Controls: Theme Toggle & Admin Actions */}
          <div className="flex items-center space-x-3">
            {/* Theme Switcher Button */}
            <button
              onClick={toggleTheme}
              title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
              className={`p-2.5 rounded-xl border font-bold text-xs flex items-center space-x-2 transition ${
                isDark 
                  ? 'bg-slate-800/80 border-slate-700/60 text-amber-300 hover:bg-slate-800' 
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
              <span className="hidden md:inline text-xs font-semibold">
                {isDark ? 'Light' : 'Dark'}
              </span>
            </button>

            {onOpenManageModal && (
              <button
                onClick={onOpenManageModal}
                className={`px-3.5 py-2 rounded-xl border font-bold text-xs flex items-center space-x-1.5 transition ${
                  isDark 
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20' 
                    : 'bg-cyan-500 text-white border-cyan-600 hover:bg-cyan-600 shadow-xs'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Manage Docs</span>
              </button>
            )}

            <Link
              to="/admin"
              className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition ${
                isDark 
                  ? 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/60' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-200'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden md:inline">Back office</span>
            </Link>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="mt-3 sm:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search docs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full border rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none ${
                isDark 
                  ? 'bg-slate-900 border-slate-800 text-slate-200 focus:border-cyan-500' 
                  : 'bg-slate-100 border-slate-200 text-slate-800 focus:border-cyan-500'
              }`}
            />
          </div>
        </div>
      </header>

      {/* Main Documentation Grid Layout */}
      <div className="max-w-7xl mx-auto flex min-h-[calc(100vh-73px)]">
        
        {/* Sidebar Index Navigation */}
        <aside className={`
          fixed lg:sticky top-[73px] z-30 w-68 h-[calc(100vh-73px)] border-r
          overflow-y-auto p-5 transition-transform duration-200 shrink-0
          ${isDark ? 'bg-[#090d16] lg:bg-transparent border-slate-800/60' : 'bg-white lg:bg-transparent border-slate-200'}
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          {searchQuery && (
            <div className={`mb-5 border rounded-2xl p-3.5 space-y-2.5 ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-100/90 border-slate-200'
            }`}>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                <span>Search ({searchResults.length})</span>
                <button onClick={() => setSearchQuery('')} className="text-cyan-500 hover:underline">Clear</button>
              </div>
              {searchResults.length === 0 ? (
                <p className="text-xs text-slate-400">No matching docs.</p>
              ) : (
                searchResults.map(art => (
                  <button
                    key={art.id}
                    onClick={() => {
                      navigate(`/docs/${art.slug || art.id}`);
                      setSearchQuery('');
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full text-left p-2 rounded-xl transition group ${
                      isDark ? 'hover:bg-slate-800/80' : 'hover:bg-slate-200/80'
                    }`}
                  >
                    <p className={`text-xs font-bold transition group-hover:text-cyan-500 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                      {art.title}
                    </p>
                    <p className="text-[10px] text-slate-400 line-clamp-1">{art.category}</p>
                  </button>
                ))
              )}
            </div>
          )}

          <div className="space-y-6">
            {Object.keys(groupedCategories).map((category) => (
              <div key={category} className="space-y-1.5">
                <h4 className={`text-[11px] font-extrabold uppercase tracking-wider px-2 py-1 flex items-center justify-between ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  <span>{category}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                    isDark ? 'bg-slate-800/80 text-slate-400 border-slate-700/50' : 'bg-slate-200/70 text-slate-600 border-slate-300/60'
                  }`}>
                    {groupedCategories[category].length}
                  </span>
                </h4>

                <div className={`space-y-1 border-l ml-2 pl-2.5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
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
                          w-full text-left px-3 py-2 rounded-xl text-xs transition flex items-center justify-between group font-medium
                          ${isActive 
                            ? (isDark 
                                ? 'bg-cyan-500/10 text-cyan-400 font-bold border-l-2 border-cyan-400 -ml-[11px] pl-3' 
                                : 'bg-cyan-50 text-cyan-700 font-bold border-l-2 border-cyan-600 -ml-[11px] pl-3')
                            : (isDark 
                                ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40' 
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80')}
                        `}
                      >
                        <span className="truncate">{art.title}</span>
                        {isActive && <ChevronRight className="w-3.5 h-3.5 text-cyan-500 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Center Main Doc Reader */}
        <main className={`flex-1 min-w-0 p-6 sm:p-8 lg:p-12 border-r ${
          isDark ? 'border-slate-800/60' : 'border-slate-200'
        }`}>
          {activeArticle ? (
            <article className="max-w-3xl space-y-8">
              
              {/* Breadcrumb */}
              <div className={`flex items-center space-x-2 text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <Link to="/docs" className="hover:text-cyan-500 transition">Docs</Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{activeArticle.category}</span>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-cyan-500 font-semibold truncate">{activeArticle.title}</span>
              </div>

              {/* Title Section */}
              <div className={`space-y-4 pb-6 border-b ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <span className={`inline-block px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border ${
                      isDark ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                    }`}>
                      {activeArticle.category}
                    </span>
                    <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-snug ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}>
                      {activeArticle.title}
                    </h1>
                  </div>

                  <button
                    onClick={handleCopyShare}
                    title="Share Link"
                    className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 shrink-0 transition ${
                      isDark 
                        ? 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/50' 
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-200'
                    }`}
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
                    <span className="hidden sm:inline">{copiedLink ? 'Copied' : 'Share'}</span>
                  </button>
                </div>

                {activeArticle.subTitle && (
                  <h2 id="overview-subtitle" className={`text-base font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    {activeArticle.subTitle}
                  </h2>
                )}

                <p className={`text-sm sm:text-base leading-relaxed pt-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {activeArticle.description}
                </p>
              </div>

              {/* HTML / Body Content */}
              {activeArticle.content && (
                <div 
                  className={`prose max-w-none text-sm sm:text-base leading-relaxed space-y-4 ${
                    isDark 
                      ? 'prose-invert prose-headings:text-white prose-p:text-slate-300 prose-a:text-cyan-400 prose-strong:text-white' 
                      : 'prose-slate prose-headings:text-slate-900 prose-p:text-slate-700 prose-a:text-cyan-600 prose-strong:text-slate-900'
                  }`}
                  dangerouslySetInnerHTML={{ __html: activeArticle.content }}
                />
              )}

              {/* Step-by-Step Instructions */}
              {activeArticle.steps && activeArticle.steps.length > 0 && (
                <div id="steps-section" className="space-y-4 pt-4">
                  <div className={`flex items-center space-x-2 border-b pb-3 ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
                    <ListOrdered className="w-4 h-4 text-cyan-500" />
                    <h3 className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Step-by-Step Instructions
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {activeArticle.steps.map((step, idx) => (
                      <div 
                        key={idx} 
                        id={`step-${idx}`}
                        className={`border rounded-2xl p-5 space-y-2.5 transition ${
                          isDark 
                            ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700/80' 
                            : 'bg-white border-slate-200 shadow-xs hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span className={`w-7 h-7 rounded-lg border font-extrabold text-xs flex items-center justify-center shrink-0 ${
                            isDark 
                              ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' 
                              : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                          }`}>
                            {idx + 1}
                          </span>
                          <h4 className={`font-bold text-sm sm:text-base ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                            {step.title}
                          </h4>
                        </div>
                        <p className={`text-xs sm:text-sm leading-relaxed pl-10 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                          {step.desc}
                        </p>
                        {step.image && (
                          <div className="pl-10 pt-2">
                            <img 
                              src={step.image} 
                              alt={step.title} 
                              className="rounded-xl border max-h-80 object-cover shadow-md"
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
                <div id="gallery-section" className="space-y-3 pt-4">
                  <div className={`flex items-center space-x-2 border-b pb-3 ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
                    <ImageIcon className="w-4 h-4 text-cyan-500" />
                    <h3 className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Visual Reference
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {activeArticle.images.map((imgUrl, i) => (
                      <a 
                        key={i} 
                        href={imgUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className={`group relative rounded-2xl overflow-hidden border transition block ${
                          isDark ? 'border-slate-800 bg-slate-900 hover:border-cyan-500/40' : 'border-slate-200 bg-slate-100 hover:border-cyan-500'
                        }`}
                      >
                        <img src={imgUrl} alt={`Ref ${i}`} className="w-full h-44 object-cover group-hover:scale-105 transition duration-300" />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-xs font-bold text-white gap-1.5">
                          <ExternalLink className="w-4 h-4" /> Expand Image
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Navigation Pagination Buttons */}
              <div className={`pt-8 mt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 ${
                isDark ? 'border-slate-800/80' : 'border-slate-200'
              }`}>
                {prevArticle ? (
                  <button
                    onClick={() => navigate(`/docs/${prevArticle.slug || prevArticle.id}`)}
                    className={`w-full sm:w-auto px-5 py-3.5 rounded-2xl border transition text-left group flex items-center space-x-3 ${
                      isDark 
                        ? 'bg-slate-900/80 hover:bg-slate-800 border-slate-800' 
                        : 'bg-white hover:bg-slate-100 border-slate-200 shadow-xs'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-cyan-500 transition" />
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Previous</span>
                      <p className={`text-xs font-semibold truncate max-w-[200px] group-hover:text-cyan-500 ${
                        isDark ? 'text-slate-200' : 'text-slate-800'
                      }`}>
                        {prevArticle.title}
                      </p>
                    </div>
                  </button>
                ) : <div />}

                {nextArticle ? (
                  <button
                    onClick={() => navigate(`/docs/${nextArticle.slug || nextArticle.id}`)}
                    className={`w-full sm:w-auto px-5 py-3.5 rounded-2xl border transition text-right group flex items-center justify-end space-x-3 ml-auto ${
                      isDark 
                        ? 'bg-slate-900/80 hover:bg-slate-800 border-slate-800' 
                        : 'bg-white hover:bg-slate-100 border-slate-200 shadow-xs'
                    }`}
                  >
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Next</span>
                      <p className={`text-xs font-semibold truncate max-w-[200px] group-hover:text-cyan-500 ${
                        isDark ? 'text-slate-200' : 'text-slate-800'
                      }`}>
                        {nextArticle.title}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-500 transition" />
                  </button>
                ) : <div />}
              </div>

            </article>
          ) : (
            <div className="text-center py-20 space-y-3">
              <BookOpen className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold">No article selected</h3>
              <p className="text-xs text-slate-400">Select a guide from the sidebar index to view content.</p>
            </div>
          )}
        </main>

        {/* Right Table of Contents */}
        <aside className="hidden xl:block w-60 h-[calc(100vh-73px)] sticky top-[73px] p-6 overflow-y-auto shrink-0">
          <div className="space-y-5">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-cyan-500" />
              On This Page
            </p>

            {tableOfContents.length > 0 ? (
              <nav className="space-y-1.5 text-xs">
                {tableOfContents.map((item, idx) => (
                  <a
                    key={idx}
                    href={`#${item.id}`}
                    className={`
                      block truncate transition hover:text-cyan-500 py-0.5
                      ${item.level === 1 
                        ? (isDark ? 'font-bold text-slate-200' : 'font-bold text-slate-800') 
                        : (isDark ? 'pl-3 text-slate-400' : 'pl-3 text-slate-600')}
                    `}
                  >
                    {item.text}
                  </a>
                ))}
              </nav>
            ) : (
              <p className="text-xs text-slate-400 italic">No section headers</p>
            )}

            <div className={`pt-6 border-t space-y-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className={`p-4 rounded-2xl border space-y-2 ${
                isDark ? 'bg-cyan-500/5 border-cyan-500/20' : 'bg-cyan-50/80 border-cyan-200'
              }`}>
                <p className="text-xs font-bold text-cyan-500">Merchant Support</p>
                <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Need help with setup or custom domain mapping? Contact system operations.
                </p>
                <Link
                  to="/contact"
                  className="inline-flex items-center space-x-1 text-xs font-bold text-cyan-500 hover:underline pt-1"
                >
                  <span>Contact Support</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
}
