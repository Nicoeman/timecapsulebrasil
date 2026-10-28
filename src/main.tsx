import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { OFFER } from './config';
import { buildCheckoutUrl, formatCountdown, getCampaignState, getCheckoutAvailability } from './commerce.mjs';
import assetData from './assets-data.json';
import './fonts.css';
import './styles.css';

type IconName = 'folder' | 'phone' | 'smile' | 'lock' | 'check' | 'cross' | 'arrow' | 'gift' | 'pause' | 'play';
type MetaPixelFunction = ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue?: unknown[][]; push?: (...args: unknown[]) => void; loaded?: boolean; version?: string };
type MetaWindow = Window & { fbq?: MetaPixelFunction; _fbq?: MetaPixelFunction; __timecapsulePixelInstalled?: boolean };
function installMetaPixel() {
  const w = window as MetaWindow;
  if (w.__timecapsulePixelInstalled) return;
  const fbq = ((...args: unknown[]) => {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue?.push(args);
  }) as MetaPixelFunction;
  fbq.push = (...args: unknown[]) => fbq.queue?.push(args);
  fbq.loaded = true;
  fbq.version = '2.0';
  fbq.queue = [];
  w.fbq = fbq;
  w._fbq = fbq;
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(script);
  fbq('init', '1017789413872986');
  fbq('track', 'PageView');
  w.__timecapsulePixelInstalled = true;
}
installMetaPixel();
function trackMeta(event: string, parameters?: Record<string, unknown>) {
  try { (window as MetaWindow).fbq?.('track', event, parameters); } catch { /* Tracking must never block the page. */ }
}
function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  const paths: Record<IconName, React.ReactNode> = {
    folder: <><path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M3 9h18"/></>,
    phone: <><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 5h4M11 19h2"/></>,
    smile: <><circle cx="12" cy="12" r="9"/><path d="M8 14s1 3 4 3 4-3 4-3M8 9h.01M16 9h.01"/></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></>,
    check: <path d="m5 12 4 4L19 6"/>, cross: <path d="m6 6 12 12M6 18 18 6"/>,
    arrow: <><path d="M12 4v16m-6-6 6 6 6-6"/></>,
    gift: <><rect x="4" y="10" width="16" height="11" rx="1"/><path d="M3 6h18v4H3zM12 6v15"/><path d="M12 6H8a2.5 2.5 0 1 1 2.5-2.5L12 6Zm0 0h4a2.5 2.5 0 1 0-2.5-2.5L12 6Z"/></>,
    pause: <><path d="M8 5v14M16 5v14"/></>, play: <path d="m8 5 11 7-11 7Z"/>,
  };
  return <svg className={`icon ${className}`} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const full = '/assets/EUA-COMPLETO.webp';
const bonuses = [
  { image: '/assets/Design-sem-nome-9.webp', title: 'Mais de 70.000 quadrinhos digitalizados', description: 'Homem-Aranha, Archie, Tartarugas Ninja, Heavy Metal, Batman e muito mais. Histórias clássicas reunidas em formato digital.' },
  { image: '/assets/Design-sem-nome-10.webp', title: 'Saga completa de Star Wars', description: 'Marvel, Dark Horse, Legends, Clone Wars e muito mais. Edições clássicas e colecionáveis para os fãs da saga.' },
  { image: '/assets/Design-sem-nome-11.webp', title: 'Super Pacote Adulto (+18)', description: 'Publicações históricas voltadas ao público adulto, incluindo Playboy, Penthouse, Hustler, Swank e Gallery. Acesso reservado exclusivamente a maiores de 18 anos.' },
  { image: '/assets/Design-sem-nome-12.webp', title: 'Revistas clássicas de videogames', description: 'Nintendo Power, Electronic Gaming Monthly, GamePro, PC Gamer, Tips & Tricks e muito mais. Reviva a época de ouro dos videogames.' },
];
const names = ['Discover','WWE Magazine','Electronic Gaming Monthly','Bone','Rolling Stone','Superman','Official PlayStation Magazine','Popular Science','Starlog','Nintendo Power','Tips & Tricks','SLAM','National Lampoon','Official Xbox Magazine','Archie','Cracked','Hulk','Flex','The Walking Dead','Spin','Dragon','Teenage Mutant Ninja Turtles','Thrasher','Wizard','GamePro','Hot Rod','Vibe','Sports Illustrated','Nickelodeon','MAD Magazine','Heavy Metal','Disney Adventures'];
const covers = Object.values(assetData).filter(asset => asset.url.includes('espiritovivo.shop')).map((asset, i) => ({ ...asset, name: names[i] }));

