/* War Machine (23001-23035): ammo counters, his hero set, Leadership cards and nemesis set.
   Ported from cards/pack/warm of the community build. */
(function () {
  'use strict';
  const S = {};
  const has = (g, u, t) => (g.d(u).tr || []).includes(t);
  const ammo = g => g.c(g.idt()).cnt.ammo || 0;
  const addAmmo = (g, n) => { const c = g.c(g.idt()).cnt; c.ammo = (c.ammo || 0) + n; g.log(`워 머신: 탄약 ${c.ammo}`); };
  const useAmmo = (g, n) => { const c = g.c(g.idt()).cnt; if ((c.ammo || 0) < n) return false; c.ammo -= n; return true; };
  const isWM = g => ['23001a', '23001b'].includes(g.c(g.idt()).id);
  async function dmgEnemy(g, n, title, src, attack, props) {
    const t = await g.chooseTarget(attack ? 'attackable' : 'enemy', title, g.idt(), false); if (!t) return null;
    if (attack) await g.playerAttack(g.idt(), t, n, Object.assign({ src }, props || {})); else await g.dealDamage(t, n, { src, byPlayer: true });
    return t;
  }
  const training = cls => ({ actions: [{ timing: 'alter', exhaust: true, label: `소진·훈련 1 → 버림 더미의 ${({ Protection: '수호', Justice: '정의', Leadership: '통솔', Aggression: '용맹' })[cls]} 이벤트를 덱에 섞기`, can: (g, u) => (g.c(u).cnt.training || 0) > 0 && g.p.discard.some(x => g.d(x).type === 'event' && g.d(x).cls === cls),
    async use(g, u) { g.c(u).cnt.training--; const c = g.p.discard.filter(x => g.d(x).type === 'event' && g.d(x).cls === cls); const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '덱에 섞을 이벤트', cands: c, cancelable: false }); g.put(t, 'deck'); g.shuffle(g.p.deck); g.cleanupUses(u); } }] });
  const allyPick = async (g, title) => { const c = g.p.allies.slice(); if (!c.length) return null; return c.length === 1 ? c[0] : await g.ask({ type: 'target', title, cands: c, cancelable: false }); };

  // ======================= identity =======================
  S['23001a'] = { respond: [{ window: 'afterChangeForm', label: '장전 완료: 탄약 카운터 5개', can: (g, u, ctx) => ctx.form === 'hero', async resolve(g) { addAmmo(g, 5); } }] };
  S['23001b'] = {
    actions: [{ timing: 'alter', label: '버림 더미의 워 머신 카드 1장을 덱에 섞기', can: g => g.p.discard.some(x => g.d(x).cls === 'Hero'), async use(g) { const c = g.p.discard.filter(x => g.d(x).cls === 'Hero'); const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '덱에 섞을 카드', cands: c, cancelable: false }); g.put(t, 'deck'); g.shuffle(g.p.deck); } }],
    on: { formChanged(g, u, ctx) { if (ctx.form === 'alter' && g.c(u).cnt.ammo) { g.c(u).cnt.ammo = 0; g.log('제임스 로즈: 탄약 카운터를 모두 버립니다'); } } }
  };

  // ======================= hero cards =======================
  S['23002'] = { async onEnter(g) { await g.searchToHand(d => d.type === 'upgrade' && (d.tr || []).includes('TECH'), '아이언맨: 기술 업그레이드', { discard: true }); } }; // Iron Man (ally)
  S['23003'] = { actions: [ // Munitions Bunker
    { timing: 'alter', exhaust: true, label: '소진 → 여기에 탄약 2개', async use(g, u) { g.c(u).cnt.ammo = (g.c(u).cnt.ammo || 0) + 2; } },
    { timing: 'hero', exhaust: true, label: '소진 → 여기 탄약을 모두 워 머신에게', can: (g, u) => (g.c(u).cnt.ammo || 0) > 0, async use(g, u) { addAmmo(g, g.c(u).cnt.ammo); g.c(u).cnt.ammo = 0; } }] };
  S['23004'] = { grantTrait: (g, s, t) => t === g.idt() && g.isHero() ? 'AERIAL' : null, // Upgraded Chassis
    respond: [{ window: 'afterChangeForm', timing: 'hero', exhaust: true, label: '소진 → 워 머신에게 강인함', can: (g, u, ctx) => ctx.form === 'hero', async resolve(g) { g.giveStatus(g.idt(), 'tough', '강화 섀시'); } }] };
  S['23005'] = { resources: [{ gen: 'G', label: '건틀릿 건 (소진, 워 머신 이벤트 전용, 탄약 +1)', can: (g, u) => !g.c(u).ex, forOnly: (g, u, f) => g.d(f).type === 'event' && g.d(f).cls === 'Hero', use: (g, u) => { g.c(u).ex = true; if (isWM(g)) { const c = g.c(g.idt()).cnt; c.ammo = (c.ammo || 0) + 1; } } }] }; // Gauntlet Gun
  S['23006'] = { actions: [{ timing: 'hero', exhaust: true, label: '소진·탄약 1 → 적에게 피해 2 (원거리)', can: g => ammo(g) > 0 && g.targets('attackable', g.idt()).length > 0, async use(g, u) { // Missile Launcher
    useAmmo(g, 1); if (await g.statusBlocks('attack')) return; await dmgEnemy(g, 2, '미사일 발사기: 대상', u, true, { ranged: true });
  } }] };
  S['23007'] = { actions: [{ timing: 'hero', exhaust: true, label: '소진 → 적에게 피해 1 (탄약 1로 다시 준비 가능)', can: g => g.targets('attackable', g.idt()).length > 0, async use(g, u) { // Shoulder Cannon
    if (!(await g.statusBlocks('attack'))) await dmgEnemy(g, 1, '숄더 캐논: 대상', u, true);
    if (ammo(g) > 0 && await g.ask({ type: 'choice', title: '숄더 캐논', options: [{ id: 'y', label: '탄약 1 제거 → 다시 준비' }, { id: 'n', label: '그대로 둔다' }] }) === 'y') { useAmmo(g, 1); g.c(u).ex = false; }
  } }] };
  const ammoEvent = (n, label, fn, kind) => ({ play: { timing: 'hero', label: kind, can: g => ammo(g) >= n, async resolve(g, u, ctx) { if (!useAmmo(g, n)) return; await fn(g, u, ctx); } } });
  S['23008'] = ammoEvent(1, '', async (g, u) => { await dmgEnemy(g, 4, '리펄서 빔: 대상', u, true); }, 'attack'); // Repulsor Beam
  S['23009'] = ammoEvent(1, '', async (g, u) => { await g.removeThreatChoose(3, '정밀 타격: 위협 3을 제거할 음모', u); }, 'thwart'); // Targeted Strike
  S['23010'] = ammoEvent(3, '', async (g, u) => { for (const x of g.enemies().slice()) await g.dealDamage(x, 3, { src: u, byPlayer: true }); }); // Scorched Earth
  S['23011'] = ammoEvent(4, '', async (g, u) => { await dmgEnemy(g, 8, '풀 오토: 대상', u, true, { overkill: true }); }, 'attack'); // Full Auto
  S['23028'] = { async whenRevealed(g, u, ctx) { // Equipment Malfunction
    await g.heroObligation(u, '장비 오작동', '정체성의 탄약 카운터 모두 제거 (2개 이하면 쇄도) → 이 카드 버림', async () => {
      const n = g.c(g.idt()).cnt.ammo || 0; g.c(g.idt()).cnt.ammo = 0; g.log(`탄약 ${n}개 제거`);
      if (n <= 2) { g.log('2개 이하라 쇄도'); ctx.surge++; }
      if (g.c(u).zone === 'limbo') g.discard(u);
    });
  } };
  S['23029'] = { attackProps: () => ({ piercing: true }) }; // Living Laser
  S['23030'] = { async whenDefeated(g, u) { await g.forEachPlayer(async () => { await g.dealDamage(g.idt(), 1, { src: u }); }); } }; // Deadly Light Show
  const discardUpgrade = async g => { const ups = g.controlled().filter(x => g.d(x).type === 'upgrade'); if (!ups.length) return false; const t = ups.length === 1 ? ups[0] : await g.ask({ type: 'target', title: '버릴 업그레이드', cands: ups, cancelable: false }); g.discard(t, `${g.nm(t)} 버림`); return true; };
  S['23031'] = { async whenRevealed(g, u, ctx) { if (!(await discardUpgrade(g))) { g.log('업그레이드가 없어 쇄도'); ctx.surge++; } }, // Laser Strike
    async boostEffect(g, u, ctx) { if (ctx.undefended === true) await discardUpgrade(g); } };

  // ======================= Leadership / other aspects / Basic =======================
  S['23012'] = { playFromAttached: true, async onEnter(g, u) { // Black Panther (ally)
    const c = g.p.discard.filter(x => g.d(x).type === 'event' && g.d(x).cls === 'Leadership'); if (!c.length) return;
    const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '블랙 팬서에게 뒷면으로 붙일 통솔 이벤트', cands: c, cancelable: false }); g.put(t, 'attach', u); g.log(`${g.nm(t)}을(를) 블랙 팬서에게 붙임`);
  } };
  S['23013'] = { async onEnter(g, u) { // Captain Marvel (ally)
    const d = []; for (let i = 0; i < 4 && g.p.deck.length; i++) { const x = g.p.deck[0]; g.put(x, 'discard'); d.push(x); }
    const n = d.filter(x => (g.d(x).res || '').includes('Y')).length; g.log(`캡틴 마블: 덱 위 ${d.length}장 버림, [에너지] ${n}개`);
    if (n && g.enemies().length) { const t = await dmgEnemy(g, 3, '캡틴 마블: 피해 3을 줄 적', u); if (n > 1 && t && g.c(t).zone) g.giveStatus(t, 'stun', '캡틴 마블'); }
  } };
  S['23016'] = { actions: [{ timing: 'action', exhaust: true, label: '소진·지휘 1 → 동료 1명 준비', can: (g, u) => (g.c(u).cnt.command || 0) > 0 && g.p.allies.some(a => g.c(a).ex), // Command Team
    async use(g, u) { g.c(u).cnt.command--; const c = g.p.allies.filter(a => g.c(a).ex); const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '준비시킬 동료', cands: c, cancelable: false }); if (g.canReady(t)) g.c(t).ex = false; g.cleanupUses(u); } }] };
  const sharesId = (g, x) => { const it = g.d(g.idt()).tr || []; return (g.d(x).tr || []).some(t => it.includes(t)); };
  S['23017'] = { play: { timing: 'action', can: g => g.p.hand.some(x => g.d(x).type === 'ally' && sharesId(g, x)), async resolve(g) { // Sneak Attack
    const c = g.p.hand.filter(x => g.d(x).type === 'ally' && sharesId(g, x)); const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '기습 투입: 플레이에 내놓을 동료', cands: c, cancelable: false });
    await g.putAllyIntoPlay(t); (g.p.phase.endDiscard = g.p.phase.endDiscard || []).push(t);
  } } };
  S['23018'] = { play: { timing: 'hero', can: g => g.p.allies.length > 0, async resolve(g, u) { // Save the Day
    const a = await allyPick(g, '버릴 동료'); if (!a) return; const n = g.d(a).cost || 0; g.discard(a, `${g.nm(a)} 버림`);
    if (n) await g.removeThreatChoose(n, `위기 해결: 위협 ${n}을 제거할 음모`, u);
  } } };
  S['23019'] = { play: { timing: 'hero', can: g => g.p.allies.length > 0 && g.enemies().length > 0, async resolve(g, u) { // Go Down Swinging
    const a = await allyPick(g, '버릴 동료'); if (!a) return; const n = g.d(a).cost || 0; g.discard(a, `${g.nm(a)} 버림`);
    if (n) await dmgEnemy(g, n, `끝까지 싸운다: 피해 ${n}을 줄 적`, u);
  } } };
  S['23024'] = { play: { timing: 'hero', async resolve(g) { // Two Against the World
    const c = g.p.deck.filter(x => g.d(x).type === 'upgrade' && (g.d(x).tr || []).includes('TECH'));
    if (c.length) { const t = (await g.pickCards(c, '둘이서 세상에 맞서: 플레이에 내놓을 기술 업그레이드', 1, 1, '선택'))[0]; if (t) { g.put(t, 'upgrade'); const d = g.d(t); if (d.uses) g.c(t).cnt[d.uses.kind] = d.uses.n; const f = (MC.scripts[d.id] || {}).onEnter; if (f) await f(g, t, {}); } }
    g.shuffle(g.p.deck);
    for (const f of g.friendlyChars()) if (/Iron Man|War Machine/.test(g.d(f).en || '') && g.canReady(f)) g.c(f).ex = false;
  } } };
  const exhaustPair = async (g, title) => {
    const av = g.friendlyChars().filter(f => !g.c(f).ex && g.hasTrait(f, 'AVENGER')), gu = g.friendlyChars().filter(f => !g.c(f).ex && g.hasTrait(f, 'GUARDIAN'));
    if (!av.length || !gu.length) return null;
    const a = av.length === 1 ? av[0] : await g.ask({ type: 'target', title: `${title}: 소진할 어벤저 캐릭터`, cands: av, cancelable: false });
    const gc = gu.filter(x => x !== a); if (!gc.length) return null;
    const b = gc.length === 1 ? gc[0] : await g.ask({ type: 'target', title: `${title}: 소진할 가디언 캐릭터`, cands: gc, cancelable: false });
    g.c(a).ex = true; g.c(b).ex = true; return [a, b];
  };
  const pairOk = g => { const av = g.friendlyChars().filter(f => !g.c(f).ex && g.hasTrait(f, 'AVENGER')), gu = g.friendlyChars().filter(f => !g.c(f).ex && g.hasTrait(f, 'GUARDIAN')); return av.length > 0 && gu.length > 0 && (av.length + gu.length > 1 || av[0] !== gu[0]); };
  S['23032'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', can: pairOk, async resolve(g, u, ctx) { // As One!
    const p = await exhaustPair(g, '하나로!'); if (!p) return; const n = p.reduce((t, x) => t + g.stat(x, 'atk'), 0); await g.playerAttack(g.idt(), ctx.target, n, { overkill: true });
  } } };
  S['23033'] = training('Justice'); // Vigilante Training
  S['23034'] = { interrupt: { window: 'wouldTakeAttackDamage', windows: ['allyWouldTakeDamage'], timing: 'hero', can: (g, u, ctx) => ctx.attack && pairOk(g) && ctx.amount - ctx.prevent > 0, async resolve(g, u, ctx) { // Stand Together
    if (!(await exhaustPair(g, '함께 맞선다'))) return; const n = ctx.amount - ctx.prevent; ctx.prevent = ctx.amount;
    if (ctx.src && g.c(ctx.src) && g.c(ctx.src).zone) await g.dealDamage(ctx.src, n, { src: u, byPlayer: true });
  } } };
  S['23035'] = { attach: { kind: 'ally', filter: (g, t) => !g.c(t).att.some(a => g.c(a).id === '23035') }, mod: { atk: (g, s, t) => t === g.c(s).on ? 1 : 0 }, grantRanged: true }; // Sidearm

  MC.registerScripts(S);
})();
