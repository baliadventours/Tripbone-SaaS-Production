export function formatPlanName(planInput?: string, packagesList: any[] = [], intervalInput?: string): string {
  if (!planInput && !intervalInput) return 'Starter Monthly';

  const raw = (planInput || '').trim();
  const lower = raw.toLowerCase();

  // 1. Clean base name by removing trailing/embedded interval words, hyphens, parentheses, and "Plan"
  let baseName = raw
    .replace(/\s*[\(\-_]?\s*(plan|monthly|annual|annually|yearly|lifetime)[\)\-_]?\s*/gi, '')
    .trim();

  // 2. Direct match in packagesList if baseName matches package name/slug
  if (packagesList && packagesList.length > 0 && raw) {
    const matched = packagesList.find(p =>
      p.id === raw ||
      p.slug?.toLowerCase() === raw.toLowerCase() ||
      p.creemProductId === raw ||
      (p.name && p.name.toLowerCase() === raw.toLowerCase())
    );
    if (matched && matched.name) {
      baseName = matched.name.replace(/\s*[\(\-_]?\s*(plan|monthly|annual|annually|yearly|lifetime)[\)\-_]?\s*/gi, '').trim();
    }
  }

  if (!baseName) {
    if (lower.includes('starter')) baseName = 'Starter';
    else if (lower.includes('professional') || lower.includes('pro')) baseName = 'Professional';
    else if (lower.includes('business')) baseName = 'Business';
    else if (lower.includes('agency') || lower.includes('enterprise')) baseName = 'Agency';
    else if (raw) baseName = raw.charAt(0).toUpperCase() + raw.slice(1);
    else baseName = 'Starter';
  } else {
    // Capitalize first letter if it's all lowercase
    if (baseName === baseName.toLowerCase()) {
      baseName = baseName.charAt(0).toUpperCase() + baseName.slice(1);
    }
  }

  // 3. Determine Interval Label
  // Primary priority: explicit intervalInput
  let intervalLabel = '';
  if (intervalInput) {
    const rawInt = intervalInput.trim().toLowerCase();
    if (rawInt === 'annual' || rawInt === 'annually' || rawInt === 'yearly') intervalLabel = 'Annual';
    else if (rawInt === 'lifetime') intervalLabel = 'Lifetime';
    else intervalLabel = 'Monthly';
  } else {
    // Fallback: search in raw plan string
    if (lower.includes('lifetime')) intervalLabel = 'Lifetime';
    else if (lower.includes('annual') || lower.includes('yearly') || lower.includes('annually')) intervalLabel = 'Annual';
    else intervalLabel = 'Monthly';
  }

  return `${baseName} ${intervalLabel}`;
}

export function getPlanPrice(planInput?: string, interval: string = 'monthly', packagesList: any[] = []): number {
  if (!planInput) return 49;
  const raw = planInput.trim();
  const lower = raw.toLowerCase();

  const cleanBase = lower
    .replace(/\s*[\(\-_]?\s*(plan|monthly|annual|annually|yearly|lifetime)[\)\-_]?\s*/gi, '')
    .trim() || 'starter';

  const normInterval = (interval || 'monthly').toLowerCase();
  const isAnnual = normInterval === 'annual' || normInterval === 'annually' || normInterval === 'yearly';
  const isLifetime = normInterval === 'lifetime';
  const targetIntervalStr = isLifetime ? 'lifetime' : isAnnual ? 'annual' : 'monthly';

  if (packagesList && packagesList.length > 0) {
    // Exact match by clean slug + interval
    const matchedExact = packagesList.find(p =>
      (p.slug?.toLowerCase().includes(cleanBase) || p.name?.toLowerCase().includes(cleanBase) || p.id === raw) &&
      (p.interval || 'monthly').toLowerCase() === targetIntervalStr
    );
    if (matchedExact && matchedExact.price !== undefined) {
      return matchedExact.price;
    }

    const matchedAny = packagesList.find(p =>
      p.id === raw ||
      p.slug?.toLowerCase() === lower ||
      p.creemProductId === raw
    );
    if (matchedAny && matchedAny.price !== undefined) {
      return matchedAny.price;
    }
  }

  if (cleanBase.includes('enterprise') || cleanBase.includes('agency')) {
    return isLifetime ? 2499 : isAnnual ? 4990 : 499;
  }
  if (cleanBase.includes('business')) {
    return isLifetime ? 999 : isAnnual ? 1990 : 199;
  }
  if (cleanBase.includes('professional') || cleanBase.includes('pro')) {
    return isLifetime ? 499 : isAnnual ? 990 : 99;
  }
  return isLifetime ? 249 : isAnnual ? 490 : 49;
}

export function getNextBillingDate(tenant: any): string {
  if (!tenant) return 'N/A';
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
    if (billingInterval === 'annual' || billingInterval === 'annually' || billingInterval === 'yearly') {
      nextBilling.setFullYear(nextBilling.getFullYear() + 1);
    } else {
      nextBilling.setMonth(nextBilling.getMonth() + 1);
    }
  }
  
  return nextBilling.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
