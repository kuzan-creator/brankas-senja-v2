// Sunset Vaults — everything the eye sees. One job: draw the room, the
// cones, the loot, the HUD, the title screen and the victory screen on
// one canvas. No game logic lives here; main.js owns the state.
import { ROOM_X, ROOM_Y, ROOM_W, ROOM_H, ROOM_PX_W, ROOM_PX_H, PALETTE, VIEW_W, VIEW_H } from './config.js';
import { conePolygon } from './geometry.js';
import { ROOMS } from './levels.js';

const SX = ROOM_PX_W / ROOM_W; // horizontal stretch: room drawn wider than it plays
let CAM_Y = 0; // vertical camera scroll (world y hidden above the frame)
const X = (x) => ROOM_X + x * SX;
const Y = (y) => ROOM_Y + y - CAM_Y;
const SW = (w) => w * SX; // logical width -> screen width

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, s, x, y, size, color, weight, align) {
  ctx.fillStyle = color;
  ctx.font = `${weight || 700} ${size}px system-ui, "Segoe UI", sans-serif`;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x, y);
}

function coneColor(state, suspicion) {
  if (state === 'chase' || suspicion > 80) return { fill: 'rgba(255,60,60,0.42)', edge: '#ff6b6b' };
  if (state === 'suspicious' || state === 'investigate' || suspicion > 35) return { fill: 'rgba(255,201,60,0.38)', edge: '#ffc93c' };
  return { fill: 'rgba(91,140,255,0.30)', edge: '#5b8cff' };
}

