/** Commercial configuration helpers. All deadlines are absolute instants. */
export function getCampaignState(config, now = Date.now()) {
  const empty = { status: 'inactive', remaining: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  if (!config?.enabled || typeof config.endsAt !== 'string') return empty;
  // A timezone suffix is mandatory: never interpret a deadline in the visitor's timezone.
  if (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(config.endsAt)) return empty;
  const deadline = Date.parse(config.endsAt);
  const current = Number(now);
  if (!Number.isFinite(deadline) || !Number.isFinite(current)) return empty;
  const remaining = Math.max(0, deadline - current);
  const totalSeconds = Math.floor(remaining / 1000);
  return {
    status: remaining > 0 ? 'active' : 'expired',
    remaining,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor(totalSeconds / 3600) % 24,
    minutes: Math.floor(totalSeconds / 60) % 60,
    seconds: totalSeconds % 60,
  };
}

export function formatCountdown(state) {
  const pad = (value) => String(Math.max(0, Math.floor(Number(value) || 0))).padStart(2, '0');
  return `${pad(state.days)}d : ${pad(state.hours)}h : ${pad(state.minutes)}m : ${pad(state.seconds)}s`;
}

function httpsUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname && !url.username && !url.password ? url : null;
  } catch {
    return null;
  }
}

/** Copy only attribution parameters; destination values always take precedence. */
export function buildCheckoutUrl(checkout, search = '') {
  const destination = httpsUrl(checkout);
  if (!destination) return null;
  const known = new Set([...destination.searchParams.keys()].map((key) => key.toLowerCase()));
  for (const [key, value] of new URLSearchParams(search)) {
    const normalized = key.toLowerCase();
    if (!/^(utm_[a-z0-9_]+|fbclid|gclid|ttclid)$/.test(normalized) || known.has(normalized)) continue;
    destination.searchParams.append(key, value);
    known.add(normalized);
  }
  return destination.href;
}

function validSupport(value) {
  if (httpsUrl(value)) return true;
  if (typeof value !== 'string' || !value.startsWith('mailto:')) return false;
  try {
    const address = decodeURIComponent(value.slice(7).split('?')[0]);
    return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address);
  } catch {
    return false;
  }
}

export function getCheckoutAvailability(config, plan, now = Date.now()) {
  const unavailable = (reason) => ({ available: false, reason });
  if (config?.checkoutEnabled !== undefined) {
    // Explicit checkout activation is independent of the page's optional sales copy.
    if (config.checkoutEnabled !== true) return unavailable('As vendas ainda não estão disponíveis.');
  } else {
    if (!config?.salesEnabled) return unavailable('As vendas ainda não estão disponíveis.');
    if (!config.rightsConfirmed || !config.lifetimeAccessConfirmed || !config.guaranteeConfirmed) {
      return unavailable('As condições desta oferta ainda estão em confirmação.');
    }
    if (!validSupport(config.supportUrl) || !['terms', 'refund', 'privacy'].every((key) => httpsUrl(config.legal?.[key]))) {
      return unavailable('As informações de suporte e da compra ainda estão em preparação.');
    }
  }
  if (!['basic', 'complete'].includes(plan) || !httpsUrl(config.checkout?.[plan])) {
    return unavailable('O pagamento deste pacote ainda não está disponível.');
  }
  if (config.campaign?.enabled) {
    const state = getCampaignState(config.campaign, now);
    if (state.status === 'expired') return unavailable('Esta campanha terminou. As compras desta oferta foram encerradas.');
    if (state.status !== 'active') return unavailable('O período desta oferta ainda está em confirmação.');
  }
  return { available: true, reason: '' };
}
