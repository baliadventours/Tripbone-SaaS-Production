import axios from 'axios';

const CREEM_LIVE_URL = 'https://api.creem.io/v1/checkouts';
const CREEM_TEST_URL = 'https://test-api.creem.io/v1/checkouts';

export async function createCreemCheckoutSession(params: {
  productId: string;
  successUrl: string;
  email: string;
  tenantId: string;
  apiKey?: string;
  mode?: string;
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

  // Server-side logic
  const rawApiKey = params.apiKey || (typeof process !== 'undefined' ? (process as any).env?.CREEM_API_KEY || (process as any).env?.VITE_CREEM_API_KEY : '');
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

  const rawMode = params.mode || (typeof process !== 'undefined' ? (process as any).env?.CREEM_MODE || (process as any).env?.VITE_CREEM_MODE : 'test');
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
    console.error(`[Creem API Error]:`, errorDetails);
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

  const rawMode = typeof process !== 'undefined' ? (process as any).env?.CREEM_MODE || (process as any).env?.VITE_CREEM_MODE : '';
  const isLive = rawMode === 'live';
  const url = isLive ? 'https://api.creem.io/v1/moderations' : 'https://test-api.creem.io/v1/moderations';

  if (!apiKey || apiKey.toLowerCase().includes('placeholder') || apiKey === '') {
    // Basic compliance check fallback if CREEM_API_KEY is not configured
    const lower = text.toLowerCase();
    const prohibitedKeywords = ['hate', 'violence', 'illegal', 'harmful', 'nsfw', 'abuse', 'exploit', 'malware', 'weapon'];
    if (prohibitedKeywords.some(word => lower.includes(word))) {
      throw new Error('Content violates safety guidelines and moderation policy.');
    }
    return { status: 'approved', flagged: false };
  }

  try {
    const response = await axios.post(url, { text }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      timeout: 3000
    });
    // Check if the content is flagged
    if (response.data && (response.data.status === 'rejected' || response.data.flagged === true)) {
      throw new Error('Content violates safety guidelines and moderation policy.');
    }
    return response.data;
  } catch (error: any) {
    if (error.message?.includes('violates') || error.message?.includes('safety guidelines')) {
      throw error;
    }
    // If Creem API fails or endpoint is unavailable, fallback to local keyword check
    console.warn(`[Creem Moderation API Warning]: ${error.message}. Performing local safety check.`);
    const lower = text.toLowerCase();
    const prohibitedKeywords = ['hate', 'violence', 'illegal', 'harmful', 'nsfw', 'abuse', 'exploit', 'malware', 'weapon'];
    if (prohibitedKeywords.some(word => lower.includes(word))) {
      throw new Error('Content violates safety guidelines and moderation policy.');
    }
    return { status: 'approved', flagged: false };
  }
}

