// Google Analytics 4 (GA4) Tracker Service for Tripbone
import { db } from './firebase';
import { doc, getDoc } from '@/src/lib/firebase';

export interface GAEvent {
  action: string;
  category?: string;
  label?: string;
  value?: number;
  [key: string]: any;
}

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
    GA_MEASUREMENT_ID?: string;
  }
}

// In-memory cache for fast synchronous access
let activeMeasurementId = '';
let activeCustomScript = '';
let isGAInitialized = false;

// Memory logging of GA events for the interactive dashboard preview list
export const recordedGAEvents: Array<{
  timestamp: string;
  type: 'pageview' | 'event';
  name: string;
  params: any;
}> = [];

// Helper to push to our interactive dashboard stream
const logToInteractiveStream = (type: 'pageview' | 'event', name: string, params: any) => {
  recordedGAEvents.unshift({
    timestamp: new Date().toLocaleTimeString(),
    type,
    name,
    params
  });
  
  // Keep last 50 events in buffer
  if (recordedGAEvents.length > 50) {
    recordedGAEvents.pop();
  }

  // Trigger a custom event so the UI can listen and refresh live
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ga-event-logged'));
  }
};

// Helper to extract G-XXXXXXXXXX from a string (e.g., custom script block)
export const extractMeasurementId = (text: string): string => {
  if (!text) return '';
  const match = text.match(/G-[A-Z0-9]{6,12}/i);
  return match ? match[0].toUpperCase() : '';
};

export const getGAMeasurementId = (): string => {
  if (activeMeasurementId) return activeMeasurementId;
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem('ga_measurement_id') || '';
    if (local) {
      activeMeasurementId = local;
      return local;
    }
  }
  return '';
};

export const getGACustomScript = (): string => {
  if (activeCustomScript) return activeCustomScript;
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem('ga_custom_script') || '';
    if (local) {
      activeCustomScript = local;
      return local;
    }
  }
  return '';
};

export const setGAMeasurementId = (id: string) => {
  const cleanId = id.trim().toUpperCase();
  activeMeasurementId = cleanId;
  if (typeof window !== 'undefined') {
    if (cleanId) {
      localStorage.setItem('ga_measurement_id', cleanId);
      window.GA_MEASUREMENT_ID = cleanId;
      setupGATags(cleanId);
    } else {
      localStorage.removeItem('ga_measurement_id');
      delete window.GA_MEASUREMENT_ID;
    }
  }
};

export const setGACustomScript = (script: string) => {
  activeCustomScript = script;
  if (typeof window !== 'undefined') {
    if (script) {
      localStorage.setItem('ga_custom_script', script);
      injectCustomScript(script);
      // Auto extract ID if not present
      if (!activeMeasurementId) {
        const extracted = extractMeasurementId(script);
        if (extracted) {
          setGAMeasurementId(extracted);
        }
      }
    } else {
      localStorage.removeItem('ga_custom_script');
      injectCustomScript('');
    }
  }
};

// Safely inject custom script HTML (including script tag code evaluation) in body/head
export const injectCustomScript = (htmlSnippet: string) => {
  if (typeof document === 'undefined') return;

  const existingBlock = document.getElementById('ga-custom-script-injection');
  if (existingBlock) existingBlock.remove();

  if (!htmlSnippet || !htmlSnippet.trim()) {
    return;
  }

  try {
    // Create container
    const container = document.createElement('div');
    container.id = 'ga-custom-script-injection';
    container.style.display = 'none';
    container.innerHTML = htmlSnippet;
    document.body.appendChild(container);

    // Convert script elements to static array to prevent live collection issues
    const scripts = Array.from(container.querySelectorAll('script'));
    scripts.forEach((s) => {
      const newScript = document.createElement('script');
      
      // Copy all attributes
      for (let j = 0; j < s.attributes.length; j++) {
        const attr = s.attributes[j];
        newScript.setAttribute(attr.name, attr.value);
      }
      
      // Copy content code inside script
      if (s.textContent) {
        newScript.textContent = s.textContent;
      }
      document.head.appendChild(newScript);
    });

    console.log('[Google Analytics] Injected custom script block successfully.');
  } catch (error) {
    console.error('[Google Analytics] Error injecting custom script block:', error);
  }
};

