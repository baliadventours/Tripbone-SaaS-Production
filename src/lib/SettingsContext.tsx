import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot, getDoc, setDoc, collection, query, orderBy } from '@/src/lib/firebase';
import { db } from './firebase';
import { SiteSettings, TourLabel } from '../types';
import { useTenant } from './TenantContext';

import { WebsiteBuilderSettings } from '../components/Admin/WebsiteBuilder';

interface SettingsContextType {
  settings: SiteSettings | null;
  builderSettings: WebsiteBuilderSettings | null;
  globalBrand: any | null;
  labels: TourLabel[];
  loading: boolean;
}

const defaultSettings: SiteSettings = {
  siteName: 'Tripbone',
  siteDescription: 'Discover the best tours and experiences with Tripbone.',
  siteKeywords: 'bali, tours, adventure, tripbone',
  supportEmail: 'support@tripbone.com',
  supportPhone: '+6281234567890',
  whatsappNumber: '+62 812-3456-7890',
  logoURL: '',
  faviconURL: '',
  heroImage: '',
  heroImages: [],
  officeAddress: 'Jl. Raya Ubud, Gianyar, Bali, Indonesia 80571',
  primaryColor: '#FF7A00',
  secondaryColor: '#1F3B1F',
  bodyFont: 'Poppins',
  headingFont: 'Oswald',
  currency: 'USD'
};

const SettingsContext = createContext<SettingsContextType>({
  settings: null,
  builderSettings: null,
  globalBrand: null,
  labels: [],
  loading: true
});

