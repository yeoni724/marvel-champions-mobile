/* Nebula (22001-22035): Technique upgrades with "Special" abilities, her Justice cards and nemesis set.
   Ported from cards/pack/nebu of the community build. */
(function () {
  'use strict';
  const S = {};
  const has = (g, u, t) => (g.d(u).tr || []).includes(t);
  const techs = g => g.controlled().filter(u => g.d(u).type === 'upgrade' && has(g, u, 'TECHNIQUE'));
  const hero = g => g.isHero();
  async function dmgEnemy(g, n, title, src, attack) {
    const t = await g.chooseTarget(attack ? 'attackable' : 'enemy', title, src || g.idt(), false); if (!t) return null;
    if (attack) await g.playerAttack(g.idt(), t, n, { src: src || g.idt() }); else await g.dealDamage(t, n, { src, byPlayer: true });
    return t;
  }
  async function special(g, u) { const f = g.sc(u).special; if (!f) return false; g.log(`${g.nm(u)}: 특수 능력`); await f(g, u); return true; }

  // ======================= identity =======================
  S['22001a'] = { on: { async turnBegins(g) { // Combat Protocols
    const ts = techs(g); if (!ts.length) return;
    for (const t of ts) await special(g, t);
    ts.forEach(t => { if (g.c(t).zone) g.discard(t); }); g.log('전투 프로토콜: 기술 업그레이드를 해결하고 버립니다');
  } } };
  S['22001b'] = { respond: [{ window: 'cardPlayedDone', once: true, label: '사이버네틱 업그레이드: 카드 2장 뽑기', can: (g, u, ctx) => g.d(ctx.card).type === 'upgrade' && has(g, ctx.card, 'TECHNIQUE'), async resolve(g) { await g.draw(2); } }] };

  // ======================= hero cards =======================
  S['22002'] = { async onPlay(g, u, ctx) { if (ctx && ctx.fromPut) return; const ts = techs(g); if (!ts.length) return; const t = ts.length === 1 ? ts[0] : await g.ask({ type: 'target', title: '가모라: 특수 능력을 해결할 기술', cands: ts, cancelable: false }); await special(g, t); } }; // Gamora (ally)
  S['22003'] = { resources: [{ gen: 'G', label: '네뷸라의 함선 (소진)', can: (g, u) => !g.c(u).ex, use: (g, u) => { g.c(u).ex = true; } }] }; // Nebula's Ship
  S['22004'] = { heroAttackPlus: g => hero(g) ? { piercing: true, overkill: true } : null, // Cutthroat Ambition
    async special(g, u) { if (g.c(g.idt()).conf) { g.c(g.idt()).conf = false; g.log('혼란 해제'); return; } if (g.targets('thwartable', g.idt()).length) await g.removeThreatChoose(3, '냉혹한 야망: 위협 3을 제거할 음모', g.idt()); } };
  S['22005'] = { ignores: { guard: g => hero(g), patrol: g => hero(g), crisis: g => hero(g) }, // Evasive Maneuvering
    async special(g, u) { if (!g.enemies().length) return; const t = await g.chooseTarget('enemy', '회피 기동: 기절 또는 혼란시킬 적', u, false); const k = await g.ask({ type: 'choice', title: '상태', options: [{ id: 'stun', label: '기절' }, { id: 'conf', label: '혼란' }] }); g.giveStatus(t, k === 'conf' ? 'conf' : 'stun', '회피 기동'); } };
  S['22006'] = { mod: { thw: (g, s, t) => t === g.idt() && hero(g) ? 1 : 0, atk: (g, s, t) => t === g.idt() && hero(g) ? 1 : 0 }, stalwartFor: (g, s, t) => t === g.idt() && hero(g), // Unyielding Persistence
    special(g) { g.giveStatus(g.idt(), 'tough', '불굴의 끈기'); } };
  S['22007'] = { mod: { retaliate: (g, s, t) => t === g.idt() && hero(g) ? 1 : 0 }, // Weapons Master
    async special(g, u) { if (await g.statusBlocks('attack')) return; if (g.targets('attackable', g.idt()).length) await dmgEnemy(g, 4, '무기의 달인: 피해 4를 줄 적', g.idt(), true); } };
  S['22008'] = { on: { wouldTakeDamage(g, a, ctx) { if (ctx.target === g.idt() && hero(g) && ctx.attack && ctx.amount - ctx.prevent > 0) ctx.prevent++; } }, // Wide Stance
    async special(g) {
      const top = g.e.deck.slice(0, 3); if (!top.length) return;
      const t = await g.ask({ type: 'target', title: '넓은 자세: 조우 덱 위 3장 중 버릴 카드', cands: top, cancelable: false });
      g.put(t, 'ediscard'); g.log(`넓은 자세: ${g.nm(t)} 버림`);
    } };
  S['22009'] = { play: { timing: 'alter', async resolve(g) { // Combat Ready
    const disc = g.p.discard.filter(x => g.d(x).type === 'upgrade' && has(g, x, 'TECHNIQUE'));
    const k = disc.length ? await g.ask({ type: 'choice', title: '전투 준비', options: [{ id: 'shuffle', label: '버림 더미의 기술 업그레이드 최대 2장을 덱에 섞기' }, { id: 'dig', label: '기술 업그레이드가 나올 때까지 덱을 버리고 플레이 + 특수 능력' }] }) : 'dig';
    if (k === 'shuffle') { const sel = disc.length <= 2 ? disc : await g.ask({ type: 'select', title: '덱에 섞을 기술 (최대 2)', cards: disc, min: 1, max: 2, confirm: '확정' }); (sel || []).forEach(x => g.put(x, 'deck')); g.shuffle(g.p.deck); return; }
    const seen = [];
    while (g.p.deck.length) { const x = g.p.deck[0]; if (seen.includes(x)) break; if (g.d(x).type === 'upgrade' && has(g, x, 'TECHNIQUE')) { g.put(x, 'upgrade'); g.log(`전투 준비: ${g.nm(x)} 플레이`, 'good'); await special(g, x); return; } g.put(x, 'discard'); seen.push(x); }
  } } };
  S['22010'] = { play: { timing: 'hero', can: g => techs(g).length > 0, async resolve(g) { // Lethal Intent (cost X)
    const ts = techs(g); let max = ts.length; while (max > 0 && !g.canAfford({ n: max, req: '' }, null)) max--;
    if (!max) return;
    const opts = []; for (let i = 1; i <= max; i++) opts.push({ id: String(i), label: `X = ${i}` });
    const x = +(await g.ask({ type: 'choice', title: '치명적인 의도: X', options: opts })) || 1;
    if (!(await g.pay({ n: x, req: '' }, null, `치명적인 의도 X=${x}`, false))) return;
    const sel = ts.length <= x ? ts : await g.ask({ type: 'select', title: `특수 능력을 해결할 기술 ${x}장`, cards: ts, min: x, max: x, confirm: '확정' });
    for (const t of (sel || [])) await special(g, t);
  } } };
  S['22027'] = { async whenRevealed(g, u, ctx) { // Inferiority Complex
    await g.heroObligation(u, '열등감', '기술 업그레이드 2장 버림 (없으면 쇄도) → 이 카드 버림', async () => {
      const ts = techs(g);
      if (!ts.length) { g.log('버릴 기술이 없어 쇄도'); ctx.surge++; }
      else { const sel = ts.length <= 2 ? ts : await g.ask({ type: 'select', title: '버릴 기술 업그레이드 2장', cards: ts, min: 2, max: 2, confirm: '확정' }); (sel || []).forEach(x => g.discard(x)); }
      if (g.c(u).zone === 'limbo') g.discard(u);
    });
  } };
  // nemesis
  const isNebula = g => ['22001a', '22001b'].includes(g.c(g.idt()).id);
  S['22028'] = { // Gamora (nemesis)
    on: { minionEnters(g, u, ctx) { if (ctx.minion !== u) return; const a = g.p.allies.find(x => g.c(x).id === '22002'); if (a) g.discard(a, '가모라(동료)가 버려집니다'); },
      async afterEnemyAttack(g, u, ctx) { if (ctx.enemy !== u || !(ctx.damaged || []).includes(g.idt())) return; const ups = g.controlled().filter(x => g.d(x).type === 'upgrade'); if (!ups.length) return; const t = ups.length === 1 ? ups[0] : await g.ask({ type: 'target', title: '버릴 업그레이드', cands: ups, cancelable: false }); g.discard(t, `${g.nm(t)} 버림`); } },
    attackProps: g => g.e.sides.some(x => g.c(x).id === '22029') ? { piercing: true } : null
  };
  S['22029'] = { mod: { thw: (g, s, t) => t === g.idt() && isNebula(g) ? -1 : 0, atk: (g, s, t) => (t === g.idt() && isNebula(g)) ? -1 : (g.c(t).id === '22028' ? 1 : 0), def: (g, s, t) => t === g.idt() && isNebula(g) ? -1 : 0 } }; // Self-Preservation
  S['22030'] = { attachTo: g => g.e.minions.find(m => g.c(m).id === '22028') || g.e.villain, // Lethal Weapon
    actions: [{ timing: 'hero', label: '업그레이드 1장 버림 → 이 카드 버리기', can: g => g.controlled().some(x => g.d(x).type === 'upgrade'), async use(g, u) {
      const ups = g.controlled().filter(x => g.d(x).type === 'upgrade'); const t = ups.length === 1 ? ups[0] : await g.ask({ type: 'target', title: '버릴 업그레이드', cands: ups, cancelable: false }); g.discard(t); g.discard(u, '치명적 무기 버림');
    } }] };
  S['22031'] = { async whenRevealed(g, u, ctx) { // Old Rivals
    const m = g.e.minions.find(x => g.c(x).id === '22028');
    if (m) { const r = await g.enemyAttack(m, {}); if (g.attackMade(r)) return; }
    const a = g.p.allies.find(x => /Gamora/.test(g.d(x).en || ''));
    if (!m && a) { const n = g.stat(a, 'atk'); g.log(`오랜 경쟁자: 가모라가 공격력 ${n}으로 당신을 공격`); await g.dealDamage(g.idt(), n, { src: a, attack: true }); return; }
    g.log('공격이 없어 쇄도'); ctx.surge++;
  } };

  // ======================= Justice / other aspects / Basic =======================
  S['22011'] = { onPlay(g, u, ctx) { const n = (ctx.paid || []).filter(l => l === 'B').length; const ms = g.e.minions.filter(m => !g.c(m).conf); for (let i = 0; i < n && i < ms.length; i++) g.giveStatus(ms[i], 'conf', '에로스'); } }; // Eros
  S['22012'] = { respond: [{ window: 'boostTurned', timing: 'hero', label: '레이스 소진·피해 1 → 그 카드의 강화 능력 취소', can: (g, u, ctx) => !g.c(u).ex && !ctx.cancelAbility && !!g.sc(ctx.card).boostEffect, // Wraith
    async resolve(g, u, ctx) { g.c(u).ex = true; await g.dealDamage(u, 1, { src: u }); ctx.cancelAbility = true; } }] };
  S['22013'] = { on: { wouldTakeDamage(g, u, ctx) { if (ctx.target === u && ctx.consequential && g.e.main && g.c(g.e.main).threat === 0 && ctx.amount - ctx.prevent > 0) ctx.prevent++; } } }; // Venom (ally)
  S['22014'] = { respond: [{ window: 'afterHeroThwart', timing: 'hero', label: '버리기 → 히어로 준비', can: (g, u, ctx) => ctx.cleared && g.c(g.idt()).ex, async resolve(g, u) { g.discard(u); if (g.canReady(g.idt())) g.c(g.idt()).ex = false; } }] }; // Justice Served
  S['22015'] = { play: { timing: 'hero', can: g => !g.p.usedOnce.oneWay, async resolve(g) { // One Way or Another
    g.p.usedOnce.oneWay = true; const x = g.e.deck.find(u => g.d(u).type === 'side'); g.shuffle(g.e.deck);
    if (x) { await g.reveal(x); await g.draw(3); } else g.log('조우 덱에 부가 음모가 없습니다');
  } } };
  S['22018'] = { interrupt: { window: 'afterBasicPower', timing: 'hero', can: (g, u, ctx) => ctx.kind === 'thwart' && g.targets('attackable', g.idt()).length > 0, async resolve(g, u) { // Brains Over Brawn
    if (await g.statusBlocks('attack')) return; await dmgEnemy(g, g.stat(g.idt(), 'thw'), '두뇌가 힘을 이긴다: 대상', u, true);
  } } };
  S['22022'] = { play: { timing: 'hero', async resolve(g) { await g.draw(3); } } }; // Daughters of Thanos
  S['22032'] = { attach: { kind: 'ally', filter: (g, t) => g.hasTrait(t, 'GUARDIAN') && !g.c(t).att.some(a => g.c(a).id === '22032') }, mod: { atk: (g, s, t) => t === g.c(s).on ? 2 : 0 }, // Energy Spear
    grantPiercing: true };
  S['22033'] = { respond: [{ window: 'cardPlayedDone', label: '카드 1장 뽑기', can: (g, u, ctx) => g.d(ctx.card).type === 'upgrade' && g.p.allies.includes(g.c(ctx.card).on) && g.friendlyChars().every(f => g.hasTrait(f, 'GUARDIAN')), async resolve(g) { await g.draw(1); } }] }; // Guardians of the Galaxy
  const training = cls => ({ actions: [{ timing: 'alter', exhaust: true, label: `소진·훈련 1 → 버림 더미의 ${({ Protection: '수호', Justice: '정의', Leadership: '통솔', Aggression: '용맹' })[cls]} 이벤트를 덱에 섞기`, can: (g, u) => (g.c(u).cnt.training || 0) > 0 && g.p.discard.some(x => g.d(x).type === 'event' && g.d(x).cls === cls),
    async use(g, u) { g.c(u).cnt.training--; const c = g.p.discard.filter(x => g.d(x).type === 'event' && g.d(x).cls === cls); const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '덱에 섞을 이벤트', cands: c, cancelable: false }); g.put(t, 'deck'); g.shuffle(g.p.deck); g.cleanupUses(u); } }] });
  S['22034'] = training('Protection'); // Defensive Training
  S['22035'] = { canPlay: g => g.hasTrait(g.idt(), 'GUARDIAN'), attach: { kind: 'friendly', filter: (g, t) => !g.c(t).att.some(a => g.c(a).id === '22035') && !(t === g.idt() && g.p.upgrades.some(a => g.c(a).id === '22035')) }, // Honorary Guardian
    mod: { hp: (g, s, t) => (t === g.c(s).on || (g.c(s).zone === 'upgrade' && t === g.idt())) ? 1 : 0 },
    grantTrait: (g, s, t) => (t === g.c(s).on || (g.c(s).zone === 'upgrade' && t === g.idt())) ? 'GUARDIAN' : null };

  MC.registerScripts(S);
})();
