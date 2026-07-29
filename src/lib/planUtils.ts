export function getEffectiveInterval(planInput?: string, intervalInput?: string): 'lifetime' | 'annual' | 'monthly' {
  const planLower = (planInput || '').toLowerCase();
  const intLower = (intervalInput || '').toLowerCase();

  if (planLower.includes('lifetime') || intLower === 'lifetime' || intLower.includes('lifetime')) {
    return 'lifetime';
  }
  if (planLower.includes('annual') || planLower.includes('annually') || planLower.includes('yearly') ||
      intLower === 'annual' || intLower === 'annually' || intLower === 'yearly' || intLower.includes('annual') || intLower.includes('yearly')) {
    return 'annual';
  }
  return 'monthly';
}

export function formatPlanName(planInput?: string, packagesList: any[] = [], intervalInput?: string): string {
  if (!planInput && !intervalInput) return 'Starter Monthly';

  const raw = (planInput || '').trim();
  const lower = raw.toLowerCase();

  // Determine effective interval
  const effectiveInterval = getEffectiveInterval(planInput, intervalInput);
  const intervalLabel = effectiveInterval === 'lifetime' ? 'Lifetime' : effectiveInterval === 'annual' ? 'Annual' : 'Monthly';

  // Direct match in packagesList
  let matchedName = '';
  if (packagesList && packagesList.length > 0 && raw) {
    const matched = packagesList.find(p =>
      (p.id === raw ||
      p.slug?.toLowerCase() === lower ||
      p.productId === raw ||
      p.creemProductId === raw ||
      p.creem_product_id === raw ||
      (p.name && p.name.toLowerCase() === lower)) &&
      (p.interval || 'monthly').toLowerCase() === effectiveInterval
    ) || packagesList.find(p =>
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
    .replace(/\b(plan|monthly|annually|annual|yearly|lifetime)\b/gi, '')
    .replace(/[\(\)\-_]+/g, ' ')
    .trim();

  const cleanLower = (baseName || lower).toLowerCase();
  if (cleanLower.includes('starter')) baseName = 'Starter';
  else if (cleanLower.includes('professional') || cleanLower.includes('pro')) baseName = 'Professional';
  else if (cleanLower.includes('business')) baseName = 'Business';
  else if (cleanLower.includes('agency') || cleanLower.includes('enterprise')) baseName = 'Agency';
  else if (!baseName) {
    if (raw) baseName = raw.charAt(0).toUpperCase() + raw.slice(1);
    else baseName = 'Starter';
  } else {
    baseName = baseName
      .split(/[\s\-_]+/)
      .filter(Boolean)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  if (baseName.toLowerCase().endsWith(intervalLabel.toLowerCase())) {
    return baseName;
  }

  return `${baseName} ${intervalLabel}`;
}

export function getPlanPrice(planInput?: string, intervalInput: string = 'monthly', packagesList: any[] = []): number {
  if (!planInput) return 49;
  const raw = planInput.trim();
  const lower = raw.toLowerCase();

  const effectiveInterval = getEffectiveInterval(planInput, intervalInput);
  const isAnnual = effectiveInterval === 'annual';
  const isLifetime = effectiveInterval === 'lifetime';
  const targetIntervalStr = isLifetime ? 'lifetime' : isAnnual ? 'annual' : 'monthly';

  if (packagesList && packagesList.length > 0) {
    // 1. Direct match with matching interval
    const matchedDirectWithInterval = packagesList.find(p =>
      (p.id === raw ||
      p.slug?.toLowerCase() === lower ||
      p.productId === raw ||
      p.creemProductId === raw ||
      p.creem_product_id === raw) &&
      (p.interval || 'monthly').toLowerCase() === targetIntervalStr
    );
    if (matchedDirectWithInterval && typeof matchedDirectWithInterval.price === 'number') {
      return matchedDirectWithInterval.price;
    }

    // 2. Clean base match + interval match
    const cleanBase = lower
      .replace(/\b(plan|monthly|annually|annual|yearly|lifetime)\b/gi, '')
      .replace(/[\(\)\-_]+/g, ' ')
      .trim();

    const matchedExact = packagesList.find(p =>
      cleanBase &&
      (p.slug?.toLowerCase().includes(cleanBase) || p.name?.toLowerCase().includes(cleanBase)) &&
      (p.interval || 'monthly').toLowerCase() === targetIntervalStr
    );
    if (matchedExact && typeof matchedExact.price === 'number') {
      return matchedExact.price;
    }

    // 3. Direct match
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

    // 4. Any match by cleanBase
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
    .replace(/\b(plan|monthly|annually|annual|yearly|lifetime)\b/gi, '')
    .replace(/[\(\)\-_]+/g, ' ')
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
  
  const effectiveInterval = getEffectiveInterval(tenant.plan, tenant.billingInterval);
  if (effectiveInterval === 'lifetime') return 'Never (Lifetime)';
  
  const now = new Date();
  let nextBilling = new Date(createdDate);
  
  let safetyCounter = 0;
  while (nextBilling <= now && safetyCounter < 100) {
    safetyCounter++;
    if (effectiveInterval === 'annual') {
      nextBilling.setFullYear(nextBilling.getFullYear() + 1);
    } else {
      nextBilling.setMonth(nextBilling.getMonth() + 1);
    }
  }
  
  return nextBilling.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