function Image({ src, alt, className = '', priority = false, square = false }: { src: string; alt: string; className?: string; priority?: boolean; square?: boolean }) {
  return <img className={className} src={src} alt={alt} width={square ? 500 : 1000} height={square ? 500 : 800} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async" />;
}
function CTA({ children }: { children: React.ReactNode }) { return <a className="button primary" href="#pricing">{children}</a>; }
function SecureNote() { return <p className="secure-note"><Icon name="lock" />{OFFER.salesEnabled ? 'Compra segura e protegida' : 'Produto digital • pagamento único'}</p>; }
function Checklist({ children, excluded = false, gift = false }: { children: React.ReactNode; excluded?: boolean; gift?: boolean }) { return <li className={excluded ? 'excluded' : ''}><Icon name={excluded ? 'cross' : gift ? 'gift' : 'check'} /><span>{children}</span></li>; }

function OfferBar({ now }: { now: number }) {
  const [closed, setClosed] = useState(false);
  const state = getCampaignState(OFFER.campaign, now);
  if (closed) return null;
  return <aside className="offer-bar" aria-label="Informações da oferta"><div>
    {state.status === 'active' ? <><span>{OFFER.campaign.activeText}</span><span className="countdown" role="timer" aria-label={`Tempo restante: ${formatCountdown(state)}`}>{formatCountdown(state)}</span></> : state.status === 'expired' ? <span>{OFFER.campaign.expiredText}</span> : <span>Time Capsule Magazines <span className="bar-separator">•</span> Sua viagem no tempo começa aqui</span>}
    </div><button className="bar-close" onClick={() => setClosed(true)} aria-label="Fechar barra de oferta"><Icon name="cross" /></button></aside>;
}

function CoverRow({ items, reverse, paused }: { items: typeof covers; reverse?: boolean; paused: boolean }) {
  const viewport = useRef<HTMLDivElement>(null);
  const [interacting, setInteracting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const pointer = useRef<{ x: number; scroll: number; id: number } | null>(null);
  const touchActive = useRef(false);
  const resumeTimer = useRef<number | undefined>(undefined);
  const resumeAfterGesture = () => {
    window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => { touchActive.current = false; setInteracting(false); }, 1200);
  };
  useEffect(() => () => window.clearTimeout(resumeTimer.current), []);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    let frame = 0, previous = 0;
    let visible = true;
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    observer.observe(el);
    const loop = (time: number) => {
      const dt = previous ? Math.min(time - previous, 40) : 0;
      previous = time;
      const span = el.scrollWidth / 2;
      if (!paused && !interacting && !reducedMotion && visible && !document.hidden && span > 0) {
        // Subpixel scroll accumulates smoothly and wraps to an identical duplicate.
        position += (reverse ? -1 : 1) * dt * 0.035;
        if (position < 0) position += span;
        if (position >= span) position -= span;
        el.scrollLeft = position;
      } else position = el.scrollLeft;
      frame = requestAnimationFrame(loop);
    };
    let position = el.scrollLeft;
    frame = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [paused, interacting, reducedMotion, reverse]);
  return <div ref={viewport} className="cover-viewport" tabIndex={0} role="region" aria-label={`Capas de revistas, fileira ${reverse ? '2' : '1'}. Use as setas ou arraste para explorar.`}
    onMouseEnter={() => setInteracting(true)} onMouseLeave={() => { if (!pointer.current) setInteracting(false); }} onFocus={() => setInteracting(true)} onBlur={() => setInteracting(false)}
    onScroll={() => { if (touchActive.current) resumeAfterGesture(); }}
    onPointerDown={event => { window.clearTimeout(resumeTimer.current); if (event.pointerType === 'mouse') { pointer.current = { x: event.clientX, scroll: event.currentTarget.scrollLeft, id: event.pointerId }; event.currentTarget.setPointerCapture(event.pointerId); } else touchActive.current = true; setInteracting(true); }}
    onPointerMove={event => { if (pointer.current) event.currentTarget.scrollLeft = pointer.current.scroll - (event.clientX - pointer.current.x); }}
    onPointerUp={event => { if (pointer.current) { event.currentTarget.releasePointerCapture(pointer.current.id); pointer.current = null; } if (touchActive.current) resumeAfterGesture(); else setInteracting(false); }}
    onPointerCancel={() => { pointer.current = null; resumeAfterGesture(); }}>
    <div className="cover-track">{[0, 1].map(copy => <div className="cover-group" key={copy} aria-hidden={copy === 1 || undefined}>{items.map(item => <img key={item.path} src={item.path} alt={copy === 0 ? `Capa de ${item.name}` : ''} width={item.width} height={item.height} loading="lazy" decoding="async" draggable={false} />)}</div>)}</div>
  </div>;
}

