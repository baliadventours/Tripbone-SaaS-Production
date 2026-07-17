import React from 'react';
import { Navigation, Calendar, MessageCircle, Truck, RefreshCw, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function OperationsFeatures() {
  return (
    <div className="pt-20 bg-white">
      {/* Hero Section */}
      <section className="py-24 px-6 relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-900/20 via-slate-950 to-slate-950"></div>
        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm font-semibold text-orange-300 mb-8 backdrop-blur-md">
            <Navigation className="w-4 h-4" />
            <span>Operations & Fleet</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight">
            Flawless Execution.
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-12">
            The desktop-first administrative cockpit engineered to navigate thousands of passenger operations effortlessly.
          </p>
          <img 
            src="https://i.ibb.co.com/Tx0Bpk4s/image.png" 
            alt="Dispatch Console" 
            className="rounded-[2rem] border border-white/10 shadow-2xl mx-auto max-w-5xl w-full object-cover"
          />
        </div>
      </section>

      {/* Feature 1: Dispatch Console */}
      <section className="py-24 px-6 border-b border-slate-100">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <div className="font-mono text-sm text-orange-600 font-bold mb-4">[ ADMINISTRATIVE RUNTIME ENGINE ]</div>
            <h2 className="text-4xl font-bold mb-6">Advanced Booking Dispatch</h2>
            <p className="text-lg text-slate-600 mb-8">
              An ultra-minimalist, desktop-optimized workspace displaying List, Timeline Daily Schedule, and Month Grid modes, featuring instant local state memory so you never lose your filters.
            </p>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-slate-700 font-medium"><Zap className="w-5 h-5 text-orange-500" /> Sub-Second Load Times for 1,000+ bookings</li>
              <li className="flex items-center gap-3 text-slate-700 font-medium"><Calendar className="w-5 h-5 text-orange-500" /> Multi-View Toggle: List, Daily, Monthly</li>
              <li className="flex items-center gap-3 text-slate-700 font-medium"><RefreshCw className="w-5 h-5 text-orange-500" /> Zero Double Work with LocalStorage View State</li>
            </ul>
          </motion.div>
          <div className="relative">
            <img src="https://i.ibb.co.com/FkNYsFxz/image.png" alt="Command Center" className="rounded-[2rem] shadow-2xl border-[8px] border-white w-full" />
          </div>
        </div>
      </section>

      {/* Feature 2: WhatsApp Automation */}
      <section className="py-24 px-6 bg-slate-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="relative order-2 lg:order-1">
            <img src="https://i.ibb.co.com/hxwx5pS1/IMG-2452.png" alt="WhatsApp Automation" className="rounded-[2rem] shadow-2xl border-[8px] border-white w-full max-w-sm mx-auto object-cover" />
          </div>
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="order-1 lg:order-2">
            <div className="font-mono text-sm text-orange-600 font-bold mb-4">[ SYNCHRONIZED BROADCAST v3.1 ]</div>
            <h2 className="text-4xl font-bold mb-6">WhatsApp Automation</h2>
            <p className="text-lg text-slate-600 mb-8">
              Keep your travelers and guides instantly aligned without typing a single word. Selecting a driver triggers an instant dispatch loop that briefs your team and your customer immediately.
            </p>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-slate-700 font-medium"><MessageCircle className="w-5 h-5 text-orange-500" /> Instant Guide Briefing sent to phone</li>
              <li className="flex items-center gap-3 text-slate-700 font-medium"><MessageCircle className="w-5 h-5 text-orange-500" /> Instant Traveler Alert & Pickup Confirmation</li>
              <li className="flex items-center gap-3 text-slate-700 font-medium"><Zap className="w-5 h-5 text-orange-500" /> Eliminate missed pickups entirely</li>
            </ul>
          </motion.div>
        </div>
      </section>

      {/* Feature 3: Asset Tracker & OTA Sync */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <div className="font-mono text-sm text-orange-600 font-bold mb-4">[ FLEET & INVENTORY MANAGER ]</div>
            <h2 className="text-4xl font-bold mb-6">Asset Tracking & OTA Sync</h2>
            <p className="text-lg text-slate-600 mb-8">
              Don't just assign guides—track your physical gear. Our integrated resource system monitors Jeeps, vans, and equipment to prevent overbooking. Combined with our Universal Channel Manager, your live inventory is perfectly synced with Viator, GetYourGuide, and Klook.
            </p>
            <div className="grid grid-cols-2 gap-6 mt-8">
              <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
                <Truck className="w-8 h-8 text-orange-500 mb-4" />
                <h4 className="font-bold mb-2">Fleet Management</h4>
                <p className="text-sm text-slate-500">Track vehicles and assets in real-time to avoid bottlenecks.</p>
              </div>
              <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
                <RefreshCw className="w-8 h-8 text-orange-500 mb-4" />
                <h4 className="font-bold mb-2">OTA Sync</h4>
                <p className="text-sm text-slate-500">2-way API synchronization prevents duplicate bookings across platforms.</p>
              </div>
            </div>
          </motion.div>
          <div className="relative">
            <img src="https://i.ibb.co.com/M58dD84y/IMG-2455.png" alt="Fleet Overview" className="rounded-[2rem] shadow-2xl border-[8px] border-white w-full max-w-sm mx-auto object-cover" />
          </div>
        </div>
      </section>

    </div>
  );
}
