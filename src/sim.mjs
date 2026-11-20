// Batch-play the game core with two bots and print ending rates.
//   node sim.mjs core.js [runs]
import fs from 'node:fs';

new Function(fs.readFileSync(process.argv[2], 'utf8'))();
const C = globalThis.Core;
const N = Number(process.argv[3] || 2000);

const idx = (v, label) => Math.max(0, v.choices.findIndex((c) => c.label.includes(label)));

const smart = {
  choose(s, v) {
    if (v.choices.some((c) => c.score !== undefined)) {
      let b = 0;
      v.choices.forEach((c, i) => { if (c.score > v.choices[b].score) b = i; });
      return b;
    }
    const t = v.title;
    if (t.includes('谈薪')) return 1;
    if (t === '先找个落脚的地方') return idx(v, '城中村');
    if (t === '找房子') return Math.max(0, v.choices.findIndex((c) => c.label.includes('合租') || c.label.includes('城中村')));
    if (t === '公司宿舍') return 1;
    if (t.startsWith('面试')) return v.choices[0].label === '开始面试' ? 0 : (v.choices.length === 2 ? 1 : 0);
    if (t === '余额不足' || t === '撑不住了') return 0;
    if (t === '上岸了') return 1;
    if (t === '辞职') return 1;
    return Math.floor(Math.random() * v.choices.length);
  },
  act(s) {
    const j = s.job, st = s.stats;
    const best = s.offers.filter((o) => o.track !== 'live' && (!j || o.pay > j.pay * 1.15)).sort((a, b) => b.pay - a.pay)[0];
    if (best) return ['accept', best.uid];
    if (!j) {
      if (st.energy < 30) return 'rest';
      if (st.cash < 900) return 'gig';
      if (s.invites.length >= 2) return 'study';
      if (st.skill < 40 && s.turn % 3 === 0) return 'study';
      return s.turn % 2 ? 'jingtou' : 'haitou';
    }
    const T = C.TRACKS[j.track];
    const ids = C.view(s).actions.map((a) => a.id);
    if (st.energy < 28) {
      if (ids.includes('vacation')) return 'vacation';
      if (j.prob === 0 && j.warn === 0) return 'slack';
      return 'work';
    }
    if (j.prob > 0) return st.energy > 55 ? 'overtime' : 'work';
    if (ids.includes('lookout') && s.turn % 3 === 0) return 'lookout';
    if (j.level < T.titles.length - 1 && st.skill < T.req[j.level + 1]) return 'learn';
    if (st.boss < 45) return 'social';
    if (st.perf < 78) return st.energy > 50 ? 'overtime' : 'work';
    if (ids.includes('side') && s.turn % 5 === 0) return 'side';
    if (s.turn % 4 === 0) return 'lookout';
    return 'work';
  },
};
const normal = {
  choose(s, v) {
    if (v.choices.some((c) => c.score !== undefined) && Math.random() < 0.6) return smart.choose(s, v);
    if (Math.random() < 0.3) return Math.floor(Math.random() * v.choices.length);
    return smart.choose(s, v);
  },
  act(s, v) { return Math.random() < 0.25 ? random.act(s, v) : smart.act(s, v); },
};
const random = {
  choose: (s, v) => Math.floor(Math.random() * v.choices.length),
  act(s, v) {
    if (s.offers.length && Math.random() < 0.4) return ['accept', s.offers[Math.floor(Math.random() * s.offers.length)].uid];
    return v.actions[Math.floor(Math.random() * v.actions.length)].id;
  },
};

function play(bot, seed) {
  const s = C.newGame('测试', seed);
  let clicks = 0, firstJob = null;
  while (s.phase !== 'over' && clicks < 20000) {
    clicks++;
    const v = C.view(s);
    if (v.mode === 'result') C.next(s);
    else if (v.mode === 'scene') C.choose(s, bot.choose(s, v));
    else {
      const a = bot.act(s, v);
      if (Array.isArray(a)) C.accept(s, a[1]); else C.act(s, a);
      if (s.job && firstJob === null) firstJob = s.turn;
    }
  }
  return { id: s.ending ? s.ending.id : 'STUCK', inc: s.ending ? s.ending.inc : 0, clicks, track: s.job ? s.job.track : '-', level: s.job ? s.job.level : -1, turns: s.turn, firstJob };
}

const med = (a) => { const b = [...a].sort((x, y) => x - y); return b[b.length >> 1] ?? 0; };
for (const [name, bot] of [['smart', smart], ['normal', normal], ['random', random]]) {
  const rs = [];
  for (let i = 1; i <= N; i++) rs.push(play(bot, i * 7919));
  const by = {};
  for (const r of rs) (by[r.id] ||= []).push(r);
  console.log(`\n[${name}] ${N} runs`);
  const mt = {}; for (const r of by.million || []) mt[r.track] = (mt[r.track] || 0) + 1; console.log('  million by track:', JSON.stringify(mt));
  for (const id of [...C.ENDING_ORDER, 'STUCK']) {
    const g = by[id] || [];
    if (!g.length) continue;
    console.log(`  ${(100 * g.length / N).toFixed(1).padStart(5)}%  ${id.padEnd(9)} median income ${C.money(med(g.map((r) => r.inc)))}  median clicks ${med(g.map((r) => r.clicks))}  turns ${med(g.map((r) => r.turns))}`);
  }
  const tracks = {};
  for (const r of rs) tracks[r.track + ':' + r.level] = (tracks[r.track + ':' + r.level] || 0) + 1;
  console.log('  final job:', Object.entries(tracks).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, c]) => `${k} ${c}`).join(' · '));
  console.log('  first job at week (median):', med(rs.filter((r) => r.firstJob !== null).map((r) => r.firstJob)));
}
