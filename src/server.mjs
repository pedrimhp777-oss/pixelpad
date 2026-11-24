// Celular como trackpad E gamepad do PC  -  node phone-pad.mjs
//
//   http://<ip-do-pc>:8080/       -> trackpad (mouse)
//   http://<ip-do-pc>:8080/game   -> gamepad (controle PlayStation, deitado, editavel)
//
// O gamepad precisa do bridge rodando em paralelo:
//   python pad-bridge.py

import http from 'node:http';
import https from 'node:https';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dgram from 'node:dgram';
import crypto from 'node:crypto';
import koffi from 'koffi';
import qrcode from 'qrcode-terminal';
import { WebSocketServer } from 'ws';
import { createClient } from './vigem.mjs';
import { ensureCerts } from './certs.mjs';

const LOG = new URL('../phone-pad.log', import.meta.url).pathname.replace(/^\//, '');
const logLine = s => { try { fs.appendFileSync(LOG, `${new Date().toISOString()} ${s}\n`); } catch {} };

const PORT = 8080;
const PORT_S = 8443;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const user32 = koffi.load('user32.dll');
const mouseEvent = user32.func('void mouse_event(uint32 f, int32 dx, int32 dy, uint32 d, void *e)');
const keybdEvent = user32.func('void keybd_event(uint8 vk, uint8 scan, uint32 flags, void *e)');

const MOUSE = { MOVE: 0x0001, LDOWN: 0x0002, LUP: 0x0004, RDOWN: 0x0008, RUP: 0x0010, WHEEL: 0x0800 };
const KEYUP = 0x0002;
const GAIN = 2.4;
let accX = 0, accY = 0;

const udp = null;

// ---------------- controle virtual (ViGEm) ----------------
// ---------------- controles virtuais (ate 2 celulares: P1 e P2) ----------------
const MAX_PADS = 2;
let vi = null;
let padErro = null;
try {
  vi = createClient(path.join(ROOT, 'native', 'ViGEmClient.dll'));
  logLine('ViGEm OK: pronto para criar controles virtuais');
} catch (e) {
  padErro = e.message;
  logLine('ViGEm indisponivel: ' + e.message);
  console.log('\n  [!] Nao consegui falar com o driver ViGEmBus: ' + e.message);
  console.log('      O trackpad continua funcionando; o gamepad nao.\n');
}

// slots[0] = P1, slots[1] = P2. O controle virtual so existe enquanto o
// celular esta conectado - assim o Windows nao mostra controle fantasma.
const slots = new Array(MAX_PADS).fill(null);

function pegarSlot(ws) {
  for (let i = 0; i < MAX_PADS; i++) {
    if (slots[i]) continue;
    let pad = null;
    if (vi) {
      try { pad = vi.addPad(); } catch (e) { logLine(`P${i + 1} falhou: ` + e.message); }
    }
    slots[i] = { n: i + 1, pad, ws };
    logLine(`controle P${i + 1} conectado`);
    return slots[i];
  }
  return null;
}

function liberarSlot(slot) {
  if (!slot) return;
  if (slot.pad) {
    try { slot.pad.reset(); } catch {}
    try { slot.pad.remove(); } catch {}
  }
  slots[slot.n - 1] = null;
  logLine(`controle P${slot.n} liberado`);
}

const slotsOcupados = () => slots.filter(Boolean).length;

const VERSAO = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version; } catch { return '0'; } })();

// ---------------- pareamento ----------------
const DATA = path.join(ROOT, 'data');
try { fs.mkdirSync(DATA, { recursive: true }); } catch {}
const TOKFILE = path.join(DATA, 'token.txt');
let TOKEN = '';
try { TOKEN = fs.readFileSync(TOKFILE, 'utf8').trim(); } catch {}
if (!TOKEN || TOKEN.length < 16) {
  TOKEN = crypto.randomBytes(16).toString('hex');
  try { fs.writeFileSync(TOKFILE, TOKEN); } catch {}
}

process.on('uncaughtException', e => { logLine('CRASH uncaught: ' + (e && e.stack || e)); });
process.on('unhandledRejection', e => { logLine('CRASH rejection: ' + (e && e.stack || e)); });

// ---------------- descoberta na rede local ----------------
// O app Android manda um broadcast e o PC responde com IP, porta e token.
// E o que dispensa QR code e digitacao de endereco dentro do app.
const DISCOVERY_PORT = 9999;
try {
  const disco = dgram.createSocket({ type: 'udp4', reuseAddr: true });
  disco.on('message', (msg, rinfo) => {
    const txt = msg.toString().trim();
    if (!txt.startsWith('PIXELPAD?')) return;
    const resposta = 'PIXELPAD!' + JSON.stringify({
      versao: VERSAO,
      nome: os.hostname(),
      ip: lanIP(),
      porta: PORT,
      portaHttps: serverS ? PORT_S : 0,
      token: TOKEN,
    });
    try { disco.send(resposta, rinfo.port, rinfo.address); } catch {}
  });
  disco.on('error', e => logLine('descoberta: ' + e.message));
  disco.bind(DISCOVERY_PORT, () => logLine('descoberta ativa na udp ' + DISCOVERY_PORT));
} catch (e) {
  logLine('descoberta desativada: ' + e.message);
}

