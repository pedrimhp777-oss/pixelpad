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
import { gamePage } from './game-page.mjs';
import { startPage } from './start-page.mjs';
import { macrosPage } from './macros-page.mjs';
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
    slots[i] = { n: i + 1, pad, ws, ultimo: null, macro: {}, timers: [], ip: '', desde: Date.now() };
    logLine(`controle P${i + 1} conectado`);
    return slots[i];
  }
  return null;
}

function liberarSlot(slot) {
  if (!slot) return;
  limparMacro(slot);
  if (slot.pad) {
    try { slot.pad.reset(); } catch {}
    try { slot.pad.remove(); } catch {}
  }
  slots[slot.n - 1] = null;
  logLine(`controle P${slot.n} liberado`);
}

const slotsOcupados = () => slots.filter(Boolean).length;

// ---------------- estado + macros ----------------
const ESTADO_ZERO = { a: 0, b: 0, x: 0, y: 0, lb: 0, rb: 0, back: 0, start: 0,
  du: 0, dd: 0, dl: 0, dr: 0, lx: 0, ly: 0, rx: 0, ry: 0, lt: 0, rt: 0 };

/** Junta o que o celular esta mandando com os botoes que a macro esta apertando. */
function enviarEstado(slot) {
  if (!slot || !slot.pad) return;
  const s = Object.assign({}, slot.ultimo || ESTADO_ZERO);
  for (const k in slot.macro) if (slot.macro[k]) s[k] = 1;
  try { slot.pad.update(s); } catch (e) { logLine('pad.update falhou: ' + e.message); }
}

function limparMacro(slot) {
  if (!slot) return;
  for (const t of slot.timers || []) clearTimeout(t);
  slot.timers = [];
  slot.macro = {};
  slot.turbo = false;
}

// Botoes que uma macro pode apertar (os mesmos que o controle virtual tem)
const BOTOES_MACRO = new Set(['a', 'b', 'x', 'y', 'lb', 'rb', 'lt', 'rt', 'ls', 'rs', 'back', 'start',
  'du', 'dd', 'dl', 'dr']);

function normalizarPassos(passos) {
  const lista = [];
  for (const p of (Array.isArray(passos) ? passos : []).slice(0, 40)) {
    if (!p) continue;
    const b = (Array.isArray(p.b) ? p.b : []).filter(x => BOTOES_MACRO.has(x));
    lista.push({ b, ms: Math.max(20, Math.min(3000, (p.ms | 0) || 100)) });
  }
  return lista;
}

/**
 * Executa a sequencia no PC: o tempo do combo nao depende do celular nem do Wi-Fi.
 * Passo com botoes segura eles por ms; passo vazio e pausa.
 * Com turbo, a sequencia recomeca sozinha ate o celular mandar macroStop.
 */
function rodarMacro(slot, passos, turbo) {
  if (!slot || !slot.pad) return;
  const lista = normalizarPassos(passos);
  limparMacro(slot);
  if (!lista.length) { enviarEstado(slot); return; }
  slot.turbo = !!turbo;

  const ciclo = () => {
    let atraso = 0;
    for (const p of lista) {
      if (p.b.length) {
        const bs = p.b;
        slot.timers.push(setTimeout(() => {
          for (const k of bs) slot.macro[k] = 1;
          enviarEstado(slot);
        }, atraso));
        atraso += p.ms;
        slot.timers.push(setTimeout(() => {
          for (const k of bs) slot.macro[k] = 0;
          enviarEstado(slot);
        }, atraso));
      } else {
        atraso += p.ms;   // pausa
      }
    }
    if (slot.turbo) {
      slot.timers.push(setTimeout(() => { if (slot.turbo) ciclo(); }, atraso + 30));
    } else {
      slot.timers.push(setTimeout(() => { slot.macro = {}; enviarEstado(slot); }, atraso + 20));
    }
    if (slot.timers.length > 240) slot.timers = slot.timers.slice(-120);
  };

  ciclo();
  logLine(`P${slot.n} macro: ${lista.length} passo(s)${slot.turbo ? ' (turbo)' : ''}`);
}

/** Soltou o botao: turbo para e limpa o que estava apertado. */
function pararMacro(slot) {
  if (!slot) return;
  limparMacro(slot);
  enviarEstado(slot);
}

// ---------------- backup do layout do celular ----------------
// O layout vive no localStorage do celular, que e amarrado ao endereco do PC.
// Se o IP mudar (ou o cara limpar os dados do app), ele sumiria. Aqui fica uma
// copia no PC: o gamepad manda sempre que salva e puxa de volta se abrir vazio.
const LAYOUTS_FILE = path.join(ROOT, 'data', 'layouts.json');
function lerLayouts() {
  try { return JSON.parse(fs.readFileSync(LAYOUTS_FILE, 'utf8')); } catch { return {}; }
}
function gravarLayouts(o) {
  try {
    fs.mkdirSync(path.dirname(LAYOUTS_FILE), { recursive: true });
    fs.writeFileSync(LAYOUTS_FILE, JSON.stringify(o));
  } catch (e) { logLine('nao consegui salvar o backup do layout: ' + e.message); }
}

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

