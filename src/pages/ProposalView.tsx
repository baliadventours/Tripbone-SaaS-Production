import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db, doc, getDoc } from '../lib/firebase';
import { 
  Printer, 
  Share2, 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  Users, 
  Globe, 
  Clock, 
  Sparkles, 
  Phone, 
  Mail, 
  ExternalLink, 
  ShieldCheck, 
  Check, 
  Loader2, 
  Building2,
  Copy,
  MessageCircle,
  FileText
} from 'lucide-react';

interface ProposalData {
  id?: string;
  proposalTitle?: string;
  guestName?: string;
  paxCount?: number;
  adultsCount?: number;
  childrenCount?: number;
  paxBreakdown?: string;
  durationDays?: number;
  nationality?: string;
  currency?: string;
  totalPrice?: number;
  welcomeMessage?: string;
  closingNotes?: string;
  itineraryNarrative?: Array<{
    dayNumber: number;
    title: string;
    summary: string;
  }>;
  selectedItems?: Array<{
    id: string;
    name: string;
    type: string;
    day: number;
  }>;
  dayInclusions?: Record<number, string[]>;
  dayExclusions?: Record<number, string[]>;
  inclusions?: string[];
  exclusions?: string[];
  termsAndConditions?: string[];
  companyName?: string;
  companyLogo?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyAddress?: string;
  companyWebsite?: string;
  createdAt?: any;
}

