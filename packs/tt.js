/* Trickster Takeover (55001-55066): Enchantress, Loki God of Lies, Trickster Magic modular.
   Ported from cards/pack/tt of the community build. God of Lies is played solo: the pod rules ("any player in your pod") apply to your own game. */
(function () {
  'use strict';
  const S = {};
  const idOf = (g, u) => g.c(u).id;
  const tr = (g, u, t) => (g.d(u).tr || []).includes(t) || g.hasTrait(u, t);
  const pick = async (g, cands, title) => !cands.length ? null : cands.length === 1 ? cands[0] : await g.ask({ type: 'target', title, cands, cancelable: false });
  const fd = (g, n) => { for (let i = 0; i < (n || 1); i++) { const x = g.takeEncounter(); if (x) g.put(x, 'facedown'); } };
  const exp = g => !!g.s.scen.expert;
  const burnMine = async (g, n) => { for (let i = 0; i < n; i++) { if (!g.p.deck.length) await g.reshuffleDeck(); const x = g.p.deck[0]; if (!x) break; g.put(x, 'discard'); } };
  const discardControlled = async (g, why) => { const c = g.controlled().filter(x => !g.d(x).enc && !g.d(x).permanent); const t = await pick(g, c, `${why}: 버릴 카드`); if (t) { g.discard(t, `${g.nm(t)} 버림`); return true; } return false; };
  const encTop = (g, n) => { const out = []; for (let i = 0; i < n; i++) { const x = g.takeEncounter(); if (!x) break; g.put(x, 'ediscard'); out.push(x); } return out; };
  const isTreach = (g, x) => !!x && g.d(x).type === 'treachery';

  // ======================= Enchantress =======================
  const ench = g => g.e.villain && ['55001', '55002', '55003'].includes(idOf(g, g.e.villain)) ? g.e.villain : null;
  const enchantment = g => g.c(g.idt()).att.find(a => tr(g, a, 'ENCHANTMENT')) || null;
  const enthralled = g => g.hasTrait(g.idt(), 'ENTHRALLED');
  const defiant = g => g.hasTrait(g.idt(), 'DEFIANT');
  async function charm(g, n) { // place charm counters on the Enchantment card in your play area
    for (let i = 0; i < (n || 1); i++) {
      const m = g.e.main; if (m && enthralled(g) && (MC.scripts[idOf(g, m)] || {}).charmToThreat) { g.log('매혹 대신 주 음모에 위협 1', 'warn'); await g.placeThreat(m, 1, {}); continue; }
      const e = enchantment(g); if (!e) return; const c = g.c(e); c.cnt.charm = (c.cnt.charm || 0) + 1; g.log(`${g.nm(e)}: 매혹 카운터 ${c.cnt.charm}`, 'warn');
      if (idOf(g, e).endsWith('a') && c.cnt.charm >= 5) { c.cnt.charm = 0; c.id = c.id.slice(0, -1) + 'b'; g.log(`최면의 시선이 뒤집힙니다: ${g.nm(e)}`, 'warn'); await g.show({ type: 'reveal', uid: e, title: '최면' }); const w = (MC.scripts[c.id] || {}).whenRevealed; if (w) await w(g, e, { surge: 0 }); }
    }
  }
  MC.tt = { charm };
  const enchV = extra => Object.assign({ on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u) await charm(g, 1); } } }, extra);
  const despair = g => (g.e.aside || []).find(x => idOf(g, x) === '55006') || null;
  S['55001'] = enchV({});
  S['55002'] = enchV({ async whenRevealed(g) { if (exp(g)) return; const f = despair(g); if (f) { await g.enterSide(f, {}); g.c(f).threat += 3 * g.players; } } });
  S['55003'] = enchV({ async whenRevealed(g) { const f = despair(g); if (f) { await g.enterSide(f, {}); g.c(f).threat += 4 * g.players; } } });
  S['55004a'] = { setup(g) { const gz = (g.e.aside || []).filter(x => /^5500[7-9]a$|^55010a$|^55011a$/.test(idOf(g, x))); g.shuffle(gz); for (const pi of g.livingPlayers()) { const t = gz.shift(); if (!t) break; g.attachEnc(t, g.idt(pi)); g.log(`최면의 시선 → ${g.playerName(pi)}`, 'warn'); } } }; // Prime Real Estate
  S['55004b'] = { charmToThreat: true };
  S['55005a'] = { async whenRevealed(g) { const cr = ench(g) && g.c(ench(g)).att.find(a => idOf(g, a) === '55016'); if (cr) { for (const pi of g.livingPlayers()) g.giveStatus(g.idt(pi), 'stun', '군림하는 마녀'); } else { const x = g.e.deck.concat(g.e.discard).find(y => idOf(g, y) === '55016'); g.shuffle(g.e.deck); if (x) await g.reveal(x); } } };
  S['55005b'] = { charmToThreat: true, loseOnComplete: true };
  S['55006'] = { stalwartFor: (g, s, t) => g.c(s).zone === 'side' && t === ench(g), async whenRevealed(g) { await g.forEachPlayer(() => charm(g, 1)); } }; // Future of Despair
  for (const id of ['55001', '55002', '55003']) S[id].cannotTakeDamage = g => g.e.sides.some(x => idOf(g, x) === '55006');
  // Hypnotic Gaze (a) / Trances (b)
  S['55007a'] = { permanent: true, grantTrait: (g, s, t) => g.c(s).zone === 'attach' && t === g.c(s).on ? 'DEFIANT' : null };
  const trance = (wr, act, label) => ({ permanent: true, grantTrait: (g, s, t) => g.c(s).zone === 'attach' && t === g.c(s).on ? 'ENTHRALLED' : null, whenRevealed: wr,
    actions: [{ timing: 'action', label: `강제 행동: ${label}`, can: (g, u) => g.c(u).zone === 'attach' && g.c(u).on === g.idt() && !g.c(u).ex, async use(g, u) { g.c(u).ex = true; await act(g, u); } }],
    on: { async playerPhaseEnd(g, u) { if (g.c(u).zone === 'attach' && g.c(u).on === g.idt() && !g.c(u).ex) { g.log(`${g.nm(u)}: 강제 행동`, 'warn'); g.c(u).ex = true; await act(g, u); } } } });
  S['55007b'] = trance(async g => { if (!(await discardControlled(g, '질투의 무아지경'))) await burnMine(g, 8); }, async g => { const v = ench(g) || g.e.villain; if (v) { g.c(v).fdBoost = (g.c(v).fdBoost || 0) + 1; } if (g.canReady(g.idt())) g.c(g.idt()).ex = false; }, '인챈트리스에게 강화 카드 1장, 정체성 준비'); // Envy
  S['55008b'] = trance(async g => { if (!g.c(g.idt()).conf) g.giveStatus(g.idt(), 'conf', '탐욕의 무아지경'); else await g.dealDamage(g.idt(), 2, {}); }, async g => { const before = g.p.hand.slice(); await g.draw(1); const x = g.p.hand.find(y => !before.includes(y)); if (x && g.canPlay(x)) await g.playCard(x); else await g.dealDamage(g.idt(), 1, {}); }, '카드 1장을 뽑아 바로 플레이 (못 하면 피해 1)'); // Greed
  S['55009b'] = trance(async g => { if (!g.c(g.idt()).ex) g.c(g.idt()).ex = true; else await g.discardRandomHand(1); }, async g => { await g.placeThreat(g.e.main, 1, {}); const s = await pick(g, g.e.sides.filter(x => g.c(x).threat > 0), '위협 2를 제거할 부가 음모'); if (s) { await g.removeThreat(s, 2, { src: g.idt() }); await g.afterThreatRemoved(s); } }, '주 음모 위협 +1, 부가 음모 위협 -2'); // Pride
  S['55010b'] = trance(async g => { if (!g.c(g.idt()).stun) g.giveStatus(g.idt(), 'stun', '나태의 무아지경'); else await g.placeThreat(g.e.main, 2, {}); }, async g => { const v = ench(g); if (v) g.heal(v, 1); await g.draw(1); if (g.p.hand.length) await g.discardFromHand(1, 1, '버릴 카드'); }, '인챈트리스 회복 1, 카드 1장 뽑고 1장 버림'); // Sloth
  S['55011b'] = trance(async g => { const top = g.e.deck.slice(0, 5); const t = await pick(g, top, '분노의 무아지경: 공개할 카드'); g.shuffle(g.e.deck); if (t) await g.reveal(t); }, async g => { await g.indirectDamage(1, null); const m = await pick(g, g.e.minions.slice(), '피해 2를 줄 하수인'); if (m) await g.dealDamage(m, 2, { byPlayer: true }); }, '간접 피해 1, 하수인에게 피해 2'); // Wrath
  const temptation = (fx, label) => ({ attachTo: g => g.idt(), boostEffect(g, u, ctx) { (ctx.post || ctx.after).push(async gg => { if (['boost', 'ediscard'].includes(gg.c(u).zone)) await gg.reveal(u); }); },
    actions: [{ timing: 'action', label: `강제 행동: 매혹 1, ${label}`, can: (g, u) => g.c(u).zone === 'attach' && g.c(u).on === g.idt() && !g.c(u).ex, async use(g, u) { g.c(u).ex = true; await charm(g, 1); await fx(g); } },
      { timing: 'alter', label: '소진 → 이 카드 버림', can: (g, u) => g.c(u).zone === 'attach' && g.c(u).on === g.idt() && !g.c(u).ex, use(g, u) { g.discard(u); } }],
    on: { async playerPhaseEnd(g, u) { if (g.c(u).zone === 'attach' && g.c(u).on === g.idt() && !g.c(u).ex) { g.log(`${g.nm(u)}: 강제 행동`, 'warn'); g.c(u).ex = true; await charm(g, 1); await fx(g); } } } });
  S['55012'] = temptation(async g => { const c = g.p.hand.filter(x => g.canPlay(x)); const t = c.length ? await g.ask({ type: 'target', title: '유혹의 부름: 비용 -1로 낼 카드 (취소 가능)', cands: c, cancelable: true }) : null; if (t) { g.p.costRed = (g.p.costRed || 0) + 1; try { await g.playCard(t); } finally { g.p.costRed = 0; } } }, '손의 카드를 비용 -1로 플레이'); // Alluring Call
  S['55013'] = temptation(async g => { await g.draw(1); if (g.p.hand.length) await g.discardFromHand(1, 1, '버릴 카드'); }, '카드 1장 뽑고 1장 버림'); // Kiss of Temptation
  S['55014'] = temptation(async g => { if (g.canReady(g.idt())) g.c(g.idt()).ex = false; }, '정체성 준비'); // Love Concoction
  S['55015'] = { attachTo: g => g.idt(), heroNo: { attack: (g, s) => g.c(s).zone === 'attach' && g.c(s).on === g.idt() }, // Seduced
    actions: [{ timing: 'alter', label: '[에너지][정신] → 유혹당함 버림', cost: { n: 2, req: 'YB' }, can: (g, u) => g.c(u).zone === 'attach' && g.c(u).on === g.idt(), use(g, u) { g.discard(u); } }] };
  S['55016'] = { attachTo: g => ench(g) || g.e.villain, stalwartFor: (g, s, t) => exp(g) && g.c(s).zone === 'attach' && t === g.c(s).on, // Crown of the Enchantress
    on: { async afterEnemyScheme(g, u, ctx) { if (g.c(u).zone === 'attach' && ctx.enemy === g.c(u).on) await charm(g, 1); } },
    actions: [{ timing: 'hero', label: '각 플레이어 정체성 소진·피해 1 → 왕관 버림', can: (g, u) => g.c(u).zone === 'attach' && g.livingPlayers().every(pi => !g.c(g.idt(pi)).ex), async use(g, u) { await g.forEachPlayer(async () => { g.c(g.idt()).ex = true; await g.dealDamage(g.idt(), 1, {}); }); g.discard(u, '인챈트리스의 왕관 버림'); } }] };
  const charmOr = (label, other) => async g => { const o = await g.ask({ type: 'choice', title: '★ 강화', options: [{ id: 'c', label: '매혹 카운터 1' }, { id: 'o', label }] }); if (o === 'c') await charm(g, 1); else await other(g); };
  S['55017'] = { on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u) await charm(g, 1); } }, boostEffect: charmOr('정체성 혼란', async g => g.giveStatus(g.idt(), 'conf', '매혹된 하수인')) }; // Enthralled Lackey
  S['55018'] = { mod: { hp: (g, s, t) => t === s && g.hasTrait(g.idt(g.c(s).eng ?? 0), 'ENTHRALLED') ? 3 : 0 }, boostEffect: charmOr('정체성 소진', async g => { g.c(g.idt()).ex = true; }) }; // Enthralled Brute
  S['55019'] = { attackProps: (g, s, ctx) => ctx.enemy === s ? { indirect: true } : null, async whenRevealed(g, u) { if (defiant(g)) await g.activate(u, {}); if (enthralled(g)) g.giveStatus(u, 'tough', '신드르'); } }; // Sindr
  S['55020'] = { onEnter(g, u) { if (exp(g)) g.c(u).tough = true; }, async whenRevealed(g, u) { if (exp(g)) g.c(u).tough = true; }, // Ulik
    on: { async afterTakeDamage(g, u, ctx) { if (g.c(u).zone === 'minion' && ctx.target === ench(g) && ctx.byPlayer) await g.enemyAttack(u, {}); } },
    async whenDefeated(g) { const v = ench(g); if (v) await g.enemyAttack(v, { atkBonus: 1 }); } };
  S['55021'] = { async whenRevealed(g) { for (let i = 0; i < 200; i++) { const x = g.takeEncounter(); if (!x) break; g.put(x, 'ediscard'); if (g.d(x).type === 'minion' && tr(g, x, 'ENTHRALLED')) { await g.reveal(x); break; } } }, async boostEffect(g) { await charm(g, 1); } }; // Law of Attraction
  S['55022'] = { async whenRevealed(g) { await g.forEachPlayer(async () => { if (defiant(g)) await charm(g, 1); if (enthralled(g)) await discardControlled(g, '홀림'); }); } }; // Spellbound
  const defOrBoth = (title, a, b) => async g => { if (enthralled(g)) { await a.run(g); await b.run(g); } else { const o = await g.ask({ type: 'choice', title, options: [{ id: 'a', label: a.label }, { id: 'b', label: b.label }] }); await (o === 'a' ? a : b).run(g); } };
  const searchReveal = type => async g => { const x = g.e.deck.concat(g.e.discard).find(y => g.d(y).type === type); g.shuffle(g.e.deck); if (x) await g.reveal(x); };
  S['55023'] = { whenRevealed: defOrBoth('"내 명령을 따르라"', { label: '하수인을 찾아 공개', run: searchReveal('minion') }, { label: '부가 음모를 찾아 공개', run: searchReveal('side') }) };
  S['55024'] = { whenRevealed: defOrBoth('마법 구속', { label: '기절 + 매혹 1', run: async g => { g.giveStatus(g.idt(), 'stun', '마법 구속'); await charm(g, 1); } }, { label: '혼란 + 매혹 1', run: async g => { g.giveStatus(g.idt(), 'conf', '마법 구속'); await charm(g, 1); } }) };
  S['55025'] = { whenRevealed: defOrBoth('주문 폭발', { label: '인챈트리스가 음모', run: async g => { const v = ench(g); if (v) await g.enemyScheme(v, { schBonus: exp(g) ? 1 : 0 }); } }, { label: '인챈트리스가 공격', run: async g => { const v = ench(g); if (v) await g.enemyAttack(v, { atkBonus: exp(g) ? 1 : 0 }); } }) };
  S['55026'] = { async whenRevealed(g) { const d0 = g.c(g.idt()).dmg; await g.indirectDamage(3, null); if (g.c(g.idt()).dmg > d0) await charm(g, 1); }, async boostEffect(g) { await charm(g, 1); } }; // Spell Shards

  // ======================= Loki, God of Lies =======================
  const AV = ['55029', '55030', '55031', '55032'];
  const SYN = { domineering: '55052', feigned: '55053', mounting: '55054', unified: '55055' };
  const loki = g => (g.e.villains || []).find(v => ['55027a', '55027b'].includes(idOf(g, v))) || null;
  const avatar = g => (g.e.villains || []).find(v => AV.includes(idOf(g, v).slice(0, 5))) || null;
  const worlds = g => (g.e.env || []).find(x => ['55028a', '55028b'].includes(idOf(g, x))) || null;
  const syn = (g, id) => (g.e.env || []).find(x => idOf(g, x) === id) || null;
  async function shatterOn(g, n) { const a = avatar(g); if (!a || n <= 0) return; g.c(a).cnt.shatter = (g.c(a).cnt.shatter || 0) + n; g.log(`${g.nm(a)}: 파쇄 카운터 +${n} (총 ${g.c(a).cnt.shatter})`, 'good'); }
  function synergy(g, id, n) { const e = syn(g, id); if (!e) return; const c = g.c(e); c.cnt.synergy = Math.min(g.players, (c.cnt.synergy || 0) + (n || 1)); g.log(`${g.nm(e)}: 시너지 카운터 ${c.cnt.synergy}`, 'good'); }
  async function synergyAny(g) { const c = Object.values(SYN).map(id => syn(g, id)).filter(Boolean); const t = await pick(g, c, '시너지 카운터를 놓을 환경'); if (t) synergy(g, idOf(g, t), 1); }
  async function worldsCollide(g, n) { const w = worlds(g); if (!w) return; const c = g.c(w); c.cnt.threat = (c.cnt.threat || 0) + n; g.log(`세계 충돌: 위협 ${c.cnt.threat}/2`, 'warn'); if (c.cnt.threat >= 2) g.lose('세계 충돌이 완료되었습니다'); }
  async function damageLoki(g, n) { const l = loki(g); if (!l || n <= 0) return; g.c(l).dmg += n; g.log(`${g.nm(l)} 피해 ${n} → 남은 체력 ${Math.max(0, g.hpLeft(l))}`, 'dmg');
    if (idOf(g, l) === '55027a' && g.hpLeft(l) <= 10 * g.players) { g.c(l).id = '55027b'; g.log('거짓의 신 로키가 뒤집힙니다!', 'warn'); await g.show({ type: 'reveal', uid: l, title: '거짓의 신' }); await focusOnAvatar(g, exp(g)); }
    if (idOf(g, l) === '55027b' && g.hpLeft(l) <= 0) g.win('거짓의 신 로키를 물리쳤습니다'); }
  async function focusOnAvatar(g, total) { const f = (g.e.aside || []).find(x => ['55034a', '55034b'].includes(idOf(g, x))); const a = avatar(g); if (!f || !a) return; g.c(f).id = total ? '55034b' : '55034a'; g.attachEnc(f, a); const w = (MC.scripts[idOf(g, f)] || {}).whenRevealed; if (w) await w(g, f, { surge: 0 }); }
  async function swapAvatar(g, why) { const a = avatar(g); if (!a) return null; const cur = idOf(g, a).slice(0, 5); const rest = AV.filter(x => x !== cur); const nx = rest[Math.floor(g.rand() * rest.length)];
    const c = g.c(a); c.id = nx + 'a'; c.dmg = 0; c.cnt.shatter = 0; c.stun = false; c.conf = false; c.tough = false; g.log(`${why}: ${g.nm(a)} 등장`, 'warn'); await g.show({ type: 'reveal', uid: a, title: '로키의 화신' }); return a; }
  async function shatter(g, fig) { // Shatter the Illusion
    const n = g.c(fig).cnt.shatter || 0; g.c(fig).cnt.shatter = 0; g.log(`환영 파쇄: 파쇄 카운터 ${n}`, 'good'); await damageLoki(g, n);
    await swapAvatar(g, '환영 파쇄'); await g.forEachPlayer(async () => { fd(g, 1); }); }
  const SYNFOR = { '55029': SYN.unified, '55030': SYN.mounting, '55031': SYN.domineering, '55032': SYN.feigned };
  const avatarV = extra => Object.assign({
    async wouldBeDefeated(g, u, w) { w.saved = true; const k = idOf(g, u).slice(0, 5); g.c(u).cnt.shatter = (g.c(u).cnt.shatter || 0) + 5 * g.players; g.c(u).id = k + 'b'; g.c(u).dmg = 0; g.log(`${g.nm(u)}: 파쇄 카운터 ${5 * g.players}개를 놓고 뒤집힙니다`, 'warn');
      await figReveal(g, u); } }, extra);
  S['55029a'] = avatarV({ async afterBoostCard(g, u, card) { if (!isTreach(g, card)) return; const o = g.canAfford({ n: 1, req: '' }, null) ? await g.ask({ type: 'choice', title: '★ 개구쟁이 로키: 변고 강화 카드', options: [{ id: 'f', label: '그 카드를 뒷면 조우 카드로 받기' }, { id: 'p', label: '자원 1 지불' }] }) : 'f'; // Loki the Rascal
    if (o === 'p' && (await g.pay({ n: 1, req: '' }, null, '개구쟁이 로키', true)) != null) return; g.put(card, 'facedown'); } });
  S['55030a'] = avatarV({ on: { async treacheryDone(g, u) { if (avatar(g) !== u) return; await g.placeThreat(g.e.main, 1, {}); const s = await pick(g, g.e.sides.slice(), '★ 악당 로키: 위협 1을 놓을 부가 음모'); if (s) await g.placeThreat(s, 1, {}); } } }); // Miscreant
  S['55031a'] = avatarV({ on: { async treacheryDone(g, u) { if (avatar(g) !== u) return; await g.dealDamage(g.idt(), 1, {}); const a = await pick(g, g.p.allies.slice(), '★ 건달 로키: 피해 1을 받을 동료'); if (a) await g.dealDamage(a, 1, {}); } } }); // Knave
  const wretch = async (g, u, ctx, k) => { const x = encTop(g, 1)[0]; if (isTreach(g, x)) { if (k === 'a') ctx.atkBonus = (ctx.atkBonus || 0) + 1; else ctx.reduce = (ctx.reduce || 0) - 1; g.log('★ 비열한 로키: 변고 — 이번 활성화 +1', 'warn'); } };
  S['55032a'] = avatarV({ async onAttackStart(g, u, ctx) { await wretch(g, u, ctx, 'a'); }, async beforeScheme(g, u, ctx) { await wretch(g, u, ctx, 's'); } }); // Wretch
  const figment = { cannotTakeDamage: () => true, cannotAttack: (g, s, t) => t === s };
  for (const a of AV) S[a + 'b'] = Object.assign({ insteadOfAttack: async () => {}, insteadOfScheme: async () => {} }, figment);
  S['55027a'] = { cannotAttack: (g, s, t) => t === s, cannotTakeDamage: () => true, insteadOfAttack: async () => {}, insteadOfScheme: async () => {} };
  S['55027b'] = Object.assign({}, S['55027a'], { async whenDefeatedVillain(g) { g.win('거짓의 신 로키를 물리쳤습니다'); return 'handled'; } });
  S['55033a'] = { async setup(g) { // Mischief and Mayhem: Loki, a random avatar, the Synergy environments, Worlds Collide
    g.e.villains = g.e.villains || []; const l = g.newCard('55027a'); g.put(l, 'villain');
    const avs = (g.e.aside || []).filter(x => /^550(29|30|31|32)a$/.test(idOf(g, x))); const a = avs[Math.floor(g.rand() * avs.length)]; for (const x of avs) if (x !== a) g.removeFromGame(x);
    g.resetCard(a); g.put(a, 'villain'); g.e.villain = a; g.log(`${g.nm(a)} 등장`, 'warn');
    for (const id of Object.values(SYN)) { const e = (g.e.aside || []).find(x => idOf(g, x) === id); if (e) g.put(e, 'env'); }
    const w = g.newCard('55028b', 'env'); g.c(w).cnt.threat = 0;
    if (exp(g)) await focusOnAvatar(g, false);
  } };
  S['55033b'] = { async whenCompleted(g, m) { g.c(m).threat = 0; g.log('장난과 혼란: 위협을 모두 제거하고 세계 충돌에 위협 1', 'warn'); await worldsCollide(g, 1); return 'handled'; },
    async identityWouldBeDefeated(g, u, w) { w.saved = true; g.c(u).dmg = Math.max(0, g.maxHp(u) - 1); if (g.isHero()) g.flip(true); g.log('장난과 혼란: 체력 1로 일상 모습이 됩니다', 'warn'); await worldsCollide(g, 1); } };
  async function figReveal(g, f) { const k = idOf(g, f).slice(0, 5); await g.show({ type: 'reveal', uid: f, title: '희미해지는 환영' }); await shatter(g, f); synergy(g, SYNFOR[k], g.players); }
  S['55028a'] = {}; S['55028b'] = { permanent: true };
  S['55034a'] = { permanent: true, mod: { hp: (g, s, t) => g.c(s).zone === 'attach' && t === g.c(s).on ? 2 * g.players : 0, sch: (g, s, t) => g.c(s).zone === 'attach' && t === g.c(s).on ? 1 : 0, atk: (g, s, t) => g.c(s).zone === 'attach' && t === g.c(s).on ? 1 : 0 }, grantSteady: true,
    async whenRevealed(g) { encTop(g, 2 * g.players); await g.forEachPlayer(() => burnMine(g, 5)); } };
  S['55034b'] = Object.assign({}, S['55034a'], { mod: { hp: (g, s, t) => g.c(s).zone === 'attach' && t === g.c(s).on ? 3 * g.players : 0, sch: S['55034a'].mod.sch, atk: S['55034a'].mod.atk },
    async whenRevealed(g) { encTop(g, 2 * g.players); await g.forEachPlayer(() => burnMine(g, 5)); const ds = g.e.deck.concat(g.e.discard).find(x => idOf(g, x) === '55036'); if (ds) await g.reveal(ds); if (!(avatar(g) && g.c(avatar(g)).att.some(a => idOf(g, a) === '55036'))) { const a = avatar(g); if (a) g.giveStatus(a, 'tough', '완전한 집중'); } } });
  const pairPay = async (g, why) => { const ts = ['Y', 'B', 'R', 'G'].filter(t => g.canAfford({ n: 2, req: t + t }, null)); if (!ts.length) return false; const t = ts.length === 1 ? ts[0] : await g.ask({ type: 'choice', title: `${why}: 같은 종류 자원 2개`, options: ts.map(x => ({ id: x, label: { Y: '에너지', B: '정신', R: '물리', G: '와일드' }[x] + ' 2개' })) }); return (await g.pay({ n: 2, req: t + t }, null, why, true)) != null; };
  const pairOk = g => ['Y', 'B', 'R', 'G'].some(t => g.canAfford({ n: 2, req: t + t }, null));
  S['55035'] = { attachTo: g => g.idt(), blocksReady: (g, s, uid) => g.c(s).zone === 'attach' && uid === g.c(s).on, whenRevealed(g) { g.c(g.idt()).ex = true; }, // Wrapped in Chains
    actions: [{ timing: 'hero', label: '같은 종류 자원 2개 → 사슬 버리고 화신에 파쇄 1', can: (g, u) => g.c(u).zone === 'attach' && pairOk(g), async use(g, u) { if (!(await pairPay(g, '사슬'))) return; g.discard(u, '사슬에 묶임 버림'); await shatterOn(g, 1); } }] };
  S['55036'] = { attachTo: g => avatar(g) || g.e.villain, grantStalwart: true, // Dark Scepter
    respond: [{ window: 'treacheryResolved', timing: 'hero', label: '같은 종류 자원 2개 → 어둠의 홀 버림', can: (g, u) => g.c(u).zone === 'attach' && pairOk(g), async resolve(g, u) { if (await pairPay(g, '어둠의 홀')) g.discard(u, '어둠의 홀 버림'); } }] };
  S['55037'] = { async whenDefeated(g, u) { const x = encTop(g, 1)[0]; if (isTreach(g, x)) g.e.toFacedown = (g.e.toFacedown || []).concat([u]); } }; // Draugr Buddy
  S['55038'] = { async onAttackStart(g, u, ctx) { const n = encTop(g, 3).filter(x => isTreach(g, x)).length; if (n) { ctx.atkBonus = (ctx.atkBonus || 0) + n; g.log(`★ 그렌델: 공격 +${n}`); } }, async whenDefeated(g) { await shatterOn(g, 3); } }; // Grendell
  S['55039'] = { on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy !== u) return; const x = encTop(g, 1)[0]; if (isTreach(g, x)) g.put(x, 'facedown'); } }, async whenDefeated(g) { await shatterOn(g, 2); } }; // Malekith
  S['55040'] = { async whenRevealed(g, u) { if (g.e.discard.filter(x => isTreach(g, x)).length >= 5) await g.activate(u, {}); }, async whenDefeated(g) { await shatterOn(g, 2); } }; // Minotaur
  S['55041'] = { async whenDefeated(g) { await shatterOn(g, 3); await synergyAny(g); } }; // The Mangog
  S['55042'] = { async whenDefeated(g) { await shatterOn(g, 3); synergy(g, SYN.mounting, 1); } }; // Fenris Wolf
  S['55043'] = { async whenRevealed(g) { if (encTop(g, 3).some(x => isTreach(g, x))) await g.indirectDamage(2, null); }, async whenDefeated(g) { await shatterOn(g, 3); synergy(g, SYN.domineering, 1); } }; // Hraesvelgr
  S['55044'] = { on: { async afterTakeDamage(g, u, ctx) { if (ctx.target === u && ctx.attack && g.c(u).zone === 'minion') { const x = encTop(g, 1)[0]; const a = ctx.src && g.c(ctx.src) && g.allFriendlyChars().includes(ctx.src) ? ctx.src : g.idt(); if (isTreach(g, x)) g.giveStatus(a, 'stun', '★ 라우페이'); } } }, async whenDefeated(g) { await shatterOn(g, 3); synergy(g, SYN.unified, 1); } }; // Laufey
  S['55045'] = { whenRevealed(g) { if (encTop(g, exp(g) ? 3 : 2).some(x => isTreach(g, x))) g.c(g.idt()).ex = true; } }; // Aura of Stasis
  S['55046'] = { async whenDefeated(g) { await shatterOn(g, 3); await synergyAny(g); } }; // Door Between Worlds
  S['55047'] = { async whenDefeated(g) { await shatterOn(g, 2); }, async boostEffect(g) { await g.indirectDamage(g.friendlyChars().length, null); } }; // Lofty Goals
  S['55048'] = { async whenDefeated(g) { await shatterOn(g, 3); synergy(g, SYN.feigned, 1); } }; // New Jotunheim
  S['55049'] = { inciteFor: (g, s, uid) => uid === s && exp(g) ? 1 : 0, async whenRevealed(g) { const m = g.e.discard.find(x => g.d(x).type === 'minion'); if (m) await g.reveal(m); else await g.placeThreat(g.e.main, 3, {}); }, async boostEffect(g) { await g.placeThreat(g.e.main, g.friendlyChars().length, {}); } }; // Dark Arts
  S['55050'] = { async whenRevealed(g) { const a = avatar(g); if (a && g.c(a).cnt.shatter) g.c(a).cnt.shatter--; await g.dealDamage(g.idt(), exp(g) ? 3 : 2, {}); }, async boostEffect(g) { await g.indirectDamage(g.friendlyChars().length, null); } }; // Dirty Trick
  S['55051'] = { async whenRevealed(g) { const a = await swapAvatar(g, '이야기와 거짓말'); if (!a) return; const k = idOf(g, a).slice(0, 5); if (k === '55030' || k === '55031') await g.enemyScheme(a, { schBonus: exp(g) ? 1 : 0 }); else await g.enemyAttack(a, { atkBonus: exp(g) ? 1 : 0 }); } }; // Stories and Lies
  S['55052'] = { permanent: true, respond: [{ window: 'basicPowerUsed', label: '지배하는 힘: 시너지 1 → 공격 +4', can: (g, u, ctx) => ctx.kind === 'attack' && (g.c(u).cnt.synergy || 0) > 0, resolve(g, u, ctx) { g.c(u).cnt.synergy--; ctx.bonus += 4; } }, { window: 'allyPowerUsed', label: '지배하는 힘: 시너지 1 → 공격 +4', can: (g, u, ctx) => ctx.kind === 'attack' && (g.c(u).cnt.synergy || 0) > 0, resolve(g, u, ctx) { g.c(u).cnt.synergy--; ctx.bonus += 4; } }] };
  S['55053'] = { permanent: true, respond: [{ window: 'identityWouldTakeDamage', label: '거짓 후퇴: 시너지 1 → 피해 4 방지', can: (g, u, ctx) => (g.c(u).cnt.synergy || 0) > 0 && ctx.amount - ctx.prevent > 0, resolve(g, u, ctx) { g.c(u).cnt.synergy--; ctx.prevent += 4; } }] };
  S['55054'] = { permanent: true, respond: [{ window: 'basicPowerUsed', label: '거세지는 저항: 시너지 1 → 저지 +4', can: (g, u, ctx) => ctx.kind === 'thwart' && (g.c(u).cnt.synergy || 0) > 0, resolve(g, u, ctx) { g.c(u).cnt.synergy--; ctx.bonus += 4; } }, { window: 'allyPowerUsed', label: '거세지는 저항: 시너지 1 → 저지 +4', can: (g, u, ctx) => ctx.kind === 'thwart' && (g.c(u).cnt.synergy || 0) > 0, resolve(g, u, ctx) { g.c(u).cnt.synergy--; ctx.bonus += 4; } }] };
  S['55055'] = { permanent: true, resources: [{ gen: 'GG', label: '연합 전선 (시너지 1)', can: (g, u) => (g.c(u).cnt.synergy || 0) > 0, use: (g, u) => { g.c(u).cnt.synergy--; } }] };

  // ======================= Trickster Magic (modular) =======================
  const linkedAlly = id => async g => { const a = g.newCard(id, 'discard'); await g.putAllyIntoPlay(a); g.log(`${g.nm(a)}이(가) 당신 편이 됩니다`, 'good'); };
  S['55056'] = { mod: { atk: (g, s, t) => t === s && g.c(s).zone === 'minion' ? Math.max(0, ...g.controlled(g.c(s).eng ?? 0).map(x => g.d(x).cost || 0)) : 0 }, whenDefeated: linkedAlly('55063') }; // Absorbing Man
  S['55057'] = { attackProps: (g, s, ctx) => ctx.enemy === s ? { overkill: true } : null, whenDefeated: linkedAlly('55064') }; // Titania
  S['55058'] = { on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u) await g.indirectDamage(g.e.sides.length, null); } }, whenDefeated: linkedAlly('55065') }; // Whirlwind
  S['55059'] = { async whenRevealed(g) { const out = []; for (let i = 0; i < 4; i++) { if (!g.p.deck.length) await g.reshuffleDeck(); const x = g.p.deck[0]; if (!x) break; g.put(x, 'discard'); out.push(x); } const n = out.reduce((t, x) => t + ((g.d(x).res || '').split('').filter(r => r === 'Y').length), 0); if (n) await g.indirectDamage(n, null); }, whenDefeated: linkedAlly('55066') }; // Zzzax
  S['55060'] = { stalwartFor: (g, s, t) => g.c(s).zone === 'side' && t === g.e.villain, boostEffect(g, u, ctx) { if ('undefended' in ctx) ctx.overkill = true; } }; // The Trickster Tango
  S['55061'] = { whenRevealed(g, u) { if (exp(g)) g.c(u).threat += g.players; }, removeOnlyBy: (g, s, src) => !src || !g.allAllies().includes(src), allyNoDefendVillain: true }; // Puppet Master: allies cannot thwart it or defend against the villain
  S['55062'] = { revealFirst: true, async whenRevealed(g, u, ctx) { const t = await pick(g, g.p.allies.slice(), '사랑의 삼각관계를 붙일 동료'); if (t) g.attachEnc(u, t); else { g.discard(u); ctx.surge++; } }, // Love Triangle
    cannotAttack: (g, s, t, src) => g.c(s).zone === 'attach' && src === g.c(s).on && t === g.e.villain,
    noDefendVillain: true, // Love Triangle: the attached ally cannot defend against the villain
    actions: [{ timing: 'alter', label: '부착 동료 소진·[정신] → 버림', cost: { n: 1, req: 'B' }, can: (g, u) => g.c(u).zone === 'attach' && !g.c(g.c(u).on).ex, use(g, u) { g.c(g.c(u).on).ex = true; g.discard(u); } }] };
  S['55063'] = { noAllyLimit: true, respond: [{ window: 'allyPowerUsed', label: '★ 업그레이드/지원 1장 소진 → 그 비용만큼 + (최대 3)', can: (g, u, ctx) => ctx.ally === u && g.controlled().some(x => ['upgrade', 'support'].includes(g.d(x).type) && !g.c(x).ex), async resolve(g, u, ctx) { const t = await pick(g, g.controlled().filter(x => ['upgrade', 'support'].includes(g.d(x).type) && !g.c(x).ex), '소진할 카드'); if (t) { g.c(t).ex = true; ctx.bonus += Math.min(3, g.d(t).cost || 0); } } }] }; // Absorbing Man (ally)
  S['55064'] = { noAllyLimit: true, selfPiercing: true, selfOverkill: () => true }; // Titania (ally)
  S['55065'] = { noAllyLimit: true, respond: [{ window: 'allyPowerUsed', label: '★ 모든 음모에서 위협 1 제거 → 그만큼 공격 +', can: (g, u, ctx) => ctx.ally === u && ctx.kind === 'attack', async resolve(g, u, ctx) { let n = 0; for (const s of g.schemes().slice()) { const r = await g.removeThreat(s, 1, { src: u }); n += r; await g.afterThreatRemoved(s); } ctx.bonus += n; } }] }; // Whirlwind (ally)
  S['55066'] = { noAllyLimit: true, async onEnter(g) { const top = g.p.deck.slice(0, 5).filter(x => (g.d(x).res || '').includes('Y')); const t = await pick(g, top, '즈작스: 손으로 가져올 [에너지] 카드'); if (t) g.put(t, 'hand'); g.shuffle(g.p.deck); } }; // Zzzax (ally)
  MC.registerScripts(S);
})();
