import axios from 'axios';

const CREEM_LIVE_URL = 'https://api.creem.io/v1/checkouts';
const CREEM_TEST_URL = 'https://test-api.creem.io/v1/checkouts';

export async function createCreemCheckoutSession(params: {
  productId: string;
  successUrl: string;
  email: string;
  tenantId: string;
}) {
  // If running in browser, call the Vercel serverless function to avoid CORS
  if (typeof window !== 'undefined') {
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create checkout session via proxy');
    return data;
  }

  // Server-side logic (Vercel Node.js environment)
  const rawApiKey = typeof process !== 'undefined' ? (process as any).env?.CREEM_API_KEY || (process as any).env?.VITE_CREEM_API_KEY : '';
  const apiKey = typeof rawApiKey === 'string' ? rawApiKey.trim() : '';

  const isFallback = !apiKey || 
    apiKey.toLowerCase().includes('placeholder') || 
    apiKey.toLowerCase().includes('your_') ||
    apiKey === '';

  if (isFallback) {
    console.log(`[Creem Service] No valid CREEM_API_KEY configured. Falling back to Sandbox Mock Checkout.`);
    const mockUrl = `/api/billing/mock-checkout?productId=${encodeURIComponent(params.productId)}&tenantId=${encodeURIComponent(params.tenantId)}&email=${encodeURIComponent(params.email)}&successUrl=${encodeURIComponent(params.successUrl)}`;
    return {
      checkout_url: mockUrl,
      url: mockUrl
    };
  }

  const rawMode = typeof process !== 'undefined' ? (process as any).env?.CREEM_MODE || (process as any).env?.VITE_CREEM_MODE : '';
  const isLive = rawMode === 'live';
  const url = isLive ? CREEM_LIVE_URL : CREEM_TEST_URL;

  const payload = {
    product_id: params.productId,
    success_url: params.successUrl,
    metadata: {
      tenantId: params.tenantId,
      email: params.email
    }
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      }
    });
    return response.data;
  } catch (error: any) {
    const errorDetails = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    throw new Error(`Creem.io Checkout Error: ${errorDetails}`);
  }
}

export async function moderateCreemContent(text: string) {
  // If running in browser, proxy through the backend
  if (typeof window !== 'undefined') {
    const res = await fetch('/api/billing/moderate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to moderate content');
    return data;
  }

  const rawApiKey = typeof process !== 'undefined' ? (process as any).env?.CREEM_API_KEY || (process as any).env?.VITE_CREEM_API_KEY : '';
  const apiKey = typeof rawApiKey === 'string' ? rawApiKey.trim() : '';

  if (!apiKey || apiKey.toLowerCase().includes('placeholder')) {
    // If no API key, assume valid to prevent blocking dev
    return { status: 'approved' };
  }

  const rawMode = typeof process !== 'undefined' ? (process as any).env?.CREEM_MODE || (process as any).env?.VITE_CREEM_MODE : '';
  const isLive = rawMode === 'live';
  const url = isLive ? 'https://api.creem.io/v1/moderations' : 'https://test-api.creem.io/v1/moderations';

  try {
    const response = await axios.post(url, { text }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      }
    });
    // Check if the content is flagged
    if (response.data && response.data.status === 'rejected') {
       throw new Error('Content violates safety guidelines.');
    }
    return response.data;
  } catch (error: any) {
    const errorDetails = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    throw new Error(`Creem.io Moderation Error: ${errorDetails}`);
  }
}

