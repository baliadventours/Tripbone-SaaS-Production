import React from 'react';
import { LayoutTemplate, Smartphone, MonitorSmartphone, Palette, CheckCircle, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DesignFeatures() {
  return (
    <div className="pt-20 bg-white">
      {/* Hero Section */}
      <section className="py-24 px-6 relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-slate-950 to-slate-950"></div>
        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm font-semibold text-purple-300 mb-8 backdrop-blur-md">
            <LayoutTemplate className="w-4 h-4" />
            <span>Web Design Engine</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight">
            Craftsmanship Over Defaults.
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-12">
            A stunning visual language that builds trust instantly. Mobile-first architecture and multi-style presets right out of the box.
          </p>
          <img 
            src="https://i.ibb.co.com/N6fXww79/image.png" 
            alt="Design Builder" 
            className="rounded-[2rem] border border-white/10 shadow-2xl mx-auto max-w-5xl w-full object-cover"
          />
        </div>
      </section>

      {/* Feature 1: Modern Swiss UI */}
      <section className="py-24 px-6 border-b border-slate-100">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <div className="font-mono text-sm text-purple-600 font-bold mb-4">[ SYSTEM FRAMEWORK CRITERIA • SWISS MODE ]</div>
            <h2 className="text-4xl font-bold mb-6">Modern Swiss UI Framework</h2>
            <p className="text-lg text-slate-600 mb-8">
              Cluttered travel systems look cheap and harm your brand. Tripbone is designed utilizing a Swiss-Modern layout, with high contrast, elegant typography pairings, and a focus on negative space over visual clutter.
            </p>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-slate-700 font-medium"><Palette className="w-5 h-5 text-purple-500" /> Immediate Brand Elevation: Look like a global brand</li>
              <li className="flex items-center gap-3 text-slate-700 font-medium"><CheckCircle className="w-5 h-5 text-purple-500" /> Calm & Focused Workspace for administrative stamina</li>
              <li className="flex items-center gap-3 text-slate-700 font-medium"><Zap className="w-5 h-5 text-purple-500" /> No unnecessary clutter or blinking alerts</li>
            </ul>
          </motion.div>
          <div className="relative">
            <img src="https://i.ibb.co.com/FkV496k6/image.png" alt="Swiss UI" className="rounded-[2rem] shadow-2xl border-[8px] border-white w-full" />
          </div>
        </div>
      </section>

      {/* Feature 2: Mobile First Design */}
      <section className="py-24 px-6 bg-slate-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="relative order-2 lg:order-1">
            <img src="https://i.ibb.co.com/3GCdFxL/image.png" alt="Mobile Checkout" className="rounded-[2rem] shadow-2xl border-[8px] border-white w-full max-w-sm mx-auto object-cover" />
          </div>
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="order-1 lg:order-2">
            <div className="font-mono text-sm text-purple-600 font-bold mb-4">[ RESPONSIVE TOUCH-TARGET INTERFACE ]</div>
            <h2 className="text-4xl font-bold mb-6">Mobile-First Architecture</h2>
            <p className="text-lg text-slate-600 mb-8">
              Over 80% of leisure bookings happen on mobile devices. Every interface on Tripbone is designed mobile-first from the ground up, with large touch targets, minimal typing, and instant checkout loops.
            </p>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-slate-700 font-medium"><Smartphone className="w-5 h-5 text-purple-500" /> Drop-off Prevention: Reduces mobile drop-offs by up to 45%</li>
              <li className="flex items-center gap-3 text-slate-700 font-medium"><MonitorSmartphone className="w-5 h-5 text-purple-500" /> Seamless responsive flows across all device sizes</li>
              <li className="flex items-center gap-3 text-slate-700 font-medium"><CheckCircle className="w-5 h-5 text-purple-500" /> One-tap invoicing via secure text payment links</li>
            </ul>
          </motion.div>
        </div>
      </section>

      {/* Feature 3: Homepage Presets */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <div className="font-mono text-sm text-purple-600 font-bold mb-4">[ BRAND SYSTEM SELECTOR MODULE ]</div>
            <h2 className="text-4xl font-bold mb-6">Multi-Style Homepage Presets</h2>
            <p className="text-lg text-slate-600 mb-8">
              Creating a high-converting website usually requires expensive agencies. Tripbone includes a curated collection of clean, functional homepage layouts that integrate with your booking engine instantly.
            </p>
            <div className="grid grid-cols-2 gap-6 mt-8">
              <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
                <Palette className="w-8 h-8 text-purple-500 mb-4" />
                <h4 className="font-bold mb-2">Zero Coding Required</h4>
                <p className="text-sm text-slate-500">Pick from Swiss Minimalist, Technical Dark Grid, or Bold Explorer styles.</p>
              </div>
              <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
                <Zap className="w-8 h-8 text-purple-500 mb-4" />
                <h4 className="font-bold mb-2">Lightning Fast</h4>
                <p className="text-sm text-slate-500">Optimized media loading hits a 95+ score on Google Lighthouse.</p>
              </div>
            </div>
          </motion.div>
          <div className="relative">
            <img src="https://i.ibb.co.com/VYwm826K/image.png" alt="Homepage Presets" className="rounded-[2rem] shadow-2xl border-[8px] border-white w-full" />
          </div>
        </div>
      </section>

    </div>
  );
}
