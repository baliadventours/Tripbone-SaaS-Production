/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import Header from './components/Header';
import Footer from './components/Footer';
import { SettingsProvider, useSettings } from './lib/SettingsContext';
import { CurrencyProvider } from './lib/CurrencyContext';
import { AuthProvider } from './lib/AuthContext';
import { TenantProvider, useTenant } from './lib/TenantContext';
import GlobalPopup from './components/GlobalPopup';
import MobileNav from './components/MobileNav';
import { cn } from './lib/utils';
import Loader from './components/Loader';
import { ShieldAlert } from 'lucide-react';
import { initGA, trackGAPageview } from './lib/googleAnalytics';
import { logSimplePageView } from './lib/simpleAnalytics';

// Critical pages imported directly for instant load
import Home from './pages/Home';

// Lazy load non-critical pages for performance
const Tours = lazy(() => import('./pages/Tours'));
const TourDetail = lazy(() => import('./pages/TourDetail'));
const Admin = lazy(() => import('./pages/Admin'));
const Checkout = lazy(() => import('./pages/Checkout'));
const BookingSuccess = lazy(() => import('./pages/BookingSuccess'));
const BookingTracker = lazy(() => import('./pages/BookingTracker'));
const Contact = lazy(() => import('./pages/Contact'));
const About = lazy(() => import('./pages/About'));
const Destinations = lazy(() => import('./pages/Destinations'));
const BlogArchive = lazy(() => import('./pages/BlogArchive'));
const BlogPostDetail = lazy(() => import('./pages/BlogPostDetail'));
const Auth = lazy(() => import('./pages/Auth'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const PriceList = lazy(() => import('./pages/PriceList'));
const DashboardLayout = lazy(() => import('./pages/Dashboard/DashboardLayout'));
const Overview = lazy(() => import('./pages/Dashboard/Overview'));
const Bookings = lazy(() => import('./pages/Dashboard/Bookings'));
const Wishlist = lazy(() => import('./pages/Dashboard/Wishlist'));
const Profile = lazy(() => import('./pages/Dashboard/Profile'));
const MyPlans = lazy(() => import('./pages/Dashboard/MyPlans'));
const Tickets = lazy(() => import('./pages/Dashboard/Tickets'));
const GoogleAnalytics = lazy(() => import('./pages/Dashboard/GoogleAnalytics'));
const AIPlanner = lazy(() => import('./pages/AIPlanner'));
const AIHub = lazy(() => import('./pages/AIHub'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));

const SaaSHome = lazy(() => import('./pages/SaaSHome'));
const SaaSSuperAdmin = lazy(() => import('./pages/SaaSSuperAdmin'));
const SaaSMarketing = lazy(() => import('./pages/SaaSMarketing'));
const SaaSShowcase = lazy(() => import('./pages/SaaSShowcase'));
const SaaSLayout = lazy(() => import('./components/SaaS/SaaSLayout'));
const SaaSFeatures = lazy(() => import('./pages/SaaSFeatures'));
const AIFeatures = lazy(() => import('./pages/SaaSFeatures/AIFeatures'));
const OperationsFeatures = lazy(() => import('./pages/SaaSFeatures/OperationsFeatures'));
const SalesFeatures = lazy(() => import('./pages/SaaSFeatures/SalesFeatures'));
const DesignFeatures = lazy(() => import('./pages/SaaSFeatures/DesignFeatures'));
const InfrastructureFeatures = lazy(() => import('./pages/SaaSFeatures/InfrastructureFeatures'));
const SaaSPricing = lazy(() => import('./pages/SaaSPricing'));
const SaaSAbout = lazy(() => import('./pages/SaaSAbout'));
const SaaSContact = lazy(() => import('./pages/SaaSContact'));
const SaaSTerms = lazy(() => import('./pages/SaaSTerms'));
const SaaSPrivacy = lazy(() => import('./pages/SaaSPrivacy'));
const SaasCookies = lazy(() => import('./pages/SaasCookies'));

// Lazy load non-critical components
const Chatbot = lazy(() => import('./components/Chatbot'));

function AppContent() {
  const { isMaster, isAppGate, tenant, loading: tenantLoading, setPreviewTenant } = useTenant();
  const { loading: settingsLoading } = useSettings();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const isSupplier = location.pathname.startsWith('/supplier');
  const isAgent = location.pathname.startsWith('/agent');
  const isAuth = location.pathname === '/login' || location.pathname === '/forgot-password';
  const isDashboard = location.pathname.startsWith('/customer');
  const isCheckout = location.pathname.startsWith('/checkout');
  const isTourDetail = location.pathname.startsWith('/tour/');

  // Dynamic Tenant Branding Styles Override
  useEffect(() => {
    if (!isMaster && tenant) {
      const root = document.documentElement;
      if (tenant.primaryColor) {
        root.style.setProperty('--primary-color', tenant.primaryColor);
      }
      if (tenant.secondaryColor) {
        root.style.setProperty('--secondary-color', tenant.secondaryColor);
      }
    } else {
      const root = document.documentElement;
      root.style.setProperty('--primary-color', '#FF7A00');
      root.style.setProperty('--secondary-color', '#1F3B1F');
    }
  }, [isMaster, tenant]);

  // Track Google Analytics pageviews on route modifications
  useEffect(() => {
    // Initial loading of ga scripts
    initGA();
  }, []);

  useEffect(() => {
    const fullPath = location.pathname + location.search;
    trackGAPageview(fullPath);
    logSimplePageView(fullPath);
  }, [location.pathname, location.search]);

  // Prevent mobile zooming (pinch zoom & double tap auto-zoom)
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    let lastTouchEnd = 0;
    const handleTouchEnd = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        const target = e.target as HTMLElement;
        const isInteractive = 
          target.tagName === 'INPUT' || 
          target.tagName === 'TEXTAREA' || 
          target.tagName === 'SELECT' || 
          target.isContentEditable ||
          target.closest('button') ||
          target.closest('a') ||
          target.closest('.interactive');
        
        if (!isInteractive) {
          e.preventDefault();
        }
      }
      lastTouchEnd = now;
    };

    const handleGestureStart = (e: Event) => {
      e.preventDefault();
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    document.addEventListener('gesturestart', handleGestureStart, { passive: false });
    document.addEventListener('gesturechange', handleGestureStart, { passive: false });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('gesturestart', handleGestureStart);
      document.removeEventListener('gesturechange', handleGestureStart);
    };
  }, []);
  
  // Hide main nav components on certain pages
  const hideMainLayout = isAdmin || isSupplier || isAgent || isAuth;
  const hideMobileNav = hideMainLayout || isTourDetail || isCheckout;
  const hideFooter = hideMainLayout || isDashboard;

  if (tenantLoading || settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader />
      </div>
    );
  }

  if (isMaster) {
    return (
      <div className="flex min-h-screen flex-col font-sans antialiased text-gray-100 bg-[#070b13] w-full max-w-full overflow-x-hidden">
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="/admin/*" element={<SaaSSuperAdmin />} />
            <Route path="/superadmin/*" element={<SaaSSuperAdmin />} />
            <Route path="/login" element={<SaaSHome />} />
            <Route path="/signup" element={<SaaSHome />} />
            
            {/* SaaS App Gate (Legacy Mode) */}
            {isAppGate && (
              <>
                <Route path="/" element={<SaaSHome />} />
                <Route path="*" element={<SaaSHome />} />
              </>
            )}

            {/* SaaS Marketing Site (Wrapped with Global Header/Footer Layout) */}
            {!isAppGate && (
              <Route element={<SaaSLayout />}>
                <Route path="/" element={<SaaSMarketing />} />
                <Route path="/directory" element={<SaaSShowcase />} />
                <Route path="/features" element={<SaaSFeatures />} />
                <Route path="/features/ai" element={<AIFeatures />} />
                <Route path="/features/operations" element={<OperationsFeatures />} />
                <Route path="/features/sales" element={<SalesFeatures />} />
                <Route path="/features/design" element={<DesignFeatures />} />
                <Route path="/features/infrastructure" element={<InfrastructureFeatures />} />
                
                <Route path="/pricing" element={<SaaSPricing />} />
                <Route path="/about" element={<SaaSAbout />} />
                <Route path="/contact" element={<SaaSContact />} />
                <Route path="/terms" element={<SaaSTerms />} />
                <Route path="/privacy" element={<SaaSPrivacy />} />
                <Route path="/cookies" element={<SaasCookies />} />
                <Route path="*" element={<SaaSMarketing />} />
              </Route>
            )}
          </Routes>
        </Suspense>
      </div>
    );
  }

  // Enforce Trial, Inactive, Suspended states
  const getDynamicStatus = (t: any): 'trial' | 'active' | 'inactive' | 'suspended' => {
    if (t.status === 'suspended') return 'suspended';
    
    const now = new Date();
    const createdDate = new Date(t.createdAt || Date.now());
    const trialEndsDate = t.trialEnds ? new Date(t.trialEnds) : new Date(createdDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    if (t.status === 'trial' || !t.status || t.status === 'pending') {
      if (now <= trialEndsDate) {
        return 'trial';
      }
      
      const gracePeriodEndsDate = new Date(trialEndsDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      if (now <= gracePeriodEndsDate) {
        return 'inactive';
      }
      
      return 'suspended';
    }
    
    if (t.status === 'inactive') {
      const gracePeriodEndsDate = new Date(trialEndsDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      if (now <= gracePeriodEndsDate) {
        return 'inactive';
      }
      return 'suspended';
    }
    
    return 'active';
  };

  const dynamicStatus = !isMaster && tenant ? getDynamicStatus(tenant) : 'active';

  // Completely block visitor access if suspended
  if (!isMaster && tenant && dynamicStatus === 'suspended') {
    return (
      <div className="min-h-screen bg-[#070b13] text-gray-100 flex flex-col items-center justify-center p-6 text-center font-sans antialiased">
        <div className="max-w-md w-full bg-[#0b0f19] border border-red-500/20 p-8 rounded-2xl shadow-2xl space-y-6 animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-white uppercase">Workspace Suspended</h1>
          <p className="text-sm text-gray-400 leading-relaxed">
            This page is suspended. Please contact administrator.
          </p>
          <div className="pt-4 border-t border-gray-850">
            <p className="text-[10px] text-gray-500 font-mono">
              Workspace: {tenant.companyName} ({tenant.slug})
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isInactive = !isMaster && tenant && dynamicStatus === 'inactive';

  return (
    <div className={cn(
      "flex min-h-screen flex-col font-sans antialiased text-gray-900 bg-white w-full max-w-full",
      !isTourDetail && "overflow-x-hidden",
      !hideMobileNav && "pb-[72px] md:pb-0"
    )}>
      {isInactive && (
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white text-center py-2.5 px-4 text-xs font-bold flex items-center justify-center space-x-2 z-[9999] relative shadow-md">
          <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] uppercase font-black">Notice</span>
          <span>Subscription payment is required to activate this workspace. Your free trial period has expired, but your site remains active. Please update your billing details.</span>
        </div>
      )}
      {!hideMainLayout && <div className="no-print"><Header /></div>}
      <main className={cn(
        "flex-1",
        !hideMainLayout && !isDashboard && (
          isCheckout ? "md:pt-[120px]" : 
          isTourDetail ? "pt-16 md:pt-[120px]" : 
          "pt-[80px] md:pt-[120px]"
        )
      )}>
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="/login" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/customer" element={<DashboardLayout />}>
              <Route path="dashboard" element={<Overview />} />
              <Route path="bookings" element={<Bookings />} />
              <Route path="wishlist" element={<Wishlist />} />
              <Route path="my-plans" element={<MyPlans />} />
              <Route path="profile" element={<Profile />} />
              <Route path="tickets" element={<Tickets />} />
              <Route path="google-analytics" element={<GoogleAnalytics />} />
            </Route>
            <Route path="/" element={<Home />} />
            <Route path="/tours" element={<Tours />} />
            <Route path="/blog" element={<BlogArchive />} />
            <Route path="/blog/:slug" element={<BlogPostDetail />} />
            <Route path="/about" element={<About />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/planner" element={<AIPlanner />} />
            <Route path="/ai-hub" element={<AIHub />} />
            <Route path="/price-list" element={<PriceList />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/destinations" element={<Destinations />} />
            <Route path="/tour/:slug" element={<TourDetail />} />
            <Route path="/checkout/:tourId" element={<Checkout />} />
            <Route path="/admin/*" element={<Admin />} />
            <Route path="/supplier/*" element={<Admin />} />
            <Route path="/agent/*" element={<Admin />} />
            <Route path="/track-booking" element={<BookingTracker />} />
            <Route path="/booking-success/:id" element={<BookingSuccess />} />
            <Route path="/booking-confirmation/:id" element={<BookingSuccess />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </Suspense>
      </main>
      {!hideFooter && <div className="no-print"><Footer /></div>}
      {!hideMobileNav && <div className="no-print"><MobileNav /></div>}
      <Suspense fallback={null}>
        <Chatbot />
      </Suspense>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <TenantProvider>
        <SettingsProvider>
          <AuthProvider>
            <CurrencyProvider>
              <ScrollToTop />
              <GlobalPopup />
              <AppContent />
            </CurrencyProvider>
          </AuthProvider>
        </SettingsProvider>
      </TenantProvider>
    </Router>
  );
}
