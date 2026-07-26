import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from '@/src/lib/firebase';
import { Review } from '../../types';
import { Quote, Star, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useSettings } from '../../lib/SettingsContext';
import ExternalReviewsWidget from './ExternalReviewsWidget';

export default function ReviewSlider() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const { builderSettings, settings } = useSettings();

  const styleId = builderSettings?.blocks.find(b => b.id === 'reviews')?.design || 'slider';
  const maxDisplay = settings?.maxDisplayReviews ? Number(settings.maxDisplayReviews) : 6;

  useEffect(() => {
    const q = query(
      collection(db, 'reviews'),
      where('status', '==', 'approved')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Review));
      const sorted = data
        .sort((a: any, b: any) => {
          const timeA = a.createdAt?.seconds 
            ? a.createdAt.seconds * 1000 + (a.createdAt.nanoseconds || 0) / 1000000
            : (a.createdAt instanceof Date ? a.createdAt.getTime() : typeof a.createdAt === 'number' ? a.createdAt : 0);
          const timeB = b.createdAt?.seconds 
            ? b.createdAt.seconds * 1000 + (b.createdAt.nanoseconds || 0) / 1000000
            : (b.createdAt instanceof Date ? b.createdAt.getTime() : typeof b.createdAt === 'number' ? b.createdAt : 0);
          return timeB - timeA;
        });
      
      setReviews(sorted);
    });
    return unsubscribe;
  }, []);

  const filteredReviews = reviews.filter(r => {
    if (platformFilter === 'all') return true;
    return r.platform === platformFilter;
  });

  const renderPlatformBadge = (platform?: string) => {
    switch (platform) {
      case 'google':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
            <svg className="w-2.5 h-2.5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            Google Maps
          </span>
        );
      case 'tripadvisor':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 text-slate-900 font-black text-[7px] flex items-center justify-center">TA</span>
            TripAdvisor
          </span>
        );
      case 'airbnb':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
            Airbnb Guest
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-2.5 h-2.5 text-cyan-400" />
            Verified Guest
          </span>
        );
    }
  };

  return (
    <section className="container mx-auto px-4 py-16 lg:px-8 max-w-7xl">
      <div className="mb-8 text-center">
        <span className="text-primary text-xs font-black uppercase tracking-widest mb-2 block">Guest Experiences</span>
        <h2 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight leading-none">
          Trusted by Travelers Worldwide
        </h2>
      </div>

      {/* External Review Platforms Badge Bar */}
      <ExternalReviewsWidget
        activeFilter={platformFilter}
        onFilterChange={(filter) => {
          setPlatformFilter(prev => prev === filter ? 'all' : filter);
        }}
      />

      {/* Filter Tabs */}
      <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
        {[
          { id: 'all', label: 'All Reviews' },
          { id: 'google', label: 'Google Maps' },
          { id: 'tripadvisor', label: 'TripAdvisor' },
          { id: 'airbnb', label: 'Airbnb' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setPlatformFilter(tab.id)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              platformFilter === tab.id
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Reviews Grid */}
      <div className="grid md:grid-cols-3 gap-8">
        {(filteredReviews.length > 0 ? filteredReviews : reviews).slice(0, maxDisplay).map((review) => (
          <div key={review.id} className="bg-gray-950 rounded-2xl p-8 relative overflow-hidden shadow-2xl flex flex-col justify-between group hover:-translate-y-1 transition-transform border border-slate-800">
            <div className="absolute top-0 right-0 p-6 opacity-5">
              <Quote className="h-16 w-16 text-white" />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`h-3.5 w-3.5 ${i < (review.rating || 5) ? 'text-amber-400 fill-amber-400' : 'text-gray-800'}`} 
                    />
                  ))}
                </div>
                {renderPlatformBadge(review.platform)}
              </div>

              <p className="text-sm text-white/90 leading-relaxed mb-8 line-clamp-4 italic">
                "{review.comment}"
              </p>
            </div>

            <div className="flex items-center gap-4 pt-6 border-t border-white/10">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black text-sm border border-primary/20 overflow-hidden shrink-0">
                {review.userPhoto ? (
                  <img src={review.userPhoto} className="w-full h-full object-cover" alt={review.userName} />
                ) : (
                  review.userName?.charAt(0) || 'U'
                )}
              </div>
              <div className="min-w-0">
                <h4 className="text-white font-black text-sm tracking-wider truncate">{review.userName}</h4>
                <p className="text-gray-400 font-bold text-[10px] tracking-widest truncate">{review.nationality || 'Verified traveler'}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
