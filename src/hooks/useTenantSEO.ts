import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTenant } from '../lib/TenantContext';
import { useSettings } from '../lib/SettingsContext';

export function useTenantSEO() {
  const { tenant, isMaster, globalSEO } = useTenant();
  const { settings } = useSettings();
  const location = useLocation();

  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return;

    const siteName = settings?.siteName || tenant?.companyName || globalSEO?.siteName || 'Tripbone';
    const siteDescription = settings?.metaDescription || settings?.siteDescription || 
        (tenant?.companyName ? `Premium Tours & Experiences with ${tenant.companyName}` : globalSEO?.description);
    const siteKeywords = settings?.siteKeywords || globalSEO?.keywords || '';
    const siteImage = settings?.ogImage || settings?.heroImage || settings?.logoURL || tenant?.logo || globalSEO?.image || 'https://i.ibb.co.com/pvLCVYkM/ALAS-HARUM8-optimized.webp';

    let title = siteName;
    if (isMaster) {
      title = globalSEO?.title || 'Tripbone - Enterprise Multi Tenant SaaS Platform';
    } else {
      const isTourDetail = location.pathname.startsWith('/tour/');
      if (location.pathname === '/') {
         title = settings?.metaTitle || '';
         if (!title && settings?.homeTitleFormat) {
           title = settings.homeTitleFormat.replace(/\{\{siteName\}\}/gi, siteName);
         }
         title = title || `Book Tour and Adventours in Bali - ${siteName}`;
      } else if (!isTourDetail) {
         const pathParts = location.pathname.split('/').filter(Boolean);
         if (pathParts.length > 0) {
            const pageName = pathParts[0].charAt(0).toUpperCase() + pathParts[0].slice(1);
            title = `${pageName} | ${siteName}`;
         }
      }
    }

    // Update document title
    document.title = title;

    // Helper to update meta tags safely
    const updateMeta = (name: string, content: string, property?: string) => {
      if (!content) return;
      let el: HTMLMetaElement | null = null;
      if (property) {
        el = document.querySelector(`meta[property="${property}"]`);
      } else if (name) {
        el = document.querySelector(`meta[name="${name}"]`);
      }
      
      if (!el) {
        el = document.createElement('meta');
        if (property) el.setAttribute('property', property);
        if (name) el.setAttribute('name', name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    updateMeta('description', siteDescription);
    updateMeta('', siteName, 'og:site_name');
    updateMeta('', title, 'og:title');
    updateMeta('', siteDescription, 'og:description');
    updateMeta('', siteImage, 'og:image');
    updateMeta('', 'website', 'og:type');

    updateMeta('twitter:card', 'summary_large_image');
    updateMeta('twitter:title', title);
    updateMeta('twitter:description', siteDescription);
    updateMeta('twitter:image', siteImage);
    
    if (siteKeywords) {
       updateMeta('keywords', siteKeywords);
    }

  }, [tenant, settings, isMaster, globalSEO, location.pathname]);
}
