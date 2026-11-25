/* Thor hero pack (06001-06034), ported from cards/pack/thor of the community build. */
(function () {
  'use strict';
  const S = {};
  const mjolnir = g => g.p.upgrades.find(u => g.c(u).id === '06009');
  const heroMod = (key, n) => ({ [key]: (g, self, t) => (t === g.idt() && g.c(self).zone && g.isHero()) ? n : 0 });
  const youMod = (key, n) => ({ [key]: (g, self, t) => (t === g.idt() && g.c(self).zone) ? n : 0 });

  S['06001a'] = { // Thor — "Have at thee!"
    on: { async minionEnters(g, u) {
      if (u !== g.idt() || !g.isHero()) return;
      const k = 'thor:' + g.s.phase; if (g.p.usedOnce[k]) return;
      g.p.usedOnce[k] = true; await g.draw(2); g.log('덤벼라!: 하수인과 교전해 카드 2장 뽑음', 'good');
    } }
  };
  S['06001b'] = { // Odinson — Worthy
    actions: [{ timing: 'action', once: true, label: '묠니르 가져오기', can: g => g.p.deck.concat(g.p.discard).some(x => g.c(x).id === '06009'),
      async use(g) { await g.searchToHand(d => d.id === '06009', '자격 있는 자', { discard: true }); } }]
  };
  S['06002'] = { onEnter(g) { const id = g.idt(); if (g.c(id).ex && g.canReady(id)) { g.c(id).ex = false; g.log('레이디 시프: 토르 준비', 'good'); } } }; // Lady Sif
  S['06003'] = { // Defender of the Nine Realms
    play: { timing: 'hero', label: 'thwart', target: 'thwartable',
      async resolve(g, u, ctx) {
        const m = g.discardEncounterUntil(d => d.type === 'minion');
        if (m) { g.log(`아홉 왕국의 수호자: ${g.nm(m)}이(가) 교전합니다`); await g.enterMinion(m, {}, true); }
        if (!g.c(ctx.target).zone) return;
        const r = await g.removeThreat(ctx.target, 3, { src: u }); g.log(`${g.nm(ctx.target)} 위협 ${r} 제거`); await g.afterThreatRemoved(ctx.target);
      } }
  };
  S['06004'] = { // For Asgard!
    play: { timing: 'alter', can: g => g.p.deck.concat(g.p.discard).some(x => g.hasTrait(x, 'ASGARD')),
      async resolve(g, u) { await g.searchToHand((d, x) => x !== u && (d.tr || []).includes('ASGARD'), '아스가르드를 위하여!', { discard: true }); } }
  };
  S['06005'] = { // Hammer Throw
    play: { timing: 'hero', label: 'attack', target: 'attackable', can: g => { const m = mjolnir(g); return !!m && !g.c(m).ex; },
      async resolve(g, u, ctx) {
        const m = mjolnir(g); if (m) g.c(m).ex = true;
        await g.playerAttack(g.idt(), ctx.target, 8, { overkill: true });
        if (m && g.c(m).zone === 'upgrade') { g.put(m, 'hand'); g.c(m).ex = false; g.log('묠니르가 손으로 돌아옵니다'); }
      } }
  };
  S['06006'] = { // Lightning Strike
    play: { timing: 'hero',
      async resolve(g, u) {
        let max = 0; while (max < 8 && g.canAfford({ n: max + 1, req: 'Y'.repeat(max + 1) }, null)) max++;
        if (!max) { g.log('번개 일격: 낼 에너지 자원이 없습니다'); return; }
        const x = max === 1 ? 1 : +(await g.ask({ type: 'choice', title: '번개 일격: 에너지 자원을 몇 개 쓸까요? (그만큼 피해)', options: Array.from({ length: max }, (_, i) => ({ id: String(i + 1), label: `${i + 1}개` })) }));
        const paid = await g.pay({ n: x, req: 'Y'.repeat(x) }, null, `번개 일격: 에너지 ${x}`, false); if (paid == null) return;
        const aerial = g.hasTrait(g.idt(), 'AERIAL');
        for (const t of [g.e.villain].concat(g.engagedMinions()).filter(Boolean)) {
          if (!g.c(t).zone) continue;
          if (aerial && g.c(t).tough) { g.c(t).tough = false; g.log(`[공중]: ${g.nm(t)}의 강인함 무시`); }
          await g.dealDamage(t, x, { src: u, byPlayer: true });
        }
      } }
  };
  S['06007'] = { mod: youMod('hs', 1) }; // Asgard
  S['06008'] = { resources: [{ gen: 'Y', label: '천둥의 신 (소진)', can: (g, u) => g.isHero() && !g.c(u).ex, use: (g, u) => { g.c(u).ex = true; } }] }; // God of Thunder
  S['06009'] = { mod: heroMod('atk', 1), grantTrait: (g, self, t) => (t === g.idt() && g.c(self).zone === 'upgrade' && g.isHero()) ? 'AERIAL' : null }; // Mjolnir
  S['06010'] = { mod: youMod('hp', 5) }; // Thor's Helmet
  S['06026'] = { // Odin's Anger
    async whenRevealed(g, u) {
      await g.heroObligation(u, '오딘의 분노', '손이나 플레이 중인 묠니르를 버리고 기절 → 이 카드 버림', async () => {
        const m = g.p.hand.concat(g.p.upgrades).find(x => g.c(x).id === '06009'); if (m) g.discard(m, '묠니르 버림');
        g.giveStatus(g.idt(), 'stun', '기절'); g.discard(u);
      });
    }
  };
  S['06027'] = { async whenRevealed(g, u) { const n = g.inPlay().filter(x => g.hasTrait(x, 'ASGARD')).length; if (n) await g.placeThreat(u, n, {}); } }; // Family Feud
  S['06028'] = { // Loki
    wouldBeDefeated(g, u, w) {
      const top = g.discardEncounterN(1)[0];
      if (top && g.d(top).type === 'treachery') { g.c(u).dmg = 0; w.saved = true; g.log('로키: 배반 카드가 나와 피해를 모두 회복합니다', 'warn'); }
    }
  };
  S['06029'] = { boostEffect(g, u, ctx) { if (ctx.onDamaged) { ctx.onDamaged.push(async (gg, units) => units.forEach(x => gg.giveStatus(x, 'stun', '기절 (서리 거인)'))); g.log('★ 강화: 이 공격으로 피해를 입은 캐릭터는 기절'); } } }; // Frost Giant
  S['06030'] = { async whenRevealed(g) { const out = await g.discardDeckTop(3); const n = new Set(out.map(x => g.d(x).type)).size; if (n) await g.placeThreat(g.e.main, n, {}); } }; // Trickster

  // ======================= aspect / basic =======================
  S['06011'] = { selfCostMod: g => g.engagedMinions().length }; // Hercules
  S['06012'] = { // Valkyrie
    async onEnter(g, u, ctx) {
      if (!g.e.minions.length) return;
      const n = g.paidWith((ctx || {}).paid, 'Y') ? 3 : 2;
      const t = await g.chooseTarget('minion', `발키리: 피해 ${n}을 줄 하수인`, u, false);
      if (t) await g.dealDamage(t, n, { src: u, byPlayer: true });
    }
  };
  S['06014'] = { play: { timing: 'hero', label: 'attack', target: 'minion', async resolve(g, u, ctx) { await g.playerAttack(g.idt(), ctx.target, 1, {}); } } }; // Get Over Here!
  const readyWeapon = g => g.p.upgrades.filter(x => g.hasTrait(x, 'WEAPON') && !g.c(x).ex);
  S['06015'] = { // Mean Swing
    interrupt: { window: 'basicPowerUsed', timing: 'hero', can: (g, u, ctx) => ctx.kind === 'attack' && readyWeapon(g).length > 0,
      async resolve(g, u, ctx) {
        const c = readyWeapon(g); const w = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '힘찬 휘두르기: 소진할 무기', cands: c, cancelable: false });
        g.c(w).ex = true; ctx.bonus += 3; g.log('힘찬 휘두르기: 이번 공격 +3', 'good');
      } }
  };
  S['06017'] = { // Hall of Heroes
    on: { playerDefeatsMinion(g, u) { const c = g.c(u); c.cnt.glory = (c.cnt.glory || 0) + 1; g.log(`영웅의 전당: 영광 카운터 ${c.cnt.glory}`); } },
    actions: [{ timing: 'alter', exhaust: true, label: '소진·영광 3 → 카드 3장 뽑기', can: (g, u) => (g.c(u).cnt.glory || 0) >= 3,
      async use(g, u) { g.c(u).cnt.glory -= 3; await g.draw(3); g.log('영웅의 전당: 카드 3장 뽑음', 'good'); } }]
  };
  S['06018'] = { // Battle Fury
    respond: [{ window: 'afterAttackDefeat', timing: 'hero', label: '피해 1·버리기 → 히어로 준비', can: (g, u, ctx) => ctx.attacker === g.idt() && ctx.type === 'minion' && g.c(g.idt()).ex && g.canReady(g.idt()),
      async resolve(g, u) { g.discard(u); await g.dealDamage(g.idt(), 1, { src: u }); if (g.c(g.idt()).zone) { g.c(g.idt()).ex = false; g.log('전투 광기: 히어로 준비', 'good'); } } }]
  };
  S['06019'] = { // Jarnbjorn
    respond: [{ window: 'heroAttacked', label: '물리 1 → 적에게 피해 2', cost: { n: 1, req: 'R' }, can: g => g.enemies().length > 0,
      async resolve(g, u) { const t = await g.chooseTarget('enemy', '야른비외른: 피해 2를 줄 적', u, false); if (t) await g.dealDamage(t, 2, { src: u, byPlayer: true }); } }]
  };
  S['06020'] = { // Heimdall
    async onEnter(g) {
      const top = g.e.deck.slice(0, 3); if (!top.length) return;
      const x = (await g.pickCards(top, '헤임달: 버릴 조우 카드 1장 (나머지는 그대로)', 1, 1))[0];
      if (x) { g.put(x, 'ediscard'); g.log(`헤임달: ${g.nm(x)}을(를) 버림`, 'good'); }
    }
  };
  S['06021'] = { play: { timing: 'hero', resolve(g) { g.giveStatus(g.idt(), 'tough', '강인함 획득'); } } }; // Invulnerability
  S['06031'] = { attach: { kind: 'anyScheme', filter: (g, t) => t === g.e.main && !g.c(t).att.some(a => g.c(a).id === '06031') }, targetPlus: 4 }; // Under Surveillance
  S['06032'] = { // Teamwork
    interrupt: { window: 'basicPowerUsed', timing: 'hero', can: (g, u, ctx) => ctx.kind !== 'defend' && g.p.allies.some(a => !g.c(a).ex),
      async resolve(g, u, ctx) {
        const c = g.p.allies.filter(a => !g.c(a).ex); const a = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '팀워크: 소진할 동료', cands: c, cancelable: false });
        g.c(a).ex = true; const n = g.stat(a, ctx.kind === 'attack' ? 'atk' : 'thw'); ctx.bonus += n; g.log(`팀워크: ${g.nm(a)}의 힘 +${n}`, 'good');
      } }
  };
  S['06033'] = { play: { timing: 'action', target: { kind: 'identity', filter: (g, t) => g.c(t).dmg > 0 }, resolve(g, u, ctx) { const h = g.heal(ctx.target, g.paidWith(ctx.paid, 'B') ? 5 : 4); g.log(`재충전: 피해 ${h} 회복`, 'good'); } } }; // Second Wind
  S['06034'] = { resources: [{ gen: 'R', label: '향상된 체격 (물리 카운터 1)', can: (g, u) => g.isHero() && !g.c(u).ex && (g.c(u).cnt.physical || 0) > 0, use: (g, u) => { g.c(u).ex = true; g.c(u).cnt.physical--; } }] }; // Enhanced Physique

  MC.registerScripts(S);
})();
