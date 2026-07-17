import React from 'react';
import { Sparkles, Bot, Globe, Wand2, Zap, LayoutTemplate } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AIFeatures() {
  return (
    <div className="pt-20 bg-white">
      {/* Hero Section */}
      <section className="py-24 px-6 relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950"></div>
        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm font-semibold text-blue-300 mb-8 backdrop-blur-md">
            <Sparkles className="w-4 h-4" />
            <span>AI Superpowers</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight">
            Automate the Impossible.
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-12">
            Create comprehensive, customized itineraries in seconds. Qualify leads while you sleep. Translate your entire storefront instantly.
          </p>
          <img 
            src="https://i.ibb.co.com/4nF2mvyr/AIgenerated.png" 
            alt="AI Interface" 
            className="rounded-[2rem] border border-white/10 shadow-2xl mx-auto max-w-5xl w-full object-cover"
          />
        </div>
      </section>

      {/* Feature 1: AI Tour Generation */}
      <section className="py-24 px-6 border-b border-slate-100">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <h2 className="text-4xl font-bold mb-6">Create Custom Packages in Seconds</h2>
            <p className="text-lg text-slate-600 mb-8">
              Stop spending hours researching, formatting, and pricing custom itineraries. With our AI, you just type in a quick description (like "3-day romantic honeymoon in East Bali") and it instantly drafts a complete, day-by-day itinerary that's ready to sell.
            </p>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-slate-700 font-medium"><Zap className="w-5 h-5 text-blue-500" /> Draft custom quotes 7x faster</li>
              <li className="flex items-center gap-3 text-slate-700 font-medium"><LayoutTemplate className="w-5 h-5 text-blue-500" /> Publish directly to your live website with one click</li>
              <li className="flex items-center gap-3 text-slate-700 font-medium"><ShieldCheck className="w-5 h-5 text-blue-500" /> Say goodbye to manual typos and pricing mistakes</li>
            </ul>
          </motion.div>
          <div className="relative">
            <img src="https://i.ibb.co.com/KzWryQqz/image.png" alt="Tour Generator" className="rounded-[2rem] shadow-2xl border-[8px] border-white w-full object-cover" />
          </div>
        </div>
      </section>

      {/* Feature 2: Inbound Lead Converter */}
      <section className="py-24 px-6 bg-slate-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="relative order-2 lg:order-1">
            <img src="https://i.ibb.co.com/VYwm826K/image.png" alt="Travel Planner" className="rounded-[2rem] shadow-2xl border-[8px] border-white w-full object-cover" />
          </div>
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="order-1 lg:order-2">
            <h2 className="text-4xl font-bold mb-6">Your Personal Travel Planner</h2>
            <p className="text-lg text-slate-600 mb-8">
              Give your website visitors their own personal travel planner. Travelers can design their dream vacation right on your site, and as soon as they save it, their details and itinerary are sent straight to you as a hot, ready-to-book lead.
            </p>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-slate-700 font-medium"><Zap className="w-5 h-5 text-blue-500" /> Turn casual website browsers into targeted leads</li>
              <li className="flex items-center gap-3 text-slate-700 font-medium"><Bot className="w-5 h-5 text-blue-500" /> Beautiful trip maps and visual daily schedules</li>
              <li className="flex items-center gap-3 text-slate-700 font-medium"><ShieldCheck className="w-5 h-5 text-blue-500" /> Proven to boost your closing rates by 35%</li>
            </ul>
          </motion.div>
        </div>
      </section>

      {/* Feature 3: Live Chatbot & Translation */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <h2 className="text-4xl font-bold mb-6">24/7 Chatbot & Translation</h2>
            <p className="text-lg text-slate-600 mb-8">
              Never miss a booking because you were asleep. Our chatbot connects directly to your calendar to check availability, answer questions, and help customers check out 24/7. Plus, our automatic translation feature instantly switches your website into your visitor's native language.
            </p>
            <div className="grid grid-cols-2 gap-6 mt-8">
              <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
                <Bot className="w-8 h-8 text-blue-500 mb-4" />
                <h4 className="font-bold mb-2">Live Answers</h4>
                <p className="text-sm text-slate-500">"Yes, we have 4 spots left for the Sunrise Tour tomorrow."</p>
              </div>
              <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
                <Globe className="w-8 h-8 text-blue-500 mb-4" />
                <h4 className="font-bold mb-2">Global Reach</h4>
                <p className="text-sm text-slate-500">Instantly speak your customer's language and show their currency.</p>
              </div>
            </div>
          </motion.div>
          <div className="relative">
            <img src="https://i.ibb.co.com/0gBfXtC/image.png" alt="Chatbot Interface" className="rounded-[2rem] shadow-2xl border-[8px] border-white w-full object-cover" />
          </div>
        </div>
      </section>

    </div>
  );
}

// Temporary component mock since it's not imported top-level
const ShieldCheck = ({className}: {className?: string}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>
);
