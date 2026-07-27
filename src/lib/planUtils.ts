export function formatPlanName(planInput?: string, packagesList: any[] = [], intervalInput?: string): string {
  if (!planInput && !intervalInput) return 'Starter Monthly';

  const raw = (planInput || '').trim();
  const lower = raw.toLowerCase();

  // 1. Determine Interval Label
  let intervalLabel = '';
  if (intervalInput) {
    const rawInt = intervalInput.trim().toLowerCase();
    if (rawInt === 'annual' || rawInt === 'annually' || rawInt === 'yearly') intervalLabel = 'Annual';
    else if (rawInt === 'lifetime') intervalLabel = 'Lifetime';
    else intervalLabel = 'Monthly';
  } else {
    if (lower.includes('lifetime')) intervalLabel = 'Lifetime';
    else if (lower.includes('annual') || lower.includes('yearly') || lower.includes('annually')) intervalLabel = 'Annual';
    else intervalLabel = 'Monthly';
  }

  // 2. Direct match in packagesList
  let matchedName = '';
  if (packagesList && packagesList.length > 0 && raw) {
    const matched = packagesList.find(p =>
      p.id === raw ||
      p.slug?.toLowerCase() === lower ||
      p.productId === raw ||
      p.creemProductId === raw ||
      p.creem_product_id === raw ||
      (p.name && p.name.toLowerCase() === lower)
    );
    if (matched && matched.name) {
      matchedName = matched.name;
    }
  }

  let baseName = matchedName || raw;

  // Clean base name by removing trailing/embedded interval words and "plan"
  baseName = baseName
    .replace(/\s*[\(\-_]?\s*(plan|monthly|annual|annually|yearly|lifetime)[\)\-_]?\s*/gi, '')
    .trim();

  if (!baseName) {
    if (lower.includes('starter')) baseName = 'Starter';
    else if (lower.includes('professional') || lower.includes('pro')) baseName = 'Professional';
    else if (lower.includes('business')) baseName = 'Business';
    else if (lower.includes('agency') || lower.includes('enterprise')) baseName = 'Agency';
    else if (raw) baseName = raw.charAt(0).toUpperCase() + raw.slice(1);
    else baseName = 'Starter';
  } else {
    baseName = baseName
      .split(/[\s\-_]+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  if (baseName.toLowerCase().endsWith(intervalLabel.toLowerCase())) {
    return baseName;
  }

  return `${baseName} ${intervalLabel}`;
}

export function getPlanPrice(planInput?: string, interval: string = 'monthly', packagesList: any[] = []): number {
  if (!planInput) return 49;
  const raw = planInput.trim();
  const lower = raw.toLowerCase();

  const normInterval = (interval || 'monthly').toLowerCase();
  const isAnnual = normInterval === 'annual' || normInterval === 'annually' || normInterval === 'yearly';
  const isLifetime = normInterval === 'lifetime';
  const targetIntervalStr = isLifetime ? 'lifetime' : isAnnual ? 'annual' : 'monthly';

  if (packagesList && packagesList.length > 0) {
    // 1. Direct match by ID, slug, or productId / creemProductId
    const matchedDirect = packagesList.find(p =>
      p.id === raw ||
      p.slug?.toLowerCase() === lower ||
      p.productId === raw ||
      p.creemProductId === raw ||
      p.creem_product_id === raw
    );
    if (matchedDirect && typeof matchedDirect.price === 'number') {
      return matchedDirect.price;
    }

    // 2. Clean base match + interval match
    const cleanBase = lower
      .replace(/\s*[\(\-_]?\s*(plan|monthly|annual|annually|yearly|lifetime)[\)\-_]?\s*/gi, '')
      .trim();

    const matchedExact = packagesList.find(p =>
      cleanBase &&
      (p.slug?.toLowerCase().includes(cleanBase) || p.name?.toLowerCase().includes(cleanBase)) &&
      (p.interval || 'monthly').toLowerCase() === targetIntervalStr
    );
    if (matchedExact && typeof matchedExact.price === 'number') {
      return matchedExact.price;
    }

    // 3. Any match by cleanBase
    const matchedBase = packagesList.find(p =>
      cleanBase &&
      (p.slug?.toLowerCase().includes(cleanBase) || p.name?.toLowerCase().includes(cleanBase))
    );
    if (matchedBase && typeof matchedBase.price === 'number') {
      return matchedBase.price;
    }
  }

  // Fallback defaults
  const cleanBase = lower
    .replace(/\s*[\(\-_]?\s*(plan|monthly|annual|annually|yearly|lifetime)[\)\-_]?\s*/gi, '')
    .trim();

  if (cleanBase.includes('enterprise') || cleanBase.includes('agency')) {
    return isLifetime ? 2499 : isAnnual ? 4990 : 499;
  }
  if (cleanBase.includes('business')) {
    return isLifetime ? 1999 : isAnnual ? 999 : 199;
  }
  if (cleanBase.includes('professional') || cleanBase.includes('pro')) {
    return isLifetime ? 999 : isAnnual ? 499 : 99;
  }
  return isLifetime ? 499 : isAnnual ? 199 : 49;
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
