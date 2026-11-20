
(() => {
  const C = globalThis.Core;
  const KEY = { auto: 'sqjc.auto.v1', slot: 'sqjc.slot.v1', album: 'sqjc.album.v1' };
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* 无痕模式等情况下存不了，游戏照常玩 */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* 同上 */ } },
  };
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const paras = (t) => esc(t).split('\n\n').map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
  let S = null;
  const START_ART = { mode: 'arrive', hour: 'dusk', lit: 0.3, seed: 11 };
  // 交通卡上的天际线：上班后是夜里，近一年挣得越多，亮灯的窗户越多
  const cityArt = (s) => ({ mode: 'city', hour: s.phase === 'work' ? 'night' : 'dusk', lit: 0.12 + 0.6 * Math.min(1, Math.sqrt(C.last12(s) / 1e6)), you: Boolean(s.house), seed: 20261 });
  function endArt(id) {
    const lit = { million: 0.9, success: 0.7, backbone: 0.5, light: 0.32 }[id];
    return lit ? { mode: 'city', hour: 'night', lit, you: true, seed: 20261 } : { mode: 'home', hour: 'dusk', seed: 31 };
  }
  function paintAll() {
    if (!S) { Art.paint($('artStart'), START_ART); return; }
    Art.paint($('artCity'), cityArt(S));
    if (S.ending) Art.paint($('artEnd'), endArt(S.ending.id));
  }

  function readJSON(raw) { try { const x = JSON.parse(raw); return x && x.v === 1 ? x : null; } catch { return null; } }
  function album() { try { return JSON.parse(store.get(KEY.album) || '[]'); } catch { return []; } }
  function addAlbum(id) { const a = album(); if (!a.includes(id)) { a.push(id); store.set(KEY.album, JSON.stringify(a)); } }
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    clearTimeout(toast.h);
    toast.h = setTimeout(() => { t.textContent = ''; }, 2400);
  }

  function albumHTML() {
    const got = album();
    return `<h3>结局图鉴 · 已解锁 ${got.length}/${C.ENDING_ORDER.length}</h3><div class="slots">${C.ENDING_ORDER.map((id) =>
      `<div class="slot${got.includes(id) ? ' got' : ''}">${got.includes(id) ? esc(C.ENDINGS[id].title) : '？？？'}</div>`).join('')}</div>`;
  }

  function meter(name, v) {
    return `<div class="meter${v < 25 ? ' low' : ''}"><span>${name}</span><span class="bar"><i style="width:${v}%"></i></span><span class="v">${v}</span></div>`;
  }

  function renderPass() {
    const s = S, j = s.job, st = s.stats;
    const T = j && C.TRACKS[j.track];
    const role = j ? `${T.titles[j.level]} · ${j.company}${j.prob > 0 ? ' · 试用期' : ''}` : '待业中';
    const house = s.house ? C.HOUSES[s.house].name : '还没找到住处';
    const pct = Math.min(100, (s.month / 60) * 100);
    const stops = ['出发', '1年', '2年', '3年', '4年', '同学会'];
    const meters = [meter('精力', st.energy), meter('心态', st.mood)];
    if (j) meters.push(meter('表现', st.perf), meter('领导', st.boss));
    const chips = [['专业', st.skill], ['表达', st.talk], ['人脉', st.network]];
    if (j) chips.push([T.comm ? '底薪' : '月薪', C.money(j.pay)]);
    if (s.month > 0) chips.push(['近一年收入', C.money(C.last12(s))]);
    if (s.flags.side) chips.push(['粉丝', s.side.toLocaleString('en-US')]);
    if (s.flags.kaogong) chips.push(['备考', Math.min(100, s.exam)]);
    $('pass').innerHTML = `
      <div class="pass-band"><span class="brand">三千块进城</span><span class="mono date">${esc(C.stamp(s))}</span></div>
      <div class="art-strip"><canvas class="art" id="artCity" role="img" aria-label="南屿的夜景。亮灯的窗户越多，说明你近一年挣得越多"></canvas></div>
      <div class="pass-body">
        <div class="bal"><span class="lbl">存款</span><span class="mono num${st.cash < 0 ? ' neg' : ''}">${C.money(st.cash)}</span></div>
        <div class="who"><b>${esc(s.name)}</b><span>${esc(role)}</span><span>住 ${esc(house)}</span></div>
        <div class="metro" aria-label="五年进度：${Math.round(pct)}%">
          <div class="rail"><i style="width:${pct}%"></i><b style="left:${pct}%"></b></div>
          <ol class="stops">${stops.map((x, i) => `<li class="${s.month >= i * 12 ? 'on' : ''}">${x}</li>`).join('')}</ol>
        </div>
        <div class="meters">${meters.join('')}</div>
        <div class="chips">${chips.map(([k, v]) => `<span class="chip">${k}<b>${esc(v)}</b></span>`).join('')}</div>
      </div>`;
  }

  function costLine(s) {
    const H = C.HOUSES[s.house];
    const rent = H.rent ? H.rent + s.rentAdj : 0;
    if (s.phase === 'search') return `每周饭钱 ${C.money(C.FOOD_WEEK)}${H.week ? `，床位 ${C.money(H.week)}` : ''}${rent ? `；每 4 周交一次房租 ${C.money(rent)}` : ''}。投出去的简历，下周去面试。`;
    const n = C.monthsPerTurn(s);
    const living = 1200 + Math.round(s.job.pay * 0.1) + (H.week ? H.week * 4 : 0);
    return `这一回合是 ${n === 3 ? '一个季度' : '一个月'}。每月房租 ${C.money(rent)}，生活费约 ${C.money(living)}。${s.job.prob > 0 ? `试用期还剩 ${s.job.prob} 个月。` : ''}`;
  }

  function renderStage() {
    const v = C.view(S), el = $('stage');
    if (v.mode === 'ending') {
      const e = S.ending;
      addAlbum(e.id);
      el.innerHTML = `<div class="card ending">
        <div class="art-end"><canvas class="art" id="artEnd" role="img" aria-label="结局插图"></canvas></div>
        <p class="eyebrow">${esc(e.tag)}</p>
        <h2 class="end-title">${esc(e.title)}</h2>
        <div class="txt">${paras(e.text)}</div>
        <dl class="sum">
          <dt>最近一年收入</dt><dd>${C.money(e.inc)}</dd>
          <dt>存款</dt><dd>${C.money(e.cash)}</dd>
          <dt>最后的身份</dt><dd>${esc(e.role)}</dd>
          <dt>在南屿待了</dt><dd>${e.months} 个月</dd>
        </dl>
        <div class="album">${albumHTML()}</div>
        <div class="free"><button class="primary" type="button" data-again>再来一次</button></div>
      </div>`;
      return;
    }
    if (v.mode === 'result') {
      const ds = (v.deltas || []).map((d) => {
        const val = d.k === 'cash' ? C.money(Math.abs(d.d)) : Math.abs(d.d);
        return `<span class="delta ${d.d > 0 ? 'up' : 'down'}">${d.name} ${d.d > 0 ? '+' : '−'}${val}</span>`;
      }).join('');
      el.innerHTML = `<div class="card">
        ${v.when ? `<p class="kicker mono">${esc(v.when)}</p>` : ''}
        <h2>${esc(v.title)}</h2>
        <div class="txt">${paras(v.text)}</div>
        ${ds ? `<div class="deltas">${ds}</div>` : '<div class="deltas"></div>'}
        <button class="primary" type="button" data-next>继续</button>
      </div>`;
      return;
    }
    if (v.mode === 'scene') {
      el.innerHTML = `<div class="card">
        <h2>${esc(v.title)}</h2>
        <div class="txt">${paras(v.text)}</div>
        <div class="choices">${v.choices.map((c, i) => `<button class="choice" type="button" data-choose="${i}"><span>${esc(c.label)}</span>${c.sub ? `<small>${esc(c.sub)}</small>` : ''}</button>`).join('')}</div>
      </div>`;
      return;
    }
    const head = S.phase === 'search' ? '这周做什么？' : C.monthsPerTurn(S) === 3 ? '这个季度主要做什么？' : '这个月主要做什么？';
    el.innerHTML = `<div class="card">
      <h2>${head}</h2>
      <p class="sub">${esc(costLine(S))}</p>
      <div class="grid">${v.actions.map((a) => `<button class="act" type="button" data-act="${a.id}"><b>${esc(a.label)}</b><small>${esc(a.hint)}</small></button>`).join('')}</div>
      <div class="free">
        <button class="ghost" type="button" data-move>换住处</button>
        ${S.job ? '<button class="ghost" type="button" data-quit>辞职</button>' : ''}
      </div>
    </div>`;
  }

  function renderTickets() {
    const s = S, el = $('tickets');
    if (s.phase === 'over' || (!s.offers.length && !s.invites.length)) { el.innerHTML = ''; return; }
    const idle = C.idle(s);
    const offers = s.offers.map((o) => {
      const T = C.TRACKS[o.track];
      const left = o.exp - s.turn;
      return `<div class="ticket offer"><div>
        <span class="tag">OFFER · ${left <= 0 ? '这回合不接就过期' : `还能等 ${left + 1} 回合`}</span>
        <b>${esc(T.titles[o.level])}</b>
        <small>${esc(o.company)} · ${T.comm ? '底薪' : '月薪'} ${C.money(o.pay)} · ${esc(T.blurb)}</small>
      </div><button class="take" type="button" data-accept="${o.uid}" ${idle ? '' : 'disabled'}>接受</button></div>`;
    }).join('');
    const invites = s.invites.map((v) => {
      const T = C.TRACKS[v.track];
      return `<div class="ticket"><div>
        <span class="tag">${v.at <= s.turn ? '本周面试' : '下周面试'}</span>
        <b>${esc(T.titles[v.level])}</b>
        <small>${esc(v.company)} · ${C.money(v.lo)}–${C.money(v.hi)} · ${esc(T.blurb)}</small>
      </div><button class="ghost" type="button" data-decline="${v.uid}" ${idle ? '' : 'disabled'}>不去了</button></div>`;
    }).join('');
    el.innerHTML = (offers ? `<h3 class="sec-title">手上的 offer</h3>${offers}` : '')
      + (invites ? `<h3 class="sec-title">面试邀约 · 每周最多去两个</h3>${invites}` : '');
  }

  function renderRoute() {
    $('route').innerHTML = `<h3 class="sec-title">行程记录</h3><ol class="stations">${S.log.slice(0, 40).map((e) =>
      `<li><span class="mono t">${esc(e.t)}</span><span>${esc(e.x)}</span></li>`).join('')}</ol>`;
  }

  function render() {
    const start = $('start'), game = $('game');
    if (!S) {
      start.hidden = false;
      game.hidden = true;
      $('album').innerHTML = albumHTML();
      paintAll();
      return;
    }
    start.hidden = true;
    game.hidden = false;
    renderPass();
    renderStage();
    renderTickets();
    renderRoute();
    paintAll();
    store.set(KEY.auto, JSON.stringify(S));
  }

  function keepStageInView() {
    const r = $('stage').getBoundingClientRect();
    if (r.top < 0 || r.top > window.innerHeight * 0.75) $('stage').scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
  }

  let armed = 0;
  $('app').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const d = b.dataset;
    if (b.id === 'go') {
      S = C.newGame($('nm').value);
    } else if (!S && !('load' in d)) {
      if ('save' in d || 'restart' in d) toast('还没开始呢');
      return;
    } else if ('choose' in d) C.choose(S, Number(d.choose));
    else if ('act' in d) C.act(S, d.act);
    else if ('next' in d) C.next(S);
    else if ('accept' in d) C.accept(S, Number(d.accept));
    else if ('decline' in d) C.decline(S, Number(d.decline));
    else if ('move' in d) C.move(S);
    else if ('quit' in d) C.quit(S);
    else if ('again' in d) { S = null; store.del(KEY.auto); }
    else if ('save' in d) {
      if (S.phase === 'over') { toast('这一局已经结束了'); return; }
      store.set(KEY.slot, JSON.stringify(S));
      toast(store.get(KEY.slot) ? `已存档：${C.stamp(S)}` : '这个浏览器存不了档');
      return;
    } else if ('load' in d) {
      const x = readJSON(store.get(KEY.slot));
      if (!x) { toast('还没有存档'); return; }
      S = x;
      toast(`已读档：${C.stamp(S)}`);
    } else if ('restart' in d) {
      if (!armed) {
        armed = 1;
        b.textContent = '再点一次，确认重来';
        setTimeout(() => { armed = 0; b.textContent = '重新开始'; }, 3000);
        return;
      }
      armed = 0;
      b.textContent = '重新开始';
      S = null;
      store.del(KEY.auto);
    } else return;
    render();
    if (S) keepStageInView();
  });
  let resizeTimer = 0;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(paintAll, 150); });
  // 字体加载完再画一遍，插图里的“你”字才用得上正确的字体
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(paintAll);
  $('nm').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('go').click(); });

  function start(data) {
    S = (data && data.S) || readJSON(store.get(KEY.auto));
    render();
  }
  window.claude?.hot?.snapshot?.(() => ({ S }));
  if (window.claude?.hot?.ready) window.claude.hot.ready(start);
  else start(window.claude?.hot?.data ?? {});
})();
