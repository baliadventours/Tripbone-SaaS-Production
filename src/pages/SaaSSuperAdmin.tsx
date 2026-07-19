import React, { useState, useEffect } from 'react';
import { db, collection, getDocs, updateDoc, doc, addDoc, auth, deleteDoc } from '../lib/firebase';
import { signInWithEmailAndPassword, signOut, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { getDoc, setDoc } from 'firebase/firestore';
import { useTenant } from '../lib/TenantContext';
import { uploadImage } from '../lib/imgbb';
import { LogOut, Lock, Loader2 } from 'lucide-react';
import { 
  Building, 
  Users, 
  TrendingUp, 
  ShieldAlert, 
  Layers, 
  Power, 
  Eye, 
  Plus, 
  HelpCircle, 
  Megaphone, 
  DollarSign, 
  LineChart, 
  CheckCircle, 
  AlertTriangle,
  Search,
  BookOpen,
  Calendar,
  Sparkles,
  Settings,
  CreditCard,
  Tag,
  Globe,
  Activity,
  Shield,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Moon,
  Sun,
  Trash2,
  X,
  Mail,
  Save,
  Image,
  Link2,
  Menu,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Tenant } from '../types';
import { createCreemCheckoutSession } from '../services/creemService';
import { MailjetTester } from '../components/Admin/MailjetTester';

export default function SaaSSuperAdmin() {
  const { setPreviewTenant } = useTenant();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'overview' | 
    'workspaces' | 'resource_usage' | 
    'operators' | 'end_users' | 
    'packages' | 'transactions' | 'coupons' |
    'tickets' | 'announcements' |
    'integrations' | 'branding' | 'mailjet' | 'security' | 'showcase'
  >('overview');

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // UI States
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('tripbone_superadmin_theme') === 'dark' || false;
  });
  
  // Modal States
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenantModalTab, setTenantModalTab] = useState<'overview' | 'billing' | 'transactions'>('overview');

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('tripbone_superadmin_theme', next ? 'dark' : 'light');
      return next;
    });
  };

  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    network: true,
    customers: false,
    billing: false,
    support: false,
    system: false
  });

  const toggleMenu = (menu: string) => {
    setExpandedMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  // Security and Auth States
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authenticating, setAuthenticating] = useState(false);

  // OTP security states
  const [isOtpPending, setIsOtpPending] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [tempSuperadminUser, setTempSuperadminUser] = useState<any | null>(null);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalTenants: 0,
    activeTenants: 0,
    suspendedTenants: 0,
    totalMRR: 0,
    avgUsage: 0,
    todayRevenue: 0,
    pendingTicketsCount: 0,
    urgentTicketsCount: 0
  });

  // Coupons
  const [coupons, setCoupons] = useState<any[]>([]);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discountType: 'percentage',
    discountValue: 10,
    isActive: true,
    minBookingValue: 0
  });
  const [isCreatingCoupon, setIsCreatingCoupon] = useState(false);

  // Brand configurations
  const [globalBrand, setGlobalBrand] = useState({
    platformName: 'Tripbone SaaS',
    tagline: 'Secure Enterprise Sandbox',
    supportEmail: 'support@tripbone.com',
    copyright: '© 2026 PT Tripbone Indonesia',
    logoUrl: '',
    faviconUrl: ''
  });
  const [savingBrand, setSavingBrand] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);

  // Bookings list
  const [bookings, setBookings] = useState<any[]>([]);
  // Tours list
  const [tours, setTours] = useState<any[]>([]);

  // Transactions tracking states
  const [txSearch, setTxSearch] = useState('');
  const [txStatusFilter, setTxStatusFilter] = useState('all');

  // Showcases list & states
  const [showcases, setShowcases] = useState<any[]>([]);
  const [editingShowcaseId, setEditingShowcaseId] = useState<string | null>(null);
  const [savingShowcase, setSavingShowcase] = useState(false);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [newShowcase, setNewShowcase] = useState({
    title: '',
    description: '',
    url: '',
    screenshotUrl: '',
    weight: 0
  });

  useEffect(() => {
    if (globalBrand.faviconUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = globalBrand.faviconUrl;
    }
  }, [globalBrand.faviconUrl]);

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const url = await uploadImage(file);
      setGlobalBrand(prev => ({ ...prev, logoUrl: url }));
    } catch (err: any) {
      console.error('Failed to upload logo:', err);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleUploadFavicon = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFavicon(true);
    try {
      const url = await uploadImage(file);
      setGlobalBrand(prev => ({ ...prev, faviconUrl: url }));
    } catch (err: any) {
      console.error('Failed to upload favicon:', err);
    } finally {
      setUploadingFavicon(false);
    }
  };

  const getNextBillingDate = (tenant: any) => {
    let createdAtStr = tenant.createdAt;
    if (!createdAtStr) {
      const fallbackDate = new Date();
      fallbackDate.setMonth(fallbackDate.getMonth() - 2);
      createdAtStr = fallbackDate.toISOString();
    }
    const createdDate = new Date(createdAtStr);
    if (isNaN(createdDate.getTime())) {
      return 'N/A';
    }
    
    const billingInterval = tenant.billingInterval || 'monthly';
    if (billingInterval === 'lifetime') return 'Never (Lifetime)';
    
    const now = new Date();
    let nextBilling = new Date(createdDate);
    
    let safetyCounter = 0;
    while (nextBilling <= now && safetyCounter < 100) {
      safetyCounter++;
      if (billingInterval === 'annual') {
        nextBilling.setFullYear(nextBilling.getFullYear() + 1);
      } else {
        nextBilling.setMonth(nextBilling.getMonth() + 1);
      }
    }
    
    return nextBilling.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Announcements form
  const [announcement, setAnnouncement] = useState({
    title: '',
    content: '',
    category: 'system' as 'system' | 'update' | 'marketing'
  });

  const [announcements, setAnnouncements] = useState<any[]>([]);

  // Tickets
  const [tickets, setTickets] = useState<any[]>([]);
  
  // Users list
  const [users, setUsers] = useState<any[]>([]);

  // Packages list & Create Form States
  const [packages, setPackages] = useState<any[]>([]);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [newPackage, setNewPackage] = useState({
    name: '',
    slug: '',
    interval: 'monthly',
    price: 0,
    productId: '',
    featuresString: '',
    maxTours: 10,
    maxBookings: 100,
    isActive: true
  });

  // Manual Customer Creation
  const [isManualCustomerModalOpen, setIsManualCustomerModalOpen] = useState(false);
  const [manualCustomerForm, setManualCustomerForm] = useState({ companyName: '', slug: '', adminEmail: '', plan: 'starter', duration: 'monthly' });
  const [generatedInvoiceLink, setGeneratedInvoiceLink] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [isManualCreating, setIsManualCreating] = useState(false);

  // Delete Customer
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Integrations settings state
  const [globalSettings, setGlobalSettings] = useState<any>({
    tripayMerchantCode: '',
    tripayApiKey: '',
    tripayPrivateKey: '',
    tripayMode: 'sandbox',
    manualBankInstructions: 'Bank Central Asia (BCA)\nAccount Number: 123-456-7890\nAccount Name: PT Tripbone Indonesia\n\nAfter making the payment, please email your transaction receipt to baliadventours@gmail.com along with your workspace name.',
    creemApiKey: '',
    creemMode: 'test'
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const handleSaveGlobalSettings = async () => {
    setSavingSettings(true);
    setError(null);
    setSuccess(null);
    try {
      await setDoc(doc(db, 'communicationSettings', 'global'), {
        tripayMerchantCode: globalSettings.tripayMerchantCode || '',
        tripayApiKey: globalSettings.tripayApiKey || '',
        tripayPrivateKey: globalSettings.tripayPrivateKey || '',
        tripayMode: globalSettings.tripayMode || 'sandbox',
        manualBankInstructions: globalSettings.manualBankInstructions || '',
        creemApiKey: globalSettings.creemApiKey || '',
        creemMode: globalSettings.creemMode || 'test',
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setSuccess('Global integration settings saved successfully!');
    } catch (err: any) {
      console.error("Error saving global settings:", err);
      setError('Failed to save settings: ' + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  // 1. Auth Listener to verify Superadmin status
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setIsAuthorized(false);
        setIsOtpPending(false);
        setTempSuperadminUser(null);
        setGeneratedOtp('');
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data();
        const role = userData?.role;

        const isMasterAdminEmail = user.email && (
          user.email.toLowerCase() === 'baliadventours@gmail.com' ||
          user.email.toLowerCase() === (import.meta.env.VITE_ADMIN_EMAIL || '').toLowerCase()
        );

        if (role === 'superadmin' || isMasterAdminEmail) {
          // Check if OTP was already verified during this session
          const isOtpVerified = sessionStorage.getItem(`tripbone_superadmin_otp_verified_${user.uid}`) === 'true';
          
          if (isOtpVerified) {
            setIsAuthorized(true);
            setIsOtpPending(false);
          } else {
            // Need OTP verification!
            setTempSuperadminUser(user);
            setIsOtpPending(true);
            setIsAuthorized(false);
          }
        } else {
          console.warn("Unauthorized access attempt to superadmin dashboard:", user.email);
          setAuthError("Access Denied. Your account is not authorized as a SaaS Super Administrator.");
          setIsAuthorized(false);
          setIsOtpPending(false);
          setTempSuperadminUser(null);
          await signOut(auth);
        }
      } catch (err) {
        console.error("Error verifying superadmin role:", err);
        setIsAuthorized(false);
        setIsOtpPending(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Load SaaS control center data (ONLY if authorized!)
  useEffect(() => {
    if (isAuthorized !== true) return;

    async function loadData() {
      setLoading(true);
      try {
        // Load Tenants
        const tenantSnapshot = await getDocs(collection(db, 'tenants'));
        const tenantList: Tenant[] = [];
        tenantSnapshot.forEach((snap) => {
          const data = snap.data();
          tenantList.push({ 
            id: snap.id, 
            status: data.status || 'active', // Default to active if missing
            ...data 
          } as Tenant);
        });
        setTenants(tenantList);

        // Load Announcements
        const annSnapshot = await getDocs(collection(db, 'announcements'));
        const annList: any[] = [];
        annSnapshot.forEach((snap) => {
          annList.push({ id: snap.id, ...snap.data() });
        });
        setAnnouncements(annList);

        // Load Tickets
        const tixSnapshot = await getDocs(collection(db, 'supportTickets'));
        const tixList: any[] = [];
        tixSnapshot.forEach((snap) => {
          tixList.push({ id: snap.id, ...snap.data() });
        });
        setTickets(tixList);

        // Load Users
        const userSnapshot = await getDocs(collection(db, 'users'));
        const userList: any[] = [];
        userSnapshot.forEach((snap) => {
          userList.push({ id: snap.id, ...snap.data() });
        });
        setUsers(userList);

        // Load Coupons
        try {
          const couponsSnapshot = await getDocs(collection(db, 'coupons'));
          const couponsList: any[] = [];
          couponsSnapshot.forEach((snap) => {
            couponsList.push({ id: snap.id, ...snap.data() });
          });
          setCoupons(couponsList);
        } catch (couponErr) {
          console.error("Error loading coupons:", couponErr);
        }

        // Load Brand Settings
        try {
          const brandSnap = await getDoc(doc(db, 'settings', 'globalBrand'));
          if (brandSnap.exists()) {
            setGlobalBrand((prev: any) => ({
              ...prev,
              ...brandSnap.data()
            }));
          }
        } catch (brandErr) {
          console.error("Error loading brand settings:", brandErr);
        }

        // Load Global Integration Settings from communicationSettings/global
        try {
          const globalSnap = await getDoc(doc(db, 'communicationSettings', 'global'));
          if (globalSnap.exists()) {
            const data = globalSnap.data();
            setGlobalSettings((prev: any) => ({
              ...prev,
              tripayMerchantCode: data.tripayMerchantCode || '',
              tripayApiKey: data.tripayApiKey || '',
              tripayPrivateKey: data.tripayPrivateKey || '',
              tripayMode: data.tripayMode || 'sandbox',
              manualBankInstructions: data.manualBankInstructions || 'Bank Central Asia (BCA)\nAccount Number: 123-456-7890\nAccount Name: PT Tripbone Indonesia\n\nAfter making the payment, please email your transaction receipt to baliadventours@gmail.com along with your workspace name.',
              creemApiKey: data.creemApiKey || '',
              creemMode: data.creemMode || 'test'
            }));
          }
        } catch (err) {
          console.error("Error loading global integration settings:", err);
        }

        // Load Packages & Auto-Seed if empty
        const pkgSnapshot = await getDocs(collection(db, 'billingPlans'));
        let pkgList: any[] = [];
        pkgSnapshot.forEach((snap) => {
          const data = snap.data();
          pkgList.push({ id: snap.id, ...data, interval: data.interval || 'monthly' });
        });

        if (pkgList.length === 0) {
          console.log("[Superadmin Seeding] billingPlans collection is empty. Auto-seeding defaults...");
          const defaults = [
            {
              name: 'Starter Plan',
              slug: 'starter',
              price: 49,
              interval: 'monthly',
              creemProductId: 'prod_starter_123',
              features: ['1 Staging Domain', 'Up to 5 tours', 'Dynamic Bookings Manager', 'Standard Support'],
              maxTours: 5,
              maxBookings: 50,
              isActive: true,
              createdAt: new Date().toISOString()
            },
            {
              name: 'Professional Plan',
              slug: 'professional',
              price: 99,
              interval: 'monthly',
              creemProductId: 'prod_professional_123',
              features: ['Custom Domain Mapping', 'Up to 15 tours', 'WhatsApp Notifications Integration', 'Premium AI Planning Assistant'],
              maxTours: 15,
              maxBookings: 500,
              isActive: true,
              createdAt: new Date().toISOString()
            },
            {
              name: 'Business Plan',
              slug: 'business',
              price: 199,
              interval: 'monthly',
              creemProductId: 'prod_business_123',
              features: ['Multi-Region Dispatch Logs', 'Unlimited tours', 'Dedicated Supplier Portals', 'Whitelabel Custom Theme Customizer'],
              maxTours: 999,
              maxBookings: 9999,
              isActive: true,
              createdAt: new Date().toISOString()
            }
          ];

          for (const plan of defaults) {
            const added = await addDoc(collection(db, 'billingPlans'), plan);
            pkgList.push({ id: added.id, ...plan });
          }
        }
        setPackages(pkgList);

        // Load Bookings (Transactions)
        try {
          const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
          const bookingsList: any[] = [];
          bookingsSnapshot.forEach((snap) => {
            bookingsList.push({ id: snap.id, ...snap.data() });
          });
          setBookings(bookingsList);
        } catch (bookingErr) {
          console.error("Error loading bookings:", bookingErr);
        }

        // Load Tours
        try {
          const toursSnapshot = await getDocs(collection(db, 'tours'));
          const toursList: any[] = [];
          toursSnapshot.forEach((snap) => {
            toursList.push({ id: snap.id, ...snap.data() });
          });
          setTours(toursList);
        } catch (tourErr) {
          console.error("Error loading tours:", tourErr);
        }

        // Load Client Showcases
        try {
          const showcaseSnapshot = await getDocs(collection(db, 'clientShowcase'));
          const showcaseList: any[] = [];
          showcaseSnapshot.forEach((snap) => {
            showcaseList.push({ id: snap.id, ...snap.data() });
          });
          setShowcases(showcaseList);
        } catch (showcaseErr) {
          console.error("Error loading showcases:", showcaseErr);
        }

        // Calculate Stats
        const total = tenantList.length;
        const active = tenantList.filter(t => t.status === 'active').length;
        const suspended = tenantList.filter(t => t.status === 'suspended').length;
        
        let mrr = 0;
        tenantList.forEach(t => {
          if (t.status === 'active') {
            const matchPlans = pkgList.filter(p => p.slug === t.plan);
            const matchPlan = matchPlans.find(p => p.interval === 'monthly') || matchPlans[0];
            if (matchPlan) {
              mrr += Number(matchPlan.monthlyPrice !== undefined ? matchPlan.monthlyPrice : (matchPlan.price || 0));
            } else {
              if (t.plan === 'starter') mrr += 49;
              else if (t.plan === 'professional') mrr += 99;
              else if (t.plan === 'business') mrr += 199;
              else if (t.plan === 'agency') mrr += 399;
              else if (t.plan === 'enterprise') mrr += 999;
            }
          }
        });

        const todayStr = new Date().toISOString().split('T')[0];
        const tenantsCreatedToday = tenantList.filter(t => t.createdAt && t.createdAt.startsWith(todayStr) && t.status === 'active');
        let todayRevSum = 0;
        tenantsCreatedToday.forEach(t => {
          const matchPlans = pkgList.filter(p => p.slug === t.plan);
          const matchPlan = matchPlans.find(p => p.interval === 'monthly') || matchPlans[0];
          if (matchPlan) {
            todayRevSum += Number(matchPlan.monthlyPrice !== undefined ? matchPlan.monthlyPrice : (matchPlan.price || 0));
          } else {
            if (t.plan === 'starter') todayRevSum += 49;
            else if (t.plan === 'professional') todayRevSum += 99;
            else if (t.plan === 'business') todayRevSum += 199;
            else if (t.plan === 'agency') todayRevSum += 399;
            else if (t.plan === 'enterprise') todayRevSum += 999;
          }
        });

        // calculate pending tickets
        const pendingTix = tixList.filter(t => t.status === 'open' || t.status === 'pending').length;
        const urgentTix = tixList.filter(t => (t.status === 'open' || t.status === 'pending') && (t.category === 'Booking' || t.category === 'Payment')).length;

        setStats({
          totalTenants: total,
          activeTenants: active,
          suspendedTenants: suspended,
          totalMRR: mrr,
          avgUsage: total > 0 ? Math.round((active / total) * 100) : 0,
          todayRevenue: todayRevSum,
          pendingTicketsCount: pendingTix,
          urgentTicketsCount: urgentTix
        });

      } catch (err) {
        console.error('Error loading super admin data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [isAuthorized]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;

    setAuthError(null);
    setAuthenticating(true);
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'Authentication failed. Please check your credentials.');
      setAuthenticating(false);
    }
  };

  const sendSuperadminOtp = async (email: string) => {
    setSendingOtp(true);
    setOtpError(null);
    try {
      // Generate a secure random 6 digit OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(code);

      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          otp: code,
          tenantId: 'global'
        }),
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to dispatch security code.');
      }

      if (resData.fallback) {
        console.log(`[Superadmin OTP fallback] Security Code: ${code}`);
      }
    } catch (err: any) {
      console.error('Error sending OTP:', err);
      setOtpError('Error sending verification code: ' + err.message);
    } finally {
      setSendingOtp(false);
    }
  };

  useEffect(() => {
    if (tempSuperadminUser && tempSuperadminUser.email && !generatedOtp && !sendingOtp) {
      sendSuperadminOtp(tempSuperadminUser.email);
    }
  }, [tempSuperadminUser, generatedOtp]);

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);
    if (!otpCode) return;

    if (otpCode.trim() === generatedOtp) {
      if (tempSuperadminUser) {
        sessionStorage.setItem(`tripbone_superadmin_otp_verified_${tempSuperadminUser.uid}`, 'true');
        setIsAuthorized(true);
        setIsOtpPending(false);
      }
    } else {
      setOtpError('Invalid verification code. Please check the code and try again.');
    }
  };

  const handleResendOtp = () => {
    setGeneratedOtp('');
    setOtpCode('');
    setOtpError(null);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordError('All password fields are required.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    setUpdatingPassword(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('No authenticated superadmin user session found.');
      }

      // 1. Re-authenticate the user first to make sure their session is fresh
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // 2. Update the password
      await updatePassword(user, newPassword);

      setPasswordSuccess('Superadmin password changed successfully! Your secure credentials are now active.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      console.error('Password change error:', err);
      setPasswordError(err.message || 'Failed to change password. Please verify your current password.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const changeTenantStatus = async (tenantId: string, nextStatus: Tenant['status']) => {
    try {
      await updateDoc(doc(db, 'tenants', tenantId), {
        status: nextStatus,
        updatedAt: new Date()
      });

      // Update state
      setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, status: nextStatus } : t));
    } catch (err) {
      console.error('Error updating tenant status:', err);
    }
  };

  const toggleTenantStatus = async (tenantId: string, currentStatus: Tenant['status']) => {
    try {
      const nextStatus: Tenant['status'] = currentStatus === 'active' ? 'suspended' : 'active';
      await changeTenantStatus(tenantId, nextStatus);
    } catch (err) {
      console.error('Error updating tenant status:', err);
    }
  };

  const handleManualCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsManualCreating(true);
    setGeneratedInvoiceLink('');
    try {
      setIsManualCreating(true);
      setError(null);
      let planPkg = packages.find(p => p.slug === manualCustomerForm.plan && p.interval === manualCustomerForm.duration);
      if (!planPkg) {
        planPkg = packages.find(p => p.slug === manualCustomerForm.plan);
      }
      if (!planPkg) {
        planPkg = { slug: manualCustomerForm.plan, productId: manualCustomerForm.plan };
      }
      
      const checkoutProductId = planPkg.productId || planPkg.slug;
      
      const tempPassword = Math.random().toString(36).slice(-8) + "!";
      setGeneratedPassword(tempPassword);

      // Provision workspace securely via backend (creates Auth user + Firestore docs)
      const resProvision = await fetch('/api/provision-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: manualCustomerForm.adminEmail,
          adminPassword: tempPassword,
          companyName: manualCustomerForm.companyName,
          slug: manualCustomerForm.slug,
          plan: manualCustomerForm.plan,
          adminName: 'Admin',
          status: 'pending_payment'
        })
      });

      const provisionData = await resProvision.json();
      if (!resProvision.ok || !provisionData.success) {
        throw new Error(provisionData.error || 'Failed to provision workspace.');
      }

      const newTenantId = provisionData.tenantId;
      
      const host = window.location.host;
      const protocol = window.location.protocol;
      const cleanHost = host.replace(/^(www)\./, '').replace(/^(app)\./, '');
      const successUrl = `${protocol}//app.${cleanHost}/?billing_setup=success&tenant=${manualCustomerForm.slug}`;
      
      // Generate Invoice
      const res = await createCreemCheckoutSession({
        productId: checkoutProductId,
        successUrl: successUrl,
        email: manualCustomerForm.adminEmail,
        tenantId: newTenantId
      });
      
      setGeneratedInvoiceLink(res.checkout_url || res.url);
      
      // Update local state to reflect new tenant
      setTenants(prev => [...prev, {
        id: newTenantId,
        companyName: manualCustomerForm.companyName,
        slug: manualCustomerForm.slug,
        adminEmail: manualCustomerForm.adminEmail,
        plan: manualCustomerForm.plan,
        status: 'pending_payment'
      } as any]);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error creating customer manually');
    } finally {
      setIsManualCreating(false);
    }
  };

  const updateTenantPlan = async (tenantId: string, newPlan: Tenant['plan']) => {
    try {
      await updateDoc(doc(db, 'tenants', tenantId), {
        plan: newPlan,
        updatedAt: new Date()
      });
      setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, plan: newPlan } : t));
      if (selectedTenant && selectedTenant.id === tenantId) {
        setSelectedTenant({ ...selectedTenant, plan: newPlan });
      }
    } catch (err) {
      console.error('Error updating tenant plan:', err);
    }
  };

  const deleteTenantWorkspace = async (tenantId: string) => {
    if (!window.confirm('Are you absolutely sure you want to delete this workspace? This action is irreversible.')) return;
    try {
      await deleteDoc(doc(db, 'tenants', tenantId));
      setTenants(prev => prev.filter(t => t.id !== tenantId));
      if (selectedTenant && selectedTenant.id === tenantId) {
        setIsTenantModalOpen(false);
        setSelectedTenant(null);
      }
    } catch (err) {
      console.error('Error deleting tenant:', err);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcement.title || !announcement.content) return;

    try {
      const newAnn = {
        title: announcement.title,
        content: announcement.content,
        category: announcement.category,
        createdAt: new Date(),
        author: 'Platform System Admin'
      };

      const docRef = await addDoc(collection(db, 'announcements'), newAnn);
      setAnnouncements(prev => [{ id: docRef.id, ...newAnn }, ...prev]);
      setAnnouncement({ title: '', content: '', category: 'system' });
    } catch (err) {
      console.error('Error creating announcement:', err);
    }
  };

  const handleResolveTicket = async (ticketId: string) => {
    try {
      await updateDoc(doc(db, 'supportTickets', ticketId), {
        status: 'resolved',
        updatedAt: new Date()
      });
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: 'resolved' } : t));
    } catch (err) {
      console.error('Error resolving ticket:', err);
    }
  };

  const handleSaveShowcase = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingShowcase(true);
    try {
      const showcaseData = {
        title: newShowcase.title,
        description: newShowcase.description,
        url: newShowcase.url,
        screenshotUrl: newShowcase.screenshotUrl,
        weight: Number(newShowcase.weight) || 0,
        updatedAt: new Date().toISOString()
      };

      if (editingShowcaseId) {
        await setDoc(doc(db, 'clientShowcase', editingShowcaseId), showcaseData, { merge: true });
        setShowcases(prev => prev.map(item => item.id === editingShowcaseId ? { ...item, ...showcaseData } : item));
        setSuccess('🎉 Showcase item updated successfully!');
      } else {
        const docRef = await addDoc(collection(db, 'clientShowcase'), {
          ...showcaseData,
          createdAt: new Date().toISOString()
        });
        setShowcases(prev => [...prev, { id: docRef.id, ...showcaseData, createdAt: new Date().toISOString() }]);
        setSuccess('🎉 Showcase item created successfully!');
      }

      setNewShowcase({
        title: '',
        description: '',
        url: '',
        screenshotUrl: '',
        weight: 0
      });
      setEditingShowcaseId(null);
    } catch (err: any) {
      setError('Failed to save showcase: ' + err.message);
    } finally {
      setSavingShowcase(false);
    }
  };

  const handleEditShowcaseClick = (item: any) => {
    setEditingShowcaseId(item.id);
    setNewShowcase({
      title: item.title || '',
      description: item.description || '',
      url: item.url || '',
      screenshotUrl: item.screenshotUrl || '',
      weight: item.weight || 0
    });
  };

  const handleDeleteShowcase = async (showcaseId: string) => {
    if (!window.confirm('Are you sure you want to delete this showcase item?')) return;
    try {
      await deleteDoc(doc(db, 'clientShowcase', showcaseId));
      setShowcases(prev => prev.filter(item => item.id !== showcaseId));
      setSuccess('🎉 Showcase item deleted successfully!');
    } catch (err: any) {
      setError('Failed to delete showcase: ' + err.message);
    }
  };

  const handleUploadShowcaseScreenshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingScreenshot(true);
    try {
      const url = await uploadImage(file);
      setNewShowcase(prev => ({ ...prev, screenshotUrl: url }));
      setSuccess('🎉 Screenshot uploaded successfully!');
    } catch (err: any) {
      setError('Failed to upload screenshot: ' + err.message);
    } finally {
      setUploadingScreenshot(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!tenantToDelete) return;
    setIsDeletingCustomer(true);
    setError(null);
    try {
      const response = await fetch('/api/delete-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: tenantToDelete.id })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete workspace.');
      }
      setTenants(tenants.filter(t => t.id !== tenantToDelete.id));
      setSuccess(`Workspace for ${tenantToDelete.companyName} completely deleted.`);
    } catch (err: any) {
      console.error("Delete customer error:", err);
      setError(err.message || 'Error deleting workspace.');
    } finally {
      setIsDeletingCustomer(false);
      setTenantToDelete(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This action is irreversible.')) return;
    try {
      const response = await fetch('/api/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: userId })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete user.');
      }
      setUsers(prev => prev.filter(u => u.id !== userId));
      setSuccess('User successfully deleted.');
    } catch (err: any) {
      console.error('Error deleting user:', err);
      setError(err.message || 'Error deleting user.');
    }
  };

  const handleEditUser = async (userId: string, currentName: string) => {
    const newName = window.prompt("Edit Display Name:", currentName);
    if (newName && newName !== currentName) {
      try {
        await updateDoc(doc(db, 'users', userId), {
          displayName: newName,
          updatedAt: new Date().toISOString()
        });
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, displayName: newName } : u));
        setSuccess('User updated successfully.');
      } catch (err: any) {
        console.error('Error updating user:', err);
        setError('Error updating user.');
      }
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
        updatedAt: new Date().toISOString()
      });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error('Error updating user role:', err);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: string) => {
    try {
      const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
      await updateDoc(doc(db, 'users', userId), {
        status: nextStatus,
        updatedAt: new Date().toISOString()
      });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: nextStatus } : u));
    } catch (err) {
      console.error('Error toggling user status:', err);
    }
  };

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPackage.name || !newPackage.slug) return;

    try {
      const planDoc = {
        name: newPackage.name,
        slug: newPackage.slug.toLowerCase().trim(),
        interval: newPackage.interval,
        price: Number(newPackage.price),
        productId: newPackage.productId.trim(),
        features: newPackage.featuresString
          ? newPackage.featuresString.split(',').map(f => f.trim()).filter(Boolean)
          : [],
        maxTours: Number(newPackage.maxTours),
        maxBookings: Number(newPackage.maxBookings),
        isActive: newPackage.isActive,
      };

      if (editingPackageId) {
        await updateDoc(doc(db, 'billingPlans', editingPackageId), { ...planDoc, updatedAt: new Date().toISOString() });
        setPackages(prev => prev.map(p => p.id === editingPackageId ? { ...p, ...planDoc } : p));
      } else {
        const docRef = await addDoc(collection(db, 'billingPlans'), { ...planDoc, createdAt: new Date().toISOString() });
        setPackages(prev => [{ id: docRef.id, ...planDoc, createdAt: new Date().toISOString() }, ...prev]);
      }
      
      // Reset form
      setEditingPackageId(null);
      setNewPackage({
        name: '',
        slug: '',
        interval: 'monthly',
        price: 0,
        productId: '',
        featuresString: '',
        maxTours: 10,
        maxBookings: 100,
        isActive: true
      });
      alert(editingPackageId ? 'Subscription package successfully updated!' : 'Subscription package successfully created & integrated!');
    } catch (err) {
      console.error('Error saving package:', err);
      alert('Failed to save package. Ensure you have the right permissions: ' + (err as any).message);
    }
  };

  const handleEditPackage = (pkg: any) => {
    setEditingPackageId(pkg.id);
    setNewPackage({
      name: pkg.name || '',
      slug: pkg.slug || '',
      interval: pkg.interval || 'monthly',
      price: pkg.price || 0,
      productId: pkg.productId || '',
      featuresString: pkg.features ? pkg.features.join(', ') : '',
      maxTours: pkg.maxTours || 10,
      maxBookings: pkg.maxBookings || 100,
      isActive: pkg.isActive !== undefined ? pkg.isActive : true
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const togglePackageActive = async (pkgId: string, currentActive: boolean) => {
    try {
      await updateDoc(doc(db, 'billingPlans', pkgId), {
        isActive: !currentActive,
        updatedAt: new Date().toISOString()
      });
      setPackages(prev => prev.map(p => p.id === pkgId ? { ...p, isActive: !currentActive } : p));
    } catch (err) {
      console.error('Error toggling package status:', err);
    }
  };

  const handleDeletePackage = async (pkgId: string) => {
    if (!confirm('Are you sure you want to permanently delete this pricing package?')) return;
    try {
      await deleteDoc(doc(db, 'billingPlans', pkgId));
      setPackages(prev => prev.filter(p => p.id !== pkgId));
    } catch (err) {
      console.error('Error deleting package:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-gray-300 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500" />
          <span className="text-sm tracking-wider font-mono">Loading Super Admin Shell...</span>
        </div>
      </div>
    );
  }

  if (isAuthorized !== true) {
    if (isOtpPending) {
      return (
        <div className="min-h-screen bg-[#060913] flex items-center justify-center px-4 py-12 selection:bg-indigo-500 selection:text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.06),transparent_50%)] pointer-events-none" />
          
          <div className="w-full max-w-md bg-[#0a0f1d] border border-gray-800/80 rounded-[28px] p-8 md:p-10 shadow-2xl relative z-10">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="bg-indigo-500/10 p-4 rounded-2xl border border-indigo-500/20 mb-4 shadow-lg shadow-indigo-500/5">
                <ShieldAlert className="w-7 h-7 text-indigo-400 animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Security Verification</h2>
              <p className="text-xs text-gray-400 mt-1.5 uppercase tracking-widest font-mono">Two-Factor OTP Required</p>
              <p className="text-xs text-gray-400 mt-3 leading-relaxed">
                We have dispatched a 6-digit secure authentication code to <strong className="text-gray-200">{tempSuperadminUser?.email}</strong>.
              </p>
            </div>

            {otpError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-xs px-4 py-3 rounded-xl mb-6 leading-relaxed">
                {otpError}
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <label className="block text-[11px] font-mono font-semibold text-gray-400 uppercase tracking-wider mb-2 text-center">6-Digit Secure Code</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="••••••"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full px-4 py-3 bg-[#0d1428] border border-gray-800/80 rounded-xl text-center text-xl font-mono tracking-[10px] focus:outline-none focus:border-indigo-500 text-white placeholder-gray-700 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={sendingOtp || !otpCode || otpCode.length < 6}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm rounded-xl flex items-center justify-center space-x-2 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
              >
                <span>Verify & Unlock Dashboard</span>
              </button>
            </form>

            <div className="mt-5 text-center flex justify-between text-xs font-semibold">
              <button
                type="button"
                onClick={handleResendOtp}
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Resend Code
              </button>
              <button
                type="button"
                onClick={async () => {
                  setLoading(true);
                  setIsOtpPending(false);
                  setGeneratedOtp('');
                  setTempSuperadminUser(null);
                  await signOut(auth);
                }}
                className="text-gray-400 hover:text-rose-400 transition-colors"
              >
                Back to Login
              </button>
            </div>

            {generatedOtp && (
              <div className="mt-6 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-center">
                <h4 className="text-[11px] font-bold text-indigo-400 mb-1">Sandbox Testing Fallback</h4>
                <p className="text-[10px] text-gray-400 leading-normal mb-2">
                  To ensure full testability in staging/preview, the dispatched verification OTP code is:
                </p>
                <span className="inline-block px-3 py-1.5 bg-[#0d1428] border border-gray-800 rounded-lg text-white font-mono text-base font-bold tracking-[4px]">
                  {generatedOtp}
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#060913] flex items-center justify-center px-4 py-12 selection:bg-indigo-500 selection:text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.06),transparent_50%)] pointer-events-none" />
        
        <div className="w-full max-w-md bg-[#0a0f1d] border border-gray-800/80 rounded-[28px] p-8 md:p-10 shadow-2xl relative z-10">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="bg-indigo-500/10 p-4 rounded-2xl border border-indigo-500/20 mb-4 shadow-lg shadow-indigo-500/5">
              <Lock className="w-7 h-7 text-indigo-400" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">SaaS Control Center</h2>
            <p className="text-xs text-gray-400 mt-1.5 uppercase tracking-widest font-mono">Platform Super Administrator</p>
          </div>

          {authError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-xs px-4 py-3 rounded-xl mb-6 leading-relaxed">
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-[11px] font-mono font-semibold text-gray-400 uppercase tracking-wider mb-2">System Admin E-mail</label>
              <input
                type="email"
                required
                placeholder="admin@tripbone.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full px-4 py-3 bg-[#0d1428] border border-gray-800/80 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-gray-600 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono font-semibold text-gray-400 uppercase tracking-wider mb-2">Master Token / Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[#0d1428] border border-gray-800/80 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-gray-600 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={authenticating || !loginEmail || !loginPassword}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm rounded-xl flex items-center justify-center space-x-2 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 mt-2"
            >
              {authenticating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <span>Authenticate & Access</span>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-800/80">
            <p className="text-[11px] text-indigo-400 font-mono text-center">
              Testing Admin Credentials:<br/>
              <span className="text-white">baliadventours@gmail.com</span> / <span className="text-white">admin123</span>
            </p>
          </div>

          <p className="text-[10px] text-gray-500 font-mono text-center mt-6 leading-normal">
            Unauthorized activity is monitored.<br />
            IP logging and telemetry are active.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex transition-colors duration-200 ${isDarkMode ? 'bg-[#0b0f19] text-slate-100' : 'bg-slate-50 text-gray-900'}`}>
      {/* Sidebar Navigation */}
      <aside className={`transition-all duration-300 ${isSidebarCollapsed ? 'w-20 px-3 py-6' : 'w-64 p-6'} border-r flex flex-col justify-between transition-colors duration-200 ${isDarkMode ? 'border-white/5 bg-[#0b0f19]/80 backdrop-blur-2xl' : 'border-gray-200/50 bg-white/60 backdrop-blur-2xl shadow-[4px_0_24px_rgba(0,0,0,0.02)]'} z-20`}>
        <div className="space-y-8 flex-1 overflow-hidden flex flex-col">
          <div className={`flex items-center ${isSidebarCollapsed ? 'flex-col space-y-4' : 'justify-between'} shrink-0`}>
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-600 p-2 rounded-xl">
                <Layers className="w-5 h-5 text-white" />
              </div>
              {!isSidebarCollapsed && (
                <div>
                  {globalBrand.logoUrl ? (
                    <img src={globalBrand.logoUrl} alt="Logo" className="h-7 max-w-[120px] object-contain" />
                  ) : (
                    <span className={`text-lg font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{globalBrand.platformName || 'Tripbone SaaS'}</span>
                  )}
                  <p className="text-[10px] text-indigo-500 font-bold tracking-widest uppercase mt-0.5">Super Administrator</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={`p-1.5 rounded-lg border ${isDarkMode ? 'border-gray-800 hover:bg-slate-800 text-gray-400' : 'border-gray-200 hover:bg-gray-100 text-gray-600'} transition-colors`}
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          <div className="space-y-4 overflow-y-auto pr-2 scrollbar-hide pb-10 flex-1">
            {/* Overview */}
            <div>
              {!isSidebarCollapsed ? (
                <p className="px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Overview</p>
              ) : (
                <hr className="my-2 border-gray-200 dark:border-white/5" />
              )}
              <button
                onClick={() => setActiveTab('overview')}
                title="Command Center"
                className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-start space-x-3 px-4'} py-2.5 rounded-xl text-sm font-medium transition-colors ${activeTab === 'overview' ? 'bg-indigo-600 text-white' : isDarkMode ? 'text-gray-400 hover:bg-slate-800 hover:text-white' : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-700'}`}
              >
                <Activity className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && <span>Command Center</span>}
              </button>
            </div>

            {/* Network & Sites */}
            <div>
              {!isSidebarCollapsed ? (
                <button onClick={() => toggleMenu('network')} className="w-full flex items-center justify-between px-4 py-2 group">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-indigo-400 transition-colors">Network & Sites</p>
                  {expandedMenus.network ? <ChevronUp className="w-3 h-3 text-gray-400" /> : <ChevronDown className="w-3 h-3 text-gray-400" />}
                </button>
              ) : (
                <hr className="my-2 border-gray-200 dark:border-white/5" />
              )}
              {(expandedMenus.network || isSidebarCollapsed) && (
                <div className="space-y-1 mt-1">
                  <button
                    onClick={() => setActiveTab('workspaces')}
                    title="All Workspaces"
                    className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-start space-x-3 px-4'} py-2.5 rounded-xl text-sm font-medium transition-colors ${activeTab === 'workspaces' ? 'bg-indigo-600 text-white' : isDarkMode ? 'text-gray-400 hover:bg-slate-800 hover:text-white' : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-700'}`}
                  >
                    <Building className="w-4 h-4 shrink-0" />
                    {!isSidebarCollapsed && <span>All Workspaces</span>}
                  </button>
                  <button
                    onClick={() => setActiveTab('resource_usage')}
                    title="Resource Usage"
                    className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-start space-x-3 px-4'} py-2.5 rounded-xl text-sm font-medium transition-colors ${activeTab === 'resource_usage' ? 'bg-indigo-600 text-white' : isDarkMode ? 'text-gray-400 hover:bg-slate-800 hover:text-white' : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-700'}`}
                  >
                    <LineChart className="w-4 h-4 shrink-0" />
                    {!isSidebarCollapsed && <span>Resource Usage</span>}
                  </button>
                  <button
                    onClick={() => setActiveTab('showcase')}
                    title="Client Showcase Manager"
                    className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-start space-x-3 px-4'} py-2.5 rounded-xl text-sm font-medium transition-colors ${activeTab === 'showcase' ? 'bg-indigo-600 text-white' : isDarkMode ? 'text-gray-400 hover:bg-slate-800 hover:text-white' : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-700'}`}
                  >
                    <Image className="w-4 h-4 shrink-0" />
                    {!isSidebarCollapsed && <span>Client Directory</span>}
                  </button>
                </div>
              )}
            </div>

            {/* Customers & Users */}
            <div>
              {!isSidebarCollapsed ? (
                <button onClick={() => toggleMenu('customers')} className="w-full flex items-center justify-between px-4 py-2 group">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-indigo-400 transition-colors">Customers</p>
                  {expandedMenus.customers ? <ChevronUp className="w-3 h-3 text-gray-400" /> : <ChevronDown className="w-3 h-3 text-gray-400" />}
                </button>
              ) : (
                <hr className="my-2 border-gray-200 dark:border-white/5" />
              )}
              {(expandedMenus.customers || isSidebarCollapsed) && (
                <div className="space-y-1 mt-1">
                  <button
                    onClick={() => setActiveTab('operators')}
                    title="Platform Operators"
                    className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-start space-x-3 px-4'} py-2.5 rounded-xl text-sm font-medium transition-colors ${activeTab === 'operators' ? 'bg-indigo-600 text-white' : isDarkMode ? 'text-gray-400 hover:bg-slate-800 hover:text-white' : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-700'}`}
                  >
                    <Users className="w-4 h-4 shrink-0" />
                    {!isSidebarCollapsed && <span>Platform Operators</span>}
                  </button>
                  <button
                    onClick={() => setActiveTab('end_users')}
                    title="Global End-Users"
                    className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-start space-x-3 px-4'} py-2.5 rounded-xl text-sm font-medium transition-colors ${activeTab === 'end_users' ? 'bg-indigo-600 text-white' : isDarkMode ? 'text-gray-400 hover:bg-slate-800 hover:text-white' : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-700'}`}
                  >
                    <Globe className="w-4 h-4 shrink-0" />
                    {!isSidebarCollapsed && <span>Global End-Users</span>}
                  </button>
                </div>
              )}
            </div>

            {/* Billing & Subscriptions */}
            <div>
              {!isSidebarCollapsed ? (
                <button onClick={() => toggleMenu('billing')} className="w-full flex items-center justify-between px-4 py-2 group">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-indigo-400 transition-colors">Billing & Sales</p>
                  {expandedMenus.billing ? <ChevronUp className="w-3 h-3 text-gray-400" /> : <ChevronDown className="w-3 h-3 text-gray-400" />}
                </button>
              ) : (
                <hr className="my-2 border-gray-200 dark:border-white/5" />
              )}
              {(expandedMenus.billing || isSidebarCollapsed) && (
                <div className="space-y-1 mt-1">
                  <button
                    onClick={() => setActiveTab('packages')}
                    title="Packages Manager"
                    className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-start space-x-3 px-4'} py-2.5 rounded-xl text-sm font-medium transition-colors ${activeTab === 'packages' ? 'bg-indigo-600 text-white' : isDarkMode ? 'text-gray-400 hover:bg-slate-800 hover:text-white' : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-700'}`}
                  >
                    <Sparkles className="w-4 h-4 shrink-0" />
                    {!isSidebarCollapsed && <span>Packages Manager</span>}
                  </button>
                  <button
                    onClick={() => setActiveTab('transactions')}
                    title="Transactions"
                    className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-start space-x-3 px-4'} py-2.5 rounded-xl text-sm font-medium transition-colors ${activeTab === 'transactions' ? 'bg-indigo-600 text-white' : isDarkMode ? 'text-gray-400 hover:bg-slate-800 hover:text-white' : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-700'}`}
                  >
                    <CreditCard className="w-4 h-4 shrink-0" />
                    {!isSidebarCollapsed && <span>Transactions</span>}
                  </button>
                  <button
                    onClick={() => setActiveTab('coupons')}
                    title="Discounts & Coupons"
                    className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-start space-x-3 px-4'} py-2.5 rounded-xl text-sm font-medium transition-colors ${activeTab === 'coupons' ? 'bg-indigo-600 text-white' : isDarkMode ? 'text-gray-400 hover:bg-slate-800 hover:text-white' : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-700'}`}
                  >
                    <Tag className="w-4 h-4 shrink-0" />
                    {!isSidebarCollapsed && <span>Discounts & Coupons</span>}
                  </button>
                </div>
              )}
            </div>

            {/* Support */}
            <div>
              {!isSidebarCollapsed ? (
                <button onClick={() => toggleMenu('support')} className="w-full flex items-center justify-between px-4 py-2 group">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-indigo-400 transition-colors">Support</p>
                  {expandedMenus.support ? <ChevronUp className="w-3 h-3 text-gray-400" /> : <ChevronDown className="w-3 h-3 text-gray-400" />}
                </button>
              ) : (
                <hr className="my-2 border-gray-200 dark:border-white/5" />
              )}
              {(expandedMenus.support || isSidebarCollapsed) && (
                <div className="space-y-1 mt-1">
                  <button
                    onClick={() => setActiveTab('tickets')}
                    title="Helpdesk Tickets"
                    className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-start space-x-3 px-4'} py-2.5 rounded-xl text-sm font-medium transition-colors ${activeTab === 'tickets' ? 'bg-indigo-600 text-white' : isDarkMode ? 'text-gray-400 hover:bg-slate-800 hover:text-white' : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-700'}`}
                  >
                    <HelpCircle className="w-4 h-4 shrink-0" />
                    {!isSidebarCollapsed && <span>Helpdesk Tickets</span>}
                  </button>
                  <button
                    onClick={() => setActiveTab('announcements')}
                    title="Global Announcements"
                    className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-start space-x-3 px-4'} py-2.5 rounded-xl text-sm font-medium transition-colors ${activeTab === 'announcements' ? 'bg-indigo-600 text-white' : isDarkMode ? 'text-gray-400 hover:bg-slate-800 hover:text-white' : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-700'}`}
                  >
                    <Megaphone className="w-4 h-4 shrink-0" />
                    {!isSidebarCollapsed && <span>Global Announcements</span>}
                  </button>
                </div>
              )}
            </div>

            {/* System */}
            <div>
              {!isSidebarCollapsed ? (
                <button onClick={() => toggleMenu('system')} className="w-full flex items-center justify-between px-4 py-2 group">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-indigo-400 transition-colors">System</p>
                  {expandedMenus.system ? <ChevronUp className="w-3 h-3 text-gray-400" /> : <ChevronDown className="w-3 h-3 text-gray-400" />}
                </button>
              ) : (
                <hr className="my-2 border-gray-200 dark:border-white/5" />
              )}
              {(expandedMenus.system || isSidebarCollapsed) && (
                <div className="space-y-1 mt-1">
                  <button
                    onClick={() => setActiveTab('integrations')}
                    title="Integrations & API"
                    className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-start space-x-3 px-4'} py-2.5 rounded-xl text-sm font-medium transition-colors ${activeTab === 'integrations' ? 'bg-indigo-600 text-white' : isDarkMode ? 'text-gray-400 hover:bg-slate-800 hover:text-white' : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-700'}`}
                  >
                    <Settings className="w-4 h-4 shrink-0" />
                    {!isSidebarCollapsed && <span>Integrations & API</span>}
                  </button>
                  <button
                    onClick={() => setActiveTab('branding')}
                    title="Platform Branding"
                    className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-start space-x-3 px-4'} py-2.5 rounded-xl text-sm font-medium transition-colors ${activeTab === 'branding' ? 'bg-indigo-600 text-white' : isDarkMode ? 'text-gray-400 hover:bg-slate-800 hover:text-white' : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-700'}`}
                  >
                    <Shield className="w-4 h-4 shrink-0" />
                    {!isSidebarCollapsed && <span>Platform Branding</span>}
                  </button>
                  <button
                    onClick={() => setActiveTab('mailjet')}
                    title="Mailjet Tester"
                    className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-start space-x-3 px-4'} py-2.5 rounded-xl text-sm font-medium transition-colors ${activeTab === 'mailjet' ? 'bg-indigo-600 text-white' : isDarkMode ? 'text-gray-400 hover:bg-slate-800 hover:text-white' : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-700'}`}
                  >
                    <Mail className="w-4 h-4 shrink-0" />
                    {!isSidebarCollapsed && <span>Mailjet Tester</span>}
                  </button>
                  <button
                    onClick={() => setActiveTab('security')}
                    title="Admin Security"
                    className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-start space-x-3 px-4'} py-2.5 rounded-xl text-sm font-medium transition-colors ${activeTab === 'security' ? 'bg-indigo-600 text-white' : isDarkMode ? 'text-gray-400 hover:bg-slate-800 hover:text-white' : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-700'}`}
                  >
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    {!isSidebarCollapsed && <span>Admin Security</span>}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4 shrink-0">
          <button
            onClick={toggleDarkMode}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-4'} py-3 rounded-xl text-sm font-medium transition-colors ${
              isDarkMode 
                ? 'bg-slate-800/50 text-gray-300 hover:bg-slate-800 hover:text-white border border-gray-700/50' 
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 shadow-sm'
            }`}
          >
            <div className="flex items-center space-x-3">
              {isDarkMode ? <Moon className="w-4 h-4 text-indigo-400 shrink-0" /> : <Sun className="w-4 h-4 text-amber-500 shrink-0" />}
              {!isSidebarCollapsed && <span>{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>}
            </div>
            {!isSidebarCollapsed && (
              <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${isDarkMode ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                <div className={`w-3 h-3 rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            )}
          </button>

          <button
            onClick={async () => {
              setLoading(true);
              await signOut(auth);
            }}
            title="Sign Out"
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-start space-x-3 px-4'} py-3 rounded-xl text-sm font-medium transition-colors ${isDarkMode ? 'text-rose-400 hover:bg-rose-500/10 hover:text-rose-300' : 'text-rose-600 hover:bg-rose-50 hover:text-rose-700 border border-rose-100 bg-white'}`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isSidebarCollapsed && <span>Sign Out Admin</span>}
          </button>
          
          {!isSidebarCollapsed && (
            <div className={`pt-6 border-t ${isDarkMode ? 'border-gray-800/80' : 'border-gray-200'}`}>
              <p className={`text-[11px] font-mono ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Tripbone SaaS Control Center</p>
              <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>Secure sandbox administration</p>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Metric Cards Banner */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className={`p-6 rounded-3xl ${isDarkMode ? 'bg-white/[0.02] border border-white/5' : 'bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow'}`}>
            <span className={`text-[11px] font-mono uppercase tracking-wider block mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Workspaces</span>
            <div className="flex items-baseline space-x-2">
              <span className={`text-3xl font-extrabold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.totalTenants}</span>
              <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>registered</span>
            </div>
          </div>

          <div className={`p-6 rounded-3xl ${isDarkMode ? 'bg-white/[0.02] border border-white/5' : 'bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow'}`}>
            <span className={`text-[11px] font-mono uppercase tracking-wider block mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Platform MRR</span>
            <div className="flex items-baseline space-x-1 text-emerald-500">
              <span className="text-3xl font-extrabold">${stats.totalMRR.toLocaleString()}</span>
              <span className="text-xs font-mono">/mo</span>
            </div>
          </div>

          <div className={`p-6 rounded-3xl ${isDarkMode ? 'bg-white/[0.02] border border-white/5' : 'bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow'}`}>
            <span className={`text-[11px] font-mono uppercase tracking-wider block mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Active Accounts</span>
            <div className="flex items-baseline space-x-2 text-indigo-500">
              <span className="text-3xl font-extrabold">{stats.activeTenants}</span>
              <span className="text-xs font-mono">({stats.avgUsage}%)</span>
            </div>
          </div>

          <div className={`p-6 rounded-3xl ${isDarkMode ? 'bg-white/[0.02] border border-white/5' : 'bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow'}`}>
            <span className={`text-[11px] font-mono uppercase tracking-wider block mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Suspended Sites</span>
            <div className="flex items-baseline space-x-2 text-amber-500">
              <span className="text-3xl font-extrabold">{stats.suspendedTenants}</span>
              <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>locked</span>
            </div>
          </div>
        </div>

        {/* Tab content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Command Center</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              <div className={`p-6 rounded-3xl ${isDarkMode ? 'bg-white/[0.02] border border-white/5' : 'bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <h3 className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Today's Revenue</h3>
                <p className={`text-2xl font-extrabold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>${stats.todayRevenue > 0 ? stats.todayRevenue.toLocaleString() : '0.00'}</p>
                <p className="text-xs text-emerald-500 mt-2 font-medium">Based on active signups</p>
              </div>

              <div className={`p-6 rounded-3xl ${isDarkMode ? 'bg-white/[0.02] border border-white/5' : 'bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                    <LineChart className="w-5 h-5" />
                  </div>
                </div>
                <h3 className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>This Month Revenue</h3>
                <p className={`text-2xl font-extrabold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>${stats.totalMRR.toLocaleString()}</p>
                <p className="text-xs text-emerald-500 mt-2 font-medium">Total MRR subscription value</p>
              </div>

              <div className={`p-6 rounded-3xl ${isDarkMode ? 'bg-white/[0.02] border border-white/5' : 'bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600'}`}>
                    <HelpCircle className="w-5 h-5" />
                  </div>
                </div>
                <h3 className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Pending Support Tickets</h3>
                <p className={`text-2xl font-extrabold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.pendingTicketsCount}</p>
                <p className="text-xs text-rose-500 mt-2 font-medium">{stats.urgentTicketsCount} require urgent response</p>
              </div>

              <div className={`p-6 rounded-3xl ${isDarkMode ? 'bg-white/[0.02] border border-white/5' : 'bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                    <Building className="w-5 h-5" />
                  </div>
                </div>
                <h3 className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Latest Workspace</h3>
                {tenants.length > 0 ? (
                  <>
                    <p className={`text-lg font-bold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`} title={tenants.slice().sort((a,b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0]?.companyName}>
                      {tenants.slice().sort((a,b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0]?.companyName}
                    </p>
                    <p className="text-xs text-gray-500 mt-2 font-medium">
                      Provisioned {tenants.slice().sort((a,b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0]?.createdAt ? new Date(tenants.slice().sort((a,b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0]?.createdAt).toLocaleDateString() : 'recently'}
                    </p>
                  </>
                ) : (
                  <>
                    <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>None</p>
                    <p className="text-xs text-gray-500 mt-2 font-medium">Ready for onboarding</p>
                  </>
                )}
              </div>
            </div>

            <div className={`mt-8 border rounded-2xl overflow-hidden ${isDarkMode ? 'bg-slate-900/50 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
              <div className={`p-6 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Latest Platform Activity</h3>
              </div>
              <div className={`divide-y ${isDarkMode ? 'divide-gray-800/50' : 'divide-gray-100'}`}>
                {tenants.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-500">No registered workspace activity.</div>
                ) : (
                  tenants.slice()
                    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                    .slice(0, 5)
                    .map((t) => {
                      const timeStr = t.createdAt ? new Date(t.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently';
                      return (
                        <div key={t.id} className={`p-4 flex items-center justify-between transition-colors ${isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-gray-50'}`}>
                          <div className="flex items-center space-x-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-slate-800 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                              <Shield className="w-4 h-4" />
                            </div>
                            <div>
                              <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>New tenant registered: {t.companyName || 'Unnamed Brand'}</p>
                              <p className="text-xs text-gray-500">{timeStr} • Automatically provisioned workspace ({t.plan || 'starter'})</p>
                            </div>
                          </div>
                          <button onClick={() => { setSelectedTenant(t); setTenantModalTab('overview'); }} className="text-xs text-indigo-500 hover:text-indigo-600 font-bold font-mono">Manage</button>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'operators' && (
          <div className={`border rounded-2xl overflow-hidden ${isDarkMode ? 'border-gray-800 bg-slate-900/40' : 'border-gray-200 bg-white shadow-sm'}`}>
            <div className={`p-6 border-b flex items-center justify-between ${isDarkMode ? 'border-gray-800 bg-slate-900/60' : 'border-gray-200 bg-white'}`}>
              <div>
                <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Platform Operators & Workspace Owners</h2>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>List of workspace administrative contacts, operational phones, and physical addresses.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`border-b text-[10px] font-mono uppercase tracking-wider ${isDarkMode ? 'border-gray-800/80 bg-slate-950/40 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                    <th className="py-4 px-6">Company / Brand</th>
                    <th className="py-4 px-6">Admin Email</th>
                    <th className="py-4 px-6">Phone Number</th>
                    <th className="py-4 px-6">Contact Address</th>
                    <th className="py-4 px-6">Plan Tier</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800/50' : 'divide-gray-100'}`}>
                  {tenants.map((t) => (
                    <tr key={t.id} className={`text-sm transition-colors ${isDarkMode ? 'hover:bg-slate-900/20' : 'hover:bg-gray-50'}`}>
                      <td className="py-4 px-6">
                        <div>
                          <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t.companyName || 'Unnamed Workspace'}</p>
                          <span className="text-[10px] font-mono text-gray-500">{t.customDomain || `${t.slug}.tripbone.com`}</span>
                        </div>
                      </td>
                      <td className={`py-4 px-6 font-mono text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t.email || (t as any).adminEmail || 'N/A'}</td>
                      <td className={`py-4 px-6 font-mono text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t.phone || 'N/A'}</td>
                      <td className={`py-4 px-6 text-xs max-w-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} title={t.address}>{t.address || 'N/A'}</td>
                      <td className="py-4 px-6">
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-950/40 text-indigo-400 border border-indigo-900/40 font-mono capitalize">
                          {t.plan || 'starter'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {tenants.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-xs text-gray-500">No workspace operators registered yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'coupons' && (
          <div className="space-y-8 animate-fadeIn text-left">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Platform Discount Coupons</h2>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Manage promotional code discounts used by tenants to get percentage or fixed price cuts.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form card */}
              <div className={`p-6 border rounded-2xl h-fit ${isDarkMode ? 'bg-[#111928] border-gray-850' : 'bg-white border-gray-100 shadow-xs'}`}>
                <h3 className={`font-bold mb-4 flex items-center space-x-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  <Plus className="w-4 h-4 text-indigo-500" />
                  <span>Create Global Coupon</span>
                </h3>

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newCoupon.code.trim()) return;
                  setIsCreatingCoupon(true);
                  try {
                    const couponData = {
                      ...newCoupon,
                      code: newCoupon.code.toUpperCase().trim(),
                      createdAt: new Date().toISOString()
                    };
                    await addDoc(collection(db, 'coupons'), couponData);
                    setCoupons(prev => [...prev, couponData]);
                    setNewCoupon({
                      code: '',
                      discountType: 'percentage',
                      discountValue: 10,
                      isActive: true,
                      minBookingValue: 0
                    });
                    setSuccess('🎉 Coupon successfully created in database!');
                  } catch (err: any) {
                    setError('Failed to create coupon: ' + err.message);
                  } finally {
                    setIsCreatingCoupon(false);
                  }
                }} className="space-y-4">
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Promo Code</label>
                    <input
                      type="text"
                      placeholder="e.g. BALITOUR20"
                      value={newCoupon.code}
                      onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value })}
                      required
                      className={`w-full px-3.5 py-2 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${isDarkMode ? 'bg-slate-950/80 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Discount Type</label>
                      <select
                        value={newCoupon.discountType}
                        onChange={(e) => setNewCoupon({ ...newCoupon, discountType: e.target.value })}
                        className={`w-full px-3.5 py-2 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${isDarkMode ? 'bg-slate-950/80 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed ($)</option>
                      </select>
                    </div>

                    <div>
                      <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Discount Value</label>
                      <input
                        type="number"
                        min="1"
                        value={newCoupon.discountValue}
                        onChange={(e) => setNewCoupon({ ...newCoupon, discountValue: Number(e.target.value) })}
                        required
                        className={`w-full px-3.5 py-2 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${isDarkMode ? 'bg-slate-950/80 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Min Booking Value ($)</label>
                    <input
                      type="number"
                      min="0"
                      value={newCoupon.minBookingValue}
                      onChange={(e) => setNewCoupon({ ...newCoupon, minBookingValue: Number(e.target.value) })}
                      className={`w-full px-3.5 py-2 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${isDarkMode ? 'bg-slate-950/80 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <input
                      type="checkbox"
                      id="isActiveCoupon"
                      checked={newCoupon.isActive}
                      onChange={(e) => setNewCoupon({ ...newCoupon, isActive: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500/30 h-4 w-4"
                    />
                    <label htmlFor="isActiveCoupon" className={`text-xs font-bold cursor-pointer ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Active coupon code</label>
                  </div>

                  <button
                    type="submit"
                    disabled={isCreatingCoupon}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/40 text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    {isCreatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Save Coupon Code</span>
                  </button>
                </form>
              </div>

              {/* Coupons List */}
              <div className={`lg:col-span-2 border rounded-2xl overflow-hidden ${isDarkMode ? 'border-gray-850 bg-slate-900/40' : 'border-gray-200 bg-white shadow-xs'}`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className={`border-b text-[10px] font-mono uppercase tracking-wider ${isDarkMode ? 'border-gray-800/80 bg-slate-950/40 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                        <th className="py-4 px-6">Promo Code</th>
                        <th className="py-4 px-6">Type</th>
                        <th className="py-4 px-6">Value</th>
                        <th className="py-4 px-6">Min. Spend</th>
                        <th className="py-4 px-6">Status</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800/50' : 'divide-gray-100'}`}>
                      {coupons.map((c, idx) => (
                        <tr key={c.id || idx} className={`text-sm transition-colors ${isDarkMode ? 'hover:bg-slate-900/20' : 'hover:bg-gray-50'}`}>
                          <td className="py-4 px-6">
                            <span className="font-bold text-xs font-mono uppercase px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">{c.code}</span>
                          </td>
                          <td className={`py-4 px-6 text-xs capitalize ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{c.discountType}</td>
                          <td className={`py-4 px-6 font-bold text-xs font-mono ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {c.discountType === 'percentage' ? `${c.discountValue}%` : `$${c.discountValue}`}
                          </td>
                          <td className={`py-4 px-6 font-mono text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>${c.minBookingValue || 0}</td>
                          <td className="py-4 px-6">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border font-mono ${c.isActive ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40' : 'bg-gray-950/40 text-gray-400 border-gray-900/40'}`}>
                              {c.isActive ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {coupons.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-xs text-gray-500">No promo coupons defined yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'integrations' && (
          <div className="space-y-8 animate-fadeIn text-left">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Integrations & Payment Gateways</h2>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Configure third-party payment gateways, merchant keys, and offline transfer instructions.</p>
              </div>
              <button
                onClick={handleSaveGlobalSettings}
                disabled={savingSettings}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center space-x-2 transition-all shadow-lg shadow-indigo-600/10 cursor-pointer"
              >
                {savingSettings ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Settings...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Save Integration Keys</span>
                  </>
                )}
              </button>
            </div>

            {success && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                {success}
              </div>
            )}

            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Tripay Integration */}
              <div className={`p-6 border rounded-2xl space-y-6 ${isDarkMode ? 'border-gray-800 bg-slate-900/40' : 'border-gray-200 bg-white shadow-sm'}`}>
                <div className="flex items-center space-x-3 pb-4 border-b border-gray-800/20">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Tripay.co.id (Indonesian Market)</h3>
                    <p className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Accept Virtual Accounts, QRIS, and Convenience Store payments in IDR</p>
                  </div>
                </div>

                <div className="space-y-4 text-sm">
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Merchant Code</label>
                    <input
                      type="text"
                      value={globalSettings.tripayMerchantCode || ''}
                      onChange={(e) => setGlobalSettings({ ...globalSettings, tripayMerchantCode: e.target.value })}
                      placeholder="e.g. T12345"
                      className={`w-full px-3.5 py-2 rounded-xl text-xs font-mono border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${isDarkMode ? 'bg-slate-950/80 border-gray-800 text-white placeholder-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>API Key</label>
                    <input
                      type="password"
                      value={globalSettings.tripayApiKey || ''}
                      onChange={(e) => setGlobalSettings({ ...globalSettings, tripayApiKey: e.target.value })}
                      placeholder="Enter Tripay API Key"
                      className={`w-full px-3.5 py-2 rounded-xl text-xs font-mono border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${isDarkMode ? 'bg-slate-950/80 border-gray-800 text-white placeholder-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Private Key (Secret)</label>
                    <input
                      type="password"
                      value={globalSettings.tripayPrivateKey || ''}
                      onChange={(e) => setGlobalSettings({ ...globalSettings, tripayPrivateKey: e.target.value })}
                      placeholder="Enter Tripay Private Key"
                      className={`w-full px-3.5 py-2 rounded-xl text-xs font-mono border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${isDarkMode ? 'bg-slate-950/80 border-gray-800 text-white placeholder-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Environment Mode</label>
                    <select
                      value={globalSettings.tripayMode || 'sandbox'}
                      onChange={(e) => setGlobalSettings({ ...globalSettings, tripayMode: e.target.value })}
                      className={`w-full px-3.5 py-2 rounded-xl text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${isDarkMode ? 'bg-slate-950/80 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                    >
                      <option value="sandbox">Sandbox (Testing)</option>
                      <option value="live">Live (Production)</option>
                    </select>
                  </div>

                  <div className={`p-4 rounded-xl border leading-relaxed text-xs ${isDarkMode ? 'bg-slate-950/40 border-gray-800 text-gray-400' : 'bg-gray-50 border-gray-100 text-gray-600'}`}>
                    <p className="font-semibold text-indigo-400 mb-1">🔗 Webhook Callback URL</p>
                    Set your Tripay callback URL to:
                    <div className="font-mono bg-slate-950 p-2 rounded-lg text-[10px] text-emerald-400 mt-1 select-all break-all border border-gray-800/40">
                      {window.location.origin}/api/billing/tripay-webhook
                    </div>
                  </div>
                </div>
              </div>

              {/* Creem & Manual Transfer Column */}
              <div className="space-y-8">
                {/* Creem Integration */}
                <div className={`p-6 border rounded-2xl space-y-6 ${isDarkMode ? 'border-gray-800 bg-slate-900/40' : 'border-gray-200 bg-white shadow-sm'}`}>
                  <div className="flex items-center space-x-3 pb-4 border-b border-gray-800/20">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Creem.io Settings</h3>
                      <p className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Global credit cards, Apple Pay, and subscription infrastructure</p>
                    </div>
                  </div>

                  <div className="space-y-4 text-sm">
                    <div>
                      <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Creem API Key</label>
                      <input
                        type="password"
                        value={globalSettings.creemApiKey || ''}
                        onChange={(e) => setGlobalSettings({ ...globalSettings, creemApiKey: e.target.value })}
                        placeholder="Enter Creem API Key"
                        className={`w-full px-3.5 py-2 rounded-xl text-xs font-mono border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${isDarkMode ? 'bg-slate-950/80 border-gray-800 text-white placeholder-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Environment Mode</label>
                      <select
                        value={globalSettings.creemMode || 'test'}
                        onChange={(e) => setGlobalSettings({ ...globalSettings, creemMode: e.target.value })}
                        className={`w-full px-3.5 py-2 rounded-xl text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${isDarkMode ? 'bg-slate-950/80 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                      >
                        <option value="test">Test Mode</option>
                        <option value="live">Live Mode</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Manual Bank Transfer */}
                <div className={`p-6 border rounded-2xl space-y-6 ${isDarkMode ? 'border-gray-800 bg-slate-900/40' : 'border-gray-200 bg-white shadow-sm'}`}>
                  <div className="flex items-center space-x-3 pb-4 border-b border-gray-800/20">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Manual Bank Transfer Instructions</h3>
                      <p className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Shown to tenants during registration for offline confirmation</p>
                    </div>
                  </div>

                  <div className="space-y-4 text-sm">
                    <div>
                      <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Instructions text</label>
                      <textarea
                        rows={5}
                        value={globalSettings.manualBankInstructions || ''}
                        onChange={(e) => setGlobalSettings({ ...globalSettings, manualBankInstructions: e.target.value })}
                        placeholder="e.g. Bank Central Asia (BCA)..."
                        className={`w-full px-3.5 py-2 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all leading-relaxed ${isDarkMode ? 'bg-slate-950/80 border-gray-800 text-white placeholder-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'branding' && (
          <div className="space-y-8 animate-fadeIn text-left">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Global Platform Branding</h2>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Customize name, tagline, support contacts, and legal notices of the central SaaS platform.</p>
              </div>
            </div>

            <div className="max-w-2xl">
              <div className={`p-6 border rounded-2xl ${isDarkMode ? 'bg-[#111928] border-gray-850' : 'bg-white border-gray-100 shadow-xs'}`}>
                <h3 className={`font-bold mb-6 flex items-center space-x-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  <Settings className="w-5 h-5 text-indigo-500" />
                  <span>Branding Identity Configurations</span>
                </h3>

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setSavingBrand(true);
                  try {
                    await setDoc(doc(db, 'settings', 'globalBrand'), globalBrand, { merge: true });
                    setSuccess('🎉 Platform branding configuration saved successfully!');
                  } catch (err: any) {
                    setError('Failed to save branding: ' + err.message);
                  } finally {
                    setSavingBrand(false);
                  }
                }} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Platform Title</label>
                      <input
                        type="text"
                        value={globalBrand.platformName}
                        onChange={(e) => setGlobalBrand({ ...globalBrand, platformName: e.target.value })}
                        required
                        className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${isDarkMode ? 'bg-slate-950/80 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Central Support Email</label>
                      <input
                        type="email"
                        value={globalBrand.supportEmail}
                        onChange={(e) => setGlobalBrand({ ...globalBrand, supportEmail: e.target.value })}
                        required
                        className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${isDarkMode ? 'bg-slate-950/80 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Tagline / Description</label>
                    <input
                      type="text"
                      value={globalBrand.tagline}
                      onChange={(e) => setGlobalBrand({ ...globalBrand, tagline: e.target.value })}
                      required
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${isDarkMode ? 'bg-slate-950/80 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Footer Copyright / Legal Info</label>
                    <input
                      type="text"
                      value={globalBrand.copyright}
                      onChange={(e) => setGlobalBrand({ ...globalBrand, copyright: e.target.value })}
                      required
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${isDarkMode ? 'bg-slate-950/80 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                    />
                  </div>

                  {/* Logo & Favicon Assets */}
                  <div className="border-t border-gray-150 dark:border-gray-800/60 pt-6">
                    <h4 className={`text-xs font-black uppercase tracking-wider mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Logo & Favicon Visual Assets</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Logo Section */}
                      <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-950/40 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                        <span className={`block text-xs font-bold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Platform Logo</span>
                        <div className="flex items-center space-x-4">
                          <div className={`w-16 h-16 rounded-xl border flex items-center justify-center overflow-hidden bg-slate-950 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                            {globalBrand.logoUrl ? (
                              <img src={globalBrand.logoUrl} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                            ) : (
                              <Image className="w-6 h-6 text-gray-500" />
                            )}
                          </div>
                          <div className="flex-1">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleUploadLogo}
                              className="hidden"
                              id="logo-upload-input"
                              disabled={uploadingLogo}
                            />
                            <label
                              htmlFor="logo-upload-input"
                              className={`px-3 py-2 border rounded-lg text-xs font-bold cursor-pointer inline-flex items-center space-x-1.5 transition-all ${
                                uploadingLogo 
                                  ? 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed' 
                                  : isDarkMode 
                                    ? 'bg-slate-800 hover:bg-slate-700 text-white border-gray-700' 
                                    : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300 shadow-xs'
                              }`}
                            >
                              {uploadingLogo ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span>Uploading...</span>
                                </>
                              ) : (
                                <>
                                  <Image className="w-3 h-3" />
                                  <span>{globalBrand.logoUrl ? 'Change Logo' : 'Upload Logo'}</span>
                                </>
                              )}
                            </label>
                            <p className="text-[10px] text-gray-500 mt-1">Format: PNG, SVG, or WEBP.</p>
                          </div>
                        </div>
                      </div>

                      {/* Favicon Section */}
                      <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-950/40 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                        <span className={`block text-xs font-bold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Browser Favicon</span>
                        <div className="flex items-center space-x-4">
                          <div className={`w-16 h-16 rounded-xl border flex items-center justify-center overflow-hidden bg-slate-950 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                            {globalBrand.faviconUrl ? (
                              <img src={globalBrand.faviconUrl} alt="Favicon Preview" className="w-8 h-8 object-contain" />
                            ) : (
                              <Layers className="w-6 h-6 text-gray-500" />
                            )}
                          </div>
                          <div className="flex-1">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleUploadFavicon}
                              className="hidden"
                              id="favicon-upload-input"
                              disabled={uploadingFavicon}
                            />
                            <label
                              htmlFor="favicon-upload-input"
                              className={`px-3 py-2 border rounded-lg text-xs font-bold cursor-pointer inline-flex items-center space-x-1.5 transition-all ${
                                uploadingFavicon 
                                  ? 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed' 
                                  : isDarkMode 
                                    ? 'bg-slate-800 hover:bg-slate-700 text-white border-gray-700' 
                                    : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300 shadow-xs'
                              }`}
                            >
                              {uploadingFavicon ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span>Uploading...</span>
                                </>
                              ) : (
                                <>
                                  <Layers className="w-3 h-3" />
                                  <span>{globalBrand.faviconUrl ? 'Change Favicon' : 'Upload Favicon'}</span>
                                </>
                              )}
                            </label>
                            <p className="text-[10px] text-gray-500 mt-1">Format: ICO or PNG.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={savingBrand}
                    className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/40 text-white text-xs font-bold rounded-xl flex items-center space-x-2 transition-all cursor-pointer"
                  >
                    {savingBrand ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Save Platform Settings</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'mailjet' && (
          <MailjetTester isDarkMode={isDarkMode} />
        )}
        {activeTab === 'workspaces' && (
          <div className={`border rounded-2xl overflow-hidden ${isDarkMode ? 'border-gray-800 bg-slate-900/40' : 'border-gray-200 bg-white shadow-sm'}`}>
            <div className={`p-6 border-b flex items-center justify-between ${isDarkMode ? 'border-gray-800 bg-slate-900/60' : 'border-gray-200 bg-white'}`}>
              <div>
                <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Registered Tenant Workspaces</h2>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Monitor travel brands, billing schedules, and lock states.</p>
              </div>
              <button
                onClick={() => setIsManualCustomerModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center space-x-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Manual Customer</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`border-b text-[10px] font-mono uppercase tracking-wider ${isDarkMode ? 'border-gray-800/80 bg-slate-950/40 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                    <th className="py-4 px-6">Company</th>
                    <th className="py-4 px-6">Slug/ID</th>
                    <th className="py-4 px-6">Subscription Plan</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Renewal Date</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800/50' : 'divide-gray-100'}`}>
                  {tenants.map((tenant) => (
                    <tr key={tenant.id} className={`text-sm transition-colors ${isDarkMode ? 'hover:bg-slate-900/20' : 'hover:bg-gray-50'}`}>
                      <td className={`py-4 px-6 font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{tenant.companyName}</td>
                      <td className={`py-4 px-6 font-mono text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{tenant.slug}</td>
                      <td className="py-4 px-6">
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-950 text-indigo-400 border border-gray-800 font-mono">
                          {(tenant.plan || 'starter').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center space-x-1.5 text-xs font-semibold ${
                          tenant.status === 'active' ? 'text-emerald-400' :
                          tenant.status === 'trial' ? 'text-sky-400' :
                          tenant.status === 'inactive' ? 'text-amber-400' :
                          'text-rose-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            tenant.status === 'active' ? 'bg-emerald-400' :
                            tenant.status === 'trial' ? 'bg-sky-400' :
                            tenant.status === 'inactive' ? 'bg-amber-400' :
                            'bg-rose-400'
                          }`} />
                          <span className="capitalize">{tenant.status || 'active'}</span>
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-1.5 text-xs text-gray-500 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span>{getNextBillingDate(tenant)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            title="Impersonate Operator"
                            onClick={() => {
                              if (tenant.customDomain) {
                                const protocol = window.location.hostname === 'localhost' ? 'http://' : 'https://';
                                window.location.href = `${protocol}${tenant.customDomain}/?impersonate=${tenant.id}`;
                              } else {
                                window.location.href = `/?impersonate=${tenant.id}`;
                              }
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-indigo-900/50 text-indigo-400' : 'hover:bg-indigo-50 text-indigo-600'}`}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            title="Upgrade / Downgrade Plan"
                            onClick={() => { setSelectedTenant(tenant); setTenantModalTab('billing'); setIsTenantModalOpen(true); }}
                            className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-emerald-900/50 text-emerald-400' : 'hover:bg-emerald-50 text-emerald-600'}`}
                          >
                            <TrendingUp className="w-4 h-4" />
                          </button>
                          <button
                            title="Edit Tenant Details"
                            onClick={() => { setSelectedTenant(tenant); setTenantModalTab('overview'); setIsTenantModalOpen(true); }}
                            className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'}`}
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                          <select
                            title="Change Subscription Status"
                            value={tenant.status || 'active'}
                            onChange={(e) => changeTenantStatus(tenant.id, e.target.value as any)}
                            className={`px-2 py-1 text-xs font-bold rounded-lg border focus:outline-none focus:ring-1 cursor-pointer transition-colors ${
                              isDarkMode 
                                ? 'bg-slate-900 border-gray-850 text-gray-300 focus:ring-indigo-500 focus:border-indigo-500' 
                                : 'bg-white border-gray-200 text-gray-700 focus:ring-indigo-500 focus:border-indigo-500'
                            }`}
                          >
                            <option value="trial" className={isDarkMode ? 'bg-slate-900' : 'bg-white'}>Trial (7D)</option>
                            <option value="active" className={isDarkMode ? 'bg-slate-900' : 'bg-white'}>Active</option>
                            <option value="inactive" className={isDarkMode ? 'bg-slate-900' : 'bg-white'}>Inactive</option>
                            <option value="suspended" className={isDarkMode ? 'bg-slate-900' : 'bg-white'}>Suspended</option>
                          </select>
                          <button
                            title="Delete Customer & Wipe Data"
                            onClick={() => setTenantToDelete(tenant)}
                            className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-red-900/50 text-red-500' : 'hover:bg-red-50 text-red-600'}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="space-y-6 text-left">
            {/* Revenue projections */}
            <div className={`p-6 border rounded-2xl ${isDarkMode ? 'bg-[#111928] border-gray-850' : 'bg-white border-gray-100 shadow-xs'}`}>
              <h2 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Platform Revenue Projections</h2>
              <p className={`text-xs mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Aggregated Monthly Recurring Revenue (MRR) based on active customer licensing plans.</p>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-950 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                  <span className={`text-[10px] font-mono uppercase ${isDarkMode ? 'text-gray-500' : 'text-gray-400 font-bold'}`}>Starter Tier</span>
                  <div className={`text-lg font-extrabold mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    ${tenants.filter(t => t.plan === 'starter' && t.status === 'active').length * 49}
                  </div>
                  <span className="text-[10px] text-gray-500 block mt-0.5">
                    {tenants.filter(t => t.plan === 'starter' && t.status === 'active').length} accounts
                  </span>
                </div>

                <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-950 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                  <span className={`text-[10px] font-mono uppercase ${isDarkMode ? 'text-gray-500' : 'text-gray-400 font-bold'}`}>Professional Tier</span>
                  <div className="text-lg font-extrabold text-indigo-500 mt-1">
                    ${tenants.filter(t => t.plan === 'professional' && t.status === 'active').length * 99}
                  </div>
                  <span className="text-[10px] text-gray-500 block mt-0.5">
                    {tenants.filter(t => t.plan === 'professional' && t.status === 'active').length} accounts
                  </span>
                </div>

                <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-950 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                  <span className={`text-[10px] font-mono uppercase ${isDarkMode ? 'text-gray-500' : 'text-gray-400 font-bold'}`}>Business Tier</span>
                  <div className="text-lg font-extrabold text-emerald-500 mt-1">
                    ${tenants.filter(t => t.plan === 'business' && t.status === 'active').length * 199}
                  </div>
                  <span className="text-[10px] text-gray-500 block mt-0.5">
                    {tenants.filter(t => t.plan === 'business' && t.status === 'active').length} accounts
                  </span>
                </div>

                <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-950 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                  <span className={`text-[10px] font-mono uppercase ${isDarkMode ? 'text-gray-500' : 'text-gray-400 font-bold'}`}>Agency/Enterprise</span>
                  <div className="text-lg font-extrabold text-amber-500 mt-1">
                    ${tenants.filter(t => (t.plan === 'agency' || t.plan === 'enterprise') && t.status === 'active').reduce((acc, current) => {
                      return acc + (current.plan === 'agency' ? 399 : 999);
                    }, 0)}
                  </div>
                  <span className="text-[10px] text-gray-500 block mt-0.5">
                    {tenants.filter(t => (t.plan === 'agency' || t.plan === 'enterprise') && t.status === 'active').length} accounts
                  </span>
                </div>
              </div>
            </div>

            {/* Live Recorded Transaction Tracking */}
            <div className={`p-6 border rounded-2xl ${isDarkMode ? 'bg-[#111928] border-gray-850' : 'bg-white border-gray-100 shadow-xs'}`}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h3 className={`text-base font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Real-Time Transaction Registry</h3>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Monitor customer invoices and bookings generated by all tenant websites.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search customer, tour..."
                      value={txSearch}
                      onChange={(e) => setTxSearch(e.target.value)}
                      className={`pl-9 pr-4 py-1.5 rounded-xl text-xs font-semibold border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${
                        isDarkMode ? 'bg-slate-950 border-gray-805 text-white' : 'bg-gray-50 border-gray-200 text-gray-950'
                      }`}
                    />
                  </div>

                  <select
                    value={txStatusFilter}
                    onChange={(e) => setTxStatusFilter(e.target.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${
                      isDarkMode ? 'bg-slate-950 border-gray-805 text-white' : 'bg-gray-50 border-gray-200 text-gray-955'
                    }`}
                  >
                    <option value="all">All Statuses</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Transactions Table */}
              <div className={`border rounded-xl overflow-hidden ${isDarkMode ? 'border-gray-800' : 'border-gray-150'}`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className={`border-b text-[10px] font-mono uppercase tracking-wider ${isDarkMode ? 'border-gray-800 bg-slate-900/50 text-gray-400' : 'border-gray-150 bg-gray-50 text-gray-500'}`}>
                        <th className="py-3 px-4">Booking Ref</th>
                        <th className="py-3 px-4">Tenant Site</th>
                        <th className="py-3 px-4">Tour Name</th>
                        <th className="py-3 px-4">Customer Details</th>
                        <th className="py-3 px-4">Booking Date</th>
                        <th className="py-3 px-4 text-right">Amount</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-150'}`}>
                      {(() => {
                        const filtered = bookings.filter(b => {
                          const matchesStatus = txStatusFilter === 'all' || b.status?.toLowerCase() === txStatusFilter;
                          const guestName = (b.customerName || b.guestName || '').toLowerCase();
                          const guestEmail = (b.guestEmail || b.contactEmail || b.email || '').toLowerCase();
                          const tourName = (b.tourName || '').toLowerCase();
                          const refId = (b.id || '').toLowerCase();
                          const searchStr = txSearch.toLowerCase();
                          const matchesSearch = !txSearch || guestName.includes(searchStr) || guestEmail.includes(searchStr) || tourName.includes(searchStr) || refId.includes(searchStr);
                          return matchesStatus && matchesSearch;
                        });

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-xs text-gray-500">
                                No records found matching the criteria.
                              </td>
                            </tr>
                          );
                        }

                        return filtered.map((b) => {
                          const matchedTenant = tenants.find(t => t.id === b.tenantId);
                          return (
                            <tr key={b.id} className={`text-xs hover:bg-gray-50/50 dark:hover:bg-slate-900/30 transition-colors`}>
                              <td className="py-3.5 px-4 font-mono font-bold text-indigo-500">
                                #{b.id?.substring(0, 8).toUpperCase() || 'N/A'}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {matchedTenant?.companyName || b.tenantId || 'Primary Platform'}
                                </span>
                                <span className="block text-[10px] text-gray-500">
                                  {matchedTenant?.subdomain ? `${matchedTenant.subdomain}.tripbone.com` : 'Central System'}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-medium max-w-[200px] truncate">
                                {b.tourName || 'General Excursion Booking'}
                              </td>
                              <td className="py-3.5 px-4">
                                <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-950'}`}>{b.customerName || b.guestName || 'Anonymous Customer'}</p>
                                <p className="text-[10px] text-gray-500">{b.guestEmail || b.contactEmail || b.email || '-'}</p>
                              </td>
                              <td className="py-3.5 px-4 text-gray-500">
                                {b.date || (b.createdAt ? new Date(b.createdAt).toLocaleDateString() : '-')}
                              </td>
                              <td className={`py-3.5 px-4 text-right font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                ${b.totalAmount !== undefined ? b.totalAmount.toLocaleString() : '0'}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  b.status === 'confirmed' || b.status === 'completed'
                                    ? 'bg-emerald-500/10 text-emerald-500'
                                    : b.status === 'cancelled'
                                      ? 'bg-rose-500/10 text-rose-500'
                                      : 'bg-amber-500/10 text-amber-500'
                                }`}>
                                  {b.status || 'pending'}
                                </span>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'resource_usage' && (
          <div className="space-y-6 text-left animate-fadeIn">
            <div className={`p-6 border rounded-2xl ${isDarkMode ? 'bg-[#111928] border-gray-850' : 'bg-white border-gray-100 shadow-xs'}`}>
              <h2 className={`text-lg font-black mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Platform System Usage & Telemetry</h2>
              <p className={`text-xs mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Real-time performance logs, database connection telemetry, and customer tenant quota usage indicators.</p>

              {/* Total platform overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-950 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                  <span className="text-[10px] font-mono text-gray-500 uppercase font-semibold">Total Registered Tenants</span>
                  <div className={`text-2xl font-black mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{tenants.length}</div>
                  <span className="text-[10px] text-gray-500 block mt-1">SaaS Customer bases</span>
                </div>
                <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-950 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                  <span className="text-[10px] font-mono text-gray-500 uppercase font-semibold">Active Tours Built</span>
                  <div className="text-2xl font-black text-indigo-500 mt-1">{tours.length}</div>
                  <span className="text-[10px] text-gray-500 block mt-1">Tour product items</span>
                </div>
                <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-950 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                  <span className="text-[10px] font-mono text-gray-500 uppercase font-semibold">Total Bookings Recorded</span>
                  <div className="text-2xl font-black text-emerald-500 mt-1">{bookings.length}</div>
                  <span className="text-[10px] text-gray-500 block mt-1">Customer checkouts</span>
                </div>
                <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-950 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                  <span className="text-[10px] font-mono text-gray-500 uppercase font-semibold">Portfolios Showcase</span>
                  <div className="text-2xl font-black text-amber-500 mt-1">{showcases.length}</div>
                  <span className="text-[10px] text-gray-500 block mt-1">Directory websites</span>
                </div>
              </div>

              {/* Server Performance Metrics */}
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Sandbox Telemetry Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className={`p-4 rounded-xl border flex items-center space-x-3.5 ${isDarkMode ? 'bg-slate-950 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="p-2 bg-indigo-500/10 rounded-lg">
                    <Activity className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold block">API GATEWAY SPEED</span>
                    <span className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>34 ms <span className="text-[10px] text-emerald-500 font-normal ml-1">● Optimal</span></span>
                  </div>
                </div>

                <div className={`p-4 rounded-xl border flex items-center space-x-3.5 ${isDarkMode ? 'bg-slate-950 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <Database className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold block">FIRESTORE ACTIVE POOL</span>
                    <span className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>12 Active <span className="text-[10px] text-emerald-500 font-normal ml-1">● Connected</span></span>
                  </div>
                </div>

                <div className={`p-4 rounded-xl border flex items-center space-x-3.5 ${isDarkMode ? 'bg-slate-950 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <Layers className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold block">HEAP MEMORY FOOTPRINT</span>
                    <span className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>142 MB / 512 MB <span className="text-[10px] text-emerald-500 font-normal ml-1">● 27% Utilized</span></span>
                  </div>
                </div>
              </div>

              {/* Resource usage breakdown table */}
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Tenant Resource Allocations & Quotas</h3>
              <div className={`border rounded-xl overflow-hidden ${isDarkMode ? 'border-gray-800' : 'border-gray-150'}`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className={`border-b text-[10px] font-mono uppercase tracking-wider ${isDarkMode ? 'border-gray-800 bg-slate-900/50 text-gray-400' : 'border-gray-150 bg-gray-50 text-gray-500'}`}>
                        <th className="py-3 px-4">Tenant Workspace</th>
                        <th className="py-3 px-4">Pricing Plan</th>
                        <th className="py-3 px-4 text-center">Tours Created</th>
                        <th className="py-3 px-4 text-center">Total Bookings</th>
                        <th className="py-3 px-4">Tour Quota Consumption</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-150'}`}>
                      {tenants.map((t) => {
                        const tenantTours = tours.filter(tr => tr.tenantId === t.id).length;
                        const tenantBookings = bookings.filter(bk => bk.tenantId === t.id).length;
                        
                        // Quota limit configuration
                        let limit = 5;
                        if (t.plan === 'professional') limit = 50;
                        if (t.plan === 'business') limit = 999;
                        if (t.plan === 'agency' || t.plan === 'enterprise') limit = 9999;
                        
                        const percent = Math.min(100, Math.round((tenantTours / limit) * 100));

                        return (
                          <tr key={t.id} className="text-xs hover:bg-gray-50/50 dark:hover:bg-slate-900/30">
                            <td className="py-3.5 px-4">
                              <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t.companyName}</span>
                              <span className="block text-[10px] text-gray-500">{t.subdomain}.tripbone.com</span>
                            </td>
                            <td className="py-3.5 px-4 uppercase font-mono font-bold text-[10px]">
                              <span className={`px-2 py-0.5 rounded-md ${
                                t.plan === 'starter' ? 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400' :
                                t.plan === 'professional' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400' :
                                'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                              }`}>
                                {t.plan || 'starter'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold">{tenantTours}</td>
                            <td className="py-3.5 px-4 text-center font-bold text-gray-500">{tenantBookings}</td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center space-x-3 max-w-[200px]">
                                <div className="flex-1 h-1.5 bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${
                                      percent > 85 ? 'bg-rose-500' : percent > 50 ? 'bg-amber-500' : 'bg-indigo-500'
                                    }`} 
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-bold text-gray-500 min-w-[30px]">{percent}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {tenants.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-xs text-gray-500">
                            No active tenant accounts provisioned on this platform yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'showcase' && (
          <div className="space-y-8 animate-fadeIn text-left">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Study Case & Showcase Portfolio Manager</h2>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Manage the collection of Tripbone-powered customer websites that display on the main platform directory showcase.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Form Area */}
              <div className="lg:col-span-4">
                <div className={`p-6 border rounded-2xl ${isDarkMode ? 'bg-[#111928] border-gray-850' : 'bg-white border-gray-100 shadow-xs'}`}>
                  <h3 className={`font-bold mb-4 flex items-center space-x-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    <Sparkles className="w-5 h-5 text-indigo-500" />
                    <span>{editingShowcaseId ? 'Edit Showcase Website' : 'Add Showcase Website'}</span>
                  </h3>

                  <form onSubmit={handleSaveShowcase} className="space-y-4">
                    <div>
                      <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Client / Website Title</label>
                      <input
                        type="text"
                        value={newShowcase.title}
                        onChange={(e) => setNewShowcase({ ...newShowcase, title: e.target.value })}
                        required
                        placeholder="e.g. Bali Adventours"
                        className={`w-full px-3.5 py-2 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${isDarkMode ? 'bg-slate-950/80 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Company Description</label>
                      <textarea
                        value={newShowcase.description}
                        onChange={(e) => setNewShowcase({ ...newShowcase, description: e.target.value })}
                        required
                        rows={3}
                        placeholder="Describe the tenant brand & service offerings..."
                        className={`w-full px-3.5 py-2 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${isDarkMode ? 'bg-slate-950/80 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Website Link URL</label>
                      <input
                        type="url"
                        value={newShowcase.url}
                        onChange={(e) => setNewShowcase({ ...newShowcase, url: e.target.value })}
                        required
                        placeholder="https://example.tripbone.com"
                        className={`w-full px-3.5 py-2 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${isDarkMode ? 'bg-slate-950/80 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Sorting Weight (0 = Default)</label>
                      <input
                        type="number"
                        value={newShowcase.weight}
                        onChange={(e) => setNewShowcase({ ...newShowcase, weight: Number(e.target.value) || 0 })}
                        className={`w-full px-3.5 py-2 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${isDarkMode ? 'bg-slate-950/80 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-bold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Website Screenshot Mockup</label>
                      <div className="flex flex-col items-center justify-center">
                        <div className={`w-full h-36 rounded-xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden relative ${
                          isDarkMode ? 'bg-slate-950/40 border-gray-800 hover:border-gray-700' : 'bg-gray-50 border-gray-300 hover:border-gray-400'
                        }`}>
                          {newShowcase.screenshotUrl ? (
                            <>
                              <img src={newShowcase.screenshotUrl} alt="Screenshot Preview" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setNewShowcase({ ...newShowcase, screenshotUrl: '' })}
                                className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs"
                                title="Remove Image"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <div className="text-center p-4">
                              <input
                                type="file"
                                accept="image/*"
                                id="showcase-screenshot-input"
                                onChange={handleUploadShowcaseScreenshot}
                                className="hidden"
                                disabled={uploadingScreenshot}
                              />
                              <label
                                htmlFor="showcase-screenshot-input"
                                className={`cursor-pointer px-3 py-1.5 border rounded-lg text-[11px] font-bold inline-flex items-center space-x-1 transition-all ${
                                  uploadingScreenshot
                                    ? 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed'
                                    : isDarkMode
                                      ? 'bg-slate-800 hover:bg-slate-700 text-white border-gray-700'
                                      : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-305'
                                }`}
                              >
                                {uploadingScreenshot ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    <span>Uploading...</span>
                                  </>
                                ) : (
                                  <>
                                    <Image className="w-3 h-3" />
                                    <span>Upload Image</span>
                                  </>
                                )}
                              </label>
                              <p className="text-[10px] text-gray-500 mt-2">Recommended aspect: 16:9 ratio.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-4">
                      <button
                        type="submit"
                        disabled={savingShowcase || uploadingScreenshot}
                        className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/40 text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                      >
                        {savingShowcase ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        <span>{editingShowcaseId ? 'Update Showcase' : 'Save Showcase'}</span>
                      </button>
                      
                      {editingShowcaseId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingShowcaseId(null);
                            setNewShowcase({
                              title: '',
                              description: '',
                              url: '',
                              screenshotUrl: '',
                              weight: 0
                            });
                          }}
                          className={`py-2 px-3 border rounded-xl text-xs font-bold transition-all ${
                            isDarkMode ? 'border-gray-700 hover:bg-slate-800 text-gray-300' : 'border-gray-300 hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </div>

              {/* Showcase list grid */}
              <div className="lg:col-span-8 space-y-4">
                <div className={`p-6 border rounded-2xl ${isDarkMode ? 'bg-[#111928] border-gray-850' : 'bg-white border-gray-100 shadow-xs'}`}>
                  <h3 className={`font-bold mb-4 flex items-center space-x-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    <Layers className="w-5 h-5 text-indigo-500" />
                    <span>Current Showcased Sites ({showcases.length})</span>
                  </h3>

                  {showcases.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-gray-250 dark:border-gray-800 rounded-xl">
                      <Image className="w-8 h-8 text-gray-500 mx-auto mb-3" />
                      <p className="text-xs text-gray-500 font-medium">No client sites are showcased in the directory directory yet.</p>
                      <p className="text-[10px] text-gray-400 mt-1">Use the form on the left to add your first showcased travel brand website!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {showcases.slice().sort((a,b) => (b.weight || 0) - (a.weight || 0)).map((item) => (
                        <div key={item.id} className={`group border rounded-xl overflow-hidden transition-all flex flex-col justify-between ${
                          isDarkMode ? 'border-gray-800 bg-slate-950/60 hover:bg-slate-950' : 'border-gray-200 bg-gray-50 hover:bg-white hover:shadow-md'
                        }`}>
                          <div>
                            {/* Screenshot mock */}
                            <div className="h-40 bg-slate-900 relative overflow-hidden flex items-center justify-center">
                              {item.screenshotUrl ? (
                                <img src={item.screenshotUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                              ) : (
                                <Layers className="w-10 h-10 text-gray-700" />
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-60 group-hover:opacity-70 transition-opacity" />
                              <div className="absolute bottom-3 left-3 right-3 text-left">
                                <span className="inline-flex px-1.5 py-0.5 rounded-md bg-indigo-600 text-white text-[9px] font-bold mb-1">
                                  Weight: {item.weight || 0}
                                </span>
                                <h4 className="text-white text-xs font-black truncate">{item.title}</h4>
                              </div>
                            </div>

                            <div className="p-4 text-left">
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed h-8 mb-2">
                                {item.description || 'No description provided.'}
                              </p>
                              <a 
                                href={item.url} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-[11px] text-indigo-500 font-bold hover:underline inline-flex items-center space-x-1"
                              >
                                <span>Visit Live Site</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>

                          <div className={`p-3 border-t flex items-center justify-end space-x-2 ${
                            isDarkMode ? 'border-gray-800 bg-slate-950/40' : 'border-gray-200 bg-gray-50/50'
                          }`}>
                            <button
                              onClick={() => handleEditShowcaseClick(item)}
                              className={`p-1.5 rounded-lg border text-xs font-bold inline-flex items-center space-x-1 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors ${
                                isDarkMode ? 'border-gray-800 text-gray-400 hover:text-white' : 'border-gray-200 text-gray-600 hover:text-indigo-600'
                              }`}
                              title="Edit Item"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteShowcase(item.id)}
                              className="p-1.5 rounded-lg border border-red-500/10 hover:border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs font-bold inline-flex items-center space-x-1 transition-colors"
                              title="Delete Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'announcements' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Create Announcement */}
            <div className="border border-gray-800 bg-slate-900/40 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-2">Publish Platform Announcement</h2>
              <p className="text-xs text-gray-400 mb-6">Create global announcements displayed to all active tenant administrative screens.</p>

              <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Category</label>
                  <select
                    value={announcement.category}
                    onChange={(e) => setAnnouncement(prev => ({ ...prev, category: e.target.value as any }))}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white"
                  >
                    <option value="system">System Notification</option>
                    <option value="update">Feature Update</option>
                    <option value="marketing">Tips & Best Practices</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Announcement Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Server maintenance scheduled"
                    value={announcement.title}
                    onChange={(e) => setAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Content</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Provide full details of announcement here..."
                    value={announcement.content}
                    onChange={(e) => setAnnouncement(prev => ({ ...prev, content: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-gray-600"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl font-semibold text-xs bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center justify-center space-x-1.5"
                >
                  <Megaphone className="w-4 h-4" />
                  <span>Publish Announcement</span>
                </button>
              </form>
            </div>

            {/* Existing Announcements */}
            <div className="border border-gray-800 bg-slate-900/40 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-2">Global Feed History</h2>
              <p className="text-xs text-gray-400 mb-6">Announcements broadcasted across all active accounts.</p>

              {announcements.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-12">No announcements published yet.</p>
              ) : (
                <div className="space-y-4">
                  {announcements.map((ann) => (
                    <div key={ann.id} className="p-4 bg-slate-950 border border-gray-800/80 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono uppercase bg-indigo-900/30 text-indigo-300 border border-indigo-900 px-2 py-0.5 rounded">
                          {ann.category}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {ann.createdAt ? new Date(ann.createdAt.seconds * 1000).toLocaleDateString() : 'Today'}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white mb-1">{ann.title}</h4>
                      <p className="text-xs text-gray-400 leading-normal">{ann.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'tickets' && (
          <div className="border border-gray-800 bg-slate-900/40 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-800 bg-slate-900/60 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Submitted Support Tickets</h2>
                <p className="text-xs text-gray-400">Resolve customer problems and technical inquiries submitted by workspace administrators.</p>
              </div>
            </div>

            {tickets.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-16">No support tickets found.</p>
            ) : (
              <div className="divide-y divide-gray-800">
                {tickets.map((t) => (
                  <div key={t.id} className="p-6 hover:bg-slate-900/20 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${t.status === 'open' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                          {t.status.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">Tenant ID: {t.tenantId || 'SaaS Master'}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white mb-1">{t.subject}</h4>
                      <p className="text-xs text-gray-400 max-w-xl">{t.description}</p>
                    </div>

                    {t.status === 'open' && (
                      <button
                        onClick={() => handleResolveTicket(t.id)}
                        className="px-3.5 py-1.5 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/20 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Mark Resolved</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'end_users' && (
          <div className={`border rounded-2xl overflow-hidden ${isDarkMode ? 'border-gray-800 bg-slate-900/40' : 'border-gray-200 bg-white shadow-sm'}`}>
            <div className={`p-6 border-b flex items-center justify-between ${isDarkMode ? 'border-gray-800 bg-slate-900/60' : 'border-gray-200 bg-white'}`}>
              <div>
                <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Platform User Accounts</h2>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>List and manage system administrators, workspace owners, guides, and customer accounts.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`border-b text-[10px] font-mono uppercase tracking-wider ${isDarkMode ? 'border-gray-800/80 bg-slate-950/40 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                    <th className="py-4 px-6">User / Display Name</th>
                    <th className="py-4 px-6">Email Address</th>
                    <th className="py-4 px-6 font-mono">Assigned Tenant ID</th>
                    <th className="py-4 px-6">Access Role</th>
                    <th className="py-4 px-6">Account Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800/50' : 'divide-gray-100'}`}>
                  {users.map((u) => (
                    <tr key={u.id} className={`text-sm transition-colors ${isDarkMode ? 'hover:bg-slate-900/20' : 'hover:bg-gray-50'}`}>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <img src={u.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.displayName || u.email)}`} className={`w-8 h-8 rounded-full ${isDarkMode ? 'bg-slate-850' : 'bg-gray-100'}`} />
                          <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{u.displayName || 'Traveler'}</span>
                        </div>
                      </td>
                      <td className={`py-4 px-6 font-mono text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{u.email}</td>
                      <td className={`py-4 px-6 font-mono text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{u.tenantId || 'None (Platform Guest)'}</td>
                      <td className="py-4 px-6">
                        <select
                          value={u.role || 'customer'}
                          onChange={(e) => updateUserRole(u.id, e.target.value)}
                          className="bg-slate-950 border border-gray-800 text-xs text-indigo-300 font-mono rounded px-2.5 py-1 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="customer">Customer / Traveler</option>
                          <option value="supplier">Staff / Guide</option>
                          <option value="admin">Workspace Admin</option>
                          <option value="superadmin">Super Admin</option>
                        </select>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center space-x-1.5 text-xs font-semibold ${u.status !== 'suspended' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.status !== 'suspended' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                          <span>{u.status !== 'suspended' ? 'Active' : 'Suspended'}</span>
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            title="Edit User"
                            onClick={() => handleEditUser(u.id, u.displayName || '')}
                            className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'}`}
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                          <button
                            title={u.status !== 'suspended' ? 'Suspend User' : 'Activate User'}
                            onClick={() => toggleUserStatus(u.id, u.status || 'active')}
                            className={`p-1.5 rounded-lg transition-colors ${u.status !== 'suspended' ? (isDarkMode ? 'hover:bg-rose-950/50 text-rose-400' : 'hover:bg-rose-50 text-rose-600') : (isDarkMode ? 'hover:bg-emerald-950/50 text-emerald-400' : 'hover:bg-emerald-50 text-emerald-600')}`}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                          <button
                            title="Delete User completely"
                            onClick={() => handleDeleteUser(u.id)}
                            className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-red-900/50 text-red-500' : 'hover:bg-red-50 text-red-600'}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'packages' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Form Card */}
            <div className={`border rounded-3xl p-8 ${isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-gray-200 bg-white shadow-sm'}`}>
              <h2 className={`text-lg font-bold mb-2 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <Sparkles className="w-5 h-5 text-indigo-500" />
                <span>{editingPackageId ? 'Edit Pricing Package' : 'Create New Pricing Package'}</span>
              </h2>
              <p className={`text-xs mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Provision subscription tiers integrated directly with Creem.io product identifiers.</p>

              <form onSubmit={handleCreatePackage} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-[10px] font-mono font-semibold text-gray-400 uppercase mb-2">Package Display Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Agency Elite Plan"
                    value={newPackage.name}
                    onChange={e => setNewPackage(prev => ({ ...prev, name: e.target.value }))}
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${isDarkMode ? 'bg-slate-950 border-gray-800 text-white placeholder-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-semibold text-gray-400 uppercase mb-2">Package Slug (Unique)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. agency-elite"
                    value={newPackage.slug}
                    onChange={e => setNewPackage(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${isDarkMode ? 'bg-slate-950 border-gray-800 text-white placeholder-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-semibold text-gray-400 uppercase mb-2">Billing Interval</label>
                  <select
                    value={newPackage.interval}
                    onChange={e => setNewPackage(prev => ({ ...prev, interval: e.target.value }))}
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${isDarkMode ? 'bg-slate-950 border-gray-800 text-white placeholder-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annually</option>
                    <option value="lifetime">Lifetime</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-semibold text-gray-400 uppercase mb-2">Price ($ USD)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 29"
                    value={newPackage.price || ''}
                    onChange={e => setNewPackage(prev => ({ ...prev, price: Number(e.target.value) }))}
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${isDarkMode ? 'bg-slate-950 border-gray-800 text-white placeholder-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-semibold text-gray-400 uppercase mb-2">Creem Product ID</label>
                  <input
                    type="text"
                    placeholder="e.g. prod_w95g..."
                    value={newPackage.productId}
                    onChange={e => setNewPackage(prev => ({ ...prev, productId: e.target.value }))}
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${isDarkMode ? 'bg-slate-950 border-gray-800 text-white placeholder-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-semibold text-gray-400 uppercase mb-2">Max Tours Allowed</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 50"
                    value={newPackage.maxTours || ''}
                    onChange={e => setNewPackage(prev => ({ ...prev, maxTours: Number(e.target.value) }))}
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${isDarkMode ? 'bg-slate-950 border-gray-800 text-white placeholder-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-semibold text-gray-400 uppercase mb-2">Max Bookings Allowed / Mo</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 1000"
                    value={newPackage.maxBookings || ''}
                    onChange={e => setNewPackage(prev => ({ ...prev, maxBookings: Number(e.target.value) }))}
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${isDarkMode ? 'bg-slate-950 border-gray-800 text-white placeholder-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-mono font-semibold text-gray-400 uppercase mb-2">Features Perks (Comma-separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. Custom Subdomains, Premium WhatsApp Support, 10 Agency Logins"
                    value={newPackage.featuresString}
                    onChange={e => setNewPackage(prev => ({ ...prev, featuresString: e.target.value }))}
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${isDarkMode ? 'bg-slate-950 border-gray-800 text-white placeholder-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
                  />
                </div>

                <div className="flex items-center space-x-3 mt-8">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={newPackage.isActive}
                    onChange={e => setNewPackage(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-950 border-gray-850 h-4 w-4"
                  />
                  <label htmlFor="isActive" className="text-xs font-semibold text-gray-300">Set Active immediately</label>
                </div>

                <div className="md:col-span-3 flex justify-end gap-3">
                  {editingPackageId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPackageId(null);
                        setNewPackage({
                          name: '', slug: '', interval: 'monthly', price: 0, productId: '',
                          featuresString: '', maxTours: 10, maxBookings: 100, isActive: true
                        });
                      }}
                      className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 uppercase tracking-wider"
                    >
                      Cancel Edit
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 uppercase tracking-wider"
                  >
                    <Plus className="w-4 h-4" /> {editingPackageId ? 'Save Changes' : 'Create Pricing Package'}
                  </button>
                </div>
              </form>
            </div>

            {/* List Card */}
            <div className={`border rounded-2xl overflow-hidden ${isDarkMode ? 'border-gray-800 bg-slate-900/40' : 'border-gray-200 bg-white shadow-sm'}`}>
              <div className={`p-6 border-b flex justify-between items-center ${isDarkMode ? 'border-gray-800 bg-slate-900/60' : 'border-gray-200 bg-white'}`}>
                <h3 className={`text-sm font-black uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Platform Subscription Tiers</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b text-[10px] font-mono uppercase tracking-wider ${isDarkMode ? 'border-gray-800/80 bg-slate-950/40 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                      <th className="py-4 px-6">Package Name</th>
                      <th className="py-4 px-6">Slug</th>
                      <th className="py-4 px-6">Pricing</th>
                      <th className="py-4 px-6 font-mono">Product IDs</th>
                      <th className="py-4 px-6">Allowances</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800/50' : 'divide-gray-100'}`}>
                    {packages.map((pkg) => (
                      <tr key={pkg.id} className={`text-sm transition-colors ${isDarkMode ? 'hover:bg-slate-900/20' : 'hover:bg-gray-50'}`}>
                        <td className="py-4 px-6">
                          <div className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{pkg.name}</div>
                          <div className="text-[10px] text-gray-500 font-semibold max-w-[200px] truncate">
                            {pkg.features?.join(' • ')}
                          </div>
                        </td>
                        <td className={`py-4 px-6 font-mono text-xs ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>{pkg.slug}</td>
                        <td className={`py-4 px-6 font-bold capitalize ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          {pkg.interval}: ${pkg.price}
                        </td>
                        <td className={`py-4 px-6 font-mono text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {pkg.productId}
                        </td>
                        <td className={`py-4 px-6 text-xs leading-normal ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Tours: <strong className={isDarkMode ? 'text-white' : 'text-gray-900'}>{pkg.maxTours}</strong><br/>
                          Bookings: <strong className={isDarkMode ? 'text-white' : 'text-gray-900'}>{pkg.maxBookings}</strong>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center space-x-1.5 text-xs font-semibold ${pkg.isActive ? 'text-emerald-400' : 'text-gray-500'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${pkg.isActive ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                            <span>{pkg.isActive ? 'Active' : 'Draft'}</span>
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right space-x-2">
                          <button
                            onClick={() => handleEditPackage(pkg)}
                            className="px-2.5 py-1.5 border border-indigo-900/50 text-xs font-semibold text-indigo-400 rounded-lg hover:bg-indigo-900/20 transition-all inline-flex items-center gap-1"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => togglePackageActive(pkg.id, pkg.isActive)}
                            className="px-2.5 py-1.5 border border-gray-800 text-xs font-semibold text-gray-300 rounded-lg hover:bg-slate-800 transition-all inline-flex items-center gap-1"
                          >
                            <Power className="w-3 h-3" /> {pkg.isActive ? 'Draft' : 'Publish'}
                          </button>
                          <button
                            onClick={() => handleDeletePackage(pkg.id)}
                            className="px-2.5 py-1.5 border border-rose-950 text-xs font-semibold text-rose-400 rounded-lg hover:bg-rose-950/20 transition-all inline-flex items-center gap-1"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Password Management */}
            <div className={`border rounded-3xl p-8 ${isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-gray-200 bg-white shadow-sm'}`}>
              <h2 className={`text-lg font-bold mb-2 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <Lock className="w-5 h-5 text-indigo-500" />
                <span>Change Superadmin Password</span>
              </h2>
              <p className={`text-xs mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Update your administrator credentials below. To ensure security, you are required to provide your current password for re-authentication.
              </p>

              {passwordError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-xl mb-4 leading-relaxed">
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-4 py-3 rounded-xl mb-4 leading-relaxed">
                  {passwordSuccess}
                </div>
              )}

              <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-[10px] font-mono font-semibold text-gray-400 uppercase mb-2">Current Admin Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${isDarkMode ? 'bg-slate-950 border-gray-800 text-white placeholder-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-semibold text-gray-400 uppercase mb-2">New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${isDarkMode ? 'bg-slate-950 border-gray-800 text-white placeholder-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-semibold text-gray-400 uppercase mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmNewPassword}
                    onChange={e => setConfirmNewPassword(e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${isDarkMode ? 'bg-slate-950 border-gray-800 text-white placeholder-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={updatingPassword}
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm rounded-xl flex items-center space-x-2 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                >
                  {updatingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <span>Update Credentials</span>
                  )}
                </button>
              </form>
            </div>

            {/* OTP Status Indicator */}
            <div className={`border rounded-3xl p-8 ${isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-gray-200 bg-white shadow-sm'}`}>
              <h2 className={`text-lg font-bold mb-2 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <ShieldAlert className="w-5 h-5 text-indigo-500" />
                <span>Multi-Factor OTP Enforcement</span>
              </h2>
              <div className="flex items-center space-x-3 mb-4">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-mono font-bold text-emerald-500 uppercase">Enforced & Active</span>
              </div>
              <p className={`text-xs mb-6 max-w-2xl leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                SaaS Superadmin console is fortified with dynamic One-Time Password (OTP) security. Every access request triggers a 6-digit cryptographic verification code sent directly to your registered e-mail address.
              </p>

              <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl max-w-2xl">
                <h4 className="text-xs font-bold text-indigo-400 mb-1">Diagnostic Mode & Fallback Security</h4>
                <p className="text-[11px] text-gray-400 leading-normal">
                  If your platform email integration is not yet active, our security gateway gracefully intercepts OTP payloads and logs them to the developer console, allowing you to bypass and verify without disruption during staging tests.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Tenant Management Modal */}
      {isTenantModalOpen && selectedTenant && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setIsTenantModalOpen(false)} />
          <div className={`relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col ${isDarkMode ? 'bg-[#0b101a] border border-gray-800' : 'bg-white'}`}>
            
            {/* Modal Header */}
            <div className={`px-6 py-5 border-b flex items-center justify-between ${isDarkMode ? 'border-gray-800 bg-slate-900/50' : 'border-gray-200 bg-gray-50'}`}>
              <div>
                <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedTenant.companyName}</h3>
                <p className={`text-sm font-mono mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{selectedTenant.slug}</p>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => {
                    if (selectedTenant.customDomain) {
                      const protocol = window.location.hostname === 'localhost' ? 'http://' : 'https://';
                      window.location.href = `${protocol}${selectedTenant.customDomain}/?impersonate=${selectedTenant.id}`;
                    } else {
                      window.location.href = `/?impersonate=${selectedTenant.id}`;
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center space-x-2"
                >
                  <Eye className="w-4 h-4" />
                  <span>Impersonate</span>
                </button>
                <button onClick={() => setIsTenantModalOpen(false)} className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'text-gray-400 hover:bg-gray-800 hover:text-white' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-900'}`}>
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Navigation */}
            <div className={`flex border-b px-6 space-x-6 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
              {(['overview', 'billing', 'transactions'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setTenantModalTab(tab)}
                  className={`py-4 text-sm font-semibold capitalize border-b-2 transition-colors ${
                    tenantModalTab === tab 
                      ? 'border-indigo-500 text-indigo-500' 
                      : `border-transparent ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              
              {tenantModalTab === 'overview' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Contact Email</label>
                      <div className={`font-mono text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedTenant.email || 'Not provided'}</div>
                    </div>
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Phone</label>
                      <div className={`font-mono text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedTenant.phone || 'Not provided'}</div>
                    </div>
                    <div className="col-span-2">
                      <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Address</label>
                      <div className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedTenant.address || 'Not provided'}</div>
                    </div>
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Created At</label>
                      <div className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedTenant.createdAt ? new Date(selectedTenant.createdAt).toLocaleString() : 'Unknown'}</div>
                    </div>
                  </div>

                  <div className={`p-6 rounded-xl border ${isDarkMode ? 'border-rose-900/50 bg-rose-950/10' : 'border-rose-200 bg-rose-50'}`}>
                    <h4 className={`text-sm font-bold mb-4 ${isDarkMode ? 'text-rose-400' : 'text-rose-600'}`}>Danger Zone</h4>
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => toggleTenantStatus(selectedTenant.id, selectedTenant.status)}
                        className={`px-4 py-2 border rounded-lg text-sm font-semibold transition-colors ${
                          selectedTenant.status === 'active' 
                            ? (isDarkMode ? 'border-rose-900/50 hover:bg-rose-900/20 text-rose-400' : 'border-rose-200 hover:bg-rose-100 text-rose-600')
                            : (isDarkMode ? 'border-emerald-900/50 hover:bg-emerald-900/20 text-emerald-400' : 'border-emerald-200 hover:bg-emerald-100 text-emerald-600')
                        }`}
                      >
                        {selectedTenant.status === 'active' ? 'Suspend Workspace' : 'Unsuspend Workspace'}
                      </button>
                      <button
                        onClick={() => deleteTenantWorkspace(selectedTenant.id)}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center space-x-2"
                      >
                        <ShieldAlert className="w-4 h-4" />
                        <span>Delete Workspace Permanently</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {tenantModalTab === 'billing' && (
                <div className="space-y-6">
                  <div className={`p-6 rounded-xl border ${isDarkMode ? 'border-gray-800 bg-slate-900/50' : 'border-gray-200 bg-gray-50'}`}>
                    <h4 className={`text-sm font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Subscription Management</h4>
                    <div className="flex items-end space-x-4">
                      <div className="flex-1">
                        <label className={`block text-xs font-semibold mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Current Plan</label>
                        <select
                          value={selectedTenant.plan || 'starter'}
                          onChange={(e) => updateTenantPlan(selectedTenant.id, e.target.value as any)}
                          className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:border-indigo-500 transition-colors ${
                            isDarkMode 
                              ? 'bg-slate-950 border-gray-800 text-white' 
                              : 'bg-white border-gray-300 text-gray-900'
                          }`}
                        >
                          {packages.length === 0 && <option value="starter">Starter (Fallback)</option>}
                          {packages.map(pkg => (
                            <option key={pkg.id} value={pkg.slug}>
                              {pkg.name} (${pkg.monthlyPrice !== undefined ? pkg.monthlyPrice : (pkg.price || 0)}/mo)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <p className={`mt-3 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Changing the plan immediately reflects in the tenant's limits and the superadmin MRR tracking.
                    </p>
                  </div>
                </div>
              )}

              {tenantModalTab === 'transactions' && (
                <div>
                  <div className={`border rounded-xl overflow-hidden ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className={`border-b text-[10px] font-mono uppercase tracking-wider ${isDarkMode ? 'border-gray-800 bg-slate-900/50 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Description</th>
                          <th className="py-3 px-4">Amount</th>
                          <th className="py-3 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-200'}`}>
                        {/* Dynamic Transactions */}
                        {(() => {
                          let createdAtStr = selectedTenant.createdAt;
                          if (!createdAtStr) {
                            const fallbackDate = new Date();
                            fallbackDate.setMonth(fallbackDate.getMonth() - 2);
                            createdAtStr = fallbackDate.toISOString();
                          }
                          const createdDate = new Date(createdAtStr);
                          if (isNaN(createdDate.getTime())) {
                            return (
                              <tr>
                                <td colSpan={4} className="py-4 text-center text-xs text-gray-500">
                                  No transaction history found.
                                </td>
                              </tr>
                            );
                          }
                          
                          const billingInterval = selectedTenant.billingInterval || 'monthly';
                          const planSlug = selectedTenant.plan || 'starter';
                          const matchedPlan = packages.find(p => 
                            p.slug?.toLowerCase() === planSlug.toLowerCase() && 
                            (p.interval || 'monthly') === billingInterval
                          ) || packages.find(p => p.slug?.toLowerCase() === planSlug.toLowerCase());
                          
                          let defaultPrice = 49;
                          if (planSlug === 'business') {
                            defaultPrice = billingInterval === 'lifetime' ? 999 : billingInterval === 'annual' ? 1990 : 199;
                          } else if (planSlug === 'professional') {
                            defaultPrice = billingInterval === 'lifetime' ? 499 : billingInterval === 'annual' ? 990 : 99;
                          } else if (planSlug === 'enterprise') {
                            defaultPrice = billingInterval === 'lifetime' ? 2499 : billingInterval === 'annual' ? 4990 : 499;
                          } else { // starter
                            defaultPrice = billingInterval === 'lifetime' ? 249 : billingInterval === 'annual' ? 490 : 49;
                          }

                          const price = matchedPlan 
                            ? (matchedPlan.price !== undefined ? matchedPlan.price : defaultPrice)
                            : defaultPrice;
                          
                          const now = new Date();
                          const transactions: any[] = [];
                          let currentCycleDate = new Date(createdDate);
                          let safetyCounter = 0;
                          
                          if (selectedTenant.status === 'trial') {
                            // 1. Trial Period Activation ($0)
                            transactions.push({
                              date: createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                              description: `Trial Period - ${planSlug.toUpperCase()}`,
                              amount: "$0.00",
                              status: 'Trial'
                            });
                            
                            // 2. Subscription Renewal (Unpaid during trial)
                            transactions.push({
                              date: createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                              description: `Subscription Renewal - ${planSlug.toUpperCase()}`,
                              amount: `$${price}.00`,
                              status: 'Unpaid'
                            });
                          } else {
                            while (currentCycleDate <= now && safetyCounter < 100) {
                              safetyCounter++;
                              const txnDate = new Date(currentCycleDate);
                              
                              let status = 'Paid';
                              if (selectedTenant.status === 'pending') {
                                status = 'Pending';
                              } else if (selectedTenant.status === 'suspended') {
                                status = 'Unpaid';
                              }
                              
                              transactions.push({
                                date: txnDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                                description: `Subscription Renewal - ${planSlug.toUpperCase()}`,
                                amount: `$${price}.00`,
                                status: status
                              });
                              
                              if (billingInterval === 'annual') {
                                currentCycleDate.setFullYear(currentCycleDate.getFullYear() + 1);
                              } else if (billingInterval === 'lifetime') {
                                break;
                              } else {
                                currentCycleDate.setMonth(currentCycleDate.getMonth() + 1);
                              }
                            }
                          }
                          
                          if (transactions.length === 0) {
                            return (
                              <tr>
                                <td colSpan={4} className="py-4 text-center text-xs text-gray-500">
                                  No transaction history found.
                                </td>
                              </tr>
                            );
                          }
                          
                          return transactions.reverse().map((txn, index) => (
                            <tr key={index} className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              <td className="py-3 px-4 font-mono text-xs">{txn.date}</td>
                              <td className="py-3 px-4">{txn.description}</td>
                              <td className="py-3 px-4 font-mono">{txn.amount}</td>
                              <td className="py-3 px-4">
                                <span className={`text-xs font-semibold ${
                                  txn.status === 'Paid' ? 'text-emerald-500' : 
                                  txn.status === 'Trial' ? 'text-sky-500 font-bold' : 
                                  txn.status === 'Pending' ? 'text-amber-500' : 'text-rose-500'
                                }`}>
                                  {txn.status}
                                </span>
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Customer Confirmation Modal */}
      {tenantToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-md p-6 rounded-2xl shadow-xl ${isDarkMode ? 'bg-slate-900 border border-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full dark:bg-red-900/30">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-500" />
            </div>
            
            <h3 className={`text-lg font-bold text-center mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Delete Customer: {tenantToDelete.companyName}?
            </h3>
            
            <p className={`text-sm text-center font-medium mb-6 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
              Are you sure want to delete this? This operation is irreversible and will delete all user accounts, transactions, and data linked to the tenant space.
            </p>

            <div className="flex space-x-3">
              <button
                onClick={() => setTenantToDelete(null)}
                disabled={isDeletingCustomer}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg ${isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition-colors disabled:opacity-50`}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCustomer}
                disabled={isDeletingCustomer}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeletingCustomer ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Yes, Delete Completely</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Customer Creation Modal */}
      {isManualCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-md p-6 rounded-2xl shadow-xl ${isDarkMode ? 'bg-slate-900 border border-gray-800' : 'bg-white'}`}>
            <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Create Customer Manually</h3>
            
            {generatedInvoiceLink ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-emerald-400 mb-1">Customer Provisioned</h4>
                  <p className="text-xs text-gray-400">Account created successfully.</p>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-2">Temporary Password</label>
                  <input
                    readOnly
                    value={generatedPassword}
                    className="w-full px-4 py-2 bg-slate-950 border border-gray-800 rounded-xl text-sm font-mono text-emerald-400"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">Please securely send this password to the customer.</p>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-2">Invoice Link</label>
                  <a
                    href={generatedInvoiceLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-full items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all"
                  >
                    Open Payment Link
                  </a>
                </div>
                <button
                  onClick={() => {
                    setIsManualCustomerModalOpen(false);
                    setGeneratedInvoiceLink('');
                    setGeneratedPassword('');
                    setManualCustomerForm({ companyName: '', slug: '', adminEmail: '', plan: 'starter', duration: 'monthly' });
                  }}
                  className="w-full py-2 bg-gray-800 text-white rounded-xl text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleManualCustomerSubmit} className="space-y-4">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Company Name</label>
                  <input
                    type="text"
                    required
                    value={manualCustomerForm.companyName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setManualCustomerForm(prev => ({
                        ...prev,
                        companyName: val,
                        slug: val.toLowerCase().replace(/[^a-z0-9]/g, '')
                      }));
                    }}
                    className={`w-full px-4 py-2 border rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all ${isDarkMode ? 'bg-slate-900 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Tenant Slug (Subdomain)</label>
                  <input
                    type="text"
                    required
                    value={manualCustomerForm.slug}
                    onChange={(e) => setManualCustomerForm(prev => ({ ...prev, slug: e.target.value }))}
                    className={`w-full px-4 py-2 border rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all ${isDarkMode ? 'bg-slate-900 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Admin Email</label>
                  <input
                    type="email"
                    required
                    value={manualCustomerForm.adminEmail}
                    onChange={(e) => setManualCustomerForm(prev => ({ ...prev, adminEmail: e.target.value }))}
                    className={`w-full px-4 py-2 border rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all ${isDarkMode ? 'bg-slate-900 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Subscription Plan</label>
                    <select
                      value={manualCustomerForm.plan}
                      onChange={(e) => setManualCustomerForm(prev => ({ ...prev, plan: e.target.value }))}
                      className={`w-full px-4 py-2 border rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all ${isDarkMode ? 'bg-slate-900 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                    >
                      {Object.values(
                        packages.reduce((acc, p) => {
                          const groupKey = (p.slug || p.name).toLowerCase().replace(/-(monthly|annual|lifetime|yearly)$/i, '').split(' ')[0].trim();
                          acc[groupKey] = acc[groupKey] || p;
                          return acc;
                        }, {} as Record<string, any>)
                      ).map((p: any) => (
                        <option key={p.id || p.slug} value={p.slug.toLowerCase().replace(/-(monthly|annual|lifetime|yearly)$/i, '').split(' ')[0].trim()}>{p.name.replace(/-(monthly|annual|lifetime|yearly)$/i, '').split(' ')[0].trim()}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Duration</label>
                    <select
                      value={manualCustomerForm.duration}
                      onChange={(e) => setManualCustomerForm(prev => ({ ...prev, duration: e.target.value }))}
                      className={`w-full px-4 py-2 border rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all ${isDarkMode ? 'bg-slate-900 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="annual">Annual</option>
                      <option value="lifetime">Lifetime</option>
                    </select>
                  </div>
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    disabled={isManualCreating}
                    onClick={() => setIsManualCustomerModalOpen(false)}
                    className={`flex-1 py-2 rounded-xl font-medium transition-all ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isManualCreating}
                    className="flex-1 flex items-center justify-center py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-xl font-medium transition-all shadow-md shadow-indigo-500/20"
                  >
                    {isManualCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Provision"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
