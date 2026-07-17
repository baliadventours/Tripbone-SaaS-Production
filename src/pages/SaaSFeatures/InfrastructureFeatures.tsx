import React from 'react';
import { ShieldCheck, Network, Lock, DollarSign, Database, Server } from 'lucide-react';
import { motion } from 'framer-motion';

export default function InfrastructureFeatures() {
  return (
    <div className="pt-20 bg-white">
      {/* Hero Section */}
      <section className="py-24 px-6 relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-950 to-slate-950"></div>
        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm font-semibold text-slate-300 mb-8 backdrop-blur-md">
            <ShieldCheck className="w-4 h-4" />
            <span>Infrastructure & Security</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight">
            Own Your Platform.
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-12">
            Full control over your data, zero transaction commission fees, and lifetime system ownership.
          </p>
          <img 
            src="https://i.ibb.co.com/B5dnFVb4/Software-dashboard-UI-mockup-202605262231.jpg" 
            alt="Infrastructure Dashboard" 
            className="rounded-[2rem] border border-white/10 shadow-2xl mx-auto max-w-5xl w-full object-cover"
          />
        </div>
      </section>

      {/* Feature 1: Self-Hosted Infrastructure */}
      <section className="py-24 px-6 border-b border-slate-100">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <div className="font-mono text-sm text-slate-500 font-bold mb-4">[ SELF-ARCHIVE ENVIRONMENT CRITERIA ]</div>
            <h2 className="text-4xl font-bold mb-6 text-slate-900">Self-Hosted System Infrastructure</h2>
            <p className="text-lg text-slate-600 mb-8">
              Cloud-hosted booking platforms charge up to 6% in commission on every single booking, eating into your hard-earned margins. Tripbone offers a completely self-hosted, cloud-native backend. You own your source code and keep 100% of your booking revenues.
            </p>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-slate-700 font-medium"><Server className="w-5 h-5 text-slate-600" /> Cloud Native Deployment (AWS, GCP, Vercel)</li>
              <li className="flex items-center gap-3 text-slate-700 font-medium"><DollarSign className="w-5 h-5 text-slate-600" /> Fee-Free Stripe Integration (Funds route direct to your bank)</li>
              <li className="flex items-center gap-3 text-slate-700 font-medium"><Lock className="w-5 h-5 text-slate-600" /> Complete Data Security & Database Independence</li>
            </ul>
          </motion.div>
          <div className="relative">
            <img src="https://i.ibb.co.com/9m1tFfW8/image.png" alt="Self-Hosted Architecture" className="rounded-[2rem] shadow-2xl border-[8px] border-white w-full" />
          </div>
        </div>
      </section>

      {/* Feature 2: Multi-Supplier Engine */}
      <section className="py-24 px-6 bg-slate-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="relative order-2 lg:order-1">
            <img src="https://i.ibb.co.com/pjk8TdWP/image.png" alt="Network Ledger" className="rounded-[2rem] shadow-2xl border-[8px] border-white w-full max-w-sm mx-auto object-cover" />
          </div>
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="order-1 lg:order-2">
            <div className="font-mono text-sm text-slate-500 font-bold mb-4">[ COOPERATIVE NETWORK LEDGER v1.8 ]</div>
            <h2 className="text-4xl font-bold mb-6 text-slate-900">Multi-Supplier & Agent Network</h2>
            <p className="text-lg text-slate-600 mb-8">
              Scale your distribution channels by allowing agents and sub-suppliers to submit bookings independently. Separate portal permissions ensure agents can book directly into your system, while you handle payouts and deposit tracking automatically.
            </p>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-slate-700 font-medium"><Network className="w-5 h-5 text-slate-600" /> Dedicated Agent Portals with custom commissions</li>
              <li className="flex items-center gap-3 text-slate-700 font-medium"><Database className="w-5 h-5 text-slate-600" /> Unified Settlement Ledger for easy financial auditing</li>
              <li className="flex items-center gap-3 text-slate-700 font-medium"><ShieldCheck className="w-5 h-5 text-slate-600" /> Isolated Supplier accounts to protect proprietary data</li>
            </ul>
          </motion.div>
        </div>
      </section>

    </div>
  );
}
