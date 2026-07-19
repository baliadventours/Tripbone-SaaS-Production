import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp, getDocs, limit, query } from '@/src/lib/firebase';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { SiteSettings, Booking, Payout } from '../../types';
import { uploadImage } from '../../lib/imgbb';
import { useTenant } from '../../lib/TenantContext';
import { 
  Save, 
  Globe, 
  Palette, 
  Mail, 
  Phone, 
  MapPin,
  Type, 
  Search, 
  Image as ImageIcon,
  Loader2,
  Check,
  Video,
  Instagram,
  Facebook,
  Twitter,
  Music2,
  Database,
  Bot,
  Layout,
  Zap,
  LayoutGrid,
  CreditCard,
  MessageSquare,
  Sparkles,
  ChevronRight,
  Upload,
  Trash2,
  ArrowUp,
  ArrowDown,
  Plus,
  Copy,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  HelpCircle,
  Info
} from 'lucide-react';
import { cn } from '../../lib/utils';

const THEME_OPTIONS = [
  { id: 'slideshow-atv', name: 'Bali ATV Slideshow', category: 'Specialty' },
  { id: 'airbnb-classic', name: 'Airbnb Classic', category: 'Airbnb' },
  { id: 'airbnb-fluid', name: 'Airbnb Modern', category: 'Airbnb' },
  { id: 'modern-dark', name: 'Modern Dark', category: 'Modern' },
  { id: 'modern-glass', name: 'Modern Glass', category: 'Modern' },
  { id: 'minimal-grid', name: 'Minimal Grid', category: 'Minimal' },
  { id: 'minimal-type', name: 'Minimal Typo', category: 'Minimal' },
  { id: 'premium-serif', name: 'Premium Serif', category: 'Premium' },
  { id: 'premium-full', name: 'Premium Full-bleed', category: 'Premium' },
  { id: 'saas-clean', name: 'SaaS Clean', category: 'SaaS' },
  { id: 'saas-dash', name: 'SaaS Dashboard', category: 'SaaS' },
];

const SECTIONS = [
  { id: 'topNav', name: 'Top Navigation' },
  { id: 'mainNav', name: 'Main Navigation' },
  { id: 'hero', name: 'Hero Section' },
  { id: 'featuredTours', name: 'Featured Tours' },
  { id: 'guestFavorites', name: 'Guest Favorites' },
  { id: 'reviews', name: 'Reviews' },
  { id: 'inspiration', name: 'Travel Inspiration' },
  { id: 'footer', name: 'Footer' },
  { id: 'aboutPage', name: 'About Us Page' },
  { id: 'contactPage', name: 'Contact Page' },
  { id: 'blogPage', name: 'Blog Page' },
];

