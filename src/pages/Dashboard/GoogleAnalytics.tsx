import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  CheckCircle2, 
  RefreshCw, 
  Database, 
  Code, 
  Copy, 
  ExternalLink,
  HelpCircle,
  BarChart2,
  ShieldCheck,
  Zap,
  Globe,
  Radio
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  getGAMeasurementId, 
  getGACustomScript,
  updateTenantGA,
  trackGAEvent, 
  recordedGAEvents,
  extractMeasurementId
} from '../../lib/googleAnalytics';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc } from '@/src/lib/firebase';
import { useTenant } from '../../lib/TenantContext';

export default function GoogleAnalytics() {
  const { tenantId } = useTenant();
  const [measurementId, setMeasurementId] = useState(getGAMeasurementId());
  const [customScript, setCustomScript] = useState(getGACustomScript());
  const [newId, setNewId] = useState(measurementId);
  const [newScript, setNewScript] = useState(customScript);
  const [liveEvents, setLiveEvents] = useState<typeof recordedGAEvents>([]);
  const [currentTestEventName, setCurrentTestEventName] = useState('page_view_test');
  const [currentTestEventLabel, setCurrentTestEventLabel] = useState('Production Verification Test');
  const [successMessage, setSuccessMessage] = useState('');
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);

  // Load analytics configuration from Cloud database for active tenant
  useEffect(() => {
    const fetchRemoteSettings = async () => {
      try {
        const settingsDocId = tenantId || 'general';
        const docRef = doc(db, 'settings', settingsDocId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          const remoteId = data.gaMeasurementId || data.measurementId || '';
          const remoteScript = data.gaCustomScript || data.customScript || '';
          
          setMeasurementId(remoteId);
          setNewId(remoteId);
          setCustomScript(remoteScript);
          setNewScript(remoteScript);
          
          updateTenantGA(tenantId, remoteId, remoteScript);
        } else {
          setMeasurementId('');
          setNewId('');
          setCustomScript('');
          setNewScript('');
          updateTenantGA(tenantId, '', '');
        }
      } catch (err) {
        console.warn('[Analytics settings] Failed to sync remote cloud configs:', err);
      } finally {
        setLoadingConfig(false);
      }
    };
    fetchRemoteSettings();
  }, [tenantId]);

  // Listen for real client-side events captured on the live site
  useEffect(() => {
    setLiveEvents([...recordedGAEvents]);
    
    const handleGAEvent = () => {
      setLiveEvents([...recordedGAEvents]);
    };
    
    window.addEventListener('ga-event-logged', handleGAEvent);

    return () => {
      window.removeEventListener('ga-event-logged', handleGAEvent);
    };
  }, []);

  const handleSaveId = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanScript = newScript.trim();
    let cleanId = newId.trim().toUpperCase();

    // Auto extract ID if not specified in text input but found in script snippet
    if (!cleanId && cleanScript) {
      cleanId = extractMeasurementId(cleanScript);
    }

    // 1. Always update runtime state for this tenant immediately
    updateTenantGA(tenantId, cleanId, cleanScript);
    
    setMeasurementId(cleanId);
    setCustomScript(cleanScript);
    setNewId(cleanId);

    // 2. Persist to Cloud Firestore for this tenant
    try {
      const settingsDocId = tenantId || 'general';
      const docRef = doc(db, 'settings', settingsDocId);
      await setDoc(docRef, {
        gaMeasurementId: cleanId,
        gaCustomScript: cleanScript,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (cloudErr) {
      console.warn('[Google Analytics] Cloud database sync notice:', cloudErr);
    }

    setSuccessMessage('Google Analytics tracking deployed to production live!');
    setTimeout(() => setSuccessMessage(''), 5000);

    if (cleanId) {
      trackGAEvent('update_measurement_id', 'admin', cleanId);
    }
  };

  const handleTriggerTestEvent = () => {
    trackGAEvent(currentTestEventName, 'production_test', currentTestEventLabel, 1);
    setSuccessMessage(`Test event "${currentTestEventName}" fired successfully! Check Google Analytics Realtime/DebugView.`);
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  const handleCopyCode = (code: string, label: string) => {
    navigator.clipboard.writeText(code);
    setCopiedTemplate(label);
    setTimeout(() => setCopiedTemplate(null), 3000);
  };

  const sampleGtagScript = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=YOUR_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'YOUR_MEASUREMENT_ID');
</script>`;

  const sampleGtmScript = `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-XXXXXXX');</script>
<!-- End Google Tag Manager -->`;

  const isConfigured = Boolean(measurementId || customScript);

  return (
    <div className="space-y-8 animate-fadeIn text-left max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-3 py-1 text-xs font-black rounded-full flex items-center gap-1.5 border ${
              isConfigured 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              {isConfigured ? 'Tracking Active in Production' : 'Setup Required for Production'}
            </span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Google Analytics Integration</h1>
          <p className="text-sm font-medium text-gray-500 mt-1 max-w-3xl">
            Embed your official Google Analytics 4 (GA4) or Google Tag Manager tracking snippet to monitor live visitor traffic, pageviews, and bookings directly on your Google Analytics Dashboard.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://analytics.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:text-gray-900 shadow-sm transition-all"
          >
            <ExternalLink className="h-4 w-4 text-orange-600" />
            Open Google Analytics Dashboard
          </a>
        </div>
      </div>

      {/* Success Banner */}
      <AnimatePresence>
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs px-4 py-3.5 rounded-xl flex items-center justify-between shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span className="font-bold">{successMessage}</span>
            </div>
            <button 
              onClick={() => setSuccessMessage('')}
              className="text-xs text-emerald-700 hover:text-emerald-950 font-bold underline"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid: Configuration + Setup Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Config Panel */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-orange-50 rounded-xl text-primary">
                  <Settings className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-black text-gray-900 text-lg">Embed Code & Measurement ID</h2>
                  <p className="text-xs font-semibold text-gray-400">Save your GA4 code to deploy across all website pages</p>
                </div>
              </div>

              {loadingConfig && (
                <RefreshCw className="h-4 w-4 text-gray-400 animate-spin" />
              )}
            </div>

            <form onSubmit={handleSaveId} className="space-y-5">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-gray-700 block mb-1.5">
                  GA4 Measurement ID
                </label>
                <div className="relative">
                  <input 
                    type="text"
                    value={newId}
                    onChange={(e) => setNewId(e.target.value.toUpperCase().trim())}
                    placeholder="e.g. G-XXXXXXXXXX"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-mono font-bold text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                  {newId && (
                    <span className="absolute right-3 top-3 text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                      Valid ID Format
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-medium text-gray-400 mt-1">
                  Format: <code className="font-mono text-gray-600 bg-gray-100 px-1 py-0.5 rounded">G-XXXXXXXXXX</code> (Found in Google Analytics &gt; Data Streams)
                </p>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-gray-700 block mb-1.5">
                  Custom HTML / Script Snippet Code (Optional)
                </label>
                <textarea 
                  value={newScript}
                  onChange={(e) => setNewScript(e.target.value)}
                  placeholder={`<!-- Paste your raw Google Analytics or Google Tag Manager script here -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>`}
                  rows={9}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-mono font-medium text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all leading-relaxed"
                />
                <p className="text-[11px] font-medium text-gray-400 mt-1">
                  You can paste complete <code className="font-mono text-gray-600">&lt;script&gt;</code> code blocks here for Google Tag Manager, Meta Pixel, or custom tag managers.
                </p>
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  className="w-full py-3.5 bg-primary hover:bg-orange-600 font-black text-sm text-white rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Save & Deploy Configuration to Production
                </button>
              </div>
            </form>

            <div className="mt-5 pt-4 border-t border-gray-100 text-xs font-medium text-gray-500 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Changes take effect immediately on all visitor page views
              </span>
              <span className="text-[10px] text-gray-400 font-mono">
                Synced to Cloud DB
              </span>
            </div>
          </div>

          {/* Real-time Event Verification & Sandbox */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-50 rounded-lg text-sky-600">
                  <Zap className="h-4 w-4" />
                </div>
                <h3 className="font-black text-gray-900 text-base">Test Event Dispatcher</h3>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-100 px-2 py-0.5 rounded">
                Verification Sandbox
              </span>
            </div>

            <p className="text-xs font-medium text-gray-500">
              Trigger a test event to verify that your Google Analytics measurement tag or script is receiving data correctly in Google Analytics DebugView or Realtime tab.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-500 block mb-1">Event Name</label>
                <select 
                  value={currentTestEventName}
                  onChange={(e) => setCurrentTestEventName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 font-bold text-gray-900 focus:bg-white focus:outline-none"
                >
                  <option value="page_view_test">page_view_test</option>
                  <option value="select_item">select_item (Tour Click)</option>
                  <option value="begin_checkout">begin_checkout (Booking)</option>
                  <option value="purchase">purchase (Completed Order)</option>
                  <option value="generate_lead">generate_lead (Inquiry)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-gray-500 block mb-1">Event Label / Details</label>
                <input 
                  type="text"
                  value={currentTestEventLabel}
                  onChange={(e) => setCurrentTestEventLabel(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 font-bold text-gray-900 focus:bg-white focus:outline-none"
                  placeholder="e.g. Production Verification"
                />
              </div>
            </div>

            <button 
              type="button"
              onClick={handleTriggerTestEvent}
              className="w-full py-2.5 bg-gray-900 hover:bg-black text-white font-black text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Code className="h-4 w-4 text-emerald-400" />
              Dispatch Test Event to Google Analytics
            </button>
          </div>
        </div>

        {/* Right Column: Step-by-Step Guide + Live Event Logger */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Step-by-Step Setup Guide Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-md space-y-5">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-4">
              <div className="flex items-center gap-2.5">
                <BarChart2 className="h-5 w-5 text-orange-400" />
                <h3 className="font-black text-white text-base">Step-by-Step Embed Guide</h3>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-300 bg-orange-950/60 border border-orange-800/60 px-2 py-0.5 rounded">
                Official Instructions
              </span>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <h4 className="font-bold text-slate-100 text-sm">Create Google Analytics Account</h4>
                  <p className="text-slate-300 mt-0.5 leading-relaxed">
                    Log in to <a href="https://analytics.google.com/" target="_blank" rel="noopener noreferrer" className="text-orange-400 underline hover:text-orange-300">analytics.google.com</a> and create or select your Web Property.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <h4 className="font-bold text-slate-100 text-sm">Copy Measurement ID or Web Tag</h4>
                  <p className="text-slate-300 mt-0.5 leading-relaxed">
                    Navigate to <strong>Admin ⚙️ &gt; Data Streams &gt; Web Stream</strong>. Copy your <strong>Measurement ID</strong> (e.g. <code className="text-orange-300 font-mono">G-XXXXXXXXXX</code>) or click <strong>View tag instructions</strong> to copy the entire script code snippet.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <h4 className="font-bold text-slate-100 text-sm">Paste into Settings & Save</h4>
                  <p className="text-slate-300 mt-0.5 leading-relaxed">
                    Paste the ID or script in the left form and click <strong>Save & Deploy</strong>. The tag is immediately injected across all pages on your domain.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                  4
                </div>
                <div>
                  <h4 className="font-bold text-slate-100 text-sm">View Analytics Live</h4>
                  <p className="text-slate-300 mt-0.5 leading-relaxed">
                    Open your website in a new tab. In Google Analytics, navigate to <strong>Reports &gt; Realtime</strong> to view active users and pages visited live in production!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Reference Templates */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-black text-gray-900 text-sm flex items-center gap-2">
              <Code className="h-4 w-4 text-primary" />
              Standard GA4 Embed Script Template
            </h3>
            <p className="text-xs text-gray-500 font-medium">
              Reference code structure for standard Google Analytics tags:
            </p>

            <div className="relative bg-gray-900 rounded-xl p-3 text-[11px] font-mono text-gray-200 overflow-x-auto leading-relaxed">
              <button 
                onClick={() => handleCopyCode(sampleGtagScript, 'gtag')}
                className="absolute top-2 right-2 px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 text-[10px] font-bold rounded flex items-center gap-1 transition-colors"
              >
                <Copy className="h-3 w-3" />
                {copiedTemplate === 'gtag' ? 'Copied!' : 'Copy'}
              </button>
              <pre className="pr-12 whitespace-pre-wrap">{sampleGtagScript}</pre>
            </div>
          </div>

          {/* Live GA Event Stream Logger */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-gray-900 text-base flex items-center gap-2">
                  <Radio className="h-4 w-4 text-emerald-600 animate-pulse" />
                  Live Local Event Logger
                </h3>
                <p className="text-xs font-semibold text-gray-400">Captures actual page views and events fired in this session</p>
              </div>

              {liveEvents.length > 0 && (
                <button 
                  onClick={() => {
                    recordedGAEvents.length = 0;
                    setLiveEvents([]);
                  }}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-800 transition-colors"
                >
                  Clear Feed
                </button>
              )}
            </div>

            <div className="h-60 overflow-y-auto border border-gray-150 rounded-xl bg-gray-50 p-3 space-y-2 font-mono text-[11px] text-gray-700 no-scrollbar">
              {liveEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 select-none space-y-2 py-8 text-center">
                  <Database className="h-8 w-8 stroke-1.5 text-gray-300" />
                  <span className="text-xs font-medium">No actions captured yet in this browser session.</span>
                  <span className="text-[10px] text-gray-400">Navigate the site or run a test event to see logs here.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {liveEvents.map((evt, idx) => (
                    <div key={idx} className="p-2.5 bg-white rounded-lg border border-gray-200 space-y-1 shadow-2xs">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-semibold text-gray-400">{evt.timestamp}</span>
                        <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase ${
                          evt.type === 'pageview' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {evt.type}
                        </span>
                      </div>
                      <div className="text-gray-900 font-bold break-all">
                        {evt.type === 'pageview' ? `Page View: ${evt.name}` : `Event: "${evt.name}"`}
                      </div>
                      {evt.params && (
                        <div className="text-[10px] text-orange-800 bg-orange-50/60 p-1.5 rounded border border-orange-100 overflow-x-auto whitespace-pre font-mono">
                          {JSON.stringify(evt.params, null, 2)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