function Gallery() {
  const [paused, setPaused] = useState(false);
  return <section className="gallery section" aria-labelledby="gallery-title"><div className="container text-center"><h2 id="gallery-title">Veja algumas das revistas que você vai encontrar na coleção Time Capsule Magazines!</h2><p className="section-intro">E lembre-se: isso é apenas uma pequena amostra de tudo o que espera por você...</p></div>
    <div className="carousel-stack"><CoverRow items={covers.slice(0, 15)} paused={paused} /><CoverRow items={covers.slice(15)} reverse paused={paused} /></div>
    <button className="motion-control" onClick={() => setPaused(!paused)} aria-pressed={paused}><Icon name={paused ? 'play' : 'pause'} />{paused ? 'Retomar movimento' : 'Pausar movimento'}</button>
  </section>;
}

function Benefits() {
  const benefits: { icon: IconName; title: string; text: string }[] = [
    { icon: 'folder', title: 'Mais de 10.000 revistas e 70.000 quadrinhos', text: 'Cultura pop, esportes, videogames, ciência e décadas de conteúdos clássicos, digitalizados e organizados para você explorar.' },
    { icon: 'phone', title: OFFER.lifetimeAccessConfirmed ? 'Acesso vitalício — pagamento único' : 'Acesso digital — pagamento único', text: 'Sem mensalidades ou assinaturas recorrentes. Explore pelo celular, tablet ou computador.' },
    { icon: 'smile', title: 'Perfeito para quem cresceu nos anos 80, 90 ou 2000', text: 'Se você sente saudade daquela época, esta coleção foi pensada para reviver lembranças e redescobrir conteúdos especiais.' },
    { icon: 'lock', title: OFFER.guaranteeConfirmed ? 'Pagamento único e garantia de 7 dias' : 'Pagamento único, sem mensalidades', text: OFFER.guaranteeConfirmed ? 'Pague uma única vez e explore o conteúdo. Se não ficar satisfeito, você poderá solicitar seu reembolso dentro do prazo de garantia.' : 'Conheça o conteúdo de cada pacote e escolha a coleção que combina com você.' },
  ];
  return <section className="benefits section container"><h2>Tudo o que marcou sua infância,<br/><span className="green">em um só lugar.</span></h2><div className="benefit-grid grid md:grid-cols-2">{benefits.map(item => <article className="benefit-card" key={item.title}><Icon name={item.icon} /><div><h3>{item.title}</h3><p>{item.text}</p></div></article>)}</div><p className="collection-note">Os 70.000 quadrinhos fazem parte dos bônus do Pacote Completo.</p></section>;
}

