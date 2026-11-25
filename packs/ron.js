/* Kree Fanatic modular (90001-90005): Ronan the Accuser.
   Ported from cards/pack/ron of the community build. */
(function () {
  'use strict';
  const S = {};
  const idOf = (g, u) => g.c(u).id;
  const ronan = g => g.e.minions.find(m => idOf(g, m) === '90001') || null;
  const KREE = ['90001', '90002', '90003', '90004', '90005'];
  const fromBoost = fn => ({ boostEffect(g, u, ctx) { (ctx.post || ctx.after).push(async gg => { if (['boost', 'ediscard'].includes(gg.c(u).zone)) await fn(gg, u); }); } });
  S['90001'] = Object.assign({ noStun: true,
    on: { villainPhaseBegins(g, u) { if (g.c(u).zone !== 'minion') return; const hs = g.livingPlayers().filter(i => g.s.ps[i].form === 'hero'); if (!hs.length) return; hs.sort((a, b) => g.hpLeft(g.idt(a)) - g.hpLeft(g.idt(b))); g.c(u).eng = hs[0]; g.log(`집행자 로난이 ${g.playerName(hs[0])}와(과) 교전합니다`, 'warn'); } },
    whenDefeated(g) { for (const pi of g.livingPlayers()) for (const a of g.c(g.idt(pi)).att.slice()) if (idOf(g, a) === '90003') g.discard(a, '피고인 버림'); } }, // Ronan the Accuser
    fromBoost(async (g, u) => { await g.enterMinion(u, {}); g.log('★ 고발자 로난이 교전합니다', 'warn'); }));
  S['90002'] = Object.assign({ on: { async allyDefeated(g, u, ctx) { if (g.c(u).zone === 'side' && ctx.attack) { g.log('판사, 배심원, 집행자: 주 음모에 위협 2', 'warn'); await g.placeThreat(g.e.main, 2, {}); } } } }, // Judge, Jury, Executioner
    fromBoost(async (g, u) => { await g.enterSide(u, {}); }));
  S['90003'] = Object.assign({ attachTo: g => g.idt(), on: { enemyAttacks(g, u, ctx) { if (g.c(u).zone === 'attach' && g.c(u).on === g.idt()) { ctx.atkBonus = (ctx.atkBonus || 0) + 1; } } } }, // The Accused
    fromBoost(async (g, u) => { g.attachEnc(u, g.idt()); }));
  S['90004'] = { async whenRevealed(g, u, ctx) { const r = ronan(g); if (!r) { ctx.surge++; return; } await g.withPlayer(g.c(r).eng ?? g.s.ctx, () => g.activate(r, {})); }, // Bring the Hammer Down
    boostEffect(g, u, ctx) { if ('undefended' in ctx) ctx.after.push(async gg => { const d = ctx.defender; if (d && d !== gg.idt() && gg.c(d).zone !== 'ally') { const x = gg.takeEncounter(); if (x) gg.put(x, 'facedown', gg.s.first); } }); } };
  S['90005'] = { async whenRevealed(g) { for (let i = 0; i < 5; i++) { const x = g.takeEncounter(); if (!x) break; if (KREE.includes(idOf(g, x))) { g.put(x, 'facedown'); g.log(`${g.nm(x)}: 뒷면 조우 카드로 받습니다`, 'warn'); } else g.put(x, 'ediscard'); } }, // You Dare Oppose Me?
    boostEffect(g, u, ctx) { if ('undefended' in ctx) ctx.overkill = true; } };
  MC.registerScripts(S);
})();
