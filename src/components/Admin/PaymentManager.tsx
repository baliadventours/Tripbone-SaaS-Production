import React, { useState, useEffect, FormEvent } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc } from '../../lib/firebase';
import { PaymentSettings } from '../../types';
import { 
  CreditCard, Wallet, Database, DollarSign, Save, Loader2, Info, Star, Check, 
  ShieldCheck, ExternalLink, Zap, AlertCircle, Copy, Key, QrCode, Building, CheckCircle2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getActiveTenantId } from '../../lib/firebase';

export default function PaymentManager() {
  const [settings, setSettings] = useState<PaymentSettings>({
    // PayPal
    isPaypalEnabled: true,
    paypalMode: 'sandbox',
    paypalClientId: '',
    paypalSecret: '',
    paypalSandboxClientId: '',
    paypalSandboxSecret: '',
    creditCardEnabled: true,

    // Stripe
    isStripeEnabled: false,
    stripeMode: 'test',
    stripePublishableKey: '',
    stripeSecretKey: '',
    stripeTestPublishableKey: '',
    stripeTestSecretKey: '',
    stripeWebhookSecret: '',

    // Midtrans
    isMidtransEnabled: false,
    midtransEnvironment: 'sandbox',
    midtransMerchantId: '',
    midtransClientKey: '',
    midtransServerKey: '',
    midtransPaymentMethods: ['qris', 'gopay', 'bca_va', 'mandiri_va', 'credit_card'],

    // Bank Transfer
    isBankTransferEnabled: true,
    bankName: 'Bank Central Asia (BCA)',
    accountNumber: '1234567890',
    accountHolder: 'PT Bali Tourism Operator',
    swiftCode: 'CENAIDJA',
    bankInstructions: 'Please specify your Booking ID as the reference in bank transfer.',

    // Pay on Arrival
    isPayOnArrivalEnabled: true,
    payOnArrivalInstructions: 'You can pay cash directly to your tour guide upon arrival.'
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'stripe' | 'midtrans' | 'paypal' | 'bank' | 'arrival'>('stripe');
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const activeTenantId = getActiveTenantId();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'payment_' + (activeTenantId || 'global'));
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(prev => ({ ...prev, ...docSnap.data() }));
        }
      } catch (err) {
        console.error("Error fetching payment settings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [activeTenantId]);

  const handleSave = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSaveMessage(null);
    try {
      await setDoc(doc(db, 'settings', 'payment_' + (activeTenantId || 'global')), settings);
      setSaveMessage({ type: 'success', text: 'Payment Gateway configurations saved successfully!' });
      setTimeout(() => setSaveMessage(null), 4000);
    } catch (err: any) {
      console.error("Error saving payment settings:", err);
      setSaveMessage({ type: 'error', text: err.message || 'Failed to save configuration. Check permissions.' });
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-gray-400 font-bold text-xs tracking-widest uppercase">Loading encrypted payment configurations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <CreditCard className="w-7 h-7 text-primary" /> Payment Settings & Gateways
          </h2>
          <p className="text-xs text-gray-500 font-medium mt-1">
            Configure Stripe, Midtrans (QRIS/GoPay/Indonesian Banks), PayPal, Manual Bank Transfer, and Pay on Arrival.
          </p>
        </div>
        <button
          onClick={() => handleSave()}
          disabled={saving}
          className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-orange-600 transition-all shadow-lg shadow-orange-100 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Save All Settings</span>
        </button>
      </div>

      {/* Save Status Alert */}
      {saveMessage && (
        <div className={cn(
          "p-4 rounded-xl border text-xs font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2",
          saveMessage.type === 'success' ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200"
        )}>
          {saveMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
          <span>{saveMessage.text}</span>
        </div>
      )}

      {/* Gateway Selector Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {[
          { id: 'stripe', label: 'Stripe Gateway', icon: CreditCard, enabled: settings.isStripeEnabled, badge: 'International Credit Cards' },
          { id: 'midtrans', label: 'Midtrans Gateway', icon: QrCode, enabled: settings.isMidtransEnabled, badge: 'Indonesia QRIS / E-Wallets' },
          { id: 'paypal', label: 'PayPal Express', icon: Wallet, enabled: settings.isPaypalEnabled, badge: 'Global PayPal' },
          { id: 'bank', label: 'Manual Bank Transfer', icon: Building, enabled: settings.isBankTransferEnabled, badge: 'BCA / Mandiri / SWIFT' },
          { id: 'arrival', label: 'Pay on Arrival', icon: DollarSign, enabled: settings.isPayOnArrivalEnabled, badge: 'Cash Payment' },
        ].map((tab) => {
          const IconComp = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2.5 px-4 py-3 rounded-xl font-bold text-xs transition-all relative border",
                isActive
                  ? "bg-gray-900 text-white border-gray-900 shadow-md"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              )}
            >
              <IconComp className={cn("w-4 h-4", isActive ? "text-primary" : "text-gray-400")} />
              <span>{tab.label}</span>
              <span className={cn(
                "w-2 h-2 rounded-full",
                tab.enabled ? "bg-emerald-500 shadow-xs" : "bg-gray-300"
              )} />
            </button>
          );
        })}
      </div>

      {/* Tab 1: Stripe Payment Gateway */}
      {activeTab === 'stripe' && (
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-8 animate-in fade-in">
          {/* Header Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100 shrink-0">
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-base flex items-center gap-2">
                  Stripe Payment Gateway
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-bold">Recommended</span>
                </h3>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  Accept Visa, Mastercard, American Express, Apple Pay, and Google Pay worldwide.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Environment toggle */}
              <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, stripeMode: 'test' })}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                    settings.stripeMode === 'test' ? "bg-white text-indigo-600 shadow-xs" : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  Test Mode
                </button>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, stripeMode: 'live' })}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                    settings.stripeMode === 'live' ? "bg-indigo-600 text-white shadow-xs" : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  Live Production
                </button>
              </div>

              {/* Toggle switch */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.isStripeEnabled ?? false}
                  onChange={(e) => setSettings({ ...settings, isStripeEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>

          {/* Credentials Inputs */}
          <div className={cn("space-y-6 transition-all", !settings.isStripeEnabled && "opacity-50 pointer-events-none")}>
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-2">
                <Key className="w-4 h-4 text-indigo-600" />
                {settings.stripeMode === 'live' ? 'Stripe Live API Keys (Production)' : 'Stripe Test API Keys (Development)'}
              </h4>
              <a
                href="https://dashboard.stripe.com/apikeys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
              >
                Stripe API Dashboard <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {settings.stripeMode === 'live' ? (
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-600 uppercase tracking-wider">Live Publishable Key (pk_live_...)</label>
                  <input
                    type="text"
                    placeholder="pk_live_..."
                    value={settings.stripePublishableKey || ''}
                    onChange={(e) => setSettings({ ...settings, stripePublishableKey: e.target.value })}
                    className="w-full p-3 font-mono text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-600 uppercase tracking-wider">Live Secret Key (sk_live_...)</label>
                  <input
                    type="password"
                    placeholder="sk_live_..."
                    value={settings.stripeSecretKey || ''}
                    onChange={(e) => setSettings({ ...settings, stripeSecretKey: e.target.value })}
                    className="w-full p-3 font-mono text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-indigo-700 uppercase tracking-wider">Test Publishable Key (pk_test_...)</label>
                  <input
                    type="text"
                    placeholder="pk_test_..."
                    value={settings.stripeTestPublishableKey || ''}
                    onChange={(e) => setSettings({ ...settings, stripeTestPublishableKey: e.target.value })}
                    className="w-full p-3 font-mono text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-indigo-700 uppercase tracking-wider">Test Secret Key (sk_test_...)</label>
                  <input
                    type="password"
                    placeholder="sk_test_..."
                    value={settings.stripeTestSecretKey || ''}
                    onChange={(e) => setSettings({ ...settings, stripeTestSecretKey: e.target.value })}
                    className="w-full p-3 font-mono text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-600 uppercase tracking-wider">Stripe Webhook Signing Secret (Optional whsec_...)</label>
              <input
                type="password"
                placeholder="whsec_..."
                value={settings.stripeWebhookSecret || ''}
                onChange={(e) => setSettings({ ...settings, stripeWebhookSecret: e.target.value })}
                className="w-full p-3 font-mono text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
              />
            </div>

            <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-start gap-3">
              <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div className="text-xs text-indigo-950 leading-relaxed font-medium">
                <p className="font-bold">Webhook Endpoint URL for Stripe Dashboard:</p>
                <code className="text-[11px] bg-white px-2 py-1 rounded border border-indigo-200 font-mono mt-1 block select-all">
                  https://{window.location.host}/api/stripe/webhook
                </code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Midtrans Payment Gateway */}
      {activeTab === 'midtrans' && (
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-8 animate-in fade-in">
          {/* Header Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-red-50/50 rounded-2xl border border-red-100">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-100 shrink-0">
                <QrCode className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-base flex items-center gap-2">
                  Midtrans Payment Gateway
                  <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-bold">Indonesia Standard</span>
                </h3>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  Accept QRIS (GoPay, OVO, ShopeePay, Dana, LinkAja) and Indonesian Virtual Accounts (BCA, Mandiri, BNI, BRI).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Environment toggle */}
              <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, midtransEnvironment: 'sandbox' })}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                    settings.midtransEnvironment === 'sandbox' ? "bg-white text-rose-600 shadow-xs" : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  Sandbox
                </button>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, midtransEnvironment: 'production' })}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                    settings.midtransEnvironment === 'production' ? "bg-rose-600 text-white shadow-xs" : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  Production
                </button>
              </div>

              {/* Toggle switch */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.isMidtransEnabled ?? false}
                  onChange={(e) => setSettings({ ...settings, isMidtransEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
              </label>
            </div>
          </div>

          {/* Credentials */}
          <div className={cn("space-y-6 transition-all", !settings.isMidtransEnabled && "opacity-50 pointer-events-none")}>
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-2">
                <Key className="w-4 h-4 text-rose-600" />
                Midtrans Access Credentials ({settings.midtransEnvironment?.toUpperCase()})
              </h4>
              <a
                href="https://dashboard.midtrans.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-rose-600 hover:underline flex items-center gap-1"
              >
                Midtrans MAP Dashboard <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-wider">Merchant ID</label>
                <input
                  type="text"
                  placeholder="G12345678"
                  value={settings.midtransMerchantId || ''}
                  onChange={(e) => setSettings({ ...settings, midtransMerchantId: e.target.value })}
                  className="w-full p-3 font-mono text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:bg-white outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-wider">Client Key (SB-Mid-client-...)</label>
                <input
                  type="text"
                  placeholder="SB-Mid-client-..."
                  value={settings.midtransClientKey || ''}
                  onChange={(e) => setSettings({ ...settings, midtransClientKey: e.target.value })}
                  className="w-full p-3 font-mono text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:bg-white outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-wider">Server Key (SB-Mid-server-...)</label>
                <input
                  type="password"
                  placeholder="SB-Mid-server-..."
                  value={settings.midtransServerKey || ''}
                  onChange={(e) => setSettings({ ...settings, midtransServerKey: e.target.value })}
                  className="w-full p-3 font-mono text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:bg-white outline-none"
                />
              </div>
            </div>

            {/* Active Payment Methods */}
            <div className="space-y-3 pt-4 border-t border-gray-100">
              <label className="text-[11px] font-black uppercase tracking-wider text-gray-700 block">
                Supported Indonesian Payment Methods:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: 'qris', label: 'QRIS (All E-Wallets)' },
                  { id: 'gopay', label: 'GoPay / GoPay Later' },
                  { id: 'bca_va', label: 'BCA Virtual Account' },
                  { id: 'mandiri_va', label: 'Mandiri Bill / VA' },
                  { id: 'bni_va', label: 'BNI Virtual Account' },
                  { id: 'shopeepay', label: 'ShopeePay' },
                  { id: 'credit_card', label: 'Indonesian Credit Cards' },
                  { id: 'indomaret', label: 'Indomaret / Alfamart' },
                ].map((m) => {
                  const methods = settings.midtransPaymentMethods || [];
                  const isChecked = methods.includes(m.id);
                  return (
                    <label key={m.id} className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...methods, m.id]
                            : methods.filter(id => id !== m.id);
                          setSettings({ ...settings, midtransPaymentMethods: next });
                        }}
                        className="rounded text-rose-600 focus:ring-rose-500"
                      />
                      <span className="text-xs font-bold text-gray-800">{m.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: PayPal Express */}
      {activeTab === 'paypal' && (
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-8 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-orange-50/50 rounded-2xl border border-orange-100">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-100 shrink-0">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-base">PayPal Express Checkout</h3>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  Seamless PayPal button integration on checkout page for global travelers.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, paypalMode: 'sandbox' })}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                    settings.paypalMode === 'sandbox' ? "bg-white text-orange-600 shadow-xs" : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  Sandbox
                </button>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, paypalMode: 'live' })}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                    settings.paypalMode === 'live' ? "bg-orange-500 text-white shadow-xs" : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  Live Mode
                </button>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.isPaypalEnabled}
                  onChange={(e) => setSettings({ ...settings, isPaypalEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
              </label>
            </div>
          </div>

          <div className={cn("space-y-6 transition-all", !settings.isPaypalEnabled && "opacity-50 pointer-events-none")}>
            {settings.paypalMode === 'live' ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-orange-600 uppercase tracking-wider">Live Client ID</label>
                  <input
                    type="text"
                    placeholder="Enter Production Client ID"
                    value={settings.paypalClientId || ''}
                    onChange={(e) => setSettings({ ...settings, paypalClientId: e.target.value })}
                    className="w-full p-3 font-mono text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Live Secret Key (Optional)</label>
                  <input
                    type="password"
                    placeholder="Production Secret Key"
                    value={settings.paypalSecret || ''}
                    onChange={(e) => setSettings({ ...settings, paypalSecret: e.target.value })}
                    className="w-full p-3 font-mono text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-amber-600 uppercase tracking-wider">Sandbox Client ID</label>
                  <input
                    type="text"
                    placeholder="Enter Sandbox Client ID"
                    value={settings.paypalSandboxClientId || ''}
                    onChange={(e) => setSettings({ ...settings, paypalSandboxClientId: e.target.value })}
                    className="w-full p-3 font-mono text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Sandbox Secret Key (Optional)</label>
                  <input
                    type="password"
                    placeholder="Sandbox Secret Key"
                    value={settings.paypalSandboxSecret || ''}
                    onChange={(e) => setSettings({ ...settings, paypalSandboxSecret: e.target.value })}
                    className="w-full p-3 font-mono text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Manual Bank Transfer */}
      {activeTab === 'bank' && (
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-8 animate-in fade-in">
          <div className="flex items-center justify-between p-6 bg-blue-50/50 rounded-2xl border border-blue-100">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-100 shrink-0">
                <Building className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-base">Manual Bank Transfer Details</h3>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  Display bank account numbers and wire instructions to guests for manual transfers.
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.isBankTransferEnabled ?? true}
                onChange={(e) => setSettings({ ...settings, isBankTransferEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-6 transition-all", !settings.isBankTransferEnabled && "opacity-50 pointer-events-none")}>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-700 uppercase">Bank Name</label>
              <input
                type="text"
                placeholder="e.g. Bank Central Asia (BCA)"
                value={settings.bankName || ''}
                onChange={(e) => setSettings({ ...settings, bankName: e.target.value })}
                className="w-full p-3 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-700 uppercase">Account Number</label>
              <input
                type="text"
                placeholder="e.g. 1234567890"
                value={settings.accountNumber || ''}
                onChange={(e) => setSettings({ ...settings, accountNumber: e.target.value })}
                className="w-full p-3 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-700 uppercase">Account Holder Name</label>
              <input
                type="text"
                placeholder="e.g. PT Bali Tour Operator"
                value={settings.accountHolder || ''}
                onChange={(e) => setSettings({ ...settings, accountHolder: e.target.value })}
                className="w-full p-3 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-700 uppercase">SWIFT / BIC Code</label>
              <input
                type="text"
                placeholder="e.g. CENAIDJA"
                value={settings.swiftCode || ''}
                onChange={(e) => setSettings({ ...settings, swiftCode: e.target.value })}
                className="w-full p-3 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[11px] font-bold text-gray-700 uppercase">Payment Instructions for Guests</label>
              <textarea
                rows={3}
                placeholder="Please include your Booking ID as the transfer reference code."
                value={settings.bankInstructions || ''}
                onChange={(e) => setSettings({ ...settings, bankInstructions: e.target.value })}
                className="w-full p-3 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Pay on Arrival */}
      {activeTab === 'arrival' && (
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-8 animate-in fade-in">
          <div className="flex items-center justify-between p-6 bg-emerald-50/50 rounded-2xl border border-emerald-100">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-100 shrink-0">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-base">Pay on Arrival (Cash)</h3>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  Allow guests to reserve tours and pay cash directly to their driver or guide upon pickup.
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.isPayOnArrivalEnabled ?? true}
                onChange={(e) => setSettings({ ...settings, isPayOnArrivalEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <div className={cn("space-y-4 transition-all", !settings.isPayOnArrivalEnabled && "opacity-50 pointer-events-none")}>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-700 uppercase">Instructions shown on Checkout</label>
              <textarea
                rows={3}
                placeholder="You can pay in Cash (IDR / USD) to your guide at the start of your tour."
                value={settings.payOnArrivalInstructions || ''}
                onChange={(e) => setSettings({ ...settings, payOnArrivalInstructions: e.target.value })}
                className="w-full p-3 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
