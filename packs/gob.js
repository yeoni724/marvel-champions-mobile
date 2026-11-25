/* The Green Goblin scenario pack (02001-02049), ported from cards/pack/gob/*.py of the community build. */
(function () {
  'use strict';
  const S = {};
  const host = (g, u) => g.c(u).on;
  const isGoblinMinion = (g, u) => g.d(u).type === 'minion' && g.hasTrait(u, 'GOBLIN');
  const discardThis = (timing, label, req) => ({ timing, label, cost: { n: req.length, req }, async use(g, u) { g.discard(u, `${g.nm(u)}을(를) 버렸습니다`); } });
  async function payOrElse(g, title, cost, payLabel, elseLabel, elseFn) {
    const opts = [];
    if (g.canAfford(cost, null)) opts.push({ id: 'pay', label: payLabel });
    opts.push({ id: 'else', label: elseLabel });
    const pick = opts.length === 1 ? 'else' : await g.ask({ type: 'choice', title, options: opts });
    if (pick === 'pay') { const paid = await g.pay(cost, null, title, false); if (paid != null) return; }
    await elseFn();
  }
  async function putGoblinsFrom(g, cards, label) {
    for (const u of cards) if (g.c(u).zone === 'ediscard' && isGoblinMinion(g, u)) { g.log(`${label}: ${g.nm(u)}이(가) 교전합니다`); await g.enterMinion(u, {}, true); }
  }

  // ======================= Risky Business: Norman Osborn / Green Goblin =======================
  // Criminal Enterprise (infamy) and State of Madness (madness) are one double-sided environment.
  // When its counters run out, it and the villain flip to the other side.
  const env = g => g.e.env.find(u => ['02006a', '02006b'].includes(g.c(u).id));
  const sideIs = (g, id) => { const e = env(g); return !!e && g.c(e).id === id; };
  async function flipBoth(g) {
    const e = env(g); if (!e) return;
    g.flipFace(e);
    const c = g.c(e);
    c.cnt = c.id === '02006b' ? { madness: 2 * g.players } : { infamy: 2 * g.players };
    g.log(`${g.nm(e)}(으)로 뒤집힘 (${c.id === '02006b' ? '광기' : '악명'} 카운터 ${2 * g.players})`, 'warn');
    await g.flipVillain();
  }
  async function counters(g, id, kind, n, label) {
    const e = env(g); if (!e || g.c(e).id !== id) return false;
    const c = g.c(e); c.cnt[kind] = Math.max(0, (c.cnt[kind] || 0) + n);
    g.log(`${g.nm(e)}: ${label} 카운터 ${n > 0 ? '+' : ''}${n} (현재 ${c.cnt[kind]})`, n > 0 ? 'warn' : 'good');
    if (n > 0) for (const x of g.inPlay()) { const f = g.sc(x).countersPlaced; if (f) f(g, x, e, kind, c.cnt[kind]); } // Not Easy Being Green
    if (c.cnt[kind] <= 0) await flipBoth(g);
    return true;
  }
  const infamy = (g, n) => counters(g, '02006a', 'infamy', n, '악명');
  const madness = (g, n) => counters(g, '02006b', 'madness', n, '광기');
  const infamyCount = g => sideIs(g, '02006a') ? (g.c(env(g)).cnt.infamy || 0) : 0;
  async function infamyOrMadness(g, n) { if (sideIs(g, '02006a')) await infamy(g, n); else await madness(g, -n); }
  const boostInfamy = { async boostEffect(g) { g.log('★ 강화: 악명 +1 (또는 광기 -1)'); await infamyOrMadness(g, 1); } };
  const isNorman = g => !!g.e.villain && ['02001a', '02002a', '02003a'].includes(g.c(g.e.villain).id);
  const isGoblin = g => !!g.e.villain && !isNorman(g);

  const norman = n => ({
    async insteadOfAttack(g) { g.log(`${g.nm(g.e.villain)}: 공격 대신 범죄 기업에 악명 카운터 ${n}`, 'enemy'); await infamy(g, n); },
    async damageInstead(g, u, amount) { g.log(`${g.nm(u)}: 피해 ${amount} 대신 악명 카운터 ${amount} 제거`); await infamy(g, -amount); return true; }
  });
  const goblinScheme = n => async g => { g.log(`그린 고블린: 음모 대신 광기 카운터 ${n} 제거`, 'enemy'); await madness(g, -n); };
  S['02001a'] = norman(1); S['02002a'] = norman(2); S['02003a'] = norman(3);
  S['02001b'] = { insteadOfScheme: goblinScheme(1), async whenRevealed(g) { await g.forEachPlayer(async () => { if (g.isHero()) await g.indirectDamage(3, g.e.villain); }); } };
  S['02002b'] = { insteadOfScheme: goblinScheme(1), async whenRevealed(g) { await g.forEachPlayer(async () => { await g.indirectDamage(4, g.e.villain); }); } }; // official text: 4 (Korean data says 3)
  S['02003b'] = { insteadOfScheme: goblinScheme(2), async whenRevealed(g) { await g.forEachPlayer(async () => { await g.dealDamage(g.idt(), 4, { src: g.e.villain }); }); } };
  S['02004a'] = { // Hostile Takeover (setup)
    async setup(g) {
      const e = g.e.aside.find(u => g.c(u).id === '02006a');
      if (e) { g.put(e, 'env'); g.c(e).cnt = { infamy: 2 * g.players }; g.log(`준비: 범죄 기업을 악명 카운터 ${2 * g.players}개와 함께 둡니다`); }
    }
  };
  S['02004b'] = { // Hostile Takeover — When Completed
    async whenCompleted(g) {
      await infamy(g, 1 * g.players);
      const n = infamyCount(g);
      if (n) await g.forEachPlayer(async () => { await g.discardDeckTop(n); });
    }
  };
  S['02007'] = Object.assign({ // Hired Gun
    async whenRevealed(g) {
      const opts = [{ id: 'boost', label: '빌런에게 뒷면 강화 카드 1장' }];
      if (sideIs(g, '02006a')) opts.push({ id: 'inf', label: '범죄 기업에 악명 카운터 2' });
      const pick = opts.length === 1 ? 'boost' : await g.ask({ type: 'choice', title: '고용된 총잡이: 하나를 고르세요', options: opts });
      if (pick === 'inf') await infamy(g, 2); else g.giveFacedownBoost(1);
    }
  }, boostInfamy);
  S['02008'] = boostInfamy; S['02009'] = boostInfamy; S['02011'] = boostInfamy;
  S['02010'] = { async whenRevealed(g, u) { if (isNorman(g)) await g.placeThreat(u, 1 * g.players, {}); } }; // Oscorp Manufacturing
  S['02012'] = Object.assign({ async whenRevealed(g) { await infamyOrMadness(g, 2); } }, boostInfamy); // All in a Day's Work
  S['02013'] = { // Mad Genius
    async whenRevealed(g, u, ctx) {
      if (isGoblin(g)) {
        const made = g.isHero() && g.attackMade(await g.enemyAttack(g.e.villain, {}));
        if (!made) { g.log('공격이 일어나지 않아 쇄도'); ctx.surge++; }
      } else if (isNorman(g)) { const n = infamyCount(g); if (n) await g.discardDeckTop(n); }
    }
  };

  // ======================= Mutagen Formula =======================
  const ggAfterAttack = n => ({ async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u && ctx.damaged.includes(g.idt())) await g.placeThreat(g.e.main, n, {}); } });
  const dealEnc = n => async g => { await g.forEachPlayer(async () => { for (let i = 0; i < n; i++) await g.dealEncounterCard(); }); };
  S['02014'] = { on: ggAfterAttack(1) };
  S['02015'] = { on: ggAfterAttack(1), whenRevealed: dealEnc(2) };
  S['02016'] = { on: ggAfterAttack(2), whenRevealed: dealEnc(3) };
  S['02017a'] = { // Unleashing the Mutagen (setup): a Goblin Thrall engages each player
    async setup(g) {
      await g.forEachPlayer(async () => {
        const t = g.searchEncounter(d => d.id === '02024');
        if (t) { g.log(`준비: 고블린 졸개가 ${g.playerName()}과(와) 교전합니다`); await g.enterMinion(t, {}, true); }
      });
      g.shuffle(g.e.deck);
    }
  };
  S['02017b'] = {
    async whenCompleted(g) {
      await g.forEachPlayer(async () => {
        if (g.engagedMinions().some(m => isGoblinMinion(g, m))) return;
        const out = g.discardEncounterN(3);
        const first = out.find(u => isGoblinMinion(g, u));
        if (first) await putGoblinsFrom(g, [first], '돌연변이 유발 물질');
      });
    }
  };
  S['02018b'] = { escalation: g => g.enemies().filter(u => g.hasTrait(u, 'GOBLIN')).length }; // Mutagen Cloud
  S['02019'] = { // Goblin Glider
    surgeIfNoHost: true,
    attachTo(g) {
      const c = g.enemies().filter(x => !g.c(x).att.some(a => g.c(a).id === '02019' || g.c(a).id === '02033'));
      if (!c.length) return null;
      const hp = x => g.d(x).hp || 0, best = Math.max(...c.map(hp));
      return c.find(x => hp(x) === best);
    },
    actions: [discardThis('hero', '에너지 2 지불 → 버리기', 'YY')]
  };
  S['02020'] = { // Hysteria
    attachTo: g => g.e.villain,
    activationBoost: 1,
    actions: [discardThis('hero', '정신 2 지불 → 버리기', 'BB')]
  };
  S['02021'] = { // Pumpkin Bombs
    attachTo: g => g.e.villain,
    on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy !== host(g, u)) return; g.discard(u, '호박 폭탄 폭발'); await g.indirectDamage(2, u); } },
    actions: [discardThis('hero', '물리 2 지불 → 버리기', 'RR')]
  };
  S['02022'] = { // Goblin Knight
    on: { async afterEnemyAttack(g, u, ctx) {
      if (ctx.enemy !== u) return;
      const out = g.discardEncounterN(1);
      await putGoblinsFrom(g, out, '고블린 기사');
    } },
    boostEffect(g, u, ctx) { (ctx.shuffleBack = ctx.shuffleBack || []).push(u); }
  };
  S['02023'] = { // Goblin Soldier
    async whenDefeated(g, u) { await g.dealDamage(g.idt(), 1, { src: u }); },
    boostEffect(g, u, ctx) { (ctx.putIntoPlay = ctx.putIntoPlay || []).push(u); g.log('★ 강화: 고블린 병사가 교전합니다'); }
  };
  S['02024'] = { boostEffect(g, u, ctx) { (ctx.putIntoPlay = ctx.putIntoPlay || []).push(u); g.log('★ 강화: 고블린 졸개가 교전합니다'); } };
  S['02025'] = { // Monster
    async whenRevealed(g, u) { if (g.c(g.idt()).stun) await g.dealDamage(g.idt(), 2, { src: u }); else g.giveStatus(g.idt(), 'stun', '기절 (괴물)'); },
    boostEffect(g, u, ctx) { (ctx.shuffleBack = ctx.shuffleBack || []).push(u); }
  };
  S['02026'] = { async whenRevealed(g, u) { const n = g.e.minions.filter(m => isGoblinMinion(g, m)).length; if (n) await g.placeThreat(u, n, {}); } };
  S['02027'] = { // Goblin Nation
    mod: { atk: (g, self, t) => (['villain', 'minion'].includes(g.c(t).zone) && g.hasTrait(t, 'GOBLIN')) ? 1 : 0 },
    boostEffect(g, u, ctx) { (ctx.putIntoPlay = ctx.putIntoPlay || []).push(u); g.log('★ 강화: 고블린 국가가 플레이 영역에 들어옵니다'); }
  };
  S['02028'] = { async whenDefeated(g) { await g.forEachPlayer(async () => { await putGoblinsFrom(g, g.discardEncounterN(2), '점령'); }); } }; // Overrun
  S['02029'] = { // Death from Above
    async whenRevealedAlter(g) { if (g.e.villain) await g.enemyScheme(g.e.villain, { schBonus: g.villainStage() }); },
    async whenRevealedHero(g) { if (g.e.villain) await g.enemyAttack(g.e.villain, { atkBonus: g.villainStage() }); }
  };
  S['02030'] = { // I See You
    async whenRevealed(g) { if (g.e.villain) await g.enemyAttack(g.e.villain, { noBoost: !g.isHero() }); },
    boostEffect(g) { if (g.e.minions.some(m => isGoblinMinion(g, m))) { g.log('★ 강화: 고블린 하수인이 있어 강화 아이콘 +1'); return 1; } return 0; }
  };
  S['02031'] = { // Overconfidence
    async whenRevealedAlter(g, u, ctx) { if (!g.e.villain) return; const n = await g.enemyScheme(g.e.villain, {}); if (n >= 3) { g.log('위협 3 이상 → 쇄도'); ctx.surge++; } },
    async whenRevealedHero(g, u, ctx) { if (!g.e.villain) return; const r = await g.enemyAttack(g.e.villain, {}); if (r && r.dealt >= 3) { g.log('피해 3 이상 → 쇄도'); ctx.surge++; } }
  };
  S['02032'] = { // Wicked Ambitions
    async whenRevealed(g, u) {
      const out = g.discardEncounterN(2 * g.villainStage());
      for (const m of out) {
        if (!isGoblinMinion(g, m) || g.c(m).zone !== 'ediscard') continue;
        const pick = await g.ask({ type: 'choice', title: `사악한 야망: ${g.nm(m)}`, options: [{ id: 'dmg', label: '피해 3 받기' }, { id: 'play', label: `${g.nm(m)}을(를) 교전시키기` }] });
        if (pick === 'dmg') await g.dealDamage(g.idt(), 3, { src: u }); else await g.enterMinion(m, {}, true);
      }
    }
  };

  // ======================= Goblin Gimmicks =======================
  S['02035'] = { // Intimidation
    async whenRevealed(g) { await payOrElse(g, '위협', { n: 2, req: '' }, '아무 자원 2개 지불', '빌런에게 뒷면 강화 카드 1장', async () => g.giveFacedownBoost(1)); },
    boostEffect(g, u, ctx) { ctx.extraBoost = (ctx.extraBoost || 0) + 1; g.log('★ 강화: 강화 카드 1장을 더 받습니다'); }
  };
  S['02036'] = { // Regenerative Healing
    async whenRevealed(g, u, ctx) { const v = g.e.villain; const h = v ? g.heal(v, 2 * g.villainStage()) : 0; if (h) g.log(`${g.nm(v)} 피해 ${h} 회복`); else { g.log('회복한 피해가 없어 쇄도'); ctx.surge++; } },
    boostEffect(g) { const v = g.e.villain; if (v) { const h = g.heal(v, 2); if (h) g.log(`★ 강화: ${g.nm(v)} 피해 ${h} 회복`); } }
  };

  // ======================= A Mess of Things =======================
  S['02037'] = { async whenRevealed(g, u) { const n = g.allFriendlyChars().filter(x => g.c(x).stun).length; if (n) await g.placeThreat(u, 2 * n, {}); } };
  S['02038'] = { on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u) for (const x of ctx.damaged) if (g.c(x).zone) g.giveStatus(x, 'stun', '기절 (스콜피온)'); } } };
  S['02040'] = { // Tail Sweep
    async whenRevealed(g) {
      const sc = g.e.minions.find(m => g.c(m).id === '02038');
      const made = sc && g.isHero() && g.attackMade(await g.enemyAttack(sc, {}));
      if (!made) g.giveStatus(g.idt(), 'stun', '기절 (꼬리 휩쓸기)');
    },
    boostEffect(g) { g.giveStatus(g.idt(), 'stun', '★ 강화: 기절'); }
  };

  // ======================= Power Drain =======================
  const discard3 = { boostEffect(g) { g.log('★ 강화: 조우 덱 위 3장 버림'); g.discardEncounterN(3); } };
  S['02041'] = { async whenDefeated(g) { const n = await g.countBoost(g.discardEncounterN(2)); if (n) await g.forEachPlayer(async () => { await g.discardResourcesFromHand(n, null, `전력 고갈: 자원 ${n}개만큼 손에서 버리기`); }); } };
  S['02042'] = Object.assign({ // Electro
    on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy !== u) return; const n = await g.countBoost(g.discardEncounterN(1)); if (n) await g.indirectDamage(n, u); } }
  }, discard3);
  S['02043'] = Object.assign({ // Electromagnetic Pulse
    async whenRevealed(g, u, ctx) {
      const out = g.discardEncounterN(7);
      const el = out.find(x => g.c(x).id === '02042' && g.c(x).zone === 'ediscard');
      if (el) { g.log('전자기 펄스: 일렉트로가 교전합니다'); await g.enterMinion(el, {}, true); } else { g.log('일렉트로가 없어 쇄도'); ctx.surge++; }
    }
  }, discard3);
  S['02044'] = Object.assign({ async whenRevealed(g, u) { const n = await g.countBoost(g.discardEncounterN(2)); if (n) await g.indirectDamage(n, u); } }, discard3); // Lightning Bolt
  S['02045'] = Object.assign({ // Shock Therapy
    async whenRevealed(g) { const n = await g.countBoost(g.discardEncounterN(1 * g.players)); const v = g.e.villain; if (v && n) { const h = g.heal(v, n); if (h) g.log(`${g.nm(v)} 피해 ${h} 회복`); } }
  }, discard3);

  // ======================= Running Interference =======================
  S['02046'] = { async whenRevealed(g, u) { await g.forEachPlayer(async () => { await payOrElse(g, '훼방', { n: 2, req: 'BR' }, '정신·물리 자원 지불', '이 카드에 위협 2', async () => { await g.placeThreat(u, 2, {}); }); }); } };
  S['02047'] = { on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u && ctx.damaged.includes(g.idt())) await g.discardResourcesFromHand(1, ['B', 'R'], '툼스톤: 정신 또는 물리 자원 카드 1장 버리기'); } } };
  S['02048'] = { // All Tied Up
    attachTo: g => g.idt(), noReady: true, noFormChange: true,
    actions: [discardThis('action', '정신·물리 지불 → 버리기', 'BR')]
  };
  S['02049'] = { // Media Coverage
    attachTo: g => g.idt(), extraRevealed: true,
    actions: [discardThis('alter', '정신 1 지불 → 버리기', 'B')]
  };

  // Korean card data has a typo for Green Goblin (II): the printed card deals 4 indirect damage.
  if (MC.cards['02002b']) MC.cards['02002b'].text = MC.cards['02002b'].text.replace('간접 피해 3점', '간접 피해 4점');

  MC.registerScripts(S);
})();