export const useSettings = () => useContext(SettingsContext);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { tenantId, tenant, loading: tenantLoading } = useTenant();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [builderSettings, setBuilderSettings] = useState<WebsiteBuilderSettings | null>(null);
  const [globalBrand, setGlobalBrand] = useState<any>(null);
  const [labels, setLabels] = useState<TourLabel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const faviconUrl = settings?.faviconURL || globalBrand?.faviconUrl;
    if (faviconUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = faviconUrl;
    }
  }, [globalBrand?.faviconUrl, settings?.faviconURL]);

  useEffect(() => {
    if (tenantLoading) return;

    const docRef = doc(db, 'settings', tenantId || 'general');
    
    // Listen for settings
    const unsubscribeSettings = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as SiteSettings;
        setSettings(data);
        applySettings(data);
      } else {
        const fallback: SiteSettings = {
          ...defaultSettings,
          siteName: tenant?.companyName || 'Tripbone',
          siteDescription: tenant?.companyName ? `Premium Tours & Experiences with ${tenant.companyName}` : `Premium Tours & Experiences with Tripbone`,
          supportEmail: tenant?.email || defaultSettings.supportEmail,
          supportPhone: tenant?.phone || defaultSettings.supportPhone,
          logoURL: tenant?.logo || defaultSettings.logoURL,
          primaryColor: tenant?.primaryColor || defaultSettings.primaryColor,
          secondaryColor: tenant?.secondaryColor || defaultSettings.secondaryColor,
        };
        setSettings(fallback);
        applySettings(fallback);
      }
    });

    const builderRef = doc(db, 'website_builder', tenantId || 'general');
    const unsubscribeBuilder = onSnapshot(builderRef, (snapshot) => {
      if (snapshot.exists()) {
        setBuilderSettings(snapshot.data() as WebsiteBuilderSettings);
      } else {
        setBuilderSettings(null);
      }
    });

    // Listen for global platform branding
    const globalBrandRef = doc(db, 'settings', 'globalBrand');
    const unsubscribeGlobalBrand = onSnapshot(globalBrandRef, (snapshot) => {
      if (snapshot.exists()) {
        setGlobalBrand(snapshot.data());
      } else {
        setGlobalBrand({
          platformName: 'Tripbone SaaS',
          tagline: 'Secure Enterprise Sandbox',
          supportEmail: 'support@tripbone.com',
          copyright: '© 2026 PT Tripbone Indonesia',
          logoUrl: '',
          faviconUrl: ''
        });
      }
    });

    // Listen for labels
    const unsubscribeLabels = onSnapshot(query(collection(db, 'tourLabels'), orderBy('name')), (snapshot) => {
      setLabels(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TourLabel)));
      setLoading(false);
    });

    return () => {
      unsubscribeSettings();
      unsubscribeBuilder();
      unsubscribeGlobalBrand();
      unsubscribeLabels();
    };
  }, [tenantId, tenantLoading]);

  useEffect(() => {
    const favicon = settings?.faviconURL || globalBrand?.faviconUrl;
    if (favicon) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = favicon;
    }
  }, [settings?.faviconURL, globalBrand?.faviconUrl]);


  const applySettings = (data: SiteSettings) => {
    // Apply SEO metadata
    document.title = data.siteName;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', data.siteDescription);
    
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) metaKeywords.setAttribute('content', data.siteKeywords);

    // Apply colors to CSS variables
    document.documentElement.style.setProperty('--primary-color', data.primaryColor);

    // Apply branding preset class to root
    const root = document.documentElement;
    root.classList.remove(
      'theme-swiss-minimalist', 
      'theme-tech-dark', 
      'theme-elegant-editorial', 
      'theme-nordic-forest',
      'theme-retro-adventure',
      'theme-tokyo-neon',
      'theme-mediterranean-breeze',
      'theme-brutalist-mono',
      'theme-royal-safari',
      'theme-zen-oasis',
      'theme-alpine-chalet',
      'theme-sunset-ibiza',
      'theme-default'
    );
    const activePreset = data.brandingPreset || 'default';
    root.classList.add(`theme-${activePreset}`);
    
    // Inject fonts if they are from Google Fonts or branding presets
    if (data.headingFont || data.bodyFont || activePreset !== 'default') {
        const fontId = 'google-fonts-link';
        let link = document.getElementById(fontId) as HTMLLinkElement;
        if (!link) {
            link = document.createElement('link');
            link.id = fontId;
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }
        
        let headingFont = data.headingFont || 'Oswald';
        let bodyFont = data.bodyFont || 'Poppins';

        if (activePreset === 'swiss-minimalist') {
            headingFont = 'Inter';
            bodyFont = 'Inter';
        } else if (activePreset === 'tech-dark') {
            headingFont = 'Space Grotesk';
            bodyFont = 'JetBrains Mono';
        } else if (activePreset === 'elegant-editorial') {
            headingFont = 'Playfair Display';
            bodyFont = 'Lora';
        } else if (activePreset === 'nordic-forest') {
            headingFont = 'Outfit';
            bodyFont = 'Plus Jakarta Sans';
        } else if (activePreset === 'retro-adventure') {
            headingFont = 'Bricolage Grotesque';
            bodyFont = 'Plus Jakarta Sans';
        } else if (activePreset === 'tokyo-neon') {
            headingFont = 'Syne';
            bodyFont = 'Plus Jakarta Sans';
        } else if (activePreset === 'mediterranean-breeze') {
            headingFont = 'Lexend';
            bodyFont = 'Plus Jakarta Sans';
        } else if (activePreset === 'brutalist-mono') {
            headingFont = 'Archivo Black';
            bodyFont = 'Fira Code';
        } else if (activePreset === 'royal-safari') {
            headingFont = 'Cormorant Garamond';
            bodyFont = 'Lora';
        } else if (activePreset === 'zen-oasis') {
            headingFont = 'Outfit';
            bodyFont = 'Inter';
        } else if (activePreset === 'alpine-chalet') {
            headingFont = 'Bricolage Grotesque';
            bodyFont = 'Lora';
        } else if (activePreset === 'sunset-ibiza') {
            headingFont = 'Syne';
            bodyFont = 'Plus Jakarta Sans';
        }

        const families = [];
        if (headingFont) families.push(`family=${headingFont.replace(/ /g, '+')}:wght@400;500;700;900`);
        if (bodyFont) families.push(`family=${bodyFont.replace(/ /g, '+')}:wght@400;500;600`);
        
        if (families.length > 0) {
            link.href = `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`;
        }
        
        document.documentElement.style.setProperty('--font-heading', headingFont);
        document.documentElement.style.setProperty('--font-body', bodyFont);
    }

    // Apply favicon
    if (data.faviconURL) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = data.faviconURL;
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, builderSettings, globalBrand, labels, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}
