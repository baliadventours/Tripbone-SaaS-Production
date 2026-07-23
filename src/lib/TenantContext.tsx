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
  globalSEO: any | null;
  setPreviewTenant: (slug: string | null) => void;
  isImpersonating: boolean; // True ONLY when a superadmin has explicitly taken over
  stopImpersonation: () => void;
  impersonateTenant: (tenant: Tenant) => void;
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  tenantId: null,
  isMaster: true,
  isAppGate: false,
  loading: true,
  error: null,
  globalSEO: null,
  setPreviewTenant: () => {},
  isImpersonating: false,
  stopImpersonation: () => {},
  impersonateTenant: () => {}
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
  const [isImpersonating, setIsImpersonating] = useState(false);

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
      setGlobalSEO({
        title: 'Tripbone - Enterprise Multi Tenant SaaS Platform',
        description: 'Tripbone is a leading enterprise multi-tenant SaaS platform for tour operators, travel agencies, and destination management companies.',
        image: 'https://i.ibb.co.com/pvLCVYkM/ALAS-HARUM8-optimized.webp',
        siteName: 'Tripbone SaaS'
      });
    });

    return () => unsubscribe();
  }, []);

  const stopImpersonation = () => {
    sessionStorage.removeItem('tripbone_is_impersonating');
    sessionStorage.removeItem('tripbone_impersonated_tenant_id');
    localStorage.removeItem('tripbone_preview_tenant');
    setIsImpersonating(false);

    // Clean URL query params
    const url = new URL(window.location.href);
    url.searchParams.delete('impersonate');
    url.searchParams.delete('tenant');

    window.location.href = '/superadmin';
  };

  const impersonateTenant = (targetTenant: Tenant) => {
    sessionStorage.setItem('tripbone_is_impersonating', 'true');
    sessionStorage.setItem('tripbone_impersonated_tenant_id', targetTenant.id);
    if (targetTenant.slug) {
      localStorage.setItem('tripbone_preview_tenant', targetTenant.slug.toLowerCase());
    }

    const protocol = window.location.hostname === 'localhost' ? 'http://' : 'https://';
    if (targetTenant.customDomain) {
      window.location.href = `${protocol}${targetTenant.customDomain}/?tenant=${targetTenant.slug}&impersonate=${targetTenant.id}`;
    } else {
      window.location.href = `/?tenant=${targetTenant.slug}&impersonate=${targetTenant.id}`;
    }
  };

  const setPreviewTenant = (slug: string | null) => {
    if (slug) {
      localStorage.setItem('tripbone_preview_tenant', slug);
    } else {
      localStorage.removeItem('tripbone_preview_tenant');
    }
    window.location.reload();
  };

  // Resolve tenant parameters from hostname and URL search params
  const resolveTenantInfo = (): { 
    slug: string | null; 
    customDomain: string | null; 
    impersonateId: string | null;
    isAppGateHost: boolean;
    isExplicitImpersonate: boolean;
  } => {
    if (typeof window === 'undefined') {
      return { slug: null, customDomain: null, impersonateId: null, isAppGateHost: false, isExplicitImpersonate: false };
    }

    const hostname = window.location.hostname;
    const urlParams = new URLSearchParams(window.location.search);
    
    const isAppSubdomain = hostname.startsWith('app.') || hostname.startsWith('app-');
    
    const urlImpersonate = urlParams.get('impersonate');
    const sessionImpersonate = sessionStorage.getItem('tripbone_is_impersonating') === 'true';
    const sessionImpersonateId = sessionStorage.getItem('tripbone_impersonated_tenant_id');

    const isExplicitImpersonate = Boolean(urlImpersonate || (sessionImpersonate && sessionImpersonateId));
    const impersonateId = urlImpersonate || sessionImpersonateId;

    if (isAppSubdomain && !isExplicitImpersonate) {
      return { slug: null, customDomain: null, impersonateId: null, isAppGateHost: true, isExplicitImpersonate: false };
    }
    
    // 1. Check for query parameter override
    const paramTenant = urlParams.get('tenant') || urlParams.get('preview_tenant');
    if (paramTenant) {
      const lowerSlug = paramTenant.toLowerCase();
      if (localStorage.getItem('tripbone_preview_tenant') !== lowerSlug) {
        localStorage.setItem('tripbone_preview_tenant', lowerSlug);
      }
      return { 
        slug: lowerSlug, 
        customDomain: null, 
        impersonateId, 
        isAppGateHost: false, 
        isExplicitImpersonate 
      };
    }

    // 2. If impersonateId is present
    if (impersonateId) {
      return { 
        slug: null, 
        customDomain: null, 
        impersonateId, 
        isAppGateHost: false, 
        isExplicitImpersonate 
      };
    }

    // 3. Check localStorage for preview/sticky tenant (ONLY if NOT explicit superadmin impersonation)
    const cachedTenant = localStorage.getItem('tripbone_preview_tenant');
    if (cachedTenant && !isExplicitImpersonate) {
      return { 
        slug: cachedTenant.toLowerCase(), 
        customDomain: null, 
        impersonateId: null, 
        isAppGateHost: false, 
        isExplicitImpersonate: false 
      };
    }

    // 4. Resolve subdomain or custom domain
    const mainDomains = ['tripbone.com', 'localhost', '127.0.0.1'];
    const isMainDomain = mainDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain));
    const isAiStudio = hostname.includes('run.app');

    if (isAiStudio) {
      return { slug: null, customDomain: null, impersonateId: null, isAppGateHost: isAppSubdomain, isExplicitImpersonate: false };
    }

    const parts = hostname.split('.');
    
    if (isMainDomain) {
      if (parts.length > 1 && parts[parts.length - 1] === 'localhost') {
        if (parts[0] !== 'www' && parts[0] !== 'localhost' && parts[0] !== 'app') {
          return { slug: parts[0].toLowerCase(), customDomain: null, impersonateId: null, isAppGateHost: false, isExplicitImpersonate: false };
        }
      } else if (parts.length > 2) {
        const subdomain = parts[0];
        if (subdomain !== 'www' && subdomain !== 'app') {
          return { slug: subdomain.toLowerCase(), customDomain: null, impersonateId: null, isAppGateHost: false, isExplicitImpersonate: false };
        }
      }
      return { slug: null, customDomain: null, impersonateId: null, isAppGateHost: isAppSubdomain, isExplicitImpersonate: false };
    } else {
      return { slug: null, customDomain: hostname.toLowerCase(), impersonateId: null, isAppGateHost: false, isExplicitImpersonate: false };
    }
  };

  useEffect(() => {
    async function fetchTenant() {
      try {
        const { slug, customDomain, impersonateId, isAppGateHost, isExplicitImpersonate } = resolveTenantInfo();
        
        activeTenantSlug = slug;
        setIsAppGate(isAppGateHost);

        if (!slug && !customDomain && !impersonateId) {
          setTenant(null);
          setTenantIdInternal(null);
          setActiveTenantId(null);
          setIsMaster(true);
          setIsImpersonating(false);
          setLoading(false);
          return;
        }

        let tenantData: Tenant | null = null;
        let tenantDocId: string | null = null;

        // 1. Try resolving by impersonateId if present
        if (impersonateId) {
          const directDocRef = doc(db, 'tenants', impersonateId);
          const directSnap = await getDoc(directDocRef);
          if (directSnap.exists()) {
            tenantDocId = directSnap.id;
            tenantData = { id: directSnap.id, ...(directSnap.data() as any) } as Tenant;
          } else {
            const slugQuery = query(collection(db, 'tenants'), where('slug', '==', impersonateId.toLowerCase()), limit(1));
            const slugSnap = await getDocs(slugQuery);
            if (!slugSnap.empty) {
              const d = slugSnap.docs[0];
              tenantDocId = d.id;
              tenantData = { id: d.id, ...(d.data() as any) } as Tenant;
            }
          }
        }

        // 2. If not resolved via impersonateId, query by slug or customDomain
        if (!tenantData) {
          let tenantQuery;
          if (slug) {
            tenantQuery = query(collection(db, 'tenants'), where('slug', '==', slug), limit(1));
          } else if (customDomain) {
            const cleanDomain = customDomain.replace(/^www\./i, '');
            const domainsToSearch = [cleanDomain, 'www.' + cleanDomain];
            tenantQuery = query(collection(db, 'tenants'), where('customDomain', 'in', domainsToSearch), limit(1));
          }

          if (tenantQuery) {
            const querySnapshot = await getDocs(tenantQuery);
            if (!querySnapshot.empty) {
              const tenantDoc = querySnapshot.docs[0];
              tenantDocId = tenantDoc.id;
              tenantData = { id: tenantDoc.id, ...(tenantDoc.data() as any) } as Tenant;
            }
          }
        }

        if (tenantData && tenantDocId) {
          setTenant(tenantData);
          setTenantIdInternal(tenantDocId);
          setActiveTenantId(tenantDocId);
          setIsMaster(false);
          setError(null);

          if (isExplicitImpersonate) {
            setIsImpersonating(true);
            sessionStorage.setItem('tripbone_is_impersonating', 'true');
            sessionStorage.setItem('tripbone_impersonated_tenant_id', tenantDocId);
          } else {
            setIsImpersonating(false);
            sessionStorage.removeItem('tripbone_is_impersonating');
            sessionStorage.removeItem('tripbone_impersonated_tenant_id');
          }
        } else {
          console.warn(`Tenant not found for slug: ${slug}, domain: ${customDomain}, impersonateId: ${impersonateId}`);
          setError(`We couldn't find the tenant space for "${slug || customDomain || impersonateId}".`);
          setTenant(null);
          setTenantIdInternal(null);
          setActiveTenantId(null);
          setIsMaster(true);
          setIsImpersonating(false);
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
    <TenantContext.Provider value={{ 
      tenant, 
      tenantId, 
      isMaster, 
      isAppGate, 
      loading, 
      error, 
      globalSEO, 
      setPreviewTenant,
      isImpersonating,
      stopImpersonation,
      impersonateTenant
    }}>
      {children}
    </TenantContext.Provider>
  );
}
