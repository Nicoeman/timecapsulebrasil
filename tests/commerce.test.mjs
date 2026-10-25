import test from 'node:test';
import assert from 'node:assert/strict';
import { getCampaignState, formatCountdown, buildCheckoutUrl, getCheckoutAvailability } from '../src/commerce.mjs';

const campaign = { enabled: true, endsAt: '2026-10-25T23:59:00-03:00' };
const now = Date.parse('2026-10-24T23:58:59-03:00');
const configured = () => ({
  salesEnabled: true,
  rightsConfirmed: true,
  lifetimeAccessConfirmed: true,
  guaranteeConfirmed: true,
  supportUrl: 'https://seller.example/contact',
  legal: {
    terms: 'https://seller.example/terms',
    refund: 'https://seller.example/refund',
    privacy: 'https://seller.example/privacy',
  },
  campaign: { ...campaign },
  checkout: { basic: 'https://payment.example/basic', complete: 'https://payment.example/complete' },
});

test('Brasília deadline is an absolute UTC instant and handles day rollover', () => {
  const state = getCampaignState(campaign, now);
  assert.deepEqual(state, { status: 'active', remaining: 86401000, days: 1, hours: 0, minutes: 0, seconds: 1 });
  assert.equal(formatCountdown(state), '01d : 00h : 00m : 01s');
  assert.deepEqual(getCampaignState(campaign, Date.parse('2026-10-25T02:58:59Z')), state);
  assert.equal(formatCountdown(getCampaignState(campaign, now + 2000)), '00d : 23h : 59m : 59s');
});

test('campaign expires exactly at the configured date and never shows negative time', () => {
  const deadline = Date.parse(campaign.endsAt);
  assert.equal(getCampaignState(campaign, deadline - 1).status, 'active');
  for (const date of [deadline, deadline + 3600000]) {
    const state = getCampaignState(campaign, date);
    assert.equal(state.status, 'expired');
    assert.equal(state.remaining, 0);
    assert.equal(formatCountdown(state), '00d : 00h : 00m : 00s');
  }
});

test('disabled, invalid and timezone-less campaigns stay inactive', () => {
  for (const config of [undefined, { ...campaign, enabled: false }, { enabled: true, endsAt: 'invalid' }, { enabled: true, endsAt: '2026-10-25T23:59:00' }]) {
    assert.equal(getCampaignState(config, now).status, 'inactive');
  }
  assert.equal(getCampaignState(campaign, NaN).status, 'inactive');
});

test('checkout keeps its own query and accepts only attribution parameters, without duplicates', () => {
  const result = new URL(buildCheckoutUrl(
    'https://payment.example/buy?product=basic&utm_source=checkout#pay',
    '?utm_source=ad&utm_campaign=Revistas%20%26%20mem%C3%B3rias&utm_campaign=duplicate&fbclid=abc%2B123&gclid=g&ttclid=t&email=private%40example.com&redirect=https%3A%2F%2Fbad.example',
  ));
  assert.equal(result.searchParams.get('product'), 'basic');
  assert.equal(result.searchParams.get('utm_source'), 'checkout');
  assert.equal(result.searchParams.get('utm_campaign'), 'Revistas & memórias');
  assert.equal(result.searchParams.getAll('utm_campaign').length, 1);
  assert.equal(result.searchParams.get('fbclid'), 'abc+123');
  assert.equal(result.searchParams.get('gclid'), 'g');
  assert.equal(result.searchParams.get('ttclid'), 't');
  assert.equal(result.searchParams.has('email'), false);
  assert.equal(result.searchParams.has('redirect'), false);
  assert.equal(result.hash, '#pay');
  assert.equal(new URL(buildCheckoutUrl('https://payment.example/?UTM_SOURCE=checkout', '?utm_source=ad')).searchParams.size, 1);
});

test('checkout rejects unsafe, relative and credential-bearing destinations', () => {
  for (const url of ['', '#', '/checkout', 'http://payment.example', 'javascript:alert(1)', 'data:text/html,hello', 'https://user:password@payment.example']) {
    assert.equal(buildCheckoutUrl(url, '?utm_source=ad'), null);
  }
  assert.equal(buildCheckoutUrl('https://payment.example'), 'https://payment.example/');
});