function Deliverable() { return <section className="deliverable section container"><h2>O QUE VOCÊ RECEBE COM SUA COMPRA</h2><article className="deliverable-card"><Image src={full} alt="Mockup completo da coleção de revistas clássicas em computador, tablet e celular" className="deliverable-image" /><span className="tag green-tag">ITEM 01</span><h3>MAIS DE 10.000 REVISTAS CLÁSSICAS</h3><p className="deliverable-subtitle">Digitalizadas e organizadas por categorias</p><ul className="checklist">
    <Checklist>Mais de 10.000 revistas clássicas e colecionáveis digitalizadas.</Checklist>
    <Checklist>Organizadas por categorias temáticas: cultura pop, quadrinhos, ciência, história e esportes.</Checklist>
    <Checklist>{OFFER.lifetimeAccessConfirmed && OFFER.immediateAccessConfirmed ? 'Acesso digital imediato e vitalício.' : OFFER.lifetimeAccessConfirmed ? 'Acesso digital e vitalício.' : 'Coleção em formato digital.'}</Checklist>
    <Checklist>Compatível com celular, tablet e computador.</Checklist>
    <Checklist>Publicações como Playboy, MAD Magazine, Archie, Sports Illustrated, WWF Magazine, Nintendo Power, Muscle &amp; Fitness, Popular Science, Hot Rod, Cracked e outras, conforme o acervo licenciado.</Checklist>
  </ul><p className="and-more">E muito mais...</p></article></section>; }

function Bonuses() { return <><section className="bonus-intro container"><div className="down-arrows"><Icon name="arrow"/><Icon name="arrow"/><Icon name="arrow"/></div><p>E não é só isso...</p><h2 className="coral">Tem muito mais!</h2><p className="bonus-subtitle">Você também vai receber <strong>4 bônus exclusivos:</strong></p><small>Incluídos no Pacote Completo</small></section><section className="bonuses container" aria-label="Os quatro bônus do Pacote Completo"><div className="bonus-grid grid sm:grid-cols-3">{bonuses.map((bonus, index) => <article className="bonus-card" key={bonus.image}><Image src={bonus.image} alt={`Mockup do bônus ${index + 1}: ${bonus.title}`} square className="bonus-image"/><span className="tag bonus-tag">BÔNUS 0{index + 1}</span><h3>{bonus.title}</h3><p>{bonus.description}</p></article>)}</div></section></>; }

function PriceCard({ now }: { now: number }) {
  const complete = true;
  const plan = 'basic';
  const availability = getCheckoutAvailability(OFFER, plan, now);
  const checkout = buildCheckoutUrl(OFFER.checkout[plan], window.location.search);
  const [notice, setNotice] = useState(false);
  const navigating = useRef(false);
  useEffect(() => {
    const resetNavigation = () => { navigating.current = false; };
    window.addEventListener('pageshow', resetNavigation);
    return () => window.removeEventListener('pageshow', resetNavigation);
  }, []);
  const buy = () => {
    if (navigating.current) return;
    if (!getCheckoutAvailability(OFFER, plan, Date.now()).available || !checkout) { setNotice(true); return; }
    navigating.current = true;
    // Only an intent event. The payment provider must confirm and deduplicate purchases.
    const value = 10;
    trackMeta('InitiateCheckout', { content_name: 'Time Capsule Magazines Brasil', currency: 'BRL', value });
    window.dispatchEvent(new CustomEvent('timecapsule:checkout', { detail: { plan, currency: 'BRL', value } }));
    window.location.assign(checkout);
  };
  return <article className={`price-card ${complete ? 'complete' : 'basic'}`} aria-labelledby={`${plan}-name`}>
    {complete && <div className="complete-ribbon">OFERTA ÚNICA • TODOS OS BÔNUS INCLUÍDOS</div>}
    <h3 id={`${plan}-name`}>Pacote {complete ? 'Completo' : 'Básico'}</h3>
    <Image src={complete ? full : '/assets/eua-bas.webp'} alt={`Conteúdo do Pacote ${complete ? 'Completo' : 'Básico'}`} className="price-image" />
    <ul className="checklist price-list"><Checklist>Mais de 10.000 revistas clássicas.</Checklist><Checklist>{OFFER.lifetimeAccessConfirmed ? (complete && OFFER.immediateAccessConfirmed ? 'Acesso digital imediato e vitalício.' : 'Acesso vitalício com pagamento único.') : 'Acesso digital com pagamento único.'}</Checklist><Checklist>Compatível com celular, tablet ou computador.</Checklist>{complete && OFFER.weeklyUpdatesConfirmed && <Checklist>Atualizações semanais com novas revistas.</Checklist>}
      {['70.000 quadrinhos digitalizados.', 'Saga completa de Star Wars.', 'Super Pacote Adulto (+18).', 'Revistas clássicas de videogames.'].map(item => <Checklist key={item} excluded={!complete} gift={complete}>{item}</Checklist>)}
    </ul>
    <div className="price-bottom"><p className="price"><span>R$</span> 10,00</p><p className="single-payment">Pagamento único • Pacote completo + 4 bônus</p>
    <button className={`button ${complete ? 'primary' : 'secondary'}${availability.available ? ' checkout-pulse' : ''}`} onClick={buy} aria-disabled={!availability.available} aria-describedby={`${plan}-status`}>{complete ? 'DESBLOQUEAR MEU PACOTE COMPLETO' : 'COMPRAR PACOTE BÁSICO'}</button>
    <p className="checkout-status" id={`${plan}-status`} role={notice ? 'status' : undefined}>{availability.available ? (complete ? 'Pagamento único • Acesso digital' : 'Você também pode aproveitar nossa oferta completa.') : getCampaignState(OFFER.campaign, now).status === 'expired' ? 'Campanha encerrada. Compras indisponíveis.' : 'Em preparação. Compras ainda indisponíveis.'}</p>
    {notice && <p className="purchase-notice" role="status">A oferta está em preparação. O pagamento será liberado quando as condições e o checkout estiverem disponíveis.</p>}
    </div>
  </article>;
}

