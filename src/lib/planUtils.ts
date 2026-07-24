export function formatPlanName(planInput?: string, packagesList: any[] = [], intervalInput?: string): string {
  if (!planInput && !intervalInput) return 'Starter Monthly';

  const trimmed = (planInput || '').trim();
  const lower = trimmed.toLowerCase();

  // Determine interval label
  let intervalLabel = '';
  if (lower.includes('lifetime') || (intervalInput && intervalInput.toLowerCase() === 'lifetime')) {
    intervalLabel = 'Lifetime';
  } else if (lower.includes('annual') || lower.includes('yearly') || (intervalInput && (intervalInput.toLowerCase() === 'annual' || intervalInput.toLowerCase() === 'annually' || intervalInput.toLowerCase() === 'yearly'))) {
    intervalLabel = 'Annual';
  } else if (lower.includes('monthly') || (intervalInput && intervalInput.toLowerCase() === 'monthly')) {
    intervalLabel = 'Monthly';
  } else if (intervalInput) {
    const rawInt = intervalInput.trim().toLowerCase();
    if (rawInt === 'annual' || rawInt === 'annually' || rawInt === 'yearly') intervalLabel = 'Annual';
    else if (rawInt === 'lifetime') intervalLabel = 'Lifetime';
    else intervalLabel = 'Monthly';
  } else {
    intervalLabel = 'Monthly';
  }

  // 1. Direct match in packagesList by id, slug, creemProductId, or name
  let baseName = '';
  if (packagesList && packagesList.length > 0 && trimmed) {
    const matched = packagesList.find(p =>
      p.id === trimmed ||
      p.slug?.toLowerCase() === trimmed.toLowerCase() ||
      p.creemProductId === trimmed ||
      (p.name && p.name.toLowerCase() === trimmed.toLowerCase())
    );
    if (matched && matched.name) {
      baseName = matched.name;
    }
  }

  if (!baseName) {
    if (lower.includes('starter')) baseName = 'Starter';
    else if (lower.includes('professional') || lower.includes('pro')) baseName = 'Professional';
    else if (lower.includes('business')) baseName = 'Business';
    else if (lower.includes('agency') || lower.includes('enterprise')) baseName = 'Agency';
    else if (lower.startsWith('prod_') || lower.startsWith('prod-')) {
      if (lower.includes('pro')) baseName = 'Professional';
      else if (lower.includes('starter')) baseName = 'Starter';
      else if (lower.includes('agency') || lower.includes('enterprise')) baseName = 'Agency';
      else baseName = 'Business';
    } else if (trimmed) {
      baseName = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    } else {
      baseName = 'Starter';
    }
  }

  // Strip trailing "Plan", "Monthly", "Annual", "Annually", "Yearly", "Lifetime" from baseName to prevent duplication like "Professional Monthly Monthly"
  baseName = baseName
    .replace(/\s*(Plan|Monthly|Annual|Annually|Yearly|Lifetime)\s*$/i, '')
    .trim();

  if (!baseName) baseName = 'Starter';

  return `${baseName} ${intervalLabel}`;
}

export function getPlanPrice(planInput?: string, interval: string = 'monthly', packagesList: any[] = []): number {
  if (!planInput) return 49;
  const trimmed = planInput.trim();

  if (packagesList && packagesList.length > 0) {
    const matched = packagesList.find(p =>
      p.id === trimmed ||
      p.slug?.toLowerCase() === trimmed.toLowerCase() ||
      p.creemProductId === trimmed
    );
    if (matched && matched.price !== undefined) {
      return matched.price;
    }
  }

  const name = formatPlanName(planInput, packagesList).toLowerCase();
  const isAnnual = interval === 'annual';
  const isLifetime = interval === 'lifetime';

  if (name.includes('enterprise')) {
    return isLifetime ? 2499 : isAnnual ? 4990 : 499;
  }
  if (name.includes('business')) {
    return isLifetime ? 999 : isAnnual ? 1990 : 199;
  }
  if (name.includes('professional')) {
    return isLifetime ? 499 : isAnnual ? 990 : 99;
  }
  return isLifetime ? 249 : isAnnual ? 490 : 49;
}