test('both plans become available only with configured commercial conditions', () => {
  for (const plan of ['basic', 'complete']) {
    assert.deepEqual(getCheckoutAvailability(configured(), plan, now), { available: true, reason: '' });
  }
  const normalOffer = configured();
  normalOffer.campaign.enabled = false;
  assert.equal(getCheckoutAvailability(normalOffer, 'basic', Date.parse('2027-01-01T00:00:00Z')).available, true);
  normalOffer.supportUrl = 'mailto:suporte@seller.example';
  assert.equal(getCheckoutAvailability(normalOffer, 'basic', now).available, true);
});

test('missing confirmations, URLs and unsafe payment methods prevent purchase', () => {
  for (const field of ['salesEnabled', 'rightsConfirmed', 'lifetimeAccessConfirmed', 'guaranteeConfirmed']) {
    const config = configured();
    config[field] = false;
    const state = getCheckoutAvailability(config, 'basic', now);
    assert.equal(state.available, false, field);
    assert.ok(state.reason);
  }
  for (const field of ['terms', 'refund', 'privacy']) {
    const config = configured();
    config.legal[field] = '';
    assert.equal(getCheckoutAvailability(config, 'basic', now).available, false, field);
  }
  for (const supportUrl of ['', '#', 'mailto:', 'mailto:invalid', 'javascript:alert(1)', 'http://seller.example']) {
    assert.equal(getCheckoutAvailability({ ...configured(), supportUrl }, 'basic', now).available, false);
  }
  const config = configured();
  config.checkout.basic = 'http://payment.example/basic';
  assert.equal(getCheckoutAvailability(config, 'basic', now).available, false);
  assert.equal(getCheckoutAvailability(config, 'complete', now).available, true);
  assert.equal(getCheckoutAvailability(configured(), 'unknown', now).available, false);
  assert.equal(getCheckoutAvailability(undefined, 'basic', now).available, false);
});

test('enabled expired or malformed campaigns cannot accept payment', () => {
  const config = configured();
  assert.equal(getCheckoutAvailability(config, 'basic', Date.parse(campaign.endsAt)).available, false);
  config.campaign.endsAt = 'invalid';
  assert.equal(getCheckoutAvailability(config, 'basic', now).available, false);
});

test('official Lowify destinations keep their product identifiers and attribution', () => {
  const destinations = [
    ['https://pay.lowify.com.br/checkout.php?product_id=6vz6hy', 'product_id', '6vz6hy'],
    ['https://pay.lowify.com.br/go.php?offer=f171ce22', 'offer', 'f171ce22'],
  ];
  const query = '?utm_source=facebook&utm_medium=cpc&utm_campaign=Revistas%20Brasil&utm_content=carrossel&utm_term=anos90&utm_id=campanha1&fbclid=abc%2B123&utm_source=duplicado&product_id=incorreto&offer=incorreta';
  for (const [destination, key, id] of destinations) {
    assert.equal(buildCheckoutUrl(destination, ''), destination);
    const url = new URL(buildCheckoutUrl(destination, query));
    assert.equal(url.origin, 'https://pay.lowify.com.br');
    assert.equal(url.searchParams.get(key), id);
    assert.equal(url.searchParams.getAll(key).length, 1);
    assert.equal(url.searchParams.getAll('utm_source').length, 1);
    assert.equal(url.searchParams.get('utm_campaign'), 'Revistas Brasil');
    assert.equal(url.searchParams.get('fbclid'), 'abc+123');
    assert.equal(url.searchParams.get('utm_id'), 'campanha1');
    assert.equal(url.searchParams.has(key === 'offer' ? 'product_id' : 'offer'), false);
  }
});

test('explicit checkout activation leaves optional sales copy unconfirmed', () => {
  const config = { ...configured(), checkoutEnabled: true, salesEnabled: false, rightsConfirmed: false, lifetimeAccessConfirmed: false, guaranteeConfirmed: false, supportUrl: '', legal: {}, campaign: { ...campaign, enabled: false } };
  for (const plan of ['basic', 'complete']) assert.equal(getCheckoutAvailability(config, plan, now).available, true);
  assert.equal(config.lifetimeAccessConfirmed, false);
  assert.equal(config.guaranteeConfirmed, false);
  assert.equal(getCheckoutAvailability({ ...config, checkoutEnabled: false }, 'basic', now).available, false);
  assert.equal(getCheckoutAvailability({ ...config, checkout: { basic: 'javascript:alert(1)' } }, 'basic', now).available, false);
  assert.equal(getCheckoutAvailability({ ...config, campaign }, 'complete', Date.parse(campaign.endsAt)).available, false);
});
