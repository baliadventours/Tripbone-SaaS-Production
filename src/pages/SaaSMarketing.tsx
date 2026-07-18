import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useSettings } from '../lib/SettingsContext';
import { 
  Compass, ArrowRight, Play, Sparkles, 
  MousePointerClick, MessageCircle, Users,
  Check, Globe, DollarSign, Activity,
  ChevronRight, Layout, Map, CreditCard, Mail, 
  FileText, BarChart, X, ChevronDown, ChevronUp
} from 'lucide-react';

export default function SaaSMarketing() {
  const { settings } = useSettings();
  const logos = [
    { src: "https://i.ibb.co.com/5W12VwnL/gorillalogo-nobg.png", alt: "Gorilla Logo" },
    { src: "https://i.ibb.co.com/RpCmjgXW/baliadventoursvertical.png", alt: "Bali Adventours" },
    { src: "https://i.ibb.co.com/QjF33QJ1/baliwanderlust3.png", alt: "Bali Wanderlust" },
    { src: "https://i.ibb.co.com/pv2gjVk0/firstbalitours.png", alt: "First Bali Tours" },
    { src: "https://i.ibb.co.com/b54mHsMG/BAALOGO2.png", alt: "BAA Logo" },
    { src: "https://i.ibb.co.com/4ZyNgmZD/balibestexperiencetour.png", alt: "Bali Best Experience" },
    { src: "https://i.ibb.co.com/GQ35K2QS/baliblissfulltours.png", alt: "Bali Blissfull Tours" },
    { src: "https://i.ibb.co.com/8L8wnxLq/baturvolcanotrip.png", alt: "Batur Volcano Trip" },
    { src: "https://i.ibb.co.com/Hpr8KBzN/logo.png", alt: "Partner Logo" },
    { src: "https://i.ibb.co.com/v8rQvrv/volcanosunrise.png", alt: "Volcano Sunrise" },
  ];

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

  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    { q: "How long does setup take?", a: "With our AI generator, your complete website and booking engine can be live in less than 2 minutes." },
    { q: "Can I use my own domain?", a: "Yes, you can connect your existing domain or we can help you register a new one instantly." },
    { q: "Can I migrate my existing website?", a: "Absolutely. Our team offers free migration services to move all your existing tours, content, and bookings to Tripbone." },
    { q: "Do I need coding skills?", a: "None at all. Tripbone is designed to be 100% no-code. If you can type, you can build a beautiful site." },
    { q: "What payment gateways are supported?", a: "We integrate seamlessly with Stripe, PayPal, Midtrans, Bank Transfers, and more." },
    { q: "Can I customize my design?", a: "Yes, we offer multiple premium mobile-first templates and complete control over your brand colors and typography." },
    { q: "Can I connect WhatsApp?", a: "Yes, Tripbone features native WhatsApp automation to instantly send tickets and reminders to your customers." },
    { q: "Can I export my data?", a: "Of course. You own your data and can export your manifests, customer lists, and financial reports at any time." },
  ];

  const heroImages = [
    "https://i.ibb.co.com/HDrMD7jV/image.png",
    "https://i.ibb.co.com/99tvYdwv/image.png",
    "https://i.ibb.co.com/LzZYPvq3/image.png",
    "https://i.ibb.co.com/s9mtG824/image.png"
  ];

  const mobileHeroImages = [
    "https://i.ibb.co.com/Z1fM60pp/IMG-2982.png",
    "https://i.ibb.co.com/twnj9Hjs/IMG-2984.png",
    "https://i.ibb.co.com/xSmD6PG7/IMG-2981.png",
    "https://i.ibb.co.com/JwmYbMVy/IMG-2979.png",
    "https://i.ibb.co.com/zVsQkkqj/IMG-2983.png",
    "https://i.ibb.co.com/t1N70JD/IMG-2980.png"
  ];

  const [currentHeroImg, setCurrentHeroImg] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHeroImg((prev) => prev + 1);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <Helmet>
        <title>{settings?.metaTitle || (settings?.siteName ? `${settings.siteName} - Enterprise Multi Tenant SaaS Platform` : 'Tripbone - Enterprise Multi Tenant SaaS Platform')}</title>
        <meta name="description" content={settings?.siteDescription || 'Tripbone is an enterprise multi-tenant SaaS platform for tour operators and agencies. Built with AI-powered trip planning, secure billing, and modern booking workflows.'} />
        <meta name="keywords" content={settings?.siteKeywords || 'saas, travel, tour operator, booking software, multi tenant'} />
      </Helmet>
      <main>
        {/* 1. Hero Section */}
        <section className="pt-32 pb-24 lg:pt-48 lg:pb-32 px-6 relative overflow-hidden bg-gradient-to-b from-slate-50 to-white">
          <div className="absolute top-10 left-1/4 w-96 h-96 bg-[#1db3cd]/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-[#05c46b]/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="max-w-7xl mx-auto relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="lg:col-span-7 max-w-2xl"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 border border-slate-200 text-sm font-semibold text-slate-700 mb-6 mt-4 lg:mt-0">
                  <span className="flex h-2 w-2 rounded-full bg-[#1db3cd] animate-pulse"></span>
                  Instant Tour Agency in a Box
                </div>
                
                <h1 className="text-4xl md:text-5xl lg:text-[3.8rem] font-black mb-6 text-slate-900 tracking-tight leading-[1.15]">
                  Launch Your AI-Powered Tour Booking Website in <span className="relative inline-block text-white px-3 mt-2 md:mt-1 ml-1 whitespace-nowrap">
                    <span className="relative z-10">2 minutes.</span>
                    <span className="absolute inset-0 bg-[#05c46b] rounded-xl -z-0 transform -rotate-1"></span>
                  </span>
                </h1>
                
                <p className="text-lg md:text-xl text-slate-600 mb-10 leading-relaxed max-w-xl">
                  Stop wrestling with clunky plugins and expensive developers. Tripbone uses AI to instantly generate a stunning, mobile-first website with built-in booking, SEO, and WhatsApp automation. Just connect your domain and start selling.
                </p>
                
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <button onClick={handleGetStarted} className="w-full sm:w-auto px-8 py-4 bg-[#05c46b] hover:bg-[#04b05f] text-white text-lg font-bold rounded-xl transition-all shadow-lg shadow-[#05c46b]/25 hover:shadow-xl hover:shadow-[#05c46b]/40 hover:-translate-y-0.5">
                    Try Free
                  </button>
                  <button onClick={handleGetStarted} className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 text-lg font-bold rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 hover:-translate-y-0.5">
                    <Play className="w-5 h-5" /> Test Demo
                  </button>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.2 }}
                className="lg:col-span-5 relative mt-16 lg:mt-0 px-4 sm:px-0 z-10"
              >
                <div className="transform lg:scale-[1.15] xl:scale-[1.25] lg:translate-x-8 xl:translate-x-12 lg:origin-left">
                  {/* Floating Glow Behind Image */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-[#1db3cd] to-[#05c46b] rounded-3xl blur-3xl opacity-20 animate-pulse"></div>
                  
                  {/* Premium Browser Window Mockup */}
                  <motion.div 
                    animate={{ y: [0, -12, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    className="relative rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] bg-white border border-slate-200 overflow-hidden z-10"
                  >
                    {/* Browser Toolbar */}
                    <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center gap-2">
                      <div className="flex gap-1.5 shrink-0">
                        <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                      </div>
                      <div className="mx-auto bg-white border border-slate-200 rounded-md px-3 py-1 text-xs text-slate-500 font-mono w-full max-w-[240px] text-center overflow-hidden flex items-center justify-center gap-2 truncate shadow-sm">
                        <Globe className="w-3 h-3 shrink-0 text-slate-400" /> app.tripbone.com
                      </div>
                      <div className="w-[38px] shrink-0"></div> {/* Spacer for centering */}
                    </div>
                    
                    {/* Slideshow Content */}
                    <div className="relative aspect-[16/11] bg-slate-100 overflow-hidden">
                      <AnimatePresence mode="wait">
                        <motion.img
                          key={currentHeroImg % heroImages.length}
                          src={heroImages[currentHeroImg % heroImages.length]}
                          initial={{ opacity: 0, scale: 1.05 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.5 }}
                          className="absolute inset-0 w-full h-full object-cover object-top"
                          alt="Tripbone Platform"
                        />
                      </AnimatePresence>
                    </div>
                  </motion.div>
                  
                  {/* Floating Mobile Phone Mockup */}
                  <motion.div 
                    animate={{ y: [0, -15, 0] }}
                    transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                    className="absolute -bottom-12 -left-6 lg:-left-12 w-32 sm:w-40 lg:w-48 z-30"
                  >
                    <div className="relative rounded-[2.25rem] shadow-[0_20px_50px_rgba(0,0,0,0.4)] bg-black border-[6px] lg:border-[8px] border-black overflow-hidden aspect-[9/19.5]">
                      {/* Dynamic Island */}
                      <div className="absolute top-2 lg:top-3 inset-x-0 flex justify-center z-20">
                        <div className="w-[35%] h-[16px] lg:h-[20px] bg-black rounded-full flex items-center justify-between px-1.5 shadow-[inset_0_-1px_1px_rgba(255,255,255,0.15)]">
                          <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full bg-[#111] shadow-[inset_0_0_2px_rgba(255,255,255,0.2)]"></div>
                          <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full bg-[#0a0a2a] shadow-[inset_0_0_3px_rgba(100,150,255,0.3)]"></div>
                        </div>
                      </div>
                      <AnimatePresence mode="wait">
                        <motion.img 
                          key={currentHeroImg % mobileHeroImages.length}
                          src={mobileHeroImages[currentHeroImg % mobileHeroImages.length]} 
                          initial={{ opacity: 0, scale: 1.05 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.5 }}
                          alt="Mobile Preview" 
                          className="absolute inset-0 w-full h-full object-cover object-top z-10 rounded-[1.7rem]"
                        />
                      </AnimatePresence>
                    </div>
                  </motion.div>

                  {/* Floating Success Badge */}
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1, duration: 0.5 }}
                    className="absolute -bottom-8 -right-4 lg:-right-8 bg-white p-4 lg:p-5 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.12)] border border-slate-100 flex items-center gap-4 z-20 hidden sm:flex"
                  >
                    <div className="w-12 h-12 lg:w-14 lg:h-14 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                      <Check className="w-6 h-6 lg:w-7 lg:h-7 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm lg:text-base font-bold text-slate-900 whitespace-nowrap">Website Live</p>
                      <p className="text-xs lg:text-sm text-slate-500 whitespace-nowrap">Just now</p>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* 2. Logo Cloud */}
        <section className="pt-24 pb-24 bg-white relative z-10 px-6 border-b border-slate-100">
          <div className="max-w-7xl mx-auto">
            <div className="text-center relative">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-8">Trusted by:</p>
              
              <style>{`
                @keyframes marquee {
                  0% { transform: translateX(0); }
                  100% { transform: translateX(-50%); }
                }
                .animate-marquee {
                  display: flex;
                  width: max-content;
                  animation: marquee 30s linear infinite;
                }
                .animate-marquee:hover {
                  animation-play-state: paused;
                }
                .hide-scrollbar::-webkit-scrollbar {
                  display: none;
                }
                .hide-scrollbar {
                  -ms-overflow-style: none;
                  scrollbar-width: none;
                }
              `}</style>
              
              <div className="w-full overflow-hidden relative hide-scrollbar group opacity-70 hover:opacity-100 transition-opacity duration-500 max-w-6xl mx-auto">
                <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#f9fafb] to-transparent z-10 pointer-events-none"></div>
                <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#f9fafb] to-transparent z-10 pointer-events-none"></div>
                
                <div className="animate-marquee">
                  {[...logos, ...logos].map((logo, idx) => (
                    <div key={idx} className="flex-shrink-0 w-[150px] md:w-[200px] lg:w-[230px] flex items-center justify-center px-6">
                      <img src={logo.src} className="h-10 md:h-14 lg:h-16 object-contain max-w-full" alt={logo.alt} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Go Live in Just 5 Simple Steps */}
        <section className="py-32 bg-slate-50 border-b border-slate-200/50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-black text-slate-900">Go Live in Just 5 Simple Steps</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
              <div className="hidden md:block absolute top-[40px] left-[10%] right-[10%] h-1 bg-slate-200 z-0"></div>

              {/* Step 1 */}
              <div className="relative z-10 flex flex-col items-center text-center group">
                <div className="w-20 h-20 bg-white border-4 border-slate-200 text-slate-400 rounded-full flex items-center justify-center text-3xl font-black mb-6 group-hover:border-[#1db3cd] group-hover:text-[#1db3cd] transition-all duration-300 shadow-lg">1</div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Sign Up</h3>
                <p className="text-slate-500 text-sm">Create your free account instantly.</p>
              </div>

              {/* Step 2 */}
              <div className="relative z-10 flex flex-col items-center text-center group">
                <div className="w-20 h-20 bg-white border-4 border-slate-200 text-slate-400 rounded-full flex items-center justify-center text-3xl font-black mb-6 group-hover:border-[#1db3cd] group-hover:text-[#1db3cd] transition-all duration-300 shadow-lg">2</div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Tell Us About Your Company</h3>
                <p className="text-slate-500 text-sm">Describe your tours and destination.</p>
              </div>

              {/* Step 3 */}
              <div className="relative z-10 flex flex-col items-center text-center group">
                <div className="w-20 h-20 bg-white border-4 border-slate-200 text-slate-400 rounded-full flex items-center justify-center text-3xl font-black mb-6 group-hover:border-[#1db3cd] group-hover:text-[#1db3cd] transition-all duration-300 shadow-lg">3</div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Provisioning in 2 Minutes</h3>
                <p className="text-slate-500 text-sm">AI builds your entire website and booking engine.</p>
              </div>

              {/* Step 4 */}
              <div className="relative z-10 flex flex-col items-center text-center group">
                <div className="w-20 h-20 bg-white border-4 border-slate-200 text-slate-400 rounded-full flex items-center justify-center text-3xl font-black mb-6 group-hover:border-[#1db3cd] group-hover:text-[#1db3cd] transition-all duration-300 shadow-lg">4</div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Connect Your Domain</h3>
                <p className="text-slate-500 text-sm">Attach your custom domain effortlessly.</p>
              </div>

              {/* Step 5 */}
              <div className="relative z-10 flex flex-col items-center text-center group">
                <div className="w-20 h-20 bg-white border-4 border-slate-200 text-slate-400 rounded-full flex items-center justify-center text-3xl font-black mb-6 group-hover:border-[#05c46b] group-hover:text-[#05c46b] transition-all duration-300 shadow-lg">5</div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Website Live</h3>
                <p className="text-slate-500 text-sm">Start taking bookings and payments.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Showcase Section */}
        <section className="py-24 bg-[#f8fafc] border-b border-slate-200/50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-black mb-4 text-slate-900 tracking-tight">Live sites powered by Tripbone</h2>
              <p className="text-xl text-slate-500 max-w-2xl mx-auto">Explore how tour operators are transforming their digital presence and driving more sales.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                "https://i.ibb.co.com/99tvYdwv/image.png",
                "https://i.ibb.co.com/LzZYPvq3/image.png",
                "https://i.ibb.co.com/s9mtG824/image.png"
              ].map((img, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.2 }}
                  key={i} 
                  className="rounded-2xl overflow-hidden shadow-xl shadow-slate-200/50 border border-slate-200 bg-white group hover:shadow-2xl transition-all duration-300"
                >
                  <div className="w-full h-10 bg-slate-50 border-b border-slate-200 flex items-center px-4 gap-1.5 z-10 relative">
                    <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                    <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                    <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                  </div>
                  <div className="relative h-[450px] w-full overflow-hidden bg-slate-100">
                    <img 
                      src={img} 
                      alt={`Live site showcase ${i + 1}`} 
                      className="w-full absolute top-0 left-0 object-cover object-top transition-transform duration-[8s] ease-linear hover:-translate-y-[calc(100%-450px)] cursor-ns-resize" 
                    />
                  </div>
                </motion.div>
              ))}
            </div>
            
            <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/pricing"
                className="w-full sm:w-auto bg-[#1db3cd] text-white px-8 py-4 rounded-xl font-bold hover:bg-[#1596ad] hover:shadow-lg hover:shadow-[#1db3cd]/25 transition-all text-center flex items-center justify-center gap-2"
              >
                Try it Free
              </Link>
              <a
                href="https://demo.tripbone.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto bg-white text-slate-900 border-2 border-slate-200 px-8 py-4 rounded-xl font-bold hover:border-slate-900 transition-colors text-center flex items-center justify-center gap-2"
              >
                See it in Action <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </div>
        </section>

        {/* 5. Everything You Need to Run Your Tour Business */}
        <section className="py-32 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-black text-slate-900">Everything You Need to Run Your Tour Business</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: Layout, color: "text-blue-500", bg: "bg-blue-50", title: "AI Website Builder", desc: "Generate your complete website in minutes." },
                { icon: Map, color: "text-purple-500", bg: "bg-purple-50", title: "AI Tour Creator", desc: "Create professional tour pages instantly." },
                { icon: Sparkles, color: "text-amber-500", bg: "bg-amber-50", title: "Booking Engine", desc: "Online bookings with real-time availability." },
                { icon: CreditCard, color: "text-emerald-500", bg: "bg-emerald-50", title: "Online Payments", desc: "Stripe, PayPal, Bank Transfer and more." },
                { icon: MessageCircle, color: "text-[#05c46b]", bg: "bg-green-50", title: "WhatsApp Automation", desc: "Automatically notify customers instantly." },
                { icon: Mail, color: "text-rose-500", bg: "bg-rose-50", title: "Email Automation", desc: "Booking confirmations and reminders." },
                { icon: FileText, color: "text-indigo-500", bg: "bg-indigo-50", title: "SEO Content Generator", desc: "AI writes blogs that attract organic traffic." },
                { icon: BarChart, color: "text-cyan-500", bg: "bg-cyan-50", title: "Dashboard & Reports", desc: "Track bookings, revenue and customers." },
              ].map((feature, i) => (
                <div key={i} className="bg-slate-50 p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className={`w-14 h-14 rounded-2xl ${feature.bg} flex items-center justify-center mb-6`}>
                    <feature.icon className={`w-7 h-7 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{feature.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6. Why Tour Operators Choose Tripbone (Split Layout) */}
        <section className="py-32 bg-slate-50 border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-black text-slate-900">Why Tour Operators Choose Tripbone</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
              {/* Traditional Software */}
              <div className="bg-white border border-slate-200 rounded-3xl p-10 md:p-14 shadow-sm">
                <h3 className="text-2xl font-bold text-slate-500 mb-8 pb-6 border-b border-slate-100">Traditional Booking Software</h3>
                <ul className="space-y-6">
                  {[
                    "Build your own website",
                    "Install plugins",
                    "Configure hosting",
                    "Hire developers",
                    "Learn WordPress",
                    "Spend days setting up"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center text-lg text-slate-600 font-medium">
                      <X className="w-6 h-6 text-red-500 mr-4 shrink-0" /> {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tripbone */}
              <div className="bg-slate-900 rounded-3xl p-10 md:p-14 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#05c46b]/20 rounded-full blur-[80px] pointer-events-none"></div>
                <h3 className="text-3xl font-black text-white mb-8 pb-6 border-b border-slate-700">Tripbone</h3>
                <ul className="space-y-6 relative z-10">
                  {[
                    "AI builds everything",
                    "Website included",
                    "Booking engine included",
                    "Tour pages included",
                    "Marketing tools included",
                    "Live in 2 minutes"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center text-xl text-white font-bold">
                      <Check className="w-7 h-7 text-[#05c46b] mr-4 shrink-0" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 7. The 3 Superpowers */}
        <section className="py-32 bg-white border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">Everything you need to dominate your market.</h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">An instant agency in a box. From gorgeous mobile-first storefronts to AI-generated SEO blogs, we've got you covered.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="bg-slate-50 border border-slate-100 rounded-3xl p-10 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                <div className="w-16 h-16 bg-[#1db3cd]/10 rounded-2xl flex items-center justify-center mb-8">
                  <Sparkles className="w-8 h-8 text-[#1db3cd]" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">Instant Setup & AI</h3>
                <p className="text-slate-600 mb-6 leading-relaxed">Let AI write your tours, generate your SEO blog posts, and translate your site into 30+ languages automatically.</p>
                <ul className="space-y-3">
                  <li className="flex items-center text-sm font-medium text-slate-700"><Check className="w-4 h-4 text-[#1db3cd] mr-2" /> Live in 2 minutes</li>
                  <li className="flex items-center text-sm font-medium text-slate-700"><Check className="w-4 h-4 text-[#1db3cd] mr-2" /> Zero tech skills required</li>
                  <li className="flex items-center text-sm font-medium text-slate-700"><Check className="w-4 h-4 text-[#1db3cd] mr-2" /> Connect your own domain</li>
                </ul>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-3xl p-10 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-8">
                  <Globe className="w-8 h-8 text-purple-500" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">Built to Convert</h3>
                <p className="text-slate-600 mb-6 leading-relaxed">70% of bookings happen on phones. Your Tripbone site looks and feels like a native mobile app out of the box.</p>
                <ul className="space-y-3">
                  <li className="flex items-center text-sm font-medium text-slate-700"><Check className="w-4 h-4 text-purple-500 mr-2" /> Mobile-first app design</li>
                  <li className="flex items-center text-sm font-medium text-slate-700"><Check className="w-4 h-4 text-purple-500 mr-2" /> Gorgeous design capabilities</li>
                  <li className="flex items-center text-sm font-medium text-slate-700"><Check className="w-4 h-4 text-purple-500 mr-2" /> Lightning-fast SEO architecture</li>
                </ul>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-3xl p-10 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                <div className="w-16 h-16 bg-[#05c46b]/10 rounded-2xl flex items-center justify-center mb-8">
                  <MessageCircle className="w-8 h-8 text-[#05c46b]" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">Autopilot Operations</h3>
                <p className="text-slate-600 mb-6 leading-relaxed">Automate your entire back-office. Engage customers directly where they already are with native WhatsApp automation.</p>
                <ul className="space-y-3">
                  <li className="flex items-center text-sm font-medium text-slate-700"><Check className="w-4 h-4 text-[#05c46b] mr-2" /> WhatsApp ticket delivery</li>
                  <li className="flex items-center text-sm font-medium text-slate-700"><Check className="w-4 h-4 text-[#05c46b] mr-2" /> Automated review requests</li>
                  <li className="flex items-center text-sm font-medium text-slate-700"><Check className="w-4 h-4 text-[#05c46b] mr-2" /> Easy package & tiered pricing</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 8. Save Thousands in Development Costs */}
        <section className="py-32 bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[600px] bg-[#1db3cd]/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
          <div className="max-w-5xl mx-auto px-6 relative z-10 text-center">
            <h2 className="text-4xl md:text-5xl font-black mb-6">Save Thousands in Development Costs</h2>
            <p className="text-xl text-slate-400 mb-16">Instead of paying for...</p>
            
            <div className="flex flex-wrap justify-center gap-4 mb-20 opacity-60">
              {[
                "Website Designer", "WordPress Developer", "Booking Plugin", 
                "Hosting", "SEO Plugin", "Email Software", "WhatsApp Tool", "CRM"
              ].map((role, i) => (
                <span key={i} className="px-6 py-3 bg-slate-800 border border-slate-700 rounded-xl text-xl font-bold text-slate-400 line-through decoration-red-500 decoration-2">
                  {role}
                </span>
              ))}
            </div>

            <h3 className="text-4xl md:text-5xl font-black text-[#05c46b] mb-10">Use one platform instead.</h3>
            <button onClick={handleGetStarted} className="px-10 py-5 bg-white text-slate-900 text-xl font-bold rounded-xl transition-all shadow-xl hover:-translate-y-1">
              Get Tripbone
            </button>
          </div>
        </section>

        {/* 9. Metrics / Stats */}
        <section className="py-24 bg-white text-center">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-4xl font-bold mb-16 text-slate-900">Trusted by businesses worldwide</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div>
                <p className="text-6xl font-black text-[#1db3cd] mb-4">99.9%</p>
                <p className="text-lg text-slate-500 font-medium">Uptime Guarantee</p>
              </div>
              <div>
                <p className="text-6xl font-black text-[#1db3cd] mb-4">24/7</p>
                <p className="text-lg text-slate-500 font-medium">Expert Support</p>
              </div>
              <div>
                <p className="text-6xl font-black text-[#1db3cd] mb-4">0%</p>
                <p className="text-lg text-slate-500 font-medium">Commission Fees</p>
              </div>
            </div>
          </div>
        </section>

        {/* 10. Frequently Asked Questions */}
        <section className="py-32 bg-slate-50 border-t border-slate-200">
          <div className="max-w-3xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-black text-slate-900">Frequently Asked Questions</h2>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <button 
                    onClick={() => toggleFaq(i)}
                    className="w-full px-6 py-5 text-left flex justify-between items-center focus:outline-none"
                  >
                    <span className="font-bold text-lg text-slate-900 pr-4">{faq.q}</span>
                    {openFaq === i ? <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />}
                  </button>
                  <div className={`px-6 overflow-hidden transition-all duration-300 ${openFaq === i ? 'max-h-40 pb-6' : 'max-h-0'}`}>
                    <p className="text-slate-600 leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 11. Final CTA */}
        <section className="py-32 bg-slate-900 text-white relative overflow-hidden text-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(29,179,205,0.25),transparent_70%)] pointer-events-none" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#05c46b]/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#1db3cd]/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />
          <div className="max-w-3xl mx-auto px-6 relative z-10">
            <h2 className="text-5xl md:text-6xl font-bold mb-8 leading-tight">
              Ready to elevate your tour business?
            </h2>
            <p className="text-xl text-slate-400 mb-10 leading-relaxed">
              Join thousands of tour operators who have transformed their business with Tripbone. Start your free trial today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={handleGetStarted} className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-100 text-slate-900 text-lg font-bold rounded-full transition-all shadow-xl">
                Try for free
              </button>
              <button onClick={handleGetStarted} className="w-full sm:w-auto px-8 py-4 bg-transparent border border-slate-700 hover:bg-slate-800 text-white text-lg font-bold rounded-full transition-all">
                Contact sales
              </button>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
