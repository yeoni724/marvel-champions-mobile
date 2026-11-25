/* Animation experiment. The game screen is rebuilt in one piece on every change, so nothing in it can move on
   its own. Instead: just before each rebuild this file notes where every card, pile counter, status chip and
   revealed card sits, and just after it compares with the new screen and the game state it last saw, then plays
   short effects for what changed:
     cards drawn from the deck, played or paid into the discard pile, flying between hand and board;
     revealed encounter cards flying to where they end up; boost icons counted up card by card;
     damage / healing / threat, status chips appearing and breaking, exhausting and readying, flips;
     attacks; a pulse on whatever is about to lose the game (one at a time); comic bursts for big moments.
   It is purely cosmetic: the game never waits for it, it never blocks a tap, and it turns off with the switch
   on the start screen or the system's reduce-motion setting. */
(function () {
  'use strict';
  const MC = window.MC;
  const RM = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  let on = true;
  try { on = localStorage.getItem('mc.fx') !== 'off'; } catch (e) { /* storage unavailable */ }
  const canAnimate = typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function';
  // individual transform properties compose with the CSS transforms the cards already carry (exhausted tilt, lifted hand card)
  const indiv = !!(window.CSS && CSS.supports && CSS.supports('translate', '1px 1px') && CSS.supports('rotate', 'y 10deg'));
  const enabled = () => on && canAnimate && indiv && !(RM && RM.matches);

  const EASE = 'cubic-bezier(.2,.75,.25,1)';
  const MAX_GHOSTS = 14;     // never more than this many flying copies at once
  let layer = null, last = null;
  const attacks = [];        // filled by the engine hooks, played on the next rebuild
  const flying = new Map();  // uid -> copy flying in the effect layer (the real card stays hidden until it lands)
  const lunging = new Map(); // uid -> attacking copy (the real card stays hidden until it is back)

  function fxLayer() {
    if (layer && layer.isConnected) return layer;
    layer = document.createElement('div'); layer.id = 'fx-layer'; layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
    return layer;
  }
  const ghostCount = () => layer ? layer.childElementCount : 0;

  // ---------------------------------------------------------------- engine hooks (watch only)
  const P = MC.Game && MC.Game.prototype;
  function hook(name, rec) {
    const f = P && P[name]; if (typeof f !== 'function') return;
    P[name] = function (...a) { try { if (enabled()) rec.apply(this, a); } catch (e) { /* never disturb the game */ } return f.apply(this, a); };
  }
  hook('enemyAttack', function (enemy) { attacks.push({ src: enemy, foe: true }); });
  hook('attackWith', function (src, target) { attacks.push({ src, target, foe: false }); });
  const thwarts = [];
  hook('thwartWith', function (src, scheme) { thwarts.push({ src, target: scheme }); });
  // payments: which cards and abilities paid for which card (resource orbs fly from the first to the second)
  const pays = [];
  if (P && typeof P.pay === 'function') {
    const f = P.pay;
    P.pay = async function (...a) {
      const r = await f.apply(this, a);
      try { if (enabled() && r && r.length) pays.push({ forUid: a[1], cards: (this.p.lastPaidCards || []).slice(), abil: (this.p.lastPaidAbil || []).slice(), letters: r.slice() }); } catch (e) { /* ignore */ }
      return r;
    };
  }

  // ---------------------------------------------------------------- reading the screen
  function cardEls() {
    const m = new Map();
    for (const el of document.querySelectorAll('#app .card[data-uid], #app .card[data-zoom]')) {
      if (el.closest('.scrim, .reveal, .offb')) continue;       // sheets and overlays show copies of cards
      const uid = el.dataset.uid || el.dataset.zoom;
      if (!m.has(uid)) m.set(uid, el);
    }
    return m;
  }
  const zoneOf = el => el.closest('.hand') ? 'hand' : el.closest('.atts') ? 'att' : el.closest('.enemy') ? 'enemy' : 'mine';
  function box(el) {
    const r = el.getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: el.offsetWidth || r.width, h: el.offsetHeight || r.height, vis: r.width > 0 && r.bottom > 0 && r.top < innerHeight };
  }
  function stateOf(g, uid) {
    const c = g.c(uid) || {};
    return { id: c.id, dmg: c.dmg || 0, thr: c.threat || 0, ex: !!c.ex, tough: !!c.tough, stun: !!c.stun, conf: !!c.conf };
  }
  // the four pile counters: "내 덱 N · 버림 N" and "조우 덱 N · 버림 N"
  function piles() {
    const q = sel => { const b = document.querySelectorAll(sel); return b.length >= 2 ? [b[0], b[1]] : [null, null]; };
    const activeMine = document.querySelector('#app .mine.active') || document.querySelector('#app .mine');
    const mb = activeMine ? activeMine.querySelectorAll('.cnts b') : [];
    const deck = mb[0] || null, discard = mb[1] || null;
    const [edeck, ediscard] = q('#app .enemy .cnts b');
    return { deck, discard, edeck, ediscard };
  }
  const pileText = p => Object.fromEntries(Object.entries(p).map(([k, el]) => [k, el ? el.textContent : null]));
  function chipsOf(el) {
    const slot = el.closest('.slot'); if (!slot) return [];
    return [...slot.querySelectorAll(':scope > .chips .chip.st')];
  }

  // ---------------------------------------------------------------- effects
  function ghostOf(el, b) {
    const gh = el.cloneNode(true);
    gh.classList.add('fx-ghost'); gh.classList.remove('can', 'cand', 'fx-danger');
    gh.removeAttribute('data-uid'); gh.removeAttribute('data-zoom'); gh.removeAttribute('tabindex'); gh.removeAttribute('data-fxuid');
    Object.assign(gh.style, { position: 'fixed', left: (b.cx - b.w / 2) + 'px', top: (b.cy - b.h / 2) + 'px', width: b.w + 'px', height: b.h + 'px', margin: '0', opacity: '', visibility: '' });
    fxLayer().appendChild(gh);
    return gh;
  }
  function done(a, f) { a.onfinish = f; a.oncancel = f; }
  function pop(el, delay, big) {
    if (el) el.animate({ scale: ['1', big ? '1.6' : '1.35', '1'] }, { duration: 360, delay: delay || 0, easing: 'ease-out' });
  }

  // a card changing place across rows, or arriving from a pile or a revealed overlay: a copy flies above everything
  function fly(uid, el, from, to, delay, dur) {
    const gh = ghostOf(el, to);
    el.style.opacity = '0';
    const a = gh.animate({ translate: [`${from.cx - to.cx}px ${from.cy - to.cy}px`, '0 0'], scale: [String(Math.max(.08, from.w / to.w)), '1'] },
      { duration: dur || 380, delay: delay || 0, easing: EASE, fill: 'backwards' });
    flying.set(uid, gh);
    done(a, () => { gh.remove(); if (flying.get(uid) === gh) flying.delete(uid); const cur = cardEls().get(uid); if (cur) cur.style.opacity = ''; });
  }
  // a revealed card shrinking from the overlay onto its place on the table (a copy of the big picture, so it stays sharp)
  function flyFromOver(uid, img, from, el, to, delay) {
    const gh = ghostOf(img, from);
    el.style.opacity = '0'; flying.set(uid, gh);
    const a = gh.animate({ translate: ['0 0', `${to.cx - from.cx}px ${to.cy - from.cy}px`], scale: ['1', String(to.w / from.w)] }, { duration: 460, delay, easing: EASE, fill: 'backwards' });
    done(a, () => { gh.remove(); if (flying.get(uid) === gh) flying.delete(uid); const cur = cardEls().get(uid); if (cur) { cur.style.opacity = ''; pop(cur, 0); } });
  }
  // same row, new place: slide from where it was
  function slide(el, from, to) {
    el.animate({ translate: [`${from.cx - to.cx}px ${from.cy - to.cy}px`, '0 0'], scale: [String(from.w / to.w), '1'] }, { duration: 300, easing: EASE });
  }
  function popIn(el, i) {
    el.animate({ scale: ['.8', '1'], opacity: [0, 1] }, { duration: 300, delay: i * 60, easing: 'cubic-bezier(.3,1.4,.5,1)', fill: 'backwards' });
  }
  // a card leaving the screen: into a pile if it went to one, otherwise it fades where it was
  function leave(old, b, zone, pile, delay) {
    if (!b.vis || ghostCount() > MAX_GHOSTS) return 0;
    const gh = ghostOf(old, b);
    if (pile) {
      const t = box(pile), dx = t.cx - b.cx, dy = t.cy - b.cy;
      const lift = zone === 'hand' ? { translate: '0 -26px', scale: '1.06', filter: 'none' } : zone === 'over' ? { translate: '0 0', scale: '.9', filter: 'none' } : { translate: '0 0', scale: '.92', filter: 'brightness(.55) saturate(.5)' };
      const a = gh.animate([
        { translate: '0 0', scale: '1', opacity: 1, filter: 'none' },
        Object.assign({ opacity: 1, offset: .3 }, lift),
        { translate: `${dx}px ${dy}px`, scale: String(Math.max(.1, 22 / b.w)), opacity: .4, filter: lift.filter }
      ], { duration: 560, delay, easing: 'cubic-bezier(.4,0,.3,1)', fill: 'backwards' });
      done(a, () => gh.remove());
      return delay + 520;                                                                      // when it lands
    }
    const a = zone === 'hand'
      ? gh.animate({ translate: ['0 0', '0 -46px'], scale: ['1', '1.08'], opacity: [1, 0] }, { duration: 420, delay, easing: 'ease-out', fill: 'backwards' })
      : gh.animate({ scale: ['1', '.72'], rotate: ['0deg', '8deg'], opacity: [1, 0], filter: ['none', 'brightness(.5) saturate(.4)'] }, { duration: 460, delay, easing: 'ease-in', fill: 'backwards' });
    done(a, () => gh.remove());
    return 0;
  }
  // a real two-sided turn: the old face turns away and the new one turns in; when a new card replaces the old one
  // (a villain stage), the card's back shows in between. Kept going if the screen is rebuilt half-way.
  const BACK = { encounter: 'img/back/encounter.webp', villain: 'img/back/villain.webp' };   // the original project's card backs (assets/textures)
  const H1 = 160, H2 = 200, HB = 300;
  const turning = new Map();   // uid -> { t0, at }  (when the new face starts turning in)
  const baseT = el => { const t = getComputedStyle(el).transform; return t && t !== 'none' ? ' ' + t : ''; };
  function turnIn2(el, delay) {
    const b = baseT(el);
    el.animate({ transform: [`perspective(700px) rotateY(-90deg)${b}`, `perspective(700px) rotateY(0deg)${b}`] }, { duration: H2, delay, easing: 'ease-out', fill: 'backwards' });
  }
  function turnOver(uid, el, oldEl, from, to, back) {
    if (!from.vis || !to.vis || ghostCount() > MAX_GHOSTS) { turnIn2(el, 0); return; }
    const gh = ghostOf(oldEl, from);
    const mx = to.cx - from.cx, my = to.cy - from.cy, far = Math.abs(mx) + Math.abs(my) > 12;   // e.g. a side scheme that becomes an ally
    done(gh.animate({ transform: ['perspective(700px) translate(0, 0) rotateY(0deg)', `perspective(700px) translate(${far ? mx : 0}px, ${far ? my : 0}px) rotateY(90deg)`] },
      { duration: far ? H1 + 140 : H1, easing: 'ease-in' }), () => gh.remove());
    if (far) { el.style.opacity = '0'; setTimeout(() => { const cur = cardEls().get(uid); if (cur) cur.style.opacity = ''; }, H1 + 140); }
    let at = far ? H1 + 140 : H1;
    if (back) {
      const bk = document.createElement('i'); bk.className = 'fx-back'; bk.style.backgroundImage = `url(${back})`;
      Object.assign(bk.style, { left: (to.cx - to.w / 2) + 'px', top: (to.cy - to.h / 2) + 'px', width: to.w + 'px', height: to.h + 'px' });
      fxLayer().appendChild(bk);
      done(bk.animate({ transform: ['perspective(700px) rotateY(-90deg)', 'perspective(700px) rotateY(0deg)', 'perspective(700px) rotateY(0deg)', 'perspective(700px) rotateY(90deg)'], offset: [0, .35, .6, 1] },
        { duration: HB, delay: H1, easing: 'linear', fill: 'backwards' }), () => bk.remove());
      at = H1 + HB;
    }
    turnIn2(el, at);
    turning.set(uid, { t0: performance.now(), at });
    setTimeout(() => turning.delete(uid), at + H2 + 50);
    return at;
  }
  function tilt(el, ex) {
    el.animate(ex ? { rotate: ['-9deg', '0deg'], filter: ['none', 'brightness(.55) saturate(.6)'] }
                  : { rotate: ['9deg', '0deg'], filter: ['brightness(.55) saturate(.6)', 'none'] }, { duration: 280, easing: EASE });
  }
  function flash(el, color, delay) {
    const f = document.createElement('i'); f.className = 'fx-flash'; f.style.background = color;
    el.appendChild(f);
    done(f.animate({ opacity: [0, .7, 0], offset: [0, .18, 1] }, { duration: 520, delay, easing: 'ease-out', fill: 'backwards' }), () => f.remove());
  }
  function shake(el, delay, px) {
    const d = px || 6;
    el.animate({ translate: ['0 0', `${-d}px 0`, `${d * .8}px 0`, `${-d * .6}px 0`, `${d * .3}px 0`, '0 0'] }, { duration: 360, delay, easing: 'ease-out' });
  }
  function floatNum(el, text, cls, delay) {
    const b = box(el); if (!b.vis) return;
    const t = document.createElement('div'); t.className = 'fx-num ' + cls; t.textContent = text;
    t.style.left = b.cx + 'px'; t.style.top = (b.cy - b.h * 0.12) + 'px';
    fxLayer().appendChild(t);
    done(t.animate([
      { opacity: 0, transform: 'translate(-50%,-50%) scale(.5)' },
      { opacity: 1, transform: 'translate(-50%,-80%) scale(1.2)', offset: .2 },
      { opacity: 1, transform: 'translate(-50%,-120%) scale(1)', offset: .7 },
      { opacity: 0, transform: 'translate(-50%,-170%) scale(1)' }
    ], { duration: 1000, delay, easing: 'ease-out', fill: 'backwards' }), () => t.remove());
  }
  // attacks: the attacker lunges toward its target (a copy in the effect layer, so the row does not cut it off)
  function lunge(uid, el, toward, foe, delay, cls) {
    const b = box(el); if (!b.vis) return;
    let vx = 0, vy = foe ? 1 : -1;
    if (toward) { const t = box(toward); const dx = t.cx - b.cx, dy = t.cy - b.cy, n = Math.hypot(dx, dy) || 1; vx = dx / n; vy = dy / n; }
    const D = Math.min(34, b.h * 0.3);
    const gh = ghostOf(el, b); gh.classList.add('fx-lunge'); if (cls) gh.classList.add(cls);
    const a = gh.animate({ translate: ['0 0', `${vx * D}px ${vy * D}px`, '0 0'], scale: ['1', '1.1', '1'], offset: [0, .38, 1] }, { duration: 420, delay, easing: 'ease-in-out', fill: 'backwards' });
    el.style.visibility = 'hidden'; lunging.set(uid, gh);   // the copy stands in for the card, also across rebuilds
    done(a, () => { gh.remove(); if (lunging.get(uid) === gh) lunging.delete(uid); const cur = cardEls().get(uid); if (cur) cur.style.visibility = ''; });
  }
  // a status chip that was used up or removed breaks apart where it was
  function shatter(chip, b) {
    if (!b.vis) return;
    const gh = chip.cloneNode(true); gh.classList.add('fx-chip');
    Object.assign(gh.style, { left: (b.cx - b.w / 2) + 'px', top: (b.cy - b.h / 2) + 'px', width: b.w + 'px' });
    fxLayer().appendChild(gh);
    done(gh.animate({ scale: ['1', '1.25', '1.5'], rotate: ['0deg', '-4deg', '10deg'], opacity: [1, 1, 0], filter: ['none', 'brightness(1.6)', 'blur(2px)'], offset: [0, .3, 1] }, { duration: 420, easing: 'ease-out' }), () => gh.remove());
  }
  function banner(text, red) {
    const b = document.createElement('div'); b.className = 'fx-banner' + (red ? ' red' : '') + (document.querySelector('#app .reveal') ? ' high' : ''); b.textContent = text; b.setAttribute('aria-hidden', 'true');
    document.body.appendChild(b);   // above the reveal overlay, unlike the card effects
    done(b.animate([
      { opacity: 0, transform: 'translate(-50%,-50%) skewX(-8deg) translateX(-70px)' },
      { opacity: 1, transform: 'translate(-50%,-50%) skewX(-8deg) translateX(0)', offset: .18 },
      { opacity: 1, transform: 'translate(-50%,-50%) skewX(-8deg) translateX(12px)', offset: .78 },
      { opacity: 0, transform: 'translate(-50%,-50%) skewX(-8deg) translateX(70px)' }
    ], { duration: 1150, easing: 'ease-out' }), () => b.remove());
  }
  // comic-book sound effect burst ("쾅!", "격파!", "승리!")
  const STAR = (() => { const pts = []; for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2, r = i % 2 ? 36 : 50; pts.push(`${(50 + r * Math.cos(a)).toFixed(1)}% ${(50 + r * Math.sin(a)).toFixed(1)}%`); } return `polygon(${pts.join(',')})`; })();
  function burst(text, x, y, size, color, delay, top) {
    const w = document.createElement('div'); w.className = 'fx-burst'; w.setAttribute('aria-hidden', 'true');
    const s = document.createElement('i'); s.style.clipPath = STAR; s.style.background = color || 'var(--caption)';
    const t = document.createElement('b'); t.textContent = text; t.style.fontSize = Math.round(size * Math.min(.36, 1.75 / text.length)) + 'px';
    w.append(s, t);
    Object.assign(w.style, { left: x + 'px', top: y + 'px', width: size + 'px', height: size + 'px', zIndex: top ? 37 : '' });
    (top ? document.body : fxLayer()).appendChild(w);
    done(w.animate([
      { opacity: 0, transform: 'translate(-50%,-50%) rotate(-14deg) scale(.2)' },
      { opacity: 1, transform: 'translate(-50%,-50%) rotate(-8deg) scale(1.15)', offset: .22 },
      { opacity: 1, transform: 'translate(-50%,-50%) rotate(-8deg) scale(1)', offset: .7 },
      { opacity: 0, transform: 'translate(-50%,-50%) rotate(-6deg) scale(1.08)' }
    ], { duration: 850, delay: delay || 0, easing: 'ease-out', fill: 'backwards' }), () => w.remove());
  }
  function screenShake(px, delay) {
    const app = document.getElementById('app'); if (!app) return;
    app.animate({ translate: ['0 0', `${-px}px ${px * .4}px`, `${px * .8}px ${-px * .3}px`, `${-px * .5}px 0`, `${px * .2}px 0`, '0 0'] }, { duration: 340, delay: delay || 0, easing: 'ease-out' });
  }
  function confetti(x, y) {
    const cols = ['#ffd23f', '#e5484d', '#3e8ef7', '#3ccf8e', '#fff'];
    for (let i = 0; i < 18; i++) {
      const d = document.createElement('i'); d.className = 'fx-dot'; d.style.background = cols[i % cols.length];
      d.style.left = x + 'px'; d.style.top = y + 'px'; d.style.zIndex = 37;
      document.body.appendChild(d);
      const a = Math.random() * Math.PI * 2, r = 90 + Math.random() * 120;
      done(d.animate({ transform: ['translate(-50%,-50%) scale(1)', `translate(calc(-50% + ${Math.cos(a) * r}px), calc(-50% + ${Math.sin(a) * r + 60}px)) scale(.4)`], opacity: [1, 0] },
        { duration: 900 + Math.random() * 300, easing: 'cubic-bezier(.1,.7,.3,1)' }), () => d.remove());
    }
  }
  // boost overlay: the cards turn over one by one and the total counts up with them
  function boostCount(g) {
    const imgs = [...document.querySelectorAll('#app .reveal .boosts img')], big = document.querySelector('#app .reveal .big');
    if (!imgs.length || !big) return;
    const total = parseInt(big.textContent.replace(/[^0-9-]/g, ''), 10) || 0;
    const per = imgs.map(im => { try { return g.boostOf(im.dataset.fxuid) || 0; } catch (e) { return 0; } });
    const STEP = 230;
    big.textContent = '+0';
    imgs.forEach((im, i) => {
      im.animate({ rotate: ['y 90deg', 'y 0deg'], opacity: [0, 1] }, { duration: 260, delay: i * STEP, easing: EASE, fill: 'backwards' });
      setTimeout(() => {
        if (!big.isConnected) return;
        const sum = i === imgs.length - 1 ? total : Math.min(total, per.slice(0, i + 1).reduce((a, b) => a + b, 0));
        big.textContent = '+' + sum; pop(big, 0, true);
      }, i * STEP + 200);
    });
  }
  // one steady pulse on whatever is about to lose the game: the hero's health or the main scheme
  function danger(g, now) {
    for (const el of document.querySelectorAll('#app .fx-danger')) el.classList.remove('fx-danger');
    if (!enabled() || g.s.phase === 'over') return;
    let pick = null, best = 0;
    try {
      const fAll = g.players > 1 ? g.forecastAll() : null;
      if (g.e.main && g.s.phase === 'player') {
        const f = fAll || g.forecast();
        const t = f.target - f.after, tu = t <= 0 ? 2 : (f.after / f.target >= .75 ? 1 : 0);
        if (tu > best) { best = tu; pick = g.e.main; }
      }
      for (const pi of g.livingPlayers()) {
        const id = g.idt(pi);
        if (!now.has(id)) continue;
        const left = g.hpLeft(id), max = g.maxHp(id);
        let u = left <= Math.ceil(max / 3) ? 1 : 0;
        if (g.e.main && g.s.phase === 'player') {
          const f = fAll ? fAll.perPlayer.find(x => x.pi === pi) : g.forecast();
          if (f && f.hero && f.atk >= left) u = 2;
        }
        if (u > best || (u && u === best && pick === null)) { best = u; pick = id; }
      }
    } catch (e) { return; }
    if (!pick) return;
    const el = now.get(pick); if (!el || el.classList.contains('cand')) return;
    const phase = `-${Math.round(performance.now() % 1400)}ms`;   // keep the beat steady across rebuilds
    el.classList.add('fx-danger'); el.style.animationDelay = phase;
    if (g.identityPlayer(pick) >= 0) { const chip = el.closest('.slot') && el.closest('.slot').querySelector('.chip.hp'); if (chip) { chip.classList.add('fx-danger'); chip.style.animationDelay = phase; } }
  }

  // ---------------------------------------------------------------- reveal, payment, thwart/impact, zoom, transform, nemesis, ambience
  // 1. an encounter card comes face down from the encounter deck and turns over in the air
  const FLY = 330, TURN = 200;
  let revealing = null, zooming = null;   // effects that must survive the overlay or sheet being rebuilt mid-way
  function turnIn(img, delay) {
    img.animate({ rotate: ['y -90deg', 'y 0deg'], filter: ['brightness(1.8)', 'none'] }, { duration: TURN, delay, easing: 'ease-out', fill: 'backwards' });
  }
  function revealFromDeck(img, deck) {
    const to = box(img); if (!to.vis) return;
    revealing = { uid: img.dataset.fxuid, t0: performance.now() };
    const from = deck ? box(deck) : { cx: to.cx, cy: -to.h };
    const back = document.createElement('div'); back.className = 'fx-cardback'; back.setAttribute('aria-hidden', 'true');
    back.style.backgroundImage = `url(${BACK.encounter})`;
    Object.assign(back.style, { left: (to.cx - to.w / 2) + 'px', top: (to.cy - to.h / 2) + 'px', width: to.w + 'px', height: to.h + 'px' });
    document.body.appendChild(back);
    done(back.animate({ translate: [`${from.cx - to.cx}px ${from.cy - to.cy}px`, '0 0', '0 0'], scale: [String(Math.max(.08, 24 / to.w)), '1.04', '1'], rotate: ['y 0deg', 'y 0deg', 'y 90deg'], offset: [0, .72, 1] },
      { duration: FLY, easing: 'cubic-bezier(.3,.6,.3,1)' }), () => back.remove());
    turnIn(img, FLY);
  }
  // 2. resource orbs leave the cards and abilities that paid and merge into the card being paid for
  const RES_GLYPH = { R: 'P', B: 'M', Y: 'E', G: 'W' }, RES_COL = { R: '#e5484d', B: '#3e8ef7', Y: '#f5c518', G: '#33b36b' };
  function payOrbs(g, pay, snap, now) {
    const orbs = [], letters = pay.letters.slice();
    for (const u of pay.cards) {
      const s = snap.cards.get(u), n = Math.max(1, ((g.d(u) || {}).res || '').length);
      for (let i = 0; i < n && letters.length; i++) orbs.push({ l: letters.shift(), from: s ? s.b : null });
    }
    for (const u of pay.abil) if (letters.length) { const el = now.get(u), s = snap.cards.get(u); orbs.push({ l: letters.shift(), from: el ? box(el) : s ? s.b : null }); }
    const idEl = now.get(g.idt());
    while (letters.length) orbs.push({ l: letters.shift(), from: idEl ? box(idEl) : null });
    const tEl = now.get(pay.forUid), ts = snap.cards.get(pay.forUid);
    const to = tEl ? box(tEl) : ts ? { cx: ts.b.cx, cy: ts.b.cy - 26, w: ts.b.w, h: ts.b.h, vis: true } : { cx: innerWidth / 2, cy: innerHeight * .6, w: 60, h: 80, vis: true };
    let end = 0;
    orbs.slice(0, 8).forEach((o, i) => {
      if (!o.from) return;
      const orb = document.createElement('span'); orb.className = 'ri fx-orb ' + o.l;
      orb.innerHTML = `<i class="mi">${RES_GLYPH[o.l] || ''}</i>`;
      orb.style.left = o.from.cx + 'px'; orb.style.top = (o.from.cy - o.from.h * .25) + 'px';
      fxLayer().appendChild(orb);
      const dx = to.cx - o.from.cx, dy = (to.cy - o.from.cy + o.from.h * .25), lift = -Math.min(90, 40 + Math.abs(dx) * .15);
      const delay = 120 + i * 70, dur = 460;
      done(orb.animate({ transform: ['translate(-50%,-50%) scale(.4)', `translate(calc(-50% + ${dx * .45}px), calc(-50% + ${dy * .45 + lift}px)) scale(1.2)`, `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.6)`], opacity: [0, 1, .9], offset: [0, .45, 1] },
        { duration: dur, delay, easing: 'cubic-bezier(.4,0,.3,1)', fill: 'backwards' }), () => orb.remove());
      end = Math.max(end, delay + dur);
    });
    if (tEl && end) { setTimeout(() => { const cur = cardEls().get(pay.forUid); if (cur) { pop(cur, 0); flash(cur, RES_COL[pay.letters[0]] || '#fff', 0); } }, end); }
  }
  // 3a. thwarting: two blue slashes cut across the scheme, drawn above the board so the row never hides them
  function slash(el, delay) {
    const b = box(el); if (!b.vis) return;
    const len = Math.hypot(b.w, b.h) * 1.25;
    [[-28, -.12], [-28, .14]].forEach(([deg, off], i) => {
      const d = document.createElement('i'); d.className = 'fx-slash';
      Object.assign(d.style, { left: (b.cx - len / 2) + 'px', top: (b.cy + off * b.h) + 'px', width: len + 'px', height: Math.max(6, b.h * .07) + 'px' });
      fxLayer().appendChild(d);
      done(d.animate([
        { transform: `rotate(${deg}deg) scaleX(0)`, opacity: 1 },
        { transform: `rotate(${deg}deg) scaleX(1)`, opacity: 1, offset: .35 },
        { transform: `rotate(${deg}deg) scaleX(1) scaleY(.4)`, opacity: 0 }
      ], { duration: 420, delay: delay + i * 70, easing: 'ease-out', fill: 'backwards' }), () => d.remove());
    });
  }
  // 3b. a hit lands: comic action lines burst out of the card
  function impact(el, delay) {
    const b = box(el); if (!b.vis) return;
    const d = document.createElement('i'); d.className = 'fx-impact';
    const size = Math.max(b.w, b.h) * 1.5;
    Object.assign(d.style, { left: b.cx + 'px', top: b.cy + 'px', width: size + 'px', height: size + 'px' });
    fxLayer().appendChild(d);
    done(d.animate({ transform: ['translate(-50%,-50%) scale(.45) rotate(0deg)', 'translate(-50%,-50%) scale(1.25) rotate(8deg)'], opacity: [1, 0] }, { duration: 340, delay, easing: 'ease-out', fill: 'backwards' }), () => d.remove());
  }
  // 4. card zoom: the picture grows out of the card on the table, and shrinks back into it
  function zoomFly(img, from, to, open) {
    const gh = img.cloneNode(true); gh.className = img.classList.contains('rot90') ? 'fx-zoom rot90' : 'fx-zoom'; gh.removeAttribute('data-fxuid'); gh.style.opacity = '';
    Object.assign(gh.style, { left: (to.cx - to.w / 2) + 'px', top: (to.cy - to.h / 2) + 'px', width: to.w + 'px', height: to.h + 'px' });
    document.body.appendChild(gh);
    const uid = img.dataset.fxuid;
    if (open) { img.style.opacity = '0'; zooming = uid; }
    const a = gh.animate({ translate: [`${from.cx - to.cx}px ${from.cy - to.cy}px`, '0 0'], scale: [String(from.w / to.w), '1'] }, { duration: open ? 170 : 140, easing: EASE, direction: open ? 'normal' : 'reverse' });
    done(a, () => {
      gh.remove(); if (!open) return;
      if (zooming === uid) zooming = null;
      const cur = document.querySelector(`#app .sheet .full[data-fxuid="${uid}"]`); if (cur) cur.style.opacity = '';
    });
  }
  // 6. a nemesis arrives: red lightning crackles around the card
  function bolt(b, onTop) {
    if (!b.vis) return;
    const d = document.createElement('i'); d.className = 'fx-bolt';
    d.innerHTML = '<svg viewBox="0 0 20 100" preserveAspectRatio="none" class="l"><polyline points="10,0 3,22 14,38 4,58 15,74 6,100"/></svg><svg viewBox="0 0 20 100" preserveAspectRatio="none" class="r"><polyline points="10,0 17,20 6,40 16,60 5,78 14,100"/></svg>';
    Object.assign(d.style, { left: (b.cx - b.w / 2 - 6) + 'px', top: (b.cy - b.h / 2 - 6) + 'px', width: (b.w + 12) + 'px', height: (b.h + 12) + 'px' });
    (onTop ? document.body : fxLayer()).appendChild(d);
    setTimeout(() => d.remove(), 1500);
  }
  // 7. villain phase: a red glow gathers at the edges of the screen, and fades when the players' turn comes back
  function ambience(phase) {
    let a = document.getElementById('fx-ambient');
    if (!a) { a = document.createElement('div'); a.id = 'fx-ambient'; a.setAttribute('aria-hidden', 'true'); document.body.appendChild(a); }
    a.classList.toggle('on', enabled() && phase === 'villain');
  }

  // ---------------------------------------------------------------- statuses drawn on the cards themselves
  // tough: a yellow honeycomb shield with a passing shine; stunned: a purple aura with stars circling the top of the
  // card; confused: a teal swirl with bobbing question marks. They are redrawn after every rebuild with their loops
  // set to the running clock, so a rebuild never makes them jump back to the start.
  // an Archimedean spiral, two and a half turns, drawn once
  const SPIRAL = (() => { let d = ''; for (let t = 0; t <= Math.PI * 5; t += .15) { const r = 3 + t * 2.75; d += (d ? ' L' : 'M') + (r * Math.cos(t)).toFixed(1) + ' ' + (r * Math.sin(t)).toFixed(1); } return d; })();
  const ST = {
    tough: { cls: 'fx-tough', color: '#ffd23f', word: '강인', html: '<i class="fx-shine" data-p="2600"></i>' },
    stun:  { cls: 'fx-stun',  color: '#a86bff', word: '기절!', html: '<i class="fx-aura" data-p="1500"></i><i class="fx-ring"><i class="fx-star" data-p="1500" data-k="0">★</i><i class="fx-star" data-p="1500" data-k="1">★</i><i class="fx-star" data-p="1500" data-k="2">★</i></i>' },
    conf:  { cls: 'fx-conf',  color: '#2fd3c8', word: '혼란!', html: `<i class="fx-swirl" data-p="2400"><svg viewBox="-50 -50 100 100" aria-hidden="true"><path class="o" d="${SPIRAL}"/><path class="i" d="${SPIRAL}"/></svg></i><i class="fx-q a" data-p="1800" data-k="0">?</i><i class="fx-q b" data-p="1800" data-k="1">?</i>` }
  };
  const KINDS = ['tough', 'stun', 'conf'];
  function drawStatus(g, now) {
    const t = performance.now(), made = new Map();
    for (const [uid, el] of now) {
      const c = g.c(uid) || {};
      for (const kind of KINDS) {
        if (!c[kind]) continue;
        const S = ST[kind], o = document.createElement('i');
        o.className = 'fx-st ' + S.cls; o.setAttribute('aria-hidden', 'true'); o.innerHTML = S.html;
        o.style.setProperty('--w', (el.offsetWidth || 60) + 'px');
        for (const a of o.querySelectorAll('[data-p]')) {
          const p = +a.dataset.p, n = a.classList.contains('fx-star') ? 3 : 2;
          a.style.animationDelay = `-${Math.round((t + (+a.dataset.k || 0) * p / n) % p)}ms`;
        }
        el.appendChild(o);
        made.set(uid + ':' + kind, o);
      }
    }
    return made;
  }
  function gainStatus(kind, el, ov) {
    const S = ST[kind];
    flash(el, S.color, 0); floatNum(el, S.word, 'st-' + kind, 0);
    if (!ov) return;
    if (kind === 'tough') ov.animate({ scale: ['1.35', '1'], opacity: [0, 1] }, { duration: 420, easing: 'cubic-bezier(.3,1.4,.5,1)' });
    else if (kind === 'stun') { ov.animate({ translate: ['0 -20px', '0 0'], opacity: [0, 1] }, { duration: 380, easing: EASE }); shake(el, 0, 4); }
    else ov.animate({ scale: ['.3', '1'], rotate: ['-200deg', '0deg'], opacity: [0, 1] }, { duration: 480, easing: EASE });
  }
  // the status is gone: the shield shatters, the stars scatter, the question marks fly off
  function loseStatus(kind, el) {
    const b = box(el); if (!b.vis) return;
    const S = ST[kind];
    flash(el, S.color, 0);
    if (kind === 'tough') {                                    // the shield itself bursts outward as it breaks
      const sh = document.createElement('i'); sh.className = 'fx-st fx-tough fx-loose';
      Object.assign(sh.style, { left: (b.cx - b.w / 2 - 5) + 'px', top: (b.cy - b.h / 2 - 5) + 'px', width: (b.w + 10) + 'px', height: (b.h + 10) + 'px' });
      fxLayer().appendChild(sh);
      done(sh.animate({ scale: ['1', '1.18'], opacity: [1, 0] }, { duration: 260, easing: 'ease-out' }), () => sh.remove());
    }
    const n = kind === 'tough' ? 12 : kind === 'stun' ? 3 : 5;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i'); p.className = 'fx-shard fx-shard-' + kind;
      if (kind === 'conf') p.textContent = '?';
      const a = i / n * Math.PI * 2 + Math.random() * .4;
      const x = kind === 'tough' ? b.cx + Math.cos(a) * b.w * .52 : kind === 'stun' ? b.cx + Math.cos(a) * b.w * .3 : b.cx + (Math.random() - .5) * b.w * .6;
      const y = kind === 'tough' ? b.cy + Math.sin(a) * b.h * .52 : kind === 'stun' ? b.cy - b.h * .36 + Math.sin(a) * b.w * .09 : b.cy - b.h * .2 + (Math.random() - .5) * b.h * .3;
      p.style.left = x + 'px'; p.style.top = y + 'px';
      fxLayer().appendChild(p);
      const ang = Math.atan2(y - b.cy, x - b.cx) + (Math.random() - .5) * .6, dist = 26 + Math.random() * 34, up = kind === 'stun' ? -14 : kind === 'conf' ? -8 : 10;
      done(p.animate({
        transform: ['translate(-50%,-50%) rotate(0deg) scale(1)', `translate(calc(-50% + ${(Math.cos(ang) * dist).toFixed(1)}px), calc(-50% + ${(Math.sin(ang) * dist + up).toFixed(1)}px)) rotate(${Math.round((Math.random() - .5) * 360)}deg) scale(.45)`],
        opacity: [1, 0]
      }, { duration: 520 + Math.random() * 180, easing: 'cubic-bezier(.2,.7,.3,1)' }), () => p.remove());
    }
  }

  // ---------------------------------------------------------------- the two hooks ui.js calls around a rebuild
  function before(g) {
    if (!enabled() || !g) return null;
    const cards = new Map();
    for (const [uid, el] of cardEls()) cards.set(uid, { el, b: box(el), zone: zoneOf(el), chips: chipsOf(el).map(c => ({ el: c, t: c.textContent, b: box(c) })) });
    const over = [...document.querySelectorAll('#app .reveal img[data-fxuid]')].map(im => ({ uid: im.dataset.fxuid, el: im, b: box(im) }));
    const zi = document.querySelector('#app .sheet .full[data-fxuid]');
    const zoom = zi ? { uid: zi.dataset.fxuid, el: zi, b: box(zi) } : null;
    return { cards, over, zoom, piles: pileText(piles()), boosts: !!document.querySelector('#app .reveal .boosts'),
      ttl: (document.querySelector('#app .reveal .ttl') || {}).textContent || '' };
  }

  function after(g, snap) {
    const now = cardEls();
    const vals = new Map(); for (const uid of now.keys()) vals.set(uid, stateOf(g, uid));
    const old = last;
    last = { g, vals, phase: g.s.phase, round: g.s.round, ctx: g.s.ctx };
    for (const [uid] of flying) { const el = now.get(uid); if (el) el.style.opacity = '0'; }
    for (const [uid] of lunging) { const el = now.get(uid); if (el) el.style.visibility = 'hidden'; }
    const atk = attacks.splice(0);
    danger(g, now);
    const made = enabled() ? drawStatus(g, now) : new Map();
    ambience(g.s.phase);
    const paid = pays.splice(0);
    if (!snap || !old || old.g !== g || !enabled()) return;   // first frame of a game, a loaded save or undo: nothing to compare
    if (document.hidden) return;

    const P = piles(), handled = new Set();
    const pileFor = uid => { const z = (g.c(uid) || {}).zone; return z === 'discard' ? P.discard : z === 'ediscard' ? P.ediscard : z === 'deck' ? P.deck : z === 'edeck' ? P.edeck : null; };

    // 1. revealed encounter / boost cards: when their overlay closes they fly to where they ended up
    const overNow = new Set([...document.querySelectorAll('#app .reveal img[data-fxuid]')].map(im => im.dataset.fxuid));
    snap.over.forEach((o, i) => {
      if (overNow.has(o.uid) || !o.b.vis) return;
      const el = now.get(o.uid);
      if (el) { const to = box(el); if (to.vis) flyFromOver(o.uid, o.el, o.b, el, to, i * 70); }
      else leave(o.el, o.b, 'over', pileFor(o.uid), i * 90);
      handled.add(o.uid);
    });
    if (!snap.boosts && document.querySelector('#app .reveal .boosts')) boostCount(g);
    // effects in flight when the overlay or sheet was rebuilt: pick them up on the new elements
    if (revealing) {
      const el = performance.now() - revealing.t0, im = document.querySelector(`#app .reveal > img[data-fxuid="${revealing.uid}"]`);
      if (el >= FLY + TURN || !im) revealing = null;
      else if (snap.over.some(o => o.uid === revealing.uid)) turnIn(im, FLY - el);
    }
    if (zooming) { const im = document.querySelector(`#app .sheet .full[data-fxuid="${zooming}"]`); if (im) im.style.opacity = '0'; }
    for (const [uid, t] of turning) { const el = now.get(uid), left = t.at - (performance.now() - t.t0); if (el && snap.cards.has(uid) && left > -H2) turnIn2(el, left); }
    // a newly opened reveal: the card comes out of the encounter deck; a nemesis gets lightning and a banner
    const oldOver = new Set(snap.over.map(o => o.uid));
    for (const im of document.querySelectorAll('#app .reveal > img[data-fxuid]')) {
      if (oldOver.has(im.dataset.fxuid)) continue;
      revealFromDeck(im, P.edeck);
      if ((g.d(im.dataset.fxuid) || {}).nemesis) { setTimeout(() => { if (im.isConnected) bolt(box(im), true); }, 530); banner('네메시스 등장!', true); }
    }
    // card zoom opening / closing
    const zi = document.querySelector('#app .sheet .full[data-fxuid]');
    if (zi && (!snap.zoom || snap.zoom.uid !== zi.dataset.fxuid)) {
      const src = now.get(zi.dataset.fxuid) || (snap.cards.get(zi.dataset.fxuid) || {}).el;
      if (src) { const to = box(zi); if (document.querySelector('#app .scrim.anim')) to.cy -= 24; const from = box(src); if (from.vis && to.vis) zoomFly(zi, from, to, true); }
    } else if (!zi && snap.zoom) {
      const dst = now.get(snap.zoom.uid);
      if (dst) { const to = box(dst); if (to.vis) zoomFly(snap.zoom.el, to, snap.zoom.b, false); }
    }
    // resource orbs
    for (const pay of paid.slice(0, 3)) payOrbs(g, pay, snap, now);

    // 2. attacks first; damage lands as the lunge hits
    let hitAt = 0;
    atk.slice(0, 4).forEach((a, i) => {
      const el = now.get(a.src); if (!el) return;
      const toward = a.target ? now.get(a.target) : document.querySelector('#app .idslot .card');
      lunge(a.src, el, a.foe ? toward : (toward || document.querySelector('#app .enemy .card.big')), a.foe, i * 260);
      hitAt = i * 260 + 160;
    });
    let thwAt = 0;
    thwarts.splice(0).slice(0, 3).forEach((t, i) => {
      const el = now.get(t.src), sc = now.get(t.target); if (!el) return;
      lunge(t.src, el, sc || document.querySelector('#app .mainslot .card'), false, i * 240, 'fx-thw');
      thwAt = i * 240 + 150;
    });

    // 3. cards still on screen: moved, flipped, tilted, hurt, healed, threatened, status changes
    const fresh = [];
    for (const [uid, el] of now) {
      const s = snap.cards.get(uid), v = vals.get(uid), o = old.vals.get(uid);
      if (!s) { if (!handled.has(uid)) fresh.push([uid, el]); continue; }
      const to = box(el), zone = zoneOf(el);
      if (!handled.has(uid)) {
        if (o && o.id && v.id && o.id !== v.id) {
          // hero <-> alter-ego and flipped schemes turn over; a new villain stage comes in via the villain card back
          const type = (g.d(uid) || {}).type;
          const sameCard = o.id.replace(/[a-z]$/, '') === v.id.replace(/[a-z]$/, '');   // 01097a -> 01097b is the same card's other side
          turnOver(uid, el, s.el, s.b, to, type === 'villain' && !sameCard ? BACK.villain : null);
          if (type === 'villain' && v.dmg < o.dmg) { burst('K.O.!', to.cx + to.w * .55, to.cy - to.h * .32, 118, 'var(--caption)', 40); screenShake(7, 40); }   // beside the card, so the turn stays visible
        }
        else if (zone !== s.zone && s.b.vis && to.vis) fly(uid, el, s.b, to);
        else if (Math.abs(s.b.cx - to.cx) + Math.abs(s.b.cy - to.cy) > 3 || Math.abs(s.b.w - to.w) > 2) slide(el, s.b, to);
      }
      // status chips: new ones pop in, used-up ones break apart
      const was = new Map(s.chips.map(c => [c.t, c])), cur = chipsOf(el);
      for (const c of cur) if (!was.has(c.textContent)) pop(c, 0, true);
      const curT = new Set(cur.map(c => c.textContent));
      for (const [t, c] of was) if (!curT.has(t)) shatter(c.el, c.b);   // the chip fades out while the card effect breaks
      if (!o || o.id !== v.id) continue;
      for (const k of KINDS) { if (v[k] && !o[k]) gainStatus(k, el, made.get(uid + ':' + k)); else if (!v[k] && o[k]) loseStatus(k, el); }
      if (v.ex !== o.ex) tilt(el, v.ex);
      const slot = el.closest('.slot');
      if (v.dmg > o.dmg) {
        const n = v.dmg - o.dmg;
        flash(el, '#ff2d3a', hitAt); shake(el, hitAt); impact(el, hitAt); floatNum(el, '-' + n, 'dmg', hitAt); pop(el.querySelector('.badge.dmg'), hitAt); pop(slot && slot.querySelector('.chip.hp'), hitAt);
        if (n >= 3) { burst(n >= 5 ? 'KA-BOOM!' : 'POW!', to.cx + to.w * .3, to.cy - to.h * .25, n >= 5 ? 112 : 92, '#fff', hitAt); screenShake(n >= 5 ? 6 : 3, hitAt); }
      }
      else if (v.dmg < o.dmg) { flash(el, '#3ccf8e', 0); floatNum(el, '+' + (o.dmg - v.dmg), 'heal', 0); pop(slot && slot.querySelector('.chip.hp'), 0); }
      if (v.thr > o.thr) { flash(el, '#ffae2b', 0); floatNum(el, '+' + (v.thr - o.thr), 'thr', 0); pop(el.querySelector('.badge.thr'), 0); }
      else if (v.thr < o.thr) { slash(el, thwAt); flash(el, '#3e8ef7', thwAt + 60); floatNum(el, '-' + (o.thr - v.thr), 'thw', thwAt); pop(el.querySelector('.badge.thr'), thwAt); }
    }

    // a card swapped for its other side as a separate card (e.g. a side scheme that becomes an ally): one turn, not a leave + an arrival
    const goneByBase = new Map();
    for (const [uid, s] of snap.cards) if (!now.has(uid) && !handled.has(uid)) { const ov = old.vals.get(uid); if (ov && /[a-z]$/.test(ov.id || '')) goneByBase.set(ov.id.slice(0, -1), { uid, s, id: ov.id }); }
    for (let i = fresh.length - 1; i >= 0; i--) {
      const [uid, el] = fresh[i], id = (g.c(uid) || {}).id || '', m = /[a-z]$/.test(id) && goneByBase.get(id.slice(0, -1));
      if (m && m.id !== id) { turnOver(uid, el, m.s.el, m.s.b, box(el), null); handled.add(m.uid); fresh.splice(i, 1); }
    }
    // 4. new cards: drawn ones fly out of the deck counter, others pop in where they are
    if (fresh.length && fresh.length <= 10) {
      let d = 0, p = 0;
      for (const [uid, el] of fresh) {
        const zone = zoneOf(el), to = box(el);
        if (zone === 'hand' && P.deck && to.vis && ghostCount() < MAX_GHOSTS) { const from = box(P.deck); fly(uid, el, { cx: from.cx, cy: from.cy, w: 22, h: 30 }, to, d++ * 80, 420); }
        else { popIn(el, p++); if ((g.d(uid) || {}).nemesis) bolt(to, false); }
      }
    }
    // 5. cards that left the screen: into their pile, or fading where they were
    let gone = 0, landed = 0;
    for (const [uid, s] of snap.cards) {
      if (now.has(uid) || handled.has(uid) || gone >= 8) continue;
      landed = Math.max(landed, leave(s.el, s.b, s.zone, pileFor(uid), gone++ * 70));
    }
    // 6. pile counters: pop when their number changes (when the cards arrive, for discards)
    for (const k of Object.keys(P)) if (P[k] && snap.piles[k] != null && P[k].textContent !== snap.piles[k]) pop(P[k], /discard/.test(k) ? Math.max(0, landed - 60) : 0, true);

    // 7. phase and player turn changes and the end of the game
    if (old.phase !== g.s.phase) {
      if (g.s.phase === 'villain') banner('빌런 단계', true);
      else if (g.s.phase === 'player') banner(`라운드 ${g.s.round} · 플레이어 단계`, false);
    } else if (g.players > 1 && old.ctx !== g.s.ctx) {
      if (g.s.phase === 'player') banner(`${g.playerName(g.s.ctx)}의 차례`, false);
      else if (g.s.phase === 'villain' && atk.some(a => a.foe)) banner(`빌런 → ${g.playerName(g.s.ctx)}`, true);
    }
    const ttl = document.querySelector('#app .reveal .ttl');
    if (ttl && ttl.textContent !== snap.ttl) {
      const b = box(ttl);
      if (ttl.textContent === '승리!') { burst('VICTORY!', b.cx, b.cy, 220, 'var(--caption)', 60, true); confetti(b.cx, b.cy); }
      else if (ttl.textContent === '패배') {
        screenShake(9, 0);
        const v = document.createElement('div'); v.className = 'fx-vignette'; document.body.appendChild(v);
        done(v.animate({ opacity: [0, .9, 0] }, { duration: 1100, easing: 'ease-out' }), () => v.remove());
      }
    }
  }

  // ---------------------------------------------------------------- on/off switch (start screen)
  const isOn = () => enabled();
  const label = () => (RM && RM.matches) ? '애니메이션 효과: 꺼짐 (기기의 동작 줄이기 설정)' : `애니메이션 효과: ${on ? '켬' : '끔'}`;
  document.addEventListener('click', ev => {
    const b = ev.target.closest && ev.target.closest('.fx-toggle'); if (!b) return;
    on = !on; try { localStorage.setItem('mc.fx', on ? 'on' : 'off'); } catch (e) { /* ignore */ }
    if (!on && layer) for (const n of [...layer.children]) n.remove();
    ambience(last ? last.phase : '');
    b.textContent = label(); b.classList.toggle('on', isOn()); b.setAttribute('aria-pressed', String(isOn()));
  });

  MC.fx = { before, after, isOn, label };
})();
