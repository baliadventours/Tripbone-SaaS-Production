import React from 'react';
import { Settings, Image, Bot, Globe } from 'lucide-react';

export default function SaaSFeatures() {
  return (
    <div className="min-h-screen bg-white pt-32 pb-16">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-black mb-4">Powerful Features</h1>
          <p className="text-xl text-gray-500">Everything you need to run a successful tour business online.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="p-8 border border-gray-100 rounded-3xl shadow-sm hover:shadow-md transition">
            <Globe className="w-12 h-12 text-[#1db3cd] mb-6" />
            <h3 className="text-2xl font-bold mb-4">Website Builder</h3>
            <p className="text-gray-600">Drag and drop premium components. Choose between multi-image hero sections, YouTube video backgrounds, and more. Connect your own custom domain.</p>
          </div>
          <div className="p-8 border border-gray-100 rounded-3xl shadow-sm hover:shadow-md transition">
            <Settings className="w-12 h-12 text-[#1db3cd] mb-6" />
            <h3 className="text-2xl font-bold mb-4">Seamless Booking Engine</h3>
            <p className="text-gray-600">Zero commission bookings. Accept credit cards globally with integrated payment gateways and handle custom pricing variations seamlessly.</p>
          </div>
          <div className="p-8 border border-gray-100 rounded-3xl shadow-sm hover:shadow-md transition">
            <Bot className="w-12 h-12 text-[#1db3cd] mb-6" />
            <h3 className="text-2xl font-bold mb-4">AI-Powered Superpowers</h3>
            <p className="text-gray-600">Let our AI generate your tour itineraries, blog posts, and smart translations instantly. Save hundreds of hours on content creation.</p>
          </div>
          <div className="p-8 border border-gray-100 rounded-3xl shadow-sm hover:shadow-md transition">
            <Image className="w-12 h-12 text-[#1db3cd] mb-6" />
            <h3 className="text-2xl font-bold mb-4">Unified Command Center</h3>
            <p className="text-gray-600">A dedicated dashboard to manage your staff, invoices, booking schedules, and review collection, all in one place.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