// Low level runner to inject and configure GTAG tags
export const setupGATags = (measurementId: string) => {
  if (!measurementId || typeof window === 'undefined') return;

  const cleanId = measurementId.trim().toUpperCase();
  if (!cleanId.startsWith('G-') && !cleanId.startsWith('UA-')) {
    console.warn('[Google Analytics] Measurement ID does not follow GA4 format (e.g. G-XXXXXXXXXX):', cleanId);
  }

  try {
    const existingScriptId = 'ga-gtag-script';
    let script = document.getElementById(existingScriptId) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement('script');
      script.id = existingScriptId;
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${cleanId}`;
      document.head.appendChild(script);
    } else {
      script.src = `https://www.googletagmanager.com/gtag/js?id=${cleanId}`;
    }

    // Initialize dataLayer
    window.dataLayer = window.dataLayer || [];
    
    // Ensure gtag function exists and forwards arguments to dataLayer
    if (typeof window.gtag !== 'function') {
      window.gtag = function() {
        window.dataLayer.push(arguments);
      };
    }

    // Fire js initialization event
    window.gtag('js', new Date());

    // Configure tracking ID
    window.gtag('config', cleanId, {
      page_path: window.location.pathname + window.location.search,
      send_page_view: true
    });

    activeMeasurementId = cleanId;
    window.GA_MEASUREMENT_ID = cleanId;
    isGAInitialized = true;

    logToInteractiveStream('pageview', window.location.pathname, {
      title: document.title,
      measurementId: cleanId,
      status: 'gtag_configured'
    });

    console.log(`[Google Analytics] Initialized GTAG with ID: ${cleanId}`);
  } catch (error) {
    console.error('[Google Analytics] GTAG setup error:', error);
  }
};

// Orchestrates both GTAG and raw HTML custom scripts, synchronizing with Firestore settings
export const initGA = async () => {
  if (typeof window === 'undefined') return;

  // 1. Initial cached render from memory / localStorage / env
  let cachedId = getGAMeasurementId();
  let cachedScript = getGACustomScript();

  // Check Vite env fallback
  if (!cachedId && import.meta.env.VITE_GA_MEASUREMENT_ID) {
    cachedId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  }

  if (cachedScript) {
    injectCustomScript(cachedScript);
    if (!cachedId) {
      cachedId = extractMeasurementId(cachedScript);
    }
  }

  if (cachedId) {
    setupGATags(cachedId);
  }

  // 2. Fetch remote values from database
  try {
    // Try settings/analytics first
    const docRef = doc(db, 'settings', 'analytics');
    const snap = await getDoc(docRef);
    let remoteId = '';
    let remoteScript = '';

    if (snap.exists()) {
      const data = snap.data();
      remoteId = (data.measurementId || data.ga4Id || data.gaMeasurementId || '').trim();
      remoteScript = (data.customScript || data.gaCustomScript || '').trim();
    }

    // Fallback check settings/general
    if (!remoteId) {
      const generalRef = doc(db, 'settings', 'general');
      const generalSnap = await getDoc(generalRef);
      if (generalSnap.exists()) {
        const gData = generalSnap.data();
        remoteId = (gData.gaMeasurementId || gData.googleAnalyticsId || '').trim();
        if (!remoteScript) {
          remoteScript = (gData.gaCustomScript || '').trim();
        }
      }
    }

    // Auto extract ID from script if remoteId still missing
    if (!remoteId && remoteScript) {
      remoteId = extractMeasurementId(remoteScript);
    }

    // If remote values exist and differ, save and apply
    if (remoteId && remoteId !== cachedId) {
      localStorage.setItem('ga_measurement_id', remoteId);
      activeMeasurementId = remoteId;
      setupGATags(remoteId);
    }

    if (remoteScript && remoteScript !== cachedScript) {
      localStorage.setItem('ga_custom_script', remoteScript);
      activeCustomScript = remoteScript;
      injectCustomScript(remoteScript);
    }

    // If we newly configured GA, track current initial pageview
    const currentId = getGAMeasurementId();
    if (currentId) {
      trackGAPageview(window.location.pathname + window.location.search);
    }
  } catch (error) {
    console.warn('[Google Analytics] Remote config sync postponed:', error);
  }
};