function moveBy(dx, dy) {
  const speed = Math.hypot(dx, dy);
  const gain = GAIN * (1 + Math.min(speed, 40) / 40 * 0.8);
  accX += dx * gain; accY += dy * gain;
  const ix = Math.trunc(accX), iy = Math.trunc(accY);
  if (ix === 0 && iy === 0) return;
  accX -= ix; accY -= iy;
  mouseEvent(MOUSE.MOVE, ix, iy, 0, null);
}
function click(btn) {
  const d = btn === 'r' ? MOUSE.RDOWN : MOUSE.LDOWN;
  const u = btn === 'r' ? MOUSE.RUP : MOUSE.LUP;
  mouseEvent(d, 0, 0, 0, null); mouseEvent(u, 0, 0, 0, null);
}
function scroll(dy) {
  const ticks = Math.round(dy * 0.9);
  if (ticks !== 0) mouseEvent(MOUSE.WHEEL, 0, 0, ((ticks * 120) & 0xffffffff) >>> 0, null);
}
function key(vk) { keybdEvent(vk, 0, 0, null); setTimeout(() => keybdEvent(vk, 0, KEYUP, null), 40); }

const CSS = `
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body { margin: 0; height: 100%; overflow: hidden; background: #0d0f12; color: #e6e8ec;
    font-family: system-ui, -apple-system, sans-serif; touch-action: none; user-select: none;
    -webkit-user-select: none; }
  button { border: 0; font-family: inherit; font-weight: 700; color: #cdd6e2; background: #1b222c; }
  button.on, .on { background: #2b6df6 !important; color: #fff !important; }
`;

// ---------------------------------------------------------------- trackpad
const PAD_PAGE = String.raw`<!doctype html><html lang="pt-BR"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="theme-color" content="#0d0f12"><title>Trackpad</title>
<style>` + CSS + `
  #pad { position: absolute; inset: 0 0 132px 0; display: flex; align-items: center; justify-content: center;
    background: radial-gradient(circle at 50% 40%, #1a1f27, #0d0f12 70%); }
  #pad::after { content: 'touchpad'; position: absolute; bottom: 14px; left: 0; right: 0; text-align: center;
    font-size: 12px; letter-spacing: 3px; color: #2f3944; text-transform: uppercase; }
  #dot { position: absolute; width: 54px; height: 54px; border-radius: 50%; pointer-events: none;
    background: rgba(90,170,255,.18); border: 1px solid rgba(90,170,255,.5); opacity: 0;
    transform: translate(-50%,-50%); transition: opacity .12s; }
  #bar { position: absolute; left: 0; right: 0; bottom: 0; height: 132px; display: grid;
    grid-template-columns: repeat(6, 1fr); gap: 6px; padding: 8px 8px calc(8px + env(safe-area-inset-bottom)); }
  #bar button { border-radius: 14px; font-size: 15px; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 2px; }
  button span.k { font-size: 10px; font-weight: 400; color: #6b7a8d; letter-spacing: .5px; }
  #st { position: absolute; top: 8px; left: 0; right: 0; text-align: center; font-size: 11px; color: #4b5766; }
  .ok { color: #3ddc84 !important; }
  #go { position: absolute; top: 6px; right: 8px; font-size: 12px; padding: 8px 12px; border-radius: 10px;
    background: #14324f; color: #7db6ff; text-decoration: none; z-index: 5; }
</style></head><body>
<a id="go" href="/game">GAMEPAD &rarr;</a>
<script>document.getElementById('go').href = '/game' + location.search;</script>
<div id="pad"><div id="dot"></div><div id="st">conectando...</div></div>
<div id="bar"></div>
<script>
const pad = document.getElementById('pad'), dot = document.getElementById('dot'), st = document.getElementById('st');
const KEYS = [['vol-',0xAE,'volume'],['vol+',0xAF,'volume'],['mudo',0xAD,'audio'],
              ['play',0xB3,'play/pause'],['esc',0x1B,'tecla'],['enter',0x0D,'tecla']];
for (const [label, vk, sub] of KEYS) {
  const b = document.createElement('button');
  b.innerHTML = label + '<span class="k">' + sub + '</span>';
  b.onpointerdown = e => { e.stopPropagation(); send({t:'key',vk}); if (navigator.vibrate) navigator.vibrate(12); };
  document.getElementById('bar').appendChild(b);
}
let ws, points = new Map(), start = null, moved = false, scrollBase = 0;
const WSURL_LINE = '';
function connect() {
  ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws' + location.search);
  ws.onopen = () => { st.textContent = 'conectado'; st.className = 'ok'; };
  ws.onclose = () => { st.textContent = 'reconectando...'; st.className = ''; setTimeout(connect, 800); };
  ws.onerror = () => ws.close();
}
connect();
function send(o) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); }
function centroid() { let x=0,y=0,n=0; for (const p of points.values()) { x+=p.x; y+=p.y; n++; } return n?{x:x/n,y:y/n}:null; }
pad.addEventListener('pointerdown', e => {
  pad.setPointerCapture(e.pointerId);
  points.set(e.pointerId, {x:e.clientX,y:e.clientY});
  if (points.size === 1) { start = {t:Date.now(),x:e.clientX,y:e.clientY}; moved = false;
    dot.style.opacity = 1; dot.style.left = e.clientX+'px'; dot.style.top = e.clientY+'px'; }
  else { const c = centroid(); scrollBase = c ? c.y : 0; }
});
pad.addEventListener('pointermove', e => {
  if (!points.has(e.pointerId)) return;
  const prev = points.get(e.pointerId);
  points.set(e.pointerId, {x:e.clientX,y:e.clientY});
  if (points.size >= 2) { const c = centroid(); if (c) { send({t:'scr',dy:scrollBase-c.y}); scrollBase = c.y; } moved = true; return; }
  if (Math.abs(e.clientX-start.x) > 8 || Math.abs(e.clientY-start.y) > 8) moved = true;
  send({t:'mv',dx:e.clientX-prev.x,dy:e.clientY-prev.y});
  dot.style.left = e.clientX+'px'; dot.style.top = e.clientY+'px';
});
function end(e) {
  if (!points.has(e.pointerId)) return;
  points.delete(e.pointerId);
  if (points.size === 0) {
    dot.style.opacity = 0;
    const dt = Date.now() - start.t;
    if (!moved && dt < 350) { send({t:'clk',b:'l'}); if (navigator.vibrate) navigator.vibrate(15); }
    else if (!moved && dt >= 600) send({t:'clk',b:'r'});
  }
}
pad.addEventListener('pointerup', end);
pad.addEventListener('pointercancel', end);
</script></body></html>`;

