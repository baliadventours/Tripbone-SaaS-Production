import React, { useState, useEffect, useMemo } from 'react';
import { db, collection, addDoc, updateDoc, doc, deleteDoc, onSnapshot, serverTimestamp, setDoc, getDoc } from '../../lib/firebase';
import { 
  Sparkles, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  X, 
  FileText, 
  Send, 
  Printer, 
  Copy, 
  DollarSign, 
  User, 
  Mail, 
  Phone, 
  Globe, 
  Users, 
  Calendar, 
  Percent, 
  Calculator, 
  Building2, 
  Car, 
  Ticket as TicketIcon, 
  Utensils, 
  Compass, 
  Check, 
  ChevronRight, 
  Loader2,
  Package,
  Share2,
  Tag,
  Clock,
  ArrowRight,
  GripVertical,
  Sliders,
  ShieldCheck,
  AlertCircle,
  FileCheck,
  Image as ImageIcon,
  MapPin,
  HelpCircle,
  Eye,
  Settings,
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  Hotel,
  XCircle
} from 'lucide-react';

export interface InventoryItem {
  id: string;
  name: string;
  type: 'Ticket' | 'Transport' | 'Hotel' | 'Food' | 'Guide' | 'Extra' | string;
  price: number;
  priceType: 'Per person' | 'Per car' | 'Per room' | 'Per day' | 'Flat rate' | string;
  description?: string;
  createdAt?: any;
}

export interface ProposalLineItem {
  inventoryId?: string;
  name: string;
  type: string;
  price: number;
  priceType: string;
  quantity: number;
  subtotal: number;
  day: number;
  description?: string;
}

export function getItemDescription(item: { name: string; type?: string; description?: string }): string {
  if (item.description && item.description.trim().length > 5) {
    return item.description;
  }
  
  const nameLower = (item.name || '').toLowerCase();
  const typeLower = (item.type || '').toLowerCase();

  if (nameLower.includes('bebek tepi sawah') || nameLower.includes('lunch')) {
    return 'A delicious lunch served in a traditional restaurant with rice terrace view';
  }
  if (nameLower.includes('airport transfer') || (typeLower === 'transport' && nameLower.includes('airport'))) {
    return 'Comfortable transfer to the airport with AC car';
  }
  if (nameLower.includes('maya ubud') || nameLower.includes('hotel') || nameLower.includes('resort')) {
    return 'Luxurious resort stay surrounded by lush tropical valley greenery';
  }
  if (nameLower.includes('lempuyang') || nameLower.includes('temple')) {
    return 'Spiritual temple entry ticket featuring the iconic Gates of Heaven photo spot';
  }
  if (nameLower.includes('barong') || nameLower.includes('dance')) {
    return 'Traditional Balinese cultural performance ticket showcasing local mythology and music';
  }
  if (nameLower.includes('car charter') || nameLower.includes('avanza') || typeLower === 'transport') {
    return 'Private AC vehicle charter with dedicated driver, petrol, and parking included';
  }
  if (typeLower === 'guide') {
    return 'Licensed English-speaking local expert guide for personalized cultural commentary';
  }
  if (typeLower === 'ticket') {
    return 'Official entry ticket with fast-track access included';
  }
  if (typeLower === 'food') {
    return 'Authentic local dining experience featuring signature Balinese delicacies';
  }

  return 'Premium included logistics service for a seamless travel experience';
}

export interface ItineraryDayNarrative {
  dayNumber: number;
  title: string;
  summary: string;
  activities: string[];
}

export interface Proposal {
  id?: string;
  proposalTitle: string;
  guestName: string;
  email: string;
  phone: string;
  nationality: string;
  paxCount: number;
  durationDays: number;
  marginPercentage: number;
  baseSubtotal: number;
  marginAmount: number;
  totalPrice: number;
  currency: string;
  selectedItems: ProposalLineItem[];
  lineItems?: ProposalLineItem[];
  dayInclusions?: Record<number, string[]>;
  dayExclusions?: Record<number, string[]>;
  companyName?: string;
  companyLogo?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyAddress?: string;
  companyWebsite?: string;
  welcomeMessage: string;
  itineraryNarrative: ItineraryDayNarrative[];
  inclusions: string[];
  exclusions: string[];
  termsAndConditions: string[];
  importantTips: string[];
  closingNotes: string;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Confirmed';
  createdAt?: any;
}

// Preset Global Master Data
const PRESET_INCLUSIONS = [
  "Private Deluxe AC Vehicle with Professional Driver",
  "Licensed English-Speaking Local Tour Guide",
  "All Attraction & Temple Entrance Tickets",
  "Complimentary Daily Cold Mineral Water & Refreshments",
  "Door-to-Door Hotel Pickup and Drop-off",
  "Authentic Buffet / Set Lunch as Detailed in Itinerary",
  "Government Taxes, Service Charges & Toll Fees",
  "Parking Fees & Highway Charges Included"
];

const PRESET_EXCLUSIONS = [
  "International & Domestic Airfare Tickets",
  "Personal Expenses, Shopping & Tipping",
  "Gratuities for Driver and Tour Guide",
  "Personal Travel, Health & Medical Insurance",
  "Alcoholic Beverages & Soft Drinks during Meals",
  "Hotel Accommodation (Unless Explicitly Specified)"
];

const PRESET_TERMS = [
  "50% deposit required upon confirmation to lock reservations.",
  "Remaining 50% balance payable on Day 1 upon arrival.",
  "Cancellations 7+ days prior receive a 100% deposit refund.",
  "Cancellations within 48 hours are non-refundable due to vendor locks.",
  "Itinerary subject to minor adjustments based on weather and traffic.",
  "Quoted prices in IDR/USD are valid for 30 days from proposal date."
];

interface ProposalGeneratorProps {
  isDarkMode?: boolean;
  tenantId?: string;
}

