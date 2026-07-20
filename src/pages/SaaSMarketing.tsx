import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Helmet } from 'react-helmet-async';
import { useSettings } from '../lib/SettingsContext';
import { 
  Compass, ArrowRight, Play, Sparkles, 
  MessageCircle, Users, Check, Globe, 
  DollarSign, Activity, ChevronRight, Layout, 
  Map, CreditCard, Mail, FileText, BarChart, 
  X, ChevronDown, ChevronUp, Layers, ExternalLink,
  Rocket, Zap, Smartphone, Bot, TrendingUp, Star,
  CheckCircle2, ShieldAlert
} from 'lucide-react';

export default function SaaSMarketing() {
  const { settings } = useSettings();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showcases, setShowcases] = useState<any[]>([]);
  const [loadingShowcases, setLoadingShowcases] = useState(true);

  // Stats / Dashboard simulator states
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'whatsapp' | 'seo'>('overview');
  const [simulatedPrompt, setSimulatedPrompt] = useState('Create a premium sunset catamaran cruise tour in Nusa Penida');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTour, setGeneratedTour] = useState<any | null>(null);
  const [liveVisitors, setLiveVisitors] = useState(142);

  // Auto-change simulation stats & visitors
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveVisitors(prev => prev + Math.floor(Math.random() * 5) - 2);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleGetStarted = () => {
    const hostname = window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : '';
    if (hostname.includes('run.app')) {
      window.location.href = `${window.location.protocol}//${window.location.host}/`;
    } else {
      window.location.href = hostname === 'localhost' 
        ? `http://app.localhost${port}` 
        : 'https://app.tripbone.com';
    }
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  // Load live showcases from Firestore
  useEffect(() => {
    async function loadShowcases() {
      try {
        const snap = await getDocs(collection(db, 'clientShowcase'));
        const list: any[] = [];
        snap.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        list.sort((a, b) => {
          const wA = a.weight || 0;
          const wB = b.weight || 0;
          if (wA !== wB) return wB - wA;
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
        setShowcases(list);
      } catch (err) {
        console.error('Error loading showcases on homepage:', err);
      } finally {
        setLoadingShowcases(false);
      }
    }
    loadShowcases();
  }, []);

  // AI Prompt generation simulation
  const triggerSimulation = () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setGeneratedTour(null);
    setTimeout(() => {
      setGeneratedTour({
        title: '🌴 Ultimate Nusa Penida Sunset Catamaran Experience',
        desc: 'Sail around the iconic Kelingking beach, snorkel with manta rays, and enjoy an organic sunset dinner with premium cocktails prepared by our on-board chef.',
        price: '$149 USD',
        duration: '6 Hours',
        includes: ['Luxury catamaran cruise', 'Snorkeling equipment', 'Gourmet dinner & drinks', 'Hotel transfer'],
        seoMeta: 'Nusa Penida Catamaran Cruise, Sunset Snorkeling Tour Bali, Private Charter Nusa Penida'
      });
      setIsGenerating(false);
    }, 2500);
  };

  // FAQ contents as structured in the wireframe
  const faqs = [
    { 
      q: "Do I need technical skills to use Tripbone?", 
      a: "No, Tripbone is built for non-technical tour operators. AI handles everything — website creation, content writing, and setup." 
    },
    { 
      q: "How long does it take to launch?", 
      a: "Less than 2 minutes. Our AI website generator builds and provisions your entire site instantly." 
    },
    { 
      q: "Can I use my own domain?", 
      a: "Yes, you can easily map your custom domain (e.g., mytours.com) to your Tripbone site." 
    },
    { 
      q: "What payment methods does Tripbone support?", 
      a: "We support Stripe, PayPal, and offline/bank transfers out of the box." 
    },
    { 
      q: "Is there a free trial available?", 
      a: "Yes, we offer a 14-day free trial so you can experience everything Tripbone has to offer before committing." 
    }
  ];

  // Grayscale logos for the trust section
  const logos = [
    { name: "Stripe", url: "https://i.ibb.co.com/8L8wnxLq/baturvolcanotrip.png" }, // fallback placeholders styled gray
    { name: "PayPal", url: "https://i.ibb.co.com/GQ35K2QS/baliblissfulltours.png" },
    { name: "WhatsApp", url: "https://i.ibb.co.com/4ZyNgmZD/balibestexperiencetour.png" },
    { name: "Google Cloud", url: "https://i.ibb.co.com/pv2gjVk0/firstbalitours.png" },
    { name: "Twilio", url: "https://i.ibb.co.com/QjF33QJ1/baliwanderlust3.png" },
    { name: "Mailgun", url: "https://i.ibb.co.com/RpCmjgXW/baliadventoursvertical.png" }
  ];

  return (
    <>
      <Helmet>
        <title>{settings?.metaTitle || (settings?.siteName ? `${settings.siteName} - Instant Tour Agency in a Box` : 'Tripbone - Instant Tour Agency in a Box')}</title>
        <meta name="description" content={settings?.siteDescription || 'Tripbone is an AI-powered SaaS platform for tour operators to generate fully automated tour websites with instant booking systems and WhatsApp automation.'} />
        <meta name="keywords" content={settings?.siteKeywords || 'tour operator software, travel saas, custom booking engine, ai website builder'} />
      </Helmet>

      <div className="bg-white min-h-screen">
        
        {/* --- 1. HERO SECTION --- */}
        <section id="hero" className="pt-36 pb-24 md:pt-44 md:pb-32 px-6 relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-white">
          <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-[#1db3cd]/5 to-transparent pointer-events-none"></div>
          
          <div className="max-w-7xl mx-auto text-center relative z-10">
            
            {/* Pill Badge */}
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex flex-wrap justify-center items-center gap-2 md:gap-3 px-5 py-2 rounded-full bg-slate-100 border border-slate-200/60 text-xs md:text-sm font-semibold text-slate-600 mb-8 shadow-sm"
            >
              <span className="flex h-2 w-2 rounded-full bg-[#1db3cd] animate-pulse"></span>
              <span>AI-Powered</span>
              <span className="text-slate-300">•</span>
              <span>Launch in 2 Minutes</span>
              <span className="text-slate-300">•</span>
              <span>No Code Required</span>
            </motion.div>

            {/* Main Heading */}
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl md:text-5xl lg:text-[3.15rem] xl:text-[3.45rem] font-black text-slate-900 tracking-tight leading-[1.1] max-w-5xl mx-auto mb-6"
            >
              Your Tour Website, Live in 2 Minutes.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-500 via-slate-600 to-slate-400">No Coding. No Developer. No Excuses.</span>
            </motion.h1>

            {/* Subheading Description */}
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg md:text-xl text-slate-500 leading-relaxed max-w-3xl mx-auto mb-10"
            >
              AI builds it, you own it. A blazing-fast, fully automated booking site — your data, your rules, zero technical skill required.
            </motion.p>

            {/* Action Buttons */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
            >
              <button 
                onClick={handleGetStarted} 
                className="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white text-lg font-bold rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 hover:-translate-y-0.5 cursor-pointer"
              >
                <Rocket className="w-5 h-5 text-white" />
                <span>Launch Your Site Free</span>
              </button>
              <button 
                onClick={handleGetStarted} 
                className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-lg font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 hover:-translate-y-0.5 cursor-pointer"
              >
                <Play className="w-5 h-5 text-slate-500 fill-slate-500" />
                <span>Watch Demo</span>
              </button>
            </motion.div>

            {/* Trust / Operator Avatars */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-3"
            >
              <div className="flex -space-x-3 overflow-hidden">
                <img className="inline-block h-9 w-9 rounded-full ring-2 ring-white" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" alt="Operator" />
                <img className="inline-block h-9 w-9 rounded-full ring-2 ring-white" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80" alt="Operator" />
                <img className="inline-block h-9 w-9 rounded-full ring-2 ring-white" src="https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=100&q=80" alt="Operator" />
                <img className="inline-block h-9 w-9 rounded-full ring-2 ring-white" src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=100&q=80" alt="Operator" />
              </div>
              <span className="text-sm font-medium text-slate-500">
                Trusted by <strong className="text-slate-900 font-extrabold">2,400+</strong> tour operators worldwide
              </span>
            </motion.div>

            {/* --- PRODUCT SCREENSHOT / INTEGRATED DASHBOARD SIMULATOR --- */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="mt-20 max-w-6xl mx-auto rounded-3xl border border-slate-200/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.12)] bg-white overflow-hidden text-left"
            >
              {/* Toolbar */}
              <div className="bg-slate-50/80 border-b border-slate-200/70 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                  <span className="text-xs font-mono font-bold text-slate-400 ml-4 bg-slate-200/50 px-3 py-1 rounded-md">
                    tripbone-partner-suite (Live)
                  </span>
                </div>
                {/* Simulated Tabs */}
                <div className="flex gap-1.5 bg-slate-200/50 p-1 rounded-xl">
                  {(['overview', 'bookings', 'whatsapp', 'seo'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                        activeTab === tab 
                          ? 'bg-white text-slate-900 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Inside Browser Dashboard Panel */}
              <div className="p-6 md:p-8 bg-slate-50/40 min-h-[480px] grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Mini Sidebar */}
                <div className="lg:col-span-3 space-y-2 border-r border-slate-200/60 pr-6 hidden lg:block">
                  <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-[#1db3cd] animate-ping"></div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800">Ubud Adventures</h4>
                      <p className="text-[10px] font-mono font-bold text-[#1db3cd]">active.ubudtours.com</p>
                    </div>
                  </div>
                  <nav className="space-y-1 pt-4">
                    <span className="px-3 text-[10px] uppercase font-black text-slate-400 tracking-wider block mb-2">Backoffice</span>
                    {[
                      { icon: Layout, label: 'Analytics Hub' },
                      { icon: Map, label: 'Manage Tours' },
                      { icon: Users, label: 'Bookings Portal' },
                      { icon: MessageCircle, label: 'WhatsApp Automation' },
                      { icon: FileText, label: 'SEO Generator' },
                      { icon: CreditCard, label: 'Payout Settings' }
                    ].map((item, i) => (
                      <div key={i} className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100/80 cursor-pointer`}>
                        <item.icon className="w-4 h-4 text-slate-400" />
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </nav>
                </div>

                {/* Right Interactive/Simulation Work Area */}
                <div className="lg:col-span-9 flex flex-col justify-between">
                  
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      {/* Grid Stats */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-500 uppercase">Weekly Bookings</span>
                            <span className="text-xs font-bold text-[#05c46b] bg-emerald-50 px-2 py-0.5 rounded-full">+18.2%</span>
                          </div>
                          <p className="text-2xl font-black text-slate-900">$24,580.00</p>
                          <p className="text-[10px] text-slate-400 font-medium mt-1">Processed securely via Stripe</p>
                        </div>
                        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-500 uppercase">Live Traffic</span>
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#05c46b] opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#05c46b]"></span>
                            </span>
                          </div>
                          <p className="text-2xl font-black text-slate-900">{liveVisitors} online</p>
                          <p className="text-[10px] text-slate-400 font-medium mt-1">Viewing from 14 global locations</p>
                        </div>
                        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-500 uppercase">WhatsApp Tickets</span>
                            <span className="text-xs font-bold text-[#1db3cd] bg-cyan-50 px-2 py-0.5 rounded-full">100% Rate</span>
                          </div>
                          <p className="text-2xl font-black text-slate-900">1,208 sent</p>
                          <p className="text-[10px] text-slate-400 font-medium mt-1">No human support time required</p>
                        </div>
                      </div>

                      {/* Interactive Section */}
                      <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#1db3cd]/10 rounded-full blur-2xl"></div>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-indigo-500/20 text-[#1db3cd] text-[10px] font-black uppercase tracking-wider mb-2">
                              Interactive Simulation
                            </span>
                            <h4 className="text-lg font-black text-white">Test Tripbone AI Engine Live</h4>
                            <p className="text-xs text-slate-400">Describe a custom itinerary concept below and see how the AI designs pages in seconds.</p>
                          </div>
                        </div>

                        {/* Text Prompt input simulator */}
                        <div className="mt-4 flex flex-col sm:flex-row gap-2">
                          <input 
                            type="text" 
                            value={simulatedPrompt}
                            onChange={(e) => setSimulatedPrompt(e.target.value)}
                            placeholder="Describe your tour..." 
                            className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-[#1db3cd] transition-all"
                          />
                          <button 
                            onClick={triggerSimulation}
                            disabled={isGenerating}
                            className="bg-[#1db3cd] hover:bg-[#1596ad] text-slate-900 font-black px-5 py-3 rounded-xl text-xs transition-colors cursor-pointer shrink-0"
                          >
                            {isGenerating ? 'AI Architect Drafting...' : 'Generate Instantly'}
                          </button>
                        </div>

                        {/* Simulated Output with Loading state */}
                        <div className="mt-4">
                          {isGenerating && (
                            <div className="p-4 bg-slate-850 border border-slate-800 rounded-xl animate-pulse flex items-center space-x-4">
                              <Sparkles className="w-5 h-5 text-[#1db3cd] animate-spin" />
                              <div className="space-y-2 flex-1">
                                <div className="h-3 bg-slate-700 rounded w-1/3"></div>
                                <div className="h-2.5 bg-slate-700 rounded w-5/6"></div>
                              </div>
                            </div>
                          )}

                          {generatedTour && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="p-4 bg-slate-800 border border-slate-700 rounded-xl text-xs space-y-3"
                            >
                              <div className="flex items-center justify-between">
                                <h5 className="font-extrabold text-[#1db3cd]">{generatedTour.title}</h5>
                                <span className="text-[10px] font-mono text-[#05c46b] bg-emerald-950 px-2 py-0.5 rounded-full font-bold">{generatedTour.price}</span>
                              </div>
                              <p className="text-slate-300 leading-relaxed text-[11px]">{generatedTour.desc}</p>
                              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700 text-[10px] text-slate-400">
                                <div><strong>Includes:</strong> {generatedTour.includes.join(', ')}</div>
                                <div><strong>SEO Tags:</strong> {generatedTour.seoMeta}</div>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'bookings' && (
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
                      <h4 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-500" />
                        <span>Live Booking Stream</span>
                      </h4>
                      <div className="space-y-3">
                        {[
                          { name: 'Sarah Connor', tour: 'Kelingking Secret Beaches & Sunset Snorkeling', amount: '$180.00', gateway: 'Stripe', status: 'Confirmed', time: 'Just now' },
                          { name: 'Hiroshi Tanaka', tour: 'Mt. Batur Sunrise Trekking Adventure', amount: '$140.00', gateway: 'Stripe', status: 'Confirmed', time: '3 mins ago' },
                          { name: 'Dieter Schmidt', tour: 'Ubud White Water Rafting & Quad Biking', amount: '$210.00', gateway: 'PayPal', status: 'Pending', time: '14 mins ago' }
                        ].map((item, i) => (
                          <div key={i} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 hover:bg-slate-50 rounded-xl border border-slate-100 transition-colors">
                            <div className="space-y-1">
                              <p className="text-xs font-black text-slate-900">{item.name}</p>
                              <p className="text-[11px] text-slate-500">{item.tour}</p>
                            </div>
                            <div className="flex items-center gap-3 mt-2 sm:mt-0">
                              <span className="text-xs font-mono font-bold text-slate-800">{item.amount}</span>
                              <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-md text-slate-500 font-bold">{item.gateway}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.status === 'Confirmed' ? 'bg-green-50 text-[#05c46b]' : 'bg-amber-50 text-amber-600'}`}>{item.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'whatsapp' && (
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
                      <h4 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-[#05c46b]" />
                        <span>Autopilot WhatsApp Flow</span>
                      </h4>
                      <div className="max-w-md mx-auto space-y-3 bg-[#e5ddd5]/50 p-4 rounded-2xl border border-slate-150">
                        <div className="bg-[#dcf8c6] p-3 rounded-xl shadow-sm text-xs text-slate-800 max-w-[85%] ml-auto">
                          <p className="font-bold text-[#05c46b] text-[10px] mb-1">Tripbone Bot (To: Sarah C.)</p>
                          <p>Hi Sarah! Your booking for the **Kelingking Snorkeling Tour** is officially confirmed! 🏝️</p>
                          <p className="mt-2 text-[10px] text-slate-400">10:42 AM - Sent ✓✓</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl shadow-sm text-xs text-slate-800 max-w-[85%]">
                          <p className="font-bold text-slate-500 text-[10px] mb-1">Sarah Connor</p>
                          <p>Wow! That was so fast. Do I need to bring my own towel?</p>
                          <p className="mt-2 text-[10px] text-slate-400">10:43 AM</p>
                        </div>
                        <div className="bg-[#dcf8c6] p-3 rounded-xl shadow-sm text-xs text-slate-800 max-w-[85%] ml-auto animate-pulse">
                          <p className="font-bold text-[#05c46b] text-[10px] mb-1">Tripbone Bot (To: Sarah C.)</p>
                          <p>No need! Fresh towels, safety vests, mineral water, and a dynamic local guide are all included in your voucher. 🎫 Here is your digital receipt: **VOUCHER-NUSA-9832**</p>
                          <p className="mt-2 text-[10px] text-slate-400">10:43 AM - Sent ✓✓</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'seo' && (
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
                      <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-purple-500" />
                        <span>Organic Keywords & Autopilot Blog Posts</span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50">
                          <p className="text-[10px] uppercase font-black text-slate-400 mb-2">High Value Keywords Targeted</p>
                          <div className="space-y-1.5 text-xs text-slate-700">
                            <div className="flex justify-between font-bold"><span>1. best snorkeling spots bali</span> <span className="text-[#05c46b]">Pos: #1</span></div>
                            <div className="flex justify-between font-bold"><span>2. mount batur private guide</span> <span className="text-[#05c46b]">Pos: #3</span></div>
                            <div className="flex justify-between font-bold"><span>3. ubud rafting tour price</span> <span className="text-[#05c46b]">Pos: #2</span></div>
                          </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50 space-y-2">
                          <p className="text-[10px] uppercase font-black text-slate-400">Latest AI Published Post</p>
                          <p className="text-xs font-black text-slate-900 leading-tight">"A Locals Secret Guide to Snorkeling with Manta Rays in Nusa Penida"</p>
                          <p className="text-[10px] text-[#05c46b] font-bold">✨ Generated & Optimized for Search In 4 Seconds</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex justify-between items-center text-xs text-slate-400 border-t border-slate-100 pt-4 font-mono">
                    <span>Database ID: prod-us-firestore</span>
                    <span>Last updated: just now</span>
                  </div>
                </div>

              </div>
            </motion.div>

          </div>
        </section>

        {/* --- 2. LOGO CLOUD (POWERED BY THE STACK YOU TRUST) --- */}
        <section id="logos" className="py-16 bg-slate-50/50 border-y border-slate-200/40 px-6">
          <div className="max-w-7xl mx-auto text-center">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-8">
              POWERED BY THE STACK YOU TRUST
            </p>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all">
              {logos.map((logo, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <Globe className="w-5 h-5 text-slate-400" />
                  <span className="font-mono text-sm font-bold text-slate-600 tracking-wider uppercase">{logo.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- 3. GO LIVE IN JUST 5 SIMPLE STEPS --- */}
        <section id="how-it-works" className="py-24 md:py-32 bg-white">
          <div className="max-w-7xl mx-auto px-6 text-center">
            
            <span className="text-xs font-black text-[#1db3cd] uppercase tracking-widest bg-cyan-50 border border-cyan-200/50 px-3.5 py-1.5 rounded-full mb-4 inline-block">
              SIMPLE ONBOARDING
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
              Go Live in Just 5 Simple Steps
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-20 leading-relaxed">
              No tech skills needed. AI does the heavy lifting so you can focus on selling tours.
            </p>

            {/* Stepper Timeline */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-8 md:gap-4 relative">
              
              {/* Desktop connector line */}
              <div className="hidden md:block absolute top-10 left-[10%] right-[10%] h-[3px] bg-slate-150 z-0"></div>

              {[
                { step: "1", title: "Create Account", desc: "Sign up instantly for free" },
                { step: "2", title: "Tell Us About You", desc: "Describe tours & destination" },
                { step: "3", title: "AI Provisioning", desc: "Full site built in 2 minutes" },
                { step: "4", title: "Connect Domain", desc: "Attach your custom domain" },
                { step: "5", title: "Website Live", desc: "Start taking bookings & payments" }
              ].map((item, idx) => (
                <div key={idx} className="relative z-10 flex flex-col items-center group">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center font-black text-2xl mb-6 shadow-md border-4 transition-all duration-300 ${
                    idx === 4 
                      ? 'bg-emerald-500 text-white border-emerald-100 group-hover:scale-105 shadow-emerald-200/50' 
                      : 'bg-white text-slate-700 border-slate-100 group-hover:border-[#1db3cd] group-hover:text-[#1db3cd]'
                  }`}>
                    {item.step}
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mb-1.5 tracking-tight">{item.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-[160px]">{item.desc}</p>
                </div>
              ))}

            </div>

          </div>
        </section>

        {/* --- 4. EVERYTHING YOU NEED TO RUN YOUR TOUR BUSINESS (Features Grid) --- */}
        <section id="features" className="py-24 md:py-32 bg-slate-50/50 border-y border-slate-200/50">
          <div className="max-w-7xl mx-auto px-6">
            
            <div className="text-center max-w-3xl mx-auto mb-20">
              <span className="text-xs font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 border border-indigo-200/50 px-3.5 py-1.5 rounded-full mb-4 inline-block">
                ALL-IN-ONE PLATFORM
              </span>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-4">
                Everything You Need to Run <br />Your Tour Business
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { 
                  icon: Layout, 
                  color: "text-blue-500", 
                  bg: "bg-blue-50", 
                  title: "AI Website Builder", 
                  desc: "Generate your complete website in minutes with zero code." 
                },
                { 
                  icon: Map, 
                  color: "text-indigo-500", 
                  bg: "bg-indigo-50", 
                  title: "AI Tour Creator", 
                  desc: "Create professional tour pages instantly with AI-generated content." 
                },
                { 
                  icon: Sparkles, 
                  color: "text-amber-500", 
                  bg: "bg-amber-50", 
                  title: "Booking Engine", 
                  desc: "Online bookings with real-time availability management." 
                },
                { 
                  icon: CreditCard, 
                  color: "text-emerald-500", 
                  bg: "bg-emerald-50", 
                  title: "Online Payments", 
                  desc: "Stripe, PayPal, Bank Transfer and more payment options." 
                },
                { 
                  icon: MessageCircle, 
                  color: "text-emerald-600", 
                  bg: "bg-emerald-50", 
                  title: "WhatsApp Automation", 
                  desc: "Automatically notify customers and deliver tickets via WhatsApp." 
                },
                { 
                  icon: Mail, 
                  color: "text-rose-500", 
                  bg: "bg-rose-50", 
                  title: "Email Automation", 
                  desc: "Booking confirmations and reminders sent automatically." 
                },
                { 
                  icon: FileText, 
                  color: "text-purple-500", 
                  bg: "bg-purple-50", 
                  title: "SEO Content Generator", 
                  desc: "AI writes SEO blogs that attract organic traffic automatically." 
                },
                { 
                  icon: BarChart, 
                  color: "text-cyan-500", 
                  bg: "bg-cyan-50", 
                  title: "Dashboard & Reports", 
                  desc: "Track bookings, revenue and customers in one place." 
                },
              ].map((feature, i) => (
                <div key={i} className="bg-white p-8 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                  <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-6`}>
                    <feature.icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mb-2 tracking-tight">{feature.title}</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* --- 5. THE SMARTER ALTERNATIVE (Traditional vs Tripbone) --- */}
        <section className="py-24 md:py-32 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            
            <div className="text-center max-w-3xl mx-auto mb-20">
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest bg-slate-100 border border-slate-200 px-3.5 py-1.5 rounded-full mb-4 inline-block">
                WHY CHOOSE TRIPBONE
              </span>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                The Smarter Alternative
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
              
              {/* Left Column: Traditional */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-8 md:p-12 shadow-sm relative overflow-hidden">
                <span className="absolute top-4 right-4 text-xs font-mono font-bold text-slate-300">TRADITIONAL WAY</span>
                <h3 className="text-2xl font-black text-slate-400 mb-8 pb-4 border-b border-slate-200/60 flex items-center gap-2">
                  <X className="w-6 h-6 text-red-500" />
                  <span>Traditional Approach</span>
                </h3>
                <ul className="space-y-6">
                  {[
                    "Build your own website",
                    "Install & configure plugins",
                    "Configure hosting separately",
                    "Hire expensive developers",
                    "Learn WordPress / tech stack",
                    "Spend days or weeks setting up"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center text-sm font-semibold text-slate-600">
                      <X className="w-5 h-5 text-red-400 mr-3.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right Column: Tripbone */}
              <div className="bg-slate-900 rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#1db3cd]/10 rounded-full blur-[80px] pointer-events-none"></div>
                <span className="absolute top-4 right-4 text-xs font-mono font-bold text-slate-700">MODERN STACK</span>
                <h3 className="text-2xl font-black text-[#1db3cd] mb-8 pb-4 border-b border-slate-800 flex items-center gap-2">
                  <Check className="w-6 h-6 text-[#05c46b]" />
                  <span>Tripbone</span>
                </h3>
                <ul className="space-y-6 relative z-10">
                  {[
                    "AI builds your entire site in 2 mins",
                    "Zero tech skills required",
                    "Hosting & domain included",
                    "Built-in booking & payments",
                    "Automated WhatsApp & Email",
                    "Live and selling in minutes"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center text-sm font-bold text-white">
                      <Check className="w-5 h-5 text-[#05c46b] mr-3.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>

          </div>
        </section>

        {/* --- 6. BUILT DIFFERENT / THREE SUPERPOWERS (High-Fidelity Interaction Bento Grid) --- */}
        <section className="py-24 md:py-32 bg-slate-50/50 border-t border-slate-200/50">
          <div className="max-w-7xl mx-auto px-6">
            
            <div className="text-center max-w-3xl mx-auto mb-20">
              <span className="text-xs font-black text-[#1db3cd] uppercase tracking-widest bg-cyan-50 border border-cyan-200/50 px-3.5 py-1.5 rounded-full mb-4 inline-block">
                BUILT DIFFERENT
              </span>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                Everything you need to <br />dominate your market
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Column 1: Setup & AI */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                <div>
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6">
                    <Zap className="w-6 h-6 text-indigo-500" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-3">Instant Setup & AI</h3>
                  <p className="text-slate-500 text-xs leading-relaxed mb-6">
                    AI writes your tours, generates SEO blog posts, and translates your site into 30+ languages automatically.
                  </p>
                  <ul className="space-y-3 mb-8">
                    {[
                      "Live in 2 minutes",
                      "Zero tech skills required",
                      "Connect your own domain"
                    ].map((li, idx) => (
                      <li key={idx} className="flex items-center text-xs font-bold text-slate-700">
                        <Check className="w-4 h-4 text-[#05c46b] mr-2" />
                        <span>{li}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {/* Visual simulator mockup inside column */}
                <div className="bg-slate-900 rounded-2xl p-4 text-[10px] font-mono text-slate-300">
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
                    <span className="text-[9px] text-[#1db3cd] font-bold">🤖 TRIPBONE CO-PILOT</span>
                    <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">active</span>
                  </div>
                  <p className="text-slate-400">Prompt: "Mt Batur sunrise jeep tour"</p>
                  <div className="mt-2 text-white bg-slate-850 p-2 rounded border border-slate-800 space-y-1">
                    <p className="font-extrabold text-[#05c46b]">✨ Completed Site Structure</p>
                    <p className="text-[9px] text-slate-400">✓ Booking Flow Map Added</p>
                    <p className="text-[9px] text-slate-400">✓ 4.9 Star Reviews Generated</p>
                  </div>
                </div>
              </div>

              {/* Column 2: Built to Convert */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                <div>
                  <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mb-6">
                    <Smartphone className="w-6 h-6 text-amber-500" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-3">Built to Convert</h3>
                  <p className="text-slate-500 text-xs leading-relaxed mb-6">
                    70% of bookings happen on phones. Your Tripbone site looks and feels like a native mobile app out of the box.
                  </p>
                  <ul className="space-y-3 mb-8">
                    {[
                      "Mobile-first app design",
                      "Gorgeous design capabilities",
                      "Lightning-fast SEO architecture"
                    ].map((li, idx) => (
                      <li key={idx} className="flex items-center text-xs font-bold text-slate-700">
                        <Check className="w-4 h-4 text-[#05c46b] mr-2" />
                        <span>{li}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {/* Visual simulator mockup inside column */}
                <div className="bg-slate-100 rounded-2xl p-4 border border-slate-200">
                  <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-150 text-[10px] space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-black text-slate-900">Confirm Booking</span>
                      <span className="font-bold text-[#05c46b]">$120 USD</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded w-full"></div>
                    <div className="h-2 bg-slate-100 rounded w-2/3"></div>
                    <button className="w-full py-2 bg-slate-900 text-white font-extrabold text-[10px] rounded-lg">
                      Pay Securely
                    </button>
                  </div>
                </div>
              </div>

              {/* Column 3: Autopilot Operations */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                <div>
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6">
                    <MessageCircle className="w-6 h-6 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-3">Autopilot Operations</h3>
                  <p className="text-slate-500 text-xs leading-relaxed mb-6">
                    Automate your entire back-office. Engage customers directly where they already are with native WhatsApp automation.
                  </p>
                  <ul className="space-y-3 mb-8">
                    {[
                      "WhatsApp ticket delivery",
                      "Automated review requests",
                      "Easy package & tiered pricing"
                    ].map((li, idx) => (
                      <li key={idx} className="flex items-center text-xs font-bold text-slate-700">
                        <Check className="w-4 h-4 text-[#05c46b] mr-2" />
                        <span>{li}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {/* Visual simulator mockup inside column */}
                <div className="bg-slate-950 text-slate-300 rounded-2xl p-4 text-[10px] font-mono space-y-2">
                  <div className="flex justify-between pb-1 border-b border-slate-800">
                    <span className="text-[#05c46b] font-bold">💬 WhatsApp Flow</span>
                    <span className="text-slate-500">active</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded text-slate-400">
                    <p className="text-white font-bold">1. Customer Books</p>
                    <p className="text-[9px]">→ WhatsApp trigger sent instantly</p>
                  </div>
                  <div className="bg-slate-900 p-2 rounded text-slate-400">
                    <p className="text-white font-bold">2. Day of Tour (7:00 AM)</p>
                    <p className="text-[9px]">→ Driver contact card shared</p>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </section>

        {/* --- 7. SITES POWERED BY TRIPBONE (Live Showcase list from Firestore) --- */}
        <section id="showcases" className="py-24 md:py-32 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            
            <div className="text-center max-w-2xl mx-auto mb-20">
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest bg-slate-100 border border-slate-200 px-3.5 py-1.5 rounded-full mb-4 inline-block">
                LIVE EXAMPLES
              </span>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
                Sites Powered by Tripbone
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                Explore how tour operators are transforming their digital presence and driving more sales.
              </p>
            </div>

            {/* Showcase Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {showcases.length > 0 ? (
                // Show maximum of 3 elegant showcases on the landing page
                showcases.slice(0, 3).map((item, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    key={item.id} 
                    className="rounded-2xl overflow-hidden shadow-lg border border-slate-200/70 bg-white group hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      {/* Browser mockup header */}
                      <div className="w-full h-10 bg-slate-50 border-b border-slate-200 flex items-center px-4 justify-between z-10 relative">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-slate-400 truncate max-w-[150px]">
                          {item.url ? item.url.replace(/^https?:\/\//i, '') : 'client-site'}
                        </span>
                        <div className="w-4"></div>
                      </div>
                      <div className="relative h-[220px] w-full overflow-hidden bg-slate-50">
                        {item.screenshotUrl ? (
                          <img 
                            src={item.screenshotUrl} 
                            alt={item.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-350 bg-slate-50">
                            <Layers className="w-12 h-12 stroke-1 text-slate-400" />
                            <span className="text-[10px] font-mono mt-2 uppercase tracking-widest font-black text-slate-400">Preview Pending</span>
                          </div>
                        )}
                      </div>
                      <div className="p-6 text-left">
                        <div className="flex items-center space-x-1.5 mb-1.5">
                          <h3 className="text-lg font-black text-slate-900 group-hover:text-[#1db3cd] transition-colors truncate">
                            {item.title}
                          </h3>
                          <CheckCircle2 className="w-4 h-4 text-[#05c46b] fill-green-50" />
                        </div>
                        <p className="text-xs text-slate-400 font-mono mb-2">
                          {item.location || 'Global Operations'} • {item.category || 'Tours & Excursions'}
                        </p>
                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                          {item.description || 'Verified Tripbone partner website.'}
                        </p>
                      </div>
                    </div>
                    <div className="px-6 pb-6 text-left">
                      <a 
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-slate-700 hover:text-[#1db3cd] inline-flex items-center space-x-1.5 border border-slate-250 px-3.5 py-1.5 rounded-lg hover:border-cyan-100 hover:bg-cyan-50/20 transition-all cursor-pointer"
                      >
                        <span>Visit Live Site</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </motion.div>
                ))
              ) : (
                /* Static High-End Mock showcases from wireframe */
                [
                  { 
                    title: "Bali Adventure Tours", 
                    location: "Bali, Indonesia",
                    category: "Adventure & Trekking",
                    desc: "Premium booking platform for white water rafting, ATV rides, and volcano hikes with real-time digital ticket generation.",
                    img: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=600&q=80"
                  },
                  { 
                    title: "Patagonia Expeditions", 
                    location: "Argentina",
                    category: "Hiking & Wildlife",
                    desc: "Specialist trekking guides featuring customizable multi-day trekking itineraries and fast client registration maps.",
                    img: "https://images.unsplash.com/photo-1517022812141-23620dba5c23?auto=format&fit=crop&w=600&q=80"
                  },
                  { 
                    title: "Sahara Desert Trips", 
                    location: "Morocco",
                    category: "Desert & Culture",
                    desc: "Multi-supplier custom itinerary luxury desert glamping portal featuring native multilingual booking flows.",
                    img: "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?auto=format&fit=crop&w=600&q=80"
                  }
                ].map((item, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    key={i} 
                    className="rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-white group hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      {/* Browser toolbar header */}
                      <div className="w-full h-10 bg-slate-50 border-b border-slate-200 flex items-center px-4 gap-1.5 z-10 relative">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
                      </div>
                      <div className="relative h-[220px] w-full overflow-hidden bg-slate-100">
                        <img 
                          src={item.img} 
                          alt={item.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                      </div>
                      <div className="p-6 text-left">
                        <div className="flex items-center space-x-1.5 mb-1.5">
                          <h3 className="text-lg font-black text-slate-900 group-hover:text-[#1db3cd] transition-colors truncate">
                            {item.title}
                          </h3>
                          <CheckCircle2 className="w-4 h-4 text-[#05c46b] fill-green-50" />
                        </div>
                        <p className="text-xs text-slate-400 font-mono mb-2">
                          {item.location} • {item.category}
                        </p>
                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                    <div className="px-6 pb-6 text-left">
                      <span className="text-xs font-bold text-slate-700 hover:text-[#1db3cd] inline-flex items-center space-x-1.5 border border-slate-250 px-3.5 py-1.5 rounded-lg hover:border-cyan-100 hover:bg-cyan-50/20 transition-all cursor-pointer">
                        <span>Visit Live Site</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            <div className="mt-16 text-center">
              <Link
                to="/directory"
                className="inline-flex items-center space-x-2.5 bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-xl font-bold transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
              >
                <span>See More Sites</span>
                <Globe className="w-5 h-5 text-indigo-400" />
              </Link>
            </div>

          </div>
        </section>

        {/* --- 8. SAVE THOUSANDS / ONE PLATFORM INSTEAD --- */}
        <section className="py-24 md:py-32 bg-slate-50/50 border-y border-slate-200/50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              
              {/* Left text panel */}
              <div className="lg:col-span-5 text-left space-y-6">
                <span className="text-xs font-black text-[#1db3cd] uppercase tracking-widest bg-cyan-50 border border-cyan-200/50 px-3.5 py-1.5 rounded-full inline-block">
                  SAVE THOUSANDS
                </span>
                <h2 className="text-4.5xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                  One platform.<br />
                  Instead of paying<br />
                  for all of these.
                </h2>
                <p className="text-sm text-slate-500 leading-relaxed max-w-md">
                  Use one platform instead of managing 8+ different tools, subscriptions, and external contractor invoices.
                </p>
                <div className="pt-4">
                  <button 
                    onClick={handleGetStarted} 
                    className="px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white text-base font-bold rounded-xl shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer"
                  >
                    Start Saving Today
                  </button>
                </div>
              </div>

              {/* Right pricing grids */}
              <div className="lg:col-span-7">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { tool: "Website Designer", price: "$2,500+" },
                    { tool: "WordPress Dev", price: "$3,000+" },
                    { tool: "Booking Plugin", price: "$499/yr" },
                    { tool: "Hosting", price: "$300/yr" },
                    { tool: "SEO Plugin", price: "$199/yr" },
                    { tool: "Email Software", price: "$300/yr" },
                    { tool: "WhatsApp Tool", price: "$240/yr" },
                    { tool: "CRM", price: "$600/yr" }
                  ].map((item, i) => (
                    <div key={i} className="bg-white border border-slate-200/80 p-5 rounded-2xl flex items-center justify-between shadow-sm">
                      <div className="space-y-1">
                        <p className="text-xs font-black text-slate-900">{item.tool}</p>
                        <p className="text-[10px] text-slate-400 font-medium">Standard alternative cost</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-extrabold text-red-500 line-through decoration-2">
                          {item.price}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* --- 9. TRUSTED BY BUSINESSES WORLDWIDE (Social Proof / Testimonials) --- */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6 text-center">
            
            <span className="text-xs font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 border border-indigo-200/50 px-3.5 py-1.5 rounded-full mb-4 inline-block">
              SOCIAL PROOF
            </span>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-20">
              Trusted by businesses worldwide
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  quote: "We launched our tour website in under 10 minutes. The AI-generated content was spot on and the WhatsApp automation saved us hours every week.",
                  author: "Anita Raharjo",
                  agency: "Bali Explorer Trips",
                  avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80"
                },
                {
                  quote: "Finally a platform that just works. I replaced 6 different tools with one subscription. My bookings have doubled in 3 months.",
                  author: "Mateus Fernandez",
                  agency: "Costa Rica Wild Tours",
                  avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80"
                },
                {
                  quote: "The SEO content generator is a game changer. We rank on Google for 40+ keywords within weeks without hiring a single SEO consultant.",
                  author: "Yuki Tanaka",
                  agency: "Japan Zen Journeys",
                  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80"
                }
              ].map((item, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-150 rounded-3xl p-8 text-left space-y-6 flex flex-col justify-between shadow-sm">
                  <div className="space-y-4">
                    {/* Stars */}
                    <div className="flex text-amber-400 gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className="w-4 h-4 fill-amber-400 stroke-amber-400" />
                      ))}
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed italic">
                      "{item.quote}"
                    </p>
                  </div>
                  <div className="flex items-center space-x-3.5 pt-4 border-t border-slate-200/50">
                    <img src={item.avatar} alt={item.author} className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-50" />
                    <div>
                      <h4 className="text-sm font-black text-slate-900">{item.author}</h4>
                      <p className="text-[11px] text-[#1db3cd] font-bold uppercase tracking-wider">{item.agency}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* --- 10. FREQUENTLY ASKED QUESTIONS --- */}
        <section className="py-24 md:py-32 bg-slate-50/50 border-t border-slate-200/40">
          <div className="max-w-3xl mx-auto px-6">
            
            <div className="text-center mb-16">
              <span className="text-xs font-black text-[#1db3cd] uppercase tracking-widest bg-cyan-50 border border-cyan-200/50 px-3.5 py-1.5 rounded-full mb-4 inline-block">
                FAQ
              </span>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
                Frequently Asked Questions
              </h2>
            </div>

            {/* FAQ Accordion list */}
            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div key={idx} className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm transition-all duration-200">
                  <button 
                    onClick={() => toggleFaq(idx)}
                    className="w-full px-6 py-5 text-left flex justify-between items-center focus:outline-none cursor-pointer hover:bg-slate-50/50"
                  >
                    <span className="font-extrabold text-base md:text-lg text-slate-900 pr-4">{faq.q}</span>
                    {openFaq === idx 
                      ? <ChevronUp className="w-5 h-5 text-[#1db3cd] shrink-0" /> 
                      : <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                    }
                  </button>
                  <div className={`px-6 overflow-hidden transition-all duration-300 ${
                    openFaq === idx ? 'max-h-[200px] pb-6 border-t border-slate-100 pt-4' : 'max-h-0'
                  }`}>
                    <p className="text-slate-500 text-sm leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* --- 11. FINAL CTA BLOCK --- */}
        <section className="py-24 md:py-32 bg-slate-950 text-white relative overflow-hidden text-center px-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(29,179,205,0.15),transparent_70%)] pointer-events-none" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#05c46b]/5 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#1db3cd]/5 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />
          
          <div className="max-w-4xl mx-auto relative z-10 space-y-8">
            <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
              Ready to elevate your <br />tour business?
            </h2>
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Join thousands of tour operators who have transformed their business with Tripbone. Start your free trial today.
            </p>
            
            {/* CTA controls */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto pt-4">
              <button 
                onClick={handleGetStarted} 
                className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-100 text-slate-950 text-base font-extrabold rounded-xl shadow-xl transition-all hover:-translate-y-0.5 cursor-pointer"
              >
                Start Free Trial
              </button>
              <button 
                onClick={handleGetStarted} 
                className="w-full sm:w-auto px-8 py-4 bg-transparent border border-slate-750 hover:bg-slate-900 text-white text-base font-extrabold rounded-xl transition-all cursor-pointer"
              >
                Talk to Sales
              </button>
            </div>

            {/* Trial terms list */}
            <p className="text-xs text-slate-500 font-medium">
              No credit card required • Free 14-day trial • Cancel anytime
            </p>
          </div>
        </section>

      </div>
    </>
  );
}
