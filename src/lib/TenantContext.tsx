import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, getDocs, limit, doc, getDoc, onSnapshot } from '@/src/lib/firebase';
import { db, setActiveTenantId as setFirebaseTenantId } from './firebase';
import { Tenant } from '../types';

interface TenantContextType {
  tenant: Tenant | null;
  tenantId: string | null;
  isMaster: boolean; // True if on the main tripbone.com SaaS homepage or app portal
  isAppGate: boolean; // True if on the app.tripbone.com app onboarding/billing portal
  loading: boolean;
  error: string | null;
  globalSEO: any | null; // Added
  setPreviewTenant: (slug: string | null) => void;
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  tenantId: null,
  isMaster: true,
  isAppGate: false,
  loading: true,
  error: null,
  globalSEO: null,
  setPreviewTenant: () => {}
});

export const useTenant = () => useContext(TenantContext);

// Global mutable variables
export let activeTenantId: string | null = null;
export let activeTenantSlug: string | null = null;

export const setActiveTenantId = (id: string | null) => {
  activeTenantId = id;
  setFirebaseTenantId(id); // Synchronize with the firebase module
};

export const getActiveTenantId = () => activeTenantId;

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenantId, setTenantIdInternal] = useState<string | null>(null);
  const [isMaster, setIsMaster] = useState(true);
  const [isAppGate, setIsAppGate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [globalSEO, setGlobalSEO] = useState<any | null>(null);

  // Fetch global SEO settings
  useEffect(() => {
    const seoRef = doc(db, 'settings', 'globalSEO');
    const unsubscribe = onSnapshot(seoRef, (docSnap) => {
      if (docSnap.exists()) {
        setGlobalSEO(docSnap.data());
      } else {
        setGlobalSEO({
          title: 'Tripbone - Enterprise Multi Tenant SaaS Platform',
          description: 'Tripbone is a leading enterprise multi-tenant SaaS platform for tour operators, travel agencies, and destination management companies.',
          image: 'https://i.ibb.co.com/pvLCVYkM/ALAS-HARUM8-optimized.webp',
          siteName: 'Tripbone SaaS'
        });
      }
    }, (err) => {
      console.error('Error fetching global SEO:', err);
      // Fallback
      setGlobalSEO({
          title: 'Tripbone - Enterprise Multi Tenant SaaS Platform',
          description: 'Tripbone is a leading enterprise multi-tenant SaaS platform for tour operators, travel agencies, and destination management companies.',
          image: 'https://i.ibb.co.com/pvLCVYkM/ALAS-HARUM8-optimized.webp',
          siteName: 'Tripbone SaaS'
      });
    });

    return () => unsubscribe();
  }, []);

  // Parse hostname and query parameter to resolve tenant
  const resolveTenantSlug = (): { slug: string | null; customDomain: string | null; isAppGateHost: boolean } => {
    if (typeof window === 'undefined') return { slug: null, customDomain: null, isAppGateHost: false };

    const hostname = window.location.hostname;
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check if the current subdomain is 'app'
    const isAppSubdomain = hostname.startsWith('app.') || hostname.startsWith('app-');
    
    // Dedicated app portal subdomain should never resolve a tenant, even with query params
    if (isAppSubdomain) {
      return { slug: null, customDomain: null, isAppGateHost: true };
    }
    
    // 1. Check for query parameter override (highest priority for development & AI Studio preview)
    const paramTenant = urlParams.get('tenant');
    if (paramTenant) {
      const lowerSlug = paramTenant.toLowerCase();
      if (localStorage.getItem('tripbone_preview_tenant') !== lowerSlug) {
        localStorage.setItem('tripbone_preview_tenant', lowerSlug);
      }
      return { slug: lowerSlug, customDomain: null, isAppGateHost: false };
    }

    // 2. Check localStorage for preview/sticky tenant
    const cachedTenant = localStorage.getItem('tripbone_preview_tenant');
    if (cachedTenant) {
      return { slug: cachedTenant.toLowerCase(), customDomain: null, isAppGateHost: false };
    }

    // 3. Resolve subdomain or custom domain
    // Main domain examples: tripbone.com, localhost, or AI Studio preview (ais-dev-...)
    const mainDomains = ['tripbone.com', 'localhost', '127.0.0.1'];
    
    // Check if hostname is an IP or localhost or belongs to main domains
    const isMainDomain = mainDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain));
    
    // Check if this is an AI Studio running container URL (contains "run.app")
    const isAiStudio = hostname.includes('run.app');

    if (isAiStudio) {
      // In AI Studio frame, the hostname is a full container URL (no simple tenant subdomains).
      // We rely on query params or localStorage.
      return { slug: null, customDomain: null, isAppGateHost: isAppSubdomain };
    }

    const parts = hostname.split('.');
    
    if (isMainDomain) {
      // For local development e.g., company.localhost:3000
      if (parts.length > 1 && parts[parts.length - 1] === 'localhost') {
        // parts: ['company', 'localhost'] -> subdomain is parts[0]
        if (parts[0] !== 'www' && parts[0] !== 'localhost' && parts[0] !== 'app') {
          return { slug: parts[0].toLowerCase(), customDomain: null, isAppGateHost: false };
        }
      } else if (parts.length > 2) {
        // e.g. company.tripbone.com -> subdomain is company
        const subdomain = parts[0];
        if (subdomain !== 'www' && subdomain !== 'app') {
          return { slug: subdomain.toLowerCase(), customDomain: null, isAppGateHost: false };
        }
      }
      return { slug: null, customDomain: null, isAppGateHost: isAppSubdomain };
    } else {
      // This is a custom domain! e.g., booking.mycompany.com or tours.baliadventours.com
      // We look up by customDomain field in the database.
      return { slug: null, customDomain: hostname.toLowerCase(), isAppGateHost: false };
    }
  };

  const setPreviewTenant = (slug: string | null) => {
    if (slug) {
      localStorage.setItem('tripbone_preview_tenant', slug);
    } else {
      localStorage.removeItem('tripbone_preview_tenant');
    }
    // Reload page to apply tenant configuration clean and fresh
    window.location.reload();
  };

  useEffect(() => {
    async function fetchTenant() {
      try {
        const { slug, customDomain, isAppGateHost } = resolveTenantSlug();
        
        activeTenantSlug = slug;
        setIsAppGate(isAppGateHost);

        if (!slug && !customDomain) {
          // No tenant resolved -> we are on the main Master SaaS landing page
          setTenant(null);
          setTenantIdInternal(null);
          setActiveTenantId(null);
          setIsMaster(true);
          setLoading(false);
          return;
        }

        // Query Firestore for matching tenant
        let tenantQuery;
        if (slug) {
          tenantQuery = query(collection(db, 'tenants'), where('slug', '==', slug), limit(1));
        } else {
          // Robust custom domain lookup: match both with and without 'www.' prefix
          const cleanDomain = customDomain.replace(/^www\./i, '');
          const domainsToSearch = [cleanDomain, 'www.' + cleanDomain];
          tenantQuery = query(
            collection(db, 'tenants'), 
            where('customDomain', 'in', domainsToSearch), 
            limit(1)
          );
        }

        const querySnapshot = await getDocs(tenantQuery);
        
        if (!querySnapshot.empty) {
          const tenantDoc = querySnapshot.docs[0];
          const tenantData = { id: tenantDoc.id, ...(tenantDoc.data() as any) } as Tenant;
          
          setTenant(tenantData);
          setTenantIdInternal(tenantDoc.id);
          setActiveTenantId(tenantDoc.id);
          setIsMaster(false);
          setError(null);
        } else {
          // Tenant not found in DB
          console.warn(`Tenant not found for slug: ${slug} or customDomain: ${customDomain}`);
          setError(`We couldn't find the tenant space for "${slug || customDomain}".`);
          setTenant(null);
          setTenantIdInternal(null);
          setActiveTenantId(null);
          setIsMaster(true); // Fallback to master view
        }
      } catch (err: any) {
        console.error('Error resolving tenant:', err);
        setError(err.message || 'Error loading tenant workspace.');
      } finally {
        setLoading(false);
      }
    }

    fetchTenant();
  }, []);

  return (
    <TenantContext.Provider value={{ tenant, tenantId, isMaster, isAppGate, loading, error, globalSEO, setPreviewTenant }}>
      {children}
    </TenantContext.Provider>
  );
}
