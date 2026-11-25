/* The Mad Titan's Shadow (21001-21179): Spectrum, Adam Warlock, five scenarios (Ebony Maw, The Tower Defense,
   Thanos, Hela, Loki) and their modular sets. Ported from cards/pack/mts of the community build.
   The campaign (21180-21193) is at the end of the file. */
(function () {
  'use strict';
  const S = {};
  const idOf = (g, u) => g.c(u).id;
  const findIn = (arr, g, id) => (arr || []).find(u => g.c(u).id === id) || null;
  const anywhere = (g, id) => Object.keys(g.s.cards).find(u => g.c(u).id === id && g.c(u).zone) || null;
  const has = (g, u, t) => (g.d(u).tr || []).includes(t);
  async function dmgEnemy(g, n, title, src, attack) {
    const t = await g.chooseTarget(attack ? 'attackable' : 'enemy', title, src, false); if (!t) return null;
    if (attack) await g.playerAttack(g.idt(), t, n, { src }); else await g.dealDamage(t, n, { src, byPlayer: true });
    return t;
  }
  async function choose(g, title, options) { const ok = options.filter(o => !o.can || o.can()); if (!ok.length) return null; const id = ok.length === 1 ? ok[0].id : await g.ask({ type: 'choice', title, options: ok.map(o => ({ id: o.id, label: o.label })) }); const o = ok.find(x => x.id === id) || ok[0]; await o.run(); return o.id; }
  const facedown = (g, n) => { for (let i = 0; i < (n || 1); i++) { const x = g.takeEncounter(); if (x) { g.put(x, 'facedown'); g.log('조우 카드 1장을 뒷면으로 받았습니다', 'warn'); } } };
  const facedownEach = (g, n) => g.forEachPlayer(() => facedown(g, n));
  const firstCtrl = () => ({ firstPlayerChanged(g, u, ctx) { if (g.c(u).zone === 'ally' && g.c(u).ctrl !== ctx.first) { g.withPlayerSync(ctx.first, () => g.put(u, 'ally')); g.log(`${g.nm(u)}의 조종권이 ${g.playerName(ctx.first)}(으)로 넘어갑니다`, 'good'); } } });
  const putIntoPlay = () => (g, u, ctx) => { (ctx.putIntoPlay = ctx.putIntoPlay || []).push(u); };
  const moreBoost = (g, u, ctx) => { ctx.extraBoost = (ctx.extraBoost || 0) + 1; };
  async function discardControlled(g, filter, title) {
    const c = g.controlled().filter(u => !filter || filter(u)); if (!c.length) return null;
    const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title, cands: c, cancelable: false }); g.discard(t, `${g.nm(t)} 버림`); return t;
  }
  const discardTop = (g, n) => { const out = []; for (let i = 0; i < n && g.p.deck.length; i++) { const x = g.p.deck[0]; g.put(x, 'discard'); out.push(x); } if (out.length) g.log(`덱 위 ${out.length}장 버림`); return out; };
  const aspectCount = (g, cards) => new Set(cards.map(x => g.d(x).cls).filter(c => ['Aggression', 'Justice', 'Leadership', 'Protection'].includes(c))).size;
  async function upTo(g, max, title) { if (max <= 0) return 0; const opts = []; for (let i = 0; i <= max; i++) opts.push({ id: String(i), label: `${i}장` }); return +(await g.ask({ type: 'choice', title, options: opts })) || 0; }
  const mystic = g => g.hasTrait(g.idt(), 'MYSTIC');
  const discardAttachThis = cost => ({ timing: 'hero', label: `${cost.req.split('').map(l => ({ R: '[물리]', B: '[정신]', Y: '[에너지]' })[l]).join('')} → 이 카드 버리기`, cost, async use(g, u) { g.discard(u, `${g.nm(u)} 버림`); } });

  // ======================= Spectrum =======================
  const FORMS = ['21002', '21003', '21004']; // Gamma, Photon, Pulsar
  const forms = g => g.p.upgrades.filter(u => FORMS.includes(idOf(g, u)));
  const activeForm = g => forms(g).find(u => !g.c(u).fd) || null;
  const lossOfControl = g => (g.p.obl || []).some(u => idOf(g, u) === '21026');
  async function changeEnergy(g, to) { // to: card id, or null to choose another form
    if (lossOfControl(g)) { g.log('통제 불능: 에너지 형태를 바꿀 수 없습니다', 'warn'); return false; }
    const fs = forms(g); if (!fs.length) return false;
    const cur = activeForm(g);
    let pick = to ? fs.find(u => idOf(g, u) === to) : null;
    if (!pick) { const c = fs.filter(u => u !== cur); if (!c.length) return false; pick = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '바꿀 에너지 형태', cands: c, cancelable: false }); }
    if (pick === cur) return false;
    fs.forEach(u => { g.c(u).fd = u !== pick; });
    g.log(`에너지 형태: ${g.nm(pick)}`, 'good');
    await g.window('energyChanged', { form: pick });
    return true;
  }
  const isForm = (g, id) => { const a = activeForm(g); return !!a && idOf(g, a) === id; };
  const energyForm = (key, amount, label, resp) => ({
    mod: { [key]: (g, self, t) => t === g.idt() && g.isHero() && !g.c(self).fd ? amount : 0 },
    respond: [{ window: 'energyChanged', timing: 'hero', label, can: (g, u, ctx) => ctx.form === u, resolve: resp }]
  });
  S['21002'] = energyForm('atk', 2, '감마: 적에게 피해 1', async (g, u) => { if (g.enemies().length) await dmgEnemy(g, 1, '피해 1을 줄 적', u); });
  S['21003'] = energyForm('thw', 2, '포톤: 음모에서 위협 1 제거', async (g, u) => { if (g.targets('thwartable').length) await g.removeThreatChoose(1, '위협 1을 제거할 음모', u); });
  S['21004'] = energyForm('def', 2, '펄서: 스펙트럼 피해 1 회복', async g => { g.heal(g.idt(), 1); });
  S['21001a'] = { on: { async formChanged(g, u, ctx) { if (ctx.form === 'hero' && !activeForm(g)) await changeEnergy(g, null); } } };
  S['21001b'] = {
    setup(g) { for (const u of (g.p.pset || []).slice()) if (FORMS.includes(idOf(g, u))) { g.put(u, 'upgrade'); g.c(u).fd = true; } g.log('스펙트럼: 에너지 형태 3장을 뒷면으로 플레이'); },
    on: { formChanged(g, u, ctx) { if (ctx.form === 'alter') forms(g).forEach(x => { g.c(x).fd = true; }); } }
  };
  S['21005'] = { async onEnter(g) { if (g.isHero()) await changeEnergy(g, null); } }; // Blue Marvel
  S['21006'] = { resources: [{ label: '에너지 복제 (소진)', gen: g => { const a = activeForm(g); return a && g.isHero() ? (g.d(a).res || '') : ''; }, can: (g, u) => !g.c(u).ex, use: (g, u) => { g.c(u).ex = true; } }] }; // Energy Duplication
  S['21007'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { const was = isForm(g, '21002'); await changeEnergy(g, '21002'); await g.playerAttack(g.idt(), ctx.target, 7, { overkill: was }); } } }; // Gamma Blast
  S['21008'] = { play: { timing: 'hero', label: 'thwart', target: { kind: 'scheme', filter: (g, x) => g.c(x).threat > 0 }, async resolve(g, u, ctx) { // Photon Speed
    const was = isForm(g, '21003'); await changeEnergy(g, '21003');
    const r = await g.removeThreat(ctx.target, 4, { src: u, ignoreCrisis: was }); g.log(`광자 속도: ${g.nm(ctx.target)} 위협 ${r} 제거`); await g.afterThreatRemoved(ctx.target);
  } } };
  S['21009'] = { interrupt: { window: 'heroDefends', timing: 'hero', async resolve(g) { // Pulsar Shield
    const was = isForm(g, '21004'); await changeEnergy(g, '21004');
    const id = g.idt(); if (g.canReady(id)) { g.c(id).ex = false; g.log(`${g.nm(id)} 준비`); }
    if (was) { g.addPhaseMod(id, 'retaliate', 1); g.log('펄서 방패: 이번 단계 보복 1'); }
  } } };
  S['21010'] = { play: { timing: 'hero', async resolve(g) { await changeEnergy(g, null); await g.draw(1); } } }; // Speed of Light
  S['21026'] = { // Loss of Control
    async whenRevealed(g, u) { g.put(u, 'pobl'); g.log('통제 불능: 내 플레이 영역에 남습니다', 'warn'); },
    actions: [{ timing: 'alter', label: '모니카 램보 소진 → 이 카드를 게임에서 제거', can: (g, u) => g.c(u).zone === 'pobl' && !g.c(g.idt()).ex, async use(g, u) { g.c(g.idt()).ex = true; g.removeFromGame(u); g.log('통제 불능을 게임에서 제거', 'good'); } }]
  };
  const radioactive = async (g, u) => { for (const f of g.friendlyChars()) await g.dealDamage(f, 1, { src: u }); };
  S['21027'] = { on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u && g.c(u).zone) await radioactive(g, u); }, async afterEnemyScheme(g, u, ctx) { if (ctx.enemy === u && g.c(u).zone) await radioactive(g, u); } }, async boostEffect(g, u) { await radioactive(g, u); } }; // Radioactive Man
  S['21028'] = { async whenDefeated(g, u) { await radioactive(g, u); } }; // Reactor Meltdown
  S['21029'] = { attachTo: g => g.idt(), // Sap Power
    on: { async playerPhaseEnd(g, a) { if (g.c(a).on === g.idt()) await g.dealDamage(g.idt(), 1, { src: a }); } },
    actions: [{ timing: 'alter', label: '[에너지][에너지] → 이 카드 버리기', cost: { n: 2, req: 'YY' }, async use(g, u) { g.discard(u, '힘 흡수 버림'); } }] };
  S['21030'] = { whenRevealedAlter: async g => { if (g.e.main) await g.placeThreat(g.e.main, 2, {}); }, whenRevealedHero: async (g, u) => { await g.dealDamage(g.idt(), 2, { src: u }); } }; // Radioactive Blast

  // ======================= Adam Warlock =======================
  S['21031a'] = { actions: [{ timing: 'action', label: '전투 마법사: 손에서 1장 버리고 성향에 따라 효과 (단계당 1번)', can: g => g.p.hand.length > 0 && !g.p.usedOnce['battleMage:' + g.s.phase],
    async use(g, u) {
      g.p.usedOnce['battleMage:' + g.s.phase] = true;
      const t = await g.ask({ type: 'target', title: '전투 마법사: 버릴 카드', cands: g.p.hand.slice(), cancelable: false });
      g.put(t, 'discard'); const cls = g.d(t).cls; g.log(`전투 마법사: ${g.nm(t)} (${cls || '-'})`);
      if (cls === 'Aggression' && g.enemies().length) await dmgEnemy(g, 2, '피해 2를 줄 적', u);
      else if (cls === 'Justice' && g.targets('thwartable').length) await g.removeThreatChoose(2, '위협 2를 제거할 음모', u);
      else if (cls === 'Protection') { const c = g.p.allies.filter(a => g.c(a).dmg > 0); if (c.length) { const a = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '피해 1을 회복할 동료', cands: c, cancelable: false }); g.heal(a, 1); } }
      else if (cls === 'Leadership' && g.isHero()) { ['thw', 'atk', 'def'].forEach(k => g.addRoundMod(g.idt(), k, 1)); g.log('이번 라운드 저지·공격·방어 +1'); }
      await g.window('battleMage', {});
    } }] };
  S['21031b'] = { actions: [{ timing: 'alter', label: '손에서 1장 버림 → 상태 카드 1장 제거', can: g => g.p.hand.length > 0 && (g.c(g.idt()).stun || g.c(g.idt()).conf || g.c(g.idt()).tough), async use(g) {
    const t = await g.ask({ type: 'target', title: '버릴 카드', cands: g.p.hand.slice(), cancelable: false }); g.put(t, 'discard');
    const c = g.c(g.idt()); const k = c.stun ? 'stun' : c.conf ? 'conf' : 'tough'; c[k] = false; g.log('상태 카드 1장 제거');
  } }] };
  S['21032'] = { interrupt: { window: 'enemyAttackInitiated', label: '[에너지][정신] → 핍을 플레이에 내놓기', cost: { n: 2, req: 'YB' }, async resolve(g, u) { await g.putAllyIntoPlay(u); if (g.d(u).toughness) g.c(u).tough = true; g.log('트롤 핍 등장', 'good'); } } }; // Pip the Troll
  S['21033'] = { // Soul World
    respond: [{ window: 'deckReset', label: '영혼 카운터 1개', async resolve(g, u) { g.c(u).cnt.soul = (g.c(u).cnt.soul || 0) + 1; } }],
    actions: [{ timing: 'alter', exhaust: true, label: '소진·영혼 카운터 1 → 정체성 피해 모두 회복', can: (g, u) => (g.c(u).cnt.soul || 0) > 0 && g.c(g.idt()).dmg > 0, async use(g, u) { g.c(u).cnt.soul--; g.heal(g.idt(), 99); g.log('소울 월드: 피해 모두 회복', 'good'); } }] };
  S['21034'] = { resources: [{ gen: 'G', label: '카르마 지팡이 (소진)', can: (g, u) => !g.c(u).ex, use: (g, u) => { g.c(u).ex = true; } }] }; // Karmic Staff
  S['21035'] = { respond: [{ window: 'battleMage', timing: 'hero', exhaust: true, label: '소진 → 아담 워록 준비', can: g => g.c(g.idt()).ex, async resolve(g) { if (g.canReady(g.idt())) g.c(g.idt()).ex = false; } }] }; // Warlock's Cape
  S['21036'] = { on: { treacheryRevealing(g, u, ctx) { if (ctx.cancel || g.c(u).zone !== 'upgrade') return; ctx.cancel = true; g.log(`우주의 수호: 「${g.nm(ctx.card)}」 취소`, 'good'); g.discard(u); } } }; // Cosmic Ward
  S['21037'] = { respond: [{ window: 'battleMage', timing: 'hero', label: '카드 1장 뽑기', async resolve(g) { await g.draw(1); } }] }; // Mystic Senses
  S['21038'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { // Karmic Blast
    const n = await upTo(g, Math.min(4, g.p.deck.length), '카르마 폭발: 덱 위에서 버릴 카드 수 (서로 다른 성향 1개마다 피해 +1)');
    const x = aspectCount(g, discardTop(g, n)); await g.playerAttack(g.idt(), ctx.target, 4 + x, {});
  } } };
  S['21039'] = { play: { timing: 'hero', label: 'thwart', target: 'thwartable', async resolve(g, u, ctx) { // Cosmic Awareness
    const n = await upTo(g, Math.min(4, g.p.deck.length), '우주적 자각: 덱 위에서 버릴 카드 수 (서로 다른 성향 1개마다 위협 +1)');
    const x = aspectCount(g, discardTop(g, n)); const r = await g.removeThreat(ctx.target, 3 + x, { src: u }); g.log(`우주적 자각: 위협 ${r} 제거`); await g.afterThreatRemoved(ctx.target);
  } } };
  S['21040'] = { play: { timing: 'action', can: g => g.p.discard.length > 0, async resolve(g) { const t = await g.ask({ type: 'target', title: '양자 마법: 손으로 가져올 카드', cands: g.p.discard.slice(), cancelable: false }); g.put(t, 'hand'); } } }; // Quantum Magic
  S['21066'] = { async whenRevealed(g, u) { // Regeneration Cycle
    await g.heroObligation(u, '재생 주기', '덱 위 5장 버림, 서로 다른 성향 1개마다 주 음모에 위협 1 → 이 카드 버림', async () => {
      const n = aspectCount(g, discardTop(g, 5)); if (n && g.e.main) await g.placeThreat(g.e.main, n, {});
      if (g.c(u).zone === 'limbo') g.discard(u);
    });
  } };
  const magus = (g, u, ctx) => { if (ctx.enemy === u && g.c(u).zone) discardTop(g, 5); };
  S['21067'] = { on: { afterEnemyAttack: magus, afterEnemyScheme: magus } }; // The Magus
  const church = g => findIn(g.e.sides, g, '21068');
  S['21068'] = { on: { deckReset(g) { const id = g.idt(); g.c(id).ex = true; g.giveStatus(id, 'stun', '진리의 우주 교회: 소진·기절'); } }, boostEffect(g, u, ctx) { (ctx.revealAfter = ctx.revealAfter || []).push(u); } }; // Universal Church of Truth
  S['21069'] = { boostEffect: putIntoPlay() }; // Zealot of Truth
  S['21068'].noRemove = g => g.e.minions.some(m => idOf(g, m) === '21069');
  S['21070'] = { async whenRevealed(g) { // Cosmic Inquisition
    if (church(g)) { discardTop(g, 10); return; }
    const x = g.e.deck.concat(g.e.discard, g.e.setaside).find(u => idOf(g, u) === '21068'); g.shuffle(g.e.deck); if (x) await g.reveal(x);
  } };

  // ======================= aspect / basic cards =======================
  const avengerChars = g => g.friendlyChars().filter(f => g.hasTrait(f, 'AVENGER') && (f !== g.idt() || g.isHero())).length;
  S['21011'] = { selfCostMod: g => avengerChars(g) }; // Captain America (ally)
  S['21012'] = { onEnter(g, u) { g.c(u).cnt.chi = 2; }, // Power Man
    actions: [{ timing: 'action', label: '기 카운터 버리기 → 1개마다 이번 단계 공격 +2', can: (g, u) => (g.c(u).cnt.chi || 0) > 0, async use(g, u) {
      const n = await upTo(g, g.c(u).cnt.chi, '버릴 기 카운터 수'); if (!n) return; g.c(u).cnt.chi -= n; g.addPhaseMod(u, 'atk', 2 * n); g.log(`파워맨: 공격 +${2 * n}`);
    } }] };
  S['21013'] = { async onPlay(g) { const v = g.e.villain; const x = v && g.d(v).stage ? Math.min(3, g.villainStage()) : 1; await g.draw(x); g.log(`화이트 타이거: ${x}장 뽑기`); } }; // White Tiger
  S['21014'] = { async onEnter(g) { // Kaluu
    const top = await g.lookAtDeckTop(5); const c = top.filter(x => g.d(x).type === 'event');
    if (c.length) { const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '칼루: 손으로 가져올 이벤트', cands: c, cancelable: false }); g.put(t, 'hand'); g.log(`칼루: ${g.nm(t)}`); }
    g.shuffle(g.p.deck);
  } };
  S['21015'] = { mod: { thw: (g, s, t) => g.p.allies.includes(t) && g.friendlyChars().every(f => g.hasTrait(f, 'AVENGER')) ? 1 : 0, atk: (g, s, t) => g.p.allies.includes(t) && g.friendlyChars().every(f => g.hasTrait(f, 'AVENGER')) ? 1 : 0 } }; // Mighty Avengers
  const sharesHeroTrait = (g, a) => { const ht = g.d(g.idt()).tr || []; return (g.d(a).tr || []).some(t => ht.includes(t)) || ht.some(t => g.hasTrait(a, t)); };
  S['21016'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', can: g => g.p.allies.filter(a => !g.c(a).ex && sharesHeroTrait(g, a)).length >= 3, async resolve(g, u, ctx) { // Mass Attack
    const c = g.p.allies.filter(a => !g.c(a).ex && sharesHeroTrait(g, a)); const sel = c.length === 3 ? c : await g.ask({ type: 'select', title: '소진할 동료 3명', cards: c, min: 3, max: 3, confirm: '확정' });
    (sel || []).forEach(a => { g.c(a).ex = true; });
    const n = (sel || []).reduce((t, a) => t + g.stat(a, 'atk'), 0) + g.stat(g.idt(), 'atk'); await g.playerAttack(g.idt(), ctx.target, n, {});
  } } };
  S['21018'] = { resGen: g => 'G'.repeat(Math.min(3, g.p.allies.length)) }; // Band Together
  const blade = async (g, u, ctx) => {
    if (ctx.ally !== u || g.c(u).zone !== 'ally') return;
    const r = g.p.hand.filter(x => (g.d(x).res || '').includes('R'));
    const pick = r.length ? await g.ask({ type: 'choice', title: '블레이드: [물리] 자원 카드를 쓰거나 블레이드 버리기', options: [{ id: 'pay', label: '[물리] 자원 카드 지불' }, { id: 'disc', label: '블레이드 버리기' }] }) : 'disc';
    if (pick === 'pay' && await g.pay({ n: 1, req: 'R' }, null, '블레이드: [물리] 1', false)) return;
    g.discard(u, '블레이드 버림');
  };
  S['21019'] = { on: { allyBasicPower: blade } }; // Blade (forced, after he attacks or thwarts)
  S['21022'] = { respond: [{ window: 'afterChangeForm', timing: 'hero', label: '버리기 → 히어로 준비', can: g => g.c(g.idt()).ex, async resolve(g, u) { g.discard(u); if (g.canReady(g.idt())) g.c(g.idt()).ex = false; } }] }; // Ready to Rumble
  S['21041'] = { respond: [{ window: 'allyPowerUsed', label: '[물리] 지불 → 관통·원거리', cost: { n: 1, req: 'R' }, can: (g, u, ctx) => ctx.ally === u && ctx.kind === 'attack', async resolve(g, u, ctx) { ctx.piercing = true; ctx.ranged = true; } }] }; // Marvel Boy
  const cosmic = fx => ({ play: { timing: 'action', async resolve(g, u) { g.put(u, 'edeck'); g.shuffle(g.e.deck); g.log(`${g.nm(u)}을(를) 조우 덱에 섞습니다`); } }, whenRevealedEnc: fx });
  S['21042'] = cosmic(async (g, u) => { if (g.e.villain) await g.dealDamage(g.e.villain, 2, { src: u, byPlayer: true }); }); // In-Betweener
  S['21048'] = cosmic(async (g, u) => { if (g.e.main) await g.removeThreat(g.e.main, 2, { src: u, ignoreCrisis: true }); }); // Living Tribunal
  S['21054'] = cosmic(async g => { await g.draw(1); }); // Eternity
  S['21060'] = cosmic(async g => { g.heal(g.idt(), 2); }); // The Gardener
  S['21043'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', can: mystic, async resolve(g, u, ctx) { // Magic Attack
    const n = discardTop(g, await upTo(g, Math.min(5, g.p.deck.length), '마법 공격: 버릴 카드 수 (1장마다 피해 1)')).length; if (n) await g.playerAttack(g.idt(), ctx.target, n, {});
  } } };
  const spent = (fx, hero) => ({ async onSpent(g, u) { if (!hero || g.isHero()) await fx(g, u); } });
  S['21046'] = spent(async (g, u) => { if (g.e.villain) await g.dealDamage(g.e.villain, 1, { src: u, byPlayer: true }); }, true); // Audacity
  S['21052'] = spent(async (g, u) => { if (g.e.main) await g.removeThreat(g.e.main, 1, { src: u }); }, true); // Determination
  S['21058'] = spent(async g => { const c = g.p.allies.filter(a => g.c(a).dmg > 0); if (c.length) { const a = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '피해 1을 회복할 동료', cands: c, cancelable: false }); g.heal(a, 1); } }, true); // Innovation
  S['21064'] = spent(async g => { g.heal(g.idt(), 1); }, true); // Preservation
  S['21047'] = { async onEnter(g, u) { for (const s of g.schemes().slice()) { if (g.c(s).threat > 0) { await g.removeThreat(s, 1, { src: u }); await g.afterThreatRemoved(s); } } } }; // Quasar
  S['21050'] = { play: { timing: 'hero', label: 'thwart', target: 'thwartable', can: mystic, async resolve(g, u, ctx) { // Zone of Silence
    const n = discardTop(g, await upTo(g, Math.min(4, g.p.deck.length), '침묵의 영역: 버릴 카드 수 (1장마다 위협 1)')).length;
    if (n) { const r = await g.removeThreat(ctx.target, n, { src: u }); g.log(`침묵의 영역: 위협 ${r} 제거`); await g.afterThreatRemoved(ctx.target); }
  } } };
  S['21053'] = { respond: [{ window: 'allyDefeated', label: '가디언 캐릭터 1명 준비', can: (g, u, ctx) => ctx.ally === u && g.allFriendlyChars().some(f => g.c(f).ex && g.hasTrait(f, 'GUARDIAN')), // Major Victory
    async resolve(g) { const c = g.allFriendlyChars().filter(f => g.c(f).ex && g.hasTrait(f, 'GUARDIAN')); const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '준비시킬 가디언', cands: c, cancelable: false }); if (g.canReady(t)) g.c(t).ex = false; } }] };
  S['21055'] = { play: { timing: 'hero', can: mystic, async resolve(g) { // Summoning Spell
    const seen = [];
    while (g.p.deck.length) { const x = g.p.deck[0]; if (seen.includes(x)) break; if (g.d(x).type === 'ally') { g.log(`소환 주문: ${g.nm(x)}`, 'good'); await g.putAllyIntoPlay(x); return; } g.put(x, 'discard'); seen.push(x); }
    g.log('소환 주문: 동료가 없습니다');
  } } };
  S['21061'] = { interrupt: { window: 'wouldTakeAttackDamage', timing: 'hero', can: (g, u, ctx) => mystic(g) && ctx.amount - ctx.prevent > 0 && g.p.deck.length >= ctx.amount - ctx.prevent, async resolve(g, u, ctx) { // Shield Spell
    discardTop(g, ctx.amount - ctx.prevent); ctx.prevent = ctx.amount; g.log('방패 주문: 이 공격의 피해를 모두 방지', 'good');
  } } };
  S['21065'] = { selfCostMod: g => g.hasTrait(g.idt(), 'GUARDIAN') ? 1 : 0 }; // Martinex

  // ======================= Ebony Maw =======================
  const spells = g => g.e.env.filter(u => has(g, u, 'SPELL'));
  async function spellIntoPlay(g) {
    const u = g.discardEncounterUntil(d => d.type === 'environment' && (d.tr || []).includes('SPELL'));
    if (!u) { g.log('주문 환경이 없습니다'); return; }
    await g.enterEnv(u); g.log(`${g.nm(u)}이(가) 플레이 영역에 들어옵니다`, 'warn');
  }
  async function removeInvocation(g, u) {
    const c = g.c(u).cnt; if (!(c.invocation > 0)) return;
    c.invocation--; g.log(`${g.nm(u)}: 발동 카운터 ${c.invocation}`);
    if (c.invocation === 0) { g.discard(u, `${g.nm(u)}: 발동!`); const f = (MC.scripts[idOf(g, u)] || {}).release; if (f) await f(g, u); }
  }
  const maw = { async onActivationStart(g) { for (const s of spells(g).slice()) await removeInvocation(g, s); } };
  S['21071'] = maw;
  S['21072'] = Object.assign({ async whenRevealed(g) { await spellIntoPlay(g); } }, maw);
  S['21073'] = S['21072'];
  S['21075a'] = { async whenRevealed(g) { g.e.discard.slice().forEach(x => g.put(x, 'edeck')); g.shuffle(g.e.deck); await spellIntoPlay(g); } }; // The Power Stone (2A): shuffle the discards back first, then a Spell comes out
  S['21074b'] = { async whenRevealed(g) { await spellIntoPlay(g); g.e.discard.slice().forEach(x => g.put(x, 'edeck')); g.shuffle(g.e.deck); } };
  const spell = (n, release) => ({ release, invocation: n });
  S['21076'] = spell(4, async (g, u) => { await g.forEachPlayer(async () => { await g.dealDamage(g.idt(), 4, { src: u }); }); }); // Fireball
  S['21077'] = spell(2, async g => { await g.forEachPlayer(async () => { await g.discardRandomHand(1); g.giveStatus(g.idt(), 'conf', '조종: 혼란'); }); }); // Manipulation
  S['21078'] = spell(3, async g => { await g.forEachPlayer(() => { g.controlled().filter(x => g.d(x).type === 'upgrade').forEach(x => { g.c(x).ex = true; }); g.giveStatus(g.idt(), 'stun', '진정: 기절'); }); }); // Pacification
  S['21079'] = spell(3, async (g, u) => { for (const f of g.allFriendlyChars()) await g.dealDamage(f, 2, { src: u }); }); // Rubblestorm
  ['21076', '21077', '21078', '21079'].forEach(id => { S[id].on = { environmentEnters(g, u, ctx) { if (ctx && ctx.env === u && !g.c(u).cnt.invocation) g.c(u).cnt.invocation = S[id].invocation; } }; });
  S['21080'] = { // Agent of Thanos
    async whenRevealedAlter(g, u, ctx) { const n = spells(g).length; if (n && g.e.main) await g.placeThreat(g.e.main, n, {}); else { g.log('주문이 없어 쇄도'); ctx.surge++; } },
    async whenRevealedHero(g, u, ctx) { const n = spells(g).length; if (n) await g.dealDamage(g.idt(), n, { src: u }); else { g.log('주문이 없어 쇄도'); ctx.surge++; } }
  };
  S['21081'] = { async whenRevealed(g) { const s = spells(g); if (s.length) { for (const x of s.slice()) await removeInvocation(g, x); } else await spellIntoPlay(g); } }; // Channeling Trance
  S['21082'] = { attachTo: g => g.e.villain, // Abjuration
    on: { wouldTakeDamage(g, a, ctx) { if (ctx.target !== g.c(a).on) return; const n = ctx.amount - ctx.prevent; if (n <= 0) return; ctx.prevent = ctx.amount; g.log(`포기 선언: 피해 ${n} 방지`); if (ctx.attack && n >= 2 && g.c(a).zone === 'attach') g.discard(a, '포기 선언 버림'); } } };
  S['21083'] = { attachTo: g => { const c = g.friendlyChars(); if (!c.length) return null; const m = Math.max(...c.map(x => g.stat(x, 'atk'))); return c.find(x => g.stat(x, 'atk') === m); }, noReady: true, // Restrained
    async whenRevealed(g, u) { const h = g.c(u).on; if (h) { g.c(h).ex = true; g.log(`${g.nm(h)} 소진`); } },
    actions: [discardAttachThis({ n: 2, req: 'YR' })] };
  S['21084'] = { async whenRevealed(g, u) { await g.forEachPlayer(async () => { await choose(g, `원자로 과부하(${g.playerName()}): 하나를 고르세요`, [{ id: 'd', label: '피해 2', run: async () => { await g.dealDamage(g.idt(), 2, { src: u }); } }, { id: 't', label: '여기에 위협 2', run: async () => { await g.placeThreat(u, 2, {}); } }]); }); } }; // Reactor Overload
  // Black Order / Armies of Titan
  S['21085'] = { attackProps: () => ({ overkill: true }) }; // Black Dwarf
  S['21086'] = { on: { afterEnemyAttack(g, u, ctx) { if (ctx.enemy !== u) return; for (const d of (ctx.damaged || [])) if (g.c(d).zone) g.giveStatus(d, 'stun', '슈퍼자이언트: 기절'); } } }; // Supergiant
  S['21087'] = { noRemove: g => g.e.minions.some(m => has(g, m, 'BLACK ORDER')) }; // The Black Order
  S['21088'] = { async whenRevealed(g) { // Blood to Spare
    await g.forEachPlayer(async () => {
      const eng = g.engagedMinions();
      if (eng.length) { for (const m of eng.slice()) if (g.c(m).zone === 'minion') await g.activate(m, {}); }
      else { const x = g.e.deck.concat(g.e.discard).find(u => g.d(u).type === 'minion' && has(g, u, 'BLACK ORDER')); g.shuffle(g.e.deck); if (x) await g.enterMinion(x, {}, true); }
    });
  } };
  const villainTough = g => { if (g.e.villain) g.giveStatus(g.e.villain, 'tough', '강인함'); };
  S['21089'] = { whenDefeated: villainTough, boostEffect: villainTough }; // Black Order Infantry
  S['21090'] = { async whenRevealed(g) { await g.discardRandomHand(1); }, async boostEffect(g) { await g.discardRandomHand(1); } }; // Outrider
  S['21091'] = { async whenDefeated(g) { const m = g.discardEncounterUntil(d => d.type === 'minion'); if (m) await g.enterMinion(m, {}, true); } }; // Landing Craft
  // Children of Thanos
  S['21125'] = { async boostEffect(g) { await discardControlled(g, x => ['ally', 'support'].includes(g.d(x).type), '버릴 동료나 지원'); } };
  S['21126'] = { attackProps: () => ({ piercing: true }), async boostEffect(g) { await discardControlled(g, x => ['ally', 'upgrade'].includes(g.d(x).type), '버릴 동료나 업그레이드'); } };
  S['21127'] = { boostEffect: moreBoost };
  S['21128'] = { whenDefeated(g) { facedown(g, 1); } }; // Tribute

  // ======================= The Tower Defense =======================
  const PROX = ['21092', '21093', '21094'], CORV = ['21095', '21096', '21097'];
  const tower = g => g.e.env.find(u => ['21100a', '21100b'].includes(idOf(g, u))) || null;
  async function damageTower(g, n) {
    const t = tower(g); if (!t || n <= 0) return;
    const c = g.c(t).cnt; c.damage = (c.damage || 0) + n; g.log(`어벤져스 타워 피해 ${n} (현재 ${c.damage})`, 'warn');
    if (c.damage >= 9 * g.players) {
      if (idOf(g, t) === '21100a') { c.damage = 0; g.c(t).id = '21100b'; g.log('어벤져스 타워가 손상되었습니다', 'warn'); }
      else g.lose('어벤져스 타워가 무너졌습니다');
    }
  }
  const other = (g, v) => (g.e.villains || []).find(x => x !== v) || null;
  const towerVillain = (stages, otherName) => ({
    wouldBeDefeated(g, u, w) { const o = other(g, u); if (o && g.hpLeft(o) > 0) { w.saved = true; g.c(u).dmg = g.maxHp(u); g.log(`${g.nm(u)}: ${otherName}의 체력이 남아 있어 쓰러지지 않습니다`); } },
    async whenDefeatedVillain(g) { // both are at 0: the next stage for both, or the win
      const e = g.e; const td = e.td;
      if (td.stage + 1 >= td.prox.length) g.win('프록시마 미드나이트와 코버스 글레이브를 물리쳤습니다');
      td.stage++;
      for (const v of e.villains) {
        const isP = PROX.includes(idOf(g, v)); const c = g.c(v);
        for (const a of c.att.slice()) if (!g.d(a).permanent) g.discard(a);
        c.id = (isP ? td.prox : td.corv)[td.stage]; c.dmg = 0; c.stun = false; c.conf = false; c.tough = !!g.d(v).toughness;
        g.log(`${g.nm(v)} ${g.romanStage(g.d(v).stage)}단계`, 'sys');
      }
      return 'handled';
    }
  });
  PROX.forEach(id => { S[id] = Object.assign(towerVillain(PROX, '코버스 글레이브'), { on: { async enemyAttacks(g, u, ctx) {
    if (ctx.enemy !== u) return;
    await choose(g, '프록시마 미드나이트의 공격: 하나를 고르세요', [{ id: 't', label: '어벤져스 타워에 피해 1', can: () => !!tower(g), run: async () => damageTower(g, 1) }, { id: 'a', label: '이번 공격 공격력 +2', run: async () => { ctx.atkBonus = (ctx.atkBonus || 0) + 2; } }]);
  } } }); });
  CORV.forEach(id => { S[id] = Object.assign(towerVillain(CORV, '프록시마 미드나이트'), { on: { async afterEnemyAttack(g, u, ctx) {
    if (ctx.enemy !== u || !ctx.undefended) return; const n = await g.countBoost(g.discardEncounterN(1)); await damageTower(g, n);
  } } }); });
  function setActive(g, v) {
    const e = g.e; if (!v || e.villain === v) return;
    e.villain = v;
    const want = PROX.includes(idOf(g, v)) ? '21098b' : '21099b';
    if (idOf(g, e.main) !== want) { const t = e.main; e.main = e.main2; e.main2 = t; }
    g.log(`활성 빌런: ${g.nm(v)}`, 'warn');
  }
  MC.scenarios.the_tower_defense = Object.assign(MC.scenarios.the_tower_defense || {}, {
    async phaseEnd(g, which) { // Focused Defense moves to the other main scheme after the player phase
      if (which !== 'player' || !g.e.td) return;
      const fd = anywhere(g, '21101'); if (fd && g.e.main2) { g.put(fd, 'attach', g.e.main2); setActive(g, other(g, g.e.villain)); }
    }
  });
  S['21098a'] = { async setup(g) {
    const e = g.e, x = g.s.scen.expert;
    e.td = { stage: 0, prox: x ? ['21093', '21094'] : ['21092', '21093'], corv: x ? ['21096', '21097'] : ['21095', '21096'] };
    const prox = e.villain; const corv = g.newCard(e.td.corv[0]);
    e.villains = []; g.put(prox, 'villain'); g.put(corv, 'villain'); e.villain = prox;
    if (g.d(corv).toughness) g.c(corv).tough = true;
    e.main2 = g.newCard('21099b'); g.c(e.main2).zone = 'main'; const d2 = g.d(e.main2); g.c(e.main2).threat = (d2.start || 0) * (d2.startStar ? g.players : 1);
    const t = e.aside.find(u => idOf(g, u) === '21100a'); if (t) await g.enterEnv(t);
    const fd = e.aside.find(u => idOf(g, u) === '21101'); if (fd) g.put(fd, 'attach', e.main2); // The Armies of Thanos: Focused Defense starts on this scheme, so Corvus Glaive is active first
    setActive(g, corv);
    await g.forEachPlayer(async () => { const bs = e.deck.find(u => idOf(g, u) === '21102'); if (bs) await g.enterMinion(bs, {}, true); });
    g.shuffle(e.deck); // each player puts a Black Order Besieger into play engaged with them
    g.log('타워 디펜스: 프록시마 미드나이트와 코버스 글레이브, 주 음모 2개', 'sys');
  } };
  S['21098b'] = { async whenCompleted(g, m) { g.c(m).threat = 0; g.log('포위 공격: 위협을 모두 제거하고 어벤져스 타워에 피해', 'warn'); await damageTower(g, 6 * g.players); return 'handled'; } };
  S['21099b'] = { async whenCompleted(g, m) { g.c(m).threat = 0; g.log('타노스의 군대: 위협을 모두 제거하고 각 플레이어에게 조우 카드 1장', 'warn'); await facedownEach(g, 1); return 'handled'; } };
  S['21101'] = {};
  S['21102'] = { on: { async minionEnters(g, u, ctx) { if (ctx.minion !== u) return; await choose(g, '블랙 오더 포위병: 하나를 고르세요', [{ id: 't', label: '어벤져스 타워에 피해 1', can: () => !!tower(g), run: async () => damageTower(g, 1) }, { id: 'd', label: '내 정체성에 피해 2', run: async () => { await g.dealDamage(g.idt(), 2, { src: u }); } }]); } } }; // Black Order Besieger
  const villainNamed = (g, ids) => (g.e.villains || []).find(v => ids.includes(idOf(g, v))) || null;
  S['21103'] = { attachTo: g => villainNamed(g, PROX), attackProps: () => ({ overkill: true, piercing: true }), // Proxima's Spear
    actions: [{ timing: 'hero', label: '피해 1·[에너지][정신] → 이 카드 버리기', cost: { n: 2, req: 'YB' }, async use(g, u) { await g.dealDamage(g.idt(), 1, { src: u }); g.discard(u, '프록시마의 창 버림'); } }] };
  S['21104'] = { attachTo: g => villainNamed(g, CORV), mod: { retaliate: (g, s, t) => t === g.c(s).on ? 1 : 0 }, // Corvus's Glaive
    actions: [{ timing: 'hero', label: '피해 1·[에너지][물리] → 이 카드 버리기', cost: { n: 2, req: 'YR' }, async use(g, u) { await g.dealDamage(g.idt(), 1, { src: u }); g.discard(u, '코버스의 글레이브 버림'); } }] };
  S['21105'] = { attachTo: g => other(g, g.e.villain), attackProps: () => ({ ranged: true }), // Direct Assault
    on: { enemyAttacks(g, a, ctx) { if (ctx.enemy !== g.c(a).on) return; const def = () => ctx.defender && ctx.defender !== g.idt() && g.c(ctx.defender).zone !== 'ally';
      ctx.after.push(async gg => { if (def()) await damageTower(gg, 3); if (gg.c(a).zone === 'attach') gg.discard(a, '정면 공격 버림'); }); } } };
  const villainActivates = ids => async g => { const v = villainNamed(g, ids); if (v) await g.activate(v, {}); };
  const addOther = (g, u, ctx) => { const v = ctx.enemy; if (!v || g.d(v).type !== 'villain') return 0; const o = other(g, v); if (!o) return 0; const n = g.stat(o, ('undefended' in ctx) ? 'atk' : 'sch'); g.log(`다른 빌런의 힘 +${n}`); return n; };
  S['21106'] = { whenRevealed: villainActivates(PROX), boostEffect: addOther }; // Proxima's Power
  S['21107'] = { whenRevealed: villainActivates(CORV), boostEffect: addOther }; // Corvus's Cunning
  S['21108'] = { whenRevealed(g) { for (const v of (g.e.villains || [])) { g.heal(v, 2); g.giveStatus(v, 'tough', '피의 결속'); } }, boostEffect(g) { const v = g.e.villain; if (v) { g.heal(v, 2); g.giveStatus(v, 'tough', '피의 결속'); } } }; // Bound by Blood
  S['21109'] = { async whenRevealed(g) { await damageTower(g, 3); }, boostEffect(g, u, ctx) { if ('undefended' in ctx) ctx.after.push(async gg => { if (ctx.defender && ctx.defender !== gg.idt() && gg.c(ctx.defender).zone !== 'ally') await damageTower(gg, 3); }); } }; // Rain Fire
  S['21110'] = { async whenDefeated(g) { await g.draw(1); } }; // City Under Attack

  // ======================= Thanos and the Infinity Gauntlet =======================
  const STONES = ['21130', '21131', '21132', '21133', '21134', '21135'];
  const stonesInPlay = g => g.e.env.filter(u => STONES.includes(idOf(g, u)));
  function topStone(g) {
    const e = g.e; e.stones = e.stones || [];
    if (!e.stones.length) {
      if (!(e.stoneDiscard || []).length) return null;
      e.stoneDiscard.slice().forEach(u => g.put(u, 'stones')); g.shuffle(e.stones);
      g.log('인피니티 스톤 덱이 바닥나 다시 섞습니다', 'warn');
      const v = g.e.villain; if (v && (MC.scripts[idOf(g, v)] || {}).stoneRunsOut) g.giveFacedownBoost(1);
    }
    return e.stones[0] || null;
  }
  async function stoneIntoPlay(g) { const s = topStone(g); if (!s) return; await g.enterEnv(s); g.log(`인피니티 스톤: ${g.nm(s)}이(가) 플레이에 들어옵니다`, 'warn'); }
  async function resolveStone(g, s) { const f = (MC.scripts[idOf(g, s)] || {}).special; g.log(`${g.nm(s)}: 특수 능력`, 'warn'); if (f) await f(g, s); if (g.c(s).zone === 'env') g.put(s, 'stonedis'); }
  function setupGauntlet(g) {
    const e = g.e; const gl = e.deck.concat(e.discard).find(u => idOf(g, u) === '21129');
    if (!gl || !e.villain) return;
    g.attachEnc(gl, e.villain);
    const st = e.deck.concat(e.discard).filter(u => STONES.includes(idOf(g, u)));
    st.forEach(u => g.put(u, 'stones')); g.shuffle(e.stones);
    g.log('인피니티 건틀릿: 인피니티 스톤 6장을 따로 섞어 둡니다');
  }
  S['21129'] = { on: { async afterEnemyAttack(g, a, ctx) { if (ctx.enemy === g.c(a).on) await gauntletAfter(g); }, async afterEnemyScheme(g, a, ctx) { if (ctx.enemy === g.c(a).on) await gauntletAfter(g); } } };
  async function gauntletAfter(g) { const s = stonesInPlay(g); if (s.length) { for (const x of s) await resolveStone(g, x); } else await stoneIntoPlay(g); }
  S['21130'] = { async special(g) { if (g.c(g.idt()).conf) await g.discardRandomHand(1); else g.giveStatus(g.idt(), 'conf', '마인드 스톤'); } };
  S['21131'] = { async special(g, u) { if (g.c(g.idt()).stun) await g.dealDamage(g.idt(), 3, { src: u }); else g.giveStatus(g.idt(), 'stun', '파워 스톤'); } };
  S['21132'] = { async special(g) { await discardControlled(g, x => ['ally', 'upgrade', 'support'].includes(g.d(x).type), '리얼리티 스톤: 버릴 동료·업그레이드·지원'); } };
  S['21133'] = { special(g) { const v = g.e.villain; if (v) { g.heal(v, 3); g.giveFacedownBoost(1); } } };
  S['21134'] = { async special(g) { const m = g.discardEncounterUntil(d => d.type === 'minion'); if (m) await g.enterMinion(m, {}, true); } };
  S['21135'] = { async special(g) { const d = discardTop(g, 4); const n = new Set(d.map(x => g.d(x).type)).size; if (n && g.e.main) await g.placeThreat(g.e.main, n, {}); } };
  const thanos = { stoneRunsOut: true };
  S['21111'] = thanos;
  const helmet = async g => { const x = g.e.deck.concat(g.e.discard).find(u => idOf(g, u) === '21118'); g.shuffle(g.e.deck); if (x) await g.reveal(x); };
  S['21112'] = Object.assign({ whenRevealed: helmet }, thanos); S['21113'] = S['21112'];
  S['21114a'] = { setup: setupGauntlet };
  S['21114b'] = { async whenRevealed(g) { // The Infinity Stones (1B): the top stone comes into play, then Sanctuary is revealed
    await stoneIntoPlay(g); const sa = g.e.deck.find(u => idOf(g, u) === '21116'); if (sa) await g.reveal(sa);
  } };
  const balance = { async whenRevealed(g) {
    if (g.e.balanced === g.e.mainIdx) return; g.e.balanced = g.e.mainIdx;
    await g.forEachPlayer(() => {
      g.p.discard.slice().forEach(x => g.put(x, 'deck')); g.shuffle(g.p.deck);
      const n = Math.floor(g.p.deck.length / 2); g.p.deck.slice(0, n).forEach(x => g.removeFromGame(x));
      g.log(`균형 맞추기(${g.playerName()}): 덱 절반 ${n}장을 게임에서 제거`, 'warn');
    });
  } };
  S['21115a'] = balance; S['21115b'] = balance;
  S['21116'] = { shieldsFromDamage: (g, self, target, o) => g.c(self).zone === 'side' && target === g.e.villain && /Thanos/.test(g.d(target).en || '') && !(o && o.sanctuary), // Sanctuary
    async whenDefeated(g, u) {
      if (!g.e.villain) return;
      let cnt = 0;
      await g.forEachPlayer(async () => {
        const r = g.p.hand.filter(x => (g.d(x).res || '').includes('R')); if (!r.length) return;
        const sel = await g.ask({ type: 'select', title: `성역(${g.playerName()}): 손에서 쓸 [물리] 카드 (최대 3, 1장마다 타노스에게 피해 2)`, cards: r, min: 0, max: Math.min(3, r.length), confirm: '확정' });
        (sel || []).forEach(x => g.put(x, 'discard'));
        cnt += (sel || []).length;
      });
      const n = 2 * cnt; if (!n) return;
      const v = g.e.villain; const tough = g.c(v).tough; g.c(v).tough = false; await g.dealDamage(v, n, { src: u, byPlayer: true, sanctuary: true }); if (g.c(v).zone && tough) g.c(v).tough = true;
    } };
  S['21117'] = { attachTo: g => g.e.villain, // Thanos's Armor
    on: { wouldTakeDamage(g, a, ctx) { if (ctx.target === g.c(a).on && ctx.amount - ctx.prevent > 0) ctx.prevent++; } },
    respond: [{ window: 'afterBasicAttack', timing: 'hero', label: '[에너지][물리] → 타노스의 갑옷 버리기', cost: { n: 2, req: 'YR' }, can: (g, u, ctx) => ctx.target === g.c(u).on, async resolve(g, u) { g.discard(u, '타노스의 갑옷 버림'); } }] };
  S['21118'] = { attachTo: g => g.e.villain, mod: { retaliate: (g, s, t) => t === g.c(s).on ? 1 : 0 }, // Thanos's Helmet
    respond: [{ window: 'afterBasicAttack', timing: 'hero', label: '[정신][물리] → 타노스의 투구 버리기', cost: { n: 2, req: 'BR' }, can: (g, u, ctx) => ctx.target === g.c(u).on, async resolve(g, u) { g.discard(u, '타노스의 투구 버림'); } }] };
  const motsEnd = (g, a, ctx) => { if (ctx.enemy === g.c(a).on && g.c(a).zone === 'attach') g.discard(a, '스톤의 주인 버림'); };
  S['21119'] = { attachTo: g => g.e.villain, // Master of the Stones
    on: { async hostActivates(g, a) { await stoneIntoPlay(g); }, afterEnemyAttack: motsEnd, afterEnemyScheme: motsEnd } };
  S['21120'] = { async whenRevealedAlter(g) { if (g.e.villain) await g.enemyScheme(g.e.villain, {}); }, async whenRevealedHero(g) { if (g.e.villain) await g.enemyAttack(g.e.villain, { overkill: true, piercing: true }); } }; // Avatar of Death
  S['21121'] = { async whenRevealed(g) { const v = g.e.villain; if (!v || !g.giveStatus(v, 'tough', '일탈 증후군')) { if (g.e.main) await g.placeThreat(g.e.main, 2, {}); } }, boostEffect(g) { if (g.e.villain) g.giveStatus(g.e.villain, 'tough', '일탈 증후군'); } }; // Deviant Syndrome
  S['21122'] = { whenRevealed(g) { g.giveFacedownBoost(1); }, boostEffect(g) { const s = topStone(g); if (!s) return 0; g.put(s, 'stonedis'); const n = g.boostOf(s); g.log(`"나는 필연이다": ${g.nm(s)}의 강화 아이콘 ${n}`); return n; } }; // "I Am Inevitable"
  S['21123'] = { async whenRevealed(g) { await stoneIntoPlay(g); }, boostEffect(g, u, ctx) { if ('undefended' in ctx) ctx.after.push(async gg => { if (ctx.defender && ctx.defender !== gg.idt() && gg.c(ctx.defender).zone !== 'ally') await stoneIntoPlay(gg); }); } }; // The Mad Titan
  S['21124'] = { async whenRevealed(g) { await stoneIntoPlay(g); } }; // The Titan's Throne

  // ======================= Hela =======================
  const victorySides = g => (g.e.victory || []).filter(u => g.d(u).type === 'side').length;
  const odinCaptive = g => g.e.main && g.c(g.e.main).att.some(a => ['21139a', '21139b'].includes(idOf(g, a)));
  const flipHelaBack = async g => { const v = g.e.villain; if (v && ['21136b', '21137b'].includes(idOf(g, v))) { g.c(v).dmg = 0; await g.flipVillain({ noReveal: true }); g.log('부가 음모가 격파되어 헬라가 신비 쪽으로 돌아옵니다', 'warn'); } };
  const helaMystic = per => ({ mod: { sch: (g, s, t) => t === s ? victorySides(g) : 0, atk: (g, s, t) => t === s ? victorySides(g) : 0, hp: (g, s, t) => t === s ? per * g.players * victorySides(g) : 0 },
    async wouldBeDefeated(g, u, w) { if (!odinCaptive(g)) return; w.saved = true; for (const a of g.c(u).att.slice()) g.discard(a); g.c(u).dmg = 0; await g.flipVillain({ noReveal: true }); g.log('오딘이 주 음모에 붙어 있어 헬라는 부상 상태로 뒤집힙니다', 'warn'); } });
  const helaWounded = { wouldBeDefeated(g, u, w) { w.saved = true; }, on: { async sideSchemeDefeated(g, u) { if (g.e.villain === u) await flipHelaBack(g); } } };
  S['21136a'] = helaMystic(2); S['21137a'] = helaMystic(3); S['21136b'] = helaWounded; S['21137b'] = helaWounded;
  S['21138a'] = { async setup(g) {
    const e = g.e; const odin = e.aside.find(u => idOf(g, u) === '21139a'); if (odin) g.put(odin, 'attach', e.main);
    for (const id of ['21140', '21143']) { const x = e.aside.find(u => idOf(g, u) === id); if (x) await g.reveal(x); }
  } };
  const helaSide = (next, freeOdin) => ({ async whenDefeated(g) {
    for (const id of next) { const x = g.e.aside.find(u => idOf(g, u) === id); if (x) await g.reveal(x); }
    if (freeOdin) { const o = g.e.main && g.c(g.e.main).att.find(a => idOf(g, a) === '21139a'); if (o) { g.withPlayerSync(g.s.first, () => g.put(o, 'ally')); g.log(`오딘이 풀려나 ${g.playerName(g.s.first)}의 통제 하에 들어옵니다`, 'good'); } await facedownEach(g, 1); }
  } });
  S['21140'] = helaSide(['21141', '21144']); S['21141'] = helaSide(['21142', '21145']); S['21142'] = helaSide([], true);
  S['21139a'] = { noAllyLimit: true, loseIfLeaves: true, on: firstCtrl() }; // Odin
  S['21143'] = {}; S['21144'] = { attackProps: () => ({ piercing: true }) }; S['21145'] = { attackProps: () => ({ overkill: true }) };
  [['21140', '21143'], ['21141', '21144'], ['21142', '21145']].forEach(([side, m]) => { S[side].noRemove = g => g.e.minions.some(x => idOf(g, x) === m); });
  S['21146'] = { attachTo: g => g.e.villain, attackProps: () => ({ piercing: true }), boostEffect: putIntoPlay() }; // Nightsword
  S['21147'] = { attachTo: g => g.e.villain, on: { afterEnemyScheme(g, a, ctx) { if (ctx.enemy === g.c(a).on) g.giveFacedownBoost(1); } }, boostEffect: putIntoPlay() }; // Hela's Crown
  S['21148'] = { attachTo: g => g.e.villain, grantStalwart: true, boostEffect: putIntoPlay() }; // Hela's Cloak
  S['21149'] = { async whenRevealed(g) { if (g.e.main) await g.placeThreat(g.e.main, 1 + victorySides(g), {}); }, boostEffect(g, u, ctx) { if ('undefended' in ctx) ctx.after.push(async gg => { if (ctx.defender && ctx.defender !== gg.idt() && gg.c(ctx.defender).zone !== 'ally' && gg.e.main) await gg.placeThreat(gg.e.main, 2, {}); }); } }; // Hela's Domain
  const oneEachSide = async g => { for (const s of g.e.sides.slice()) await g.placeThreat(s, 1, {}); };
  S['21150'] = { async whenRevealedAlter(g) { if (g.e.villain) await g.enemyScheme(g.e.villain, {}); await oneEachSide(g); }, async whenRevealedHero(g) { if (g.e.villain) await g.enemyAttack(g.e.villain, {}); await oneEachSide(g); } }; // The Queen of Hel
  S['21151'] = { async whenRevealed(g, u) { await g.indirectDamage(1 + victorySides(g), u); }, boostEffect: g => victorySides(g) }; // The Wastes of Niffleheim
  // Legions of Hel
  S['21152'] = { async whenRevealed(g, u) { await choose(g, '드라우그: 하나를 고르세요', [{ id: 'd', label: '피해 1', run: async () => { await g.dealDamage(g.idt(), 1, { src: u }); } }, { id: 't', label: '주 음모에 위협 1', run: async () => { if (g.e.main) await g.placeThreat(g.e.main, 1, {}); } }]); } };
  async function allyFromDeckAsMinion(g, u, trait) {
    const seen = []; let a = null;
    while (g.p.deck.length) { const x = g.p.deck[0]; if (seen.includes(x)) break; if (g.d(x).type === 'ally') { a = x; break; } g.put(x, 'discard'); seen.push(x); }
    if (!a) { g.log('덱에 동료가 없습니다'); g.discard(u); return; }
    g.allyToMinion(a, trait); g.attachEnc(u, a);
  }
  S['21153'] = { revealFirst: true, async whenRevealed(g, u) { await allyFromDeckAsMinion(g, u, 'UNDEAD'); } }; // Fallen Warrior
  S['21154'] = { async whenRevealed(g, u) { // No Place for the Living
    const c = g.controlled().filter(x => ['upgrade', 'support'].includes(g.d(x).type)); if (!c.length) return;
    await choose(g, '산 자를 위한 곳은 없다: 하나를 고르세요', [
      { id: 'disc', label: '비용이 가장 높은 업그레이드·지원 버리기', run: async () => { const top = Math.max(...c.map(x => g.d(x).cost || 0)); const cc = c.filter(x => (g.d(x).cost || 0) === top); const t = cc.length === 1 ? cc[0] : await g.ask({ type: 'target', title: '버릴 카드', cands: cc, cancelable: false }); g.discard(t, `${g.nm(t)} 버림`); } },
      { id: 'dmg', label: `피해 ${c.length}`, run: async () => { await g.dealDamage(g.idt(), c.length, { src: u }); } }]);
  } };
  S['21155'] = { async whenRevealed(g, u, ctx) { const n = g.e.minions.filter(m => g.hasTrait(m, 'UNDEAD')).length; if (n) await g.placeThreat(u, 2 * n, {}); else { g.log('언데드 하수인이 없어 쇄도'); ctx.surge++; } } }; // Legions of Hel
  // Frost Giants
  S['21156'] = { on: { afterEnemyAttack(g, u, ctx) { if (ctx.enemy !== u) return; for (const d of (ctx.damaged || [])) if (g.c(d).zone) g.giveStatus(d, 'stun', '라우페이: 기절'); } } }; // Laufey
  S['21158'] = { attachTo: g => g.idt(), noReady: true, actions: [{ timing: 'alter', label: '[에너지][물리] → 이 카드 버리기', cost: { n: 2, req: 'YR' }, async use(g, u) { g.discard(u, '얼어붙음 버림'); } }] }; // Frozen
  S['21159'] = { noCardReady: true, whenRevealed(g) { g.p.allies.forEach(a => { g.c(a).ex = true; }); g.log('부자연스러운 폭풍: 모든 동료 소진', 'warn'); } }; // Unnatural Storm
  // Enchantress
  S['21177'] = { async whenRevealed(g) { const x = g.e.deck.concat(g.e.discard, g.e.setaside).find(u => idOf(g, u) === '21179'); g.shuffle(g.e.deck); if (x) { g.attachEnc(x, g.idt()); g.log('인챈트리스: 매혹됨을 내 정체성에 부착', 'warn'); } } };
  S['21178'] = { revealFirst: true, async whenRevealed(g, u, ctx) { // Beguiled
    const c = g.p.allies.filter(a => !g.c(a).att.some(x => idOf(g, x) === '21178'));
    if (!c.length) { g.log('동료가 없어 쇄도'); ctx.surge++; g.discard(u); return; }
    const top = Math.max(...c.map(x => g.d(x).cost || 0)); const cc = c.filter(x => (g.d(x).cost || 0) === top);
    const a = cc.length === 1 ? cc[0] : await g.ask({ type: 'target', title: '홀림: 비용이 가장 높은 동료', cands: cc, cancelable: false });
    g.allyToMinion(a, 'ENTHRALLED'); g.attachEnc(u, a);
  } };
  S['21179'] = { attachTo: g => g.idt(), // Seduced
    blocksPlay: (g, self, uid) => g.c(self).on === g.idt() && g.d(uid).type === 'event' && (g.d(uid).tr || []).includes('ATTACK'),
    actions: [{ timing: 'alter', label: '[에너지][정신] → 이 카드 버리기', cost: { n: 2, req: 'YB' }, async use(g, u) { g.discard(u, '유혹됨 버림'); } }] };

  // ======================= Loki =======================
  const LOKIS = ['21160', '21161', '21162', '21163', '21164'];
  const lokiPool = g => g.e.aside.filter(u => LOKIS.includes(idOf(g, u)));
  function swapLoki(g) {
    const v = g.e.villain; const pool = lokiPool(g); if (!v || !pool.length) return;
    const n = pool[Math.floor(g.rand() * pool.length)]; const newId = idOf(g, n), oldId = idOf(g, v);
    g.c(n).id = oldId; g.c(v).id = newId; // the set-aside card takes the old identity; damage, status and attachments stay on Loki
    g.log(`로키가 바뀝니다: ${g.nm(v)}`, 'warn');
    for (const a of g.c(v).att) if (idOf(g, a) === '21172') g.giveStatus(v, 'tough', '로키의 망토');
  }
  S['21160'] = { cannotTakeDamage: g => g.e.sides.length > 0 };
  S['21161'] = {}; S['21162'] = {}; S['21163'] = {}; S['21164'] = { attackProps: () => ({ piercing: true }) };
  S['21165a'] = { async setup(g) {
    const e = g.e;
    // the starting Loki is random among the five
    const pool = lokiPool(g); const pick = pool[Math.floor(g.rand() * pool.length)];
    if (pick) { const a = idOf(g, pick); g.c(pick).id = idOf(g, e.villain); g.c(e.villain).id = a; }
    const war = e.aside.find(u => idOf(g, u) === '21167'); if (war) await g.enterSide(war, {});
    setupGauntlet(g); await stoneIntoPlay(g);
  } };
  S['21165b'] = { on: { villainAdvanced(g, x, ctx) { // All Hail King Loki: in expert, the second Loki is a random set-aside one (the defeated one stays in the victory display)
    const v = ctx.villain; const pool = lokiPool(g); if (!v || !pool.length) return;
    const n = pool[Math.floor(g.rand() * pool.length)]; g.c(v).id = idOf(g, n); g.removeFromGame(n);
    if (g.d(v).toughness) g.c(v).tough = true; g.log(`로키 왕 만세: 따로 놓아둔 로키 중 무작위로 ${g.nm(v)}이(가) 나옵니다`, 'warn');
  } } };
  const lokiSide = { async whenDefeated(g) { await stoneIntoPlay(g); swapLoki(g); } };
  ['21166', '21167', '21168', '21169'].forEach(id => { S[id] = lokiSide; });
  const lokiAttach = (cost, extra) => Object.assign({ attachTo: g => g.e.villain, boostEffect: putIntoPlay(),
    respond: [{ window: 'afterBasicAttack', timing: 'hero', label: '→ 이 카드 버리기', cost, can: (g, u, ctx) => ctx.target === g.c(u).on, async resolve(g, u) { g.discard(u, `${g.nm(u)} 버림`); } }] }, extra || {});
  S['21170'] = lokiAttach({ n: 2, req: 'YR' }); // Loki's Staff (+1 ATK data)
  S['21171'] = lokiAttach({ n: 2, req: 'BR' }); // Loki's Crown (+1 SCH data)
  S['21172'] = lokiAttach({ n: 2, req: 'YB' }); // Loki's Cape
  S['21172'].boostEffect = undefined;
  S['21173'] = { attachTo: g => g.e.villain, // Master of Illusions
    on: { wouldTakeDamage(g, a, ctx) { if (ctx.target !== g.c(a).on || !ctx.attack || ctx.amount - ctx.prevent <= 0) return; const d = g.discardEncounterN(1); if (d[0] && g.d(d[0]).type === 'treachery') { ctx.prevent = ctx.amount; g.discard(a, '환영의 대가: 피해를 모두 방지하고 버림'); } } } };
  S['21174'] = { // Devious Sorcery
    async whenRevealedAlter(g) { if (!g.giveStatus(g.idt(), 'stun', '교활한 마법') && g.e.main) await g.placeThreat(g.e.main, 2, {}); },
    async whenRevealedHero(g, u) { if (!g.giveStatus(g.idt(), 'stun', '교활한 마법')) await g.dealDamage(g.idt(), 2, { src: u }); }
  };
  S['21175'] = { async whenRevealed(g) { (g.e.stoneDiscard || []).slice().forEach(u => g.put(u, 'stones')); g.shuffle(g.e.stones || []); await stoneIntoPlay(g); }, // Infinite Mischief
    boostEffect(g) { const s = topStone(g); if (!s) return 0; g.put(s, 'stonedis'); return g.boostOf(s); } };
  S['21176'] = { async whenRevealed(g) { swapLoki(g); if (g.e.villain) await g.activate(g.e.villain, {}); }, boostEffect(g, u, ctx) { moreBoost(g, u, ctx); if (g.e.villain) g.giveStatus(g.e.villain, 'tough', '사기꾼'); } }; // The Trickster

  // ======================= Campaign: The Mad Titan's Shadow (cards/pack/mts/campaign.py, the_mad_titans_shadow_campaign) =======================
  const MTS = 'mad_titans_shadow', CSIDE = { 1: '21180a', 2: '21182a', 3: '21184a', 4: '21186a', 5: '21189a' };
  const yes = (g, k) => g.clog(k) === 'Yes';
  const intoEnc = (g, id) => { g.newCard(id, 'edeck'); g.shuffle(g.e.deck); };
  const intoDeck = (g, id) => { g.newCard(id, 'deck'); g.shuffle(g.p.deck); };
  const intoDeckEach = (g, id) => g.forEachPlayer(() => { g.newCard(id, 'deck'); g.shuffle(g.p.deck); });
  MC.CAMPAIGNS[MTS] = {
    async setup(g, spec) {
      const lv = spec.level || 1;
      const cs = g.newCard(CSIDE[lv], 'limbo'); g.log(`캠페인: 캠페인 부가 음모 「${g.nm(cs)}」 공개`, 'warn'); await g.reveal(cs);
      if (lv === 1 || ([2, 3].includes(lv) && yes(g, 'Security Breach in campaign pool'))) intoEnc(g, '21181');
      if (lv >= 3 && yes(g, 'Shawarma in campaign pool')) await intoDeckEach(g, '21183');
      if (lv === 3) {
        if (yes(g, 'Cosmo in campaign pool')) { const c = g.newCard('21180b', 'limbo'); await g.withPlayer(g.s.first, () => g.putAllyIntoPlay(c)); }
        if (yes(g, 'Black Swan in campaign pool')) { const b = g.newCard('21182b', 'limbo'); await g.withPlayer(g.s.first, () => g.enterMinion(b, {}, true)); }
      }
      if (lv >= 4) {
        intoEnc(g, '21188');
        if (yes(g, 'System Shock in campaign pool')) await intoDeckEach(g, '21185');
        if (yes(g, 'The Infinity Stones 1B was completed')) await g.forEachPlayer(() => { const n = Math.floor(g.p.deck.length / 2); g.p.deck.slice(0, n).forEach(x => g.put(x, 'discard')); g.log(`캠페인(${g.playerName()}): 덱의 절반(${n}장)을 버립니다`, 'warn'); });
      }
      if (lv === 5) {
        if (yes(g, 'Norn Stone in campaign pool')) g.withPlayerSync(g.s.first, () => g.newCard('21187a', 'upgrade'));
        if (yes(g, 'Odin in campaign pool')) { const o = g.newCard('21139b', 'limbo'); await g.withPlayer(g.s.first, () => g.putAllyIntoPlay(o)); }
        ['21190', '21191', '21192', '21193'].forEach(id => g.newCard(id, 'aside'));
      }
      if (lv < 2) return;
      await g.forEachPlayer(async () => {
        const hp = g.clogPInt('Remaining hit points'); if (hp) g.setIdentityHP(hp);
        if (g.s.scen.expert && g.c(g.idt()).dmg > 0 && await g.ask({ type: 'choice', title: `숙련 캠페인(${g.playerName()}): 주 음모에 가속 토큰 1개를 놓고 생명력을 모두 회복할까요?`, options: [{ id: 'y', label: '가속 토큰 놓고 회복' }, { id: 'n', label: '안 함' }] }) === 'y') {
          const m = g.e.main; g.c(m).cnt.accelTok = (g.c(m).cnt.accelTok || 0) + 1; g.c(g.idt()).dmg = 0; g.log('숙련 캠페인: 주 음모에 가속 토큰 1개, 생명력 모두 회복', 'warn');
        }
        if (lv === 3 && yes(g, 'Avengers Tower has the Damaged trait')) await g.dealDamage(g.idt(), 3, {});
      });
    }
  };
  [['21074a', 1], ['21098a', 2], ['21114a', 3], ['21138a', 4], ['21165a', 5]].forEach(([id, lv]) => { S[id] = Object.assign(S[id] || {}, { campaign: { level: lv } }); });
  const flipSide = async (g, u, to) => { g.c(u).id = to; g.c(u).threat = 0; g.log(`${g.nm(u)}(으)로 뒤집힙니다`, 'warn'); };
  S['21180a'] = { async whenDefeated(g, u) { const c = g.newCard('21180b', 'limbo'); await g.withPlayer(g.s.first, () => g.putAllyIntoPlay(c)); g.log(`코스모가 ${g.playerName(g.s.first)}의 조종하에 들어옵니다`, 'good'); } }; // Secure the Landing Pad → Cosmo
  S['21180b'] = { noAllyLimit: true, removeOnLeave: true, on: firstCtrl() }; // Cosmo
  S['21139b'] = { noAllyLimit: true, removeOnLeave: true, noEncAttach: true, on: firstCtrl() }; // Odin (King side)
  S['21181'] = { whenRevealed(g, u) { if (!g.p.hand.length) return; const x = g.p.hand[Math.floor(g.rand() * g.p.hand.length)]; g.put(x, 'under', u); g.c(x).fd = true; g.log('보안 침해: 손 카드 1장을 이 카드 아래에', 'warn'); }, // Security Breach
    whenDefeated(g, u) { for (const x of g.c(u).under.slice()) { g.c(x).fd = false; g.put(x, 'hand'); } } };
  S['21182a'] = { async whenDefeated(g) { await intoDeckEach(g, '21183'); const b = g.newCard('21182b', 'limbo'); await g.enterMinion(b, {}, true); } }; // Save the Shawarma Shop → Black Swan
  S['21182b'] = { on: { async minionEnters(g, u, ctx) { if (ctx.minion !== u) return; const pi = g.c(u).eng != null ? g.c(u).eng : g.s.ctx; await g.withPlayer(pi, async () => { if (!g.p.hand.length) return; const t = await g.ask({ type: 'target', title: `블랙 스완(${g.playerName()}): 버릴 손 카드`, cands: g.p.hand.slice(), cancelable: false }) || g.p.hand[0]; g.put(t, 'discard'); }); } } }; // Black Swan
  S['21184a'] = { async whenDefeated(g) { await g.forEachPlayer(async () => { const c = g.p.deck.concat(g.p.discard); if (c.length) { const t = await g.ask({ type: 'target', title: `생추어리 컴퓨터 해킹(${g.playerName()}): 손에 더할 카드`, cands: c, cancelable: false }) || c[0]; g.put(t, 'hand'); g.shuffle(g.p.deck); } }); const d = g.newCard('21184b', 'limbo'); await g.enterSide(d, {}); } }; // Hack the Sanctuary Computer → Defense Protocols
  S['21184b'] = { on: { async playerPhaseEnd(g, u) { if (g.c(u).zone !== 'side') return; const c = g.c(u).cnt; c.error = (c.error || 0) + 1; g.log(`방어 프로토콜: 오류 카운터 ${c.error}`, 'warn'); if (c.error >= 2) { await g.forEachPlayer(() => { g.newCard('21185', 'hand'); }); g.log('시스템 쇼크를 손에 더합니다', 'warn'); g.removeFromGame(u); } } } };
  S['21185'] = { onHand() {}, noDiscardFromHand: true, actions: [{ timing: 'alter', label: '[정신] → 시스템 쇼크를 게임에서 제거', cost: { n: 1, req: 'B' }, can: (g, u) => g.c(u).zone === 'hand', use(g, u) { g.removeFromGame(u); g.log('시스템 쇼크 제거', 'good'); } }] }; // System Shock
  S['21186a'] = { blocksRemoval: (g, x, sc) => sc === x && !(g.e.villain && g.hasTrait(g.e.villain, 'WOUNDED')), async whenDefeated(g) { g.withPlayerSync(g.s.first, () => g.newCard('21187a', 'upgrade')); const d = g.newCard('21186b', 'limbo'); await g.enterSide(d, {}); } }; // Find the Norn Stone → Retrieve Odin's Armor
  S['21186b'] = { blocksRemoval: (g, x, sc) => sc === x && !g.allAllies().some(a => ['21139a', '21139b'].includes(g.c(a).id)), whenDefeated(g) { const o = g.allAllies().find(a => ['21139a', '21139b'].includes(g.c(a).id)); if (o) { g.c(o).dmg = 0; g.c(o).id = '21139b'; g.log('오딘이 [왕] 면으로 뒤집힙니다', 'good'); } } };
  const norn = { permanent: true, mod: ['thw', 'atk', 'def'].reduce((m, k) => (m[k] = (g, s, t) => { const pc = g.s.ps[g.c(s).ctrl]; return pc && t === pc.identity && pc.form === 'hero' && g.c(s).zone === 'upgrade' ? 1 : 0; }, m), {}) };
  S['21187a'] = Object.assign({ actions: [{ timing: 'hero', label: '노른 스톤: 히어로 준비 후 뒤집기', can: (g, u) => g.c(u).zone === 'upgrade', use(g, u) { g.c(g.idt()).ex = false; g.c(u).id = '21187b'; g.log('노른 스톤: 히어로를 준비합니다', 'good'); } }] }, norn);
  S['21187b'] = Object.assign({ actions: [{ timing: 'alter', exhaust: true, label: '노른 스톤 소진 → 피해 1 회복', can: (g, u) => g.c(u).zone === 'upgrade' && !g.c(u).ex && g.c(g.idt()).dmg > 0, use(g, u) { g.c(u).ex = true; g.heal(g.idt(), 1); } }] }, norn);
  S['21188'] = { async whenRevealed(g) { const H = MC.heroes[g.p.heroKey || g.s.heroKey] || {}; const m = g.e.deck.concat(g.e.discard, g.e.setaside || [], g.e.aside).find(x => g.d(x).type === 'minion' && (H.nemesis || []).includes(g.c(x).id)); g.shuffle(g.e.deck); if (m) { g.log(`역소환: ${g.nm(m)}이(가) 교전합니다`, 'warn'); await g.enterMinion(m, {}, true); } } }; // Recall
  S['21189a'] = { async whenDefeated(g) { const c = g.e.aside.filter(x => ['21190', '21191', '21192', '21193'].includes(g.c(x).id)); if (c.length) { const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '지하 감옥을 열어라: 데려갈 [포로] 동료', cands: c, cancelable: false }) || c[0]; await g.withPlayer(g.s.first, () => g.putAllyIntoPlay(t)); } // Open the Dungeons → Jörmungandr
    const j = g.newCard('21189b', 'limbo'); if (g.e.villain) g.attachEnc(j, g.e.villain); } };
  S['21189b'] = { mod: { hp: (g, s, t) => g.c(s).zone === 'attach' && t === g.c(s).on ? 4 * g.players : 0 } };
  S['21190'] = { actions: [{ timing: 'action', label: '[물리] → 레이디 시프 준비', cost: { n: 1, req: 'R' }, can: (g, u) => g.c(u).zone === 'ally' && g.c(u).ex, use(g, u) { g.c(u).ex = false; } }] }; // Lady Sif
  S['21191'] = { allyIgnores: ['crisis'] }; // Fandral: his basic thwart ignores crisis icons
  S['21192'] = { basicAttackProps: { piercing: true } }; // Hogun
  S['21193'] = {}; // Volstagg (retaliate, toughness)
  MC.registerScripts(S);
})();
