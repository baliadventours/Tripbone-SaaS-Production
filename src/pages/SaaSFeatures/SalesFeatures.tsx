import React from 'react';
import { BriefcaseBusiness, Users, Zap, TrendingUp, CreditCard, MessageSquare, Star } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SalesFeatures() {
  return (
    <div className="pt-20 bg-white">
      {/* Hero Section */}
      <section className="py-24 px-6 relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-900/20 via-slate-950 to-slate-950"></div>
        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm font-semibold text-green-300 mb-8 backdrop-blur-md">
            <BriefcaseBusiness className="w-4 h-4" />
            <span>Sales & Marketing</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight">
            Scale Revenue Effortlessly.
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-12">
            Convert leads instantly, optimize pricing dynamically, and build massive social proof on autopilot.
          </p>
          <img 
            src="https://i.ibb.co.com/MqFL4jW/image.png" 
            alt="CRM Interface" 
            className="rounded-[2rem] border border-white/10 shadow-2xl mx-auto max-w-5xl w-full object-cover"
          />
        </div>
      </section>

      {/* Feature 1: Integrated CRM & WhatsApp */}
      <section className="py-24 px-6 border-b border-slate-100">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <div className="font-mono text-sm text-green-600 font-bold mb-4">[ HIGH-FIDELITY GUEST RELATION SYSTEM ]</div>
            <h2 className="text-4xl font-bold mb-6">Integrated CRM & Inbox</h2>
            <p className="text-lg text-slate-600 mb-8">
              Stop losing warm inquiries in messy emails. Handle deals and chats inside your primary operations tool. Our integrated CRM tracks all incoming leads, saves guest details, and connects directly to WhatsApp so you can reply instantly.
            </p>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-slate-700 font-medium"><Users className="w-5 h-5 text-green-500" /> Centralized Kanban Inbox for your entire team</li>
              <li className="flex items-center gap-3 text-slate-700 font-medium"><MessageSquare className="w-5 h-5 text-green-500" /> Direct WhatsApp messaging from the reservation card</li>
              <li className="flex items-center gap-3 text-slate-700 font-medium"><Zap className="w-5 h-5 text-green-500" /> Convert leads into bookings with a single click</li>
            </ul>
          </motion.div>
          <div className="relative">
            <img src="https://i.ibb.co.com/V0PsRmTM/image.png" alt="CRM Pipeline" className="rounded-[2rem] shadow-2xl border-[8px] border-white w-full" />
          </div>
        </div>
      </section>

      {/* Feature 2: Frictionless Checkout Funnel */}
      <section className="py-24 px-6 bg-slate-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="relative order-2 lg:order-1">
            <img src="https://i.ibb.co.com/kVMfQVSV/image.png" alt="Checkout Funnel" className="rounded-[2rem] shadow-2xl border-[8px] border-white w-full max-w-sm mx-auto object-cover" />
          </div>
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="order-1 lg:order-2">
            <div className="font-mono text-sm text-green-600 font-bold mb-4">[ SINGLE-PAGE TRANSACTION FUNNEL ]</div>
            <h2 className="text-4xl font-bold mb-6">Zero-Friction Checkout</h2>
            <p className="text-lg text-slate-600 mb-8">
              Go from exploring to fully booked in less than 30 seconds. Our single-page checkout flow removes forced account creations, confusing menus, and layout friction to secure payment immediately.
            </p>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-slate-700 font-medium"><CreditCard className="w-5 h-5 text-green-500" /> Instant dynamic pricing calculations & add-ons</li>
              <li className="flex items-center gap-3 text-slate-700 font-medium"><Zap className="w-5 h-5 text-green-500" /> 50% faster booking speed compared to standard systems</li>
              <li className="flex items-center gap-3 text-slate-700 font-medium"><TrendingUp className="w-5 h-5 text-green-500" /> Clean, high-converting one-tap pay UI</li>
            </ul>
          </motion.div>
        </div>
      </section>

      {/* Feature 3: Yield Pricing & Auto Reviews */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <div className="font-mono text-sm text-green-600 font-bold mb-4">[ GROWTH & REVENUE ENGINE ]</div>
            <h2 className="text-4xl font-bold mb-6">Dynamic Yield Pricing & Auto-Reviews</h2>
            <p className="text-lg text-slate-600 mb-8">
              Maximize your profit margin automatically. Tripbone's AI adjusts your tour prices based on demand, seasonality, and remaining capacity. Plus, exactly 2 hours after a tour ends, the system automatically collects a 5-star review from your guests and publishes it to your storefront.
            </p>
            <div className="grid grid-cols-2 gap-6 mt-8">
              <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
                <TrendingUp className="w-8 h-8 text-green-500 mb-4" />
                <h4 className="font-bold mb-2">Smart Pricing</h4>
                <p className="text-sm text-slate-500">Automatically bump prices 15% when you only have 2 seats left.</p>
              </div>
              <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
                <Star className="w-8 h-8 text-green-500 mb-4" />
                <h4 className="font-bold mb-2">Social Proof Sync</h4>
                <p className="text-sm text-slate-500">Auto-publish 5-star reviews to build massive credibility instantly.</p>
              </div>
            </div>
          </motion.div>
          <div className="relative">
            <img src="https://i.ibb.co.com/4nrMycfc/IMG-2453.png" alt="Revenue Analytics" className="rounded-[2rem] shadow-2xl border-[8px] border-white w-full max-w-sm mx-auto object-cover" />
          </div>
        </div>
      </section>

    </div>
  );
}