export const trackGAPageview = (path: string) => {
  const measurementId = getGAMeasurementId();
  if (!measurementId || typeof window === 'undefined') return;

  try {
    if (typeof window.gtag === 'function') {
      window.gtag('config', measurementId, {
        page_path: path,
        send_page_view: true
      });
    } else {
      // Lazy init if window.gtag isn't defined yet
      setupGATags(measurementId);
      if (typeof (window as any).gtag === 'function') {
        (window as any).gtag('config', measurementId, {
          page_path: path,
          send_page_view: true
        });
      }
    }
    
    logToInteractiveStream('pageview', path, {
      title: document.title,
      measurementId
    });
  } catch (error) {
    console.warn('[Google Analytics] Pageview track error:', error);
  }
};

export const trackGAEvent = (
  action: string, 
  category: string = 'engagement', 
  label?: string, 
  value?: number,
  extraParams?: Record<string, any>
) => {
  const measurementId = getGAMeasurementId();
  if (!measurementId || typeof window === 'undefined') return;

  try {
    const payload: Record<string, any> = {
      event_category: category,
      event_label: label,
      value: value,
      ...extraParams
    };

    if (typeof (window as any).gtag === 'function') {
      (window as any).gtag('event', action, payload);
    } else {
      setupGATags(measurementId);
      if (typeof (window as any).gtag === 'function') {
        (window as any).gtag('event', action, payload);
      }
    }

    logToInteractiveStream('event', action, {
      category,
      label,
      value,
      ...extraParams
    });
  } catch (error) {
    console.warn('[Google Analytics] Event track error:', error);
  }
};

// Specialized GA4 E-Commerce & Conversion Helpers
export const trackGAViewItem = (tour: { id: string; title: string; price?: number; category?: string }) => {
  trackGAEvent('view_item', 'ecommerce', tour.title, tour.price, {
    items: [{
      item_id: tour.id,
      item_name: tour.title,
      item_category: tour.category || 'Tour',
      price: tour.price || 0
    }]
  });
};

export const trackGAAddToCart = (tour: { id: string; title: string; price: number }) => {
  trackGAEvent('add_to_cart', 'ecommerce', tour.title, tour.price, {
    items: [{
      item_id: tour.id,
      item_name: tour.title,
      price: tour.price
    }]
  });
};

export const trackGABeginCheckout = (booking: { tourTitle: string; totalAmount: number; participants?: number }) => {
  trackGAEvent('begin_checkout', 'ecommerce', booking.tourTitle, booking.totalAmount, {
    currency: 'USD',
    value: booking.totalAmount,
    participants: booking.participants || 1
  });
};

export const trackGAPurchase = (booking: { id: string; tourTitle: string; totalAmount: number; paymentMethod?: string }) => {
  trackGAEvent('purchase', 'ecommerce', booking.tourTitle, booking.totalAmount, {
    transaction_id: booking.id,
    value: booking.totalAmount,
    currency: 'USD',
    payment_type: booking.paymentMethod || 'online'
  });
};

export const trackGAInquirySubmit = (inquiryType: string, planTitle?: string) => {
  trackGAEvent('generate_lead', 'conversion', planTitle || inquiryType, 1, {
    lead_type: inquiryType
  });
};
