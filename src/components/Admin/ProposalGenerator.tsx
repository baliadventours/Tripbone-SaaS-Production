import React, { useState, useEffect, useMemo } from 'react';
import { db, collection, addDoc, updateDoc, doc, deleteDoc, onSnapshot, serverTimestamp } from '../../lib/firebase';
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
  ArrowRight
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
  day?: number;
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
  welcomeMessage: string;
  itineraryNarrative: {
    dayNumber: number;
    title: string;
    summary: string;
    activities: string[];
  }[];
  inclusions: string[];
  exclusions: string[];
  importantTips: string[];
  closingNotes: string;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Confirmed';
  createdAt?: any;
}

interface ProposalGeneratorProps {
  isDarkMode?: boolean;
  tenantId?: string;
}

export default function ProposalGenerator({ isDarkMode = false, tenantId }: ProposalGeneratorProps) {
  const [activeSubTab, setActiveSubTab] = useState<'create' | 'inventory' | 'history'>('create');

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

  // Itinerary Selected Items
  const [selectedLineItems, setSelectedLineItems] = useState<ProposalLineItem[]>([]);
  const [selectedInventoryIdToAdd, setSelectedInventoryIdToAdd] = useState('');
  const [itemDayToAdd, setItemDayToAdd] = useState<number>(1);

  // AI Generation & Output state
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [generatedProposal, setGeneratedProposal] = useState<Proposal | null>(null);
  const [savedProposals, setSavedProposals] = useState<Proposal[]>([]);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isSavingProposal, setIsSavingProposal] = useState(false);

  // Load Inventory from Firestore
  useEffect(() => {
    const defaultSeedItems = [
      { id: 'seed-1', name: 'Lempuyang Temple Entrance Ticket', type: 'Ticket', price: 100000, priceType: 'Per person', description: 'Entrance ticket to Gates of Heaven Lempuyang' },
      { id: 'seed-2', name: 'Avanza MPV Private Car Charter', type: 'Transport', price: 600000, priceType: 'Per car', description: 'Includes driver, petrol, and parking for 10 hours' },
      { id: 'seed-3', name: 'Maya Ubud Resort & Spa (Deluxe Room)', type: 'Hotel', price: 1200000, priceType: 'Per room', description: 'Luxurious resort stay with daily breakfast included' },
      { id: 'seed-4', name: 'Lunch at Bebek Tepi Sawah', type: 'Food', price: 150000, priceType: 'Per person', description: 'Crispy duck set lunch overlooking rice paddies' },
      { id: 'seed-5', name: 'Private Licensed English Tour Guide', type: 'Guide', price: 400000, priceType: 'Per day', description: 'Professional licensed tour guide for full day' },
      { id: 'seed-6', name: 'Traditional Balinese Barong Dance Ticket', type: 'Ticket', price: 150000, priceType: 'Per person', description: 'Cultural dance show entry ticket in Batubulan' }
    ];

    let unsubscribe = () => {};
    try {
      const invRef = collection(db, 'inventory_items');
      unsubscribe = onSnapshot(invRef, (snapshot) => {
        if (!snapshot || snapshot.empty) {
          console.log("[ProposalGenerator]: No inventory in DB, using default seed catalog...");
          setInventoryList(defaultSeedItems);
          setLoadingInventory(false);

          // Background seed attempt
          (async () => {
            try {
              for (const item of defaultSeedItems) {
                const { id, ...data } = item;
                await addDoc(collection(db, 'inventory_items'), {
                  ...data,
                  createdAt: serverTimestamp()
                });
              }
            } catch (e) {
              console.warn("Background seed ignored:", e);
            }
          })();
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
        console.error("Error loading inventory items, falling back to default seed:", err);
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
    if (!editingInventoryItem?.name?.trim() || !editingInventoryItem?.price) {
      alert("Please provide name and price.");
      return;
    }

    setIsSavingInventory(true);
    try {
      const data = {
        name: editingInventoryItem.name.trim(),
        type: editingInventoryItem.type || 'Ticket',
        price: Number(editingInventoryItem.price) || 0,
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

  // Add Item to Itinerary Line Items
  const handleAddSelectedInventoryToProposal = () => {
    if (!selectedInventoryIdToAdd) return;
    const inv = inventoryList.find(i => i.id === selectedInventoryIdToAdd);
    if (!inv) return;

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
      day: itemDayToAdd
    };

    setSelectedLineItems(prev => [...prev, newLineItem]);
    setSelectedInventoryIdToAdd('');
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
        selectedItems: selectedLineItems,
        welcomeMessage: proposalData.welcomeMessage || `Dear ${guestName}, thank you for choosing us!`,
        itineraryNarrative: proposalData.itineraryNarrative || [],
        inclusions: proposalData.inclusions || [],
        exclusions: proposalData.exclusions || [],
        importantTips: proposalData.importantTips || [],
        closingNotes: proposalData.closingNotes || "We look forward to hosting you!",
        status: 'Draft'
      };

      setGeneratedProposal(fullProposalObj);
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

    let text = `✨ *OFFICIAL TOUR & LOGISTICS PROPOSAL* ✨\n\n`;
    text += `Dear *${p.guestName}*,\n${p.welcomeMessage}\n\n`;
    text += `📌 *Trip Summary:*\n`;
    text += `• Pax: ${p.paxCount} Person(s)\n`;
    text += `• Duration: ${p.durationDays} Day(s)\n`;
    text += `• Nationality: ${p.nationality || 'International'}\n\n`;

    text += `🗓️ *ITINERARY HIGHLIGHTS:*\n`;
    p.itineraryNarrative.forEach(day => {
      text += `*Day ${day.dayNumber}: ${day.title}*\n${day.summary}\n`;
    });

    text += `\n💰 *Total Investment:* ${p.currency} ${Number(p.totalPrice).toLocaleString()} (All-Inclusive)\n\n`;
    text += `Please reply to this message or contact us to confirm your booking! 🌴`;

    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  const getCategoryBadgeClass = (type?: string) => {
    const safeType = (type || 'extra').toLowerCase();
    switch (safeType) {
      case 'ticket': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'transport': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'hotel': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'food': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'guide': return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      default: return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20';
    }
  };

  const getCategoryIcon = (type?: string) => {
    const safeType = (type || 'extra').toLowerCase();
    switch (safeType) {
      case 'ticket': return <TicketIcon className="w-3.5 h-3.5" />;
      case 'transport': return <Car className="w-3.5 h-3.5" />;
      case 'hotel': return <Building2 className="w-3.5 h-3.5" />;
      case 'food': return <Utensils className="w-3.5 h-3.5" />;
      case 'guide': return <User className="w-3.5 h-3.5" />;
      default: return <Package className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className={`p-6 md:p-8 rounded-3xl border shadow-sm relative overflow-hidden transition-all ${
        isDarkMode ? 'bg-[#111928] border-slate-800 text-white' : 'bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border-gray-150 text-gray-900'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-1.5">
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span>Smart Tour & Logistics Quotation Engine</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Proposal Generator & Inventory Pricing
            </h1>
            <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
              Create custom inventory price items (tickets, transport, hotels, food), calculate margin markups, and let AI build gorgeous client proposals in seconds.
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center p-1.5 rounded-2xl bg-gray-100 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shrink-0 self-start md:self-auto">
            <button
              onClick={() => setActiveSubTab('create')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                activeSubTab === 'create'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>Create Proposal</span>
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
              <span>Saved Proposals ({savedProposals.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: CREATE PROPOSAL */}
      {activeSubTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Guest Details & Inventory Picker Form (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Guest Information */}
            <div className={`p-6 rounded-3xl border shadow-sm space-y-4 ${
              isDarkMode ? 'bg-[#111928] border-slate-800' : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center space-x-2 border-b border-gray-200/20 pb-3">
                <div className="p-2 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-xl font-bold text-xs">
                  01
                </div>
                <h3 className={`text-sm font-extrabold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Guest & Lead Information
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Guest Full Name *
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
                    Email Address
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
                    Phone / WhatsApp Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="+61 412 345 678"
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
                      placeholder="e.g. Australia, USA, Germany..."
                      value={nationality}
                      onChange={(e) => setNationality(e.target.value)}
                      className={`w-full pl-9 pr-3.5 py-2.5 text-xs font-bold rounded-xl border focus:outline-none focus:ring-2 focus:ring-orange-500/30 ${
                        isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-gray-200 text-gray-900'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Number of Guests (Pax)
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      min={1}
                      value={paxCount}
                      onChange={(e) => setPaxCount(Number(e.target.value))}
                      className={`w-full pl-9 pr-3.5 py-2.5 text-xs font-bold rounded-xl border focus:outline-none focus:ring-2 focus:ring-orange-500/30 ${
                        isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-gray-200 text-gray-900'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Trip Duration (Days)
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      min={1}
                      value={durationDays}
                      onChange={(e) => setDurationDays(Number(e.target.value))}
                      className={`w-full pl-9 pr-3.5 py-2.5 text-xs font-bold rounded-xl border focus:outline-none focus:ring-2 focus:ring-orange-500/30 ${
                        isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-gray-200 text-gray-900'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Select Inventory Items for the Itinerary */}
            <div className={`p-6 rounded-3xl border shadow-sm space-y-4 ${
              isDarkMode ? 'bg-[#111928] border-slate-800' : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center justify-between border-b border-gray-200/20 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-xl font-bold text-xs">
                    02
                  </div>
                  <h3 className={`text-sm font-extrabold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Select Inventory & Logistics Items
                  </h3>
                </div>

                <button
                  onClick={() => setActiveSubTab('inventory')}
                  className="text-xs font-bold text-orange-600 hover:underline flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Manage Catalog</span>
                </button>
              </div>

              {/* Add Item Control */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-900/60 border border-gray-200/60 dark:border-slate-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-7">
                    <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                      Pick From Inventory Catalog
                    </label>
                    <select
                      value={selectedInventoryIdToAdd}
                      onChange={(e) => setSelectedInventoryIdToAdd(e.target.value)}
                      className={`w-full px-3 py-2 text-xs font-semibold rounded-xl border focus:outline-none cursor-pointer ${
                        isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-200 text-gray-900'
                      }`}
                    >
                      <option value="">-- Choose item (Tickets, Hotels, Transport...) --</option>
                      {inventoryList.map(item => (
                        <option key={item.id} value={item.id}>
                          [{item.type}] {item.name} - {currency} {item.price.toLocaleString()} ({item.priceType})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                      Day #
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={durationDays}
                      value={itemDayToAdd}
                      onChange={(e) => setItemDayToAdd(Number(e.target.value))}
                      className={`w-full px-3 py-2 text-xs font-bold rounded-xl border focus:outline-none ${
                        isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-200 text-gray-900'
                      }`}
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <button
                      type="button"
                      onClick={handleAddSelectedInventoryToProposal}
                      disabled={!selectedInventoryIdToAdd}
                      className="w-full py-2 px-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Item</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Added Line Items Table */}
              {selectedLineItems.length === 0 ? (
                <div className="py-8 text-center border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-2xl">
                  <Package className="w-8 h-8 text-gray-400 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400">No inventory items added to proposal yet</p>
                  <p className="text-[11px] text-gray-400 mt-1">Select items above to construct the itinerary pricing.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200/20 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                          <th className="py-2 px-2">Day</th>
                          <th className="py-2 px-2">Item & Category</th>
                          <th className="py-2 px-2">Price / Unit</th>
                          <th className="py-2 px-2 w-20">Qty</th>
                          <th className="py-2 px-2 text-right">Subtotal</th>
                          <th className="py-2 px-2 w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200/10 text-xs">
                        {selectedLineItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-500/5 transition-colors">
                            <td className="py-2.5 px-2 font-black text-orange-600 dark:text-orange-400">
                              Day {item.day || 1}
                            </td>
                            <td className="py-2.5 px-2 font-extrabold text-gray-900 dark:text-white">
                              <div>{item.name}</div>
                              <span className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold border mt-0.5 ${getCategoryBadgeClass(item.type)}`}>
                                {getCategoryIcon(item.type)}
                                <span>{item.type}</span>
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-gray-600 dark:text-gray-300 font-medium">
                              {currency} {item.price.toLocaleString()} <span className="text-[10px] text-gray-400">({item.priceType})</span>
                            </td>
                            <td className="py-2.5 px-2">
                              <input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) => handleUpdateLineItemQty(idx, Number(e.target.value))}
                                className={`w-16 px-2 py-1 text-xs font-bold rounded-lg border focus:outline-none ${
                                  isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-100 border-gray-200 text-gray-900'
                                }`}
                              />
                            </td>
                            <td className="py-2.5 px-2 text-right font-black text-gray-900 dark:text-white">
                              {currency} {item.subtotal.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveLineItem(idx)}
                                className="p-1 text-gray-400 hover:text-rose-500 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Profit Margin & Final Settings */}
            <div className={`p-6 rounded-3xl border shadow-sm space-y-4 ${
              isDarkMode ? 'bg-[#111928] border-slate-800' : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center space-x-2 border-b border-gray-200/20 pb-3">
                <div className="p-2 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-xl font-bold text-xs">
                  03
                </div>
                <h3 className={`text-sm font-extrabold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Margin Markup & Special Notes
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Margin Percentage (%) *
                  </label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      min={0}
                      max={200}
                      value={marginPercentage}
                      onChange={(e) => setMarginPercentage(Number(e.target.value))}
                      className={`w-full pl-9 pr-3.5 py-2.5 text-xs font-black text-orange-600 dark:text-orange-400 rounded-xl border focus:outline-none focus:ring-2 focus:ring-orange-500/30 ${
                        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-gray-200'
                      }`}
                    />
                  </div>
                  <p className="text-[10px] font-medium text-gray-400 mt-1">Operator margin profit added on top of base logistics costs.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Currency Symbol
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border focus:outline-none cursor-pointer ${
                      isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-gray-200 text-gray-900'
                    }`}
                  >
                    <option value="IDR">IDR (Rupiah)</option>
                    <option value="USD">USD ($)</option>
                    <option value="AUD">AUD (A$)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="SGD">SGD (S$)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Special Notes / Guest Preferences (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Vegetarian meal options requested, guest prefers early morning tours..."
                    value={specialNotes}
                    onChange={(e) => setSpecialNotes(e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border focus:outline-none ${
                      isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-gray-200 text-gray-900'
                    }`}
                  />
                </div>
              </div>

              {/* Generate AI Proposal Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleGenerateAIProposal}
                  disabled={isGeneratingAI || !guestName.trim() || selectedLineItems.length === 0}
                  className="w-full py-4 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white text-sm font-black rounded-2xl shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  {isGeneratingAI ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Synthesizing AI Tour Proposal...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span>Generate AI Tour Proposal</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Live Price Summary & AI Generated Proposal Preview (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Live Pricing Breakdown Card */}
            <div className={`p-6 rounded-3xl border shadow-md space-y-4 ${
              isDarkMode ? 'bg-[#111928] border-slate-800' : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center justify-between border-b border-gray-200/20 pb-3">
                <div className="flex items-center space-x-2">
                  <Calculator className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <h3 className={`text-sm font-extrabold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Live Proposal Pricing Breakdown
                  </h3>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-orange-500/10 text-orange-600">
                  {currency}
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Base Inventory Cost:</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {currency} {baseSubtotal.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">
                    Operator Margin (+{marginPercentage}%):
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    + {currency} {marginAmount.toLocaleString()}
                  </span>
                </div>

                <div className="border-t border-dashed border-gray-200 dark:border-slate-800 pt-3 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-gray-900 dark:text-white block">
                      Final Proposal Price
                    </span>
                    <span className="text-[10px] text-gray-400">All taxes & fees included</span>
                  </div>
                  <span className="text-xl font-black text-orange-600 dark:text-orange-400">
                    {currency} {totalPrice.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Generated Proposal Preview Screen */}
            {generatedProposal ? (
              <div className={`p-6 md:p-8 rounded-3xl border shadow-xl space-y-6 animate-fadeIn ${
                isDarkMode ? 'bg-[#0f172a] border-slate-800 text-white' : 'bg-white border-gray-200 text-gray-900'
              }`}>
                {/* Proposal Header Banner */}
                <div className="border-b border-gray-200/20 pb-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
                      Official Tour Proposal
                    </span>
                    <span className="text-xs font-bold text-gray-400">
                      {new Date().toLocaleDateString()}
                    </span>
                  </div>

                  <h2 className="text-xl font-black text-gray-900 dark:text-white leading-tight">
                    {generatedProposal.proposalTitle}
                  </h2>

                  <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-gray-50 dark:bg-slate-900 text-xs font-semibold">
                    <div><span className="text-gray-400">Guest:</span> {generatedProposal.guestName}</div>
                    <div><span className="text-gray-400">Pax:</span> {generatedProposal.paxCount} Person(s)</div>
                    <div><span className="text-gray-400">Duration:</span> {generatedProposal.durationDays} Day(s)</div>
                    <div><span className="text-gray-400">Origin:</span> {generatedProposal.nationality || 'Guest'}</div>
                  </div>
                </div>

                {/* Welcome Message */}
                <div className="p-4 rounded-2xl bg-orange-500/5 border border-orange-500/15 text-xs text-gray-700 dark:text-gray-300 leading-relaxed italic">
                  "{generatedProposal.welcomeMessage}"
                </div>

                {/* Day-by-Day Itinerary Narrative */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">
                    Day-by-Day Customized Itinerary
                  </h3>

                  <div className="space-y-3">
                    {generatedProposal.itineraryNarrative.map((day, dIdx) => (
                      <div key={dIdx} className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-900/80 border border-gray-200/60 dark:border-slate-800 space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded-lg bg-orange-600 text-white text-[10px] font-black">
                            Day {day.dayNumber}
                          </span>
                          <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                            {day.title}
                          </h4>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                          {day.summary}
                        </p>
                        {day.activities && day.activities.length > 0 && (
                          <ul className="space-y-1 pt-1">
                            {day.activities.map((act, aIdx) => (
                              <li key={aIdx} className="text-[11px] text-gray-500 dark:text-gray-400 flex items-start space-x-1.5">
                                <span className="text-orange-500 font-bold">•</span>
                                <span>{act}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Included Services Checklist */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 space-y-2">
                    <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Inclusions</span>
                    </h4>
                    <ul className="space-y-1 text-[11px] text-gray-600 dark:text-gray-300">
                      {generatedProposal.inclusions.map((inc, i) => (
                        <li key={i}>✓ {inc}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/15 space-y-2">
                    <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center space-x-1">
                      <X className="w-3.5 h-3.5" />
                      <span>Exclusions</span>
                    </h4>
                    <ul className="space-y-1 text-[11px] text-gray-600 dark:text-gray-300">
                      {generatedProposal.exclusions.map((exc, e) => (
                        <li key={e}>✕ {exc}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Total Cost Display */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 text-white flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-100 block">Total Investment Package</span>
                    <span className="text-xs text-orange-100">All-Inclusive Tax & Service Included</span>
                  </div>
                  <span className="text-2xl font-black">
                    {generatedProposal.currency} {Number(generatedProposal.totalPrice).toLocaleString()}
                  </span>
                </div>

                {/* Action Buttons Bar */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    onClick={handleCopyWhatsAppMessage}
                    className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm"
                  >
                    {copySuccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copySuccess ? "Copied WA Text!" : "Copy WhatsApp Quote"}</span>
                  </button>

                  <button
                    onClick={handleSaveProposalToDb}
                    disabled={isSavingProposal}
                    className="flex-1 py-2.5 px-3 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm"
                  >
                    {isSavingProposal ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    <span>Save to History</span>
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print PDF</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className={`p-8 rounded-3xl border text-center space-y-3 ${
                isDarkMode ? 'bg-[#111928] border-slate-800' : 'bg-white border-gray-200'
              }`}>
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-extrabold text-gray-900 dark:text-white">
                  Proposal Preview Workspace
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto leading-relaxed">
                  Fill in guest details, add items from your inventory, set your profit margin, and click <strong className="text-orange-600 dark:text-orange-400">Generate AI Tour Proposal</strong>.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: INVENTORY CATALOG MANAGER */}
      {activeSubTab === 'inventory' && (
        <div className="space-y-6">
          <div className={`p-6 rounded-3xl border shadow-sm space-y-4 ${
            isDarkMode ? 'bg-[#111928] border-slate-800' : 'bg-white border-gray-200'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/20 pb-4">
              <div>
                <h3 className={`text-base font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Inventory & Logistics Pricing Catalog
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Manage base costs for tickets, transport charters, hotels, dining, and guides.
                </p>
              </div>

              <button
                onClick={handleOpenAddInventory}
                className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Inventory Item</span>
              </button>
            </div>

            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search inventory items by name..."
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  className={`w-full pl-9 pr-3.5 py-2 text-xs font-medium rounded-xl border focus:outline-none ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-gray-200 text-gray-900'
                  }`}
                />
              </div>

              <select
                value={inventoryCategoryFilter}
                onChange={(e) => setInventoryCategoryFilter(e.target.value)}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border focus:outline-none cursor-pointer ${
                  isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-gray-200 text-gray-900'
                }`}
              >
                <option value="all">All Categories</option>
                <option value="ticket">Ticket</option>
                <option value="transport">Transport</option>
                <option value="hotel">Hotel</option>
                <option value="food">Food</option>
                <option value="guide">Guide</option>
                <option value="extra">Extra</option>
              </select>
            </div>

            {/* Inventory Items List */}
            {loadingInventory ? (
              <div className="py-12 text-center text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p className="text-xs font-bold">Loading Inventory Items...</p>
              </div>
            ) : filteredInventory.length === 0 ? (
              <div className="py-12 text-center text-gray-400 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-2xl">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-bold">No inventory items found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredInventory.map(item => (
                  <div key={item.id} className={`p-5 rounded-2xl border transition-all space-y-3 ${
                    isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50/80 border-gray-200'
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${getCategoryBadgeClass(item.type)}`}>
                        {getCategoryIcon(item.type)}
                        <span>{item.type}</span>
                      </span>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleEditInventory(item)}
                          className="p-1.5 text-gray-400 hover:text-orange-500 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteInventory(item.id)}
                          className="p-1.5 text-gray-400 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-black text-gray-900 dark:text-white leading-tight">
                        {item.name}
                      </h4>
                      {item.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="border-t border-gray-200/20 pt-2.5 flex items-center justify-between">
                      <span className="text-[11px] text-gray-400 font-medium">Unit: {item.priceType}</span>
                      <span className="text-sm font-black text-orange-600 dark:text-orange-400">
                        {currency} {item.price.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: SAVED PROPOSALS HISTORY */}
      {activeSubTab === 'history' && (
        <div className="space-y-6">
          <div className={`p-6 rounded-3xl border shadow-sm space-y-4 ${
            isDarkMode ? 'bg-[#111928] border-slate-800' : 'bg-white border-gray-200'
          }`}>
            <h3 className={`text-base font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Saved Client Proposals History
            </h3>

            {savedProposals.length === 0 ? (
              <div className="py-12 text-center text-gray-400 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-2xl">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-bold">No saved proposals yet.</p>
                <p className="text-[11px] text-gray-400 mt-1">Generate a proposal and click "Save to History".</p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedProposals.map(prop => (
                  <div key={prop.id} className={`p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-gray-200'
                  }`}>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-600 text-[10px] font-black uppercase">
                          {prop.currency} {Number(prop.totalPrice).toLocaleString()}
                        </span>
                        <span className="text-xs font-extrabold text-gray-900 dark:text-white">
                          {prop.proposalTitle}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Guest: <strong className="text-gray-700 dark:text-gray-300">{prop.guestName}</strong> ({prop.paxCount} pax, {prop.durationDays} days) | Email: {prop.email || 'N/A'}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setGeneratedProposal(prop);
                        setActiveSubTab('create');
                      }}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition-all self-start md:self-auto cursor-pointer"
                    >
                      View & Print Proposal
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* EDIT/CREATE INVENTORY MODAL */}
      {isInventoryModalOpen && editingInventoryItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setIsInventoryModalOpen(false)} />
          <div className={`relative w-full max-w-lg rounded-3xl border shadow-2xl p-6 space-y-5 my-8 ${
            isDarkMode ? 'bg-[#111928] border-slate-800 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="flex items-center justify-between border-b border-gray-200/20 pb-3">
              <h3 className="text-base font-black">
                {editingInventoryItem.id ? 'Edit Inventory Item' : 'Add New Inventory Item'}
              </h3>
              <button onClick={() => setIsInventoryModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Item Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Lempuyang Temple Entrance Ticket"
                  value={editingInventoryItem.name || ''}
                  onChange={(e) => setEditingInventoryItem({ ...editingInventoryItem, name: e.target.value })}
                  className={`w-full px-3.5 py-2.5 font-bold rounded-xl border focus:outline-none ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-gray-200 text-gray-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Category / Type</label>
                  <select
                    value={editingInventoryItem.type || 'Ticket'}
                    onChange={(e) => setEditingInventoryItem({ ...editingInventoryItem, type: e.target.value })}
                    className={`w-full px-3 py-2.5 font-semibold rounded-xl border focus:outline-none cursor-pointer ${
                      isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-gray-200 text-gray-900'
                    }`}
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
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Unit / Pricing Type</label>
                  <select
                    value={editingInventoryItem.priceType || 'Per person'}
                    onChange={(e) => setEditingInventoryItem({ ...editingInventoryItem, priceType: e.target.value })}
                    className={`w-full px-3 py-2.5 font-semibold rounded-xl border focus:outline-none cursor-pointer ${
                      isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-gray-200 text-gray-900'
                    }`}
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
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Base Price Cost ({currency}) *</label>
                <input
                  type="number"
                  placeholder="100000"
                  value={editingInventoryItem.price || ''}
                  onChange={(e) => setEditingInventoryItem({ ...editingInventoryItem, price: Number(e.target.value) })}
                  className={`w-full px-3.5 py-2.5 font-black text-orange-600 dark:text-orange-400 rounded-xl border focus:outline-none ${
                    isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-gray-200'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Description / Inclusions (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Brief description for AI context..."
                  value={editingInventoryItem.description || ''}
                  onChange={(e) => setEditingInventoryItem({ ...editingInventoryItem, description: e.target.value })}
                  className={`w-full px-3.5 py-2 font-medium rounded-xl border focus:outline-none ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-gray-200 text-gray-900'
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 border-t border-gray-200/20 pt-4">
              <button
                type="button"
                onClick={() => setIsInventoryModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveInventoryItem}
                disabled={isSavingInventory}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-md transition-all flex items-center space-x-1 cursor-pointer"
              >
                {isSavingInventory ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Save Inventory</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