// ---------------------------------------------------------------- gamepad
const SVG = {
  triangle: '<svg viewBox="0 0 24 24"><path d="M12 4.5 20 19H4z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/></svg>',
  square: '<svg viewBox="0 0 24 24"><rect x="5.2" y="5.2" width="13.6" height="13.6" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>',
  circle: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.6" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>',
  cross: '<svg viewBox="0 0 24 24"><path d="M6 6 18 18M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
};

const GAME_PAGE = String.raw`<!doctype html><html lang="pt-BR"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="theme-color" content="#0d0f12">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" href="/icon.svg">
<link rel="apple-touch-icon" href="/icon.svg">
<title>Gamepad</title>
<style>` + CSS + `
  #stage { position: absolute; inset: 0; overflow: hidden; }
  .node { position: absolute; transform-origin: center center; }
  .node.sel { outline: 2px dashed #2b6df6; outline-offset: 6px; border-radius: 8px; }

  .sh { display: flex; flex-direction: column; gap: 1.4vmin; }
  .sh button { width: 21vmin; height: 10vmin; border-radius: 2.4vmin; font-size: 3.2vmin; letter-spacing: .2vmin; }
  .sh button.trig { background: #14202e; }

  .stick { border-radius: 50%; width: 30vmin; height: 30vmin;
    background: radial-gradient(circle, #1b222c 0%, #101620 72%); border: 1px solid #263140; touch-action: none; }
  .stick .knob { position: absolute; left: 50%; top: 50%; width: 42%; height: 42%; border-radius: 50%;
    background: #2b6df6; opacity: .7; transform: translate(-50%,-50%); pointer-events: none; }

  #dpad { display: grid; grid-template-columns: repeat(3, 9.6vmin); grid-template-rows: repeat(3, 9.6vmin); gap: .4vmin; }
  #dpad button { border-radius: 2vmin; font-size: 4vmin; background: #151b24; }
  #dpad .sp { visibility: hidden; }

  #abxy { display: grid; grid-template-columns: repeat(3, 10.8vmin); grid-template-rows: repeat(3, 10.8vmin); }
  #abxy button { border-radius: 50%; display: flex; align-items: center; justify-content: center; padding: 1.9vmin; }
  #abxy svg { width: 100%; height: 100%; display: block; }
  #abxy .sp { visibility: hidden; }
  #abxy .y { background: #10291d; color: #4de3a0; }
  #abxy .x { background: #341025; color: #ff7ac8; }
  #abxy .b { background: #341018; color: #ff6b81; }
  #abxy .a { background: #101f34; color: #6aa9ff; }

  #tp { width: 40vmin; height: 24vmin; border-radius: 2.6vmin; background: #121821;
    border: 1px solid #263140; touch-action: none; display: flex; align-items: center; justify-content: center; }
  #tp span { font-size: 2.1vmin; letter-spacing: .4vmin; color: #3a4656; text-transform: uppercase; pointer-events: none; }
  #tp .knob { position: absolute; left: 50%; top: 50%; width: 6vmin; height: 6vmin; border-radius: 50%;
    background: #2b6df6; opacity: .5; transform: translate(-50%,-50%); pointer-events: none; }

  #cbtn { display: flex; gap: 4vmin; }
  #cbtn button { width: 22vmin; height: 11vmin; border-radius: 2.4vmin; font-size: 2.9vmin; }
  #ps { width: 15vmin; height: 15vmin; border-radius: 50%; font-size: 2.9vmin; background: #1a2432; }

  #hud { position: absolute; top: 1.5vmin; left: 50%; transform: translateX(-50%); display: flex;
    gap: 1.6vmin; z-index: 20; }
  #hud button { padding: 1.4vmin 2.4vmin; border-radius: 1.6vmin; font-size: 2.4vmin; background: #17202b; }
  #st { position: absolute; bottom: 1.4vmin; left: 50%; transform: translateX(-50%); font-size: 2.2vmin;
    color: #4b5766; z-index: 6; }
  #editor { position: absolute; bottom: 0; left: 0; right: 0; display: none; gap: 2vmin; padding: 2vmin;
    background: #0b1017ee; z-index: 30; align-items: center; justify-content: center; flex-wrap: wrap; }
  #editor button { padding: 2vmin 3.4vmin; border-radius: 2vmin; font-size: 3vmin; background: #1b2a3d; }
  #editor span { font-size: 2.6vmin; color: #7db6ff; }
  body.editing #editor { display: flex; }
  body.editing .node { cursor: move; }
  #rot { display: none; position: absolute; inset: 0; align-items: center; justify-content: center;
    text-align: center; font-size: 5vmin; padding: 10vmin; color: #7db6ff; }
  @media (orientation: portrait) { #stage { display: none; } #rot { display: flex; } }
</style></head><body>
<div id="stage">
  <div class="node sh" id="lsh" data-move><button class="trig" data-t="lt">L2</button><button data-b="lb">L1</button></div>
  <div class="node sh" id="rsh" data-move><button data-b="rb">R1</button><button class="trig" data-t="rt">R2</button></div>

  <div class="node stick" id="ls" data-move><div class="knob"></div></div>
  <div class="node" id="dpad" data-move>
    <div class="sp"></div><button data-b="du">&#9650;</button><div class="sp"></div>
    <button data-b="dl">&#9664;</button><div class="sp"></div><button data-b="dr">&#9654;</button>
    <div class="sp"></div><button data-b="dd">&#9660;</button><div class="sp"></div>
  </div>

  <div class="node" id="abxy" data-move>
    <div class="sp"></div><button class="y" data-b="y">` + SVG.triangle + `</button><div class="sp"></div>
    <button class="x" data-b="x">` + SVG.square + `</button><div class="sp"></div><button class="b" data-b="b">` + SVG.circle + `</button>
    <div class="sp"></div><button class="a" data-b="a">` + SVG.cross + `</button><div class="sp"></div>
  </div>
  <div class="node stick" id="rs" data-move><div class="knob"></div></div>

  <div class="node" id="tp" data-move><div class="knob"></div><span>touchpad &middot; c&acirc;mera</span></div>
  <div class="node" id="cbtn" data-move><button data-b="back">SHARE</button><button data-b="start">OPTIONS</button></div>
  <div class="node" id="ps" data-move><button data-b="start" style="width:100%;height:100%;border-radius:50%;background:transparent">PS</button></div>

  <div id="hud">
    <button id="bfull">&#9974; Tela cheia</button>
    <button id="bedit">&#9998; Editar</button>
  </div>
  <div id="st"></div>
</div>
<div id="editor">
  <span id="selLabel">toque num controle</span>
  <button id="bminus">&minus;</button>
  <button id="bplus">+</button>
  <button id="breset">Resetar</button>
  <button id="bdone">OK</button>
</div>
<div id="rot">Gire o celular<br>para a horizontal</div>
<script>
const st = document.getElementById('st');
const stage = document.getElementById('stage');
const state = {a:0,b:0,x:0,y:0,lb:0,rb:0,back:0,start:0,du:0,dd:0,dl:0,dr:0,
               lx:0,ly:0,rx:0,ry:0,lt:0,rt:0};
let ws, dirty = false, editing = false, selected = null;

// ---------- layout salvo no celular
const LKEY = 'padLayoutV1';
const DEF = {
  lsh: { x: 10, y: 12, s: 1 }, rsh: { x: 90, y: 12, s: 1 },
  ls:  { x: 20, y: 40, s: 1 }, dpad: { x: 20, y: 76, s: 1 },
  abxy:{ x: 80, y: 40, s: 1 }, rs:  { x: 80, y: 78, s: 1 },
  tp:  { x: 50, y: 30, s: 1 }, cbtn: { x: 50, y: 60, s: 1 }, ps: { x: 50, y: 82, s: 1 },
};
let layout = load();
function load() {
  try { const j = JSON.parse(localStorage.getItem(LKEY)); if (j) return j; } catch (e) {}
  return JSON.parse(JSON.stringify(DEF));
}
function save() { try { localStorage.setItem(LKEY, JSON.stringify(layout)); } catch (e) {} }
function apply() {
  for (const id in layout) {
    const el = document.getElementById(id); if (!el) continue;
    const L = layout[id];
    el.style.left = L.x + '%';
    el.style.top = L.y + '%';
    el.style.transform = 'translate(-50%,-50%) scale(' + L.s + ')';
  }
  for (const id in layout) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('sel', editing && selected === id);
  }
}
apply();

// ---------- conexao
function connect() {
  const extra = location.search ? location.search + '&pad=1' : '?pad=1';
  ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws' + extra);
  ws.onopen = () => { st.textContent = ''; };
  ws.onclose = ev => {
    if (ev && ev.code === 4002) { telaLotado(); return; }
    st.textContent = 'reconectando...';
    setTimeout(connect, 800);
  };
  ws.onerror = () => ws.close();
  ws.onmessage = ev => {
    let m; try { m = JSON.parse(ev.data); } catch { return; }
    if (m.t === 'player') marcarJogador(m.n, m.max);
    if (m.t === 'lotado') telaLotado(m.max || 2);
  };
}

function marcarJogador(n, max) {
  const cor = n === 1 ? '#2f6df6' : '#e2453c';
  st.textContent = 'P' + n;
  st.style.color = cor;
  st.style.background = n === 1 ? 'rgba(47,109,246,.18)' : 'rgba(226,69,60,.18)';
  st.style.border = '1px solid ' + cor;
  st.style.borderRadius = '6px';
  st.style.padding = '2px 8px';
  st.style.fontWeight = '700';
  document.title = 'PixelPad P' + n;
}

function telaLotado(max) {
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;inset:0;background:#0d0f12f2;color:#e6e8ec;display:flex;'
    + 'flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:32px;'
    + 'text-align:center;font-size:15px;z-index:9999';
  d.innerHTML = '<b style="font-size:18px">Ja tem ' + (max || 2) + ' controles conectados</b>'
    + '<span style="color:#8a94a3;font-size:13px;max-width:420px;line-height:1.6">'
    + (max || 2) + ' e o limite: um celular como P1 e outro como P2. '
    + 'Desligue um deles (ou feche o app) e toque aqui.</span>';
  d.onclick = () => location.reload();
  document.body.appendChild(d);
}
connect();
function push() { if (ws && ws.readyState === 1) { dirty = false; ws.send(JSON.stringify({ t: 'pad', d: state })); } }
setInterval(() => { if (dirty) push(); }, 16);

// ---------- botoes
function bindButton(el, key, value) {
  const down = e => {
    e.preventDefault();
    if (editing) { select(el.closest('.node')); return; }
    state[key] = value; el.classList.add('on'); push();
    if (navigator.vibrate) navigator.vibrate(8);
  };
  const up = e => {
    if (e) e.preventDefault();
    if (editing) return;
    state[key] = 0; el.classList.remove('on'); push();
  };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('pointerleave', up);
}
document.querySelectorAll('[data-b]').forEach(el => bindButton(el, el.dataset.b, 1));
document.querySelectorAll('[data-t]').forEach(el => bindButton(el, el.dataset.t, 255));

// ---------- analogicos
function axis(el, xKey, yKey, knobSel) {
  const knob = el.querySelector(knobSel);
  let id = null, cx = 0, cy = 0, R = 1;
  const move = e => {
    let dx = (e.clientX - cx) / R, dy = (e.clientY - cy) / R;
    const m = Math.hypot(dx, dy);
    if (m > 1) { dx /= m; dy /= m; }
    state[xKey] = Math.round(dx * 32767);
    state[yKey] = Math.round(-dy * 32767);
    dirty = true;
    knob.style.transform = 'translate(calc(-50% + ' + (dx * R * 0.55) + 'px), calc(-50% + ' + (dy * R * 0.55) + 'px))';
  };
  el.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (editing) { select(el); return; }
    const r = el.getBoundingClientRect();
    cx = r.left + r.width / 2; cy = r.top + r.height / 2; R = r.width / 2;
    id = e.pointerId; el.setPointerCapture(id); move(e);
  });
  el.addEventListener('pointermove', e => { if (!editing && e.pointerId === id) move(e); });
  const up = e => {
    if (editing || (e && e.pointerId !== id)) return;
    id = null; state[xKey] = 0; state[yKey] = 0; dirty = true;
    knob.style.transform = 'translate(-50%,-50%)';
    push();
  };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
}
axis(document.getElementById('ls'), 'lx', 'ly', '.knob');
axis(document.getElementById('rs'), 'rx', 'ry', '.knob');
axis(document.getElementById('tp'), 'rx', 'ry', '.knob');

// ---------- editor: arrastar e redimensionar
function select(node) {
  if (!node || !node.id) return;
  selected = node.id;
  document.getElementById('selLabel').textContent = node.id;
  apply();
}
stage.querySelectorAll('[data-move]').forEach(node => {
  let dragging = false, offx = 0, offy = 0;
  node.addEventListener('pointerdown', e => {
    if (!editing) return;
    e.preventDefault(); e.stopPropagation();
    select(node);
    const r = stage.getBoundingClientRect();
    const L = layout[node.id];
    const px = L.x / 100 * r.width, py = L.y / 100 * r.height;
    offx = e.clientX - r.left - px;
    offy = e.clientY - r.top - py;
    dragging = true;
    node.setPointerCapture(e.pointerId);
  });
  node.addEventListener('pointermove', e => {
    if (!editing || !dragging) return;
    e.preventDefault();
    const r = stage.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, (e.clientX - r.left - offx) / r.width * 100));
    const y = Math.max(0, Math.min(100, (e.clientY - r.top - offy) / r.height * 100));
    layout[node.id].x = Math.round(x * 10) / 10;
    layout[node.id].y = Math.round(y * 10) / 10;
    apply();
  });
  const stop = () => { if (dragging) { dragging = false; save(); } };
  node.addEventListener('pointerup', stop);
  node.addEventListener('pointercancel', stop);
});

document.getElementById('bedit').onclick = () => {
  editing = !editing;
  document.body.classList.toggle('editing', editing);
  document.getElementById('bedit').textContent = editing ? '\u2714 Pronto' : '\u270E Editar';
  if (!editing) { selected = null; save(); }
  apply();
};
document.getElementById('bdone').onclick = () => document.getElementById('bedit').click();
document.getElementById('bplus').onclick = () => { if (selected) { layout[selected].s = Math.min(2.6, +(layout[selected].s + 0.12).toFixed(2)); apply(); save(); } };
document.getElementById('bminus').onclick = () => { if (selected) { layout[selected].s = Math.max(0.4, +(layout[selected].s - 0.12).toFixed(2)); apply(); save(); } };
document.getElementById('breset').onclick = () => { layout = JSON.parse(JSON.stringify(DEF)); selected = null; apply(); save(); };

// ---------- tela cheia
function goFull() {
  const el = document.documentElement;
  const p = el.requestFullscreen && el.requestFullscreen();
  if (p && p.then) p.then(() => {
    if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
  }).catch(() => {});
}
document.getElementById('bfull').onclick = goFull;
document.addEventListener('pointerdown', () => { if (!document.fullscreenElement) goFull(); }, { once: true });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
</script></body></html>`;

