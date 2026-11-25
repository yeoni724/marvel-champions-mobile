/* Venom (20001-20029): his hero set, Justice cards and nemesis set.
   Ported from cards/pack/vnm of the community build. */
(function () {
  'use strict';
  const S = {};
  const oncePhase = (g, k) => !g.p.usedOnce[k + ':' + g.s.phase];
  const useOncePhase = (g, k) => { g.p.usedOnce[k + ':' + g.s.phase] = true; };
  const weaponUps = g => g.controlled().filter(x => g.d(x).type === 'upgrade' && g.hasTrait(x, 'WEAPON'));
  const only = (paid, l) => !!paid && paid.length > 0 && paid.every(x => x === l);
  async function dmgEnemy(g, n, title, src, attack) {
    const t = await g.chooseTarget(attack ? 'attackable' : 'enemy', title, src, false); if (!t) return null;
    if (attack) await g.playerAttack(g.idt(), t, n, { src }); else await g.dealDamage(t, n, { src, byPlayer: true });
    return t;
  }
  const extraRestricted = { restrictedPlus: (g, self, uid) => self === g.idt() ? 1 : 0 };

  // ======================= identity =======================
  S['20001a'] = Object.assign({ resources: [{ gen: 'G', label: '공생 결합 (피해 1, 단계당 1번)', can: g => oncePhase(g, 'symbiotic'),
    use(g) { // sync: take 1 damage (a tough status card prevents it)
      useOncePhase(g, 'symbiotic'); const id = g.idt();
      if (g.c(id).tough) { g.c(id).tough = false; g.log('공생 결합: 강인함으로 피해 방지'); return; }
      g.c(id).dmg++; g.log('공생 결합: 피해 1', 'dmg'); if (g.hpLeft(id) <= 0) g.lose(`${g.nm(id)}이(가) 쓰러졌습니다`);
    } }] }, extraRestricted);
  S['20001b'] = Object.assign({ async setup(g) { // Armed and Ready
    const seen = [];
    while (g.p.deck.length) { const x = g.p.deck[0]; if (seen.includes(x)) break; if (g.d(x).type === 'upgrade' && (g.d(x).tr || []).includes('WEAPON')) { g.put(x, 'hand'); g.log(`무장 완료: ${g.nm(x)}을(를) 손으로`, 'good'); return; } g.put(x, 'discard'); seen.push(x); }
  } }, extraRestricted);

  // ======================= hero cards =======================
  S['20002'] = { play: { timing: 'hero', label: 'thwart', target: 'thwartable', async resolve(g, u, ctx) { // Behind Enemy Lines
    const r = await g.removeThreat(ctx.target, 3, { src: u }); g.log(`적진 한가운데: ${g.nm(ctx.target)} 위협 ${r} 제거`); await g.afterThreatRemoved(ctx.target);
    if (only(ctx.paid, 'B') && g.enemies().length) { const t = await g.chooseTarget('enemy', '혼란시킬 적', u, false); if (t) g.giveStatus(t, 'conf', '적진 한가운데'); }
  } } };
  S['20003'] = { interrupt: { window: 'villainAttackInitiated', timing: 'hero', can: (g, u, ctx) => !ctx.cancel, async resolve(g, u, ctx, paid) { // Grasping Tendrils
    ctx.cancel = true; g.log('움켜쥐는 촉수: 공격 취소', 'good'); if (only(paid, 'R') && g.e.villain) g.giveStatus(g.e.villain, 'stun', '움켜쥐는 촉수');
  } } };
  S['20004'] = { play: { timing: 'action', async resolve(g) { await g.searchToHand(d => d.type === 'upgrade' && (d.tr || []).includes('WEAPON'), '장전 완료'); } } }; // Locked and Loaded
  S['20005'] = { play: { timing: 'hero', async resolve(g) { const id = g.idt(); if (g.canReady(id)) g.c(id).ex = false; weaponUps(g).forEach(x => { g.c(x).ex = false; }); g.log('달리며 쏘기: 베놈과 무기 준비', 'good'); } } }; // Run and Gun
  S['20006'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { await g.playerAttack(g.idt(), ctx.target, 5, { overkill: only(ctx.paid, 'Y') }); } } }; // Savage Attack
  S['20007'] = { actions: [{ timing: 'alter', exhaust: true, label: '소진 → 카드 1장 뽑기 또는 피해 3 회복', async use(g) { // Project Rebirth 2.0
    const k = g.c(g.idt()).dmg > 0 ? await g.ask({ type: 'choice', title: '재탄생 프로젝트 2.0', options: [{ id: 'draw', label: '카드 1장 뽑기' }, { id: 'heal', label: '피해 3 회복' }] }) : 'draw';
    if (k === 'heal') g.heal(g.idt(), 3); else await g.draw(1);
  } }] };
  S['20008'] = { actions: [{ timing: 'hero', exhaust: true, label: '소진 → 적에게 피해 2 / 하수인마다 피해 1 / 위협 2 제거', async use(g, u) { // Multi-Gun
    const opts = [];
    if (g.enemies().length) opts.push({ id: 'dmg', label: '적에게 피해 2' });
    if (g.e.minions.length) opts.push({ id: 'min', label: '교전 중인 하수인마다 피해 1' });
    if (g.targets('thwartable').length) opts.push({ id: 'thw', label: '음모에서 위협 2 제거' });
    if (!opts.length) return;
    const k = opts.length === 1 ? opts[0].id : await g.ask({ type: 'choice', title: '멀티건', options: opts });
    if (k === 'dmg') await dmgEnemy(g, 2, '멀티건: 피해 2를 줄 적', u);
    else if (k === 'min') { const pi = await g.choosePlayer('멀티건: 대상 플레이어'); for (const m of g.engagedMinions(pi).slice()) await g.dealDamage(m, 1, { src: u, byPlayer: true }); }
    else await g.removeThreatChoose(2, '멀티건: 위협 2를 제거할 음모', u);
  } }] };
  S['20009'] = { respond: [{ window: 'villainAttackInitiated', timing: 'hero', label: '카드 1장 뽑기', async resolve(g) { await g.draw(1); } }] }; // Spider-Sense
  S['20010'] = { respond: [{ window: 'basicPowerUsed', timing: 'hero', exhaust: true, label: '소진 → 이번 기본 능력 +1', async resolve(g, u, ctx) { ctx.bonus += 1; } }] }; // Venom's Pistol
  S['20023'] = { async whenRevealed(g, u, ctx) { // Struggle for Control
    if (g.isHero() && !g.formLocked()) {
      const f = await g.ask({ type: 'choice', title: '통제권 다툼: 일상 모습으로 변신할 수 있습니다', options: [{ id: 'flip', label: '일상 모습으로 변신' }, { id: 'no', label: '그대로 둔다' }] });
      if (f === 'flip') await g.changeForm(true);
    }
    const opts = [];
    if (!g.isHero() && !g.c(g.idt()).ex) opts.push({ id: 'ex', label: '플래시 톰슨 소진·피해 2 → 이 카드 버림' });
    opts.push({ id: 'sym', label: '따로 둔 성난 심비오트를 교전 상태로 (없으면 쇄도) → 이 카드 버림' });
    const k = opts.length === 1 ? opts[0].id : await g.ask({ type: 'choice', title: '통제권 다툼: 하나를 고르세요', options: opts });
    if (k === 'ex') { g.c(g.idt()).ex = true; await g.dealDamage(g.idt(), 2, { src: u }); }
    else { const s = g.e.setaside.find(x => g.c(x).id === '20025'); if (s) await g.withPlayer(g.s.first, () => g.enterMinion(s, {}, true)); else { g.log('성난 심비오트가 없어 쇄도'); ctx.surge++; } }
    if (g.c(u).zone === 'limbo') g.discard(u);
  } };
  // nemesis
  S['20024'] = { noRemove: g => g.enemies().some(x => g.hasTrait(x, 'SYMBIOTE')) }; // Klyntar Frenzy
  S['20025'] = { boostEffect(g, u, ctx) { (ctx.putIntoPlay = ctx.putIntoPlay || []).push(u); } }; // Enraged Symbiote

  // ======================= Justice / other aspects / Basic =======================
  S['20011'] = { // Jack Flag
    respond: [{ window: 'afterAllyThwart', label: '탄약 카운터 1개', can: (g, u, ctx) => ctx.ally === u, async resolve(g, u) { g.c(u).cnt.ammo = (g.c(u).cnt.ammo || 0) + 1; } }],
    actions: [{ timing: 'hero', exhaust: true, label: '소진·탄약 1 → 적에게 피해 2', can: (g, u) => (g.c(u).cnt.ammo || 0) > 0 && g.enemies().length > 0, async use(g, u) { g.c(u).cnt.ammo--; await dmgEnemy(g, 2, '잭 플래그: 피해 2를 줄 적', u); } }]
  };
  S['20012'] = { play: { timing: 'hero', label: 'attack', target: { kind: 'attackable', filter: (g, t) => g.c(t).conf }, async resolve(g, u, ctx) { await g.playerAttack(g.idt(), ctx.target, 3, {}); } } }; // Scare Tactic
  S['20013'] = { interrupt: { window: 'basicPowerUsed', timing: 'hero', can: (g, u, ctx) => ctx.kind === 'thwart', async resolve(g, u, ctx) { // Making an Entrance
    ctx.bonus += 2; const t = ctx.target;
    (ctx.after = ctx.after || []).push(async gg => { if (!gg.c(t).zone || gg.c(t).threat === 0) { const h = gg.heal(gg.idt(), 2); if (h) gg.log(`화려한 등장: 피해 ${h} 회복`, 'good'); } });
  } } };
  S['20015'] = { actions: [{ timing: 'hero', exhaust: true, label: '소진·충전 1 → 적 혼란 (이미 혼란이면 피해 3)', can: (g, u) => (g.c(u).cnt.charge || 0) > 0 && g.enemies().length > 0, // Sonic Rifle
    async use(g, u) { g.c(u).cnt.charge--; const t = await g.chooseTarget('enemy', '음파 소총: 대상', u, false); if (t) { if (g.c(t).conf) await g.dealDamage(t, 3, { src: u, byPlayer: true }); else g.giveStatus(t, 'conf', '음파 소총'); } } }] };
  S['20016'] = { basicAttackProps: { ranged: true }, onEnter(g) { const x = g.takeEncounter(); if (x) { g.put(x, 'facedown'); g.log('스타로드: 조우 카드 1장을 뒷면으로 받았습니다', 'warn'); } } }; // Star-Lord (ally)
  S['20021'] = { restrictedPlus: (g, self, uid) => uid && (g.d(uid).tr || []).includes('WEAPON') ? 1 : 0 }; // Side Holster
  S['20022'] = { actions: [{ timing: 'hero', exhaust: true, label: '소진·충전 1 → 적에게 피해 1', can: (g, u) => (g.c(u).cnt.charge || 0) > 0 && g.enemies().length > 0, // Plasma Pistol
    async use(g, u) { g.c(u).cnt.charge--; await dmgEnemy(g, 1, '플라스마 권총: 피해 1을 줄 적', u); } }] };
  S['20026'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', can: g => weaponUps(g).some(x => !g.c(x).ex), async resolve(g, u, ctx) { // Fusillade
    const c = weaponUps(g).filter(x => !g.c(x).ex); if (!c.length) return;
    const w = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '소진할 무기 업그레이드', cands: c, cancelable: false }); g.c(w).ex = true;
    await g.playerAttack(g.idt(), ctx.target, 5, {});
  } } };
  S['20027'] = { play: { timing: 'hero', can: g => g.hasTrait(g.idt(), 'GUARDIAN') && !g.p.usedOnce.welcome, async resolve(g) { g.p.usedOnce.welcome = true; g.p.phase.nextAllyRed = 2; g.log('"어서 와": 이번 단계 다음 동료 비용 2 감소', 'good'); } } }; // "Welcome Aboard"
  S['20028'] = { interrupt: { window: 'tookAttackDamage', timing: 'hero', can: (g, u, ctx) => g.hasTrait(ctx.target, 'GUARDIAN') && !g.c(ctx.target).tough, async resolve(g, u, ctx) { g.giveStatus(ctx.target, 'tough', '털어 버려'); } } }; // Shake it Off
  S['20029'] = { actions: [{ timing: 'alter', exhaust: true, label: '소진 → 일상 모습 피해 1 회복', can: g => !g.isHero() && g.c(g.idt()).dmg > 0, async use(g) { g.heal(g.idt(), 1); } }] }; // Crew Quarters

  MC.registerScripts(S);
})();
