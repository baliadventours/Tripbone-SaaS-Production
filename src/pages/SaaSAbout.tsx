import React from 'react';

export default function SaaSAbout() {
  return (
    <div className="min-h-screen bg-white pt-32 pb-16">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h1 className="text-5xl font-black mb-8">About Tripbone</h1>
        <p className="text-xl text-gray-600 mb-8 leading-relaxed">
          Tripbone was built out of a simple frustration: tour operators deserve better tools. We saw amazing local tour guides struggling with messy WhatsApp chats, scattered Excel sheets, and overpriced web agencies.
        </p>
        <p className="text-xl text-gray-600 mb-8 leading-relaxed">
          Our mission is to democratize online booking. We provide an enterprise-grade platform that is as easy to use as your favorite social media app, ensuring you can focus on what you do best: giving travelers unforgettable experiences.
        </p>
        <div className="mt-16">
          <img 
            src="https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?auto=format&fit=crop&q=80&w=2000" 
            alt="Tripbone Team" 
            className="w-full h-80 object-cover rounded-3xl shadow-lg"
          />
        </div>
      </div>
    </div>
  );
}