const MANIFEST = JSON.stringify({
  name: 'Gamepad do PC',
  short_name: 'Gamepad',
  start_url: '/game',
  scope: '/',
  display: 'fullscreen',
  orientation: 'landscape',
  background_color: '#0d0f12',
  theme_color: '#0d0f12',
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
});

const SWJS = `self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => e.respondWith(fetch(e.request).catch(() => caches.match(e.request))));`;

const ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">
<rect width="192" height="192" rx="36" fill="#0d0f12"/>
<rect x="30" y="66" width="132" height="60" rx="30" fill="#1b222c" stroke="#2b6df6" stroke-width="4"/>
<circle cx="62" cy="96" r="11" fill="#2b6df6"/>
<circle cx="130" cy="86" r="7" fill="#4de3a0"/>
<circle cx="146" cy="104" r="7" fill="#ff6b81"/>
</svg>`;

function serveFile(res, file, type) {
  try {
    const buf = fs.readFileSync(path.join(ROOT, file));
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(buf);
  } catch (e) {
    res.writeHead(404); res.end('nao encontrado');
  }
}

function handle(req, res) {
  const u = req.url.split('?')[0];
  if (u !== '/favicon.ico') logLine(`${req.socket.remoteAddress} ${req.method} ${u} ua=${(req.headers['user-agent'] || '').slice(0, 60)}`);

  const host = (req.headers.host || '').split(':')[0] || '192.168.3.12';
  const secure = !!req.socket.encrypted;

  // atalho: /app no http redireciona para o mesmo /game no https
  if (u === '/app' && !secure && serverS) {
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    res.writeHead(302, { Location: `https://${host}:${PORT_S}/game${qs}` });
    return res.end();
  }
  if (u === '/app' && secure) {
    res.writeHead(302, { Location: `/game` });
    return res.end();
  }
  if (u === '/pair') {
    const ip = req.socket.remoteAddress || '';
    const local = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
    if (!local) { res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('so local'); }
    const lan = lanIP();
    const alvo = `http://${lan}:${PORT}/game?t=${TOKEN}`;
    const alvoS = `https://${lan}:${PORT_S}/game?t=${TOKEN}`;
    let qr = '';
    qrcode.generate(alvo, { small: true }, q => { qr = q; });
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>PixelPad - parear</title>
<style>body{background:#0d0f12;color:#e6e8ec;font-family:system-ui,sans-serif;display:flex;flex-direction:column;
align-items:center;gap:16px;padding:28px 20px}h1{font-size:19px;font-weight:600;margin:0;text-align:center}
pre{font-size:13px;line-height:1.05;background:#111721;padding:18px;border-radius:12px;color:#cdd6e2;margin:0}
b{color:#7db6ff}code{background:#111721;padding:4px 9px;border-radius:6px;font-size:12px;word-break:break-all}
.card{border-top:1px solid #1e2836;padding-top:18px;max-width:420px;text-align:center;color:#8a94a3;font-size:13px;line-height:1.6}
a{color:#7db6ff}</style></head><body>
<h1>Aponte a camera do celular para o codigo</h1>
${padErro ? `<div style="max-width:460px;text-align:center;background:#3a1d1d;border:1px solid #7d2b2b;color:#ffb4b4;padding:14px 16px;border-radius:10px;font-size:13px;line-height:1.6">
  <b>O gamepad nao vai funcionar ainda.</b><br>
  Falta o driver <b>ViGEmBus</b>, que cria o controle de Xbox virtual.<br>
  <a href="https://github.com/nefarius/ViGEmBus/releases" style="color:#ffd0d0">Baixar o ViGEmBus</a>,\n  instalar, reiniciar o PC e abrir este atalho de novo.<br>
  <span style="color:#c88">trackpad continua funcionando normalmente</span>
</div>` : ''}
<pre>${qr.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre>
<p style="margin:0">mesmo Wi-Fi do PC &middot; <code>${alvo}</code></p>
<div class="card">
  <b>App Android</b> (recomendado, tira o navegador da jogada)<br>
  abra <a href="/android">http://${lan}:${PORT}/android</a> no celular e instale o APK<br>
  <span style="color:#4b5766;font-size:11px">ele acha este PC sozinho na rede, sem QR</span>
</div>
<div class="card">
  <b>Quer instalar como app na tela inicial?</b><br>
  1. abra <a href="http://${lan}:${PORT}/ca.crt">http://${lan}:${PORT}/ca.crt</a> no celular e instale como <b>CA</b><br>
  2. abra <a href="/app?t=${TOKEN}">/app</a> &middot; 3. menu &rsaquo; <b>Instalar aplicativo</b><br>
  <span style="color:#4b5766;font-size:11px">endereco HTTPS: ${alvoS}</span>
</div>
<p style="color:#4b5766;font-size:11px;margin:0">token ${TOKEN.slice(0, 8)}... &middot; data/token.txt</p>
</body></html>`);
  }
  if (u === '/manifest.webmanifest') {
    res.writeHead(200, { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'no-store' });
    return res.end(MANIFEST);
  }
  if (u === '/sw.js') {
    res.writeHead(200, { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-store' });
    return res.end(SWJS);
  }
  if (u === '/android' || u === '/apk' || u === '/app.apk') {
    const apk = path.join(ROOT, 'android', 'pixelpad.apk');
    if (!fs.existsSync(apk)) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end('<meta charset="utf-8"><body style="background:#0d0f12;color:#e6e8ec;font-family:system-ui;padding:32px">Ainda nao existe APK nesta versao.<br>Use a pagina <a style="color:#7db6ff" href="/game">/game</a> no navegador.</body>');
    }
    const buf = fs.readFileSync(apk);
    res.writeHead(200, {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Length': buf.length,
      'Content-Disposition': 'attachment; filename="PixelPad.apk"',
      'Cache-Control': 'no-store',
    });
    return res.end(buf);
  }
  if (u === '/ca.crt' || u === '/ca.ctr' || u === '/cert' || u === '/certificado') {
    return serveFile(res, 'certs/ca.crt', 'application/x-x509-ca-cert');
  }
  if (u === '/icon-192.png') return serveFile(res, 'icon-192.png', 'image/png');
  if (u === '/icon-512.png') return serveFile(res, 'icon-512.png', 'image/png');
  if (u === '/icon.svg' || u === '/favicon.ico') {
    res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
    return res.end(ICON);
  }
  if (u === '/game' || u.startsWith('/game')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(GAME_PAGE);
  }
  if (u === '/' || u === '') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(PAD_PAGE);
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404. Enderecos validos:\n  /            trackpad\n  /game        gamepad\n  /android     app Android (.apk)\n  /app         instalar app (redireciona pro https)\n  /ca.crt      certificado para instalar no celular\n');
}

const server = http.createServer(handle);

let serverS = null;
try {
  const { key, cert } = await ensureCerts(ROOT, lanIP());
  serverS = https.createServer({ key, cert }, handle);
} catch (e) {
  logLine('HTTPS desativado: ' + e.message);
}

function lanIP() {
  for (const list of Object.values(os.networkInterfaces()))
    for (const n of list || []) if (n.family === 'IPv4' && !n.internal) return n.address;
  return '127.0.0.1';
}

const liveClients = new Set();

function onSocket(ws, req) {
  let url;
  try { url = new URL(req.url, 'http://local'); } catch { url = new URL('http://local/'); }
  const ip = req.socket.remoteAddress || '';
  const local = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  if (!local && url.searchParams.get('t') !== TOKEN) {
    logLine(`WS recusado sem token de ${ip}`);
    try { ws.close(4001, 'nao autorizado'); } catch {}
    return;
  }
  logLine(`WS conectado de ${ip}`);
  liveClients.add(ws);

  // so a pagina do gamepad pede um controle (a do trackpad nao consome vaga)
  const querControle = url.searchParams.get('pad') === '1';
  let slot = null;
  if (querControle) {
    slot = pegarSlot(ws);
    if (!slot) {
      try { ws.send(JSON.stringify({ t: 'lotado', max: MAX_PADS })); } catch {}
      logLine(`recusado: ${MAX_PADS} controles ja conectados (${ip})`);
      setTimeout(() => { try { ws.close(4002, 'lotado'); } catch {} }, 200);
      liveClients.delete(ws);
      return;
    }
    try { ws.send(JSON.stringify({ t: 'player', n: slot.n, max: MAX_PADS })); } catch {}
  }

  ws.on('close', () => {
    liveClients.delete(ws);
    liberarSlot(slot);
    logLine(`WS desconectado (${liveClients.size} ativo, ${slotsOcupados()} controle(s))`);
  });
  ws.on('error', e => logLine('ws erro: ' + e.message));
  ws.on('message', raw => {
    try {
      let m; try { m = JSON.parse(raw); } catch { return; }
      if (m.t === 'mv') moveBy(m.dx, m.dy);
      else if (m.t === 'clk') click(m.b);
      else if (m.t === 'scr') scroll(m.dy);
      else if (m.t === 'key') key(m.vk);
      else if (m.t === 'pad') { if (slot && slot.pad) slot.pad.update(m.d); }
    } catch (e) { logLine('erro no handler: ' + (e && e.message)); }
  });
}
new WebSocketServer({ server }).on('connection', onSocket);
if (serverS) new WebSocketServer({ server: serverS }).on('connection', onSocket);
if (serverS) serverS.listen(PORT_S, '0.0.0.0');

server.on('error', e => {
  if (e.code === 'EADDRINUSE') {
    console.log('\n  O PixelPad ja esta rodando nesta maquina. Abra http://127.0.0.1:8080/pair\n');
    process.exit(0);
  }
  logLine('server erro: ' + e.message);
  console.error(e);
  process.exit(1);
});

server.listen(PORT, '0.0.0.0', () => {
  const lan = lanIP();
  console.log('\n  ============================================================');
  console.log(`     Trackpad:  http://${lan}:${PORT}`);
  console.log(`     Gamepad :  http://${lan}:${PORT}/game`);
  if (serverS) console.log(`     Gamepad HTTPS (para instalar como app):  https://${lan}:${PORT_S}/game`);
  console.log('  ============================================================\n');
  console.log('  Certificado da CA para instalar no celular:');
  console.log(`     http://${lan}:${PORT}/ca.crt\n`);
  const alvo = `http://${lan}:${PORT}/game?t=${TOKEN}`;
  console.log('  Escaneie com a camera do celular (ja vem com o codigo de pareamento):\n');
  qrcode.generate(alvo, { small: true }, q => console.log(q));
  console.log(`\n  Link direto: ${alvo}`);
  console.log('  O QR carrega o token. Quem nao tiver o token nao controla o PC.');
  console.log('  Token salvo em data/token.txt (apague para gerar outro).');
  console.log('  Pagina de pareamento: http://127.0.0.1:8080/pair\n');
  logLine(`servidor iniciado | http ${lan}:${PORT} | https ${serverS ? lan + ':' + PORT_S : 'off'}`);
});
