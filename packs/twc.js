/* The Wrecking Crew (07001-07059): four villains, each with a signature side scheme and an encounter deck.
   Only the active villain activates; "the villain" and "the encounter deck" mean the active one.
   Ported from cards/pack/twc of the community build. */
(function () {
  'use strict';
  const S = {};
  const IDS = { wrecker: ['07002', '07003'], thunderball: ['07017', '07018'], piledriver: ['07032', '07033'], bulldozer: ['07046', '07047'] };
  const crew = g => g.e.villains || [];
  const named = (g, k) => crew(g).find(v => IDS[k].includes(g.c(v).id)) || null;
  const sideOf = (g, v) => v ? g.crewSideOf(v) : null;
  const threatOf = (g, v) => { const s = sideOf(g, v); return s ? g.c(s).threat || 0 : 0; };
  async function pickBy(g, most, title) { // the villain whose side scheme has the most / least threat (player breaks ties)
    const vs = crew(g); if (!vs.length) return null;
    const best = (most ? Math.max : Math.min)(...vs.map(v => threatOf(g, v)));
    const c = vs.filter(v => threatOf(g, v) === best);
    return c.length === 1 ? c[0] : await g.ask({ type: 'target', title, cands: c, cancelable: false });
  }
  const moveActive = async (g, most) => { const v = await pickBy(g, most, `활성 카운터를 옮길 빌런 (부가 음모 위협이 가장 ${most ? '많은' : '적은'})`); if (v) g.switchActive(v); return v; };
  const discardThis = (label, req, extra) => Object.assign({ timing: 'hero', label, cost: { n: req.length, req }, async use(g, u) { g.discard(u, `${g.nm(u)}을(를) 버렸습니다`); } }, extra || {});
  const randomDiscardThis = { timing: 'hero', exhaustHero: true, label: '히어로 소진·손 무작위 1장 버림 → 이 카드 버리기', can: g => g.p.hand.length > 0,
    async use(g, u) { await g.discardRandomHand(1); g.discard(u, `${g.nm(u)}을(를) 버렸습니다`); } };
  const hostIs = (g, u, k) => { const h = g.c(u).on; return !!h && IDS[k].includes(g.c(h).id); };
  async function act(g, v, o) { if (!v || !g.c(v).zone) return null; return g.isHero() ? g.enemyAttack(v, o || {}) : g.enemyScheme(v, o || {}); }
  const loseUpgrade = async g => { const c = g.myUpgrades(); if (!c.length) return false; const x = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '버릴 업그레이드', cands: c, cancelable: false }); g.discard(x, `${g.nm(x)} 버림`); return true; };
  const highest = (g, list) => { if (!list.length) return null; const hi = Math.max(...list.map(x => g.d(x).cost || 0)); return list.filter(x => (g.d(x).cost || 0) === hi); };
  async function discardHighest(g, list, title) { const c = highest(g, list); if (!c) return null; const x = c.length === 1 ? c[0] : await g.ask({ type: 'target', title, cands: c, cancelable: false }); g.discard(x, `${g.nm(x)} 버림`); return x; }

  // ======================= main scheme =======================
  S['07001b'] = { // Breakout
    on: { async mainStep1(g, u) {
      if (u !== g.e.main) return;
      for (const v of crew(g)) { const s = sideOf(g, v); if (s && g.c(s).zone === 'side') await g.placeThreat(s, 1, {}); }
      await moveActive(g, true);
    } }
  };

  // ======================= villains =======================
  const own = { schemeTarget: (g, v) => sideOf(g, v) };
  S['07002'] = S['07003'] = Object.assign({ attackBonus: (g, v, ctx) => ctx.undefended ? 2 : 0 }, own); // Wrecker
  S['07017'] = S['07018'] = Object.assign({ on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy !== u) return; for (const x of g.friendlyChars()) if (g.c(x).zone) await g.dealDamage(x, 1, { src: u }); } } }, own); // Thunderball
  S['07032'] = S['07033'] = own; // Piledriver
  S['07046'] = S['07047'] = Object.assign({ on: { enemyAttacks(g, u, ctx) { if (ctx.enemy === u) ctx.overkill = true; } } }, own); // Bulldozer

  // ======================= signature side schemes =======================
  const signature = (k, label, fn) => ({
    cannotLeave: g => !!named(g, k),
    async afterThreatPlaced(g, u) {
      if ((g.c(u).threat || 0) < 10) return;
      g.log(`${g.nm(u)}: 위협 10 이상 — ${label}`, 'warn');
      await fn(g, u);
      g.c(u).threat = 3; g.log(`${g.nm(u)}: 위협을 3만 남깁니다`);
    }
  });
  S['07004'] = signature('wrecker', '각 아군 캐릭터에게 피해 2', async (g, u) => { for (const x of g.allFriendlyChars()) if (g.c(x).zone) await g.dealDamage(x, 2, { src: u }); }); // Day of Reckoning
  S['07019'] = signature('thunderball', '각 아군 캐릭터 기절', (g) => { for (const x of g.allFriendlyChars()) g.giveStatus(x, 'stun', '기절'); }); // Thunderstruck
  S['07034'] = signature('piledriver', '비용이 가장 높은 업그레이드·지원 버림', async (g) => { await g.forEachPlayer(() => discardHighest(g, g.controlled().filter(x => ['upgrade', 'support'].includes(g.d(x).type)), `버릴 업그레이드·지원 (${g.playerName()}, 가장 비싼 것)`)); }); // Pile It On!
  S['07048'] = signature('bulldozer', '덱 맨 위 10장 버림', async (g) => { await g.forEachPlayer(() => g.discardDeckTop(10)); }); // Clear the Road

  // ======================= shared encounter cards =======================
  S['07005'] = { // Held Hostage
    attachTo: g => sideOf(g, g.e.villain),
    blocksThwart: true,
    actions: [{ timing: 'hero', label: '해당 빌런이 나를 공격 → 이 카드 버리기',
      async use(g, u) { const v = g.crewVillainOf(g.c(u).on); g.discard(u, '인질 구출'); if (v && g.c(v).zone) await g.enemyAttack(v, {}); } }]
  };
  S['07009'] = { // Escaped Convict
    async boostEffect(g, u, ctx) {
      const v = await moveActive(g, false);
      if (v && g.isHero() && ctx.after) ctx.after.push(async gg => { if (gg.c(v).zone && gg.isHero()) await gg.enemyAttack(v, { noBoost: true }); });
    }
  };
  S['07010'] = { // Buddy System
    async whenRevealed(g) {
      const v = await pickBy(g, false, '버디 시스템: 부가 음모 위협이 가장 적은 빌런'); if (!v) return;
      const n = crew(g).length === 1 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const deck = v === g.e.villain ? g.e.deck : g.e.vdecks[v].deck;
        if (!deck.length) break;
        g.log(`버디 시스템: ${g.nm(v)}의 덱 맨 위 카드를 공개합니다`); await g.reveal(deck[0]);
      }
    },
    async boostEffect(g) { await moveActive(g, false); }
  };
  S['07011'] = { // Chaos in the Prison
    async whenRevealed(g, u, ctx) {
      const n = g.myUpgrades().length;
      if (!n) { g.log('업그레이드가 없어 쇄도'); ctx.surge++; return; }
      const pick = await g.ask({ type: 'choice', title: '감옥의 혼란: 하나를 고르세요', options: [{ id: 'up', label: '업그레이드 1장 버리기' }, { id: 'th', label: `활성 빌런의 부가 음모에 위협 ${n}` }] });
      if (pick === 'up') await loseUpgrade(g); else { const s = sideOf(g, g.e.villain); if (s) await g.placeThreat(s, n, {}); }
    },
    async boostEffect(g, u, ctx) { if (ctx.undefended) await loseUpgrade(g); }
  };
  S['07013'] = { // Get Wrecked!
    async whenRevealedAlter(g) { const v = await pickBy(g, true, '부가 음모 위협이 가장 많은 빌런'); if (v) await g.enemyScheme(v, {}); },
    async whenRevealedHero(g) { const v = await pickBy(g, false, '부가 음모 위협이 가장 적은 빌런'); if (v) await g.enemyAttack(v, {}); }
  };
  S['07014'] = { // I've Been Waiting For This!
    whenRevealed(g) { const v = g.e.villain; if (!v) return; const h = g.heal(v, 3); if (h) g.log(`${g.nm(v)} 피해 ${h} 회복`); g.giveStatus(v, 'tough', '강인함 획득'); },
    async boostEffect(g, u, ctx) { const v = await moveActive(g, false); if (v && ctx.after) ctx.after.push(async gg => { if (gg.c(v).zone) await gg.enemyScheme(v, {}); }); }
  };

  // ======================= Wrecker =======================
  S['07006'] = { // Magic Crowbar
    attachTo: g => named(g, 'wrecker'),
    on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === g.c(u).on) { const v = await pickBy(g, false, '부가 음모 위협이 가장 적은 빌런'); if (v) await g.placeThreat(sideOf(g, v), 1, {}); } } },
    actions: [randomDiscardThis]
  };
  S['07007'] = { // Wrecker's Command
    attachTo: g => named(g, 'wrecker'),
    on: { async afterEnemyScheme(g, u, ctx) { if (ctx.enemy !== g.c(u).on) return; for (const v of crew(g)) if (v !== ctx.enemy) await g.placeThreat(sideOf(g, v), 1, {}); } },
    actions: [discardThis('물리 2 → 버리기', 'RR')]
  };
  S['07012'] = { // Crowbar Toss
    async whenRevealed(g) { const w = named(g, 'wrecker'); if (w) await act(g, w); await moveActive(g, false); }
  };
  S['07015'] = { // Mystical Link
    async whenRevealed(g) { for (const v of crew(g)) await g.placeThreat(sideOf(g, v), 2, {}); },
    async boostEffect(g, u, ctx) {
      const w = named(g, 'wrecker'); if (!w || ctx.enemy !== w) return 0;
      const pick = await g.ask({ type: 'choice', title: '신비한 연결: 레커가 공격 +3을 받습니다', options: [{ id: 'th', label: '레커의 부가 음모에 위협 2를 놓아 막기' }, { id: 'atk', label: '공격 +3 받기' }] });
      if (pick === 'th') { await g.placeThreat(sideOf(g, w), 2, {}); return 0; }
      return 3;
    }
  };
  S['07016'] = { // You're Dead Meat!
    async whenRevealed(g, u) {
      const pool = (g.isHero() ? [g.idt()] : []).concat(g.p.allies); if (!pool.length) return;
      const lo = Math.min(...pool.map(x => g.hpLeft(x))), c = pool.filter(x => g.hpLeft(x) === lo);
      const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '넌 끝났어!: 피해 1을 받을 캐릭터', cands: c, cancelable: false });
      const r = await g.dealDamage(t, 1, { src: u });
      const w = named(g, 'wrecker'); if (r.defeated && w) await g.placeThreat(sideOf(g, w), 3, {});
    }
  };

  // ======================= Thunderball =======================
  S['07020'] = { attachTo: g => named(g, 'thunderball'), on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === g.c(u).on) await g.placeThreat(g.e.main, 1, {}); } }, actions: [randomDiscardThis] }; // Ball and Chain
  S['07022'] = { // Radioactive Buildup
    attachTo: g => named(g, 'thunderball'),
    on: { async afterEnemyAttack(g, u, ctx) {
      if (ctx.enemy !== g.c(u).on) return;
      if (ctx.excess > 0) await g.placeThreat(sideOf(g, ctx.enemy), ctx.excess, {});
      g.discard(u, '방사능 축적: 공격 후 버려짐');
    } }
  };
  S['07027'] = { // Energy Projectiles
    async whenRevealed(g, u) { for (const x of g.friendlyChars()) if (g.c(x).zone) await g.dealDamage(x, 1, { src: u }); },
    async boostEffect(g, u, ctx) { if (ctx.defender && g.c(ctx.defender).zone) await g.dealDamage(ctx.defender, 1, { src: u }); }
  };
  S['07030'] = { // Lightning Blast
    async whenRevealedAlter(g) { const v = await pickBy(g, true, '부가 음모 위협이 가장 많은 빌런'); if (v) await g.placeThreat(sideOf(g, v), 3, {}); },
    async whenRevealedHero(g) { const t = named(g, 'thunderball'); if (!t) return; const r = await g.enemyAttack(t, {}); if (r && r.undefended && g.attackMade(r)) await g.placeThreat(sideOf(g, t), 3, {}); }
  };
  S['07031'] = { // Tactical Prowess
    async whenRevealed(g, u, ctx) {
      const lo = await pickBy(g, false, '위협이 가장 적은 부가 음모의 빌런'), hi = await pickBy(g, true, '위협이 가장 많은 부가 음모의 빌런');
      if (!lo || !hi || lo === hi) { ctx.surge++; return; }
      const a = sideOf(g, lo), b = sideOf(g, hi), n = g.c(a).threat || 0;
      g.c(a).threat = 0; g.log(`전술의 귀재: ${g.nm(a)}의 위협 ${n}을(를) ${g.nm(b)}로 옮깁니다`);
      const before = g.c(b).threat || 0;
      if (n) await g.placeThreat(b, n, {});
      if (!(before + n >= 10)) { g.log('강제 반응이 일어나지 않아 쇄도'); ctx.surge++; }
    }
  };

  // ======================= Piledriver =======================
  S['07035'] = { // Distracting Taunts
    attachTo: g => named(g, 'piledriver'),
    taunt: true,
    mod: { hp: (g, self, t) => g.c(self).on === t ? 3 : 0 },
    respond: [{ window: 'heroAttacked', label: '물리 2 → 버리기', cost: { n: 2, req: 'RR' }, can: (g, u, ctx) => ctx.target === g.c(u).on, resolve(g, u) { g.discard(u, '산만한 도발 버림'); } }]
  };
  S['07042'] = { // Oversized Hands
    async whenRevealed(g) { const x = await discardHighest(g, g.p.supports.slice(), '버릴 지원 (가장 비싼 것)'); if (!x) { const s = sideOf(g, g.e.villain); if (s) await g.placeThreat(s, 2, {}); } },
    async boostEffect(g) { const c = g.p.supports.slice(); if (!c.length) return; const x = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '버릴 지원', cands: c, cancelable: false }); g.discard(x, `${g.nm(x)} 버림`); }
  };
  S['07043'] = { // Escape Plan
    async whenRevealed(g) { const was = g.c(g.idt()).conf; g.giveStatus(g.idt(), 'conf', '혼란'); if (was) { const p = named(g, 'piledriver'); if (p) await g.enemyScheme(p, {}); } },
    async boostEffect(g) { const v = g.e.villain; if (!v) return; if (!g.giveStatus(v, 'tough', '강인함 획득')) { const s = sideOf(g, v); if (s) await g.placeThreat(s, 2, {}); } }
  };
  S['07044'] = { // Pummel
    async whenRevealedAlter(g) { const p = named(g, 'piledriver'); if (p) await g.enemyScheme(p, { schBonus: g.c(p).tough ? 2 : 0 }); },
    async whenRevealedHero(g) { const p = named(g, 'piledriver'); if (p) await g.enemyAttack(p, { atkBonus: g.c(p).tough ? 2 : 0 }); }
  };
  S['07045'] = { // Uncanny Resilience
    whenRevealed(g, u, ctx) { let n = 0; for (const v of crew(g)) for (const k of ['stun', 'conf']) if (g.c(v)[k]) { g.c(v)[k] = false; n++; } if (n) g.log(`놀라운 회복력: 빌런들의 상태 카드 ${n}장 제거`, 'warn'); else ctx.surge++; },
    boostEffect(g) { g.giveStatus(g.idt(), 'conf', '혼란'); }
  };

  // ======================= Bulldozer =======================
  S['07049'] = { // Bulldozer's Helmet
    attachTo: g => named(g, 'bulldozer'),
    on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === g.c(u).on && ctx.dealt > 0) await g.discardDeckTop(ctx.dealt); } },
    actions: [randomDiscardThis]
  };
  S['07051'] = { // Ramming Speed
    attachTo: g => named(g, 'bulldozer'),
    mustDefendWithAlly: true,
    on: { afterEnemyAttack(g, u, ctx) { if (ctx.enemy === g.c(u).on) g.discard(u, '돌진 속도: 공격 후 버려짐'); } }
  };
  S['07055'] = { // Bull Rush
    async whenRevealedAlter(g) { const b = named(g, 'bulldozer'); if (!b) return; const n = await g.enemyScheme(b, {}); if (n) await g.discardDeckTop(n); },
    async whenRevealedHero(g) { const b = named(g, 'bulldozer'); if (!b) return; const r = await g.enemyAttack(b, {}); if (r && r.dealt) await g.discardDeckTop(r.dealt); }
  };
  S['07058'] = { // Headbutt
    async whenRevealed(g, u) {
      const x = (await g.discardRandomHand(1))[0]; if (!x) return; const n = g.d(x).cost || 0; if (!n) return;
      if (g.isHero()) await g.dealDamage(g.idt(), n, { src: u }); else { const b = named(g, 'bulldozer'); if (b) await g.placeThreat(sideOf(g, b), n, {}); }
    }
  };
  S['07059'] = { // Leading the Charge
    async whenRevealed(g) { const b = named(g, 'bulldozer'); if (!b) return; const out = await g.discardDeckTop(g.stat(b, 'atk')); const n = new Set(out.map(x => g.d(x).type)).size; if (n) await g.placeThreat(sideOf(g, b), n, {}); }
  };

  MC.registerScripts(S);
})();
