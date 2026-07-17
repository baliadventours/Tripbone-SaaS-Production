import React, { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Compass, ChevronDown, Sparkles, Box, LayoutTemplate, BriefcaseBusiness, Globe, Bot, Navigation, ShieldCheck } from 'lucide-react';

export default function SaaSLayout() {
  const [isFeaturesOpen, setIsFeaturesOpen] = useState(false);

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

  return (
    <div className="min-h-screen font-sans selection:bg-[#1db3cd] selection:text-white bg-[#f8fafc] text-slate-900 overflow-x-hidden relative flex flex-col">
      
      {/* Header */}
      <header className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2.5 cursor-pointer">
              <Compass className="h-8 w-8 text-[#1db3cd]" />
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                Tripbone
              </span>
            </Link>

            <nav className="hidden lg:flex items-center space-x-8 text-sm font-semibold text-slate-600">
              
              {/* Features Dropdown */}
              <div 
                className="relative group"
                onMouseEnter={() => setIsFeaturesOpen(true)}
                onMouseLeave={() => setIsFeaturesOpen(false)}
              >
                <button className="flex items-center space-x-1 hover:text-[#1db3cd] transition-colors py-8">
                  <span>Features</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isFeaturesOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Mega Menu */}
                <div className={`absolute top-full left-0 w-[600px] bg-white rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] border border-slate-100 p-6 grid grid-cols-2 gap-6 transition-all duration-200 origin-top-left ${isFeaturesOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'}`}>
                  
                  {/* Category 1 */}
                  <Link to="/features/ai" className="group/item flex items-start space-x-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover/item:bg-blue-100 transition-colors">
                      <Sparkles className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 mb-1 group-hover/item:text-[#1db3cd] transition-colors">AI Superpowers</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">Tour Gen, Travel Planner, Chatbot, Global Translation.</p>
                    </div>
                  </Link>

                  {/* Category 2 */}
                  <Link to="/features/operations" className="group/item flex items-start space-x-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0 group-hover/item:bg-orange-100 transition-colors">
                      <Navigation className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 mb-1 group-hover/item:text-[#1db3cd] transition-colors">Operations & Fleet</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">Dispatch Console, WhatsApp, Asset Tracker, OTA Sync.</p>
                    </div>
                  </Link>

                  {/* Category 3 */}
                  <Link to="/features/sales" className="group/item flex items-start space-x-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0 group-hover/item:bg-green-100 transition-colors">
                      <BriefcaseBusiness className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 mb-1 group-hover/item:text-[#1db3cd] transition-colors">Sales & Marketing</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">CRM, Booking Flows, Dynamic Pricing, Reviews.</p>
                    </div>
                  </Link>

                  {/* Category 4 */}
                  <Link to="/features/design" className="group/item flex items-start space-x-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0 group-hover/item:bg-purple-100 transition-colors">
                      <LayoutTemplate className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 mb-1 group-hover/item:text-[#1db3cd] transition-colors">Web Design</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">Swiss UI, Mobile-First Checkout, Homepage Presets.</p>
                    </div>
                  </Link>

                  {/* Category 5 (Spans 2 columns) */}
                  <Link to="/features/infrastructure" className="group/item col-span-2 flex items-start space-x-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover/item:bg-slate-200 transition-colors">
                      <ShieldCheck className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 mb-1 group-hover/item:text-[#1db3cd] transition-colors">Infrastructure & Security</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">Self-Hosted, Zero Commission, Multi-Supplier Engine, Role-Based Access.</p>
                    </div>
                  </Link>

                </div>
              </div>

              <Link to="/pricing" className="hover:text-[#1db3cd] transition-colors py-8">Pricing</Link>
              <Link to="/about" className="hover:text-[#1db3cd] transition-colors py-8">Company</Link>
              <Link to="/contact" className="hover:text-[#1db3cd] transition-colors py-8">Contact</Link>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <button onClick={handleGetStarted} className="text-sm font-semibold text-slate-600 hover:text-[#1db3cd] transition-colors px-4 py-2">
              Log in
            </button>
            <button onClick={handleGetStarted} className="hidden md:flex bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold px-6 py-2.5 rounded-full transition-all shadow-sm">
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full relative">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 pt-20 pb-12 text-slate-400 border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center space-x-2.5 mb-6">
                <Compass className="h-8 w-8 text-[#1db3cd]" />
                <span className="text-2xl font-bold tracking-tight text-white">
                  Tripbone
                </span>
              </div>
              <p className="text-sm leading-relaxed mb-6">
                The ultimate all-in-one platform for tour operators. Drive sales, automate bookings, and scale your business.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-6">Solutions</h4>
              <ul className="space-y-4 text-sm">
                <li><Link to="/features/design" className="hover:text-white transition-colors">Website Builder</Link></li>
                <li><Link to="/features/sales" className="hover:text-white transition-colors">Booking Engine</Link></li>
                <li><Link to="/features/operations" className="hover:text-white transition-colors">Command Center</Link></li>
                <li><Link to="/features/ai" className="hover:text-white transition-colors">AI Superpowers</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6">Company</h4>
              <ul className="space-y-4 text-sm">
                <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><button onClick={handleGetStarted} className="hover:text-white transition-colors">Log In</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6">Legal</h4>
              <ul className="space-y-4 text-sm">
                <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link to="/cookies" className="hover:text-white transition-colors">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between">
            <p className="text-sm">&copy; {new Date().getFullYear()} Tripbone SaaS. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <span className="text-sm hover:text-white cursor-pointer transition-colors">Twitter</span>
              <span className="text-sm hover:text-white cursor-pointer transition-colors">LinkedIn</span>
              <span className="text-sm hover:text-white cursor-pointer transition-colors">Instagram</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