export default function GeneralSettings({ activeTab = 'all' }: { activeTab?: 'company-info' | 'seo' | 'website' | 'domain' | 'builder' | 'all' }) {
  const { tenantId, tenant } = useTenant();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [initialCustomDomain, setInitialCustomDomain] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingHeroMultiple, setUploadingHeroMultiple] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [verifyingDomain, setVerifyingDomain] = useState(false);
  const [showDomainCopied, setShowDomainCopied] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    domain: string;
    isSubdomain: boolean;
    verified: boolean;
    cnameRecords: string[];
    aRecords: string[];
    dnsError: string | null;
    expectedCname: string;
    expectedA: string;
    checkedAt: string;
    isSandboxEnvironment?: boolean;
  } | null>(null);

  const handleVerifyDomain = async () => {
    if (!settings?.customDomain) return;
    setVerifyingDomain(true);
    setVerificationResult(null);
    try {
      const res = await fetch(`/api/tenant/verify-domain?domain=${encodeURIComponent(settings.customDomain)}`);
      const data = await res.json();
      setVerificationResult(data);
    } catch (err: any) {
      console.error("DNS verification check failed", err);
    } finally {
      setVerifyingDomain(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setShowDomainCopied(label);
    setTimeout(() => setShowDomainCopied(null), 2000);
  };

  const defaultSettings: SiteSettings = {
    siteName: tenant?.companyName || 'Tripbone',
    siteDescription: tenant?.companyName ? `Premium Tours & Adventure Experiences with ${tenant.companyName}` : 'Premium Tours & Adventure Experiences',
    siteKeywords: 'tours, adventure, travel, booking, vacation',
    supportEmail: tenant?.email || 'support@tripbone.com',
    supportPhone: tenant?.phone || '+62 812-3456-7890',
    whatsappNumber: tenant?.phone || '+62 812-3456-7890',
    logoURL: tenant?.logo || '',
    faviconURL: tenant?.favicon || '',
    heroImage: '',
    officeAddress: tenant?.address || 'Jl. Raya Ubud, Gianyar, Bali, Indonesia 80571',
    primaryColor: tenant?.primaryColor || '#00A651',
    secondaryColor: tenant?.secondaryColor || '#ffffff',
    bodyFont: 'Inter',
    headingFont: 'Space Grotesk',
    currency: 'USD',
    customDomain: tenant?.customDomain || '',
    brandingPreset: 'default'
  };

  useEffect(() => {
    async function fetchSettings() {
      const docRef = doc(db, 'settings', tenantId || 'general');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as SiteSettings;
        setSettings({ ...defaultSettings, ...data });
        setInitialCustomDomain(data.customDomain || '');
      } else {
        setSettings(defaultSettings);
      }
      setLoading(false);
    }
    fetchSettings();
  }, [tenantId, tenant]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setMessage(null);

    try {
      const settingsId = tenantId || 'general';
      await setDoc(doc(db, 'settings', settingsId), settings);

      // Handle Vercel Custom Domain APIs if it changed
      if (tenantId && settings.customDomain !== initialCustomDomain) {
        // If there was an old domain, remove it first
        if (initialCustomDomain) {
          try {
            await fetch(`/api/tenant/remove-domain?domain=${encodeURIComponent(initialCustomDomain)}`, { method: 'DELETE' });
          } catch (e) {
            console.error("Failed to remove old domain", e);
          }
        }
        
        // If a new domain was added
        if (settings.customDomain) {
          try {
            await fetch(`/api/tenant/add-domain`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ domain: settings.customDomain })
            });
          } catch (e) {
            console.error("Failed to add new domain", e);
          }
        }
        setInitialCustomDomain(settings.customDomain || '');
      }

      // Sync customDomain to tenant document
      if (tenantId) {
        await setDoc(doc(db, 'tenants', tenantId), {
          customDomain: settings.customDomain || '',
          updatedAt: new Date()
        }, { merge: true });
      }

      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSeedData = async () => {
    setSaving(true);
    try {
      // 1. Get first tour for reference
      const toursSnap = await getDocs(query(collection(db, 'tours'), limit(1)));
      if (toursSnap.empty) {
        alert("Please create at least one tour before seeding!");
        return;
      }
      const tour = { id: toursSnap.docs[0].id, ...toursSnap.docs[0].data() } as any;
      const effectiveMax = tour.maxCapacity || 20;

      const dummyBookings: Partial<Booking>[] = Array.from({ length: 5 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i + 1);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        
        return {
          tourId: tour.id,
          tourTitle: tour.title,
          supplierId: tour.supplierId || '',
          packageName: tour.packages?.[0]?.name || 'Standard',
          date: dateStr,
          time: '08:30 AM',
          status: 'confirmed',
          paymentStatus: 'paid',
          paymentMethod: 'paypal',
          totalAmount: 150 + (i * 20),
          customerData: {
            fullName: `Test Customer ${i + 1}`,
            email: `test${i + 1}@example.com`,
            phone: `+62812345678${i}`,
            nationality: 'Australia'
          },
          participants: { adults: 2, children: 1 },
          createdAt: serverTimestamp() as any,
          updatedAt: serverTimestamp() as any,
          payoutStatus: 'pending',
          logs: []
        };
      });

      for (const booking of dummyBookings) {
        await addDoc(collection(db, 'bookings'), booking);
        
        // --- Create Inventory for the booking ---
        const inventoryId = `${tour.id}_${booking.date}_08:30 AM`;
        await setDoc(doc(db, 'inventory', inventoryId), {
          tourId: tour.id,
          date: booking.date,
          timeSlot: '08:30 AM',
          bookedCount: 3, // 2 adults + 1 child from dummy booking
          maxCapacity: effectiveMax,
          updatedAt: serverTimestamp()
        });
      }

      // 3. Create a dummy payout
      const dummyPayout: Partial<Payout> = {
        supplierId: tour.supplierId || 'direct',
        supplierName: tour.supplierName || 'Test Supplier',
        amount: 450.00,
        currency: 'USD',
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        bookingIds: [],
        payoutMethod: { 
          type: 'bank_transfer', 
          bankName: 'BCA', 
          accountNumber: '12345678', 
          accountHolder: 'Test Supplier' 
        }
      };
      await addDoc(collection(db, 'payouts'), dummyPayout);

      alert("Successfully seeded 5 bookings and 1 pending payout!");
    } catch (e: any) {
      console.error(e);
      try {
        handleFirestoreError(e, OperationType.CREATE, 'seeding');
      } catch (err: any) {
        alert("Failed to seed data: " + err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  const getHeaderInfo = () => {
    switch (activeTab) {
      case 'company-info':
        return { title: 'Company Information', subtitle: 'Manage company name, contacts, and social media handles' };
      case 'seo':
        return { title: 'SEO Settings', subtitle: 'Optimize search engine metadata for higher rank and click rates' };
      case 'website':
        return { title: 'Website Branding & Styles', subtitle: 'Manage colors, fonts, slideshows, and custom assets' };
      case 'domain':
        return { title: 'Custom Domain Settings', subtitle: 'Configure and point your own branded custom domain' };
      case 'builder':
        return { title: 'Website Section Builder', subtitle: 'Dynamically customize and design individual home sections' };
      default:
        return { title: 'General Site Settings', subtitle: 'Configure global branding and meta settings' };
    }
  };
  const headerInfo = getHeaderInfo();

  return (
    <form onSubmit={handleSave} className="space-y-8 max-w-4xl pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{headerInfo.title}</h2>
          <p className="text-gray-500">{headerInfo.subtitle}</p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-[10px] font-bold text-sm hover:brightness-90 transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </button>
      </div>

      {message && (
        <div className={cn(
          "p-4 rounded-[12px] flex items-center gap-3",
          message.type === 'success' ? "bg-orange-50 text-orange-700" : "bg-red-50 text-red-700"
        )}>
          {message.type === 'success' ? <Check className="h-5 w-5" /> : <Loader2 className="h-5 w-5" />}
          <span className="font-semibold text-sm">{message.text}</span>
        </div>
      )}

      <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-8", activeTab !== 'all' && "md:grid-cols-1 max-w-3xl mx-auto")}>
        {/* Basic Info */}
        {(activeTab === 'all' || activeTab === 'company-info' || activeTab === 'website' || activeTab === 'domain') && (
          <div className="space-y-6 bg-white p-6 rounded-[24px] border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 border-b border-gray-50 pb-4 flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              {activeTab === 'domain' ? 'Custom Domain Connection' : 'Branding & Info'}
            </h3>
            <div className="space-y-4">
              {(activeTab === 'all' || activeTab === 'company-info' || activeTab === 'website') && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Site Name</label>
                  <input 
                    type="text" 
                    value={settings?.siteName}
                    onChange={(e) => setSettings(s => s ? {...s, siteName: e.target.value} : null)}
                    className="w-full bg-gray-50 border-none rounded-[12px] px-4 py-3 text-sm focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}
            {(activeTab === 'all' || activeTab === 'domain') && tenantId && (
              <div className="space-y-4 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1 flex items-center gap-1.5">
                    <span>Custom Domain</span>
                    <span className="text-[10px] text-gray-400 font-mono font-normal tracking-normal">(e.g. tours.yourcompany.com)</span>
                  </label>
                  <input 
                    type="text" 
                    value={settings?.customDomain || ''}
                    onChange={(e) => {
                      setSettings(s => s ? {...s, customDomain: e.target.value} : null);
                      setVerificationResult(null);
                    }}
                    placeholder="tours.yourcompany.com"
                    className="w-full bg-gray-50 border-none rounded-[12px] px-4 py-3 text-sm focus:ring-2 focus:ring-primary font-mono placeholder-gray-400"
                  />
                </div>

                {settings?.customDomain && (
                  <div className="bg-gray-50/70 border border-gray-100 p-4 rounded-[18px] space-y-3.5 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                        <Info className="h-3.5 w-3.5 text-primary" />
                        DNS Routing Guide
                      </span>
                      <a 
                        href="https://dnschecker.org" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-[10px] text-gray-400 hover:text-primary flex items-center gap-0.5 transition-colors font-medium"
                      >
                        <span>DNS Lookup Tool</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>

                    <p className="text-xs text-gray-500 leading-relaxed">
                      To point your custom domain <code className="bg-gray-100 px-1 py-0.5 rounded text-primary font-mono text-[11px]">{settings.customDomain}</code> to Tripbone, add the following DNS record in your domain registrar's panel (GoDaddy, Namecheap, Cloudflare, etc.):
                    </p>

                    {(() => {
                      const cleanDomain = settings.customDomain.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim();
                      const isSub = cleanDomain.split('.').length > 2;
                      const recordType = isSub ? 'CNAME' : 'A';
                      const recordHost = isSub ? cleanDomain.split('.')[0] : '@';
                      const recordValue = isSub ? 'cname.vercel-dns.com' : '76.76.21.21';

                      return (
                        <div className="space-y-2">
                          <div className="grid grid-cols-3 gap-1 bg-gray-100/50 p-2 rounded-[12px] text-[11px] font-mono border border-gray-150">
                            <div>
                              <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest pl-1 mb-0.5">Type</div>
                              <div className="bg-white px-2 py-1 rounded-[6px] text-gray-800 font-bold border border-gray-100 text-center">{recordType}</div>
                            </div>
                            <div>
                              <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest pl-1 mb-0.5 font-sans">Host</div>
                              <div className="bg-white px-2 py-1 rounded-[6px] text-gray-800 font-bold border border-gray-100 flex items-center justify-between gap-1 group">
                                <span className="truncate">{recordHost}</span>
                                <button 
                                  type="button"
                                  onClick={() => copyToClipboard(recordHost, 'host')}
                                  className="text-gray-400 hover:text-primary transition-colors shrink-0"
                                  title="Copy Host"
                                >
                                  {showDomainCopied === 'host' ? (
                                    <span className="text-[8px] text-primary font-bold font-sans">Copied!</span>
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </button>
                              </div>
                            </div>
                            <div>
                              <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest pl-1 mb-0.5 font-sans">Points To</div>
                              <div className="bg-white px-2 py-1 rounded-[6px] text-gray-800 font-bold border border-gray-100 flex items-center justify-between gap-1 group">
                                <span className="truncate">{recordValue}</span>
                                <button 
                                  type="button"
                                  onClick={() => copyToClipboard(recordValue, 'value')}
                                  className="text-gray-400 hover:text-primary transition-colors shrink-0"
                                  title="Copy Value"
                                >
                                  {showDomainCopied === 'value' ? (
                                    <span className="text-[8px] text-primary font-bold font-sans">Copied!</span>
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>

                          {!isSub && (
                            <div className="p-2 bg-amber-50 border border-amber-100/70 rounded-[10px] text-[10px] text-amber-700 flex items-start gap-1.5 leading-normal">
                              <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                              <p>
                                <strong>Apex Domain Warning:</strong> Since you are using a root domain, we also recommend adding a CNAME record with Host <code className="bg-amber-100/50 px-1 rounded font-bold">www</code> pointing to <code className="bg-amber-100/50 px-1 rounded font-bold">cname.vercel-dns.com</code>.
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    <div className="pt-1.5 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={handleVerifyDomain}
                        disabled={verifyingDomain}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-white hover:bg-gray-100 text-gray-700 disabled:opacity-50 border border-gray-200/80 rounded-[12px] text-xs font-bold transition duration-150 shadow-sm cursor-pointer"
                      >
                        {verifyingDomain ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                            <span>Querying Nameservers...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 text-gray-500" />
                            <span>Verify Connection Status</span>
                          </>
                        )}
                      </button>

                      {verificationResult && (
                        <div className={cn(
                          "p-3 rounded-[12px] border text-xs transition-all space-y-2",
                          verificationResult.verified 
                            ? "bg-emerald-50/70 border-emerald-100 text-emerald-800"
                            : "bg-orange-50/70 border-orange-100 text-orange-800"
                        )}>
                          <div className="flex items-center gap-1.5 font-bold">
                            {verificationResult.verified ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-orange-600 shrink-0" />
                            )}
                            <span>
                              {verificationResult.verified 
                                ? "DNS Connection Status: Active" 
                                : "DNS Propagation Pending"}
                            </span>
                          </div>

                          <p className="text-[11px] leading-relaxed opacity-90">
                            {verificationResult.verified ? (
                              verificationResult.isSandboxEnvironment ? (
                                "Sandbox Simulation verified connection successfully! Custom domain routing is ready."
                              ) : (
                                "Your domain DNS records match Tripbone requirements. Custom domain is active."
                              )
                            ) : (
                              "We checked, but the DNS changes haven't propagated yet or don't match. DNS updates typically take 15 minutes to 4 hours, but can sometimes take up to 24 hours."
                            )}
                          </p>

                          <div className="bg-black/5 p-2 rounded-[8px] font-mono text-[9px] text-gray-600 space-y-1">
                            <div>Clean Domain: {verificationResult.domain}</div>
                            {verificationResult.isSubdomain ? (
                              <div>CNAME Records Found: {verificationResult.cnameRecords.length > 0 ? verificationResult.cnameRecords.join(', ') : 'None'}</div>
                            ) : (
                              <div>A Records Found: {verificationResult.aRecords.length > 0 ? verificationResult.aRecords.join(', ') : 'None'}</div>
                            )}
                            <div>Expected: {verificationResult.isSubdomain ? verificationResult.expectedCname : verificationResult.expectedA}</div>
                            {verificationResult.dnsError && <div className="text-red-500">Lookup Error: {verificationResult.dnsError}</div>}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            {(activeTab === 'all' || activeTab === 'company-info' || activeTab === 'website') && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Logo</label>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                    <div className="md:col-span-1 h-16 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center p-2 relative overflow-hidden">
                      {settings?.logoURL ? (
                        <img src={settings.logoURL} alt="Logo Preview" className="max-h-full max-w-full object-contain" />
                      ) : (
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">No Logo</span>
                      )}
                    </div>
                    <div className="md:col-span-3 space-y-2">
                      <div className="relative">
                        <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input 
                          type="text" 
                          value={settings?.logoURL || ''}
                          onChange={(e) => setSettings(s => s ? {...s, logoURL: e.target.value} : null)}
                          className="w-full bg-gray-50 border-none rounded-[12px] pl-12 pr-28 py-3 text-sm focus:ring-2 focus:ring-primary"
                          placeholder="https://example.com/logo.png"
                        />
                        <label className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-white border border-gray-100 hover:bg-gray-50 text-gray-600 rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center gap-1">
                          {uploadingLogo ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Upload className="h-3 w-3" />
                          )}
                          <span>Upload</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setUploadingLogo(true);
                              try {
                                const url = await uploadImage(file);
                                setSettings(s => s ? {...s, logoURL: url} : null);
                              } catch (err) {
                                console.error(err);
                                alert("Failed to upload logo image");
                              } finally {
                                setUploadingLogo(false);
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Favicon</label>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                    <div className="md:col-span-1 h-16 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center p-2 relative overflow-hidden">
                      {settings?.faviconURL ? (
                        <div className="flex flex-col items-center justify-center gap-1">
                          <img src={settings.faviconURL} alt="Favicon Preview" className="h-8 w-8 object-contain rounded" />
                          <span className="text-[9px] text-gray-400 font-mono font-medium">16x16 / 32x32</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">No Favicon</span>
                      )}
                    </div>
                    <div className="md:col-span-3 space-y-2">
                      <div className="relative">
                        <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input 
                          type="text" 
                          value={settings?.faviconURL || ''}
                          onChange={(e) => setSettings(s => s ? {...s, faviconURL: e.target.value} : null)}
                          className="w-full bg-gray-50 border-none rounded-[12px] pl-12 pr-28 py-3 text-sm focus:ring-2 focus:ring-primary"
                          placeholder="https://example.com/favicon.ico"
                        />
                        <label className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-white border border-gray-100 hover:bg-gray-50 text-gray-600 rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center gap-1">
                          {uploadingFavicon ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Upload className="h-3 w-3" />
                          )}
                          <span>Upload</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setUploadingFavicon(true);
                              try {
                                const url = await uploadImage(file);
                                setSettings(s => s ? {...s, faviconURL: url} : null);
                              } catch (err) {
                                console.error(err);
                                alert("Failed to upload favicon image");
                              } finally {
                                setUploadingFavicon(false);
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {(activeTab === 'all' || activeTab === 'website') && (
              <div className="space-y-4 border border-gray-100 rounded-[20px] p-6 bg-gray-50/50">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider pl-1">Hero Slideshow Images</h3>
                  <p className="text-[11px] text-gray-400 font-medium pl-1 mt-0.5">
                    Upload or paste URLs for multiple images to display in your home page slideshow.
                  </p>
                </div>
                <label className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-sm shadow-primary/15 self-end sm:self-auto">
                  {uploadingHeroMultiple ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  <span>Upload Image(s)</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    multiple
                    className="hidden" 
                    onChange={async (e) => {
                      const files = e.target.files;
                      if (!files || files.length === 0) return;
                      setUploadingHeroMultiple(true);
                      try {
                        const urls: string[] = [];
                        for (let i = 0; i < files.length; i++) {
                          const url = await uploadImage(files[i]);
                          urls.push(url);
                        }
                        setSettings(s => {
                          if (!s) return null;
                          const currentImages = s.heroImages || (s.heroImage ? [s.heroImage] : []);
                          const updatedImages = [...currentImages, ...urls];
                          return {
                            ...s,
                            heroImages: updatedImages,
                            heroImage: updatedImages[0] || ''
                          };
                        });
                      } catch (err) {
                        console.error(err);
                        alert("Failed to upload slideshow images");
                      } finally {
                        setUploadingHeroMultiple(false);
                      }
                    }}
                  />
                </label>
              </div>

              {/* Add URL Row */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input 
                    type="text" 
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    className="w-full bg-white border border-gray-150 rounded-[12px] pl-12 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Paste external image URL (e.g. https://example.com/banner.jpg)"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!newImageUrl.trim()) return;
                    setSettings(s => {
                      if (!s) return null;
                      const currentImages = s.heroImages || (s.heroImage ? [s.heroImage] : []);
                      const updatedImages = [...currentImages, newImageUrl.trim()];
                      return {
                        ...s,
                        heroImages: updatedImages,
                        heroImage: updatedImages[0] || ''
                      };
                    });
                    setNewImageUrl('');
                  }}
                  className="px-4 bg-gray-900 hover:bg-gray-800 text-white rounded-[12px] text-xs font-bold transition-all flex items-center gap-1 flex-shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add URL</span>
                </button>
              </div>

              {/* Grid of images */}
              {settings?.heroImages && settings.heroImages.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 mt-4">
                  {settings.heroImages.map((img, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white p-3 border border-gray-100 rounded-xl hover:shadow-sm transition-shadow w-full">
                      {/* Thumbnail */}
                      <div className="h-16 w-24 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center self-center sm:self-auto">
                        <img src={img} alt={`Slide ${idx + 1}`} className="h-full w-full object-cover" />
                      </div>
                      
                      {/* URL text input */}
                      <div className="flex-1 min-w-0 w-full">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Slide {idx + 1} Image URL</span>
                        <input
                          type="text"
                          value={img}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSettings(s => {
                              if (!s) return null;
                              const updated = [...(s.heroImages || [])];
                              updated[idx] = val;
                              return {
                                ...s,
                                heroImages: updated,
                                heroImage: updated[0] || ''
                              };
                            });
                          }}
                          className="w-full bg-gray-50 border-none rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary truncate"
                        />
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-1.5 flex-shrink-0 self-end sm:self-auto mt-2 sm:mt-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => {
                            if (idx === 0) return;
                            setSettings(s => {
                              if (!s) return null;
                              const updated = [...(s.heroImages || [])];
                              const temp = updated[idx];
                              updated[idx] = updated[idx - 1];
                              updated[idx - 1] = temp;
                              return {
                                ...s,
                                heroImages: updated,
                                heroImage: updated[0] || ''
                              };
                            });
                          }}
                          className="p-1.5 bg-gray-50 hover:bg-gray-100 disabled:opacity-30 text-gray-600 rounded-lg transition-colors"
                          title="Move Up"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === (settings.heroImages?.length || 0) - 1}
                          onClick={() => {
                            if (idx === (settings.heroImages?.length || 0) - 1) return;
                            setSettings(s => {
                              if (!s) return null;
                              const updated = [...(s.heroImages || [])];
                              const temp = updated[idx];
                              updated[idx] = updated[idx + 1];
                              updated[idx + 1] = temp;
                              return {
                                ...s,
                                heroImages: updated,
                                heroImage: updated[0] || ''
                              };
                            });
                          }}
                          className="p-1.5 bg-gray-50 hover:bg-gray-100 disabled:opacity-30 text-gray-600 rounded-lg transition-colors"
                          title="Move Down"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSettings(s => {
                              if (!s) return null;
                              const updated = (s.heroImages || []).filter((_, i) => i !== idx);
                              return {
                                ...s,
                                heroImages: updated,
                                heroImage: updated[0] || ''
                              };
                            });
                          }}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors ml-2"
                          title="Remove Image"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                settings?.heroImage ? (
                  <div className="flex items-center gap-4 bg-white p-3 border border-gray-100 rounded-xl">
                    <div className="h-16 w-24 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      <img src={settings.heroImage} alt="Single Hero" className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Primary Hero Image (Migrate to slideshow)</span>
                      <p className="text-xs text-gray-600 truncate">{settings.heroImage}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSettings(s => {
                          if (!s) return null;
                          return {
                            ...s,
                            heroImages: [s.heroImage || ''],
                          };
                        });
                      }}
                      className="px-3 py-1.5 bg-primary hover:bg-primary/95 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      Convert to Slideshow
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-200 rounded-[15px] py-8 text-center text-gray-400">
                    <ImageIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-xs font-bold uppercase tracking-wider">No Custom Slideshow Images</p>
                    <p className="text-[10px] text-gray-400 mt-1 px-4">Upload or paste image URLs to replace the default home page slideshow slides.</p>
                  </div>
                )
              )}
            </div>
          )}
            {(activeTab === 'all' || activeTab === 'company-info') && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Office Address</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input 
                    type="text" 
                    value={settings?.officeAddress}
                    onChange={(e) => setSettings(s => s ? {...s, officeAddress: e.target.value} : null)}
                    className="w-full bg-gray-50 border-none rounded-[12px] pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary"
                    placeholder="Jl. Raya Ubud, Bali..."
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

        {/* Contact Info */}
        {(activeTab === 'all' || activeTab === 'company-info') && (
          <div className="space-y-6 bg-white p-6 rounded-[24px] border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 border-b border-gray-50 pb-4 flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Support & Integration
            </h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Support Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input 
                    type="email" 
                    value={settings?.supportEmail}
                    onChange={(e) => setSettings(s => s ? {...s, supportEmail: e.target.value} : null)}
                    className="w-full bg-gray-50 border-none rounded-[12px] pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Support Phone</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input 
                    type="text" 
                    value={settings?.supportPhone}
                    onChange={(e) => setSettings(s => s ? {...s, supportPhone: e.target.value} : null)}
                    className="w-full bg-gray-50 border-none rounded-[12px] pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">WhatsApp Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input 
                    type="text" 
                    value={settings?.whatsappNumber}
                    onChange={(e) => setSettings(s => s ? {...s, whatsappNumber: e.target.value} : null)}
                    className="w-full bg-gray-50 border-none rounded-[12px] pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary"
                    placeholder="+62..."
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Visuals */}
        {(activeTab === 'all' || activeTab === 'website') && (
          <div className="space-y-6 bg-white p-6 rounded-[24px] border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 border-b border-gray-50 pb-4 flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              Visual Identity & Design Presets
            </h3>

            {/* Visual Branding & Layout Presets Selector */}
            <div className="space-y-3 pb-6 border-b border-gray-50">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                  Layout & Design Preset
                </label>
                <span className="text-[10px] font-bold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Tenant Customization Engine
                </span>
              </div>
              <p className="text-xs text-gray-400 pl-1 mb-2">
                Instantly launch a world-class digital brand layout with curated fonts, spacings, and styles, or select Custom to define your own style guidelines.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {[
                  {
                    id: 'default',
                    name: 'Custom / Classic',
                    desc: 'Your custom primary/secondary colors and custom Google Fonts selections.',
                    badge: 'Fully Custom',
                    colorClass: 'from-[#FF7A00] to-[#1F3B1F]',
                    fontLabel: 'Poppins & Oswald'
                  },
                  {
                    id: 'swiss-minimalist',
                    name: 'Swiss Minimalist',
                    desc: 'Soft light greys, sharp corners, flat black accents, and high typographic contrast.',
                    badge: 'Sleek & Modern',
                    colorClass: 'from-[#000000] to-[#f4f4f6]',
                    fontLabel: 'Inter Sans-Serif'
                  },
                  {
                    id: 'tech-dark',
                    name: 'Technical Dark Grid',
                    desc: 'Deep charcoal canvas, glowing emerald borders, and high-density technical modules.',
                    badge: 'Neon Cyber',
                    colorClass: 'from-[#10b981] to-[#09090b]',
                    fontLabel: 'Space Grotesk + Mono'
                  },
                  {
                    id: 'elegant-editorial',
                    name: 'Elegant Editorial',
                    desc: 'Warm off-white background, luxurious serif headings, and generous organic curves.',
                    badge: 'Luxury Print',
                    colorClass: 'from-[#b45309] to-[#faf8f5]',
                    fontLabel: 'Playfair + Lora Serif'
                  },
                  {
                    id: 'nordic-forest',
                    name: 'Nordic Forest',
                    desc: 'Deep organic spruce green, soft birch background, and balanced rounded card silhouettes.',
                    badge: 'Muted Organic',
                    colorClass: 'from-[#164e63] to-[#f0f4f1]',
                    fontLabel: 'Outfit + Jakarta'
                  },
                  {
                    id: 'retro-adventure',
                    name: 'Retro Adventure',
                    desc: 'Golden amber tones, vintage navy accents, paper stamp card designs, and adventurous feel.',
                    badge: 'Wanderlust',
                    colorClass: 'from-[#d97706] to-[#faf6f0]',
                    fontLabel: 'Bricolage + Jakarta'
                  },
                  {
                    id: 'tokyo-neon',
                    name: 'Tokyo Neon Grid',
                    desc: 'Deep cosmic dark space background, hot pink and violet glow, and glassy components.',
                    badge: 'Shinjuku Midnight',
                    colorClass: 'from-[#db2777] to-[#03000a]',
                    fontLabel: 'Syne + Jakarta'
                  },
                  {
                    id: 'mediterranean-breeze',
                    name: 'Coastal Riviera',
                    desc: 'Brilliant marine azure blue, sunny citrus accents, soft curved waves, and breezy feels.',
                    badge: 'Sunny Sea Breeze',
                    colorClass: 'from-[#0284c7] to-[#f0f9ff]',
                    fontLabel: 'Lexend + Jakarta'
                  },
                  {
                    id: 'brutalist-mono',
                    name: 'Neo-Brutalist',
                    desc: 'Intense high-contrast yellow canvas, 3px raw black borders, and heavy flat offset drop shadows.',
                    badge: 'Avant-Garde Mono',
                    colorClass: 'from-[#facc15] to-[#ffffff]',
                    fontLabel: 'Archivo Black + Fira'
                  },
                  {
                    id: 'royal-safari',
                    name: 'Royal Safari',
                    desc: 'Imperial rich bronze gold details over a luxurious deep obsidian dark canvas.',
                    badge: 'Regal Wilderness',
                    colorClass: 'from-[#b5893d] to-[#0a0a0d]',
                    fontLabel: 'Cormorant + Lora'
                  }
                ].map((preset) => {
                  const isSelected = (settings?.brandingPreset || 'default') === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSettings(s => s ? { ...s, brandingPreset: preset.id as any } : null)}
                      className={cn(
                        "flex flex-col text-left p-4 rounded-[16px] border transition-all duration-300 relative overflow-hidden group",
                        isSelected 
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-md" 
                          : "border-gray-100 bg-white hover:border-gray-300 hover:shadow-sm"
                      )}
                    >
                      {/* Gradient Accent Pill */}
                      <div className="flex items-center justify-between w-full mb-3">
                        <span className={cn(
                          "text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full",
                          isSelected ? "bg-primary text-white" : "bg-gray-100 text-gray-500"
                        )}>
                          {preset.badge}
                        </span>
                        
                        {/* Circle Theme Color Preview */}
                        <div className={cn(
                          "h-4 w-4 rounded-full bg-gradient-to-br shadow-inner",
                          preset.colorClass
                        )} />
                      </div>

                      <h4 className="text-sm font-bold text-gray-900 mb-1 group-hover:text-primary transition-colors">
                        {preset.name}
                      </h4>
                      <p className="text-xs text-gray-500 leading-snug flex-1 mb-3">
                        {preset.desc}
                      </p>

                      <div className="text-[10px] font-mono text-gray-400 border-t border-gray-100 pt-2 w-full flex items-center justify-between">
                        <span>Typography:</span>
                        <span className="font-bold text-gray-600">{preset.fontLabel}</span>
                      </div>

                      {/* Selected Indicator Checkmark */}
                      {isSelected && (
                        <div className="absolute right-2 top-2 bg-primary text-white p-0.5 rounded-full z-10">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Manual Style Overrides (Collapsible or labeled appropriately if not using preset) */}
            <div className={cn(
              "space-y-6 transition-all duration-300",
              (settings?.brandingPreset || 'default') !== 'default' && "opacity-40 pointer-events-none filter grayscale"
            )}>
              <div className="flex items-center justify-between pl-1">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  Manual Custom Style Overrides
                </span>
                {(settings?.brandingPreset || 'default') !== 'default' && (
                  <span className="text-[10px] font-semibold text-gray-400 italic">
                    (Disabled while a design preset is active)
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Primary Color</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={settings?.primaryColor}
                    onChange={(e) => setSettings(s => s ? {...s, primaryColor: e.target.value} : null)}
                    className="h-10 w-10 p-0 border-none bg-transparent cursor-pointer"
                  />
                  <input 
                    type="text" 
                    value={settings?.primaryColor}
                    onChange={(e) => setSettings(s => s ? {...s, primaryColor: e.target.value} : null)}
                    className="flex-1 bg-gray-50 border-none rounded-[12px] px-4 py-2.5 text-xs font-mono uppercase focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Secondary Color</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={settings?.secondaryColor}
                    onChange={(e) => setSettings(s => s ? {...s, secondaryColor: e.target.value} : null)}
                    className="h-10 w-10 p-0 border-none bg-transparent cursor-pointer"
                  />
                  <input 
                    type="text" 
                    value={settings?.secondaryColor}
                    onChange={(e) => setSettings(s => s ? {...s, secondaryColor: e.target.value} : null)}
                    className="flex-1 bg-gray-50 border-none rounded-[12px] px-4 py-2.5 text-xs font-mono uppercase focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Heading Font (Google Font)</label>
                <div className="relative">
                  <Type className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input 
                    type="text" 
                    value={settings?.headingFont}
                    onChange={(e) => setSettings(s => s ? {...s, headingFont: e.target.value} : null)}
                    className="w-full bg-gray-50 border-none rounded-[12px] pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary"
                    placeholder="Space Grotesk"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Body Font (Google Font)</label>
                <div className="relative">
                  <Type className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input 
                    type="text" 
                    value={settings?.bodyFont}
                    onChange={(e) => setSettings(s => s ? {...s, bodyFont: e.target.value} : null)}
                    className="w-full bg-gray-50 border-none rounded-[12px] pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary"
                    placeholder="Inter"
                  />
                </div>
              </div>
            </div>
          </div>
          </div>
        )}

        {/* Hero Section */}
        {(activeTab === 'all' || activeTab === 'website') && (
          <div className="space-y-6 bg-white p-6 rounded-[24px] border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 border-b border-gray-50 pb-4 flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              Hero Content
            </h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Hero Title</label>
                <input 
                  type="text" 
                  value={settings?.heroTitle || ''}
                  onChange={(e) => setSettings(s => s ? {...s, heroTitle: e.target.value} : null)}
                  className="w-full bg-gray-50 border-none rounded-[12px] px-4 py-3 text-sm focus:ring-2 focus:ring-primary"
                  placeholder="e.g. Discover Balinese Wonders"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Hero Subtitle / Badge</label>
                <input 
                  type="text" 
                  value={settings?.heroSubtitle || ''}
                  onChange={(e) => setSettings(s => s ? {...s, heroSubtitle: e.target.value} : null)}
                  className="w-full bg-gray-50 border-none rounded-[12px] px-4 py-3 text-sm focus:ring-2 focus:ring-primary"
                  placeholder="e.g. WELCOME TO TRIPBONE"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Hero Description</label>
                <textarea 
                  value={settings?.heroDescription || ''}
                  onChange={(e) => setSettings(s => s ? {...s, heroDescription: e.target.value} : null)}
                  className="w-full bg-gray-50 border-none rounded-[12px] px-4 py-3 text-sm focus:ring-2 focus:ring-primary min-h-[80px]"
                  placeholder="e.g. Curated expeditions and private custom adventures..."
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Hero YouTube URL</label>
                <div className="relative">
                  <Video className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input 
                    type="text" 
                    value={settings?.heroYoutubeUrl || ''}
                    onChange={(e) => setSettings(s => s ? {...s, heroYoutubeUrl: e.target.value} : null)}
                    className="w-full bg-gray-50 border-none rounded-[12px] pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary"
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>
                <p className="text-[10px] text-gray-400 font-medium pl-1 italic">
                  If provided, this video will replace the static hero image on the home page.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SEO & Social */}
        {(activeTab === 'all' || activeTab === 'seo') && (
          <div className="space-y-6 bg-white p-6 rounded-[24px] border border-gray-100 col-span-1 md:col-span-2">
            <h3 className="text-lg font-bold text-gray-900 border-b border-gray-50 pb-4 flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              SEO & Generative Engine Optimization (GEO)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Default Meta Title</label>
                  <input 
                    type="text" 
                    value={settings?.metaTitle || ''}
                    onChange={(e) => setSettings(s => s ? {...s, metaTitle: e.target.value} : null)}
                    className="w-full bg-gray-50 border-none rounded-[12px] px-4 py-3 text-sm focus:ring-2 focus:ring-primary"
                    placeholder="e.g. Best Adventure Tours in Bali"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Home Title Format</label>
                  <input 
                    type="text" 
                    value={settings?.homeTitleFormat || '{{siteName}} - Adventure Tours in Bali'}
                    onChange={(e) => setSettings(s => s ? {...s, homeTitleFormat: e.target.value} : null)}
                    className="w-full bg-gray-50 border-none rounded-[12px] px-4 py-3 text-sm focus:ring-2 focus:ring-primary font-mono"
                    placeholder="{{siteName}} - Your Slogan"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Page Title Format</label>
                  <input 
                    type="text" 
                    value={settings?.pageTitleFormat || '{{title}} | {{siteName}}'}
                    onChange={(e) => setSettings(s => s ? {...s, pageTitleFormat: e.target.value} : null)}
                    className="w-full bg-gray-50 border-none rounded-[12px] px-4 py-3 text-sm focus:ring-2 focus:ring-primary font-mono"
                    placeholder="{{title}} | {{siteName}}"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Tour Title Format</label>
                  <input 
                    type="text" 
                    value={settings?.tourTitleFormat || '{{title}} | {{siteName}}'}
                    onChange={(e) => setSettings(s => s ? {...s, tourTitleFormat: e.target.value} : null)}
                    className="w-full bg-gray-50 border-none rounded-[12px] px-4 py-3 text-sm focus:ring-2 focus:ring-primary font-mono"
                    placeholder="{{title}} | {{siteName}}"
                  />
                  <p className="text-[10px] text-gray-400 font-medium pl-1 italic">Use {"{{title}}"} and {"{{siteName}}"} placeholders.</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Blog Title Format</label>
                  <input 
                    type="text" 
                    value={settings?.blogTitleFormat || '{{title}} - {{siteName}}'}
                    onChange={(e) => setSettings(s => s ? {...s, blogTitleFormat: e.target.value} : null)}
                    className="w-full bg-gray-50 border-none rounded-[12px] px-4 py-3 text-sm focus:ring-2 focus:ring-primary font-mono"
                    placeholder="{{title}} - {{siteName}}"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Global Meta Description</label>
                  <textarea 
                    rows={4}
                    value={settings?.siteDescription}
                    onChange={(e) => setSettings(s => s ? {...s, siteDescription: e.target.value} : null)}
                    className="w-full bg-gray-50 border-none rounded-[12px] px-4 py-3 text-sm focus:ring-2 focus:ring-primary"
                    placeholder="Describe your travel agency for search engines and AI crawlers..."
                  />
                  <p className="text-[10px] text-gray-400 font-medium pl-1">Optimal length: 110-160 characters for standard SEO.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Keywords</label>
                  <input 
                    type="text" 
                    value={settings?.siteKeywords}
                    onChange={(e) => setSettings(s => s ? {...s, siteKeywords: e.target.value} : null)}
                    className="w-full bg-gray-50 border-none rounded-[12px] px-4 py-3 text-sm focus:ring-2 focus:ring-primary"
                    placeholder="adventure, bali, tour, trekking..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Default Social Sharing (OG) Image URL</label>
                  <div className="relative">
                    <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input 
                      type="text" 
                      value={settings?.ogImage || ''}
                      onChange={(e) => setSettings(s => s ? {...s, ogImage: e.target.value} : null)}
                      className="w-full bg-gray-50 border-none rounded-[12px] pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary"
                      placeholder="https://example.com/social-preview.jpg"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium pl-1 italic">This image appears when your site is shared on WhatsApp, Facebook, or Twitter.</p>
                </div>
                
                <div className="pt-4 px-4 py-3 bg-orange-50/50 rounded-[16px] border border-orange-100/50">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <Bot className="h-5 w-5 text-primary" />
                        <div>
                          <span className="block text-sm font-bold text-gray-900">AI Crawler Visibility</span>
                          <span className="block text-[10px] text-gray-500">Allow GPTBot, ChatGPT, and other AI models to index your site for GEO.</span>
                        </div>
                     </div>
                     <button 
                      type="button"
                      onClick={() => setSettings(s => s ? {...s, allowAICrawlers: !s.allowAICrawlers} : null)}
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        settings?.allowAICrawlers ? "bg-primary" : "bg-gray-200"
                      )}
                     >
                       <span className={cn(
                         "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                         settings?.allowAICrawlers ? "translate-x-6" : "translate-x-1"
                       )} />
                     </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Social Media Links */}
        {(activeTab === 'all' || activeTab === 'company-info') && (
          <div className="space-y-6 bg-white p-6 rounded-[24px] border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 border-b border-gray-50 pb-4 flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Social Media Links
            </h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Instagram URL</label>
                <div className="relative">
                  <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input 
                    type="text" 
                    value={settings?.instagramUrl || ''}
                    onChange={(e) => setSettings(s => s ? {...s, instagramUrl: e.target.value} : null)}
                    className="w-full bg-gray-50 border-none rounded-[12px] pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary"
                    placeholder="https://instagram.com/..."
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Facebook URL</label>
                <div className="relative">
                  <Facebook className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input 
                    type="text" 
                    value={settings?.facebookUrl || ''}
                    onChange={(e) => setSettings(s => s ? {...s, facebookUrl: e.target.value} : null)}
                    className="w-full bg-gray-50 border-none rounded-[12px] pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary"
                    placeholder="https://facebook.com/..."
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Twitter URL</label>
                <div className="relative">
                  <Twitter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input 
                    type="text" 
                    value={settings?.twitterUrl || ''}
                    onChange={(e) => setSettings(s => s ? {...s, twitterUrl: e.target.value} : null)}
                    className="w-full bg-gray-50 border-none rounded-[12px] pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary"
                    placeholder="https://twitter.com/..."
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">TikTok URL</label>
                <div className="relative">
                  <Music2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input 
                    type="text" 
                    value={settings?.tiktokUrl || ''}
                    onChange={(e) => setSettings(s => s ? {...s, tiktokUrl: e.target.value} : null)}
                    className="w-full bg-gray-50 border-none rounded-[12px] pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary"
                    placeholder="https://tiktok.com/@..."
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Theme Customization Section */}
      {(activeTab === 'all' || activeTab === 'builder') && (
        <div id="theme-customization" className="space-y-8 bg-orange-900 rounded-[32px] p-10 text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
            <Palette className="h-64 w-64" />
          </div>
          
          <div className="relative space-y-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-2xl">
                  <Sparkles className="h-8 w-8 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight">Theme & Design System</h3>
                  <p className="text-orange-100/60 font-medium">Choose between default design or combine multiple custom styles.</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/10">
                <span className={cn(
                  "text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer",
                  settings?.themeMode !== 'custom' ? "bg-orange-500 text-white shadow-lg" : "text-white/40 hover:text-white"
                )} onClick={() => setSettings(s => s ? {...s, themeMode: 'default'} : null)}>
                  DEFAULT
                </span>
                <span className={cn(
                  "text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer",
                  settings?.themeMode === 'custom' ? "bg-orange-500 text-white shadow-lg" : "text-white/40 hover:text-white"
                )} onClick={() => setSettings(s => s ? {...s, themeMode: 'custom'} : null)}>
                  CUSTOM
                </span>
              </div>
            </div>

            {settings?.themeMode === 'custom' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {SECTIONS.map(section => (
                  <div key={section.id} className="space-y-3 bg-white/5 p-5 rounded-[24px] border border-white/10 hover:border-orange-400/30 transition-all">
                    <label className="text-[10px] font-black text-orange-400 uppercase tracking-widest block pl-1">
                      {section.name}
                    </label>
                    <select
                      value={settings?.sectionStyles?.[section.id as keyof typeof settings.sectionStyles] || ''}
                      onChange={(e) => {
                        const newStyles = { ...(settings?.sectionStyles || {}) };
                        (newStyles as any)[section.id] = e.target.value;
                        setSettings(s => s ? {...s, sectionStyles: newStyles} : null);
                      }}
                      className="w-full bg-orange-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:ring-2 focus:ring-orange-500 focus:outline-none appearance-none"
                    >
                      <option value="" className="bg-orange-900 text-white/50">Current Default Style</option>
                      {THEME_OPTIONS.map(opt => (
                        <option key={opt.id} value={opt.id} className="bg-orange-900 text-white">
                          [{opt.category}] {opt.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}

            {settings?.themeMode === 'default' && (
              <div className="p-10 bg-white/5 border-2 border-dashed border-white/10 rounded-[32px] text-center">
                <p className="text-orange-100/40 font-bold">The site is currently using the standard design layout.</p>
                <button 
                  type="button"
                  onClick={() => setSettings(s => s ? {...s, themeMode: 'custom'} : null)}
                  className="mt-4 text-orange-400 font-black text-xs uppercase tracking-widest hover:text-white transition-colors"
                >
                  Switch to Custom Builder →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Database Maintenance */}
      {(activeTab === 'all' || activeTab === 'builder' || activeTab === 'website') && (
        <div className="bg-gray-900 rounded-[32px] p-10 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-10">
            <Database className="h-40 w-40" />
          </div>
          <div className="relative space-y-6 max-w-2xl">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-white/10 rounded-xl">
                  <Database className="h-6 w-6 text-primary" />
               </div>
               <h3 className="text-2xl font-black tracking-tight">System Seeding & Testing</h3>
            </div>
            <p className="text-gray-400 font-medium">Generate dummy bookings, customers, and payouts for testing the system. <strong>Warning:</strong> This will add 5 fake records to each collection.</p>
            
            <button
              type="button"
              disabled={saving}
              onClick={async () => {
                if (confirm("Proceed with seeding 5 dummy records for testing? This will affect your live database.")) {
                   handleSeedData();
                }
              }}
              className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-sm tracking-widest uppercase shadow-xl shadow-orange-900/40 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
            >
              {saving ? 'Processing...' : 'Seed Test Data'}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
