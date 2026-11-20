
// 插图：用 canvas 画的南屿。亮灯的窗户越多，说明你这一年挣得越多；随机种子固定，灯只会越亮越多。
const Art = (() => {
  function rng(seed) {
    let t = seed >>> 0;
    return () => {
      t = (t + 0x6d2b79f5) >>> 0;
      let x = Math.imul(t ^ (t >>> 15), t | 1);
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }
  const SKY = {
    dusk: ['#1f2e55', '#5b4a7d', '#e0937a'],
    night: ['#060b18', '#101b36', '#22345a'],
  };
  const WIN = '#ffd27a', WIN2 = '#fff1c9', LINE = '#36b0be', YOU = '#ffcf5a';

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.lineTo(x + w - r, y);
    g.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
    g.lineTo(x + r, y + h);
    g.arc(x + r, y + r, r, Math.PI / 2, Math.PI * 1.5);
    g.closePath();
    g.fill();
  }

  function sky(g, w, h, hour, R) {
    const c = SKY[hour];
    const gr = g.createLinearGradient(0, 0, 0, h * 0.8);
    gr.addColorStop(0, c[0]);
    gr.addColorStop(0.6, c[1]);
    gr.addColorStop(1, c[2]);
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    const n = Math.round(w / (hour === 'night' ? 9 : 28));
    for (let i = 0; i < n; i++) {
      const x = R() * w, y = R() * h * 0.5, a = 0.3 + R() * 0.7, r = R() < 0.9 ? 0.7 : 1.3;
      g.globalAlpha = a;
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
    // 月亮
    const mx = w * 0.82, my = h * 0.2, mr = Math.max(7, Math.min(18, h * 0.07));
    const glow = g.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 4);
    glow.addColorStop(0, 'rgba(255,240,210,0.35)');
    glow.addColorStop(1, 'rgba(255,240,210,0)');
    g.fillStyle = glow;
    g.fillRect(mx - mr * 4, my - mr * 4, mr * 8, mr * 8);
    g.fillStyle = '#fbf1d6';
    g.beginPath();
    g.arc(mx, my, mr, 0, Math.PI * 2);
    g.fill();
  }

  // 一排楼。每个窗户都固定掷两次骰子，亮灯比例变了，已亮的窗户不会熄
  function buildings(g, R, w, base, o) {
    const list = [];
    let x = -R() * 30;
    while (x < w + 10) {
      const bw = o.w[0] + R() * (o.w[1] - o.w[0]);
      const bh = o.h[0] + R() * (o.h[1] - o.h[0]);
      list.push({ x, y: base - bh, w: bw, h: bh, roof: R(), wins: [] });
      x += bw + R() * o.gap;
    }
    const s = o.win, sh = Math.round(s * 1.4);
    for (const b of list) {
      g.fillStyle = o.color;
      g.fillRect(Math.round(b.x), Math.round(b.y), Math.ceil(b.w), Math.ceil(b.h) + 1);
      if (b.roof < 0.2) g.fillRect(b.x + b.w * 0.3, b.y - 7, 2, 7);
      else if (b.roof < 0.32) g.fillRect(b.x + b.w * 0.2, b.y - 5, b.w * 0.45, 5);
      for (let wy = b.y + o.wgap + 2; wy + sh < base - 3; wy += sh + o.wgap) {
        for (let wx = b.x + o.wgap + 1; wx + s < b.x + b.w - 1; wx += s + o.wgap) {
          const r = R(), r2 = R();
          b.wins.push([Math.round(wx), Math.round(wy)]);
          if (r < o.lit) g.fillStyle = r2 < 0.8 ? WIN : WIN2;
          else if (o.dim) g.fillStyle = o.dim;
          else continue;
          g.fillRect(Math.round(wx), Math.round(wy), s, sh);
        }
      }
    }
    return list;
  }

  function ground(g, w, h, R, lit) {
    g.fillStyle = '#070c19';
    g.fillRect(0, h * 0.83, w, h * 0.17);
    const top = h * 0.875;
    const gr = g.createLinearGradient(0, top, 0, h);
    gr.addColorStop(0, '#0d1a33');
    gr.addColorStop(1, '#060b16');
    g.fillStyle = gr;
    g.fillRect(0, top, w, h - top);
    // 江面上的倒影
    const n = Math.round((w / 6) * (0.2 + lit));
    for (let i = 0; i < n; i++) {
      const x = R() * w, y = top + 3 + R() * Math.max(1, h - top - 5), len = 3 + R() * 10, a = 0.25 + R() * 0.5, c = R();
      g.globalAlpha = a;
      g.fillStyle = c < 0.8 ? WIN : '#9fe3ea';
      g.fillRect(x, y, len, 1);
    }
    g.globalAlpha = 1;
  }

  function rail(g, w, h, pos, beam) {
    const y = h * 0.845, bottom = h * 0.875;
    g.fillStyle = '#0b3a42';
    for (let x = 12; x < w; x += 46) g.fillRect(x, y + 3, 3, bottom - y - 3);
    g.fillStyle = LINE;
    g.fillRect(0, y, w, 3);
    const tw = Math.min(w * 0.32, 170), th = Math.max(8, Math.min(14, h * 0.055));
    const tx = w * pos, ty = y - th - 1;
    if (beam) {
      const bg = g.createLinearGradient(tx + tw, 0, tx + tw + 80, 0);
      bg.addColorStop(0, 'rgba(255,240,200,0.5)');
      bg.addColorStop(1, 'rgba(255,240,200,0)');
      g.fillStyle = bg;
      g.beginPath();
      g.moveTo(tx + tw, ty + th * 0.4);
      g.lineTo(tx + tw + 80, ty - 8);
      g.lineTo(tx + tw + 80, ty + th + 8);
      g.closePath();
      g.fill();
    }
    g.fillStyle = '#e9f0f1';
    roundRect(g, tx, ty, tw, th, th / 2);
    g.fillStyle = '#0a7482';
    g.fillRect(tx + 4, ty + th * 0.64, tw - 8, Math.max(1.5, th * 0.14));
    g.fillStyle = '#ffd98a';
    for (let x = tx + 8; x < tx + tw - 10; x += 9) g.fillRect(x, ty + th * 0.2, 5, th * 0.3);
  }

  function you(g, near) {
    const b = near[Math.floor(near.length * 0.62)];
    if (!b || !b.wins.length) return;
    const [x, y] = b.wins[Math.max(0, b.wins.length - 2)];
    g.save();
    g.shadowColor = '#ffb347';
    g.shadowBlur = 14;
    g.fillStyle = YOU;
    g.fillRect(x - 0.5, y - 0.5, 4.5, 6);
    g.restore();
    const lx = b.x + b.w / 2, ly = b.y - 13;
    g.strokeStyle = YOU;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(lx, ly + 8);
    g.lineTo(lx, b.y);
    g.stroke();
    g.fillStyle = YOU;
    g.beginPath();
    g.arc(lx, ly, 8.5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#3a2600';
    g.font = '700 10px "Noto Sans SC", "PingFang SC", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('你', lx, ly + 0.5);
  }

  function city(g, w, h, R, o) {
    const night = o.hour === 'night', lit = o.lit ?? 0.3;
    buildings(g, R, w, h * 0.74, { h: [h * 0.18, h * 0.44], w: [16, 38], gap: 4, color: night ? '#18264a' : '#3d3c66', lit: lit * 0.45, win: 2, wgap: 3 });
    buildings(g, R, w, h * 0.79, { h: [h * 0.14, h * 0.5], w: [22, 46], gap: 6, color: night ? '#101a33' : '#2b2a4c', lit: lit * 0.75, win: 3, wgap: 3, dim: 'rgba(255,255,255,0.05)' });
    const near = buildings(g, R, w, h * 0.83, { h: [h * 0.12, h * 0.34], w: [26, 58], gap: 8, color: night ? '#0a1226' : '#1c1a34', lit, win: 3.5, wgap: 3.5, dim: 'rgba(255,255,255,0.06)' });
    ground(g, w, h, R, lit);
    rail(g, w, h, o.mode === 'arrive' ? 0.04 : 0.56, o.mode === 'arrive');
    if (o.you) you(g, near);
  }

  function hills(g, w, base, amp, color, R) {
    const p = R() * 6, f = 0.008 + R() * 0.006;
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(0, 4000);
    for (let x = 0; x <= w + 6; x += 6) g.lineTo(x, base - Math.sin(x * f + p) * amp - Math.sin(x * f * 2.3 + p) * amp * 0.4);
    g.lineTo(w + 6, 4000);
    g.closePath();
    g.fill();
  }

  // 回老家：傍晚的小县城，火车往外开
  function home(g, w, h, R) {
    hills(g, w, h * 0.62, h * 0.1, '#3a3a64', R);
    hills(g, w, h * 0.72, h * 0.08, '#262747', R);
    const base = h * 0.83;
    let x = w * 0.06;
    while (x < w * 0.64) {
      const bw = 16 + R() * 18, bh = h * (0.06 + R() * 0.08), lit = R();
      g.fillStyle = '#16152b';
      g.fillRect(x, base - bh, bw, bh + 1);
      g.beginPath();
      g.moveTo(x - 2, base - bh);
      g.lineTo(x + bw / 2, base - bh - 7);
      g.lineTo(x + bw + 2, base - bh);
      g.closePath();
      g.fill();
      if (lit < 0.5) { g.fillStyle = WIN; g.fillRect(x + bw * 0.35, base - bh * 0.65, 4, 5); }
      x += bw + 4 + R() * 14;
    }
    ground(g, w, h, R, 0.08);
    rail(g, w, h, 0.66, false);
  }

  // o: { mode: 'arrive' | 'city' | 'home', hour: 'dusk' | 'night', lit: 0..1, you: bool, seed }
  function paint(cv, o) {
    if (!cv) return;
    const w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const R = rng(o.seed || 7);
    sky(g, w, h, o.hour || 'night', R);
    if (o.mode === 'home') home(g, w, h, R);
    else city(g, w, h, R, o);
  }
  return { paint };
})();