function Guarantee() { return <section className="guarantee section container" aria-labelledby="guarantee-title"><div className="guarantee-seal" role="img" aria-label={OFFER.guaranteeConfirmed ? 'Garantia de 7 dias' : 'Produto digital'}><div><span>{OFFER.guaranteeConfirmed ? 'GARANTIA' : 'COLEÇÃO'}</span><strong>{OFFER.guaranteeConfirmed ? '7' : '100%'}</strong><span>{OFFER.guaranteeConfirmed ? 'DIAS' : 'DIGITAL'}</span><small>TIME CAPSULE MAGAZINES</small></div></div><div className="guarantee-copy"><h2 id="guarantee-title">{OFFER.guaranteeConfirmed ? 'Garantia de reembolso de 7 dias' : 'Sua coleção em formato digital'}</h2><p>{OFFER.guaranteeConfirmed ? 'Você terá 7 dias para explorar o conteúdo. Se por algum motivo não ficar satisfeito, poderá entrar em contato com nosso suporte e solicitar o reembolso conforme os termos da garantia.' : 'Leia suas revistas pelo celular, tablet ou computador. Este é um produto digital, sem envio de revistas físicas.'}</p><p className="guarantee-last">{OFFER.guaranteeConfirmed ? 'Explore com tranquilidade. Sua compra está protegida pela nossa garantia.' : 'As condições de acesso e reembolso estarão disponíveis antes da abertura das vendas.'}</p></div></section>; }