export default function ProposalGenerator({ isDarkMode = false, tenantId }: ProposalGeneratorProps) {
  const [activeSubTab, setActiveSubTab] = useState<'create' | 'inventory' | 'history'>('create');

  // Company / Tenant Branding Information State
  const [companyName, setCompanyName] = useState('Smart Bali Tours & Travel');
  const [companyLogo, setCompanyLogo] = useState('https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=200&q=80');
  const [companyEmail, setCompanyEmail] = useState('info@smartbalitours.com');
  const [companyPhone, setCompanyPhone] = useState('+62 812-3456-7890');
  const [companyAddress, setCompanyAddress] = useState('Jl. Sunset Road No. 88, Seminyak, Kuta, Bali 80361');
  const [companyWebsite, setCompanyWebsite] = useState('www.smartbalitours.com');
  const [showBrandConfig, setShowBrandConfig] = useState(false);

  // Inventory state
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState('all');

  // Inventory Modal state
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [editingInventoryItem, setEditingInventoryItem] = useState<Partial<InventoryItem> | null>(null);
  const [isSavingInventory, setIsSavingInventory] = useState(false);

  // Proposal Form state
  const [guestName, setGuestName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [nationality, setNationality] = useState('');
  const [paxCount, setPaxCount] = useState<number>(2);
  const [durationDays, setDurationDays] = useState<number>(3);
  const [marginPercentage, setMarginPercentage] = useState<number>(15);
  const [currency, setCurrency] = useState('IDR');
  const [specialNotes, setSpecialNotes] = useState('');

  // Itinerary Line Items (Day assigned)
  const [selectedLineItems, setSelectedLineItems] = useState<ProposalLineItem[]>([]);

  // Master Data Banks for Inclusions, Exclusions & Terms
  const [masterInclusions, setMasterInclusions] = useState<string[]>([...PRESET_INCLUSIONS]);
  const [masterExclusions, setMasterExclusions] = useState<string[]>([...PRESET_EXCLUSIONS]);
  const [masterTerms, setMasterTerms] = useState<string[]>([...PRESET_TERMS]);
  const [newMasterInclusionInput, setNewMasterInclusionInput] = useState('');
  const [newMasterExclusionInput, setNewMasterExclusionInput] = useState('');

  // Brand config saving state
  const [isSavingBrand, setIsSavingBrand] = useState(false);
  const [brandSaveSuccess, setBrandSaveSuccess] = useState(false);

  // Email modal state
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [customerEmailInput, setCustomerEmailInput] = useState('');
  const [emailSubjectInput, setEmailSubjectInput] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Per-Day Inclusions & Exclusions State
  const [dayInclusions, setDayInclusions] = useState<Record<number, string[]>>({});
  const [dayExclusions, setDayExclusions] = useState<Record<number, string[]>>({});
  const [dayInclusionInputs, setDayInclusionInputs] = useState<Record<number, string>>({});
  const [dayExclusionInputs, setDayExclusionInputs] = useState<Record<number, string>>({});

  // Catalog Sub-tab State
  const [catalogSubTab, setCatalogSubTab] = useState<'inventory' | 'inclusions' | 'exclusions'>('inventory');

  // Unified Drag State across 6 categories
  const [draggedCatalogItem, setDraggedCatalogItem] = useState<{
    kind: 'inventory' | 'inclusion' | 'exclusion';
    data: InventoryItem | string;
  } | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<{ 
    day: number; 
    target: 'itinerary' | 'transport' | 'accommodation' | 'food' | 'inclusion' | 'exclusion' 
  } | null>(null);

  // Legacy Drag State compatibility
  const [draggedInventoryItem, setDraggedInventoryItem] = useState<InventoryItem | null>(null);
  const [activeDropDay, setActiveDropDay] = useState<number | null>(null);

  // Category Expand / Collapse Box State for Inventory Catalog Sidebar
  const [collapsedCatalogCategories, setCollapsedCatalogCategories] = useState<Record<string, boolean>>({
    itinerary: false,
    transport: false,
    accommodation: false,
    food: false,
    inclusion: false,
    exclusion: false,
  });

  // Category Expand / Collapse Box State for Day-by-Day Builder
  const [collapsedDaySections, setCollapsedDaySections] = useState<Record<string, boolean>>({});

  const toggleCatalogCategoryCollapse = (catId: string) => {
    setCollapsedCatalogCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  const expandAllCatalogCategories = () => {
    setCollapsedCatalogCategories({
      itinerary: false,
      transport: false,
      accommodation: false,
      food: false,
      inclusion: false,
      exclusion: false,
    });
  };

  const collapseAllCatalogCategories = () => {
    setCollapsedCatalogCategories({
      itinerary: true,
      transport: true,
      accommodation: true,
      food: true,
      inclusion: true,
      exclusion: true,
    });
  };

  const toggleDaySectionCollapse = (dayNum: number, sectionId: string) => {
    const key = `d${dayNum}-${sectionId}`;
    setCollapsedDaySections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Collapse / Expand Day State for Builder & Document Preview
  const [collapsedBuilderDays, setCollapsedBuilderDays] = useState<Record<number, boolean>>({});
  const [collapsedDocDays, setCollapsedDocDays] = useState<Record<number, boolean>>({});

  const toggleBuilderDayCollapse = (dayNum: number) => {
    setCollapsedBuilderDays(prev => ({ ...prev, [dayNum]: !prev[dayNum] }));
  };

  const expandAllBuilderDays = () => {
    setCollapsedBuilderDays({});
  };

  const collapseAllBuilderDays = () => {
    const allCollapsed: Record<number, boolean> = {};
    for (let i = 1; i <= durationDays; i++) {
      allCollapsed[i] = true;
    }
    setCollapsedBuilderDays(allCollapsed);
  };

  const toggleDocDayCollapse = (dayNum: number) => {
    setCollapsedDocDays(prev => ({ ...prev, [dayNum]: !prev[dayNum] }));
  };

  const expandAllDocDays = () => {
    setCollapsedDocDays({});
  };

  const collapseAllDocDays = () => {
    if (!generatedProposal) return;
    const allCollapsed: Record<number, boolean> = {};
    generatedProposal.itineraryNarrative.forEach(day => {
      allCollapsed[day.dayNumber] = true;
    });
    setCollapsedDocDays(allCollapsed);
  };

  // Inclusions, Exclusions, Terms Selected State
  const [selectedInclusions, setSelectedInclusions] = useState<string[]>([...PRESET_INCLUSIONS.slice(0, 5)]);
  const [selectedExclusions, setSelectedExclusions] = useState<string[]>([...PRESET_EXCLUSIONS.slice(0, 4)]);
  const [selectedTerms, setSelectedTerms] = useState<string[]>([...PRESET_TERMS.slice(0, 5)]);

  // Custom Input States for Inclusions / Exclusions / Terms
  const [customInclusionInput, setCustomInclusionInput] = useState('');
  const [customExclusionInput, setCustomExclusionInput] = useState('');
  const [customTermsInput, setCustomTermsInput] = useState('');

  // AI Generation & Output state
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [generatedProposal, setGeneratedProposal] = useState<Proposal | null>(null);
  const [savedProposals, setSavedProposals] = useState<Proposal[]>([]);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isSavingProposal, setIsSavingProposal] = useState(false);

  // Live Revision / Editing View Mode
  const [previewViewMode, setPreviewViewMode] = useState<'document' | 'revise'>('document');

  // Load Inventory from Firestore
  useEffect(() => {
    const defaultSeedItems: InventoryItem[] = [
      { id: 'seed-1', name: 'Lempuyang Temple Entrance Ticket', type: 'Ticket', price: 100000, priceType: 'Per person', description: 'Spiritual temple entry ticket featuring the iconic Gates of Heaven photo spot' },
      { id: 'seed-2', name: 'Avanza MPV Private Car Charter', type: 'Transport', price: 600000, priceType: 'Per car', description: 'Private AC vehicle charter with dedicated driver, petrol, and parking included' },
      { id: 'seed-3', name: 'Maya Ubud Resort & Spa (Deluxe Room)', type: 'Hotel', price: 1200000, priceType: 'Per room', description: 'Luxurious resort stay surrounded by lush tropical valley greenery' },
      { id: 'seed-4', name: 'Lunch at Bebek Tepi Sawah', type: 'Food', price: 150000, priceType: 'Per person', description: 'A delicious lunch served in a traditional restaurant with rice terrace view' },
      { id: 'seed-5', name: 'Private Licensed English Tour Guide', type: 'Guide', price: 400000, priceType: 'Per day', description: 'Licensed English-speaking local expert guide for personalized cultural commentary' },
      { id: 'seed-6', name: 'Traditional Balinese Barong Dance Ticket', type: 'Ticket', price: 150000, priceType: 'Per person', description: 'Traditional Balinese cultural performance ticket showcasing local mythology and music' },
      { id: 'seed-7', name: 'Airport Transfer', type: 'Transport', price: 350000, priceType: 'Per car', description: 'Comfortable transfer to the airport with AC car' }
    ];

    let unsubscribe = () => {};
    try {
      const invRef = collection(db, 'inventory_items');
      unsubscribe = onSnapshot(invRef, (snapshot) => {
        if (!snapshot || snapshot.empty) {
          setInventoryList(defaultSeedItems);
          setLoadingInventory(false);
          return;
        }

        const items = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          name: docSnap.data().name || 'Untitled Item',
          type: docSnap.data().type || 'Extra',
          price: Number(docSnap.data().price) || 0,
          priceType: docSnap.data().priceType || 'Flat rate',
          description: docSnap.data().description || ''
        })) as InventoryItem[];

        setInventoryList(items);
        setLoadingInventory(false);
      }, (err) => {
        console.error("Error loading inventory items, falling back to seed:", err);
        setInventoryList(defaultSeedItems);
        setLoadingInventory(false);
      });
    } catch (e) {
      console.error("Error subscribing to inventory snapshot:", e);
      setInventoryList(defaultSeedItems);
      setLoadingInventory(false);
    }

    return () => {
      try { unsubscribe(); } catch (_) {}
    };
  }, []);

  // Load Saved Proposals from Firestore
  useEffect(() => {
    let unsubscribe = () => {};
    try {
      const propRef = collection(db, 'proposals');
      unsubscribe = onSnapshot(propRef, (snapshot) => {
        if (!snapshot) return;
        const proposals = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          proposalTitle: docSnap.data().proposalTitle || 'Saved Proposal',
          guestName: docSnap.data().guestName || 'Guest',
          paxCount: docSnap.data().paxCount || 1,
          durationDays: docSnap.data().durationDays || 1,
          totalPrice: docSnap.data().totalPrice || 0,
          currency: docSnap.data().currency || 'IDR',
          ...docSnap.data()
        })) as Proposal[];

        setSavedProposals(proposals);
      }, (err) => {
        console.error("Error loading proposals:", err);
      });
    } catch (e) {
      console.error("Error subscribing to proposals snapshot:", e);
    }

    return () => {
      try { unsubscribe(); } catch (_) {}
    };
  }, []);

  // Filtered inventory list
  const filteredInventory = useMemo(() => {
    return (inventoryList || []).filter(item => {
      if (!item) return false;
      const typeStr = (item.type || 'Extra').toLowerCase();
      const nameStr = (item.name || '').toLowerCase();
      const matchesCategory = inventoryCategoryFilter === 'all' || typeStr === inventoryCategoryFilter.toLowerCase();
      const matchesSearch = !inventorySearch || nameStr.includes(inventorySearch.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [inventoryList, inventoryCategoryFilter, inventorySearch]);

  // Calculations
  const baseSubtotal = useMemo(() => {
    return selectedLineItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [selectedLineItems]);

  const marginAmount = useMemo(() => {
    return (baseSubtotal * (marginPercentage || 0)) / 100;
  }, [baseSubtotal, marginPercentage]);

  const totalPrice = useMemo(() => {
    return baseSubtotal + marginAmount;
  }, [baseSubtotal, marginAmount]);

  // Inventory Item Management Functions
  const handleOpenAddInventory = () => {
    setEditingInventoryItem({
      name: '',
      type: 'Ticket',
      price: 100000,
      priceType: 'Per person',
      description: ''
    });
    setIsInventoryModalOpen(true);
  };

  const handleEditInventory = (item: InventoryItem) => {
    setEditingInventoryItem(item);
    setIsInventoryModalOpen(true);
  };

  const handleDeleteInventory = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this inventory item?")) return;
    try {
      await deleteDoc(doc(db, 'inventory_items', id));
    } catch (err: any) {
      alert("Error deleting inventory item: " + err.message);
    }
  };

  const handleSaveInventoryItem = async () => {
    if (!editingInventoryItem?.name?.trim() || editingInventoryItem?.price === undefined || editingInventoryItem?.price === null || isNaN(Number(editingInventoryItem?.price))) {
      alert("Please provide item name and a valid price (0 is allowed).");
      return;
    }

    setIsSavingInventory(true);
    try {
      const data = {
        name: editingInventoryItem.name.trim(),
        type: editingInventoryItem.type || 'Ticket',
        price: Number(editingInventoryItem.price) >= 0 ? Number(editingInventoryItem.price) : 0,
        priceType: editingInventoryItem.priceType || 'Per person',
        description: editingInventoryItem.description || ''
      };

      if (editingInventoryItem.id) {
        await updateDoc(doc(db, 'inventory_items', editingInventoryItem.id), data);
      } else {
        await addDoc(collection(db, 'inventory_items'), {
          ...data,
          createdAt: serverTimestamp()
        });
      }

      setIsInventoryModalOpen(false);
      setEditingInventoryItem(null);
    } catch (err: any) {
      alert("Failed to save inventory item: " + err.message);
    } finally {
      setIsSavingInventory(false);
    }
  };

  // Brand configuration save handler
  const handleSaveBrandConfig = async () => {
    setIsSavingBrand(true);
    setBrandSaveSuccess(false);
    try {
      const config = {
        companyName,
        companyLogo,
        companyEmail,
        companyPhone,
        companyAddress,
        companyWebsite,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem('brand_config', JSON.stringify(config));
      await setDoc(doc(db, 'settings', 'brand_config'), config, { merge: true });
      setBrandSaveSuccess(true);
      setTimeout(() => setBrandSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error("Error saving brand config:", err);
      // Fallback to local persistence
      setBrandSaveSuccess(true);
      setTimeout(() => setBrandSaveSuccess(false), 4000);
    } finally {
      setIsSavingBrand(false);
    }
  };

  // Preset Data Persistence Helper
  const savePresetData = async (type: 'inclusions' | 'exclusions' | 'terms', newList: string[]) => {
    try {
      localStorage.setItem(`preset_${type}`, JSON.stringify(newList));
      await setDoc(doc(db, 'settings', 'preset_data'), {
        [type]: newList,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn("Notice saving preset data:", err);
    }
  };

  // Master Data Banks Handlers
  const handleAddMasterInclusion = () => {
    if (!newMasterInclusionInput.trim()) return;
    const text = newMasterInclusionInput.trim();
    const updated = masterInclusions.includes(text) ? masterInclusions : [...masterInclusions, text];
    setMasterInclusions(updated);
    if (!selectedInclusions.includes(text)) {
      setSelectedInclusions(prev => [...prev, text]);
    }
    setNewMasterInclusionInput('');
    savePresetData('inclusions', updated);
  };

  const handleEditPresetInclusion = (index: number, newText: string) => {
    const oldText = masterInclusions[index];
    const updated = [...masterInclusions];
    updated[index] = newText;
    setMasterInclusions(updated);
    setSelectedInclusions(prev => prev.map(item => item === oldText ? newText : item));
    savePresetData('inclusions', updated);
  };

  const handleDeletePresetInclusion = (index: number) => {
    const itemToDelete = masterInclusions[index];
    const updated = masterInclusions.filter((_, i) => i !== index);
    setMasterInclusions(updated);
    setSelectedInclusions(prev => prev.filter(item => item !== itemToDelete));
    savePresetData('inclusions', updated);
  };

  const handleDeleteMasterInclusion = (text: string) => {
    const updated = masterInclusions.filter(item => item !== text);
    setMasterInclusions(updated);
    setSelectedInclusions(prev => prev.filter(item => item !== text));
    savePresetData('inclusions', updated);
  };

  const handleAddMasterExclusion = () => {
    if (!newMasterExclusionInput.trim()) return;
    const text = newMasterExclusionInput.trim();
    const updated = masterExclusions.includes(text) ? masterExclusions : [...masterExclusions, text];
    setMasterExclusions(updated);
    if (!selectedExclusions.includes(text)) {
      setSelectedExclusions(prev => [...prev, text]);
    }
    setNewMasterExclusionInput('');
    savePresetData('exclusions', updated);
  };

  const handleEditPresetExclusion = (index: number, newText: string) => {
    const oldText = masterExclusions[index];
    const updated = [...masterExclusions];
    updated[index] = newText;
    setMasterExclusions(updated);
    setSelectedExclusions(prev => prev.map(item => item === oldText ? newText : item));
    savePresetData('exclusions', updated);
  };

  const handleDeletePresetExclusion = (index: number) => {
    const itemToDelete = masterExclusions[index];
    const updated = masterExclusions.filter((_, i) => i !== index);
    setMasterExclusions(updated);
    setSelectedExclusions(prev => prev.filter(item => item !== itemToDelete));
    savePresetData('exclusions', updated);
  };

  const handleDeleteMasterExclusion = (text: string) => {
    const updated = masterExclusions.filter(item => item !== text);
    setMasterExclusions(updated);
    setSelectedExclusions(prev => prev.filter(item => item !== text));
    savePresetData('exclusions', updated);
  };

  const handleEditPresetTerm = (index: number, newText: string) => {
    const oldText = masterTerms[index];
    const updated = [...masterTerms];
    updated[index] = newText;
    setMasterTerms(updated);
    setSelectedTerms(prev => prev.map(item => item === oldText ? newText : item));
    savePresetData('terms', updated);
  };

  const handleDeletePresetTerm = (index: number) => {
    const itemToDelete = masterTerms[index];
    const updated = masterTerms.filter((_, i) => i !== index);
    setMasterTerms(updated);
    setSelectedTerms(prev => prev.filter(item => item !== itemToDelete));
    savePresetData('terms', updated);
  };

  // Day-specific Inclusions & Exclusions Handlers
  const handleAddDayInclusion = (dayNum: number, text: string) => {
    if (!text || !text.trim()) return;
    const clean = text.trim();
    setDayInclusions(prev => ({
      ...prev,
      [dayNum]: [...(prev[dayNum] || []), clean]
    }));
    setDayInclusionInputs(prev => ({ ...prev, [dayNum]: '' }));
  };

  const handleRemoveDayInclusion = (dayNum: number, index: number) => {
    setDayInclusions(prev => ({
      ...prev,
      [dayNum]: (prev[dayNum] || []).filter((_, i) => i !== index)
    }));
  };

  const handleAddDayExclusion = (dayNum: number, text: string) => {
    if (!text || !text.trim()) return;
    const clean = text.trim();
    setDayExclusions(prev => ({
      ...prev,
      [dayNum]: [...(prev[dayNum] || []), clean]
    }));
    setDayExclusionInputs(prev => ({ ...prev, [dayNum]: '' }));
  };

  const handleRemoveDayExclusion = (dayNum: number, index: number) => {
    setDayExclusions(prev => ({
      ...prev,
      [dayNum]: (prev[dayNum] || []).filter((_, i) => i !== index)
    }));
  };

  // Assign item to Day handler (Click or Drag & Drop)
  const addItemToDay = (inv: InventoryItem, targetDay: number) => {
    let defaultQty = 1;
    if (inv.priceType === 'Per person') defaultQty = paxCount || 1;

    const newLineItem: ProposalLineItem = {
      inventoryId: inv.id,
      name: inv.name,
      type: inv.type,
      price: inv.price,
      priceType: inv.priceType,
      quantity: defaultQty,
      subtotal: inv.price * defaultQty,
      day: targetDay,
      description: inv.description || getItemDescription(inv)
    };

    setSelectedLineItems(prev => [...prev, newLineItem]);
  };

  // Drag & drop handlers
  const handleDragStartItem = (inv: InventoryItem) => {
    setDraggedInventoryItem(inv);
    setDraggedCatalogItem({ kind: 'inventory', data: inv });
  };

  const handleDragStartInclusion = (text: string) => {
    setDraggedCatalogItem({ kind: 'inclusion', data: text });
  };

  const handleDragStartExclusion = (text: string) => {
    setDraggedCatalogItem({ kind: 'exclusion', data: text });
  };

  const handleDropToDayZone = (
    e: React.DragEvent, 
    targetDay: number, 
    targetZone: 'itinerary' | 'transport' | 'accommodation' | 'food' | 'inclusion' | 'exclusion'
  ) => {
    e.preventDefault();
    setActiveDropZone(null);
    setActiveDropDay(null);

    // If drag source exists
    if (draggedCatalogItem) {
      if (targetZone === 'inclusion') {
        if (typeof draggedCatalogItem.data === 'string') {
          handleAddDayInclusion(targetDay, draggedCatalogItem.data);
        } else {
          handleAddDayInclusion(targetDay, (draggedCatalogItem.data as InventoryItem).name);
        }
      } else if (targetZone === 'exclusion') {
        if (typeof draggedCatalogItem.data === 'string') {
          handleAddDayExclusion(targetDay, draggedCatalogItem.data);
        } else {
          handleAddDayExclusion(targetDay, (draggedCatalogItem.data as InventoryItem).name);
        }
      } else {
        if (draggedCatalogItem.kind === 'inventory') {
          addItemToDay(draggedCatalogItem.data as InventoryItem, targetDay);
        } else if (typeof draggedCatalogItem.data === 'string') {
          handleAddDayInclusion(targetDay, draggedCatalogItem.data);
        }
      }
      setDraggedCatalogItem(null);
      setDraggedInventoryItem(null);
      return;
    }

    if (draggedInventoryItem) {
      addItemToDay(draggedInventoryItem, targetDay);
      setDraggedInventoryItem(null);
    }
  };

  const handleDropToDay = (e: React.DragEvent, targetDay: number) => {
    handleDropToDayZone(e, targetDay, 'itinerary');
  };

  const handleRemoveLineItem = (index: number) => {
    setSelectedLineItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateLineItemQty = (index: number, newQty: number) => {
    if (newQty <= 0) return;
    setSelectedLineItems(prev => prev.map((item, i) => {
      if (i === index) {
        return {
          ...item,
          quantity: newQty,
          subtotal: item.price * newQty
        };
      }
      return item;
    }));
  };

  // Toggle inclusion preset
  const toggleInclusionPreset = (text: string) => {
    setSelectedInclusions(prev => 
      prev.includes(text) ? prev.filter(t => t !== text) : [...prev, text]
    );
  };

  const handleAddCustomInclusion = () => {
    if (!customInclusionInput.trim()) return;
    const text = customInclusionInput.trim();
    if (!selectedInclusions.includes(text)) {
      setSelectedInclusions(prev => [...prev, text]);
    }
    if (!masterInclusions.includes(text)) {
      setMasterInclusions(prev => [...prev, text]);
    }
    setCustomInclusionInput('');
  };

  // Toggle exclusion preset
  const toggleExclusionPreset = (text: string) => {
    setSelectedExclusions(prev => 
      prev.includes(text) ? prev.filter(t => t !== text) : [...prev, text]
    );
  };

  const handleAddCustomExclusion = () => {
    if (!customExclusionInput.trim()) return;
    const text = customExclusionInput.trim();
    if (!selectedExclusions.includes(text)) {
      setSelectedExclusions(prev => [...prev, text]);
    }
    if (!masterExclusions.includes(text)) {
      setMasterExclusions(prev => [...prev, text]);
    }
    setCustomExclusionInput('');
  };

  // Toggle terms preset
  const toggleTermsPreset = (text: string) => {
    setSelectedTerms(prev => 
      prev.includes(text) ? prev.filter(t => t !== text) : [...prev, text]
    );
  };

  const handleAddCustomTerms = () => {
    if (!customTermsInput.trim()) return;
    if (!selectedTerms.includes(customTermsInput.trim())) {
      setSelectedTerms(prev => [...prev, customTermsInput.trim()]);
    }
    setCustomTermsInput('');
  };

  // AI Proposal Generation Call
  const handleGenerateAIProposal = async () => {
    if (!guestName.trim()) {
      alert("Please enter the Guest Name.");
      return;
    }
    if (selectedLineItems.length === 0) {
      alert("Please add at least 1 inventory/logistic item to the proposal.");
      return;
    }

    setIsGeneratingAI(true);
    setGeneratedProposal(null);

    try {
      const response = await fetch('/api/generate-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName,
          email,
          phone,
          nationality,
          paxCount,
          durationDays,
          selectedItems: selectedLineItems,
          marginPercentage,
          baseSubtotal,
          marginAmount,
          totalPrice,
          currency,
          specialNotes,
          tenantId
        })
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.error || "Failed to generate proposal.");
      }

      const proposalData = resData.data;

      // Group activities and narratives per day
      const itineraryNarrativeObj: ItineraryDayNarrative[] = proposalData.itineraryNarrative || Array.from({ length: durationDays }, (_, idx) => ({
        dayNumber: idx + 1,
        title: `Day ${idx + 1}: Highlights & Exploration`,
        summary: `Full day of personalized activities and tour logistics.`,
        activities: selectedLineItems.filter(i => i.day === idx + 1).map(i => i.name)
      }));

      // Map AI-generated item descriptions onto selected items if returned
      const aiItemDescriptions: Record<string, string> = {};
      if (Array.isArray(proposalData.itemDescriptions)) {
        proposalData.itemDescriptions.forEach((descObj: any) => {
          if (descObj.itemName && descObj.aiDescription) {
            aiItemDescriptions[descObj.itemName.toLowerCase().trim()] = descObj.aiDescription;
          }
        });
      }

      const updatedLineItems = selectedLineItems.map(item => {
        const matchAiDesc = aiItemDescriptions[item.name.toLowerCase().trim()];
        return {
          ...item,
          description: matchAiDesc || item.description || getItemDescription(item)
        };
      });

      const fullProposalObj: Proposal = {
        proposalTitle: proposalData.proposalTitle || `Custom Tour Proposal for ${guestName}`,
        guestName,
        email,
        phone,
        nationality,
        paxCount,
        durationDays,
        marginPercentage,
        baseSubtotal,
        marginAmount,
        totalPrice,
        currency,
        selectedItems: updatedLineItems,
        dayInclusions: dayInclusions,
        dayExclusions: dayExclusions,
        companyName,
        companyLogo,
        companyEmail,
        companyPhone,
        companyAddress,
        companyWebsite,
        welcomeMessage: proposalData.welcomeMessage || `Dear ${guestName}, thank you for choosing us! We are thrilled to present your personalized holiday itinerary.`,
        itineraryNarrative: itineraryNarrativeObj,
        inclusions: selectedInclusions.length > 0 ? selectedInclusions : (proposalData.inclusions || []),
        exclusions: selectedExclusions.length > 0 ? selectedExclusions : (proposalData.exclusions || []),
        termsAndConditions: selectedTerms.length > 0 ? selectedTerms : masterTerms,
        importantTips: proposalData.importantTips || ["Comfortable walking shoes recommended", "Please bring a camera and light clothing"],
        closingNotes: proposalData.closingNotes || "We look forward to hosting you in Bali! Please contact us to confirm your travel dates.",
        status: 'Draft'
      };

      setGeneratedProposal(fullProposalObj);
      setPreviewViewMode('document');
    } catch (err: any) {
      console.error("AI Proposal Generation Error:", err);
      alert("Error generating proposal: " + (err.message || 'Unknown error'));
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Save proposal to Firestore
  const handleSaveProposalToDb = async () => {
    if (!generatedProposal) return;
    setIsSavingProposal(true);
    try {
      await addDoc(collection(db, 'proposals'), {
        ...generatedProposal,
        companyName,
        companyLogo,
        companyEmail,
        companyPhone,
        companyAddress,
        companyWebsite,
        createdAt: serverTimestamp()
      });
      alert("Proposal saved to history successfully!");
    } catch (err: any) {
      alert("Failed to save proposal: " + err.message);
    } finally {
      setIsSavingProposal(false);
    }
  };

  // WhatsApp Message Generator
  const handleCopyWhatsAppMessage = () => {
    if (!generatedProposal) return;
    const p = generatedProposal;

    let text = `✨ *${p.proposalTitle}* ✨\n\n`;
    text += `${p.welcomeMessage}\n\n`;

    text += `📌 *Day by day Itinerary:*\n`;
    p.itineraryNarrative.forEach(day => {
      const dayLogistics = p.selectedItems.filter(i => i.day === day.dayNumber);
      const dayItineraryItems = dayLogistics.filter(i => getCategoryKey(i.type) === 'itinerary');
      const dayTransportItems = dayLogistics.filter(i => getCategoryKey(i.type) === 'transport');
      const dayAccommodationItems = dayLogistics.filter(i => getCategoryKey(i.type) === 'accommodation');
      const dayDiningItems = dayLogistics.filter(i => getCategoryKey(i.type) === 'food');

      const dayInclusionsList = [
        ...dayLogistics.filter(i => getCategoryKey(i.type) === 'inclusion').map(i => i.name),
        ...(p.dayInclusions?.[day.dayNumber] || [])
      ];

      const dayExclusionsList = [
        ...dayLogistics.filter(i => getCategoryKey(i.type) === 'exclusion').map(i => i.name),
        ...(p.dayExclusions?.[day.dayNumber] || [])
      ];

      text += `\n*Day ${toRoman(day.dayNumber)}: ${day.title}*\n`;
      if (day.summary) {
        text += `${day.summary}\n`;
      }

      text += `Itinerary:\n` + (dayItineraryItems.length > 0 ? dayItineraryItems.map(i => `- ${i.name}`).join('\n') : `-`) + `\n`;
      text += `Transportation Option:\n` + (dayTransportItems.length > 0 ? dayTransportItems.map(i => `- ${i.name}`).join('\n') : `-`) + `\n`;
      text += `Accommodation:\n` + (dayAccommodationItems.length > 0 ? dayAccommodationItems.map(i => `- ${i.name}`).join('\n') : `-`) + `\n`;
      text += `Dining:\n` + (dayDiningItems.length > 0 ? dayDiningItems.map(i => `- ${i.name}`).join('\n') : `-`) + `\n`;
      text += `Inclusion:\n` + (dayInclusionsList.length > 0 ? dayInclusionsList.map(i => `- ${i}`).join('\n') : `-`) + `\n`;
      text += `Exclusion:\n` + (dayExclusionsList.length > 0 ? dayExclusionsList.map(i => `- ${i}`).join('\n') : `-`) + `\n`;
    });

    text += `\n*What is included:*\n` + p.inclusions.map(i => `- ${i}`).join('\n') + `\n`;
    text += `\n*What's not included:*\n` + p.exclusions.map(i => `- ${i}`).join('\n') + `\n`;

    if (p.termsAndConditions && p.termsAndConditions.length > 0) {
      text += `\n*Terms & Conditions:*\n` + p.termsAndConditions.map(t => `- ${t}`).join('\n') + `\n`;
    }

    text += `\n💰 *Total Package Investment:* ${p.currency} ${Number(p.totalPrice).toLocaleString()}\n`;
    text += `Contact *${companyName}* (${companyPhone} | ${companyEmail}) to book! 🌴`;

    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  // Print PDF Trigger
  const handlePrintDocument = () => {
    window.print();
  };

  // Load saved proposal from history with full backward compatibility & normalization to new style
  const handleLoadProposal = (p: Proposal) => {
    const normalizedProposal: Proposal = {
      ...p,
      proposalTitle: p.proposalTitle || `Custom Tour Proposal for ${p.guestName || 'Guest'}`,
      guestName: p.guestName || guestName || 'Valued Guest',
      email: p.email || email,
      phone: p.phone || phone,
      nationality: p.nationality || nationality,
      paxCount: p.paxCount || paxCount || 2,
      durationDays: p.durationDays || durationDays || 3,
      totalPrice: p.totalPrice || totalPrice || 0,
      currency: p.currency || currency || 'IDR',
      selectedItems: p.selectedItems || p.lineItems || selectedLineItems,
      companyName: p.companyName || companyName,
      companyLogo: p.companyLogo || companyLogo,
      companyEmail: p.companyEmail || companyEmail,
      companyPhone: p.companyPhone || companyPhone,
      companyAddress: p.companyAddress || companyAddress,
      companyWebsite: p.companyWebsite || companyWebsite,
      welcomeMessage: p.welcomeMessage || `Dear ${p.guestName || 'Guest'}, thank you for choosing us! We are thrilled to present your personalized island itinerary.`,
      itineraryNarrative: (p.itineraryNarrative && p.itineraryNarrative.length > 0)
        ? p.itineraryNarrative
        : Array.from({ length: p.durationDays || 3 }, (_, idx) => {
            const dayItems = (p.selectedItems || p.lineItems || []).filter((i: any) => i.day === idx + 1);
            return {
              dayNumber: idx + 1,
              title: `Day ${idx + 1}: Custom Tour Highlights`,
              summary: dayItems.length > 0 
                ? `Exploration featuring ${dayItems.map((i: any) => i.name).join(', ')}.`
                : `Full day of personalized activities and tour logistics.`,
              activities: dayItems.map((i: any) => i.name)
            };
          }),
      inclusions: (p.inclusions && p.inclusions.length > 0) ? p.inclusions : masterInclusions,
      exclusions: (p.exclusions && p.exclusions.length > 0) ? p.exclusions : masterExclusions,
      termsAndConditions: (p.termsAndConditions && p.termsAndConditions.length > 0) ? p.termsAndConditions : masterTerms,
      closingNotes: p.closingNotes || "We look forward to hosting you in Bali!"
    };

    setGeneratedProposal(normalizedProposal);

    // Populate builder inputs so user can modify or generate variations
    if (p.guestName) setGuestName(p.guestName);
    if (p.email) setEmail(p.email);
    if (p.phone) setPhone(p.phone);
    if (p.nationality) setNationality(p.nationality);
    if (p.paxCount) setPaxCount(p.paxCount);
    if (p.durationDays) setDurationDays(p.durationDays);
    if (p.selectedItems || p.lineItems) setSelectedLineItems(p.selectedItems || p.lineItems || []);
    if (p.dayInclusions) setDayInclusions(p.dayInclusions);
    if (p.dayExclusions) setDayExclusions(p.dayExclusions);
    if (p.inclusions) setSelectedInclusions(p.inclusions);
    if (p.exclusions) setSelectedExclusions(p.exclusions);
    if (p.termsAndConditions) setSelectedTerms(p.termsAndConditions);

    setActiveSubTab('create');
    setPreviewViewMode('document');
  };

  // Send proposal via Email Server API handler
  const handleSendProposalEmail = async () => {
    if (!customerEmailInput.trim()) {
      alert("Please enter recipient customer email address.");
      return;
    }
    setIsSendingEmail(true);
    try {
      const res = await fetch('/api/send-proposal-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: customerEmailInput.trim(),
          proposal: generatedProposal,
          companyName,
          companyEmail,
          companyPhone,
          companyWebsite
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send email');
      }
      alert(`Success! Tour proposal email has been dispatched to ${customerEmailInput.trim()}`);
      setIsEmailModalOpen(false);
    } catch (err: any) {
      console.error("Email send error:", err);
      const subject = encodeURIComponent(emailSubjectInput || `Official Tour Proposal: ${generatedProposal?.proposalTitle}`);
      const body = encodeURIComponent(`Dear ${generatedProposal?.guestName},\n\nPlease review your official tour proposal from ${companyName}.\n\nTotal Package: ${generatedProposal?.currency} ${generatedProposal?.totalPrice?.toLocaleString()}\n\nBest regards,\n${companyName}\n${companyEmail}`);
      if (window.confirm(`Server notice: ${err.message}. Would you like to launch your mail client instead?`)) {
        window.open(`mailto:${customerEmailInput.trim()}?subject=${subject}&body=${body}`, '_blank');
        setIsEmailModalOpen(false);
      }
    } finally {
      setIsSendingEmail(false);
    }
  };

  const getCategoryKey = (type?: string): 'itinerary' | 'transport' | 'accommodation' | 'food' | 'inclusion' | 'exclusion' => {
    const safeType = (type || '').toLowerCase();
    if (['transport', 'car', 'boat', 'transfer', 'driver', 'flight'].includes(safeType)) return 'transport';
    if (['hotel', 'villa', 'resort', 'stay', 'accommodation', 'room'].includes(safeType)) return 'accommodation';
    if (['food', 'dining', 'meal', 'restaurant', 'breakfast', 'lunch', 'dinner'].includes(safeType)) return 'food';
    if (['inclusion', 'included', 'permit'].includes(safeType)) return 'inclusion';
    if (['exclusion', 'excluded'].includes(safeType)) return 'exclusion';
    return 'itinerary';
  };

  const CATEGORY_SECTIONS = [
    { 
      id: 'itinerary', 
      label: 'Itinerary (Activities & Attractions)', 
      icon: Compass, 
      color: 'orange',
      badgeClass: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'
    },
    { 
      id: 'transport', 
      label: 'Transportation', 
      icon: Car, 
      color: 'blue',
      badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
    },
    { 
      id: 'accommodation', 
      label: 'Accommodation', 
      icon: Hotel, 
      color: 'purple',
      badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
    },
    { 
      id: 'food', 
      label: 'Food & Dining', 
      icon: Utensils, 
      color: 'amber',
      badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    },
    { 
      id: 'inclusion', 
      label: 'Inclusion', 
      icon: CheckCircle2, 
      color: 'emerald',
      badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    },
    { 
      id: 'exclusion', 
      label: 'Exclusion', 
      icon: XCircle, 
      color: 'rose',
      badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
    },
  ] as const;

  const getCategoryBadgeClass = (type?: string) => {
    const key = getCategoryKey(type);
    switch (key) {
      case 'itinerary': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
      case 'transport': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'accommodation': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'food': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'inclusion': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'exclusion': return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      default: return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20';
    }
  };

  const getCategoryIcon = (type?: string) => {
    const key = getCategoryKey(type);
    switch (key) {
      case 'itinerary': return <Compass className="w-3.5 h-3.5" />;
      case 'transport': return <Car className="w-3.5 h-3.5" />;
      case 'accommodation': return <Hotel className="w-3.5 h-3.5" />;
      case 'food': return <Utensils className="w-3.5 h-3.5" />;
      case 'inclusion': return <CheckCircle2 className="w-3.5 h-3.5" />;
      case 'exclusion': return <XCircle className="w-3.5 h-3.5" />;
      default: return <Package className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Printable Area CSS rules */}
      <style>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
            font-size: 12px !important;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: black !important;
          }
          .print-page-break {
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* Top Banner & Header */}
      <div className="no-print p-6 md:p-8 rounded-3xl border shadow-sm relative overflow-hidden transition-all bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border-gray-200 dark:border-slate-800 dark:bg-[#111928] text-gray-900 dark:text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-1.5">
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span>Smart Proposal & Itinerary Builder</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Interactive Proposal Generator
            </h1>
            <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
              Drag & drop logistics items into day itineraries, manage inclusions, exclusions & terms, generate AI narrative proposals, and print print-ready PDFs.
            </p>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setShowBrandConfig(!showBrandConfig)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 flex items-center space-x-1.5 shadow-xs cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-orange-500" />
              <span>Branding Config</span>
            </button>

            <div className="flex items-center p-1.5 rounded-2xl bg-gray-100 dark:bg-slate-900 border border-gray-200 dark:border-slate-800">
              <button
                onClick={() => setActiveSubTab('create')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                  activeSubTab === 'create'
                    ? 'bg-orange-600 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Calculator className="w-4 h-4" />
                <span>Build Proposal</span>
              </button>

              <button
                onClick={() => setActiveSubTab('inventory')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                  activeSubTab === 'inventory'
                    ? 'bg-orange-600 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>Inventory Catalog ({inventoryList.length})</span>
              </button>

              <button
                onClick={() => setActiveSubTab('history')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                  activeSubTab === 'history'
                    ? 'bg-orange-600 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>History ({savedProposals.length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Company Branding Settings Expandable Bar */}
        {showBrandConfig && (
          <div className="mt-6 pt-6 border-t border-gray-200/50 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2">
            <div>
              <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">Company Name</label>
              <input 
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">Company Logo URL</label>
              <input 
                type="text"
                value={companyLogo}
                onChange={(e) => setCompanyLogo(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">Contact Email</label>
              <input 
                type="text"
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">Phone / WhatsApp</label>
              <input 
                type="text"
                value={companyPhone}
                onChange={(e) => setCompanyPhone(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">Company Address</label>
              <input 
                type="text"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">Website URL</label>
              <input 
                type="text"
                value={companyWebsite}
                onChange={(e) => setCompanyWebsite(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3 flex items-center justify-between pt-3 border-t border-gray-200/50 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                {brandSaveSuccess && (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1 animate-in fade-in">
                    <Check className="w-4 h-4" />
                    <span>Brand configuration saved successfully!</span>
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleSaveBrandConfig}
                disabled={isSavingBrand}
                className="px-5 py-2 rounded-xl bg-orange-600 text-white font-bold text-xs hover:bg-orange-700 transition-all flex items-center space-x-1.5 shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSavingBrand ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                <span>Save Brand Configuration</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SUB-TAB 1: CREATE PROPOSAL WORKSPACE */}
      {activeSubTab === 'create' && (
        <div className="space-y-8">
          {/* Main Grid: Form Left (8 Cols) / Sidebar Right (4 Cols) */}
          <div className="no-print grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left 8 Cols: Guest Details & Interactive Day-by-Day Dropper */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Section 1: Guest & Trip Basic Configuration */}
              <div className={`p-6 rounded-3xl border shadow-xs space-y-4 ${
                isDarkMode ? 'bg-[#111928] border-slate-800' : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800/80 pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-xl font-extrabold text-xs">
                      01
                    </div>
                    <h3 className={`text-sm font-extrabold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Guest & Trip Configuration
                    </h3>
                  </div>
                  <span className="text-xs font-medium text-gray-400">Step 1 of 3</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Guest Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="e.g. Mr. Alex Johnson"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className={`w-full pl-9 pr-3.5 py-2.5 text-xs font-bold rounded-xl border focus:outline-none focus:ring-2 focus:ring-orange-500/30 ${
                          isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-gray-200 text-gray-900'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Pax Count (Guests)
                    </label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        min="1"
                        value={paxCount}
                        onChange={(e) => setPaxCount(Math.max(1, parseInt(e.target.value) || 1))}
                        className={`w-full pl-9 pr-3.5 py-2.5 text-xs font-bold rounded-xl border focus:outline-none focus:ring-2 focus:ring-orange-500/30 ${
                          isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-gray-200 text-gray-900'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Duration (Days)
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={durationDays}
                        onChange={(e) => setDurationDays(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
                        className={`w-full pl-9 pr-3.5 py-2.5 text-xs font-bold rounded-xl border focus:outline-none focus:ring-2 focus:ring-orange-500/30 ${
                          isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-gray-200 text-gray-900'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Contact Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        placeholder="alex@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`w-full pl-9 pr-3.5 py-2.5 text-xs font-bold rounded-xl border focus:outline-none focus:ring-2 focus:ring-orange-500/30 ${
                          isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-gray-200 text-gray-900'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Phone / WhatsApp
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="+1 234 567 890"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className={`w-full pl-9 pr-3.5 py-2.5 text-xs font-bold rounded-xl border focus:outline-none focus:ring-2 focus:ring-orange-500/30 ${
                          isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-gray-200 text-gray-900'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Nationality / Origin
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="e.g. Australia"
                        value={nationality}
                        onChange={(e) => setNationality(e.target.value)}
                        className={`w-full pl-9 pr-3.5 py-2.5 text-xs font-bold rounded-xl border focus:outline-none focus:ring-2 focus:ring-orange-500/30 ${
                          isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-gray-200 text-gray-900'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Day-by-Day Interactive Drag & Drop Itinerary Builder */}
              <div className={`p-6 rounded-3xl border shadow-xs space-y-5 ${
                isDarkMode ? 'bg-[#111928] border-slate-800' : 'bg-white border-gray-200'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-slate-800/80 pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-xl font-extrabold text-xs">
                      02
                    </div>
                    <div>
                      <h3 className={`text-sm font-extrabold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Day-by-Day Itinerary Builder
                      </h3>
                      <p className="text-[11px] text-gray-500">Drag inventory items from right panel or drop into target days</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={expandAllBuilderDays}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 flex items-center space-x-1 cursor-pointer transition-colors"
                      title="Expand all days"
                    >
                      <ChevronsDown className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Expand All</span>
                    </button>
                    <button
                      type="button"
                      onClick={collapseAllBuilderDays}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 flex items-center space-x-1 cursor-pointer transition-colors"
                      title="Collapse all days"
                    >
                      <ChevronsUp className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Collapse All</span>
                    </button>
                    <button
                      onClick={() => setDurationDays(prev => prev + 1)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 flex items-center space-x-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Day ({durationDays + 1})</span>
                    </button>
                  </div>
                </div>

                {/* Render Days */}
                <div className="space-y-6">
                  {Array.from({ length: durationDays }, (_, idx) => {
                    const dayNum = idx + 1;
                    const itemsInThisDay = selectedLineItems.filter(i => i.day === dayNum);
                    const daySubtotal = itemsInThisDay.reduce((sum, item) => sum + item.subtotal, 0);
                    const currentInclusions = dayInclusions[dayNum] || [];
                    const currentExclusions = dayExclusions[dayNum] || [];
                    const isBuilderCollapsed = !!collapsedBuilderDays[dayNum];

                    return (
                      <div
                        key={`day-builder-${dayNum}`}
                        className={`p-5 rounded-3xl border-2 transition-all space-y-4 ${
                          isDarkMode 
                            ? 'bg-slate-900/60 border-slate-800' 
                            : 'bg-slate-50/70 border-gray-200'
                        }`}
                      >
                        {/* Day Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200/60 dark:border-slate-800 pb-3">
                          <div className="flex items-center space-x-2.5">
                            <span className="px-3 py-1 rounded-xl bg-orange-600 text-white font-black text-xs uppercase tracking-wider">
                              DAY {dayNum}
                            </span>
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                              {itemsInThisDay.length} itinerary item(s) • {currentInclusions.length} inclusion(s) • {currentExclusions.length} exclusion(s)
                            </span>
                          </div>

                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-extrabold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-3 py-1 rounded-xl">
                              Subtotal: {currency} {daySubtotal.toLocaleString()}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleBuilderDayCollapse(dayNum)}
                              className="px-2.5 py-1 rounded-xl bg-gray-200/80 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer flex items-center space-x-1 text-xs font-bold"
                              title={isBuilderCollapsed ? "Expand Day" : "Collapse Day"}
                            >
                              <span>{isBuilderCollapsed ? "Expand" : "Collapse"}</span>
                              {isBuilderCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {!isBuilderCollapsed && (
                          <div className="space-y-3 pt-1">
                            {CATEGORY_SECTIONS.map((section) => {
                              const SectionIcon = section.icon;
                              const sectionKey = `d${dayNum}-${section.id}`;
                              const isSectionCollapsed = !!collapsedDaySections[sectionKey];

                              if (section.id === 'inclusion') {
                                return (
                                  <div
                                    key={`day-${dayNum}-sec-inclusion`}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      setActiveDropZone({ day: dayNum, target: 'inclusion' });
                                    }}
                                    onDragLeave={() => setActiveDropZone(null)}
                                    onDrop={(e) => handleDropToDayZone(e, dayNum, 'inclusion')}
                                    className={`p-3.5 rounded-2xl border-2 transition-all space-y-2.5 ${
                                      activeDropZone?.day === dayNum && activeDropZone.target === 'inclusion'
                                        ? 'border-dashed border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30'
                                        : isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-gray-200'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-2">
                                        <button
                                          type="button"
                                          onClick={() => toggleDaySectionCollapse(dayNum, 'inclusion')}
                                          className="p-1 rounded bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 cursor-pointer"
                                        >
                                          {isSectionCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                                        </button>
                                        <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center space-x-1.5">
                                          <CheckCircle2 className="w-3.5 h-3.5" />
                                          <span>Inclusion ({currentInclusions.length})</span>
                                        </span>
                                      </div>
                                      <span className="text-[10px] text-gray-400">Drag inclusion here or type below</span>
                                    </div>

                                    {!isSectionCollapsed && (
                                      <>
                                        <div className="space-y-1.5 min-h-[40px]">
                                          {currentInclusions.length === 0 ? (
                                            <p className="text-[11px] text-gray-400 italic py-2 text-center border border-dashed border-gray-200 dark:border-slate-800 rounded-xl">
                                              No inclusions added for Day {dayNum}. Drag from catalog or type below.
                                            </p>
                                          ) : (
                                            currentInclusions.map((incText, incIdx) => (
                                              <div key={`day-inc-chip-${incIdx}`} className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-xs font-semibold flex items-center justify-between">
                                                <span className="truncate pr-2">✓ {incText}</span>
                                                <button
                                                  type="button"
                                                  onClick={() => handleRemoveDayInclusion(dayNum, incIdx)}
                                                  className="text-red-400 hover:text-red-600 shrink-0"
                                                >
                                                  <X className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            ))
                                          )}
                                        </div>

                                        <div className="flex items-center space-x-1.5 pt-1">
                                          <input
                                            type="text"
                                            placeholder={`Add inclusion for Day ${dayNum}...`}
                                            value={dayInclusionInputs[dayNum] || ''}
                                            onChange={(e) => setDayInclusionInputs({ ...dayInclusionInputs, [dayNum]: e.target.value })}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddDayInclusion(dayNum, dayInclusionInputs[dayNum] || '')}
                                            className={`flex-1 px-3 py-1 text-xs rounded-xl border ${
                                              isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-gray-200 text-gray-900'
                                            }`}
                                          />
                                          <button
                                            type="button"
                                            onClick={() => handleAddDayInclusion(dayNum, dayInclusionInputs[dayNum] || '')}
                                            className="px-2.5 py-1 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                                          >
                                            + Add
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                );
                              }

                              if (section.id === 'exclusion') {
                                return (
                                  <div
                                    key={`day-${dayNum}-sec-exclusion`}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      setActiveDropZone({ day: dayNum, target: 'exclusion' });
                                    }}
                                    onDragLeave={() => setActiveDropZone(null)}
                                    onDrop={(e) => handleDropToDayZone(e, dayNum, 'exclusion')}
                                    className={`p-3.5 rounded-2xl border-2 transition-all space-y-2.5 ${
                                      activeDropZone?.day === dayNum && activeDropZone.target === 'exclusion'
                                        ? 'border-dashed border-rose-500 bg-rose-500/10 ring-2 ring-rose-500/30'
                                        : isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-gray-200'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-2">
                                        <button
                                          type="button"
                                          onClick={() => toggleDaySectionCollapse(dayNum, 'exclusion')}
                                          className="p-1 rounded bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 cursor-pointer"
                                        >
                                          {isSectionCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                                        </button>
                                        <span className="text-xs font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center space-x-1.5">
                                          <XCircle className="w-3.5 h-3.5" />
                                          <span>Exclusion ({currentExclusions.length})</span>
                                        </span>
                                      </div>
                                      <span className="text-[10px] text-gray-400">Drag exclusion here or type below</span>
                                    </div>

                                    {!isSectionCollapsed && (
                                      <>
                                        <div className="space-y-1.5 min-h-[40px]">
                                          {currentExclusions.length === 0 ? (
                                            <p className="text-[11px] text-gray-400 italic py-2 text-center border border-dashed border-gray-200 dark:border-slate-800 rounded-xl">
                                              No exclusions added for Day {dayNum}. Drag from catalog or type below.
                                            </p>
                                          ) : (
                                            currentExclusions.map((excText, excIdx) => (
                                              <div key={`day-exc-chip-${excIdx}`} className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 text-xs font-semibold flex items-center justify-between">
                                                <span className="truncate pr-2">✕ {excText}</span>
                                                <button
                                                  type="button"
                                                  onClick={() => handleRemoveDayExclusion(dayNum, excIdx)}
                                                  className="text-red-400 hover:text-red-600 shrink-0"
                                                >
                                                  <X className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            ))
                                          )}
                                        </div>

                                        <div className="flex items-center space-x-1.5 pt-1">
                                          <input
                                            type="text"
                                            placeholder={`Add exclusion for Day ${dayNum}...`}
                                            value={dayExclusionInputs[dayNum] || ''}
                                            onChange={(e) => setDayExclusionInputs({ ...dayExclusionInputs, [dayNum]: e.target.value })}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddDayExclusion(dayNum, dayExclusionInputs[dayNum] || '')}
                                            className={`flex-1 px-3 py-1 text-xs rounded-xl border ${
                                              isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-gray-200 text-gray-900'
                                            }`}
                                          />
                                          <button
                                            type="button"
                                            onClick={() => handleAddDayExclusion(dayNum, dayExclusionInputs[dayNum] || '')}
                                            className="px-2.5 py-1 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 cursor-pointer"
                                          >
                                            + Add
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                );
                              }

                              // Line item category sections (Itinerary, Transportation, Accommodation, Food & Dining)
                              const categoryItems = itemsInThisDay.filter(item => getCategoryKey(item.type) === section.id);

                              return (
                                <div
                                  key={`day-${dayNum}-sec-${section.id}`}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    setActiveDropZone({ day: dayNum, target: section.id });
                                  }}
                                  onDragLeave={() => setActiveDropZone(null)}
                                  onDrop={(e) => handleDropToDayZone(e, dayNum, section.id)}
                                  className={`p-3.5 rounded-2xl border-2 transition-all space-y-2.5 ${
                                    activeDropZone?.day === dayNum && activeDropZone.target === section.id
                                      ? 'border-dashed border-orange-500 bg-orange-500/10 ring-2 ring-orange-500/30'
                                      : isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-gray-200'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <button
                                        type="button"
                                        onClick={() => toggleDaySectionCollapse(dayNum, section.id)}
                                        className="p-1 rounded bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 cursor-pointer"
                                      >
                                        {isSectionCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                                      </button>
                                      <span className="text-xs font-extrabold uppercase tracking-wider flex items-center space-x-1.5">
                                        <SectionIcon className="w-3.5 h-3.5 text-gray-500" />
                                        <span>{section.label} ({categoryItems.length})</span>
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-gray-400">Drag & Drop inventory here</span>
                                  </div>

                                  {!isSectionCollapsed && (
                                    categoryItems.length === 0 ? (
                                      <div className="p-3 border border-dashed border-gray-200 dark:border-slate-800 rounded-xl text-center text-gray-400">
                                        <p className="text-[11px]">No {section.label} items assigned to Day {dayNum}</p>
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        {categoryItems.map((item, lineIdx) => {
                                          const globalIdx = selectedLineItems.findIndex(i => i === item);

                                          return (
                                            <div
                                              key={`line-item-${dayNum}-${section.id}-${lineIdx}`}
                                              className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 ${
                                                isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-gray-200'
                                              }`}
                                            >
                                              <div className="flex items-center space-x-2 shrink-0">
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center space-x-1 ${getCategoryBadgeClass(item.type)}`}>
                                                  {getCategoryIcon(item.type)}
                                                  <span>{item.type}</span>
                                                </span>
                                              </div>

                                              <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                                  {item.name}
                                                </p>
                                                <p className="text-[10px] text-gray-500">
                                                  {currency} {Number(item.price).toLocaleString()} / {item.priceType}
                                                </p>
                                              </div>

                                              {/* Qty Counter */}
                                              <div className="flex items-center space-x-1 bg-gray-100 dark:bg-slate-900 rounded-lg p-1 border border-gray-200 dark:border-slate-700">
                                                <button
                                                  type="button"
                                                  onClick={() => handleUpdateLineItemQty(globalIdx, item.quantity - 1)}
                                                  className="w-5 h-5 flex items-center justify-center rounded text-xs font-bold bg-white dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700"
                                                >
                                                  -
                                                </button>
                                                <span className="w-5 text-center text-xs font-bold">
                                                  {item.quantity}
                                                </span>
                                                <button
                                                  type="button"
                                                  onClick={() => handleUpdateLineItemQty(globalIdx, item.quantity + 1)}
                                                  className="w-5 h-5 flex items-center justify-center rounded text-xs font-bold bg-white dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700"
                                                >
                                                  +
                                                </button>
                                              </div>

                                              <div className="text-right shrink-0">
                                                <p className="text-xs font-black text-gray-900 dark:text-white">
                                                  {currency} {item.subtotal.toLocaleString()}
                                                </p>
                                              </div>

                                              <button
                                                type="button"
                                                onClick={() => handleRemoveLineItem(globalIdx)}
                                                className="p-1 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: Inclusions, Exclusions & Terms Selector (Drag / Preset / Custom) */}
              <div className={`p-6 rounded-3xl border shadow-xs space-y-6 ${
                isDarkMode ? 'bg-[#111928] border-slate-800' : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center space-x-2 border-b border-gray-100 dark:border-slate-800/80 pb-3">
                  <div className="p-2 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-xl font-extrabold text-xs">
                    03
                  </div>
                  <h3 className={`text-sm font-extrabold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Inclusions, Exclusions & Terms Customization
                  </h3>
                </div>

                {/* Inclusions Block */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-900 dark:text-white flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>Inclusions ({selectedInclusions.length})</span>
                    </label>
                    <span className="text-[10px] text-gray-400">Click presets below to toggle</span>
                  </div>

                  {/* Selected Inclusions Tags */}
                  <div className="flex flex-wrap gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 min-h-[60px]">
                    {selectedInclusions.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No inclusions selected yet.</p>
                    ) : (
                      selectedInclusions.map((item, i) => (
                        <span key={`inc-${i}`} className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center space-x-1.5">
                          <span>✓ {item}</span>
                          <button onClick={() => toggleInclusionPreset(item)} className="hover:text-red-500">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  {/* Preset Inclusions Chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {masterInclusions.map((preset, i) => {
                      const isSelected = selectedInclusions.includes(preset);
                      return (
                        <div
                          key={`preset-inc-${i}`}
                          className={`inline-flex items-center rounded-lg text-[11px] font-semibold border transition-all ${
                            isSelected 
                              ? 'bg-emerald-600 text-white border-emerald-600' 
                              : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:border-emerald-500'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleInclusionPreset(preset)}
                            className="px-2.5 py-1 text-left cursor-pointer"
                          >
                            {isSelected ? '✓ ' : '+ '} {preset}
                          </button>
                          <button
                            type="button"
                            title="Edit prefilled inclusion"
                            onClick={(e) => {
                              e.stopPropagation();
                              const updated = prompt("Edit prefilled inclusion item:", preset);
                              if (updated && updated.trim()) {
                                handleEditPresetInclusion(i, updated.trim());
                              }
                            }}
                            className="px-1 py-1 opacity-70 hover:opacity-100 hover:text-amber-300 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            title="Delete prefilled inclusion"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Delete prefilled inclusion "${preset}"?`)) {
                                handleDeletePresetInclusion(i);
                              }
                            }}
                            className="pr-2 py-1 opacity-70 hover:opacity-100 hover:text-red-300 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Custom Inclusion */}
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Type custom inclusion item..."
                      value={customInclusionInput}
                      onChange={(e) => setCustomInclusionInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddCustomInclusion()}
                      className={`flex-1 px-3 py-1.5 text-xs rounded-xl border focus:outline-none ${
                        isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-gray-200 text-gray-900'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomInclusion}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 cursor-pointer"
                    >
                      Add Custom
                    </button>
                  </div>
                </div>

                {/* Exclusions Block */}
                <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-900 dark:text-white flex items-center space-x-1.5">
                      <X className="w-4 h-4 text-rose-500" />
                      <span>Exclusions ({selectedExclusions.length})</span>
                    </label>
                  </div>

                  {/* Selected Exclusions Tags */}
                  <div className="flex flex-wrap gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 min-h-[60px]">
                    {selectedExclusions.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No exclusions selected.</p>
                    ) : (
                      selectedExclusions.map((item, i) => (
                        <span key={`exc-${i}`} className="px-2.5 py-1 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-bold flex items-center space-x-1.5">
                          <span>✕ {item}</span>
                          <button onClick={() => toggleExclusionPreset(item)} className="hover:text-red-500">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  {/* Preset Exclusions Chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {masterExclusions.map((preset, i) => {
                      const isSelected = selectedExclusions.includes(preset);
                      return (
                        <div
                          key={`preset-exc-${i}`}
                          className={`inline-flex items-center rounded-lg text-[11px] font-semibold border transition-all ${
                            isSelected 
                              ? 'bg-rose-600 text-white border-rose-600' 
                              : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:border-rose-500'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleExclusionPreset(preset)}
                            className="px-2.5 py-1 text-left cursor-pointer"
                          >
                            {isSelected ? '✕ ' : '+ '} {preset}
                          </button>
                          <button
                            type="button"
                            title="Edit prefilled exclusion"
                            onClick={(e) => {
                              e.stopPropagation();
                              const updated = prompt("Edit prefilled exclusion item:", preset);
                              if (updated && updated.trim()) {
                                handleEditPresetExclusion(i, updated.trim());
                              }
                            }}
                            className="px-1 py-1 opacity-70 hover:opacity-100 hover:text-amber-300 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            title="Delete prefilled exclusion"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Delete prefilled exclusion "${preset}"?`)) {
                                handleDeletePresetExclusion(i);
                              }
                            }}
                            className="pr-2 py-1 opacity-70 hover:opacity-100 hover:text-red-300 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Custom Exclusion */}
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Type custom exclusion item..."
                      value={customExclusionInput}
                      onChange={(e) => setCustomExclusionInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddCustomExclusion()}
                      className={`flex-1 px-3 py-1.5 text-xs rounded-xl border focus:outline-none ${
                        isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-gray-200 text-gray-900'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomExclusion}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 cursor-pointer"
                    >
                      Add Custom
                    </button>
                  </div>
                </div>

                {/* Terms & Conditions Block */}
                <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-900 dark:text-white flex items-center space-x-1.5">
                      <FileCheck className="w-4 h-4 text-amber-500" />
                      <span>Terms & Conditions ({selectedTerms.length})</span>
                    </label>
                  </div>

                  {/* Selected Terms List */}
                  <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800">
                    {selectedTerms.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No terms specified.</p>
                    ) : (
                      selectedTerms.map((term, i) => (
                        <div key={`term-${i}`} className="flex items-start justify-between gap-2 p-1.5 text-xs text-gray-700 dark:text-gray-300">
                          <span className="font-semibold">{i + 1}. {term}</span>
                          <button onClick={() => toggleTermsPreset(term)} className="text-red-500 hover:text-red-700 shrink-0">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Preset Terms Chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {masterTerms.map((preset, i) => {
                      const isSelected = selectedTerms.includes(preset);
                      return (
                        <div
                          key={`preset-term-${i}`}
                          className={`inline-flex items-center rounded-lg text-[11px] font-semibold border transition-all ${
                            isSelected 
                              ? 'bg-amber-600 text-white border-amber-600' 
                              : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:border-amber-500'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleTermsPreset(preset)}
                            className="px-2.5 py-1 text-left cursor-pointer"
                          >
                            {isSelected ? '✓ ' : '+ '} {preset}
                          </button>
                          <button
                            type="button"
                            title="Edit prefilled term"
                            onClick={(e) => {
                              e.stopPropagation();
                              const updated = prompt("Edit prefilled term rule:", preset);
                              if (updated && updated.trim()) {
                                handleEditPresetTerm(i, updated.trim());
                              }
                            }}
                            className="px-1 py-1 opacity-70 hover:opacity-100 hover:text-amber-300 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            title="Delete prefilled term"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Delete prefilled term rule "${preset}"?`)) {
                                handleDeletePresetTerm(i);
                              }
                            }}
                            className="pr-2 py-1 opacity-70 hover:opacity-100 hover:text-red-300 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Custom Term */}
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Type custom terms & conditions rule..."
                      value={customTermsInput}
                      onChange={(e) => setCustomTermsInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTerms()}
                      className={`flex-1 px-3 py-1.5 text-xs rounded-xl border focus:outline-none ${
                        isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-gray-200 text-gray-900'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomTerms}
                      className="px-3 py-1.5 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 cursor-pointer"
                    >
                      Add Term
                    </button>
                  </div>
                </div>
              </div>

              {/* Special Notes & Generate Trigger Button */}
              <div className={`p-6 rounded-3xl border shadow-xs space-y-4 ${
                isDarkMode ? 'bg-[#111928] border-slate-800' : 'bg-white border-gray-200'
              }`}>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Special Notes / Guest Preferences (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Guest prefers vegetarian meals, anniversary celebration setup..."
                    value={specialNotes}
                    onChange={(e) => setSpecialNotes(e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border focus:outline-none ${
                      isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-gray-200 text-gray-900'
                    }`}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleGenerateAIProposal}
                  disabled={isGeneratingAI}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 text-white font-black text-sm shadow-lg hover:shadow-orange-500/25 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingAI ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Generating AI Proposal Narrative...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span>Generate Professional Proposal Document</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right 4 Cols: Draggable Inventory Catalog & Financial Margin Summary */}
            <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
              
              {/* Financial Calculation Box */}
              <div className={`p-6 rounded-3xl border shadow-xs space-y-4 ${
                isDarkMode ? 'bg-[#111928] border-slate-800' : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800/80 pb-3">
                  <h3 className={`text-sm font-extrabold flex items-center space-x-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    <Calculator className="w-4 h-4 text-orange-500" />
                    <span>Price & Margin Engine</span>
                  </h3>
                  <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
                    {selectedLineItems.length} items
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">Base Logistics Cost:</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {currency} {baseSubtotal.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 dark:text-gray-400 font-medium flex items-center space-x-1">
                      <span>Agency Margin / Markup:</span>
                    </span>
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={marginPercentage}
                        onChange={(e) => setMarginPercentage(parseFloat(e.target.value) || 0)}
                        className={`w-14 px-2 py-1 text-xs text-center font-black rounded-lg border ${
                          isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'
                        }`}
                      />
                      <span className="font-bold">%</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs text-emerald-600 dark:text-emerald-400 font-bold pt-1 border-t border-dashed border-gray-200 dark:border-slate-800">
                    <span>Estimated Margin Profit:</span>
                    <span>+ {currency} {marginAmount.toLocaleString()}</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider font-extrabold">Final Package Price</p>
                      <p className="text-lg font-black">{currency} {totalPrice.toLocaleString()}</p>
                    </div>
                    <DollarSign className="w-7 h-7 opacity-80" />
                  </div>
                </div>
              </div>

              {/* Draggable Inventory & Inclusion/Exclusion Catalog Sidebar */}
              <div className={`p-6 rounded-3xl border shadow-xs space-y-4 ${
                isDarkMode ? 'bg-[#111928] border-slate-800' : 'bg-white border-gray-200'
              }`}>
                {/* Catalog Sub-tabs */}
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-800 pb-3">
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setCatalogSubTab('inventory')}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                        catalogSubTab === 'inventory' 
                          ? 'bg-orange-600 text-white shadow-sm' 
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      📦 Inventory ({filteredInventory.length})
                    </button>
                    <button
                      onClick={() => setCatalogSubTab('inclusions')}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                        catalogSubTab === 'inclusions' 
                          ? 'bg-emerald-600 text-white shadow-sm' 
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      ✓ Inclusions
                    </button>
                    <button
                      onClick={() => setCatalogSubTab('exclusions')}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                        catalogSubTab === 'exclusions' 
                          ? 'bg-rose-600 text-white shadow-sm' 
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      ✕ Exclusions
                    </button>
                  </div>

                  {catalogSubTab === 'inventory' && (
                    <button
                      onClick={handleOpenAddInventory}
                      className="p-1.5 rounded-lg bg-orange-600 text-white hover:bg-orange-700 text-xs font-bold cursor-pointer shrink-0"
                      title="Add inventory item"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Sub-tab 1: Categorized Inventory Catalog with Expand & Collapse Boxes */}
                {catalogSubTab === 'inventory' && (
                  <div className="space-y-3">
                    {/* Search & Global Expand/Collapse controls */}
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search inventory across categories..."
                          value={inventorySearch}
                          onChange={(e) => setInventorySearch(e.target.value)}
                          className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border ${
                            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-gray-200 text-gray-900'
                          }`}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-gray-500 pt-0.5">
                        <span>Categorized Inventory ({inventoryList.length})</span>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={expandAllCatalogCategories}
                            className="text-orange-600 dark:text-orange-400 font-bold hover:underline cursor-pointer"
                          >
                            Expand All
                          </button>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={collapseAllCatalogCategories}
                            className="text-gray-500 font-bold hover:underline cursor-pointer"
                          >
                            Collapse All
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Categorized Expand & Collapse Boxes */}
                    <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                      {CATEGORY_SECTIONS.map((sec) => {
                        const SecIcon = sec.icon;
                        const isCollapsed = !!collapsedCatalogCategories[sec.id];
                        const secItems = filteredInventory.filter(item => getCategoryKey(item.type) === sec.id);

                        return (
                          <div
                            key={`cat-box-${sec.id}`}
                            className={`rounded-2xl border transition-all overflow-hidden ${
                              isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50/80 border-gray-200'
                            }`}
                          >
                            {/* Accordion Box Header */}
                            <div
                              onClick={() => toggleCatalogCategoryCollapse(sec.id)}
                              className="w-full p-3 flex items-center justify-between cursor-pointer select-none hover:bg-orange-500/5 transition-colors"
                            >
                              <div className="flex items-center space-x-2">
                                <span className="p-1 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300">
                                  {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                                </span>
                                <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center space-x-1.5">
                                  <SecIcon className="w-3.5 h-3.5 text-orange-500" />
                                  <span>{sec.label}</span>
                                </span>
                              </div>

                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${sec.badgeClass}`}>
                                {secItems.length}
                              </span>
                            </div>

                            {/* Accordion Content */}
                            {!isCollapsed && (
                              <div className="p-3 pt-0 border-t border-gray-200/50 dark:border-slate-800/80 space-y-2 mt-1">
                                {loadingInventory ? (
                                  <div className="py-4 text-center text-xs text-gray-400 flex items-center justify-center space-x-2">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Loading...</span>
                                  </div>
                                ) : secItems.length === 0 ? (
                                  <div className="py-3 text-center text-[11px] text-gray-400 italic">
                                    No items in {sec.label}. Click + below to create.
                                  </div>
                                ) : (
                                  secItems.map((item) => (
                                    <div
                                      key={`inv-card-${item.id}`}
                                      draggable={true}
                                      onDragStart={() => handleDragStartItem(item)}
                                      className={`p-2.5 rounded-xl border transition-all cursor-grab active:cursor-grabbing hover:shadow-xs ${
                                        isDarkMode ? 'bg-slate-800/80 border-slate-700 hover:border-orange-500/50' : 'bg-white border-gray-200 hover:border-orange-500/50'
                                      }`}
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center space-x-2 min-w-0">
                                          <GripVertical className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                          <div className="min-w-0">
                                            <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                              {item.name}
                                            </p>
                                            <div className="flex items-center space-x-2 mt-0.5">
                                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold border ${getCategoryBadgeClass(item.type)}`}>
                                                {item.type}
                                              </span>
                                              <span className="text-[10px] font-extrabold text-orange-600 dark:text-orange-400">
                                                {currency} {Number(item.price).toLocaleString()}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Quick Assign to Day Buttons */}
                                      <div className="mt-2 pt-1.5 border-t border-gray-200/50 dark:border-slate-800 flex items-center justify-between text-[10px]">
                                        <span className="text-gray-400">Assign:</span>
                                        <div className="flex items-center gap-1 overflow-x-auto">
                                          {Array.from({ length: Math.min(durationDays, 5) }, (_, dIdx) => (
                                            <button
                                              key={`quick-add-d${dIdx + 1}`}
                                              onClick={() => addItemToDay(item, dIdx + 1)}
                                              className="px-1.5 py-0.5 rounded bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 font-bold cursor-pointer"
                                            >
                                              +D{dIdx + 1}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                )}

                                <button
                                  type="button"
                                  onClick={handleOpenAddInventory}
                                  className="w-full py-1.5 rounded-xl border border-dashed border-gray-300 dark:border-slate-700 text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-orange-600 hover:border-orange-500 transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Add Item to {sec.label}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sub-tab 2: General Inclusions Data Bank */}
                {catalogSubTab === 'inclusions' && (
                  <div className="space-y-3">
                    {/* Add Master Inclusion Input */}
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="Create global inclusion item..."
                        value={newMasterInclusionInput}
                        onChange={(e) => setNewMasterInclusionInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddMasterInclusion()}
                        className={`flex-1 px-3 py-1.5 text-xs rounded-xl border focus:outline-none ${
                          isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-gray-200 text-gray-900'
                        }`}
                      />
                      <button
                        onClick={handleAddMasterInclusion}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 cursor-pointer shrink-0"
                      >
                        + Add
                      </button>
                    </div>

                    <p className="text-[10px] text-gray-400 italic">
                      💡 Drag any inclusion below onto a specific Day or click +D1, +D2 buttons.
                    </p>

                    {/* Inclusions List */}
                    <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                      {masterInclusions.map((incText, idx) => {
                        const isGlobalSelected = selectedInclusions.includes(incText);

                        return (
                          <div
                            key={`master-inc-${idx}`}
                            draggable={true}
                            onDragStart={() => handleDragStartInclusion(incText)}
                            className={`p-2.5 rounded-2xl border transition-all cursor-grab active:cursor-grabbing hover:shadow-sm ${
                              isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-gray-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center space-x-2 min-w-0">
                                <GripVertical className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                <span className="text-xs font-semibold text-gray-900 dark:text-white leading-tight">
                                  {incText}
                                </span>
                              </div>
                              <button
                                onClick={() => handleDeleteMasterInclusion(incText)}
                                className="text-gray-400 hover:text-red-500 shrink-0"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Actions bar */}
                            <div className="mt-2 pt-1.5 border-t border-gray-200/50 dark:border-slate-800 flex items-center justify-between text-[10px]">
                              <button
                                onClick={() => toggleInclusionPreset(incText)}
                                className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                                  isGlobalSelected 
                                    ? 'bg-emerald-600 text-white' 
                                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                                }`}
                              >
                                {isGlobalSelected ? '✓ Global' : '+ Global'}
                              </button>

                              <div className="flex items-center gap-1 overflow-x-auto">
                                {Array.from({ length: Math.min(durationDays, 5) }, (_, dIdx) => (
                                  <button
                                    key={`add-inc-d${dIdx + 1}`}
                                    onClick={() => handleAddDayInclusion(dIdx + 1, incText)}
                                    className="px-1.5 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold cursor-pointer"
                                  >
                                    +D{dIdx + 1}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sub-tab 3: General Exclusions Data Bank */}
                {catalogSubTab === 'exclusions' && (
                  <div className="space-y-3">
                    {/* Add Master Exclusion Input */}
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="Create global exclusion item..."
                        value={newMasterExclusionInput}
                        onChange={(e) => setNewMasterExclusionInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddMasterExclusion()}
                        className={`flex-1 px-3 py-1.5 text-xs rounded-xl border focus:outline-none ${
                          isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-gray-200 text-gray-900'
                        }`}
                      />
                      <button
                        onClick={handleAddMasterExclusion}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 cursor-pointer shrink-0"
                      >
                        + Add
                      </button>
                    </div>

                    <p className="text-[10px] text-gray-400 italic">
                      💡 Drag any exclusion below onto a specific Day or click +D1, +D2 buttons.
                    </p>

                    {/* Exclusions List */}
                    <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                      {masterExclusions.map((excText, idx) => {
                        const isGlobalSelected = selectedExclusions.includes(excText);

                        return (
                          <div
                            key={`master-exc-${idx}`}
                            draggable={true}
                            onDragStart={() => handleDragStartExclusion(excText)}
                            className={`p-2.5 rounded-2xl border transition-all cursor-grab active:cursor-grabbing hover:shadow-sm ${
                              isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-gray-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center space-x-2 min-w-0">
                                <GripVertical className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                <span className="text-xs font-semibold text-gray-900 dark:text-white leading-tight">
                                  {excText}
                                </span>
                              </div>
                              <button
                                onClick={() => handleDeleteMasterExclusion(excText)}
                                className="text-gray-400 hover:text-red-500 shrink-0"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Actions bar */}
                            <div className="mt-2 pt-1.5 border-t border-gray-200/50 dark:border-slate-800 flex items-center justify-between text-[10px]">
                              <button
                                onClick={() => toggleExclusionPreset(excText)}
                                className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                                  isGlobalSelected 
                                    ? 'bg-rose-600 text-white' 
                                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
                                }`}
                              >
                                {isGlobalSelected ? '✓ Global' : '+ Global'}
                              </button>

                              <div className="flex items-center gap-1 overflow-x-auto">
                                {Array.from({ length: Math.min(durationDays, 5) }, (_, dIdx) => (
                                  <button
                                    key={`add-exc-d${dIdx + 1}`}
                                    onClick={() => handleAddDayExclusion(dIdx + 1, excText)}
                                    className="px-1.5 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold cursor-pointer"
                                  >
                                    +D{dIdx + 1}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Generated Proposal Document Display & Revision Mode */}
          {generatedProposal && (
            <div className="space-y-6 pt-6 border-t border-gray-200 dark:border-slate-800">
              {/* Document Header Controls */}
              <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 text-white shadow-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-500 rounded-xl">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-sm font-extrabold">Proposal Document Preview</h2>
                    <p className="text-xs text-gray-400">Generated for {generatedProposal.guestName}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center p-1 rounded-xl bg-slate-800 border border-slate-700">
                    <button
                      onClick={() => setPreviewViewMode('document')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                        previewViewMode === 'document' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Document Preview</span>
                    </button>
                    <button
                      onClick={() => setPreviewViewMode('revise')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                        previewViewMode === 'revise' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit & Revise</span>
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setCustomerEmailInput(generatedProposal.email || email || '');
                      setEmailSubjectInput(`Official Tour Proposal: ${generatedProposal.proposalTitle}`);
                      setIsEmailModalOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center space-x-1.5 cursor-pointer shadow-md"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Send by Email</span>
                  </button>

                  <button
                    onClick={handleCopyWhatsAppMessage}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1.5 cursor-pointer shadow-md"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{copySuccess ? 'Copied!' : 'WhatsApp Text'}</span>
                  </button>

                  <button
                    onClick={handleSaveProposalToDb}
                    disabled={isSavingProposal}
                    className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center space-x-1.5 cursor-pointer shadow-md disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isSavingProposal ? 'Saving...' : 'Save Proposal'}</span>
                  </button>

                  <button
                    onClick={handlePrintDocument}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs flex items-center space-x-1.5 cursor-pointer shadow-md"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print / Export PDF</span>
                  </button>
                </div>
              </div>

              {/* View Mode 1: Edit & Revise Editor Form */}
              {previewViewMode === 'revise' && (
                <div className="no-print p-6 rounded-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#111928] space-y-6">
                  <div className="flex items-center space-x-2 border-b pb-3 border-gray-200 dark:border-slate-800">
                    <Edit3 className="w-5 h-5 text-orange-500" />
                    <h3 className="text-base font-extrabold text-gray-900 dark:text-white">Revise Proposal Content & Itinerary</h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Proposal Title</label>
                      <input
                        type="text"
                        value={generatedProposal.proposalTitle}
                        onChange={(e) => setGeneratedProposal({ ...generatedProposal, proposalTitle: e.target.value })}
                        className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Welcome Greeting Message</label>
                      <textarea
                        rows={3}
                        value={generatedProposal.welcomeMessage}
                        onChange={(e) => setGeneratedProposal({ ...generatedProposal, welcomeMessage: e.target.value })}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                      />
                    </div>

                    {/* Revise Itinerary Days */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-extrabold text-orange-600 dark:text-orange-400 uppercase tracking-wider">Itinerary Day Narratives & Item Descriptions</h4>
                      {generatedProposal.itineraryNarrative.map((day, dIdx) => {
                        const dayItems = generatedProposal.selectedItems.filter(i => i.day === day.dayNumber);
                        return (
                          <div key={`revise-day-${dIdx}`} className="p-4 rounded-2xl border border-gray-200 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="flex items-center space-x-3">
                              <span className="px-2 py-0.5 rounded bg-orange-600 text-white text-xs font-black">DAY {day.dayNumber}</span>
                              <input
                                type="text"
                                value={day.title}
                                onChange={(e) => {
                                  const newNarrative = [...generatedProposal.itineraryNarrative];
                                  newNarrative[dIdx].title = e.target.value;
                                  setGeneratedProposal({ ...generatedProposal, itineraryNarrative: newNarrative });
                                }}
                                className="flex-1 px-3 py-1.5 text-xs font-bold rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                              />
                            </div>
                            <div>
                              <textarea
                                rows={2}
                                value={day.summary}
                                onChange={(e) => {
                                  const newNarrative = [...generatedProposal.itineraryNarrative];
                                  newNarrative[dIdx].summary = e.target.value;
                                  setGeneratedProposal({ ...generatedProposal, itineraryNarrative: newNarrative });
                                }}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                              />
                            </div>

                            {/* Item Descriptions for Day */}
                            {dayItems.length > 0 && (
                              <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-slate-800">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                                  Included Logistics Descriptions:
                                </span>
                                {dayItems.map((item, itemIdx) => (
                                  <div key={`revise-item-${itemIdx}`} className="p-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-slate-900 dark:text-white">{item.name}</span>
                                      <span className="text-[10px] font-medium text-slate-400">{item.type}</span>
                                    </div>
                                    <input
                                      type="text"
                                      value={item.description || getItemDescription(item)}
                                      onChange={(e) => {
                                        const newDesc = e.target.value;
                                        const updatedItems = generatedProposal.selectedItems.map(si => {
                                          if (si.name === item.name && si.day === item.day) {
                                            return { ...si, description: newDesc };
                                          }
                                          return si;
                                        });
                                        setGeneratedProposal({ ...generatedProposal, selectedItems: updatedItems });
                                      }}
                                      className="w-full px-2.5 py-1 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Closing Message</label>
                      <textarea
                        rows={2}
                        value={generatedProposal.closingNotes}
                        onChange={(e) => setGeneratedProposal({ ...generatedProposal, closingNotes: e.target.value })}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* View Mode 2: High-Craft Print-Ready Proposal Document (Fits Standard Paper / A4) */}
              <div className="print-container max-w-4xl mx-auto p-8 md:p-12 bg-white text-slate-900 rounded-3xl shadow-xl border border-gray-200 relative overflow-visible print:shadow-none print:border-none">
                
                {/* Print Branding Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b-2 border-amber-500/30 pb-6">
                  <div className="flex items-center space-x-4">
                    <img
                      src={companyLogo}
                      alt={companyName}
                      className="w-16 h-16 rounded-2xl object-cover border border-gray-200 shadow-sm"
                    />
                    <div>
                      <h1 className="text-xl font-black text-slate-900 tracking-tight">{companyName}</h1>
                      <p className="text-xs text-slate-500 font-medium">{companyAddress}</p>
                      <p className="text-xs text-slate-500 font-medium">Email: {companyEmail} | Phone: {companyPhone}</p>
                      <p className="text-xs text-amber-600 font-bold">{companyWebsite}</p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 font-black text-xs uppercase tracking-wider">
                      Official Tour Proposal
                    </span>
                    <p className="text-xs font-bold text-slate-400 mt-2">Ref ID: PRO-BALI-{(Math.floor(Math.random() * 8999) + 1000)}</p>
                    <p className="text-xs font-medium text-slate-500">Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>

                {/* Client Metadata Block */}
                <div className="my-6 p-6 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-4 print-page-break">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Prepared For</span>
                    <span className="text-sm font-black text-slate-900">{generatedProposal.guestName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pax Count</span>
                    <span className="text-sm font-black text-slate-900">{generatedProposal.paxCount} Guest(s)</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Duration</span>
                    <span className="text-sm font-black text-slate-900">{generatedProposal.durationDays} Day(s)</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Package Investment</span>
                    <span className="text-sm font-black text-orange-600">{generatedProposal.currency} {Number(generatedProposal.totalPrice).toLocaleString()}</span>
                  </div>
                </div>

                {/* Title & Welcome Message */}
                <div className="space-y-3 mb-8">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">{generatedProposal.proposalTitle}</h2>
                  <p className="text-sm text-slate-600 leading-relaxed font-medium italic bg-amber-500/5 p-4 rounded-xl border-l-4 border-amber-500">
                    "{generatedProposal.welcomeMessage}"
                  </p>
                </div>

                {/* Day-by-Day Detailed Itinerary */}
                <div className="space-y-6 mb-8">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                      <Compass className="w-4 h-4 text-orange-500" />
                      <span>Detailed Day-by-Day Itinerary & Logistics</span>
                    </h3>

                    <div className="no-print flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={expandAllDocDays}
                        className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center space-x-1 cursor-pointer"
                        title="Expand all days"
                      >
                        <ChevronsDown className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Expand All</span>
                      </button>
                      <button
                        type="button"
                        onClick={collapseAllDocDays}
                        className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center space-x-1 cursor-pointer"
                        title="Collapse all days"
                      >
                        <ChevronsUp className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Collapse All</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {generatedProposal.itineraryNarrative.map((day) => {
                      const dayLogistics = generatedProposal.selectedItems.filter(i => i.day === day.dayNumber);
                      const isDocCollapsed = !!collapsedDocDays[day.dayNumber];

                      const dayItineraryItems = dayLogistics.filter(i => getCategoryKey(i.type) === 'itinerary');
                      const dayTransportItems = dayLogistics.filter(i => getCategoryKey(i.type) === 'transport');
                      const dayAccommodationItems = dayLogistics.filter(i => getCategoryKey(i.type) === 'accommodation');
                      const dayDiningItems = dayLogistics.filter(i => getCategoryKey(i.type) === 'food');

                      const dayInclusionsList = [
                        ...dayLogistics.filter(i => getCategoryKey(i.type) === 'inclusion').map(i => i.name),
                        ...(generatedProposal.dayInclusions?.[day.dayNumber] || [])
                      ];

                      const dayExclusionsList = [
                        ...dayLogistics.filter(i => getCategoryKey(i.type) === 'exclusion').map(i => i.name),
                        ...(generatedProposal.dayExclusions?.[day.dayNumber] || [])
                      ];

                      return (
                        <div key={`doc-day-${day.dayNumber}`} className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4 print-page-break">
                          {/* Day Header & AI Generated Narrative Description */}
                          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                            <div className="space-y-1.5 min-w-0 flex-1">
                              <div className="flex items-center space-x-2.5">
                                <span className="px-3 py-1 rounded-xl bg-orange-600 text-white font-black text-xs uppercase tracking-wider">
                                  Day {toRoman(day.dayNumber)}
                                </span>
                                <h4 className="text-base font-black text-slate-900 truncate">{day.title}</h4>
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed font-medium pt-1">
                                {day.summary}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => toggleDocDayCollapse(day.dayNumber)}
                              className="no-print p-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center space-x-1 shrink-0 cursor-pointer transition-colors"
                              title={isDocCollapsed ? "Expand Day" : "Collapse Day"}
                            >
                              <span>{isDocCollapsed ? "Expand" : "Collapse"}</span>
                              {isDocCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          {/* Collapsible Categorized Day Body */}
                          <div className={isDocCollapsed ? "hidden print:block space-y-3.5" : "space-y-3.5"}>
                            {/* 1. Itinerary */}
                            <div className="space-y-1">
                              <span className="text-[11px] font-black uppercase tracking-wider text-orange-600 flex items-center space-x-1.5">
                                <Compass className="w-3.5 h-3.5" />
                                <span>Itinerary:</span>
                              </span>
                              {dayItineraryItems.length > 0 ? (
                                <ul className="space-y-1 pl-2 text-xs font-medium text-slate-800">
                                  {dayItineraryItems.map((item, lIdx) => (
                                    <li key={`day-it-item-${lIdx}`} className="flex items-start space-x-1.5">
                                      <span className="text-orange-500 font-bold">•</span>
                                      <div>
                                        <span className="font-bold">{item.name}</span>
                                        {item.description && (
                                          <p className="text-[11px] text-slate-500 font-normal leading-tight">{item.description}</p>
                                        )}
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-xs text-slate-400 pl-2 italic">-</p>
                              )}
                            </div>

                            {/* 2. Transportation Option */}
                            <div className="space-y-1">
                              <span className="text-[11px] font-black uppercase tracking-wider text-blue-600 flex items-center space-x-1.5">
                                <Car className="w-3.5 h-3.5" />
                                <span>Transportation Option:</span>
                              </span>
                              {dayTransportItems.length > 0 ? (
                                <ul className="space-y-1 pl-2 text-xs font-medium text-slate-800">
                                  {dayTransportItems.map((item, lIdx) => (
                                    <li key={`day-tr-item-${lIdx}`} className="flex items-start space-x-1.5">
                                      <span className="text-blue-500 font-bold">•</span>
                                      <div>
                                        <span className="font-bold">{item.name}</span>
                                        {item.description && (
                                          <p className="text-[11px] text-slate-500 font-normal leading-tight">{item.description}</p>
                                        )}
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-xs text-slate-400 pl-2 italic">-</p>
                              )}
                            </div>

                            {/* 3. Accommodation */}
                            <div className="space-y-1">
                              <span className="text-[11px] font-black uppercase tracking-wider text-purple-600 flex items-center space-x-1.5">
                                <Hotel className="w-3.5 h-3.5" />
                                <span>Accommodation:</span>
                              </span>
                              {dayAccommodationItems.length > 0 ? (
                                <ul className="space-y-1 pl-2 text-xs font-medium text-slate-800">
                                  {dayAccommodationItems.map((item, lIdx) => (
                                    <li key={`day-ac-item-${lIdx}`} className="flex items-start space-x-1.5">
                                      <span className="text-purple-500 font-bold">•</span>
                                      <div>
                                        <span className="font-bold">{item.name}</span>
                                        {item.description && (
                                          <p className="text-[11px] text-slate-500 font-normal leading-tight">{item.description}</p>
                                        )}
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-xs text-slate-400 pl-2 italic">-</p>
                              )}
                            </div>

                            {/* 4. Dining */}
                            <div className="space-y-1">
                              <span className="text-[11px] font-black uppercase tracking-wider text-amber-600 flex items-center space-x-1.5">
                                <Utensils className="w-3.5 h-3.5" />
                                <span>Dining:</span>
                              </span>
                              {dayDiningItems.length > 0 ? (
                                <ul className="space-y-1 pl-2 text-xs font-medium text-slate-800">
                                  {dayDiningItems.map((item, lIdx) => (
                                    <li key={`day-fd-item-${lIdx}`} className="flex items-start space-x-1.5">
                                      <span className="text-amber-500 font-bold">•</span>
                                      <div>
                                        <span className="font-bold">{item.name}</span>
                                        {item.description && (
                                          <p className="text-[11px] text-slate-500 font-normal leading-tight">{item.description}</p>
                                        )}
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-xs text-slate-400 pl-2 italic">-</p>
                              )}
                            </div>

                            {/* 5. Inclusion */}
                            <div className="space-y-1">
                              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 flex items-center space-x-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Inclusion:</span>
                              </span>
                              {dayInclusionsList.length > 0 ? (
                                <ul className="space-y-1 pl-2 text-xs font-medium text-slate-800">
                                  {dayInclusionsList.map((inc, iIdx) => (
                                    <li key={`day-inc-${iIdx}`} className="flex items-start space-x-1.5">
                                      <span className="text-emerald-600 font-bold">•</span>
                                      <span>{inc}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-xs text-slate-400 pl-2 italic">-</p>
                              )}
                            </div>

                            {/* 6. Exclusion */}
                            <div className="space-y-1">
                              <span className="text-[11px] font-black uppercase tracking-wider text-rose-600 flex items-center space-x-1.5">
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Exclusion:</span>
                              </span>
                              {dayExclusionsList.length > 0 ? (
                                <ul className="space-y-1 pl-2 text-xs font-medium text-slate-800">
                                  {dayExclusionsList.map((exc, eIdx) => (
                                    <li key={`day-exc-${eIdx}`} className="flex items-start space-x-1.5">
                                      <span className="text-rose-600 font-bold">•</span>
                                      <span>{exc}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-xs text-slate-400 pl-2 italic">-</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* What is included & What's not included Side-by-Side Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-8 print-page-break">
                  <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>What is included:</span>
                    </h4>
                    <ul className="space-y-1.5 text-xs font-medium text-slate-700">
                      {generatedProposal.inclusions.map((inc, i) => (
                        <li key={`doc-inc-${i}`} className="flex items-start space-x-2">
                          <span className="text-emerald-600 font-bold">•</span>
                          <span>{inc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-5 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-rose-800 flex items-center space-x-2">
                      <XCircle className="w-4 h-4 text-rose-600" />
                      <span>What's not included:</span>
                    </h4>
                    <ul className="space-y-1.5 text-xs font-medium text-slate-700">
                      {generatedProposal.exclusions.map((exc, i) => (
                        <li key={`doc-exc-${i}`} className="flex items-start space-x-2">
                          <span className="text-rose-600 font-bold">•</span>
                          <span>{exc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Terms & Conditions */}
                {generatedProposal.termsAndConditions && generatedProposal.termsAndConditions.length > 0 && (
                  <div className="my-8 p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 print-page-break">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center space-x-2">
                      <FileCheck className="w-4 h-4 text-amber-500" />
                      <span>Terms & Booking Conditions</span>
                    </h4>
                    <ol className="list-decimal list-inside space-y-1.5 text-xs font-medium text-slate-600">
                      {generatedProposal.termsAndConditions.map((term, i) => (
                        <li key={`doc-term-${i}`}>{term}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Financial Summary Box */}
                <div className="my-8 p-6 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 print-page-break">
                  <div>
                    <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider block">Total Agreed Price</span>
                    <p className="text-2xl font-black">{generatedProposal.currency} {Number(generatedProposal.totalPrice).toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Includes all taxes, vehicle charters, tickets & guide services listed above</p>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1.5 rounded-xl bg-orange-600 text-white font-bold text-xs">
                      All-Inclusive Package
                    </span>
                  </div>
                </div>

                {/* Closing & Dual Signatures Block */}
                <div className="mt-12 pt-8 border-t border-slate-200 space-y-8 print-page-break">
                  <p className="text-xs font-medium text-slate-600 text-center italic">
                    "{generatedProposal.closingNotes}"
                  </p>

                  <div className="grid grid-cols-2 gap-12 pt-6">
                    <div className="text-center space-y-12">
                      <div className="border-b-2 border-slate-300 pb-2">
                        <p className="text-xs font-extrabold text-slate-900">{companyName}</p>
                      </div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Authorized Tour Representative</p>
                    </div>

                    <div className="text-center space-y-12">
                      <div className="border-b-2 border-slate-300 pb-2">
                        <p className="text-xs font-extrabold text-slate-900">{generatedProposal.guestName}</p>
                      </div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Client Acceptance & Approval</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: INVENTORY MANAGEMENT CATALOG */}
      {activeSubTab === 'inventory' && (
        <div className="p-6 rounded-3xl border shadow-xs space-y-6 bg-white dark:bg-[#111928] border-gray-200 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-extrabold text-gray-900 dark:text-white">Master Logistics Inventory</h2>
              <p className="text-xs text-gray-500">Manage entrance tickets, transport car charters, hotel stays, food & guide rates</p>
            </div>
            <button
              onClick={handleOpenAddInventory}
              className="px-4 py-2 rounded-xl bg-orange-600 text-white font-bold text-xs hover:bg-orange-700 flex items-center space-x-1.5 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Inventory Item</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inventoryList.map(item => (
              <div
                key={`cat-list-${item.id}`}
                className="p-4 rounded-2xl border border-gray-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${getCategoryBadgeClass(item.type)}`}>
                      {item.type}
                    </span>
                    <span className="text-xs font-black text-orange-600 dark:text-orange-400">
                      IDR {Number(item.price).toLocaleString()}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white">{item.name}</h3>
                  <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{item.description || 'No description'}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-200/60 dark:border-slate-800 text-xs">
                  <span className="text-[10px] font-medium text-gray-400">{item.priceType}</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditInventory(item)}
                      className="p-1 rounded text-gray-600 hover:text-orange-600 dark:text-gray-400"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteInventory(item.id)}
                      className="p-1 rounded text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: SAVED PROPOSALS HISTORY */}
      {activeSubTab === 'history' && (
        <div className="p-6 rounded-3xl border shadow-xs space-y-6 bg-white dark:bg-[#111928] border-gray-200 dark:border-slate-800">
          <div className="border-b border-gray-100 dark:border-slate-800 pb-4">
            <h2 className="text-base font-extrabold text-gray-900 dark:text-white">Saved Proposals History</h2>
            <p className="text-xs text-gray-500">View and reload previously generated client proposals</p>
          </div>

          <div className="space-y-3">
            {savedProposals.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400">
                No saved proposals yet. Generate and save a proposal to see it here.
              </div>
            ) : (
              savedProposals.map((p) => (
                <div
                  key={`prop-hist-${p.id}`}
                  className="p-4 rounded-2xl border border-gray-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white truncate">{p.proposalTitle}</h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Guest: <span className="font-bold text-gray-700 dark:text-gray-300">{p.guestName}</span> • {p.paxCount} Pax • {p.durationDays} Days
                    </p>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    <span className="text-xs font-black text-orange-600 dark:text-orange-400">
                      {p.currency} {Number(p.totalPrice).toLocaleString()}
                    </span>
                    <button
                      onClick={() => handleLoadProposal(p)}
                      className="px-3 py-1.5 rounded-xl bg-orange-600 text-white font-bold text-xs hover:bg-orange-700 cursor-pointer"
                    >
                      Load & View
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Inventory Item Create/Edit Modal */}
      {isInventoryModalOpen && editingInventoryItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">
                {editingInventoryItem.id ? 'Edit Inventory Item' : 'New Inventory Item'}
              </h3>
              <button onClick={() => setIsInventoryModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Item Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Lempuyang Entrance Ticket"
                  value={editingInventoryItem.name || ''}
                  onChange={(e) => setEditingInventoryItem({ ...editingInventoryItem, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Type Category</label>
                  <select
                    value={editingInventoryItem.type || 'Ticket'}
                    onChange={(e) => setEditingInventoryItem({ ...editingInventoryItem, type: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                  >
                    <option value="Ticket">Ticket</option>
                    <option value="Transport">Transport</option>
                    <option value="Hotel">Hotel</option>
                    <option value="Food">Food</option>
                    <option value="Guide">Guide</option>
                    <option value="Extra">Extra</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Price Unit</label>
                  <select
                    value={editingInventoryItem.priceType || 'Per person'}
                    onChange={(e) => setEditingInventoryItem({ ...editingInventoryItem, priceType: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                  >
                    <option value="Per person">Per person</option>
                    <option value="Per car">Per car</option>
                    <option value="Per room">Per room</option>
                    <option value="Per day">Per day</option>
                    <option value="Flat rate">Flat rate</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Base Price (IDR) *</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={editingInventoryItem.price !== undefined && editingInventoryItem.price !== null ? editingInventoryItem.price : ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const parsed = parseFloat(raw);
                    setEditingInventoryItem({
                      ...editingInventoryItem,
                      price: raw === '' ? '' : (isNaN(parsed) ? 0 : parsed)
                    });
                  }}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Additional logistics notes..."
                  value={editingInventoryItem.description || ''}
                  onChange={(e) => setEditingInventoryItem({ ...editingInventoryItem, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-gray-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsInventoryModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveInventoryItem}
                disabled={isSavingInventory}
                className="px-4 py-2 rounded-xl bg-orange-600 text-white font-bold text-xs hover:bg-orange-700 flex items-center space-x-1 cursor-pointer"
              >
                {isSavingInventory ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Save Item</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Proposal Modal */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Mail className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">
                  Send Proposal via Email Server
                </h3>
              </div>
              <button onClick={() => setIsEmailModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Customer Recipient Email Address *
                </label>
                <input
                  type="email"
                  placeholder="e.g. guest@example.com"
                  value={customerEmailInput}
                  onChange={(e) => setCustomerEmailInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Email Subject Line
                </label>
                <input
                  type="text"
                  value={emailSubjectInput}
                  onChange={(e) => setEmailSubjectInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-gray-900 dark:text-white"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 text-xs space-y-1">
                <p className="font-bold text-indigo-900 dark:text-indigo-200">Email Delivery Details:</p>
                <p className="text-indigo-700 dark:text-indigo-300">
                  • Recipient: <strong>{customerEmailInput || 'Not specified'}</strong>
                </p>
                <p className="text-indigo-700 dark:text-indigo-300">
                  • Sender Agency: <strong>{companyName} ({companyEmail})</strong>
                </p>
                <p className="text-indigo-700 dark:text-indigo-300">
                  • Sends a full responsive HTML proposal with day-by-day itinerary, logistics, investment breakdown, and inclusions.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsEmailModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendProposalEmail}
                disabled={isSendingEmail || !customerEmailInput.trim()}
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 flex items-center space-x-2 shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSendingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending via Email Server...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Email Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
