/* SP//dr (31001-31037): Peni Parker and the SP//dr Suit, Interface upgrades, Protection cards, nemesis set
   and the Iron Spider's Sinister Six modular set. Ported from cards/pack/spdr of the community build.
   The port keeps one identity card (Suit hero side / Peni alter side) plus one companion card that is
   the inactive Suit (support) in alter-ego form and the SP//dr pilot upgrade (Interface) in hero form. */
(function () {
  'use strict';
  const S = {};
  const has = (g, u, t) => g.hasTrait(u, t);
  const pick = async (g, cands, title) => !cands.length ? null : cands.length === 1 ? cands[0] : await g.ask({ type: 'target', title, cands, cancelable: false });
  const COMP = ['31001b', '31002b'];
  const companion = g => Object.keys(g.s.cards).find(u => COMP.includes(g.c(u).id) && ['support', 'upgrade', 'pset'].includes(g.c(u).zone)) || null;
  const isSpdr = g => ['31001a', '31002a'].includes(g.c(g.idt()).id);
  const interfaces = g => g.p.upgrades.filter(u => has(g, u, 'INTERFACE'));
  const webWarriors = g => g.controlled().filter(u => has(g, u, 'WEB-WARRIOR'));
  const synced = g => (g.p.syncUsed || 0) > 0;
  async function dmgEnemy(g, n, title, src, attack) {
    const t = await g.chooseTarget(attack ? 'attackable' : 'enemy', title, g.idt(), false); if (!t) return null;
    if (attack) return { t, r: await g.playerAttack(g.idt(), t, n, { src }) };
    return { t, r: await g.dealDamage(t, n, { src, byPlayer: true }) };
  }
  function placeCompanion(g) { // hero form: SP//dr pilot upgrade; alter-ego: inactive Suit support
    const c = companion(g); if (!c) return;
    const hero = g.isHero(); const want = hero ? '31002b' : '31001b';
    const cc = g.c(c); cc.id = want; g.put(c, hero ? 'upgrade' : 'support'); cc.ex = false;
  }

  // ======================= identity =======================
  // Sync Ratio: exhaust an Interface upgrade you control → generate that upgrade's resources
  // the ready Interface upgrades are listed once per payment (index 0 is asked first), so several can be used together
  const syncRes = Array.from({ length: 8 }, (_, i) => ({
    gen: (g) => { if (i === 0) g._syncSnap = interfaces(g).filter(u => !g.c(u).ex); const f = (g._syncSnap || [])[i]; return f ? (g.d(f).res || '') : ''; },
    label: (g) => { const f = (g._syncSnap || [])[i]; return f ? `싱크로율: ${g.nm(f)} 소진` : '싱크로율'; },
    can: g => g.isHero() && isSpdr(g) && interfaces(g).filter(u => !g.c(u).ex).length > i,
    use: (g) => { const f = (g._syncSnap || [])[i]; if (f && !g.c(f).ex) { g.c(f).ex = true; g.p.syncUsed = (g.p.syncUsed || 0) + (g.d(f).res || '').length; } }
  }));
  const formSwap = { formChanged(g) { placeCompanion(g); } };
  S['31001a'] = { resources: syncRes, on: formSwap };
  S['31002a'] = { on: formSwap,
    setup(g) { const c = (g.p.pset || []).find(u => COMP.includes(g.c(u).id)); if (c) { g.c(c).id = '31001b'; g.put(c, 'support'); g.log('준비: SP//dr 슈트를 비활성 면으로 플레이에 놓습니다'); } },
    actions: [{ timing: 'alter', label: '정비: SP//dr 슈트 소진 → 카드 2장 뽑기', can: g => { const c = companion(g); return !!c && g.c(c).zone === 'support' && !g.c(c).ex; }, async use(g) { g.c(companion(g)).ex = true; await g.draw(2); } }] };
  S['31001b'] = {}; // inactive Suit (permanent support)
  S['31002b'] = {}; // SP//dr pilot (permanent Interface upgrade, printed [wild])

  // ======================= hero cards =======================
  S['31003'] = { mod: { thw: (g, s, t) => t === s ? (g.c(s).cnt.sym || 0) : 0, atk: (g, s, t) => t === s ? (g.c(s).cnt.sym || 0) : 0 }, // VEN#m
    onPlay(g, u) { const n = g.p.syncUsed || 0; if (n && g.isHero()) { g.c(u).cnt.sym = n; g.log(`VEN#m: 심 카운터 ${n}개`, 'good'); } } };
  S['31004'] = { play: { timing: 'hero', async resolve(g) { // All Systems Go!
    const k = await g.ask({ type: 'choice', title: '전 시스템 가동!', options: [{ id: 'ready', label: '[인터페이스] 업그레이드 모두 준비' }, { id: 'search', label: '덱·버림 더미에서 [인터페이스] 업그레이드를 손으로' }] });
    if (k === 'search') await g.searchToHand(d => d.type === 'upgrade' && (d.tr || []).includes('INTERFACE'), '전 시스템 가동!', { discard: true });
    else for (const f of interfaces(g)) if (g.canReady(f)) g.c(f).ex = false;
  } } };
  S['31005'] = { play: { timing: 'hero', label: 'thwart', target: 'thwartable', async resolve(g, u, ctx) { // Rapid Deployment
    const sy = synced(g); const r = await g.removeThreat(ctx.target, 3, { src: u }); g.log(`신속 배치: 위협 ${r} 제거`); await g.afterThreatRemoved(ctx.target);
    if (sy && g.schemes().some(x => g.c(x).threat > 0)) await g.removeThreatChoose(3, '신속 배치 (싱크로율): 위협 3을 더 제거할 음모', u);
  } } };
  S['31006'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { const sy = synced(g); await g.playerAttack(g.idt(), ctx.target, 5, { src: u }); if (sy && g.c(ctx.target).zone) g.giveStatus(ctx.target, 'stun', '거미줄 덫'); } } }; // Web-Trap
  S['31007'] = { actions: [{ timing: 'action', exhaust: true, label: '소진·덱 위 2장(일상 모습이면 3장) 버림 → SP//dr 카드를 손으로', async use(g) { // Aunt May & Uncle Ben
    const n = g.isHero() ? 2 : 3; let got = 0;
    for (let i = 0; i < n && g.p.deck.length; i++) { const x = g.p.deck[0]; if (g.d(x).cls === 'Hero') { g.put(x, 'hand'); got++; } else g.put(x, 'discard'); }
    g.log(`메이 숙모와 벤 삼촌: ${n}장 확인, SP//dr 카드 ${got}장 손으로`);
  } }] };
  S['31008'] = { actions: [{ timing: 'hero', label: '버리기 → 비상 탈출', async use(g, u) { // Ejection Protocol
    g.discard(u); for (const f of interfaces(g)) g.c(f).ex = true;
    const id = g.idt(); g.c(id).dmg = Math.max(0, g.maxHp(id) - 6); g.giveStatus(id, 'tough', '탈출 프로토콜');
    g.log('탈출 프로토콜: 체력을 6으로, 강인함, 일상 모습으로', 'warn'); await g.changeForm(true);
  } }] };
  S['31009'] = { actions: [ // SP//dr Command
    { timing: 'hero', exhaust: true, label: '소진·[인터페이스] 1 소진 → 카드 1장 뽑기', can: g => interfaces(g).some(f => !g.c(f).ex), async use(g) { const f = await pick(g, interfaces(g).filter(x => !g.c(x).ex), '소진할 [인터페이스] 업그레이드'); if (f) { g.c(f).ex = true; await g.draw(1); } } },
    { timing: 'hero', exhaust: true, label: '소진·손 1장 버림 → [인터페이스] 1 준비', can: g => g.p.hand.length > 0 && interfaces(g).some(f => g.c(f).ex), async use(g) { await g.discardFromHand(1, 1, 'SP//dr 사령부: 버릴 카드'); const f = await pick(g, interfaces(g).filter(x => g.c(x).ex), '준비시킬 [인터페이스] 업그레이드'); if (f && g.canReady(f)) g.c(f).ex = false; } }
  ] };
  S['31010'] = { actions: [{ timing: 'hero', exhaust: true, label: '소진 → SP//dr 슈트 준비', can: g => g.c(g.idt()).ex, async use(g) { if (g.canReady(g.idt())) g.c(g.idt()).ex = false; } }] }; // Host Spider
  const basicBoost = (kind, label) => ({ respond: [{ window: 'basicPowerUsed', timing: 'hero', exhaust: true, label, can: (g, u, ctx) => ctx.kind === kind && isSpdr(g), async resolve(g, u, ctx) { ctx.bonus += 2; } }] });
  S['31011'] = basicBoost('thwart', '소진 → 이번 저지 +2'); // Psychic Link
  S['31012'] = basicBoost('defend', '소진 → 이번 방어 +2'); // Speed-Metal Alloy
  S['31013'] = basicBoost('attack', '소진 → 이번 공격 +2'); // Web-Fluid Compressor
  S['31025'] = { async whenRevealed(g, u) { // Inherited Burden
    await g.heroObligation(u, '물려받은 짐', '[인터페이스] 업그레이드 1장 버림 → 이 카드 버림', async () => {
      const c = interfaces(g).filter(f => !g.d(f).permanent); const t = await pick(g, c, '버릴 [인터페이스] 업그레이드'); if (t) g.discard(t, `${g.nm(t)} 버림`);
      if (g.c(u).zone === 'limbo') g.discard(u);
    });
  } };
  S['31026'] = { thwartCost: { n: 1, req: 'Y' } }; // Giant Monster Attack
  S['31027'] = { on: { async resourcesGenerated(g, u, ctx) { if (g.c(u).zone === 'minion' && (g.c(u).eng ?? 0) === g.s.ctx && g.isHero() && ctx.n > 0) { g.log(`M.O.R.B.I.U.S.: 자원 ${ctx.n}개 → 피해 ${ctx.n}`, 'warn'); await g.dealDamage(g.idt(), ctx.n, { src: u }); } } } }; // M.O.R.B.I.U.S.
  S['31028'] = { async whenRevealed(g) { // Energy Drain
    const can = g.canAfford({ n: 2, req: 'YY' }, null);
    const other = g.isHero() ? '피해 3' : '정체성 소진';
    const k = can ? await g.ask({ type: 'choice', title: '에너지 고갈', options: [{ id: 'pay', label: '[에너지][에너지] 지불' }, { id: 'no', label: other }] }) : 'no';
    if (k === 'pay' && await g.pay({ n: 2, req: 'YY' }, null, '에너지 고갈', false)) return;
    if (g.isHero()) await g.dealDamage(g.idt(), 3, {}); else g.c(g.idt()).ex = true;
  } };

  // ======================= Protection / Leadership / Basic =======================
  S['31014'] = { respond: [{ window: 'afterAllyDefends', label: '피해 1을 공격한 적에게 옮기기', can: (g, u, ctx) => ctx.ally === u && g.c(u).dmg > 0 && g.c(ctx.enemy) && g.c(ctx.enemy).zone, async resolve(g, u, ctx) { g.c(u).dmg--; await g.dealDamage(ctx.enemy, 1, { src: u, byPlayer: true }); } }] }; // Daredevil
  const noirX = (g, s) => g.c(s).att.filter(a => g.c(a).fd).length;
  S['31015'] = { mod: { atk: (g, s, t) => t === s ? noirX(g, s) : 0, thw: (g, s, t) => t === s ? noirX(g, s) : 0 }, // Spider-Man Noir
    respond: [{ window: 'treacheryResolved', label: '그 배반 카드를 뒷면으로 붙이기', can: (g, u, ctx) => webWarriors(g).some(x => x !== u) && noirX(g, u) < 3, async resolve(g, u, ctx) { g.put(ctx.card, 'attach', u); g.c(ctx.card).fd = true; g.log(`스파이더맨 누아르: ${g.nm(ctx.card)}을(를) 뒷면으로 붙임`); } }] };
  S['31016'] = { play: { timing: 'hero', can: g => g.controlled().some(x => g.d(x).type === 'upgrade' && has(g, x, 'TECH') && !g.d(x).permanent), async resolve(g) { // Repurpose
    const c = g.controlled().filter(x => g.d(x).type === 'upgrade' && has(g, x, 'TECH') && !g.d(x).permanent); const t = await pick(g, c, '재활용: 버릴 [기술] 업그레이드'); if (!t) return;
    const n = g.d(t).cost || 0; g.discard(t, `${g.nm(t)} 버림`); if (g.canReady(g.idt())) g.c(g.idt()).ex = false;
    const k = await g.ask({ type: 'choice', title: `재활용: +${n}을 받을 능력 (라운드 끝까지)`, options: [{ id: 'thw', label: '저지' }, { id: 'atk', label: '공격' }, { id: 'def', label: '방어' }] });
    if (n) g.addRoundMod(g.idt(), k || 'atk', n);
  } } };
  S['31017'] = { play: { timing: 'hero', can: g => g.friendlyChars().some(f => has(g, f, 'WEB-WARRIOR')) && g.enemies().length > 0, async resolve(g) { // Thwip! Thwip!
    const w = await pick(g, g.friendlyChars().filter(f => has(g, f, 'WEB-WARRIOR')), '피해 1을 받을 [웹 워리어] 캐릭터'); if (!w) return; await g.dealDamage(w, 1, {});
    const a = await g.chooseTarget('enemy', '기절시킬 적 (1번째)', g.idt(), false); if (!a) return; g.giveStatus(a, 'stun', '휙! 휙!');
    const b = await g.chooseTarget('enemy', '기절시킬 적 (2번째, 같은 적도 가능)', g.idt(), false); if (b) g.giveStatus(b, 'stun', '휙! 휙!');
  } } };
  S['31019'] = { on: { wouldTakeDamage(g, u, ctx) { // Forcefield Generator
    if (ctx.target !== g.idt() || g.c(u).zone !== 'upgrade') return; const left = ctx.amount - ctx.prevent, have = g.c(u).cnt.energy || 0; const n = Math.min(left, have); if (n <= 0) return;
    g.c(u).cnt.energy -= n; ctx.prevent += n; g.log(`역장 발생기: 에너지 ${n}개로 피해 ${n} 방지`, 'good'); if (!g.c(u).cnt.energy) g.discard(u, '역장 발생기: 카운터가 다 떨어졌습니다');
  } } };
  S['31020'] = { willRevealHook: true, respond: [{ window: 'willReveal', label: '[웹 워리어]에게 피해 1 → 배반이면 공개 시 효과 취소', can: g => g.friendlyChars().some(f => has(g, f, 'WEB-WARRIOR')), async resolve(g, u, ctx) { // Spider-Tingle
    const w = await pick(g, g.friendlyChars().filter(f => has(g, f, 'WEB-WARRIOR')), '피해 1을 받을 [웹 워리어] 캐릭터'); if (w) await g.dealDamage(w, 1, {});
    if (g.d(ctx.card).type === 'treachery') { g.c(ctx.card).noWR = true; g.discard(u, '스파이더 감각 버림'); } else g.log(`스파이더 감각: ${g.nm(ctx.card)}은(는) 배반 카드가 아닙니다`);
  } }] };
  S['31021'] = { canPlay: g => webWarriors(g).length > 0, on: { async allyBasicPower(g, u, ctx) { // Spider-Ham (ally)
    if (ctx.ally !== u || g.c(u).zone !== 'ally') return; const x = g.takeEncounter(); if (!x) return; g.put(x, 'ediscard'); const n = g.boostOf(x);
    g.log(`★ 스파이더햄: ${g.nm(x)} 버림 (강화 ${n})`); if (n) await g.dealDamage(u, n, {});
  } } };
  S['31022'] = { canPlay: g => webWarriors(g).length > 0, async onPlay(g) { // Spider-Man (ally)
    const c = g.controlled().filter(x => g.d(x).type === 'upgrade' && g.c(x).ex); const t = await pick(g, c, '스파이더맨: 준비시킬 업그레이드'); if (!t) return;
    if (g.canReady(t)) g.c(t).ex = false; if (has(g, t, 'TECH')) await g.draw(1);
  } };
  const big = g => (MC.cards[g.p.heroId] || {}).hp >= 14 || (MC.cards[g.p.alterId] || {}).hp >= 14;
  S['31023'] = { canPlay: big, play: { timing: 'hero', can: g => big(g) && g.c(g.idt()).ex, async resolve(g) { if (g.canReady(g.idt())) g.c(g.idt()).ex = false; } } }; // Limitless Stamina
  S['31024'] = { canPlay: big, steadyFor: (g, s, t) => t === g.idt() }; // Unshakable
  S['31029'] = { attach: { kind: 'friendly', filter: (g, t) => !g.c(t).att.some(a => g.c(a).id === '31029') }, // Clarity of Purpose
    resources: [{ gen: 'G', label: '목적의 명확함 (소진·피해 1)', can: (g, u) => { const h = g.hostOf(u); return g.isHero() && !g.c(u).ex && !!h && g.hpLeft(h) > 1; }, use: (g, u) => { g.c(u).ex = true; const h = g.hostOf(u); g.c(h).dmg++; g.log(`목적의 명확함: ${g.nm(h)} 피해 1`); } }] };

  // ======================= Iron Spider's Sinister Six (modular) =======================
  const criminals = g => g.e.minions.filter(m => has(g, m, 'CRIMINAL'));
  S['31030'] = { noRemove: g => criminals(g).length > 0 }; // Grand Larceny
  S['31031'] = { attackProps: () => ({ splitEven: true }), // Bombshell (minion)
    async boostEffect(g) { await g.forEachPlayer(async () => { const before = g.friendlyChars().map(f => [f, g.c(f).dmg]); await g.indirectDamage(1, null); for (const [f, d] of before) if (g.c(f).zone && g.c(f).dmg > d) g.c(f).ex = true; }); } };
  const electroGrab = async (g, u) => { const c = g.p.hand.filter(x => (g.d(x).res || '').includes('Y')); const t = await pick(g, c, '★ 일렉트로: 붙일 [에너지] 카드'); if (t) { g.put(t, 'attach', u); g.log(`일렉트로: ${g.nm(t)}을(를) 흡수`, 'warn'); } };
  S['31032'] = { mod: { hp: (g, s, t) => t === s ? g.c(s).att.reduce((n, a) => n + ((g.d(a).res || '').match(/Y/g) || []).length, 0) : 0 }, // Electro
    on: { async minionEnters(g, u, ctx) { if (ctx.minion === u) await electroGrab(g, u); }, async enemyActivated(g, u, ctx) { if (ctx.enemy === u && g.c(u).zone === 'minion') await electroGrab(g, u); } } };
  S['31033'] = { async insteadOfAttack(g, u) { // Hobgoblin
    const n = g.stat(u, 'atk'); let icons = 0; for (let i = 0; i < n; i++) { const x = g.takeEncounter(); if (!x) break; g.put(x, 'ediscard'); icons += g.boostOf(x); }
    g.log(`★ 홉고블린: 공격 대신 조우 덱 ${n}장 버림, 강화 ${icons}`, 'warn'); if (icons) await g.indirectDamage(icons, u);
  } };
  S['31034'] = { attackProps: () => ({ overkill: true }) }; // Iron Spider
  const discard7 = g => { let k = 0; for (let i = 0; i < 7; i++) { const x = g.takeEncounter(); if (!x) break; g.put(x, 'ediscard'); k++; } g.log(`조우 덱 ${k}장 버림`); };
  S['31035'] = { on: { afterTakeDamage(g, u, ctx) { if (ctx.target === u && g.c(u).zone === 'minion' && ctx.attack) discard7(g); } }, boostEffect(g) { discard7(g); } }; // Sandman (minion)
  S['31036'] = { whenDefeated(g, u, ctx) { if (!(ctx && ctx.excess)) { g.put(u, 'edeck'); g.shuffle(g.e.deck); g.log('스팟: 초과 피해 없이 격파되어 조우 덱에 섞입니다', 'warn'); } }, // Spot
    boostEffect(g, u, ctx) { (ctx.post || ctx.after).push(async gg => { if (gg.c(u).zone && gg.c(u).zone !== 'minion') { gg.log('★ 스팟이 교전합니다', 'warn'); await gg.enterMinion(u, {}, true); } }); } };
  S['31037'] = { surgeFor: (g, s, m) => (g.d(m).tr || []).includes('CRIMINAL'), // Surge in Crime
    actions: [{ timing: 'hero', label: '자원 2 → 이 카드 버림 ([범죄자] 하수인이 없을 때)', cost: { n: 2, req: '' }, can: g => criminals(g).length === 0, async use(g, u) { g.discard(u, '범죄 급증 버림'); } }] };

  MC.registerScripts(S);
})();
