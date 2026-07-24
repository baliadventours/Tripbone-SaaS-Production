export function formatPlanName(planInput?: string, packagesList: any[] = []): string {
  if (!planInput) return 'Starter Plan';
  const trimmed = planInput.trim();

  // 1. Direct match in packagesList by id, slug, creemProductId, or name
  if (packagesList && packagesList.length > 0) {
    const matched = packagesList.find(p =>
      p.id === trimmed ||
      p.slug?.toLowerCase() === trimmed.toLowerCase() ||
      p.creemProductId === trimmed ||
      (p.name && p.name.toLowerCase() === trimmed.toLowerCase())
    );
    if (matched && matched.name) {
      return matched.name;
    }
  }

  const lower = trimmed.toLowerCase();
  if (lower.includes('starter')) return 'Starter Plan';
  if (lower.includes('professional') || lower.includes('pro')) return 'Professional Plan';
  if (lower.includes('business')) return 'Business Plan';
  if (lower.includes('enterprise')) return 'Enterprise Plan';

  // Raw product IDs (e.g. Prod_7bVobHJrxgzRiVALrMlltJ or prod_business_123)
  if (lower.startsWith('prod_') || lower.startsWith('prod-')) {
    if (lower.includes('pro')) return 'Professional Plan';
    if (lower.includes('starter')) return 'Starter Plan';
    if (lower.includes('enterprise')) return 'Enterprise Plan';
    return 'Business Plan';
  }

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
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