export default function ProposalView() {
  const { id } = useParams<{ id: string }>();
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    async function fetchProposal() {
      if (!id) {
        setError('No proposal ID provided in URL');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const docRef = doc(db, 'proposals', id);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          setProposal({ id: snap.id, ...snap.data() } as ProposalData);
        } else {
          setError('The requested tour proposal could not be found or has expired.');
        }
      } catch (err: any) {
        console.error('Error loading proposal:', err);
        setError(err.message || 'Failed to load proposal document.');
      } finally {
        setLoading(false);
      }
    }

    fetchProposal();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleWhatsAppInquiry = () => {
    if (!proposal) return;
    const phone = (proposal.companyPhone || '+6281234567890').replace(/[^0-9+]/g, '');
    const text = encodeURIComponent(
      `Hello ${proposal.companyName || 'Team'}! I reviewed the official proposal "${proposal.proposalTitle || 'Tour Proposal'}" (Ref: ${proposal.id || ''}) for ${proposal.guestName || 'our trip'}.\n\nI would like to proceed with booking or have a few questions. Please guide me!`
    );
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center animate-bounce">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          </div>
          <p className="text-sm font-bold text-slate-300">Loading your interactive tour proposal...</p>
        </div>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-slate-800/90 border border-slate-700/80 p-8 rounded-3xl shadow-2xl space-y-5">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mx-auto">
            <FileText className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold">Proposal Unavailable</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            {error || 'This proposal link appears to be invalid or has been removed.'}
          </p>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition-all shadow-lg"
            >
              <span>Return to Home</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const p = proposal;
  const companyName = p.companyName || 'Smart Bali Tours & Travel';
  const companyEmail = p.companyEmail || 'info@smartbalitours.com';
  const companyPhone = p.companyPhone || '+62 812-3456-7890';
  const companyWebsite = p.companyWebsite || 'www.smartbalitours.com';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-orange-500 selection:text-white pb-20">
      
      {/* Top Floating Action Bar (Hidden when printing) */}
      <div className="no-print sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 py-3.5 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white font-black text-xs shadow-md">
              TP
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-extrabold text-white truncate max-w-[220px] sm:max-w-md">
                {p.proposalTitle || 'Tour Proposal'}
              </h1>
              <p className="text-[11px] text-slate-400">Prepared for <strong className="text-slate-200">{p.guestName || 'Valued Guest'}</strong></p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={handleCopyLink}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center space-x-1.5 transition-all border border-slate-700 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-orange-400" />
              <span>{copiedLink ? 'Copied Link!' : 'Share Link'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center space-x-1.5 transition-all border border-slate-700 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-orange-400" />
              <span className="hidden sm:inline">Print / PDF</span>
            </button>

            <button
              onClick={handleWhatsAppInquiry}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center space-x-2 transition-all shadow-lg shadow-emerald-950/50 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-white text-emerald-600" />
              <span>Accept & Book via WhatsApp</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Proposal Container (Optimized for standard display and A4 Print) */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10">
        <div className="bg-slate-900 border border-slate-800/90 rounded-3xl shadow-2xl overflow-hidden print:bg-white print:text-slate-900 print:border-none print:shadow-none print:p-0">
          
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 p-8 sm:p-12 text-white relative overflow-hidden print:bg-orange-600 print:text-white">
            <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-black/20 backdrop-blur-xs text-[11px] font-black uppercase tracking-wider text-orange-100 mb-3 border border-white/15">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>Official Tour Proposal</span>
                </div>
                <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight text-white mb-2">
                  {p.proposalTitle || 'Customized Bali Itinerary'}
                </h1>
                <p className="text-sm sm:text-base text-orange-100 font-medium">
                  Prepared exclusively for <strong className="text-white underline decoration-amber-300 underline-offset-4">{p.guestName || 'Valued Guest'}</strong>
                </p>
              </div>

              {p.companyLogo ? (
                <img 
                  src={p.companyLogo} 
                  alt={companyName} 
                  className="h-16 w-auto object-contain bg-white/10 p-2 rounded-2xl backdrop-blur-xs border border-white/20 shadow-md self-start sm:self-auto" 
                />
              ) : (
                <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl text-right self-start sm:self-auto">
                  <div className="text-base font-black text-white">{companyName}</div>
                  <div className="text-xs text-orange-100">{companyWebsite}</div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-800 bg-slate-900/90 border-b border-slate-800 text-xs sm:text-sm print:bg-slate-50 print:divide-slate-200 print:border-slate-200">
            <div className="p-4 sm:p-5 flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pax Count</div>
                <div className="font-extrabold text-white print:text-slate-900">
                  {p.paxBreakdown || (p.adultsCount ? `${p.adultsCount} Adult${p.adultsCount !== 1 ? 's' : ''}${p.childrenCount ? `, ${p.childrenCount} Child${p.childrenCount !== 1 ? 'ren' : ''}` : ''}` : `${p.paxCount || 1} Person(s)`)}
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Duration</div>
                <div className="font-extrabold text-white print:text-slate-900">{p.durationDays || 1} Day(s)</div>
              </div>
            </div>

            <div className="p-4 sm:p-5 flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nationality</div>
                <div className="font-extrabold text-white print:text-slate-900">{p.nationality || 'International'}</div>
              </div>
            </div>

            <div className="p-4 sm:p-5 flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Investment</div>
                <div className="font-black text-emerald-400 print:text-emerald-700 text-sm sm:text-base">
                  {p.currency || 'IDR'} {Number(p.totalPrice || 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-10 space-y-10">
            
            {/* Welcome Note */}
            {p.welcomeMessage && (
              <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900 border border-slate-800 border-l-4 border-l-orange-500 shadow-sm print:bg-slate-50 print:border-slate-200">
                <h3 className="text-xs font-black uppercase tracking-wider text-orange-400 mb-2">Welcome Message</h3>
                <p className="text-sm sm:text-base text-slate-300 print:text-slate-800 leading-relaxed italic">
                  "{p.welcomeMessage}"
                </p>
              </div>
            )}

            {/* Day-by-Day Itinerary Narrative */}
            {p.itineraryNarrative && p.itineraryNarrative.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h2 className="text-lg font-black text-white print:text-slate-900 uppercase tracking-tight flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-orange-500" />
                    <span>Day-by-Day Detailed Itinerary</span>
                  </h2>
                  <span className="text-xs font-bold text-slate-400">{p.itineraryNarrative.length} Days Planned</span>
                </div>

                <div className="space-y-6">
                  {p.itineraryNarrative.map((day) => {
                    const dayLogistics = (p.selectedItems || []).filter(i => i.day === day.dayNumber);

                    return (
                      <div 
                        key={day.dayNumber}
                        className="p-6 rounded-2xl bg-slate-800/40 border border-slate-800 hover:border-slate-700 transition-all space-y-4 print:bg-slate-50 print:border-slate-200"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3 print:border-slate-200">
                          <div className="flex items-center space-x-3">
                            <span className="px-3 py-1 rounded-lg bg-orange-600 text-white font-black text-xs uppercase tracking-wider">
                              DAY {day.dayNumber}
                            </span>
                            <h3 className="text-base font-extrabold text-white print:text-slate-900">
                              {day.title || `Day ${day.dayNumber}`}
                            </h3>
                          </div>
                        </div>

                        {day.summary && (
                          <p className="text-sm text-slate-300 print:text-slate-700 leading-relaxed">
                            {day.summary}
                          </p>
                        )}

                        {dayLogistics.length > 0 && (
                          <div className="pt-2">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                              Scheduled Activities & Logistics
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {dayLogistics.map((item, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold bg-slate-800 text-slate-200 border border-slate-700/80 print:bg-white print:border-slate-300 print:text-slate-800"
                                >
                                  <Check className="w-3 h-3 text-orange-400 mr-1.5" />
                                  {item.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Inclusions & Exclusions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Inclusions */}
              <div className="p-6 rounded-2xl bg-emerald-950/20 border border-emerald-900/50 space-y-3 print:bg-emerald-50 print:border-emerald-200">
                <div className="flex items-center space-x-2 text-emerald-400 print:text-emerald-800 font-black text-sm uppercase tracking-wider">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Package Inclusions</span>
                </div>
                <ul className="space-y-2 text-xs sm:text-sm text-emerald-200 print:text-emerald-900">
                  {p.inclusions && p.inclusions.length > 0 ? (
                    p.inclusions.map((inc, i) => (
                      <li key={i} className="flex items-start space-x-2">
                        <span className="text-emerald-400 font-bold shrink-0">✓</span>
                        <span>{inc}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-slate-400 italic">Included as specified in day-by-day itinerary.</li>
                  )}
                </ul>
              </div>

              {/* Exclusions */}
              <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-900/50 space-y-3 print:bg-rose-50 print:border-rose-200">
                <div className="flex items-center space-x-2 text-rose-400 print:text-rose-800 font-black text-sm uppercase tracking-wider">
                  <XCircle className="w-5 h-5" />
                  <span>Package Exclusions</span>
                </div>
                <ul className="space-y-2 text-xs sm:text-sm text-rose-200 print:text-rose-900">
                  {p.exclusions && p.exclusions.length > 0 ? (
                    p.exclusions.map((exc, i) => (
                      <li key={i} className="flex items-start space-x-2">
                        <span className="text-rose-400 font-bold shrink-0">✕</span>
                        <span>{exc}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-slate-400 italic">Personal expenses, flight tickets, and extra tipping.</li>
                  )}
                </ul>
              </div>

            </div>

            {/* Total Price Card */}
            <div className="p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-amber-500/30 text-center space-y-3 shadow-xl print:bg-slate-100 print:border-slate-300">
              <div className="text-xs font-black uppercase tracking-widest text-amber-400">Total All-Inclusive Package Price</div>
              <div className="text-3xl sm:text-5xl font-black text-white print:text-slate-900 tracking-tight">
                {p.currency || 'IDR'} {Number(p.totalPrice || 0).toLocaleString()}
              </div>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Includes private vehicle charters, fuel, driver allowance, entrance tickets, tax & service charges.
              </p>
            </div>

            {/* Terms and Conditions */}
            {p.termsAndConditions && p.termsAndConditions.length > 0 && (
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 print:bg-slate-50 print:border-slate-200">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Terms & Booking Conditions</h3>
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-300 print:text-slate-700">
                  {p.termsAndConditions.map((term, i) => (
                    <li key={i}>{term}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* Closing Notes */}
            {p.closingNotes && (
              <div className="text-center py-4">
                <p className="text-sm font-medium italic text-slate-400 print:text-slate-600">
                  "{p.closingNotes}"
                </p>
              </div>
            )}

            {/* Footer Branding & Contact Info */}
            <div className="pt-8 border-t border-slate-800 print:border-slate-300 text-center space-y-3">
              <h4 className="text-base font-black text-white print:text-slate-900">{companyName}</h4>
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400 print:text-slate-700">
                <span className="flex items-center space-x-1">
                  <Mail className="w-3.5 h-3.5 text-orange-400" />
                  <span>{companyEmail}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Phone className="w-3.5 h-3.5 text-orange-400" />
                  <span>{companyPhone}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Globe className="w-3.5 h-3.5 text-orange-400" />
                  <span>{companyWebsite}</span>
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}
