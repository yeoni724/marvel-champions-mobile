/* Spider-Ham (30001-30038): toon counters, his hero set, Justice cards, nemesis set and The Inheritors modular set.
   Ported from cards/pack/spiderham of the community build. */
(function () {
  'use strict';
  const S = {};
  const has = (g, u, t) => g.hasTrait(u, t);
  const pick = async (g, cands, title) => !cands.length ? null : cands.length === 1 ? cands[0] : await g.ask({ type: 'target', title, cands, cancelable: false });
  const isHam = g => ['30001a', '30001b'].includes(g.c(g.idt()).id);
  const toon = g => isHam(g) ? (g.c(g.idt()).cnt.toon || 0) : 0;
  const addToon = (g, n) => { const c = g.c(g.idt()).cnt; c.toon = (c.toon || 0) + n; g.log(`툰 카운터 +${n} (현재 ${c.toon})`, 'good'); };
  const useToon = g => { const c = g.c(g.idt()).cnt; if (!(c.toon > 0)) return false; c.toon--; return true; };
  const webWarriors = g => g.controlled().filter(u => has(g, u, 'WEB-WARRIOR'));
  async function dmgEnemy(g, n, title, src, attack, kind) {
    const t = await g.chooseTarget(kind || (attack ? 'attackable' : 'enemy'), title, g.idt(), false); if (!t) return null;
    if (attack) return { t, r: await g.playerAttack(g.idt(), t, n, { src }) };
    return { t, r: await g.dealDamage(t, n, { src, byPlayer: true }) };
  }

  // ======================= identity =======================
  // each toon counter can be spent as a [wild] resource (Spider-Ham side)
  const toonRes = Array.from({ length: 10 }, (_, i) => ({ gen: 'G', label: '툰 카운터', can: g => g.isHero() && isHam(g) && toon(g) > i, use: g => { useToon(g); } }));
  S['30001a'] = { resources: toonRes, on: { afterTakeDamage(g, u, ctx) { if (ctx.target === g.idt() && g.isHero() && isHam(g)) { addToon(g, 1); } } } };
  S['30001b'] = { resources: toonRes, on: { afterRecover(g) { if (isHam(g)) addToon(g, 1); } } };

  // ======================= hero cards =======================
  S['30002'] = { async onEnter(g) { // Captain Americat
    g.log('캡틴 아메리캣: 하이파이브!'); addToon(g, 1);
    const c = g.p.discard.filter(x => g.d(x).cls === 'Hero'); const t = await pick(g, c, '덱에 섞을 스파이더햄 카드'); if (t) { g.put(t, 'deck'); g.shuffle(g.p.deck); }
  } };
  S['30003'] = { play: { timing: 'hero', label: 'thwart', target: 'thwartable', can: g => toon(g) > 0, async resolve(g, u, ctx) { const r = await g.removeThreat(ctx.target, toon(g), { src: u }); g.log(`잔뜩 오버하기: 위협 ${r} 제거`); await g.afterThreatRemoved(ctx.target); } } }; // Ham It Up
  S['30004'] = { play: { timing: 'hero', can: g => toon(g) > 0 && (g.e.minions.length > 0 || g.e.sides.some(x => g.c(x).threat > 0)), async resolve(g, u) { // Hogwashed
    if (!useToon(g)) return; g.log('「돼지 세척」! (풍미 텍스트를 크게 읽어 주세요)');
    const opts = []; if (g.e.minions.length) opts.push({ id: 'm', label: '하수인에게 피해 5' }); if (g.e.sides.some(x => g.c(x).threat > 0)) opts.push({ id: 's', label: '부가 음모에서 위협 5 제거' });
    const k = opts.length === 1 ? opts[0].id : await g.ask({ type: 'choice', title: '돼지 세척', options: opts });
    if (k === 'm') await dmgEnemy(g, 5, '피해 5를 줄 하수인', u, false, 'minion');
    else { const s = await pick(g, g.e.sides.filter(x => g.c(x).threat > 0), '위협 5를 제거할 부가 음모'); if (s) { await g.removeThreat(s, 5, { src: u }); await g.afterThreatRemoved(s); } }
  } } };
  S['30005'] = { interrupt: { window: 'cardRevealed', timing: 'hero', label: '툰 1 → 그 카드 효과 취소하고 버림', can: (g, u, ctx) => toon(g) > 0 && !ctx.cancelAll, async resolve(g, u, ctx) { if (!useToon(g)) return; g.log('"어림없지!"', 'good'); ctx.cancelAll = true; } } }; // "I Don't Think So!"
  S['30006'] = { play: { timing: 'hero', async resolve(g) { g.log('메롱! 빌런이 당신을 공격합니다'); if (g.e.villain) await g.enemyAttack(g.e.villain, {}); await g.draw(3); } } }; // Petulant Pig
  S['30007'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { await g.playerAttack(g.idt(), ctx.target, 6, { src: u }); if (g.c(ctx.target).zone) g.giveStatus(ctx.target, 'conf', '스윙잉 웹 피그'); } } }; // Swinging Web Pig
  S['30008'] = { actions: [{ timing: 'alter', exhaust: true, label: '소진 → 피터 포커에게 툰 카운터 1', can: g => isHam(g), async use(g) { addToon(g, 1); } }] }; // The Daily Beagle
  S['30009'] = { respond: [{ window: 'identityWouldTakeDamage', label: '버리기 → 피해를 1만 남기고 방지', can: (g, u, ctx) => ctx.amount - ctx.prevent > 1, async resolve(g, u, ctx) { g.discard(u); ctx.prevent = ctx.amount - 1; g.log('카툰 물리학: 몸을 흔들어 피해 1만 받습니다', 'good'); } }] }; // Cartoon Physics
  S['30010'] = { mod: { atk: (g, s, t) => t === g.idt() && isHam(g) ? 1 : 0 }, // Huge Wooden Hammer
    respond: [{ window: 'basicPowerUsed', timing: 'hero', exhaust: true, label: '소진·툰 1 → 이번 공격 +2, 압도', can: (g, u, ctx) => ctx.kind === 'attack' && toon(g) > 0, async resolve(g, u, ctx) { if (!useToon(g)) return; ctx.bonus += 2; ctx.overkill = true; } }] };
  S['30011'] = { mod: { thw: (g, s, t) => t === g.idt() && isHam(g) ? 1 : 0 }, // Organic Webbing
    actions: [{ timing: 'hero', exhaust: true, label: '소진·툰 1 → 스파이더햄 준비, [공중] (이번 단계)', can: g => toon(g) > 0 && g.c(g.idt()).ex, async use(g) { if (!useToon(g)) return; if (g.canReady(g.idt())) g.c(g.idt()).ex = false; g.addPhaseMod(g.idt(), 'tr:AERIAL', 1); } }] };
  S['30024'] = { async whenRevealed(g, u, ctx) { // "I Really Want a Hot Dog!"
    if (g.isHero() && !g.formLocked() && await g.ask({ type: 'choice', title: '"핫도그 먹고 싶어!": 일상 모습으로 변신할 수 있습니다', options: [{ id: 'flip', label: '일상 모습으로 변신' }, { id: 'stay', label: '그대로' }] }) === 'flip') await g.changeForm(true);
    const opts = []; if (!g.isHero() && !g.c(g.idt()).ex && toon(g) > 0) opts.push({ id: 'remove', label: '피터 포커 소진·툰 1 → 이 카드를 게임에서 제거' });
    opts.push({ id: 'stun', label: '기절 (이미 기절이면 쇄도) → 이 카드 버림' });
    const k = opts.length === 1 ? 'stun' : await g.ask({ type: 'choice', title: '"핫도그 먹고 싶어!"', options: opts });
    if (k === 'remove') { g.c(g.idt()).ex = true; useToon(g); g.removeFromGame(u); return; }
    if (g.c(g.idt()).stun) ctx.surge++; else g.giveStatus(g.idt(), 'stun', '"핫도그 먹고 싶어!"');
  } };
  const gobbler = g => g.e.minions.find(m => g.c(m).id === '30026') || null;
  S['30025'] = { async whenDefeated(g) { // Nefarious Trap
    let m = gobbler(g);
    if (m) { await g.enemyAttack(m, {}); return; }
    m = g.searchEncounter(d => d.id === '30026') || (g.e.setaside || []).find(x => g.c(x).id === '30026'); g.shuffle(g.e.deck);
    if (m) { g.log('사악한 함정: 그린 고블러가 교전합니다', 'warn'); await g.enterMinion(m, {}, true); }
  } };
  S['30026'] = { on: { minionEnters(g, u, ctx) { if (ctx.minion !== u) return; for (const x of g.controlled()) g.c(x).cnt = {}; g.log('그린 고블러: 내가 조종하는 카드의 카운터를 모두 버립니다', 'warn'); } } }; // The Green Gobbler
  S['30027'] = { attachTo: g => gobbler(g) || g.e.minions[0] || null, grantTrait: (g, s, t) => t === g.c(s).on ? 'AERIAL' : null }; // Gobbler Glider
  S['30028'] = { async whenRevealed(g, u, ctx) { await g.dealDamage(g.idt(), 2, {}); if (g.c(g.idt()).conf) ctx.surge++; else g.giveStatus(g.idt(), 'conf', '"이거나 먹어라!"'); } }; // "Feast on This!"

  // ======================= Justice / Basic =======================
  S['30012'] = { respond: [{ window: 'afterAllyThwart', label: '다른 음모에서 같은 만큼 위협 제거', can: (g, u, ctx) => ctx.ally === u && (ctx.removed || 0) > 0 && webWarriors(g).some(x => x !== u) && g.schemes().some(x => x !== ctx.scheme && g.c(x).threat > 0), // Lady Spider
    async resolve(g, u, ctx) { const t = await pick(g, g.schemes().filter(x => x !== ctx.scheme && g.c(x).threat > 0), `레이디 스파이더: 위협 ${ctx.removed}을 제거할 다른 음모`); if (t) { await g.removeThreat(t, ctx.removed, { src: u }); await g.afterThreatRemoved(t); } } }] };
  S['30013'] = { async onEnter(g, u) { const n = webWarriors(g).length; if (n && g.schemes().some(x => g.c(x).threat > 0)) await g.removeThreatChoose(n, `스파이더맨: 위협 ${n}을 제거할 음모`, u); } }; // Spider-Man (Web-Warrior)
  S['30014'] = { play: { timing: 'hero', label: 'thwart', can: g => g.e.sides.some(x => g.c(x).threat > 0), async resolve(g, u) { // Even the Odds
    let n = 0; for (const s of g.e.sides.slice()) { await g.removeThreat(s, 1, { src: u }); if (g.c(s).threat === 0) n++; await g.afterThreatRemoved(s); }
    if (n && g.e.villain) await g.dealDamage(g.e.villain, n, { src: u, byPlayer: true });
  } } };
  S['30019'] = { attach: { kind: 'anyScheme', filter: (g, t) => !g.c(t).att.some(a => g.c(a).id === '30019') }, watchesThreat: true, // Overwatch
    respond: [{ window: 'threatRemovedFrom', timing: 'hero', label: '버리기 → 다른 음모에서 같은 만큼 위협 제거', can: (g, u, ctx) => ctx.scheme === g.c(u).on && g.schemes().some(x => x !== ctx.scheme && g.c(x).threat > 0),
      async resolve(g, u, ctx) { const from = ctx.scheme; g.discard(u); const t = await pick(g, g.schemes().filter(x => x !== from && g.c(x).threat > 0), `감시: 위협 ${ctx.removed}을 제거할 다른 음모`); if (t) { await g.removeThreat(t, ctx.removed, { src: u }); await g.afterThreatRemoved(t); } } }] };
  const TYPES = [['minion', '하수인'], ['treachery', '배반'], ['attachment', '부착물'], ['side', '부가 음모'], ['environment', '환경'], ['obligation', '의무']];
  S['30020'] = { canPlay: g => webWarriors(g).length > 0, willRevealHook: true, // Scarlet Spider
    respond: [{ window: 'willReveal', label: '카드 종류를 말하고 확인', can: (g, u) => g.c(u).zone === 'ally', async resolve(g, u, ctx) {
      const k = await g.ask({ type: 'choice', title: '스칼렛 스파이더: 카드 종류를 말하세요', options: TYPES.map(([id, label]) => ({ id, label })) });
      const hit = g.d(ctx.card).type === k; g.log(`스칼렛 스파이더: ${(TYPES.find(x => x[0] === k) || [])[1]} → ${g.nm(ctx.card)} (${hit ? '적중' : '빗나감'})`);
      if (hit) { await g.dealDamage(u, 1, {}); await g.draw(1); }
    } }] };
  S['30021'] = { canPlay: g => webWarriors(g).length > 0, consToHand: true }; // SP//dr (ally)
  S['30029'] = { attach: { kind: 'friendly', filter: (g, t) => /spider/i.test(g.d(t).en || g.d(t).name || '') && !g.c(t).att.some(a => g.c(a).id === '30029') && !(t === g.idt() && g.p.upgrades.some(a => g.c(a).id === '30029')) }, // Warrior of the Great Web
    grantTrait: (g, s, t) => (t === g.c(s).on || (g.c(s).zone === 'upgrade' && t === g.idt())) ? 'WEB-WARRIOR' : null,
    respond: [{ window: 'allyDefeated', label: '부착된 캐릭터 공격 +1 (이번 단계)', can: (g, u, ctx) => g.d(ctx.ally).tr && (g.d(ctx.ally).tr || []).includes('WEB-WARRIOR'), async resolve(g, u) { const h = g.c(u).on || g.idt(); g.addPhaseMod(h, 'atk', 1); } }] };

  // ======================= The Inheritors (modular) =======================
  const inh = (g, t) => g.e.minions.includes(t) && has(g, t, 'INHERITOR');
  const anyWeb = g => g.allFriendlyChars().some(f => has(g, f, 'WEB-WARRIOR'));
  S['30030'] = { on: { async villainPhaseBegins(g) { // Hunting the Spider-Totems
    const got = []; for (let i = 0; i < 3; i++) { const x = g.takeEncounter(); if (!x) break; g.put(x, 'ediscard'); if (g.d(x).type === 'minion' && (g.d(x).tr || []).includes('INHERITOR')) got.push(x); }
    g.log(`스파이더 토템 사냥: 조우 덱 3장 버림, 계승자 ${got.length}명 등장`, 'warn');
    const webs = g.livingPlayers().filter(i => g.withPlayerSync(i, () => g.friendlyChars().some(f => has(g, f, 'WEB-WARRIOR'))));
    const targetPi = webs.length ? webs[0] : g.s.first;
    for (const m of got) await g.withPlayer(targetPi, () => g.enterMinion(m, {}, true));
  } } };
  const heir = (grant, wr) => Object.assign({ async whenRevealed(g, u, ctx) { if (anyWeb(g)) await wr(g, u, ctx); } }, grant);
  S['30031'] = heir({ accelBonus: g => g.e.minions.filter(m => has(g, m, 'INHERITOR')).length }, async g => { for (const s of g.schemes().slice()) await g.placeThreat(s, 1, {}); }); // Bora
  S['30032'] = heir({ grantKw: (g, s, t) => inh(g, t) ? ['patrol'] : null }, async g => { await g.placeThreat(g.e.main, 2, {}); }); // Brix
  S['30033'] = heir({ stalwartFor: (g, s, t) => inh(g, t) }, async g => { const t = await pick(g, g.friendlyChars(), '데모스: 기절시킬 내 캐릭터'); if (t) g.giveStatus(t, 'stun', '데모스'); }); // Daemos
  S['30034'] = heir({ grantKw: (g, s, t) => inh(g, t) ? ['guard'] : null }, async (g, u) => { g.giveStatus(u, 'tough', '제닉스'); }); // Jennix
  S['30035'] = heir({ grantKw: (g, s, t) => inh(g, t) ? ['overkillAtk', 'piercingAtk'] : null }, async g => { // Karn
    const c = g.p.upgrades.concat(g.p.supports, ...g.friendlyChars().map(f => g.c(f).att.filter(a => !g.d(a).enc))).filter(x => !g.d(x).permanent);
    const t = await pick(g, c, '칸: 버릴 업그레이드 또는 지원'); if (t) g.discard(t, `${g.nm(t)} 버림`);
  });
  S['30036'] = heir({ mod: { atk: (g, s, t) => inh(g, t) ? 1 : 0 } }, async g => { await g.dealDamage(g.idt(), 2, {}); }); // Morlun
  S['30037'] = heir({ grantKw: (g, s, t) => inh(g, t) ? ['villainous'] : null }, async (g, u) => { g.giveFacedownBoostTo(u, 1); g.log('솔루스: 뒷면 강화 카드 1장', 'warn'); }); // Solus
  S['30038'] = heir({ mod: { retaliate: (g, s, t) => inh(g, t) ? 1 : 0 } }, async g => { for (const x of g.friendlyChars().slice()) await g.dealDamage(x, 1, {}); }); // Verna

  MC.registerScripts(S);
})();