function FAQ() {
  const items = [
    ['É uma assinatura mensal ou um pagamento único?', 'É um pagamento único. Você não precisa pagar mensalidades para manter o acesso incluído no pacote adquirido.'],
    ['Quando e como vou receber acesso à Time Capsule Magazines?', 'Após a confirmação do pagamento, o acesso será disponibilizado pelo método de entrega informado na página de pagamento.'],
    ['Preciso informar meu endereço para receber o produto?', 'Não há entrega física. Este é um produto digital. A plataforma de pagamento poderá solicitar dados necessários para faturamento e identificação da compra.'],
    ['Quais formas de pagamento estão disponíveis?', 'As opções de pagamento serão apresentadas no checkout, conforme os métodos habilitados.'],
    ['Por que escolher a Time Capsule Magazines?', 'Porque você pode explorar uma coleção de conteúdos clássicos em uma experiência digital organizada, sem precisar procurar cada material separadamente.'],
    ['O que faço se tiver dificuldades para acessar ou baixar o conteúdo?', OFFER.supportUrl ? 'Entre em contato pelo canal de suporte disponível no rodapé. Nossa equipe poderá orientar você sobre o acesso e o funcionamento do produto.' : 'O canal de suporte será informado aqui antes da abertura das vendas.'],
  ];
  return <section className="faq section container"><h2>Perguntas frequentes</h2><div className="faq-list">{items.map(([question, answer], i) => <FAQItem key={question} question={question} answer={answer} index={i}/>)}</div></section>;
}
function FAQItem({ question, answer, index }: { question: string; answer: string; index: number }) {
  const [open, setOpen] = useState(false);
  return <article className={`faq-item ${open ? 'is-open' : ''}`}><h3><button aria-expanded={open} aria-controls={`faq-answer-${index}`} id={`faq-question-${index}`} onClick={() => setOpen(!open)}>{question}<span aria-hidden="true" className="faq-plus">{open ? '−' : '+'}</span></button></h3><div className="faq-answer" id={`faq-answer-${index}`} role="region" aria-labelledby={`faq-question-${index}`} inert={!open} aria-hidden={!open}><div><p>{answer}</p></div></div></article>;
}
function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  const valid = /^(https:\/\/[^\s]+|mailto:[^\s@]+@[^\s@]+)$/.test(href);
  return valid ? <a href={href}>{children}</a> : <span className="pending-link">{children}<small>Disponível em breve</small></span>;
}
function Footer() { return <footer><div className="footer-grid container grid md:grid-cols-3"><div><h2>Time Capsule Magazines</h2><p>Reviva a época de ouro da cultura com uma coleção digital de revistas clássicas, organizada para você explorar.</p></div><div><h2>Jurídico e suporte</h2><nav aria-label="Jurídico e suporte"><FooterLink href={OFFER.legal.terms}>Termos de uso</FooterLink><FooterLink href={OFFER.legal.refund}>Política de reembolso</FooterLink><FooterLink href={OFFER.supportUrl}>Contato</FooterLink><FooterLink href={OFFER.legal.privacy}>Política de privacidade</FooterLink></nav></div><div><h2><Icon name="lock"/>Pagamento seguro</h2><p>{OFFER.salesEnabled ? 'Sua compra é realizada por uma plataforma de pagamento segura.' : 'As opções de pagamento estarão disponíveis quando as vendas forem abertas.'}</p><p className="footer-digital">Produto 100% digital</p></div></div><div className="footer-bottom container"><p>© 2026 Time Capsule Magazines. Todos os direitos reservados.</p>{OFFER.company && <p>{OFFER.company}</p>}</div></footer>; }

function App() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const w = window as MetaWindow & { __timecapsuleViewContentTracked?: boolean };
    if (w.__timecapsuleViewContentTracked) return;
    w.__timecapsuleViewContentTracked = true;
    trackMeta('ViewContent', { content_name: 'Time Capsule Magazines Brasil', content_type: 'product', currency: 'BRL', value: 10.00 });
  }, []);
  useEffect(() => { const interval = window.setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(interval); }, []);
  return <><a className="skip-link" href="#main">Ir para o conteúdo</a><OfferBar now={now}/><main id="main"><section className="hero container text-center"><h1>Sua época favorita está de volta com mais de <span className="coral">10.000 revistas clássicas.</span></h1><Image src={full} alt="Coleção Time Capsule Magazines: revistas clássicas organizadas em computador, tablet e celular" priority className="hero-image"/><p className="hero-description">Tenha acesso a milhares de revistas digitalizadas e organizadas — Playboy, MAD Magazine, Archie, Sports Illustrated, WWF Magazine, Nintendo Power, Muscle &amp; Fitness, Popular Science, Hot Rod, Cracked e muito mais.</p><CTA>QUERO REVIVER MINHA INFÂNCIA</CTA><SecureNote/>{!OFFER.salesEnabled && <p className="review-note">Prévia para revisão • Vendas ainda não abertas</p>}</section>
    <Gallery/><Benefits/><section className="trust section container text-center"><h2>Pronto para fazer uma viagem no tempo?</h2><p>O que você está esperando?</p><CTA>QUERO PARTICIPAR AGORA</CTA><SecureNote/></section><Deliverable/><Bonuses/>
    <section className="pricing section container" id="pricing"><h2>Pacote completo + todos os bônus por <span className="green">R$ 10,00</span></h2><div className="pricing-grid pricing-single grid"><PriceCard now={now}/></div></section><Guarantee/><FAQ/>
  </main><Footer/></>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);

