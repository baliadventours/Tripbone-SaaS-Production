import React from 'react';
import { Mail, MessageSquare, MapPin } from 'lucide-react';

export default function SaaSContact() {
  return (
    <div className="min-h-screen bg-white pt-32 pb-16">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-black mb-4">Get in Touch</h1>
          <p className="text-xl text-gray-500">We're here to help you grow your tour business.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="text-center p-8 border border-gray-100 rounded-3xl">
            <Mail className="w-10 h-10 text-[#1db3cd] mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-2">Email Us</h3>
            <p className="text-gray-600">support@tripbone.com</p>
          </div>
          <div className="text-center p-8 border border-gray-100 rounded-3xl">
            <MessageSquare className="w-10 h-10 text-[#1db3cd] mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-2">WhatsApp Support</h3>
            <p className="text-gray-600">+1 234 567 8900</p>
          </div>
          <div className="text-center p-8 border border-gray-100 rounded-3xl">
            <MapPin className="w-10 h-10 text-[#1db3cd] mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-2">Office</h3>
            <p className="text-gray-600">123 Tourism Avenue, Bali</p>
          </div>
        </div>

        <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100">
          <h3 className="text-2xl font-bold mb-6 text-center">Send us a message</h3>
          <form className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder="Your Name" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#1db3cd]" />
              <input type="email" placeholder="Your Email" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#1db3cd]" />
            </div>
            <input type="text" placeholder="Subject" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#1db3cd]" />
            <textarea placeholder="Your Message" rows={5} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#1db3cd]"></textarea>
            <button type="submit" className="w-full py-4 bg-[#1db3cd] hover:bg-[#189bb3] text-white font-bold rounded-xl transition">Send Message</button>
          </form>
        </div>
      </div>
    </div>
  );
}
