
  // ---- 每回合能做的事 ----
  const FOOD_WEEK = 250;
  const ACTIONS = [
    // 找工作：一回合一周
    { id: 'haitou', phase: 'search', label: '海投简历', hint: '精力 −5，下周约到 2–3 个面试，坑也多',
      run: (s) => { add(s, { energy: -5 }); const n = rint(s, 2, 3); addInvites(s, n, 'wide'); return `你把简历投给了招聘软件上所有能投的岗位。约到了 ${n} 个面试，都在下周。`; } },
    { id: 'jingtou', phase: 'search', label: '精挑细投', hint: '精力 −8，岗位更好，约到的少；专业越高越容易约到大厂',
      run: (s) => { add(s, { energy: -8, mood: -1 }); const n = 1 + (chance(s, 0.25 + s.stats.skill / 160) ? 1 : 0); addInvites(s, n, 'narrow'); return `你逐个研究了公司，每份简历都改了一遍。约到了 ${n} 个面试，在下周。`; } },
    { id: 'fair', phase: 'search', label: '跑招聘会', hint: '精力 −14，人脉 +3，下周 1–2 个面试',
      run: (s) => { add(s, { energy: -14, network: 3, mood: -2 }); const n = rint(s, 1, 2); addInvites(s, n, 'fair'); return `体育馆里人挤人，你递出去二十几份简历，加了一堆 HR 的微信。约到了 ${n} 个面试。`; } },
    { id: 'study', phase: 'search', label: '刷题准备', hint: '专业 +3，表达 +3，精力 −6',
      run: (s) => { add(s, { skill: 3, talk: 3, energy: -6 }); return say(s, ['你在图书馆刷了一周面经，把常见问题都过了一遍。', '你对着镜子练自我介绍，练到能一口气说完不卡壳。']); } },
    { id: 'gig', phase: 'search', label: '打零工', hint: '存款 +500 左右，精力 −20',
      run: (s) => { const g = rint(s, 450, 650); add(s, { cash: g, energy: -20, mood: -3 }); return `你在商场门口发了三天传单，又去餐厅帮了两天厨。挣了 ${money(g)}。`; } },
    { id: 'rest', phase: 'search', label: '躺平休息', hint: '精力 +25，心态 +8',
      run: (s) => { add(s, { energy: 25, mood: 8 }); return say(s, ['你睡到自然醒，下楼吃了碗粉，去江边走了走。', '你什么都没干，看完了一整季综艺。']); } },
    { id: 'call', phase: 'search', label: '给家里打电话', hint: '心态回升，也可能挨说',
      run: (s) => {
        s.calls += 1;
        add(s, { mood: Math.max(2, 9 - s.calls) });
        if (s.stats.cash < 1500 && chance(s, 0.4)) { add(s, { cash: 500 }); return '你没提钱的事。挂了电话，妈还是转来 500，备注：“吃好点。”'; }
        if (s.month >= 3 && !s.seen.includes('parents_kaogong') && chance(s, 0.35)) { trigger(s, 'parents_kaogong'); return '聊着聊着，爸接过了电话。'; }
        return say(s, ['妈问你吃得怎么样，你说挺好的。', '爸在电话那头说：“别太累。”然后就没话了。', '妈说家里的猫又胖了，给你发了十几张照片。']);
      } },
    // 上班：第一年和试用期一回合一个月，之后一回合一个季度
    { id: 'work', phase: 'work', label: '认真干活', hint: '表现 +10 左右，精力 −10',
      run: (s) => { add(s, { perf: Math.round(8 + s.stats.skill / 15), energy: -10, boss: 1 }); add(s, { skill: 1 }, gainMult(s)); return say(s, ['你把手头的活一件件做完，周报写得很漂亮。', '你没请一天假，交出去的东西挑不出毛病。']); } },
    { id: 'overtime', phase: 'work', label: '加班冲刺', hint: '表现 +18 左右，精力 −22，心态 −5',
      run: (s) => { add(s, { perf: Math.round(15 + s.stats.skill / 12), energy: -22, mood: -5, boss: 4 }); add(s, { skill: 2 }, gainMult(s)); return say(s, ['你连着加了两周的班，周末也在回消息。', '凌晨一点的写字楼，你是这一层最后一盏灯。']); } },
    { id: 'slack', phase: 'work', label: '摸鱼', hint: '精力 +18，心态 +8，表现 −6，可能被抓',
      run: (s) => {
        const j = s.job;
        add(s, { perf: -6, energy: 18, mood: 8 });
        const p = j.watch + 0.08 * j.streak + (s.stats.boss < 30 ? 0.08 : 0);
        j.streak += 1;
        if (!chance(s, p)) return say(s, ['你开着文档，刷了一下午短视频。没人发现。', '你在工位上睡了个午觉，醒来已经四点了。', '你带薪上了半小时厕所，顺便把一部剧追完了。']);
        if (j.prob > 0 || j.warn >= 1) {
          const first = j.prob > 0;
          add(s, { mood: -10 });
          loseJob(s, `摸鱼被抓，被${j.company}辞退`);
          return first
            ? '领导在你身后站了五分钟，你的屏幕上是购物车。\n\n下午 HR 就找你谈话：试用期员工，不用等考核了。你被辞退了。'
            : '这是第二次被抓了。领导什么都没说，直接叫来了 HR。\n\n你被辞退了。';
        }
        j.warn = 1;
        j.watch += 0.08;
        add(s, { boss: -15, perf: -8 });
        log(s, '摸鱼被领导抓到一次');
        return '你正在刷短视频，领导从背后经过，停了两秒。\n\n散会后他把你叫住：“上班时间，注意点。”这算一次警告。再被抓到，就得走人。';
      } },
    { id: 'learn', phase: 'work', label: '下班学习', hint: '专业 +5，表达 +2，精力 −8',
      run: (s) => { add(s, { energy: -8, perf: -2 }); add(s, { skill: 5, talk: 2 }, gainMult(s)); return say(s, ['你报了个网课，下班后啃完了三本专业书。', '你把行业报告一篇篇读完，记了满满一本笔记。']); } },
    { id: 'social', phase: 'work', label: '搞好关系', hint: '领导印象 +7，人脉 +3，表达 +2，花 300',
      run: (s) => { add(s, { boss: 7, mood: 2, cash: -300, energy: -6, perf: -1 }); add(s, { network: 3, talk: 2 }, gainMult(s)); return say(s, ['你请组里的人喝了奶茶，午饭也常跟领导一起吃。', '你主动帮隔壁组救了个急，人家记住了你。']); } },
    { id: 'lookout', phase: 'work', label: '偷偷看机会', hint: '可能拿到跳槽 offer，也可能被领导发现', when: (s) => s.job.prob === 0,
      run: (s) => {
        add(s, { energy: -6, perf: -2 });
        let caught = '';
        if (chance(s, 0.15)) {
          add(s, { boss: -20 });
          s.job.watch += 0.05;
          log(s, '偷偷面试被领导撞见');
          caught = '你请假去面试，回来时在电梯口碰见领导：“哟，穿这么正式？”他没再多问，但你知道他心里有数了。\n\n';
        }
        const n = (s.stats.skill >= 30 ? 1 : 0) + (s.stats.perf >= 70 || s.stats.network >= 40 ? 1 : 0);
        if (!n) return caught + '你投了一圈简历，都没回音。看来还得再攒攒本事。';
        const os = externalOffers(s, n);
        return caught + `你请了两次假，偷偷面了几家，拿到 ${os.length} 个 offer。在下面的 offer 栏里，下回合前决定。`;
      } },
    { id: 'side', phase: 'work', label: '经营副业', hint: '粉丝 +，精力 −10', when: { flag: 'side' },
      run: (s) => {
        const g = Math.round(rint(s, 300, 900) * (1 + s.stats.skill / 50) * gainMult(s));
        s.side += g;
        add(s, { energy: -10, perf: -2, mood: 2 });
        return `你下班后写了几篇职场笔记，涨了 ${g.toLocaleString('en-US')} 个粉丝。现在一共 ${s.side.toLocaleString('en-US')} 粉，副业每月能挣 ${money(s.side / 1000 * 60)} 左右。`;
      } },
    { id: 'vacation', phase: 'work', label: '休年假', hint: '精力 +30，心态 +15，花 1500，每年一次', when: (s) => s.job.prob === 0 && s.vacYear !== yearOf(s.month),
      run: (s) => { s.vacYear = yearOf(s.month); add(s, { energy: 30, mood: 15, cash: -1500, perf: -3 }); return say(s, ['你去海边待了五天，手机调了静音。', '你回了趟老家，妈天天变着花样做饭。', '你一个人去了大理，在洱海边发了一下午呆。']); } },
    // 两个阶段都能做
    { id: 'exam', phase: 'any', label: '备考公务员', hint: '备考进度 +，精力 −12，每年 12 月考', when: { flag: 'kaogong' },
      run: (s) => {
        s.exam = Math.min(120, s.exam + Math.round((8 + s.stats.skill / 20) * gainMult(s)));
        add(s, { energy: -12, mood: -3, ...(s.job ? { perf: -4 } : {}) });
        return `你刷了一沓行测题，又背了两篇申论范文。备考进度 ${Math.min(100, s.exam)}。`;
      } },
  ];
  const available = (s, a) => (a.phase === 'any' || a.phase === s.phase) && check(s, a.when);

  // ---- 跳槽 offer ----
  function externalOffers(s, n, headhunter) {
    const j = s.job, st = s.stats, out = [];
    for (let i = 0; i < n; i++) {
      const opts = [{ k: j.track, weight: TRACKS[j.track].trap ? 0 : 3 }];
      for (const k of ['media', 'ad', 'sales']) if (k !== j.track) opts.push({ k, weight: 1 });
      if (j.track !== 'bigtech' && st.skill >= 45 && st.talk >= 30) opts.push({ k: 'bigtech', weight: 1 + (st.skill - 45) / 10 });
      const t = pickWeighted(s, opts).k, T = TRACKS[t];
      let level, pay;
      if (t === j.track) {
        const up = st.perf >= 72 && j.level < T.titles.length - 1 && st.skill >= T.req[j.level + 1];
        level = j.level + (up ? 1 : 0);
        pay = r100(j.pay * ((headhunter ? 1.35 : 1.18) + rnd(s) * 0.25));
        if (up) pay = Math.max(pay, T.pay[level]);
      } else {
        level = clamp(j.level - 1, 0, T.titles.length - 1);
        pay = r100(Math.max(T.pay[level] * (0.95 + rnd(s) * 0.2), j.pay * (headhunter ? 1.35 : 1.1)));
      }
      const pool = T.companies.filter((c) => c !== j.company);
      const o = { uid: nextId(s), track: t, company: pool.length ? say(s, pool) : T.companies[0], level, pay, exp: s.turn + 1 };
      s.offers.push(o);
      out.push(o);
    }
    return out;
  }

  // ---- 每月结算 ----
  function salesComm(s) {
    const j = s.job, st = s.stats;
    const p = clamp(0.06 + st.talk / 260 + st.network / 420 + st.perf / 520, 0.04, 0.75);
    let c = 0;
    for (let k = 0; k <= j.level; k++) if (chance(s, p)) c += rint(s, 1500, 6000) * (1 + 0.5 * j.level);
    if (chance(s, 0.01 + st.network / 1200 + j.level * 0.015)) {
      const big = r100(rint(s, 40000, 180000) * (1 + 0.4 * j.level));
      c += big;
      add(s, { mood: 10, perf: 8 });
      log(s, `签下大单，提成 ${money(big)}`);
      s.queue.push({ id: 'info', p: { title: '签下大单', text: `跟了大半年的客户终于签了。销售群里炸了锅，老板发了个 888 的红包。\n\n这一单的提成：${money(big)}。` } });
    }
    return Math.round(c);
  }
  function eduComm(s) {
    let c = 0;
    for (let k = 0; k < 4; k++) if (chance(s, 0.15 + s.stats.talk / 220)) c += 500 * (1 + 0.3 * s.job.level);
    return Math.round(c);
  }
  function collapse(s) {
    const c = s.job.company;
    s.queue.push({ id: 'info', p: { title: '机构跑路了', text: `周一早上，${c}门口围满了家长。卷帘门上贴着一张 A4 纸：“因经营困难，暂停营业。”\n\n老板的电话打不通。你这个月的工资和提成，都没了。` } });
    add(s, { mood: -15 });
    loseJob(s, `${c}跑路，失业了`);
  }
  function layoff(s) {
    const j = s.job;
    if (TRACKS[j.track].trap) {
      s.queue.push({ id: 'info', p: { title: '老板跑路了', text: `直播间的补光灯一夜之间全撤了。老板的朋友圈停在三天前的“感恩家人们”。${j.owed ? `欠你的 ${money(j.owed)}，打了水漂。` : ''}没有合同，你连去哪儿告都不知道。` } });
      add(s, { mood: -12 });
      loseJob(s, `${j.company}老板跑路`);
      return;
    }
    const comp = (Math.floor(j.months / 12) + 1) * j.pay;
    s.stats.cash += comp;
    s.queue.push({ id: 'info', p: { title: '被裁员了', text: `周五下午，HR 约你去小会议室。桌上放着一盒纸巾和一份协议。\n\n“公司业务调整，你的岗位被优化了。”按 N+1 赔偿，你拿到 ${money(comp)}。` } });
    add(s, { mood: -10 });
    loseJob(s, `被${j.company}裁员，拿到 N+1 ${money(comp)}`);
  }
  function review(s, yearEnd) {
    const j = s.job, T = TRACKS[j.track];
    const sc = s.stats.perf * 0.7 + s.stats.boss * 0.3 + (rnd(s) - 0.5) * 16;
    const g = sc >= 80 ? 'S' : sc >= 66 ? 'A' : sc >= 48 ? 'B' : 'C';
    const title = yearEnd ? '年终考核' : '年中考核';
    const lines = [`${yearEnd ? '年终' : '年中'}绩效：${g}。`];
    const old = j.pay;
    const raise = { S: 0.18, A: 0.1, B: 0.03, C: 0 }[g];
    if (raise) { j.pay = r100(j.pay * (1 + raise)); lines.push(`月薪从 ${money(old)} 涨到 ${money(j.pay)}。`); }
    let pp = { S: 0.7, A: 0.3, B: 0, C: 0 }[g];
    if (pp && s.flags.defense) pp += 0.2;
    delete s.flags.defense;
    pp *= T.promo ?? 1;
    if (pp > 0 && j.level < T.titles.length - 1) {
      const need = T.req[j.level + 1];
      if (s.stats.skill < need) lines.push(`本来有机会晋升，但专业能力还差一截（要 ${need}，你是 ${s.stats.skill}）。`);
      else if (chance(s, pp)) {
        j.level += 1;
        j.pay = Math.max(r100(j.pay * 1.25), T.pay[j.level]);
        lines.push(`晋升为${T.titles[j.level]}！月薪涨到 ${money(j.pay)}。`);
        log(s, `晋升为${T.titles[j.level]}`);
      }
    }
    if (yearEnd) {
      const bonus = r100(old * T.bonus[g] * Math.min(1, j.months / 12));
      if (bonus > 0) { earn(s, bonus); lines.push(`年终奖 ${money(bonus)}。`); } else lines.push('年终奖：没有。');
    }
    s.stats.perf = Math.round(50 + (s.stats.perf - 50) * 0.4);
    if (g === 'S' || g === 'A') j.warn = 0;
    if (g === 'C') {
      j.c += 1;
      if (j.c >= 2) {
        s.queue.push({ id: 'info', p: { title, text: lines.join('\n') + '\n\n连续两次 C。HR 找你谈话：“你可能不太适合这个岗位。”你被辞退了。' } });
        add(s, { mood: -12 });
        loseJob(s, `连续两次绩效 C，被${j.company}辞退`);
        return;
      }
      lines.push('你被放进了绩效改进计划。下次再拿 C，就得走人。');
    } else j.c = 0;
    s.queue.push({ id: 'info', p: { title, text: lines.join('\n') } });
    log(s, `${yearEnd ? '年终' : '年中'}绩效 ${g}`);
  }
  // monthly：上班期间按月算生活费和床位费；找工作期间这两项按周扣
  function monthTick(s, monthly) {
    s.month += 1;
    const ci = calMonth(s.month);
    const j = s.job;
    if (j) {
      const T = TRACKS[j.track];
      j.months += 1;
      const risk = T.layoff * (s.stats.perf < 45 ? 2.5 : s.stats.perf > 75 ? 0.4 : 1) * (j.prob > 0 ? 0.5 : 1);
      if (T.collapse && chance(s, T.collapse)) collapse(s);
      else if (chance(s, risk)) layoff(s);
      else {
        let pay = j.pay;
        if (T.unpaid && chance(s, T.unpaid)) { j.owed += pay; pay = 0; }
        let inc = pay;
        if (T.comm === 'sales') inc += salesComm(s);
        if (T.comm === 'edu') inc += eduComm(s);
        if (T.stock && T.stock[j.level]) inc += Math.round(T.stock[j.level] / 12);
        earn(s, inc);
        if (j.months === 1 && s.jobsHeld === 1 && pay) {
          s.queue.push({ id: 'info', p: { title: '第一份工资', text: `工资到账的短信来了：${money(inc)}。你截了个图，想了想，还是没发朋友圈。\n\n给爸妈各转了 200，备注：“不用省。”` } });
          add(s, { cash: -400, mood: 8 });
        }
      }
    }
    if (s.flags.side) { s.side = Math.round(s.side * 1.02); earn(s, Math.round(s.side / 1000 * 60)); }
    const H = HOUSES[s.house];
    s.stats.cash -= H.rent ? H.rent + s.rentAdj : 0;
    if (monthly) {
      s.stats.cash -= 1200 + Math.round((s.job ? s.job.pay : 0) * 0.1);
      if (s.house === 'hostel') s.stats.cash -= H.week * 4;
      if (s.house === 'sofa') s.sofaWeeks += 4;
    }
    if (s.job && s.job.prob === 0 && s.job.months >= 4 && (ci === 1 || ci === 7)) review(s, ci === 1);
    if (s.flags.kaogong && ci === 12 && s.exam >= 20) s.queue.push({ id: 'exam' });
  }

  function probation(s) {
    const j = s.job;
    if (!j || j.prob <= 0) return;
    j.prob -= 1;
    if (j.prob > 0) return;
    const perf = s.stats.perf;
    if (perf >= 55 || (perf >= 42 && chance(s, s.stats.boss / 100))) {
      const old = j.pay;
      j.pay = r100(j.pay * 1.05);
      s.queue.push({ id: 'info', p: { title: '转正', text: `试用期结束，你转正了。月薪从 ${money(old)} 调到 ${money(j.pay)}。\n\n之后每年 1 月和 7 月各考核一次。` } });
      log(s, '转正');
    } else {
      s.queue.push({ id: 'info', p: { title: '试用期没过', text: 'HR 把你叫进会议室：“这三个月你的表现，没达到我们的预期。”\n\n你收拾东西的时候，同事们都盯着屏幕。' } });
      add(s, { mood: -12 });
      loseJob(s, `${j.company}试用期没过`);
    }
  }

  // ---- 回合结束 ----
  function trigger(s, e) {
    if (typeof e === 'string') e = EVENTS.find((x) => x.id === e);
    if (!e || (e.once !== false && s.seen.includes(e.id))) return;
    if (!s.seen.includes(e.id)) s.seen.push(e.id);
    if (e.cooldown) s.cool[e.id] = s.turn + e.cooldown;
    if (e.enter) e.enter(s);
    s.queue.push({ id: 'ev', p: { e: e.id } });
  }
  function maybeEvent(s, p) {
    if (!chance(s, p)) return;
    const pool = EVENTS.filter((e) => check(s, e.when) && !(e.once !== false && s.seen.includes(e.id)) && !((s.cool[e.id] ?? -1) > s.turn));
    const e = pickWeighted(s, pool);
    if (e) trigger(s, e);
  }
  function laterDue(s) {
    const due = s.later.filter((x) => x.at <= s.turn);
    s.later = s.later.filter((x) => x.at > s.turn);
    for (const x of due) { if (x.eff) add(s, x.eff); s.queue.push({ id: x.id, p: x.p || {} }); }
  }
  function expireOffers(s) {
    for (const o of s.offers.filter((o) => o.exp <= s.turn)) log(s, `${o.company}的 offer 过期了`);
    s.offers = s.offers.filter((o) => o.exp > s.turn);
  }
  function endSearchTurn(s) {
    const H = HOUSES[s.house];
    s.stats.cash -= FOOD_WEEK + (H.week || 0);
    add(s, { energy: 5 + H.e, mood: H.m });
    if (s.house === 'sofa') s.sofaWeeks += 1;
    // 本周的面试，一周最多去两个
    const due = s.invites.filter((v) => v.at <= s.turn);
    const go = due.slice(0, 2);
    const missed = due.slice(2).filter((v) => v.at < s.turn);
    for (const v of go) enqueueInterview(s, v);
    for (const v of missed) log(s, `错过了${v.company}的面试`);
    const done = new Set([...go, ...missed].map((v) => v.uid));
    s.invites = s.invites.filter((v) => !done.has(v.uid));
    laterDue(s);
    expireOffers(s);
    s.week += 1;
    if (s.week >= 4) { s.week = 0; monthTick(s, false); }
    if (s.phase === 'search' && s.invites.length < 3 && chance(s, 0.25)) addInvites(s, 1, 'wide');
    maybeEvent(s, 0.35);
    s.turn += 1;
    s.queue.push({ id: 'check' });
  }
  function endWorkTurn(s, n) {
    for (let k = 0; k < n && s.phase === 'work'; k++) monthTick(s, true);
    const H = HOUSES[s.house];
    add(s, { energy: 8 + H.e - (s.job && TRACKS[s.job.track].trap ? 8 : 0), mood: 1 + H.m });
    if (s.job) { add(s, { perf: -2 }); probation(s); }
    laterDue(s);
    if (s.phase === 'work') expireOffers(s);
    maybeEvent(s, n === 3 ? 0.65 : 0.45);
    s.turn += 1;
    s.queue.push({ id: 'check' });
  }
  function runCheck(s) {
    if (s.phase === 'over') return;
    if (s.month >= 60) { s.queue.unshift({ id: 'reunion' }); return; }
    if (s.job ? s.stats.cash < -3000 : s.stats.cash < 0) { s.queue.unshift({ id: 'bailout' }); return; }
    if (s.stats.mood <= 0) { s.queue.unshift({ id: 'breakdown' }); return; }
    if (s.stats.energy <= 0) {
      const fee = rint(s, 800, 2000);
      add(s, { cash: -fee, mood: -8, perf: -10 });
      s.stats.energy = 45;
      log(s, '累病了');
      s.queue.unshift({ id: 'info', p: { title: '病倒了', text: `你连着几天头晕，最后在${s.job ? '工位上' : '出租屋里'}晕了过去。\n\n医生说是过度劳累，开了药让你好好休息。医药费 ${money(fee)}。` } });
    }
    if (s.house === 'sofa' && s.sofaWeeks >= 4) {
      s.queue.unshift({ id: 'house', p: { forced: true, msg: '同学委婉地说，他对象下周要搬过来住了。你得找新住处了。' } });
    }
  }
  function flush(s) {
    while (s.queue.length && s.queue[0].id === 'check') { s.queue.shift(); runCheck(s); }
  }

  // ---- 对外接口 ----
  function snap(s) { return { ...s.stats, job: Boolean(s.job) }; }
  function diff(b, s) {
    const out = [];
    for (const k of KEYS) {
      if ((k === 'perf' || k === 'boss') && (!b.job || !s.job)) continue;
      const d = s.stats[k] - b[k];
      if (d) out.push({ k, name: STAT_NAMES[k], d });
    }
    return out;
  }
  const idle = (s) => s.phase !== 'over' && !s.result && !s.queue.length;

  function newGame(name, seed) {
    const s = {
      v: 1, rng: (seed ?? Math.floor(Math.random() * 4294967296)) >>> 0, uid: 0,
      name: String(name || '小林').trim().slice(0, 8) || '小林',
      phase: 'search', month: 0, week: 0, turn: 0,
      stats: { cash: 3000, energy: 80, mood: 70, skill: 20, talk: 20, network: 5, perf: 50, boss: 50 },
      flags: {}, seen: [], cool: {}, later: [],
      house: null, deposit: 0, rentAdj: 0, sofaWeeks: 0,
      invites: [], offers: [], job: null, prev: null,
      earn: {}, bailouts: 0, calls: 0, exam: 0, side: 0, vacYear: 0, jobsHeld: 0, rudeHR: null, lastViral: 0,
      queue: [{ id: 'house', p: { first: true } }], result: null, log: [], ending: null,
    };
    log(s, '揣着 3000 块，到了南屿');
    return s;
  }
  function view(s) {
    if (s.phase === 'over') return { mode: 'ending' };
    if (s.result) return { mode: 'result', ...s.result };
    if (s.queue.length) {
      const sc = build(s, s.queue[0]);
      return { mode: 'scene', title: sc.title, text: sc.text, choices: sc.choices.map((c) => ({ label: c.label, sub: c.sub, score: c.score })) };
    }
    return { mode: 'actions', actions: ACTIONS.filter((a) => available(s, a)).map((a) => ({ id: a.id, label: a.label, hint: a.hint })) };
  }
  function act(s, id) {
    if (!idle(s)) return;
    const a = ACTIONS.find((x) => x.id === id);
    if (!a || !available(s, a)) return;
    const before = snap(s);
    const mode = s.phase;
    const n = mode === 'work' ? monthsPerTurn(s) : 0;
    const when = stamp(s);
    if (id !== 'slack' && s.job) s.job.streak = 0;
    const text = a.run(s);
    if (mode === 'search') endSearchTurn(s); else endWorkTurn(s, n);
    s.result = { title: a.label, text, when, deltas: diff(before, s) };
    flush(s);
  }
  function choose(s, i) {
    if (s.result || !s.queue.length || s.phase === 'over') return;
    const sc = build(s, s.queue[0]);
    const c = sc.choices[i];
    if (!c) return;
    s.queue.shift();
    const before = snap(s);
    const r = c.go(s);
    if (s.phase === 'over') return;
    if (typeof r === 'string') s.result = { title: sc.title, text: r, deltas: diff(before, s) };
    flush(s);
  }
  function next(s) { if (!s.result) return; s.result = null; flush(s); }
  function accept(s, id) {
    if (!idle(s)) return;
    const o = s.offers.find((x) => x.uid === id);
    if (!o) return;
    const T = TRACKS[o.track];
    const old = s.job;
    if (old && !TRACKS[old.track].trap) s.prev = { track: old.track, level: old.level, pay: old.pay };
    s.job = { track: o.track, company: o.company, level: o.level, pay: o.pay, prob: 3, months: 0, warn: 0, streak: 0, c: 0, watch: T.watch, owed: 0 };
    s.phase = 'work';
    s.week = 0;
    s.offers = [];
    s.invites = [];
    s.later = s.later.filter((x) => x.id !== 'callback');
    s.stats.perf = 50;
    s.stats.boss = 50;
    s.jobsHeld += 1;
    const pw = T.comm ? '底薪' : '月薪';
    log(s, `${old ? '跳槽到' : '入职'}${o.company}，${T.titles[o.level]}，${pw} ${money(o.pay)}`);
    let text = `${old ? `你给${old.company}递了辞呈。` : ''}你入职了${o.company}，岗位是${T.titles[o.level]}，${pw} ${money(o.pay)}。\n\n试用期三个月，看表现决定转不转正。试用期里摸鱼被抓，会直接被辞退。`;
    if (T.trap) text += '\n\n合同的事，负责人说“过阵子再说”。';
    s.queue.push({ id: 'info', p: { title: old ? '跳槽' : '入职', text } });
    if (T.dorm && s.house !== 'dorm') s.queue.push({ id: 'dorm' });
  }
  function decline(s, id) { if (idle(s)) s.invites = s.invites.filter((x) => x.uid !== id); }
  function move(s) { if (idle(s) && s.house) s.queue.push({ id: 'house', p: {} }); }
  function quit(s) { if (idle(s) && s.job) s.queue.push({ id: 'quit' }); }

  return {
    newGame, view, act, choose, next, accept, decline, move, quit, idle,
    stamp, money, last12, monthsPerTurn, calMonth, yearOf,
    TRACKS, HOUSES, ENDINGS, ENDING_ORDER, FOOD_WEEK,
  };
})();
globalThis.Core = Core;
/*CORE-END*/
