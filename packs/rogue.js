/* Rogue (38001-38035): Touched and borrowed traits, Protection X-Men cards, nemesis set (Mystique) and the Reavers modular set.
   Ported from cards/pack/rogue of the community build. */
(function () {
  'use strict';
  const S = {};
  const idOf = (g, u) => g.c(u).id;
  const tr = (g, u, t) => (g.d(u).tr || []).includes(t) || g.hasTrait(u, t);
  const pick = async (g, cands, title) => !cands.length ? null : cands.length === 1 ? cands[0] : await g.ask({ type: 'target', title, cands, cancelable: false });
  const TOUCHED = '38002';
  const touched = g => {
    let u = g.p.touchedUid; if (!u || !g.s.cards[u] || g.c(u).id !== TOUCHED) { u = Object.keys(g.s.cards).find(x => g.c(x).id === TOUCHED) || null; g.p.touchedUid = u; }
    return u && g.c(u).zone && g.c(u).zone !== 'removed' ? u : null;
  };
  const host = g => { const t = touched(g); return t && g.c(t).zone === 'attach' ? g.c(t).on : null; };
  const hostKind = g => { const h = host(g); if (!h) return null; if (h === g.idt()) return 'hero'; const ty = g.d(h).type; return ['minion', 'villain', 'ally'].includes(ty) ? ty : null; };
  const onFriendly = g => ['ally', 'hero'].includes(hostKind(g));
  const onEnemy = g => ['minion', 'villain'].includes(hostKind(g));
  const isRogue = g => ['38001a', '38001b'].includes(idOf(g, g.idt()));
  function setAside(g, why) { const t = touched(g); if (t && g.c(t).zone !== 'pset') { g.resetCard(t); g.put(t, 'pset'); g.log(`터치드를 따로 둡니다 (${why})`); } }
  function touch(g, t) { // attach Touched to another character and gain its traits until the end of the round
    const x = touched(g); if (!x || !t) return false;
    g.resetCard(x); g.put(x, 'attach', t);
    const got = (g.d(t).tr || []).filter(k => !(g.p.rogueTr || []).includes(k)); g.p.rogueTr = (g.p.rogueTr || []).concat(got);
    g.log(`터치드 → ${g.nm(t)}${(g.d(t).traits || []).length ? ` · 특성 획득: ${g.d(t).traits.join(', ')} (라운드 끝까지)` : ''}`, 'good');
    return true;
  }
  const touchCands = g => g.targets('character').filter(u => u !== g.idt() && u !== host(g));
  const gained = (g, s, t) => t === g.idt() && isRogue(g) ? (g.p.rogueTr || null) : null;
  const clearTr = g => { g.p.rogueTr = null; };

  // ======================= identity =======================
  S['38001a'] = {
    grantTrait: gained,
    actions: [{ timing: 'action', once: true, label: '피부 접촉: 다른 캐릭터에 터치드 부착 → 그 특성 획득', can: g => !!touched(g) && touchCands(g).length > 0,
      async use(g) { const t = await g.chooseTarget({ kind: 'character', filter: (gg, x) => x !== gg.idt() && x !== host(gg) }, '피부 접촉: 터치드를 붙일 캐릭터', g.idt(), false); touch(g, t); } }],
    on: { turnBegins(g) { setAside(g, '플레이어 단계 시작'); }, roundEnd: clearTr }
  };
  S['38001b'] = {
    grantTrait: gained,
    setup(g) { setAside(g, '준비'); },
    on: { formChanged(g, u, ctx) { if (ctx.form === 'alter') setAside(g, '움츠러들기'); }, roundEnd: clearTr }
  };
  S['38002'] = { // Touched
    canPlay: () => false,
    heroAttackPlus: g => hostKind(g) === 'minion' ? { overkill: true } : null,
    mod: { retaliate: (g, s, t) => t === g.idt() && hostKind(g) === 'villain' ? 1 : 0 },
    grantTrait: (g, s, t) => t === g.idt() && hostKind(g) === 'ally' ? 'AERIAL' : null,
    stalwartFor: (g, s, t) => t === g.idt() && hostKind(g) === 'hero'
  };

  // ======================= hero cards =======================
  S['38003'] = { // Gambit (ally)
    onEnter(g, u) { g.c(u).cnt.charge = 3; },
    respond: [{ window: 'allyPowerUsed', label: '★ 충전 카운터 1 → 적에게 피해 1', can: (g, u, ctx) => ctx.ally === u && ctx.kind === 'attack' && (g.c(u).cnt.charge || 0) > 0,
      async resolve(g, u) { g.c(u).cnt.charge--; const t = await g.chooseTarget('enemy', '갬빗: 피해 1을 줄 적', u, false); if (t) await g.dealDamage(t, 1, { src: u, byPlayer: true }); } }]
  };
  S['38004'] = { mod: { thw: (g, s, t) => t === g.idt() && onFriendly(g) ? 1 : 0, atk: (g, s, t) => t === g.idt() && onEnemy(g) ? 1 : 0 } }; // Rogue's Jacket
  S['38005'] = { play: { timing: 'hero', label: 'thwart', target: 'thwartable', async resolve(g, u, ctx) { // Goin' Rogue
    const aerial = tr(g, g.idt(), 'AERIAL'), ret = g.stat(g.idt(), 'retaliate') > 0, stal = g.stalwart(g.idt());
    const r = await g.removeThreat(ctx.target, 3 + (aerial ? 2 : 0), { src: u }); g.log(`${g.nm(ctx.target)} 위협 ${r} 제거`); await g.afterThreatRemoved(ctx.target);
    if (ret) { const t = await g.chooseTarget('enemy', '고잉 로그: 혼란에 빠뜨릴 적', g.idt(), false); if (t) g.giveStatus(t, 'conf', '고잉 로그'); }
    if (stal) await g.draw(1);
  } } };
  S['38006'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { // Southern Cross
    const aerial = tr(g, g.idt(), 'AERIAL'), ret = g.stat(g.idt(), 'retaliate') > 0, stal = g.stalwart(g.idt());
    await g.playerAttack(g.idt(), ctx.target, 6 + (aerial ? 2 : 0), { src: u });
    if (ret && g.c(ctx.target).zone && ['villain', 'minion'].includes(g.c(ctx.target).zone)) g.giveStatus(ctx.target, 'stun', '서던 크로스');
    if (stal) await g.draw(1);
  } } };
  S['38007'] = { play: { timing: 'hero', can: g => !!touched(g) && touchCands(g).length > 0, async resolve(g, u) { // Energy Transfer
    const t = await g.chooseTarget({ kind: 'character', filter: (gg, x) => x !== gg.idt() && x !== host(gg) }, '에너지 전이: 터치드를 붙이고 피해 2를 줄 캐릭터', g.idt(), false); if (!t) return;
    if (!touch(g, t)) return; await g.dealDamage(t, 2, { src: u, byPlayer: g.enemies().includes(t) });
    g.heal(g.idt(), 2); if (g.canReady(g.idt())) g.c(g.idt()).ex = false; g.log('에너지 전이: 로그 회복 2, 준비', 'good');
  } } };
  S['38008'] = { interrupt: { window: 'enemyAttackInitiated', timing: 'hero', label: 'defense', can: (g, u, ctx) => host(g) === ctx.enemy, // Bulletproof Belle
    resolve(g, u, ctx) { ctx.preventAll = true; g.giveStatus(g.idt(), 'tough', '방탄 미녀'); g.log('방탄 미녀: 이번 공격의 피해를 모두 막습니다', 'good'); } } };
  S['38009'] = { play: { timing: 'hero', can: g => onFriendly(g), async resolve(g) { // Superpower Adaptation
    const h = host(g); if (!h) return; const cls = h === g.idt() ? 'Hero' : g.d(h).cls; if (!cls) return;
    const c = g.p.discard.filter(x => g.d(x).type === 'event' && g.d(x).cls === cls); const t = await pick(g, c, '초능력 적응: 손으로 가져올 이벤트'); if (t) { g.put(t, 'hand'); g.log(`초능력 적응: ${g.nm(t)}을(를) 손으로`, 'good'); }
  } } };
  S['38024'] = { async whenRevealed(g) { // Deadly Touch
    const h = host(g);
    if (h && onFriendly(g)) { g.log('죽음의 손길: 터치드가 붙은 아군에게 피해 2', 'warn'); await g.dealDamage(h, 2, {}); }
    else { g.log('죽음의 손길: 주 음모에 위협 2', 'warn'); await g.placeThreat(g.e.main, 2, {}); }
  } };
  // nemesis: Mystique
  function misledToDeck(g, also) {
    const pool = g.e.deck.concat(g.e.discard, also ? (g.e.setaside || []) : []); const x = pool.find(u => idOf(g, u) === '38027'); if (!x) return;
    g.resetCard(x); g.put(x, 'deck'); g.shuffle(g.p.deck); g.shuffle(g.e.deck); g.log('미스디렉션(오도)을 당신의 덱에 섞습니다', 'warn');
  }
  S['38025'] = { on: { minionEnters(g, u, ctx) { if (ctx.minion === u) misledToDeck(g, true); } } }; // Mystique
  S['38026'] = { whenDefeated(g) { misledToDeck(g, false); } }; // Mystique's Manipulations
  S['38027'] = { // Misled
    async whenRevealed(g, u, ctx) { g.resetCard(u); g.put(u, 'deck'); g.shuffle(g.p.deck); g.log('오도: 당신의 덱에 섞습니다 (쇄도)', 'warn'); ctx.surge++; },
    async onHand(g, u) { g.log('오도: 손에 들어왔습니다 → 주 음모에 위협 2', 'warn'); await g.placeThreat(g.e.main, 2, { src: u }); }
  };

  // ======================= Protection / Basic / Leadership =======================
  S['38010'] = { // Iceman
    onEnter(g, u) { g.c(u).cnt.freeze = 3; },
    respond: [{ window: 'minionEntered', label: '빙결 카운터 1 → 그 하수인 기절', can: (g, u, ctx) => (g.c(u).cnt.freeze || 0) > 0 && g.c(ctx.minion).zone === 'minion',
      resolve(g, u, ctx) { g.c(u).cnt.freeze--; g.giveStatus(ctx.minion, 'stun', '아이스맨'); } }]
  };
  S['38011'] = { // Karma
    async onPlay(g, u) {
      const c = g.e.minions.filter(m => !tr(g, m, 'ELITE')); const m = await pick(g, c, '카르마: 조종할 하수인'); if (!m) return;
      g.minionToAlly(m, 2); g.c(u).karmaCtl = m;
    },
    onLeave(g, u) { const m = g.c(u).karmaCtl; delete g.c(u).karmaCtl; if (m) g.controlEnds(m); }
  };
  S['38012'] = { canPlay: g => tr(g, g.idt(), 'X-MEN') }; // Armor
  S['38014'] = { respond: [{ window: 'heroDefends', label: '유도 카운터 1 → 그 적의 이번 공격 -2', can: (g, u) => (g.c(u).cnt.judo || 0) > 0, // Judoka Skill
    resolve(g, u, ctx) { g.c(u).cnt.judo--; ctx.defBonus += 2; g.log(`유도술: ${g.nm(ctx.enemy)}의 이번 공격 -2`, 'good'); g.cleanupUses(u); } }] };
  S['38015'] = { interrupt: { window: 'boostTurned', timing: 'hero', label: 'defense', can: (g, u, ctx) => ctx.attack && ctx.enemy && g.d(ctx.enemy).type === 'villain' && !ctx.cancelIcons && ctx.icons > 0, // Preemptive Strike
    async resolve(g, u, ctx) { const n = ctx.icons; ctx.cancelIcons = true; g.log(`선제 타격: 강화 아이콘 ${n}개 취소`, 'good'); if (g.e.villain) await g.dealDamage(g.e.villain, n, { src: u, byPlayer: true }); } } };
  S['38016'] = { interrupt: { window: 'heroDefends', timing: 'hero', label: 'defense', resolve(g, u, ctx) { // Not Today!
    ctx.defBonus += 2; g.log('오늘은 안 돼!: 이번 공격 방어력 +2', 'good');
    ctx.after.push(async (gg, none) => { if (none) await gg.removeThreatChoose(2, '오늘은 안 돼!: 위협 2를 제거할 음모', u); });
  } } };
  S['38018'] = { canPlay: g => tr(g, g.idt(), 'MUTANT'), respond: [{ window: 'afterChangeForm', exhaust: true, label: '소진 → 카드 1장 뽑기', // Moira MacTaggert
    can: (g, u, ctx) => ctx.form === 'hero' && ((MC.cards[g.p.alterId] || {}).tr || []).includes('MUTANT'), async resolve(g) { await g.draw(1); } }] };
  S['38019'] = { canPlay: g => tr(g, g.idt(), 'MUTANT'), resources: [{ gen: 'G', label: 'X-유전자 (고유 이벤트 전용)', can: (g, u) => !g.c(u).ex, forOnly: (g, u, f) => g.d(f).type === 'event' && g.d(f).cls === 'Hero', use: (g, u) => { g.c(u).ex = true; } }] }; // X-Gene
  S['38028'] = { // Med Lab
    respond: [{ window: 'allyDefeated', exhaust: true, label: '소진 → 그 동료를 의료실에 둠', can: (g, u, ctx) => ctx.consequential && g.c(ctx.ally).zone === 'discard' && !(g.c(u).under || []).length,
      resolve(g, u, ctx) { g.put(ctx.ally, 'under', u); g.log(`의료실: ${g.nm(ctx.ally)}을(를) 의료실에 둡니다`, 'good'); } }],
    actions: [{ timing: 'alter', exhaust: true, label: '소진 → 의료실의 동료를 플레이 (소진 상태로 등장)', can: (g, u) => (g.c(u).under || []).length > 0,
      async use(g, u) { const a = g.c(u).under[0]; if (!a) return; g.put(a, 'hand'); await g.playCard(a); if (g.c(a).zone === 'ally') g.c(a).ex = true; else if (g.c(a).zone === 'hand') g.put(a, 'under', u); } }]
  };

  // ======================= Reavers (modular) =======================
  const reavers = g => g.engagedMinions().filter(m => tr(g, m, 'REAVER')).length;
  S['38029'] = { on: { async minionEnters(g, u, ctx) { if (ctx.minion !== u) return; // Donald Pierce
    const x = g.e.discard.slice().reverse().find(y => g.d(y).type === 'minion' && (g.d(y).tr || []).includes('REAVER')); if (x) { g.log(`도널드 피어스: 버림 더미의 ${g.nm(x)}을(를) 공개합니다`, 'warn'); await g.reveal(x); }
  } } };
  S['38030'] = { on: { async minionEnters(g, u, ctx) { if (ctx.minion === u) await g.placeThreat(g.e.main, reavers(g), { src: u }); } } }; // Skullbuster
  S['38031'] = { on: { async minionEnters(g, u, ctx) { if (ctx.minion === u) await g.indirectDamage(reavers(g), u); } } }; // Bonebreaker
  const cyber = async (g, u) => { const x = g.searchEncounter(d => d.id === '38035'); if (x) { g.attachEnc(x, u); g.shuffle(g.e.deck); } };
  S['38032'] = { whenRevealed: cyber }; // Wade Cole
  S['38033'] = { whenRevealed: cyber }; // Murray Reese
  S['38034'] = { async whenDefeated(g) { // The Reavers
    for (let i = 0; i < 60; i++) { const x = g.takeEncounter(); if (!x) break; if (g.d(x).type === 'minion' && (g.d(x).tr || []).includes('REAVER')) { g.log(`리버스: ${g.nm(x)} 공개`, 'warn'); await g.reveal(x); break; } g.put(x, 'ediscard'); }
  } };
  S['38035'] = { // Cybernetic Enhancements
    attachTo: g => g.e.minions.find(m => !g.c(m).att.some(a => idOf(g, a) === '38035')) || null, surgeIfNoHost: true,
    shieldsFromDamage: (g, u, t) => g.c(u).on === t,
    on: { afterEnemyAttack(g, u, ctx) { if (ctx.enemy === g.c(u).on) g.discard(u, '사이버네틱 강화: 공격 후 버림'); } }
  };

  MC.registerScripts(S);
})();