// ---------------- nome deste PC ----------------
// E o nome que aparece na lista de dispositivos do celular. Sem isso, duas
// maquinas na mesma casa ficariam indistinguiveis (as duas responderiam com o
// hostname do Windows, tipo DESKTOP-XXXX).
const CFGFILE = path.join(DATA, 'config.json');
let CONFIG = {};
try { CONFIG = JSON.parse(fs.readFileSync(CFGFILE, 'utf8')) || {}; } catch {}
let NOME = String(CONFIG.nome || '').trim() || os.hostname();
function salvarNome(v) {
  NOME = String(v || '').replace(/\s+/g, ' ').trim().slice(0, 32) || os.hostname();
  CONFIG.nome = NOME;
  try { fs.writeFileSync(CFGFILE, JSON.stringify(CONFIG, null, 2)); } catch (e) { logLine('nao salvei o nome: ' + e.message); }
  logLine('nome deste PC: ' + NOME);
  return NOME;
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
      nome: NOME,
      ip: lanIP(),
      porta: PORT,
      portaHttps: serverS ? PORT_S : 0,
      token: TOKEN,
      pads: slotsOcupados(),
      max: MAX_PADS,
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

const GAME_PAGE = gamePage({ CSS, SVG });
const START_PAGE = () => startPage({ SVG, nome: NOME, versao: VERSAO });
const MACROS_PAGE = () => macrosPage({ SVG, nome: NOME });

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
  if (u === '/layout') {
    const q = new URL(req.url, 'http://local').searchParams;
    if (q.get('t') !== TOKEN) { res.writeHead(403); return res.end('sem token'); }

    if (req.method === 'POST') {
      let corpo = '';
      req.on('data', c => {
        corpo += c;
        if (corpo.length > 400000) req.destroy();
      });
      req.on('end', () => {
        let dados = null;
        try { dados = JSON.parse(corpo); } catch {}
        if (!dados || typeof dados !== 'object') { res.writeHead(400); return res.end('json invalido'); }
        const id = String(dados.id || 'ultimo').slice(0, 40);
        const todos = lerLayouts();
        todos[id] = { salvo: Date.now(), layouts: dados.layouts || {}, macros: dados.macros || [], perfil: dados.perfil || null };
        todos.ultimo = id;
        gravarLayouts(todos);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end('{"ok":true}');
      });
      return;
    }

    const id = String(q.get('id') || '');
    const todos = lerLayouts();
    const achado = todos[id] || todos[todos.ultimo] || null;
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify(achado || {}));
  }
  if (u === '/inicio' || u === '/start' || u === '/perfis') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(START_PAGE());
  }
  if (u === '/macros' || u === '/macro') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(MACROS_PAGE());
  }
  if (u === '/status') {
    const ip = req.socket.remoteAddress || '';
    const local = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
    if (!local) { res.writeHead(403, { 'Content-Type': 'text/plain' }); return res.end('so local'); }
    const jogadores = slots.filter(Boolean).map(s => ({
      p: s.n, ip: s.ip, desde: s.desde, criado: !!s.pad,
    }));
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({
      nome: NOME, versao: VERSAO, ip: lanIP(), porta: PORT, portaHttps: serverS ? PORT_S : 0,
      jogadores, max: MAX_PADS, driver: !padErro,
    }));
  }
  if (u === '/nome') {
    const ip = req.socket.remoteAddress || '';
    const local = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
    if (!local) { res.writeHead(403, { 'Content-Type': 'text/plain' }); return res.end('so local'); }
    if (req.method === 'POST') {
      let corpo = '';
      req.on('data', c => { corpo += c; if (corpo.length > 4096) req.destroy(); });
      req.on('end', () => {
        let v = '';
        try { v = new URLSearchParams(corpo).get('nome') || ''; } catch {}
        salvarNome(v);
        res.writeHead(303, { Location: '/pair?salvo=1' });
        res.end();
      });
      return;
    }
    const v = new URL(req.url, 'http://local').searchParams.get('nome');
    if (v !== null) salvarNome(v);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({ nome: NOME }));
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
    return res.end(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PixelPad - parear</title>
<style>body{background:#0d0f12;color:#e6e8ec;font-family:system-ui,sans-serif;display:flex;flex-direction:column;
align-items:center;gap:16px;padding:24px 20px 40px}h1{font-size:19px;font-weight:600;margin:0;text-align:center}
pre{font-size:13px;line-height:1.05;background:#111721;padding:18px;border-radius:12px;color:#cdd6e2;margin:0}
b{color:#7db6ff}code{background:#111721;padding:4px 9px;border-radius:6px;font-size:12px;word-break:break-all}
.card{border-top:1px solid #1e2836;padding-top:18px;max-width:460px;text-align:center;color:#8a94a3;font-size:13px;line-height:1.6}
a{color:#7db6ff}
.box{max-width:460px;width:100%;background:#111721;border:1px solid #1e2836;border-radius:14px;padding:16px 18px}
.box h2{font-size:12px;letter-spacing:1.4px;color:#6b7787;margin:0 0 10px;text-transform:uppercase}
form{display:flex;gap:8px;margin:0}
input{flex:1;background:#0d0f12;border:1px solid #253044;color:#e6e8ec;border-radius:9px;padding:10px 12px;font:inherit;font-size:14px;min-width:0}
input:focus{outline:0;border-color:#2f6df6}
button{background:#2f6df6;color:#fff;border:0;border-radius:9px;padding:10px 16px;font:inherit;font-size:13px;font-weight:700}
.vazio{color:#4b5766;font-size:12.5px}
.jog{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #182130;font-size:13px}
.jog:last-child{border:0}
.pt{width:26px;height:26px;border-radius:8px;display:grid;place-items:center;font-weight:900;font-size:11px;color:#fff;background:#2b6df6;flex:none}
.pt.p2{background:#e0453f}
.jog small{color:#6b7787;font-size:11.5px}
.ok{color:#5fd18b}</style></head><body>
<h1>PixelPad &middot; ${NOME.replace(/[<&]/g, c => (c === '<' ? '&lt;' : '&amp;'))}</h1>
${req.url.includes('salvo=1') ? '<p style="margin:0;color:#5fd18b;font-size:13px">Nome salvo.</p>' : ''}

<div class="box">
  <h2>Nome deste PC</h2>
  <form method="POST" action="/nome">
    <input name="nome" value="${NOME.replace(/["<&]/g, c => (c === '"' ? '&quot;' : c === '<' ? '&lt;' : '&amp;'))}" maxlength="32" placeholder="Ex.: PC da sala">
    <button type="submit">Salvar</button>
  </form>
  <p style="margin:10px 0 0;color:#4b5766;font-size:11.5px;line-height:1.5">
    Esse nome aparece no celular na hora de escolher em qual PC conectar.
    Com dois PCs na mesma casa, cada um pode ter o seu.</p>
</div>

<div class="box">
  <h2>Conectados agora</h2>
  <div id="jogs"><p class="vazio">Procurando...</p></div>
</div>

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
  <span style="color:#4b5766;font-size:11px">ele mostra a lista de PCs da rede e voce escolhe em qual conectar</span>
</div>
<div class="card">
  <b>Quer instalar como app na tela inicial?</b><br>
  1. abra <a href="http://${lan}:${PORT}/ca.crt">http://${lan}:${PORT}/ca.crt</a> no celular e instale como <b>CA</b><br>
  2. abra <a href="/app?t=${TOKEN}">/app</a> &middot; 3. menu &rsaquo; <b>Instalar aplicativo</b><br>
  <span style="color:#4b5766;font-size:11px">endereco HTTPS: ${alvoS}</span>
</div>
<p style="color:#4b5766;font-size:11px;margin:0">token ${TOKEN.slice(0, 8)}... &middot; data/token.txt</p>
<script>
function desenhar(j) {
  const alvo = document.getElementById('jogs');
  if (!j.jogadores || !j.jogadores.length) {
    alvo.innerHTML = '<p class="vazio">Nenhum celular conectado.</p>';
    return;
  }
  alvo.innerHTML = j.jogadores.map(function (p) {
    const min = Math.max(0, Math.round((Date.now() - p.desde) / 60000));
    return '<div class="jog"><span class="pt' + (p.p === 2 ? ' p2' : '') + '">P' + p.p + '</span>' +
      '<div><div>' + (p.ip || 'conectado') + '</div>' +
      '<small>' + (min ? 'ha ' + min + ' min' : 'agora') +
      (p.criado ? '' : ' &middot; sem driver') + '</small></div></div>';
  }).join('');
}
function atualizar() {
  fetch('/status', { cache: 'no-store' }).then(function (r) { return r.json(); })
    .then(desenhar).catch(function () {});
}
atualizar();
setInterval(atualizar, 3000);
</script>
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
    slot.ip = ip.replace('::ffff:', '');
    slot.desde = Date.now();
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
      else if (m.t === 'pad') { if (slot) { slot.ultimo = m.d; enviarEstado(slot); } }
      else if (m.t === 'macro') { if (slot) rodarMacro(slot, m.passos, m.turbo); }
      else if (m.t === 'macroStop') { if (slot) pararMacro(slot); }
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
