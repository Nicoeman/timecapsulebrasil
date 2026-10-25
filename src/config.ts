/** Configure somente com as condições e URLs aprovadas para esta operação. */
export const CHECKOUT_BASICO =
  'https://pay.lowify.com.br/checkout.php?product_id=6vz6hy';
export const CHECKOUT_COMPLETO =
  'https://pay.lowify.com.br/go.php?offer=f171ce22';

export const OFFER = {
  // Habilita apenas os destinos de compra fornecidos, sem alterar os textos da página.
  checkoutEnabled: true,
  salesEnabled: false,
  rightsConfirmed: false,
  lifetimeAccessConfirmed: false,
  guaranteeConfirmed: false,
  immediateAccessConfirmed: false,
  weeklyUpdatesConfirmed: false,
  supportUrl: '',
  company: '',
  legal: { terms: '', refund: '', privacy: '' },
  checkout: { basic: CHECKOUT_BASICO, complete: CHECKOUT_COMPLETO },
  campaign: {
    enabled: false,
    endsAt: '2026-10-25T23:59:00-03:00',
    activeText: '🔥 Acesso com desconto até 25 de outubro!',
    expiredText: 'Esta campanha foi encerrada. Novas condições serão divulgadas aqui.',
  },
};
