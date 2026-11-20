/*CORE-START*/
const Core = (() => {
  'use strict';

  // ---- rnd / pickWeighted / check 改编自 lifesim-kit（https://github.com/Jasonin2099/lifesim-kit）----
  // MIT License
  // Copyright (c) 2026 Jasonin2099
  // Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
  // associated documentation files (the "Software"), to deal in the Software without restriction,
  // including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
  // and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so,
  // subject to the following conditions:
  // The above copyright notice and this permission notice shall be included in all copies or substantial
  // portions of the Software.
  // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT
  // LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO
  // EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
  // IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR
  // THE USE OR OTHER DEALINGS IN THE SOFTWARE.
  // 随机数状态是一个 uint32，存在存档里，读档后接着同一条随机序列。
  function rnd(s) {
    let t = (s.rng = (s.rng + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function pickWeighted(s, list, weightOf = (x) => x.weight ?? 1) {
    const total = list.reduce((a, x) => a + Math.max(0, weightOf(x)), 0);
    if (total <= 0) return null;
    let r = rnd(s) * total;
    for (const x of list) if ((r -= Math.max(0, weightOf(x))) < 0) return x;
    return list[list.length - 1];
  }
  const inRange = (v, lo, hi) => typeof v === 'number' && (lo === undefined || v >= lo) && (hi === undefined || v <= hi);
  function check(s, c) {
    if (!c) return true;
    if (typeof c === 'function') return Boolean(c(s));
    if (Array.isArray(c)) return c.every((x) => check(s, x));
    if (c.all) return c.all.every((x) => check(s, x));
    if (c.any) return c.any.some((x) => check(s, x));
    if (c.not) return !check(s, c.not);
    if (c.stat) return inRange(s.stats[c.stat], c.min, c.max);
    if (c.flag) return c.eq === false ? !s.flags[c.flag] : Boolean(s.flags[c.flag]);
    if (c.seen) return s.seen.includes(c.seen);
    if (c.phase) return s.phase === c.phase;
    if (c.house) return [].concat(c.house).includes(s.house);
    if (c.track) return Boolean(s.job) && [].concat(c.track).includes(s.job.track);
    if (c.month) return inRange(s.month, c.month.min, c.month.max);
    if (c.level) return Boolean(s.job) && inRange(s.job.level, c.level.min, c.level.max);
    throw new Error('unknown condition: ' + JSON.stringify(c));
  }
  // ---- lifesim-kit 部分结束 ----

  const BOUNDED = new Set(['energy', 'mood', 'skill', 'talk', 'network', 'perf', 'boss']);
  const GROW = new Set(['skill', 'talk', 'network']);
  const STAT_NAMES = { cash: '存款', energy: '精力', mood: '心态', skill: '专业', talk: '表达', network: '人脉', perf: '表现', boss: '领导印象' };
  const KEYS = Object.keys(STAT_NAMES);

  const rint = (s, a, b) => a + Math.floor(rnd(s) * (b - a + 1));
  const chance = (s, p) => rnd(s) < p;
  const say = (s, arr) => arr[Math.floor(rnd(s) * arr.length)];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const r100 = (v) => Math.round(v / 100) * 100;
  function shuffle(s, arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd(s) * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // 所有数值变化都走 add，上下限在这里统一处理。mult 只放大专业、表达、人脉的增长。
  function add(s, eff, mult = 1) {
    for (const [k, raw] of Object.entries(eff)) {
      if (!(k in s.stats)) continue;
      let v = Array.isArray(raw) ? rint(s, raw[0], raw[1]) : raw;
      if (GROW.has(k) && v > 0) v *= mult;
      const nv = s.stats[k] + v;
      s.stats[k] = BOUNDED.has(k) ? clamp(Math.round(nv), 0, 100) : Math.round(nv);
    }
  }
  function earn(s, amt) {
    s.stats.cash += amt;
    s.earn[s.month] = (s.earn[s.month] || 0) + amt;
  }

  function money(n) {
    const a = Math.abs(Math.round(n));
    let t;
    if (a >= 1e6) t = (a / 1e4).toFixed(0) + '万';
    else if (a >= 1e5) t = (a / 1e4).toFixed(1).replace(/\.0$/, '') + '万';
    else t = a.toLocaleString('en-US');
    return (n < 0 ? '−¥' : '¥') + t;
  }
  const calMonth = (m) => ((6 + m) % 12) + 1;
  const yearOf = (m) => Math.floor(m / 12) + 1;
  function stamp(s) {
    return `第${yearOf(s.month)}年 · ${calMonth(s.month)}月` + (s.phase === 'search' ? ` 第${s.week + 1}周` : '');
  }
  function log(s, x) {
    s.log.unshift({ t: stamp(s), x });
    if (s.log.length > 80) s.log.length = 80;
  }
  const nextId = (s) => ++s.uid;
  // 转正后、第二年起，一回合是一个季度
  function monthsPerTurn(s) { return s.job && s.job.prob === 0 && s.month >= 12 ? 3 : 1; }
  const gainMult = (s) => (s.phase === 'work' && monthsPerTurn(s) === 3 ? 2 : 1);
  function last12(s) {
    let t = 0;
    for (let m = s.month - 11; m <= s.month; m++) t += s.earn[m] || 0;
    return t;
  }

  // ---- 岗位线 ----
  // pay：每一级的基准月薪；start：应届生的招聘区间；req：升到这一级要的专业能力
  // watch：摸鱼被抓的基础概率；layoff：每月被裁的基础概率；diff：面试门槛
  const TRACKS = {
    media: {
      name: '新媒体运营', companies: ['「一口茶」茶饮', '「野鹿」咖啡', '「小满」零食'],
      titles: ['运营专员', '高级运营', '内容主管', '品牌经理', '品牌总监'],
      pay: [5000, 8000, 13000, 20000, 32000], start: [4500, 6000], req: [0, 30, 45, 60, 75],
      bonus: { S: 3, A: 2, B: 1, C: 0 }, watch: 0.22, layoff: 0.01, diff: 0.5, goodHR: 0.45,
      blurb: '单休，老板拍脑袋，涨得快也跑得快',
    },
    ad: {
      name: '文案策划', companies: ['「方寸」广告', '「白昼」创意', '「回声」整合营销'],
      titles: ['文案', '资深文案', '创意主管', '创意总监', '执行创意总监'],
      pay: [5500, 9000, 15000, 25000, 40000], start: [5000, 6500], req: [0, 30, 45, 60, 75],
      bonus: { S: 2, A: 1.5, B: 1, C: 0 }, watch: 0.18, layoff: 0.012, diff: 0.55, goodHR: 0.5,
      blurb: '天天比稿改稿，能力涨得最快',
    },
    admin: {
      name: '行政专员', companies: ['南屿城投（外包）', '南屿水务（外包）'],
      titles: ['行政专员', '高级行政', '行政主管', '行政经理', '综合部经理'],
      pay: [4200, 5000, 6000, 7500, 9000], start: [4000, 4500], req: [0, 20, 30, 40, 50],
      bonus: { S: 2, A: 1.5, B: 1, C: 0.5 }, watch: 0.1, layoff: 0.002, diff: 0.42, goodHR: 0.6, promo: 0.5,
      blurb: '稳定，几乎不辞退，天花板低',
    },
    edu: {
      name: '课程顾问', companies: ['「学霸星球」教育', '「状元路」培优'],
      titles: ['课程顾问', '资深顾问', '顾问主管', '校区校长', '区域总监'],
      pay: [3500, 5000, 8000, 12000, 18000], start: [3500, 4000], req: [0, 20, 35, 50, 65],
      bonus: { S: 1, A: 0.5, B: 0, C: 0 }, watch: 0.28, layoff: 0.004, collapse: 0.018, diff: 0.35, goodHR: 0.35,
      comm: 'edu', dorm: true, blurb: '底薪加提成，考核话术，机构可能跑路',
    },
    sales: {
      name: '客户经理', companies: ['「云帆」软件', '「千帆」SaaS', '「数禾」云服务'],
      titles: ['客户经理', '高级客户经理', '销售主管', '大客户总监', '销售副总裁'],
      pay: [4000, 6000, 9000, 14000, 20000], start: [4000, 5000], req: [0, 25, 40, 55, 70],
      bonus: { S: 2, A: 1, B: 0.5, C: 0 }, watch: 0.14, layoff: 0.008, diff: 0.45, goodHR: 0.5,
      comm: 'sales', blurb: '底薪加提成，收入波动最大',
    },
    bigtech: {
      name: '内容运营', companies: ['星河科技', '极光互动'],
      titles: ['内容运营 P5', '高级运营 P6', '运营专家 P7', '资深专家 P8', '运营总监 P9'],
      pay: [10000, 18000, 30000, 50000, 75000], start: [9000, 12000], req: [0, 40, 55, 70, 85],
      bonus: { S: 6, A: 4, B: 2, C: 0 }, stock: [0, 0, 150000, 400000, 800000],
      watch: 0.2, layoff: 0.008, diff: 0.72, goodHR: 0.75, blurb: '面试三轮，最难进',
    },
    live: {
      name: '储备干部', companies: ['「星耀」传媒'], titles: ['直播助理（储备干部）'],
      pay: [6000], start: [6000, 6000], req: [0], bonus: { S: 0, A: 0, B: 0, C: 0 },
      watch: 0.35, layoff: 0.03, unpaid: 0.1, diff: 0, goodHR: 1, dorm: true, trap: true,
      blurb: '包住宿，明天就能上班，合同转正再签',
    },
    scam: {
      name: '高薪文员', companies: ['「鼎盛」人力资源'], titles: ['文员'],
      pay: [12000], start: [12000, 15000], req: [0], bonus: { S: 0, A: 0, B: 0, C: 0 },
      watch: 0, layoff: 0, diff: 0, goodHR: 1, trap: true, blurb: '月入过万，不看经验，当天入职',
    },
  };

  // ---- 住处 ----
  // move：入住时一次交的钱（含押金）；dep：押金，搬走时退；e/m：每回合对精力、心态的影响
  const HOUSES = {
    hostel: { name: '青旅八人间', cost: '每周 350，不用押金', note: '随时能走，但睡不好，丢东西是常事', week: 350, rent: 0, move: 0, dep: 0, e: -4, m: -2,
      say: '八人间的上铺，空调正对着头吹。隔壁床的大哥打呼噜像拖拉机。' },
    village: { name: '城中村单间', cost: '月租 800，押一付一，先交 1600', note: '便宜，离市区远，通勤累', rent: 800, move: 1600, dep: 800, e: -6, m: -1,
      say: '城中村的单间，窗外就是别人家的墙。好在热水器是好的。' },
    shared: { name: '合租次卧', cost: '月租 1500，押一付一，先交 3000', note: '住得舒服，室友可能帮你介绍工作', rent: 1500, move: 3000, dep: 1500, e: -2, m: 1,
      say: '合租的次卧，带个小阳台。室友在广告公司做设计，看着挺好相处。' },
    sofa: { name: '同学家沙发', cost: '免费，最多住 4 周', note: '省钱，但寄人篱下', rent: 0, move: 0, dep: 0, e: -3, m: -4,
      say: '同学家的沙发有点短，腿得蜷着睡。同学说：“住多久都行。”他对象没说话。' },
    dorm: { name: '公司宿舍', cost: '每月 300，四人间', note: '便宜，下班也在公司的圈子里', rent: 300, move: 0, dep: 0, e: -2, m: -1,
      say: '四人间，上床下桌。室友们晚上都在打游戏。' },
    flat: { name: '整租一居室', cost: '月租 3500，押一付一，先交 7000', note: '自己的地方，下班能安静一会儿', rent: 3500, move: 7000, dep: 3500, e: 0, m: 3,
      say: '一室一厅，朝南。你给自己买了一盆绿萝。' },
  };
