
  // ---- 结局 ----
  const ENDINGS = {
    million: { title: '年入百万打工人', tag: '最好结局',
      text: (s) => `你成了班里第一个年入百万的人。去年的收入是 ${money(last12(s))}。\n\n散场以后，你一个人走回学校门口。五年前你从这里出发，兜里揣着三千块，面试时连期望薪资都不敢往高了报。\n\n三千块进城的人，走到了这一步。` },
    success: { title: '小有所成', tag: '好结局',
      text: (s) => `去年你的收入是 ${money(last12(s))}。同学会上，有人找你内推，有人问你南屿的房价。\n\n${s.stats.cash >= 300000 ? '你在南屿付了首付，阳台上养着几盆绿萝。' : '你换了一套采光好的房子，阳台上养着几盆绿萝。'}\n\n加班到深夜的时候，你偶尔会想起第一次面试，连期望薪资都不敢说出口。` },
    backbone: { title: '中层骨干', tag: '不错的结局',
      text: (s) => `你现在是${s.job ? `${s.job.company}的${TRACKS[s.job.track].titles[s.job.level]}` : '一个正在看机会的老员工'}，身边带着几个刚毕业的年轻人。\n\n同学会上有人问你，第一年是怎么熬过来的。你想了想：“先找个住的地方，再说别的。”\n\n去年你的收入是 ${money(last12(s))}，存款 ${money(s.stats.cash)}。不算多，每一分都是自己挣的。` },
    light: { title: '城市里的一盏灯', tag: '普通结局',
      text: (s) => `同学会上你话不多，说自己${s.job ? `在${s.job.company}做${TRACKS[s.job.track].titles[s.job.level]}` : '最近在找工作'}。\n\n散场后你坐末班地铁回去。窗外一栋栋楼亮着灯，你想起五年前刚下高铁的那个晚上。\n\n日子不算好，也不算坏。这座城市的灯里，有一盏是你自己点的。` },
    kaogong: { title: '回老家考公上岸', tag: '爸妈最满意的结局',
      text: (s) => `你退了南屿的房子，把没用完的地铁卡留给了${s.house === 'shared' ? '室友' : '一个刚来南屿的学弟'}。\n\n县里的单位朝九晚五，食堂一顿饭五块钱。爸妈逢人就说孩子考上了。\n\n偶尔刷到南屿的新闻，你会多看两眼。` },
    scammed: { title: '被骗光', tag: '坏结局',
      text: () => '那 2980 块，是你在南屿最后的底气。报警回执还夹在钱包里，民警说这类案子很多，钱不一定追得回来。\n\n你给妈打电话，第一句话是：“我想回家。”\n\n后来你在网上看到有人曝光同一家公司，你在下面留了言：别交钱。' },
    kenlao: { title: '回家啃老', tag: '最差结局',
      text: (s, cause) => (cause === 'mood'
        ? '第二天，你退了房，买了回家的票。妈什么也没问，给你炖了一锅汤。\n\n你在家里躺了很久。有时候会想，当初再撑一撑会怎样。但大多数时候，你什么也不想。'
        : '你拖着来时那只行李箱，坐上了回老家的高铁。妈在出站口等你，一路上没提工作的事。\n\n晚饭时，爸只说了一句：“先歇着吧。”你的房间还是走时的样子，书架上那本《现代汉语》落了一层灰。\n\n之后的日子，你每天睡到中午。偶尔刷到南屿的招聘信息，看一眼，又划走了。') },
  };
  const ENDING_ORDER = ['million', 'success', 'backbone', 'light', 'kaogong', 'scammed', 'kenlao'];

  function endGame(s, id, cause) {
    const E = ENDINGS[id];
    let text = E.text(s, cause);
    if (s.flags.egg && ['million', 'success', 'backbone', 'light'].includes(id)) {
      text += `\n\n饭桌上，你讲起${s.rudeHR.who}后来成了你${s.flags.egg === 'client' ? '客户' : '下属'}的事，全桌笑成一片。`;
    }
    s.ending = {
      id, title: E.title, tag: E.tag, text, inc: last12(s), cash: s.stats.cash, months: s.month,
      role: s.job ? `${TRACKS[s.job.track].titles[s.job.level]} · ${s.job.company}` : '待业',
    };
    s.phase = 'over';
    s.queue = [];
    s.result = null;
    log(s, `结局：${E.title}`);
  }

  // ---- 搬家、离职 ----
  function moveTo(s, k) {
    const H = HOUSES[k];
    s.stats.cash += s.deposit;
    s.deposit = H.dep;
    s.stats.cash -= H.move;
    s.house = k;
    s.rentAdj = 0;
    if (k === 'sofa') s.sofaWeeks = 0;
    log(s, `住进了${H.name}`);
    return H.say + (H.move ? `\n\n一次交了 ${money(H.move)}，还剩 ${money(s.stats.cash)}。` : '');
  }
  function loseJob(s, why) {
    const j = s.job;
    s.prev = TRACKS[j.track].trap ? s.prev : { track: j.track, level: j.level, pay: j.pay };
    s.job = null;
    s.phase = 'search';
    s.week = 0;
    s.offers = [];
    s.invites = [];
    s.stats.perf = 50;
    s.stats.boss = 50;
    log(s, why);
    if (s.house === 'dorm') s.queue.push({ id: 'house', p: { forced: true, msg: '离职了，宿舍得在这周搬出去。' } });
  }

  // ---- 场景：build 必须是纯函数（界面会反复调用），随机只在 go 里用 ----
  const SC = {
    check: () => ({ title: '', text: '', choices: [{ label: '继续', go: () => {} }] }),
    info: (s, p) => ({ title: p.title, text: p.text, choices: [{ label: p.btn || '继续', go: () => {} }] }),
    ev: (s, p) => {
      const e = EVENTS.find((x) => x.id === p.e);
      return {
        title: e.title,
        text: typeof e.text === 'function' ? e.text(s) : e.text,
        choices: e.choices.filter((c) => check(s, c.when)).map((c) => ({ label: c.label, go: c.go })),
      };
    },
    house: (s, p) => {
      const keys = Object.keys(HOUSES).filter((k) => {
        if (k === s.house) return false;
        if (k === 'sofa') return Boolean(p.first);
        if (k === 'dorm') return Boolean(s.job && TRACKS[s.job.track].dorm);
        if (k === 'flat') return Boolean(s.job && s.job.pay >= 9000);
        return true;
      });
      let text;
      if (p.first) text = `高铁到站，南屿下着小雨。你得先找个地方住。\n\n兜里一共 ${money(s.stats.cash)}，每周吃饭大概要 250。租房群里能找到的是这些：`;
      else text = `${p.msg || '你在租房群里翻了一晚上。'}\n\n现在住的是${HOUSES[s.house].name}，存款 ${money(s.stats.cash)}。搬走时押金会退回来。`;
      const choices = keys.map((k) => ({ label: HOUSES[k].name, sub: `${HOUSES[k].cost}。${HOUSES[k].note}`, go: (s) => moveTo(s, k) }));
      if (!p.first && !p.forced) choices.push({ label: '不搬了', go: () => {} });
      return { title: p.first ? '先找个落脚的地方' : '找房子', text, choices };
    },
    dorm: (s) => ({
      title: '公司宿舍', text: `公司有员工宿舍，四人间，每月 300。你现在住的是${HOUSES[s.house].name}。`,
      choices: [{ label: '搬进宿舍', go: (s) => moveTo(s, 'dorm') }, { label: '不搬', go: () => {} }],
    }),
    hr: (s, p) => {
      const T = TRACKS[p.inv.track];
      const title = `面试 · ${p.inv.company}`;
      const head = `岗位：${T.titles[p.inv.level]}，${money(p.inv.lo)}–${money(p.inv.hi)}${T.comm ? '（底薪）' : ''}\n\n`;
      if (p.good) {
        return { title, text: head + GOOD_HR[p.v % GOOD_HR.length],
          choices: [{ label: '开始面试', go: (s) => { add(s, { mood: 2 }); s.queue.unshift({ id: 'q', p: { ...p, gb: 0.04 } }); } }] };
      }
      const b = BAD_HR[p.v % BAD_HR.length];
      return { title, text: head + b.text, choices: [
        { label: '忍着，继续面', go: (s) => { add(s, { mood: -6 }); s.queue.unshift({ id: 'q', p }); } },
        { label: b.retort, go: (s) => { add(s, { mood: 6 }); s.flags.rudeHR = true; if (!s.rudeHR) s.rudeHR = { who: b.who }; log(s, `在${p.inv.company}怼了面试官`); return b.after; } },
        { label: '起身走人', go: (s) => { add(s, { mood: 2 }); log(s, `面试${p.inv.company}，中途走了`); return '你说了句“打扰了”，拿起包走了出去。电梯门关上的时候，你长出了一口气。'; } },
      ] };
    },
    q: (s, p) => {
      const ref = p.qs[p.i];
      const Q = QS[ref.k][ref.i];
      const rounds = p.qs.length === 3 ? ['一面', '二面', 'HR 面'] : ['专业问题', 'HR 面'];
      return {
        title: `${p.inv.company} · ${rounds[p.i]}`,
        text: (p.react ? p.react + '\n\n' : '') + Q.q,
        choices: p.ord[p.i].map((j) => ({ label: Q.o[j][0], score: Q.o[j][1], go: (s) => {
          const sc = Q.o[j][1];
          s.queue.unshift({ id: p.i + 1 < p.qs.length ? 'q' : 'pay', p: { ...p, i: p.i + 1, sc: p.sc + sc, react: say(s, REACT[sc]) } });
        } })),
      };
    },
    pay: (s, p) => {
      const inv = p.inv, T = TRACKS[inv.track];
      const mid = r100((inv.lo + inv.hi) / 2), hiAsk = r100(inv.hi * 1.15);
      const opts = [['往高了报', hiAsk, 'hi'], ['报中间', mid, 'mid'], ['报个保底的', inv.lo, 'lo']];
      return {
        title: `${inv.company} · 谈薪`,
        text: (p.react ? p.react + '\n\n' : '') + `最后，HR 问：“你的期望薪资是多少？”\n\n招聘启事上写的是 ${money(inv.lo)}–${money(inv.hi)}${T.comm ? '，另有提成' : ''}。`,
        choices: opts.map(([l, v, k]) => ({ label: `${l}：${money(v)}`, go: (s) => settle(s, p, k, v, mid) })),
      };
    },
    scam: (s, p) => ({
      title: `面试 · ${p.inv.company}`,
      text: `岗位：高薪文员，${money(p.inv.lo)}–${money(p.inv.hi)}\n\nHR 夸你“气质好，一看就踏实”，五分钟就说你被录用了。\n\n随后她推过来一张单子：“入职前要上岗培训，培训费 2980，第一个月工资里全额返还。今天交，明天就能排课。”`,
      choices: [
        { label: s.stats.cash >= 2980 ? '交钱，抓住机会' : '钱不够，她说可以帮你办培训贷', go: (s) => {
          s.stats.cash -= 2980;
          s.flags.scammed = true;
          log(s, `给${p.inv.company}交了 2980 培训费`);
          s.later.push({ at: s.turn + 1, id: 'info', eff: { mood: -25 }, p: { title: '人去楼空', text: '周一早上九点，你到了那栋写字楼。那一层的玻璃门上贴着“招租”，前台空空荡荡。\n\nHR 的电话已经关机，微信也把你删了。你在楼道里站了很久。' } });
          return '你把钱转了过去。她笑着说：“下周一九点，直接来公司报到。”';
        } },
        { label: '说回去考虑一下', go: (s) => { add(s, { mood: 3 }); log(s, '识破了一个培训费骗局'); return '回去的路上你搜了一下这家公司。投诉平台上几十条，套路一模一样：先录用，再收培训费，然后人间蒸发。'; } },
      ],
    }),
    live: (s, p) => ({
      title: `面试 · ${p.inv.company}`,
      text: '面试只用了十分钟。负责人说：“储备干部，月薪六千，包住宿，明天就能上班。合同嘛，等转正再签。”\n\n你注意到办公室的窗帘大白天都拉着，几个人对着补光灯在喊“三、二、一，上链接”。',
      choices: [
        { label: '先把 offer 拿着', go: (s) => { pushOffer(s, { track: 'live', company: p.inv.company, level: 0, pay: 6000, exp: s.turn + 1 }); log(s, `拿到${p.inv.company}的 offer`); return '负责人把你拉进了一个叫“星耀家人群”的微信群。offer 在下面，接不接你自己定。'; } },
        { label: '婉拒', go: () => '你说再考虑一下。出门的时候，你听见里面又在喊“家人们”。' },
      ],
    }),
    callback: (s, p) => ({
      title: '一个电话',
      text: `之前让你“回去等通知”的${p.inv.company}打来电话：“原来定的人没来报到。你还感兴趣吗？薪资只能给到 ${money(p.inv.lo)}。”`,
      choices: [
        { label: '感兴趣', go: (s) => { pushOffer(s, { track: p.inv.track, company: p.inv.company, level: p.inv.level, pay: p.inv.lo, exp: s.turn + 1 }); log(s, `${p.inv.company}回电，给了 offer`); return '“那我把 offer 发你邮箱。”挂了电话，你在原地蹦了一下。'; } },
        { label: '谢谢，不用了', go: () => '你客气地拒绝了。说出口的那一刻，你觉得自己有点不一样了。' },
      ],
    }),
    loanback: (s, p) => ({
      title: '那笔钱', text: `你借给同学的 ${money(p.amt)}，已经过去好一阵了。`,
      choices: [{ label: '问问他', go: (s) => {
        if (chance(s, 0.6)) { add(s, { cash: p.amt, network: 2 }); return '他秒回：“正想找你！”钱转过来了，还约你周末吃烧烤。'; }
        add(s, { mood: -5 }); return '消息发出去，旁边出现了一个红色感叹号。';
      } }],
    }),
    quit: (s) => ({
      title: '辞职', text: `确定要从${s.job.company}辞职吗？主动辞职没有补偿，之后要重新找工作。`,
      choices: [
        { label: '确定辞职', go: (s) => { loseJob(s, `从${s.job.company}辞职`); return '你把工牌放在桌上，最后看了一眼工位，走出了大楼。'; } },
        { label: '再想想', go: () => {} },
      ],
    }),
    bailout: (s) => {
      const end = (s) => endGame(s, s.flags.scammed ? 'scammed' : 'kenlao');
      if (s.bailouts === 0) {
        return {
          title: '余额不足',
          text: `你的余额变成了 ${money(s.stats.cash)}。犹豫了一晚上，你还是给家里打了电话。\n\n妈什么也没多问，转来 3000，最后说了一句：“实在不行，就回来吧。”`,
          choices: [
            { label: '再坚持一下', go: (s) => { s.bailouts = 1; s.stats.cash = 3000; add(s, { mood: -12 }); log(s, '爸妈转来 3000'); return '你把钱分成了几份：房租、饭钱、交通。每一份都算得清清楚楚。'; } },
            { label: '买票回家', go: end },
          ],
        };
      }
      return { title: '又没钱了', text: `余额又一次见底：${money(s.stats.cash)}。这一次，你没好意思再开口。`, choices: [{ label: '收拾行李', go: end }] };
    },
    breakdown: (s) => (s.flags.grace
      ? { title: '撑不住了', text: '又是一个睡不着的晚上。这一次，你连请假的力气都没有了。', choices: [{ label: '回家', go: (s) => endGame(s, 'kenlao', 'mood') }] }
      : { title: '撑不住了', text: '那天在地铁上，你突然就哭了出来。周围的人都低着头看手机，没人注意到你。', choices: [
        { label: s.job ? '请两周假，缓一缓' : '什么都不干，歇两周', go: (s) => { s.flags.grace = true; s.stats.mood = 35; add(s, { cash: -1500, perf: -15, energy: 20 }); log(s, '歇了两周'); return '你关掉了所有通知，在江边走了好几天。回来的时候，心里松了一点。'; } },
        { label: '回家', go: (s) => endGame(s, 'kenlao', 'mood') },
      ] }),
    exam: (s) => ({
      title: '公务员考试',
      text: `十二月，你${s.job ? '请了两天假，' : ''}回老家参加考试。考场在县一中，你坐的位置，正好是高三时的教室。\n\n备考进度：${Math.min(100, s.exam)}。`,
      choices: [{ label: '进考场', go: (s) => {
        const p = clamp((s.exam - 40) / 100 + s.stats.skill / 500, 0.03, 0.8);
        if (chance(s, p)) { s.queue.unshift({ id: 'exam_pass' }); return '交卷的时候，你觉得申论写得挺顺。'; }
        s.exam = Math.round(s.exam * 0.6);
        add(s, { mood: -8 });
        log(s, '考公没考上');
        return '成绩出来，差了几分。爸在电话里说：“明年再来。”';
      } }],
    }),
    exam_pass: () => ({
      title: '上岸了', text: '公示名单上有你的名字。爸妈在电话里激动得说不出话，你妈已经开始挨个通知亲戚了。',
      choices: [
        { label: '回老家报到', go: (s) => endGame(s, 'kaogong') },
        { label: '放弃，留在南屿', go: (s) => { s.flags.kaogong = false; add(s, { mood: 4 }); log(s, '考上了，但留在了南屿'); return '你给爸妈打了很久的电话。最后爸说：“你自己的路，你自己走吧。”'; } },
      ],
    }),
    reunion: () => ({
      title: '毕业五周年同学会',
      text: '班长订了学校后门那家老馆子，来了二十几个人。\n\n菜上到一半，班长端着杯子站起来：“挨个说说吧，这五年都在干嘛？”\n\n轮到你了。',
      choices: [{ label: '说说这五年', go: (s) => {
        const inc = last12(s);
        endGame(s, inc >= 1e6 ? 'million' : inc >= 5e5 ? 'success' : inc >= 1.5e5 ? 'backbone' : 'light');
      } }],
    }),
  };
  const build = (s, item) => SC[item.id](s, item.p || {});