function drawCone(ctx, pts, colors) {
  ctx.beginPath();
  ctx.moveTo(X(pts[0].x), Y(pts[0].y));
  for (let i = 1; i < pts.length; i++) ctx.lineTo(X(pts[i].x), Y(pts[i].y));
  ctx.closePath();
  ctx.fillStyle = colors.fill;
  ctx.fill();
  ctx.strokeStyle = colors.edge;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.9;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// A Mobile Legends style bush: a dense clump of small grass blades a
// sneaking thief can hide in. Deterministic per bush, so every render agrees.
function drawBush(ctx, bx, by, br, seed) {
  const rx = br * SX;
  const ry = br;
  // Dark base so the clump reads as a solid bush, not loose blades.
  ctx.fillStyle = 'rgba(34, 66, 28, 0.9)';
  ctx.beginPath();
  ctx.ellipse(bx, by, rx, ry * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();
  const h = (n) => {
    const v = Math.sin(seed * 127.1 + n * 311.7) * 43758.5453;
    return v - Math.floor(v);
  };
  ctx.lineCap = 'round';
  const greens = ['#3f7d3a', '#5da85a', '#7cc47a'];
  for (let i = 0; i < 26; i++) {
    const a = h(i) * Math.PI * 2;
    const f = Math.sqrt(h(i + 100));
    const x = bx + Math.cos(a) * rx * f * 0.9;
    const y = by + Math.sin(a) * ry * f * 0.85;
    const len = 12 + h(i + 200) * 12;
    const lean = (h(i + 300) - 0.5) * 14;
    ctx.strokeStyle = greens[i % 3];
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + lean * 0.4, y - len * 0.6, x + lean, y - len);
    ctx.stroke();
  }
}

// A small gravel bed: grey pebbles of different sizes.
function drawPebbles(ctx, x, y) {
  const stones = [[0, 0, 7, 5], [10, 3, 5, 4], [-9, 4, 6, 4], [4, -5, 5, 4], [-4, -6, 4, 3], [14, -3, 4, 3]];
  for (let i = 0; i < stones.length; i++) {
    const [dx, dy, rx, ry] = stones[i];
    ctx.fillStyle = ['#8a8f9e', '#6f7482', '#a2a7b5'][i % 3];
    ctx.beginPath();
    ctx.ellipse(x + dx, y + dy, rx, ry, (i * 0.7) % 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.ellipse(x + dx - 1, y + dy - 1, rx * 0.5, ry * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFloor(ctx, S) {
  const floor = S.room.floor;
  ctx.fillStyle = PALETTE.floor;
  ctx.fillRect(ROOM_X, ROOM_Y, ROOM_PX_W, ROOM_PX_H);
  // Tile grid, faint, so the floor still reads as a floor.
  // Vertical lines span the whole visible width; horizontal lines are
  // drawn at world rows inside the camera's view.
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let gx = 0; gx <= ROOM_PX_W; gx += 58) { ctx.moveTo(ROOM_X + gx, ROOM_Y); ctx.lineTo(ROOM_X + gx, ROOM_Y + ROOM_PX_H); }
  for (let wy = Math.floor(CAM_Y / 58) * 58; wy <= CAM_Y + ROOM_PX_H; wy += 58) { ctx.moveTo(ROOM_X, Y(wy)); ctx.lineTo(ROOM_X + ROOM_PX_W, Y(wy)); }
  ctx.stroke();
  if (floor === 'marble') {
    // Marble veins across the hall.
    ctx.strokeStyle = 'rgba(200,210,255,0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(X(60), Y(120)); ctx.bezierCurveTo(X(400), Y(200), X(900), Y(90), X(1560), Y(180));
    ctx.moveTo(X(80), Y(620)); ctx.bezierCurveTo(X(420), Y(540), X(900), Y(700), X(1560), Y(600));
    ctx.stroke();
    // The red carpet down the middle of the hall.
    ctx.fillStyle = 'rgba(120,30,40,0.35)';
    ctx.fillRect(X(760), Y(0), SW(80), 1200);
    ctx.strokeStyle = 'rgba(245,197,66,0.35)';
    ctx.strokeRect(X(760), Y(0), SW(80), 1200);
    // Framed sunset paintings on the top wall — the bank's own art.
    for (const px of [140, 800]) {
      const pg = ctx.createLinearGradient(X(px), Y(66), X(px), Y(112));
      pg.addColorStop(0, '#ff9a3c');
      pg.addColorStop(1, '#7a2d4d');
      ctx.fillStyle = pg;
      ctx.fillRect(X(px), Y(66), SW(90), 46);
      ctx.strokeStyle = '#f5c542';
      ctx.lineWidth = 2;
      ctx.strokeRect(X(px), Y(66), SW(90), 46);
      ctx.fillStyle = 'rgba(255,220,150,0.85)';
      ctx.beginPath();
      ctx.arc(X(px) + SW(90) / 2, Y(66) + 28, 9, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (floor === 'steel') {
    ctx.strokeStyle = 'rgba(150,180,255,0.10)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let gx = 0; gx <= ROOM_PX_W; gx += 116) { ctx.moveTo(ROOM_X + gx, ROOM_Y); ctx.lineTo(ROOM_X + gx, ROOM_Y + ROOM_PX_H); }
    ctx.stroke();
    // Wall pipes along the top of the vault room.
    ctx.strokeStyle = 'rgba(150,180,255,0.16)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(ROOM_X, Y(36)); ctx.lineTo(ROOM_X + ROOM_PX_W, Y(36));
    ctx.moveTo(ROOM_X, Y(48)); ctx.lineTo(ROOM_X + ROOM_PX_W, Y(48));
    ctx.stroke();
    ctx.fillStyle = '#f5c542';
    ctx.beginPath();
    ctx.arc(X(120), Y(42), 6, 0, Math.PI * 2);
    ctx.arc(X(1480), Y(42), 6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Rooftop: stars above the parapet, vents and skyline glow.
    ctx.fillStyle = '#161b2e';
    ctx.fillRect(ROOM_X, ROOM_Y, ROOM_PX_W, ROOM_PX_H);
    // Moon over the roof.
    ctx.fillStyle = 'rgba(255,244,200,0.9)';
    ctx.beginPath();
    ctx.arc(X(120), Y(92), 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,244,200,0.18)';
    ctx.beginPath();
    ctx.arc(X(120), Y(92), 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 40; i++) {
      const sx = ROOM_X + ((i * 173) % ROOM_PX_W);
      const sy = ROOM_Y + ((i * 97) % 200);
      ctx.globalAlpha = 0.25 + ((i * 37) % 60) / 100;
      ctx.fillRect(sx, sy, 2, 2);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,170,80,0.10)';
    ctx.fillRect(ROOM_X, Y(1120), ROOM_PX_W, 80); // city glow at the far edge
  }
  // Warm lantern pools.
  for (const l of S.room.lamps) {
    const g = ctx.createRadialGradient(X(l.x), Y(l.y), 8, X(l.x), Y(l.y), l.r);
    g.addColorStop(0, 'rgba(255,190,90,0.26)');
    g.addColorStop(1, 'rgba(255,190,90,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(X(l.x), Y(l.y), l.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd98a';
    ctx.beginPath();
    ctx.arc(X(l.x), Y(l.y), 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,217,138,0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(X(l.x), Y(l.y), 10, 0, Math.PI * 2);
    ctx.stroke();
    // Dust motes drifting in the lamplight — the room feels lived in.
    ctx.fillStyle = 'rgba(255,220,150,0.5)';
    for (let i = 0; i < 6; i++) {
      const a = S.time * 0.3 + i * 1.7 + l.x;
      const dx = Math.cos(a) * (l.r * 0.55);
      const dy = Math.sin(a * 1.3) * (l.r * 0.4);
      ctx.globalAlpha = 0.2 + 0.25 * Math.abs(Math.sin(S.time + i));
      ctx.fillRect(X(l.x) + dx, Y(l.y) + dy, 2, 2);
    }
    ctx.globalAlpha = 1;
  }
  // Shadow pockets: where a sneaking thief is hard to see.
  for (const s of S.room.shadows) {
    const g = ctx.createRadialGradient(X(s.x), Y(s.y), 4, X(s.x), Y(s.y), s.r);
    g.addColorStop(0, 'rgba(40,60,120,0.22)');
    g.addColorStop(1, 'rgba(40,60,120,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(X(s.x), Y(s.y), s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Bushes: dense Mobile Legends style grass a sneaking thief hides in.
  for (const b of S.room.bushes) drawBush(ctx, X(b.x), Y(b.y), b.r, b.x + b.y);
  // Gravel beds along the edges — the floor is lived in.
  const decor = {
    marble: { pebbles: [[150, 1160], [1550, 155], [800, 1160], [60, 420]] },
    steel: { pebbles: [[150, 1160], [1500, 1160], [250, 95], [1350, 95]] },
    roof: { pebbles: [[150, 1160], [1500, 1160], [250, 90], [1350, 90]] },
  }[floor] || { pebbles: [] };
  for (const [px, py] of decor.pebbles) drawPebbles(ctx, X(px), Y(py));
}

function drawBlock(ctx, b) {
  const x = X(b.x);
  const y = Y(b.y);
  if (b.kind === 'wall') {
    // A real brick wall: warm tan brick with dark mortar courses and
    // staggered joints, a gold coping along the top edge and a shadow
    // underneath — it reads as a wall, not a flat dark bar.
    const w = SW(b.w);
    const h = b.h;
    ctx.save();
    ctx.fillStyle = '#8a6a48';
    rr(ctx, x, y, w, h, 3);
    ctx.fill();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.strokeStyle = 'rgba(40,26,14,0.6)';
    ctx.lineWidth = 1;
    for (let yy = y + 8; yy < y + h; yy += 8) {
      ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke();
    }
    let row = 0;
    for (let yy = y; yy < y + h; yy += 8, row++) {
      const off = (row % 2) * 8;
      for (let xx = x + off + 16; xx < x + w; xx += 16) {
        ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx, Math.min(yy + 8, y + h)); ctx.stroke();
      }
    }
    ctx.restore();
    ctx.fillStyle = '#f5c542';
    ctx.fillRect(x, y, w, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(x, y + h - 3, w, 3);
  } else if (b.kind === 'pillar') {
    ctx.fillStyle = '#2a2f42';
    rr(ctx, x, y, SW(b.w), b.h, 8);
    ctx.fill();
    ctx.fillStyle = '#4a5170';
    rr(ctx, x + 6, y + 6, SW(b.w) - 12, b.h - 12, 5);
    ctx.fill();
    ctx.fillStyle = '#f5c542';
    ctx.beginPath();
    ctx.arc(x + SW(b.w) / 2, y + b.h / 2, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (b.kind === 'vaultdoor') {
    ctx.fillStyle = '#3a3f52';
    rr(ctx, x, y, SW(b.w), b.h, 6);
    ctx.fill();
    ctx.strokeStyle = '#f5c542';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 4, y + 4, SW(b.w) - 8, b.h - 8);
    ctx.fillStyle = '#f5c542';
    ctx.beginPath();
    ctx.arc(x + SW(b.w) / 2, y + b.h / 2, 7, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = b.kind === 'counter' ? '#33261a' : b.kind === 'crate' ? '#3d2f1e' : '#262b3a';
    rr(ctx, x, y, SW(b.w), b.h, 6);
    ctx.fill();
    ctx.strokeStyle = '#4a5170';
    ctx.lineWidth = 1.5;
    rr(ctx, x, y, SW(b.w), b.h, 6);
    ctx.stroke();
  }
  if (b.label) {
    const ly = b.kind === 'vaultdoor' ? y + b.h + 15 : y + b.h / 2 + 4;
    text(ctx, b.label, x + SW(b.w) / 2, ly, 10, 'rgba(232,230,223,0.75)', 700, 'center');
  }
}

function drawLoot(ctx, S, l) {
  if (l.taken) return;
  const pulse = 1 + Math.sin(S.time * 4 + l.x) * 0.12;
  const cx = X(l.x);
  const cy = Y(l.y);
  const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 58 * pulse);
  glow.addColorStop(0, 'rgba(245,197,66,0.5)');
  glow.addColorStop(1, 'rgba(245,197,66,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, 58 * pulse, 0, Math.PI * 2);
  ctx.fill();
  // Sparkles around the loot — it calls the eye.
  for (let i = 0; i < 4; i++) {
    const a = S.time * 1.5 + i * 1.9 + l.x;
    ctx.globalAlpha = 0.4 + 0.5 * Math.abs(Math.sin(S.time * 2 + i * 2.1));
    ctx.fillStyle = '#fff2c0';
    ctx.fillRect(cx + Math.cos(a) * 34, cy + Math.sin(a) * 30 - 4, 3, 3);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#f5c542';
  ctx.strokeStyle = '#fff2c0';
  ctx.lineWidth = 2;
  if (l.kind === 'diamond') {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 14); ctx.lineTo(cx + 13, cy); ctx.lineTo(cx, cy + 14); ctx.lineTo(cx - 13, cy);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#bff3ff';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 14); ctx.lineTo(cx + 7, cy - 4); ctx.lineTo(cx - 7, cy - 4);
    ctx.closePath(); ctx.fill();
  } else if (l.kind === 'crown') {
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy + 8); ctx.lineTo(cx - 14, cy - 8); ctx.lineTo(cx - 7, cy); ctx.lineTo(cx, cy - 12);
    ctx.lineTo(cx + 7, cy); ctx.lineTo(cx + 14, cy - 8); ctx.lineTo(cx + 14, cy + 8);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff5252';
    ctx.beginPath(); ctx.arc(cx, cy + 1, 3, 0, Math.PI * 2); ctx.fill();
  } else if (l.kind === 'book') {
    rr(ctx, cx - 12, cy - 10, 24, 20, 3); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#7a5a12';
    ctx.beginPath(); ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy + 10); ctx.stroke();
  } else if (l.kind === 'key') {
    ctx.beginPath(); ctx.arc(cx - 6, cy, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillRect(cx, cy - 2, 18, 4);
    ctx.fillRect(cx + 12, cy - 2, 4, 9);
    ctx.fillRect(cx + 18, cy - 2, 4, 7);
  } else {
    ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#7a5a12';
    text(ctx, '$', cx, cy + 4, 11, '#7a5a12', 800, 'center');
  }
  text(ctx, l.name, cx, cy - 26, 14, '#ffe9a8', 800, 'center');
  text(ctx, `$${l.value}`, cx, cy + 30, 12, '#f5c542', 700, 'center');
}

function drawGuard(ctx, S, g) {
  const pts = conePolygon(g.x, g.y, g.angle, g.fov, g.range, S.room.blocks, ROOM_W, ROOM_H);
  drawCone(ctx, pts, coneColor(g.state, g.suspicion));
  // Dashed patrol route — the guard's walk reads at a glance.
  if (g.patrol && g.patrol.length > 1) {
    ctx.strokeStyle = 'rgba(232,230,223,0.35)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(X(g.patrol[0][0]), Y(g.patrol[0][1]));
    for (let i = 1; i < g.patrol.length; i++) ctx.lineTo(X(g.patrol[i][0]), Y(g.patrol[i][1]));
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
  }
  const cx = X(g.x);
  const cy = Y(g.y);
  // Body: navy uniform, gold trim; the dog is a dark hound.
  ctx.fillStyle = g.dog ? '#3a2c22' : '#1d2f5e';
  ctx.beginPath();
  ctx.arc(cx, cy, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = g.dog ? '#c98f4e' : '#f5c542';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = '#e8e6df';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(g.angle) * 18, cy + Math.sin(g.angle) * 18);
  ctx.stroke();
  if (g.dog) {
    ctx.fillStyle = '#c98f4e';
    ctx.beginPath();
    ctx.arc(cx + Math.cos(g.angle) * 14, cy + Math.sin(g.angle) * 14, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Name tag: above the guard when calm, below it when a bubble is up,
  // so the bubble + name never crowd the block above (e.g. KONTER).
  const bubble = g.state === 'suspicious' || g.state === 'investigate' || g.state === 'chase';
  text(ctx, `${g.name} · ${g.role}`, cx, bubble ? cy + 36 : cy - 20, 11, '#e8e6df', 700, 'center');
  // Suspicion bubble: the mark sits ABOVE the words, never on top of them.
  if (g.state === 'suspicious' || g.state === 'investigate') {
    text(ctx, 'APA ITU?', cx, cy - 36, 15, '#ffc93c', 800, 'center');
    text(ctx, '?', cx, cy - 62, 20, '#ffc93c', 800, 'center');
  } else if (g.state === 'chase') {
    text(ctx, '!', cx, cy - 62, 24, '#ff5252', 800, 'center');
    text(ctx, 'BERHENTI!', cx, cy - 36, 15, '#ff5252', 800, 'center');
  }
  if (g.suspicion > 5) {
    const barY = bubble ? cy + 48 : cy + 18;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(cx - 20, barY, 40, 6);
    ctx.fillStyle = g.suspicion > 80 ? '#ff5252' : g.suspicion > 35 ? '#ffc93c' : '#5b8cff';
    ctx.fillRect(cx - 20, barY, 40 * (g.suspicion / 100), 6);
  }
}

function drawCamera(ctx, S, c) {
  const pts = conePolygon(c.x, c.y, c.angle, 0.62, c.range, S.room.blocks, ROOM_W, ROOM_H);
  const hot = c.suspicion > 50;
  drawCone(ctx, pts, { fill: hot ? 'rgba(255,80,80,0.30)' : 'rgba(255,220,120,0.20)', edge: hot ? '#ff5252' : '#ffd878' });
  const cx = X(c.x);
  const cy = Y(c.y);
  ctx.fillStyle = '#2a2f42';
  rr(ctx, cx - 10, cy - 7, 20, 14, 3);
  ctx.fill();
  ctx.fillStyle = Math.floor(S.time * 2) % 2 === 0 ? '#ff5252' : '#7a2020';
  ctx.beginPath();
  ctx.arc(cx + 8, cy - 5, 3, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, 'KAMERA', cx, cy + 24, 9, 'rgba(232,230,223,0.8)', 700, 'center');
}

function drawExit(ctx, S) {
  const e = S.room.exit;
  const locked = S.lockdown > 0;
  const cx = X(e.x + e.w / 2);
  const cy = Y(e.y + e.h / 2);
  const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, 70);
  glow.addColorStop(0, locked ? 'rgba(255,82,82,0.45)' : 'rgba(55,214,122,0.5)');
  glow.addColorStop(1, 'rgba(55,214,122,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = locked ? '#5e1d1d' : '#0d3d22';
  rr(ctx, X(e.x), Y(e.y), SW(e.w), e.h, 6);
  ctx.fill();
  ctx.strokeStyle = locked ? '#ff5252' : '#37d67a';
  ctx.lineWidth = 3;
  rr(ctx, X(e.x), Y(e.y), SW(e.w), e.h, 6);
  ctx.stroke();
  text(ctx, locked ? 'TERKUNCI' : e.label, cx, cy + 5, 13, locked ? '#ff8a8a' : '#7dffab', 800, 'center');
}

function drawPlayer(ctx, S) {
  const p = S.player;
  const cx = X(p.x);
  const cy = Y(p.y);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 10, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#14161f';
  ctx.beginPath();
  ctx.arc(cx, cy, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#f5c542';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Hood point + facing tick.
  ctx.fillStyle = '#f5c542';
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(p.dir) * 11, cy + Math.sin(p.dir) * 11);
  ctx.lineTo(cx + Math.cos(p.dir + 2.6) * 7, cy + Math.sin(p.dir + 2.6) * 7);
  ctx.lineTo(cx + Math.cos(p.dir - 2.6) * 7, cy + Math.sin(p.dir - 2.6) * 7);
  ctx.closePath();
  ctx.fill();
  text(ctx, 'RAKA', cx, cy - 18, 11, '#e8e6df', 700, 'center');
  if (S.playerHidden) text(ctx, 'HIDDEN', cx, cy + 26, 10, '#7dffab', 800, 'center');
  if (p.sneak) text(ctx, 'JONGKOK', cx, cy + 38, 9, '#9aa0b4', 700, 'center');
}

function drawFloats(ctx, S) {
  for (const f of S.floats) {
    ctx.globalAlpha = Math.max(0, 1 - f.t / 1.6);
    text(ctx, f.text, X(f.x), Y(f.y - f.t * 34), 20, f.color, 800, 'center');
  }
  ctx.globalAlpha = 1;
}

function drawCoinRing(ctx, S) {
  if (!S.coinFx) return;
  const r = S.coinFx.t * 130;
  ctx.globalAlpha = Math.max(0, 0.9 - S.coinFx.t);
  ctx.strokeStyle = '#f5c542';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(X(S.coinFx.x), Y(S.coinFx.y), r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  text(ctx, 'DENTING KOIN', X(S.coinFx.x), Y(S.coinFx.y - r - 8), 12, '#ffe9a8', 800, 'center');
}

function bar(ctx, x, y, w, h, frac, color, label, valueText) {
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  rr(ctx, x, y, w, h, 4);
  ctx.fill();
  ctx.fillStyle = color;
  if (frac > 0) { rr(ctx, x, y, Math.max(6, w * frac), h, 4); ctx.fill(); }
  text(ctx, label, x, y - 6, 11, '#e8e6df', 800, 'left');
  if (valueText) text(ctx, valueText, x + w, y - 6, 11, '#e8e6df', 700, 'right');
}

function drawTopBar(ctx, S) {
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(0, 0, VIEW_W, 56);
  ctx.fillStyle = '#f5c542';
  ctx.fillRect(0, 56, VIEW_W, 2);
  text(ctx, 'SUNSET VAULTS', 16, 36, 22, '#f5c542', 800, 'left');
  text(ctx, `${S.room.name}  ·  ${S.room.sub}`, 230, 36, 16, '#e8e6df', 700, 'left');
  text(ctx, `$${S.money}`, 1080, 36, 22, '#7dffab', 800, 'right');
  const totalGot = (S.roomsLootGot || []).reduce((a, b) => a + b, 0);
  const totalAll = ROOMS.reduce((a, r) => a + r.loot.length, 0);
  text(ctx, `HARTA ${totalGot}/${totalAll}`, 1120, 36, 14, '#e8e6df', 700, 'left');
  const mm = String(Math.floor(S.time / 60)).padStart(2, '0');
  const ss = String(Math.floor(S.time % 60)).padStart(2, '0');
  text(ctx, `${mm}:${ss}`, 1240, 36, 14, '#9aa0b4', 700, 'right');
}

function drawLeftPanel(ctx, S) {
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(0, 58, 150, VIEW_H - 58);
  ctx.fillStyle = PALETTE.panelEdge;
  ctx.fillRect(150, 58, 1, VIEW_H - 58);
  let y = 92;
  text(ctx, 'TARGET', 14, y, 13, '#f5c542', 800, 'left');
  y += 22;
  for (const l of S.loot) {
    const short = l.name.length > 22 ? `${l.name.slice(0, 21)}…` : l.name;
    text(ctx, l.taken ? '✓' : '○', 14, y, 14, l.taken ? '#37d67a' : '#9aa0b4', 800, 'left');
    // Shrink the name until it clears the $ value (measured, not guessed).
    let ns = 11;
    ctx.font = `700 ${ns}px system-ui, "Segoe UI", sans-serif`;
    const vw = ctx.measureText(`$${l.value}`).width;
    while (ns > 8 && ctx.measureText(short).width > 138 - 36 - 8 - vw) {
      ns -= 1;
      ctx.font = `700 ${ns}px system-ui, "Segoe UI", sans-serif`;
    }
    text(ctx, short, 36, y, ns, l.taken ? '#7dffab' : '#e8e6df', 700, 'left');
    text(ctx, `$${l.value}`, 138, y, 11, '#f5c542', 700, 'right');
    y += 22;
  }
  y += 6;
  text(ctx, S.allLoot ? '→ KE EXIT HIJAU!' : 'AMBIL SEMUA HARTA', 14, y, 12, S.allLoot ? '#7dffab' : '#ffc93c', 800, 'left');
  y += 34;
  text(ctx, 'GADGET', 14, y, 13, '#f5c542', 800, 'left');
  y += 22;
  text(ctx, `◉ KOIN  ×${S.coins}`, 14, y, 13, '#e8e6df', 700, 'left');
  y += 20;
  text(ctx, 'Klik: lempar koin,', 14, y, 11, '#9aa0b4', 400, 'left');
  y += 16;
  text(ctx, 'penjaga mendekat.', 14, y, 11, '#9aa0b4', 400, 'left');
  y += 30;
  text(ctx, 'GERAK', 14, y, 13, '#f5c542', 800, 'left');
  y += 22;
  for (const line of ['WASD / panah: jalan', 'Shift: jongkok (sulit', '  terlihat, lambat)', 'Semak: jongkok di semak', '  = tersembunyi', 'R: ulangi ruangan']) {
    text(ctx, line, 14, y, 11, '#9aa0b4', 400, 'left');
    y += 16;
  }
  y += 18;
  text(ctx, 'CATATAN', 14, y, 13, '#f5c542', 800, 'left');
  y += 20;
  const log = S.log.slice(-5);
  for (const line of log) {
    text(ctx, line.slice(0, 22), 14, y, 11, '#c9cdd9', 400, 'left');
    y += 16;
  }
}

function drawRightPanel(ctx, S) {
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(1130, 58, 150, VIEW_H - 58);
  ctx.fillStyle = PALETTE.panelEdge;
  ctx.fillRect(1130, 58, 1, VIEW_H - 58);
  let y = 92;
  text(ctx, 'DETECTION', 1144, y, 15, S.detection > 80 ? '#ff5252' : S.detection > 35 ? '#ffc93c' : '#e8e6df', 800, 'left');
  text(ctx, `${S.detection}%`, 1266, y + 26, 34, S.detection > 80 ? '#ff5252' : S.detection > 35 ? '#ffc93c' : '#5b8cff', 800, 'right');
  y += 52;
  bar(ctx, 1144, y + 14, 116, 12, S.detection / 100, S.detection > 80 ? '#ff5252' : S.detection > 35 ? '#ffc93c' : '#5b8cff', '', '');
  y += 34;
  bar(ctx, 1144, y + 14, 116, 12, S.alarm / 100, '#ff5252', 'ALARM', `${Math.round(S.alarm)}%`);
  y += 40;
  bar(ctx, 1144, y + 14, 116, 12, S.visibility, S.visibility > 0.7 ? '#ffc93c' : '#5b8cff', 'VISIBILITY', `${Math.round(S.visibility * 100)}%`);
  y += 40;
  bar(ctx, 1144, y + 14, 116, 12, S.noise, '#f5c542', 'NOISE', `${Math.round(S.noise * 100)}%`);
  y += 44;
  if (S.lockdown > 0) {
    text(ctx, `PINTU TERKUNCI ${Math.ceil(S.lockdown)} dtk`, 1144, y, 12, '#ff5252', 800, 'left');
    y += 24;
  }
  text(ctx, 'PENJAGA', 1144, y, 13, '#f5c542', 800, 'left');
  y += 22;
  for (const g of S.guards) {
    const dot = g.state === 'chase' ? '#ff5252' : g.state === 'patrol' ? '#5b8cff' : '#ffc93c';
    ctx.fillStyle = dot;
    ctx.beginPath();
    ctx.arc(1150, y - 4, 5, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, `${g.name} — ${g.state.toUpperCase()}`, 1162, y, 11, '#e8e6df', 700, 'left');
    y += 20;
  }
  for (const c of S.cameras) {
    ctx.fillStyle = c.suspicion > 50 ? '#ff5252' : '#ffd878';
    ctx.beginPath();
    ctx.arc(1150, y - 4, 5, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, `KAMERA — ${c.suspicion > 50 ? 'MELIHAT!' : 'MENYAPU'}`, 1162, y, 11, '#e8e6df', 700, 'left');
    y += 20;
  }
  y += 12;
  text(ctx, 'LEGENDA', 1144, y, 13, '#f5c542', 800, 'left');
  y += 20;
  for (const [color, label] of [['#5b8cff', 'Tenang'], ['#ffc93c', 'Curiga'], ['#ff5252', 'Alarm'], ['#37d67a', 'EXIT'], ['#f5c542', 'Harta'], ['#5da85a', 'Semak — sembunyi']]) {
    ctx.fillStyle = color;
    ctx.fillRect(1144, y - 10, 12, 12);
    text(ctx, label, 1162, y, 11, '#e8e6df', 700, 'left');
    y += 19;
  }
  // Minimap.
  y += 10;
  text(ctx, 'PETA', 1144, y, 13, '#f5c542', 800, 'left');
  y += 8;
  const mw = 116;
  const mh = 100;
  const sx = mw / ROOM_W;
  const sy = mh / ROOM_H;
  ctx.fillStyle = '#0d0f16';
  ctx.fillRect(1144, y, mw, mh);
  ctx.strokeStyle = '#2c3247';
  ctx.strokeRect(1144, y, mw, mh);
  ctx.fillStyle = '#4a5170';
  for (const b of S.room.blocks) ctx.fillRect(1144 + b.x * sx, y + b.y * sy, Math.max(2, b.w * sx), Math.max(2, b.h * sy));
  ctx.fillStyle = '#2f6b2f';
  for (const b of S.room.bushes) {
    ctx.beginPath();
    ctx.arc(1144 + b.x * sx, y + b.y * sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#37d67a';
  ctx.fillRect(1144 + S.room.exit.x * sx, y + S.room.exit.y * sy, 10, 10);
  for (const l of S.loot) {
    if (l.taken) continue;
    ctx.fillStyle = '#f5c542';
    ctx.beginPath();
    ctx.arc(1144 + l.x * sx, y + l.y * sy, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const g of S.guards) {
    ctx.fillStyle = '#ff5252';
    ctx.beginPath();
    ctx.arc(1144 + g.x * sx, y + g.y * sy, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(1144 + S.player.x * sx, y + S.player.y * sy, 4, 0, Math.PI * 2);
  ctx.fill();
  // The camera's viewport on the minimap — the map is bigger than the frame.
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = 1;
  ctx.strokeRect(1144, y + (S.camY || 0) * sy, mw, ROOM_PX_H * sy);
}

export function drawGame(ctx, S) {
  CAM_Y = S.camY || 0; // every X/Y draw below follows the camera
  ctx.fillStyle = '#07080c';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  drawFloor(ctx, S);
  // Room frame.
  ctx.strokeStyle = PALETTE.wallTop;
  ctx.lineWidth = 4;
  ctx.strokeRect(ROOM_X - 2, ROOM_Y - 2, ROOM_PX_W + 4, ROOM_PX_H + 4);
  if (S.room.ironDoor) {
    ctx.fillStyle = '#3a3f52';
    ctx.fillRect(X(S.room.ironDoor.x), Y(S.room.ironDoor.y), SW(S.room.ironDoor.w), S.room.ironDoor.h);
    ctx.strokeStyle = '#f5c542';
    ctx.lineWidth = 2;
    ctx.strokeRect(X(S.room.ironDoor.x), Y(S.room.ironDoor.y), SW(S.room.ironDoor.w), S.room.ironDoor.h);
  }
  // Lasers under the cones, over the floor.
  for (const lz of S.room.lasers) {
    ctx.strokeStyle = '#ff3c3c';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 6]);
    ctx.beginPath();
    ctx.moveTo(X(lz.x1), Y(lz.y1));
    ctx.lineTo(X(lz.x2), Y(lz.y2));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ff5252';
    ctx.beginPath();
    ctx.arc(X(lz.x1), Y(lz.y1), 5, 0, Math.PI * 2);
    ctx.arc(X(lz.x2), Y(lz.y2), 5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const b of S.room.blocks) drawBlock(ctx, b);
  drawExit(ctx, S);
  for (const l of S.loot) drawLoot(ctx, S, l);
  for (const c of S.cameras) drawCamera(ctx, S, c);
  for (const g of S.guards) drawGuard(ctx, S, g);
  drawPlayer(ctx, S);
  drawCoinRing(ctx, S);
  drawFloats(ctx, S);
  drawTopBar(ctx, S);
  drawLeftPanel(ctx, S);
  drawRightPanel(ctx, S);
}

function overlayPanel(ctx, w, h) {
  ctx.fillStyle = 'rgba(4,5,9,0.45)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = 'rgba(10,12,20,0.95)';
  rr(ctx, (VIEW_W - w) / 2, (VIEW_H - h) / 2, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = '#f5c542';
  ctx.lineWidth = 2;
  rr(ctx, (VIEW_W - w) / 2, (VIEW_H - h) / 2, w, h, 14);
  ctx.stroke();
}

export function drawTitle(ctx, S) {
  ctx.fillStyle = '#07080c';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, '#1a1030');
  g.addColorStop(0.55, '#3d1f2e');
  g.addColorStop(1, '#0d0f16');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Sunset glow + skyline silhouette.
  ctx.fillStyle = 'rgba(255,150,60,0.25)';
  ctx.beginPath();
  ctx.arc(640, 330, 150, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0a0c14';
  for (let i = 0; i < 14; i++) {
    const bw = 60 + ((i * 53) % 50);
    ctx.fillRect(40 + i * 88, 560 - ((i * 67) % 160), bw, 240);
  }
  text(ctx, 'SUNSET VAULTS', 640, 190, 76, '#f5c542', 800, 'center');
  text(ctx, 'One Night, Three Vaults', 640, 238, 30, '#ffe9a8', 700, 'center');
  text(ctx, 'Bank Senja  ·  Raka si pencuri  ·  satu malam, tiga brankas', 640, 272, 17, '#e8e6df', 400, 'center');
  // Three room cards.
  const cards = [
    ['1 · AULA BANK', 'Berlian Senja — $500', 'Enam ruangan, 1 penjaga'],
    ['2 · RUANG BRANKAS', 'Mahkota Ledger — $800', 'Brankas + laser, 2 kamera'],
    ['3 · ATAP & PELARIAN', 'Kunci Master Senja — $1000', 'Parapet, lampu sorot, anjing K-9'],
  ];
  cards.forEach(([title, loot, note], i) => {
    const cx = 250 + i * 270;
    ctx.fillStyle = 'rgba(10,12,20,0.9)';
    rr(ctx, cx, 330, 240, 150, 10);
    ctx.fill();
    ctx.strokeStyle = '#f5c542';
    ctx.lineWidth = 2;
    rr(ctx, cx, 330, 240, 150, 10);
    ctx.stroke();
    text(ctx, title, cx + 120, 368, 17, '#f5c542', 800, 'center');
    text(ctx, loot, cx + 120, 402, 15, '#e8e6df', 700, 'center');
    text(ctx, note, cx + 120, 432, 13, '#9aa0b4', 400, 'center');
    text(ctx, '3 heists · penjaga · harta bernama · gadget', 640, 540, 16, '#c9cdd9', 700, 'center');
  });
  text(ctx, 'WASD jalan · Shift jongkok · Semak = sembunyi · Klik lempar koin · Ambil harta, lalu ke EXIT hijau', 640, 600, 16, '#e8e6df', 400, 'center');
  text(ctx, 'Bonus GHOST +$500 kalau tak pernah ketahuan penuh', 640, 630, 15, '#7dffab', 700, 'center');
  const blink = Math.floor(S.time * 2) % 2 === 0;
  if (blink) text(ctx, '▶  KLIK / TEKAN ENTER UNTUK MULAI', 640, 700, 22, '#ffffff', 800, 'center');
}

export function drawVictory(ctx, S) {
  drawGame(ctx, S);
  const v = S.victory;
  overlayPanel(ctx, 620, 520);
  const cx = VIEW_W / 2;
  const top = (VIEW_H - 520) / 2;
  text(ctx, 'PELARIAN BERHASIL!', cx, top + 70, 40, '#7dffab', 800, 'center');
  text(ctx, 'Raka kabur dari Bank Senja tanpa jejak.', cx, top + 104, 16, '#e8e6df', 400, 'center');
  const rows = [
    ['Harta rampasan', `$${v.loot}`],
    [v.ghost ? 'Bonus GHOST — tak pernah ketahuan' : 'Bonus GHOST — hangus (ketahuan)', v.ghost ? `+$${v.ghost}` : '$0'],
    ['Bonus kecepatan', `+$${v.speed}`],
  ];
  let y = top + 170;
  for (const [label, val] of rows) {
    text(ctx, label, cx - 260, y, 19, '#e8e6df', 700, 'left');
    text(ctx, val, cx + 260, y, 19, '#f5c542', 800, 'right');
    y += 44;
  }
  ctx.fillStyle = '#f5c542';
  ctx.fillRect(cx - 260, y - 8, 520, 2);
  y += 36;
  text(ctx, 'TOTAL', cx - 260, y, 24, '#ffffff', 800, 'left');
  text(ctx, `$${v.total}`, cx + 260, y, 30, '#7dffab', 800, 'right');
  y += 56;
  text(ctx, `Waktu: ${v.timeText}   ·   Harta ${v.lootCount}/${v.lootTotal}`, cx, y, 16, '#9aa0b4', 700, 'center');
  y += 46;
  text(ctx, 'TEKAN R UNTUK MAIN LAGI', cx, y, 18, '#ffffff', 800, 'center');
}

export function drawCaught(ctx, S) {
  drawGame(ctx, S);
  overlayPanel(ctx, 560, 300);
  const cx = VIEW_W / 2;
  const top = (VIEW_H - 300) / 2;
  text(ctx, 'TERTANGKAP!', cx, top + 80, 44, '#ff5252', 800, 'center');
  text(ctx, `${S.caughtBy || 'Penjaga'} menangkap Raka di ${S.room.name}.`, cx, top + 122, 17, '#e8e6df', 400, 'center');
  text(ctx, 'Alarm penuh membuat pintu keluar terkunci.', cx, top + 152, 15, '#9aa0b4', 400, 'center');
  text(ctx, 'TEKAN R UNTUK COBA LAGI', cx, top + 210, 19, '#ffffff', 800, 'center');
}

export { ROOMS };
