// Pagina do gamepad (/game).
//
// Cada botao do controle agora e um no independente: da pra arrastar,
// aumentar, diminuir e ocultar um por um. No modo edicao os controles ficam
// translucidos pra voce ver o jogo atras deles.
//
// Macro: no editor voce grava uma sequencia (toque nos botoes na ordem) e ela
// vira um botao novo. Ao apertar, o celular manda a sequencia e o PC executa
// com temporizacao propria - nao depende do tempo do toque no celular.

import { dadosJS } from './presets.mjs';

export function gamePage({ CSS, SVG }) {
  return String.raw`<!doctype html><html lang="pt-BR"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="theme-color" content="#0d0f12">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" href="/icon.svg">
<link rel="apple-touch-icon" href="/icon.svg">
<title>PixelPad</title>
<style>` + CSS + `
  #stage { position: absolute; inset: 0; overflow: hidden; }
  .node { position: absolute; transform-origin: center center; touch-action: none;
    -webkit-user-select: none; user-select: none; }
  .node.sel { outline: 2px dashed #2b6df6; outline-offset: 5px; border-radius: 10px; }
  body.editing .node { opacity: .45; }
  body.editing .node.hid { opacity: .18; }
  body.editing .node.sel { opacity: 1; }
  body.editing .node { cursor: move; }
  body:not(.editing) .node.hid { display: none !important; }

  .btn { width: 20vmin; height: 10vmin; border-radius: 2.4vmin; font-size: 3.2vmin;
    letter-spacing: .2vmin; background: #151b24; color: #cdd6e2; }
  .btn.trig { background: #14202e; }
  .dp { width: 9.6vmin; height: 9.6vmin; border-radius: 2vmin; font-size: 4vmin; background: #151b24; color: #cdd6e2; }
  .face { width: 9.6vmin; height: 9.6vmin; border-radius: 50%; padding: 2.1vmin; }
  .face svg { width: 100%; height: 100%; }
  .face.y { background: #10291d; color: #4de3a0; }
  .face.x { background: #341025; color: #ff7ac8; }
  .face.b { background: #341018; color: #ff6b81; }
  .face.a { background: #101f34; color: #6aa9ff; }
  .sm { width: 14vmin; height: 8vmin; border-radius: 2.2vmin; font-size: 2.6vmin; background: #151b24; color: #cdd6e2; }
  .ps { width: 12vmin; height: 12vmin; border-radius: 50%; font-size: 2.9vmin; background: #1a2432; color: #cdd6e2; }

  .stick { border-radius: 50%; width: 30vmin; height: 30vmin;
    background: radial-gradient(circle, #1b222c 0%, #101620 72%); border: 1px solid #263140; }
  .stick .knob { position: absolute; left: 50%; top: 50%; width: 42%; height: 42%; border-radius: 50%;
    background: #2b6df6; opacity: .7; transform: translate(-50%,-50%); pointer-events: none; }

  .tp { width: 32vmin; height: 15vmin; border-radius: 2.6vmin; background: #121821; border: 1px solid #263140;
    display: flex; align-items: center; justify-content: center; }
  .tp span { font-size: 1.9vmin; letter-spacing: .3vmin; color: #3a4656; text-transform: uppercase; pointer-events: none; }

  .macro { border-radius: 2.4vmin; background: #2a2038; border: 1px solid #6a4a9c; color: #d9c8ff;
    min-width: 18vmin; height: 10vmin; padding: 0 2.4vmin; font-size: 3vmin; letter-spacing: .15vmin;
    font-weight: 700; }
  .macro:active { background: #3d2c53; }

  #hud { position: absolute; top: 1.5vmin; left: 50%; transform: translateX(-50%); display: flex;
    gap: 1.4vmin; z-index: 20; align-items: center; }
  #hud button { padding: 1.2vmin 2.2vmin; border-radius: 1.6vmin; font-size: 2.4vmin; background: #17202b; color: #cdd6e2; }
  #st { font-size: 2.6vmin; font-weight: 800; padding: .6vmin 2vmin; border-radius: 1.2vmin;
    color: #4b5766; letter-spacing: .1vmin; }
  #st.on1 { color: #7db6ff; background: rgba(47,109,246,.18); border: 1px solid #2f6df6; }
  #st.on2 { color: #ff9a92; background: rgba(226,69,60,.18); border: 1px solid #e2453c; }

  #editor { position: absolute; bottom: 0; left: 0; right: 0; display: none; gap: 1.6vmin; padding: 1.8vmin;
    background: #0b1017f2; z-index: 30; align-items: center; justify-content: center; flex-wrap: wrap; }
  #editor button { padding: 1.8vmin 3vmin; border-radius: 2vmin; font-size: 2.8vmin; background: #1b2a3d; color: #cdd6e2; }
  #editor button.on { background: #2b6df6; color: #fff; }
  #editor span { font-size: 2.4vmin; color: #7db6ff; min-width: 18vmin; text-align: center; }
  body.editing #editor { display: flex; }

  #modal { position: absolute; inset: 0; background: #05070af2; z-index: 50; display: none;
    flex-direction: column; align-items: center; justify-content: center; gap: 2.4vmin; padding: 6vmin; }
  #modal.aberto { display: flex; }
  #modal.gravando { background: #05070a55; pointer-events: none; justify-content: flex-start;
    padding-top: 3vmin; gap: 1vmin; }
  #modal.gravando .row { pointer-events: auto; }
  #modal.gravando p, #modal.gravando input { display: none; }
  #modal.gravando h3 { font-size: 3.2vmin; color: #ff8a80; }
  #modal h3 { font-size: 4vmin; color: #e6e8ec; margin: 0; font-weight: 600; }
  #modal p { margin: 0; font-size: 2.8vmin; color: #8a94a3; text-align: center; line-height: 1.6; max-width: 80vmin; }
  #modal input { font-size: 3.4vmin; padding: 2vmin 3vmin; border-radius: 2vmin; border: 1px solid #2b3a4d;
    background: #101620; color: #e6e8ec; text-align: center; width: 60vmin; }
  #modal .row { display: flex; gap: 2vmin; flex-wrap: wrap; justify-content: center; }
  #modal button { padding: 2.2vmin 3.6vmin; border-radius: 2vmin; font-size: 3vmin; background: #1b2a3d; color: #cdd6e2; }
  #modal button.go { background: #2b6df6; color: #fff; }
  #modal button.rec { background: #b8322a; color: #fff; }
  #passos { font-size: 2.6vmin; color: #b9a6ff; text-align: center; line-height: 1.7; word-break: break-word; }

  #rot { display: none; position: absolute; inset: 0; align-items: center; justify-content: center;
    text-align: center; font-size: 5vmin; padding: 10vmin; color: #7db6ff; }
  @media (orientation: portrait) { #stage { display: none; } #rot { display: flex; } }
</style></head><body>
<div id="stage"></div>
<div id="hud">
  <span id="st"></span>
  <button id="bmodo">JOGO</button>
  <button id="bperfis">&#8862;</button>
  <button id="bfull">&#9974;</button>
  <button id="bedit">&#9998; Editar</button>
</div>
<div id="editor">
  <span id="selLabel">toque num controle</span>
  <button id="bminus">&minus;</button>
  <button id="bplus">+</button>
  <button id="beye" title="ocultar/mostrar">&#128065;</button>
  <button id="bdel" title="apagar macro">&#128465;</button>
  <button id="bmacro">+ Macro</button>
  <button id="breset">Resetar</button>
  <button id="bdone">OK</button>
</div>
<div id="modal">
  <h3 id="mTitle">Nova macro</h3>
  <p id="mHint"></p>
  <input id="mName" maxlength="14" placeholder="NOME DO BOTAO">
  <div id="passos"></div>
  <div class="row">
    <button id="mRec" class="rec">&#9679; Gravar</button>
    <button id="mSave" class="go" style="display:none">Salvar</button>
    <button id="mCancel">Cancelar</button>
  </div>
</div>
<div id="rot">Gire o celular<br>para a horizontal</div>
<script>
const SVGS = ` + JSON.stringify(SVG) + `;
` + dadosJS() + `
const st = document.getElementById('st');
const stage = document.getElementById('stage');
const state = {a:0,b:0,x:0,y:0,lb:0,rb:0,back:0,start:0,du:0,dd:0,dl:0,dr:0,
               lx:0,ly:0,rx:0,ry:0,lt:0,rt:0};
let ws, dirty = false, editing = false, selected = null;
let gravando = null;   // { passos:[], t0, btn } durante a gravacao

// ---------------------------------------------------------------- nos do controle
const NOS = [
  { id:'l2', b:'lt', cls:'btn trig', txt:'L2' },
  { id:'l1', b:'lb', cls:'btn', txt:'L1' },
  { id:'r1', b:'rb', cls:'btn', txt:'R1' },
  { id:'r2', b:'rt', cls:'btn trig', txt:'R2' },
  { id:'du', b:'du', cls:'dp', txt:'\u25B2' },
  { id:'dl', b:'dl', cls:'dp', txt:'\u25C0' },
  { id:'dr', b:'dr', cls:'dp', txt:'\u25B6' },
  { id:'dd', b:'dd', cls:'dp', txt:'\u25BC' },
  { id:'y', b:'y', cls:'face y', svg:'triangle' },
  { id:'x', b:'x', cls:'face x', svg:'square' },
  { id:'b', b:'b', cls:'face b', svg:'circle' },
  { id:'a', b:'a', cls:'face a', svg:'cross' },
  { id:'share', b:'back', cls:'sm', txt:'SHARE' },
  { id:'options', b:'start', cls:'sm', txt:'OPTIONS' },
  { id:'ps', b:'start', cls:'ps', txt:'PS' },
  { id:'ls', kind:'stick' },
  { id:'rs', kind:'stick' },
  { id:'tp', kind:'tp' },
];

for (const n of NOS) {
  const el = document.createElement(n.cls && n.cls.indexOf('face') === 0 ? 'button' : (n.kind ? 'div' : 'button'));
  el.className = 'node ' + (n.cls || (n.kind === 'stick' ? 'stick' : 'tp'));
  el.id = n.id;
  el.dataset.id = n.id;
  if (n.kind === 'stick') el.innerHTML = '<div class="knob"></div>';
  else if (n.kind === 'tp') el.innerHTML = '<span>touchpad \u00b7 c\u00e2mera</span>';
  else if (n.svg) el.innerHTML = SVGS[n.svg];
  else el.textContent = n.txt;
  stage.appendChild(el);
  if (n.b) { el.dataset.b = n.b; ligarBotao(el, n.b); }
  else if (n.kind === 'stick') ligarStick(el, n.id);
}

// ---------------------------------------------------------------- layout salvo
const LKEY = 'padLayoutV3';
const PERFIL_KEY = 'pixelpadPerfil';
const DEF = {
  l2:{x:8,y:12,s:1}, l1:{x:8,y:28,s:1},
  r1:{x:92,y:12,s:1}, r2:{x:92,y:28,s:1},
  du:{x:9,y:50,s:1}, dd:{x:9,y:70,s:1}, dl:{x:4.5,y:60,s:1}, dr:{x:13.5,y:60,s:1},
  ls:{x:9,y:87,s:.85}, rs:{x:91,y:87,s:.85},
  y:{x:91,y:44,s:1}, x:{x:86.5,y:54,s:1}, b:{x:95.5,y:54,s:1}, a:{x:91,y:64,s:1},
  tp:{x:50,y:30,s:.9}, share:{x:50,y:92,s:.8}, options:{x:58,y:92,s:.8}, ps:{x:50,y:84,s:.8},
};
// grupos do layout antigo (v1) -> filhos, pra nao perder o que ja foi ajustado
const V1 = {
  lsh:['l2','l1'], rsh:['r1','r2'], abxy:['y','x','b','a'], dpad:['du','dl','dr','dd'],
  cbtn:['share','options'], ls:['ls'], rs:['rs'], tp:['tp'], ps:['ps'],
};

let dados = carregar();
function carregar() {
  let j = null;
  try { j = JSON.parse(localStorage.getItem(LKEY)); } catch (e) {}
  if (j && j.nodes) { if (!j.marca) j.marca = 'ps'; if (!j.modo) j.modo = 'jogo'; return j; }

  // layout da versao anterior: posicoes do usuario viram o "meu layout"
  let v2 = null;
  try { v2 = JSON.parse(localStorage.getItem('padLayoutV2')); } catch (e) {}
  if (v2 && v2.nodes) { v2.marca = 'ps'; v2.estilo = 'meu'; return v2; }

  // migracao do layout antigo
  let antigo = null;
  try { antigo = JSON.parse(localStorage.getItem('padLayoutV1')); } catch (e) {}
  if (antigo) {
    const nodes = {};
    for (const g in V1) {
      const G = antigo[g]; if (!G) continue;
      const filhos = V1[g];
      let cx = 0, cy = 0;
      for (const f of filhos) { cx += DEF[f].x; cy += DEF[f].y; }
      cx /= filhos.length; cy /= filhos.length;
      for (const f of filhos) {
        nodes[f] = { x: G.x + (DEF[f].x - cx), y: G.y + (DEF[f].y - cy), s: G.s || 1, hid: false };
      }
    }
    for (const id in DEF) if (!nodes[id]) nodes[id] = Object.assign({}, DEF[id], { hid: false });
    return { nodes, macros: [], marca: 'ps', estilo: 'meu' };
  }
  const nodes = {};
  for (const id in DEF) nodes[id] = Object.assign({}, DEF[id], { hid: false });
  return { nodes, macros: [], marca: 'ps', estilo: 'meu' };
}

/** Monta as posicoes de um preset e marca o que a marca esconde. */
function montarPreset(marca, estilo) {
  const M = MARCAS[marca] || MARCAS.ps;
  const E = ESTILOS[estilo] || ESTILOS.padrao;
  const nodes = {};
  for (const id in DEF) nodes[id] = { x: DEF[id].x, y: DEF[id].y, s: 1, hid: true };
  for (const id in E.nodes) {
    if (!nodes[id]) continue;
    const v = E.nodes[id];
    nodes[id] = { x: v[0], y: v[1], s: v[2], hid: false };
  }
  for (const id of M.ocultar) if (nodes[id]) nodes[id].hid = true;
  if (nodes.ls && nodes.ls.hid && nodes.rs && nodes.rs.hid) {
    for (const id of ['du', 'dd', 'dl', 'dr', 'y', 'x', 'b', 'a']) {
      if (nodes[id] && !nodes[id].hid) nodes[id].y = Math.min(92, nodes[id].y + 18);
    }
  }
  return nodes;
}

/** Se o usuario escolheu um perfil novo na tela inicial, aplica ele. */
function sincronizarPerfil() {
  let p = null;
  try { p = JSON.parse(localStorage.getItem(PERFIL_KEY)); } catch (e) {}
  if (!p || !p.marca) return;
  const estilo = p.estilo && ESTILOS[p.estilo] ? p.estilo : 'padrao';
  if (!MARCAS[p.marca]) return;
  if (dados.marca === p.marca && dados.estilo === estilo) return;
  dados.nodes = montarPreset(p.marca, estilo);
  dados.marca = p.marca;
  dados.estilo = estilo;
  salvar();
}

/** Simbolos e rotulos dos botoes conforme a marca escolhida. */
function aplicarMarca() {
  const M = MARCAS[dados.marca] || MARCAS.ps;
  const PADRAO_ROT = { l2: 'L2', l1: 'L1', r1: 'R1', r2: 'R2', share: 'SHARE', options: 'OPTIONS', ps: 'PS' };
  for (const id in PADRAO_ROT) {
    const el = document.getElementById(id);
    if (el && !el.querySelector('svg')) el.textContent = (M.rotulos && M.rotulos[id]) || PADRAO_ROT[id];
  }
  for (const id of ['y', 'x', 'b', 'a']) {
    const el = document.getElementById(id);
    if (!el) continue;
    const sym = M.faces[id];
    const novo = SVGS[sym] || sym;
    if (el.dataset.sym !== sym) { el.innerHTML = novo; el.dataset.sym = sym; }
    const c = M.cores[id];
    el.style.background = c ? c[0] : '';
    el.style.color = c ? c[1] : '';
  }
}
function salvar() {
  try {
    localStorage.setItem(LKEY, JSON.stringify(dados));
    if (dados.modo) localStorage.setItem(LKEY + ':' + dados.modo, JSON.stringify(dados));
  } catch (e) {}
}

function aplicar() {
  for (const id in DEF) {
    const el = document.getElementById(id); if (!el) continue;
    const bruto = dados.nodes[id];
    const L = (bruto && typeof bruto.x === 'number' && typeof bruto.y === 'number') ? bruto : DEF[id];
    el.style.left = L.x + '%';
    el.style.top = L.y + '%';
    el.style.transform = 'translate(-50%,-50%) scale(' + (L.s || 1) + ')';
    el.classList.toggle('hid', !!L.hid);
    el.classList.toggle('sel', editing && selected === id);
  }
  for (const m of dados.macros) {
    let el = document.getElementById(m.id);
    if (!el) {
      el = document.createElement('button');
      el.className = 'node macro';
      el.id = m.id;
      el.dataset.id = m.id;
      stage.appendChild(el);
      el.addEventListener('pointerdown', ev => {
        ev.preventDefault();
        if (editing) { selecionar(m.id); return; }
        rodarMacro(m);
      });
    }
    if (el.textContent !== m.label) el.textContent = m.label;
    el.style.left = m.x + '%';
    el.style.top = m.y + '%';
    el.style.transform = 'translate(-50%,-50%) scale(' + (m.s || 1) + ')';
    el.classList.toggle('hid', !!m.hid);
    el.classList.toggle('sel', editing && selected === m.id);
  }
}

// ---------------------------------------------------------------- conexao
function connect() {
  const extra = location.search ? location.search + '&pad=1' : '?pad=1';
  ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws' + extra);
  ws.onopen = () => { if (st.className.indexOf('on') !== 0) st.textContent = ''; };
  ws.onclose = ev => {
    if (ev && ev.code === 4002) { telaLotado(); return; }
    st.textContent = '...';
    setTimeout(connect, 800);
  };
  ws.onerror = () => ws.close();
  ws.onmessage = ev => {
    let m; try { m = JSON.parse(ev.data); } catch { return; }
    if (m.t === 'player') marcarJogador(m.n, m.max);
    if (m.t === 'lotado') telaLotado(m.max || 2);
  };
}

function marcarJogador(n) {
  st.textContent = 'P' + n;
  st.className = n === 1 ? 'on1' : 'on2';
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

function push() { if (ws && ws.readyState === 1) { dirty = false; ws.send(JSON.stringify({ t: 'pad', d: state })); } }
setInterval(() => { if (dirty) push(); }, 16);

function rodarMacro(m) {
  if (!ws || ws.readyState !== 1) return;
  ws.send(JSON.stringify({ t: 'macro', steps: m.steps }));
  if (navigator.vibrate) navigator.vibrate([12, 30, 12]);
}

// ---------------------------------------------------------------- botoes
function pertenceAoEditor(ev) {
  const alvo = ev.target;
  return alvo && (alvo.closest('#editor') || alvo.closest('#hud') || alvo.closest('#modal'));
}

function ligarBotao(el, b) {
  el.addEventListener('pointerdown', ev => {
    if (pertenceAoEditor(ev)) return;
    ev.preventDefault();
    if (editing) { selecionar(el.id); return; }
    if (gravando) { gravando.t0 = performance.now(); gravando.btn = b; el.classList.add('on'); return; }
    state[b] = 1; el.classList.add('on'); push();
    if (navigator.vibrate) navigator.vibrate(8);
  });
  const soltar = ev => {
    if (editing) return;
    if (gravando) {
      if (gravando.btn === b) {
        const ms = Math.max(40, Math.round(performance.now() - gravando.t0));
        gravando.passos.push({ b: b, ms: ms });
        gravando.btn = null;
        atualizarPassos();
        if (navigator.vibrate) navigator.vibrate(14);
        el.classList.remove('on');
      }
      return;
    }
    state[b] = 0; el.classList.remove('on'); push();
  };
  el.addEventListener('pointerup', soltar);
  el.addEventListener('pointercancel', soltar);
  el.addEventListener('pointerleave', soltar);
}

function ligarStick(el, id) {
  const knob = el.querySelector('.knob');
  const chaves = id === 'ls' ? ['lx','ly'] : ['rx','ry'];
  let ativo = null, cx = 0, cy = 0, raio = 1;

  el.addEventListener('pointerdown', ev => {
    if (pertenceAoEditor(ev)) return;
    ev.preventDefault();
    if (editing) { selecionar(el.id); return; }
    ativo = ev.pointerId; el.setPointerCapture(ativo);
    const r = el.getBoundingClientRect();
    cx = r.left + r.width / 2; cy = r.top + r.height / 2; raio = r.width * 0.42;
    mover(ev);
  });
  function mover(ev) {
    if (ativo === null || ev.pointerId !== ativo) return;
    let dx = ev.clientX - cx, dy = ev.clientY - cy;
    const d = Math.hypot(dx, dy);
    if (d > raio) { dx = dx / d * raio; dy = dy / d * raio; }
    state[chaves[0]] = Math.round(dx / raio * 32767);
    state[chaves[1]] = Math.round(-dy / raio * 32767);
    knob.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px))';
    push();
  }
  el.addEventListener('pointermove', mover);
  const soltarStick = () => {
    if (ativo === null) return;
    ativo = null;
    state[chaves[0]] = 0; state[chaves[1]] = 0;
    knob.style.transform = 'translate(-50%,-50%)';
    push();
  };
  el.addEventListener('pointerup', soltarStick);
  el.addEventListener('pointercancel', soltarStick);
}

// ---------------------------------------------------------------- editor
function selecionar(id) {
  selected = id;
  const rotulo = document.getElementById('selLabel');
  const m = dados.macros.find(x => x.id === id);
  rotulo.textContent = m ? ('macro ' + m.label) : id.toUpperCase();
  document.getElementById('bdel').style.display = m ? '' : 'none';
  const L = m || dados.nodes[id];
  document.getElementById('beye').classList.toggle('on', !!(L && L.hid));
  aplicar();
}

function alvoSelecionado() {
  const m = dados.macros.find(x => x.id === selected);
  return m ? m : (selected ? dados.nodes[selected] : null);
}

document.getElementById('bedit').onclick = () => {
  editing = !editing;
  document.body.classList.toggle('editing', editing);
  if (!editing) { selected = null; document.getElementById('bdel').style.display = 'none'; }
  document.getElementById('bedit').textContent = editing ? '\\u2713 OK' : '\\u270E Editar';
  document.getElementById('selLabel').textContent = editing ? 'toque num controle' : '';
  aplicar();
};

document.getElementById('bdone').onclick = () => document.getElementById('bedit').click();

document.getElementById('bminus').onclick = () => {
  const L = alvoSelecionado(); if (!L) return;
  L.s = Math.max(0.35, Math.round(((L.s || 1) - 0.1) * 100) / 100); salvar(); aplicar();
};
document.getElementById('bplus').onclick = () => {
  const L = alvoSelecionado(); if (!L) return;
  L.s = Math.min(3, Math.round(((L.s || 1) + 0.1) * 100) / 100); salvar(); aplicar();
};
document.getElementById('beye').onclick = () => {
  const L = alvoSelecionado(); if (!L) return;
  L.hid = !L.hid; salvar(); selecionar(selected);
};
document.getElementById('bdel').onclick = () => {
  const i = dados.macros.findIndex(x => x.id === selected);
  if (i < 0) return;
  const el = document.getElementById(selected); if (el) el.remove();
  dados.macros.splice(i, 1);
  selected = null; salvar(); aplicar();
  document.getElementById('selLabel').textContent = 'toque num controle';
  document.getElementById('bdel').style.display = 'none';
};
document.getElementById('breset').onclick = () => {
  if (!confirm('Voltar os controles para o lugar de fabrica?')) return;
  dados.nodes = {};
  for (const id in DEF) dados.nodes[id] = Object.assign({}, DEF[id], { hid: false });
  dados.macros = [];
  for (const m of Array.from(stage.querySelectorAll('.macro'))) m.remove();
  selected = null; salvar(); aplicarMarca(); aplicar();
};

// arrastar os nos no modo edicao
let arrastando = null;
stage.addEventListener('pointerdown', ev => {
  if (!editing) return;
  const no = ev.target.closest('.node');
  if (!no) { selected = null; aplicar(); return; }
  selecionar(no.dataset.id);
  const L = alvoSelecionado(); if (!L) return;
  const r = stage.getBoundingClientRect();
  arrastando = { id: no.dataset.id, px: ev.clientX, py: ev.clientY, x0: L.x, y0: L.y, w: r.width, h: r.height, L: L };
  no.setPointerCapture(ev.pointerId);
});
stage.addEventListener('pointermove', ev => {
  if (!arrastando) return;
  const dx = (ev.clientX - arrastando.px) / arrastando.w * 100;
  const dy = (ev.clientY - arrastando.py) / arrastando.h * 100;
  arrastando.L.x = Math.round((arrastando.x0 + dx) * 10) / 10;
  arrastando.L.y = Math.round((arrastando.y0 + dy) * 10) / 10;
  aplicar();
});
stage.addEventListener('pointerup', () => { if (arrastando) { arrastando = null; salvar(); } });
stage.addEventListener('pointercancel', () => { if (arrastando) { arrastando = null; salvar(); } });

// ---------------------------------------------------------------- macro
const modal = document.getElementById('modal');
const mName = document.getElementById('mName');
const mHint = document.getElementById('mHint');
const mTitle = document.getElementById('mTitle');
const mRec = document.getElementById('mRec');
const mSave = document.getElementById('mSave');
const passosEl = document.getElementById('passos');

document.getElementById('bmacro').onclick = () => abrirMacro();

function abrirMacro() {
  gravando = null;
  mTitle.textContent = 'Nova macro';
  mHint.textContent = 'Toque em Gravar e depois aperte os botoes na ordem do combo. O tempo que voce segurar cada um vira o tempo do combo.';
  passosEl.textContent = '';
  mName.value = '';
  mName.style.display = '';
  mRec.style.display = '';
  mRec.textContent = '\u25CF Gravar';
  mSave.style.display = 'none';
  modal.classList.add('aberto');
}

function fecharModal() { modal.classList.remove('aberto'); modal.classList.remove('gravando'); gravando = null; }

document.getElementById('mCancel').onclick = fecharModal;

mRec.onclick = () => {
  if (!gravando) {
    if (editing) { editing = false; document.body.classList.remove('editing'); document.getElementById('bedit').textContent = '\u270E Editar'; aplicar(); }
    gravando = { passos: [], t0: 0, btn: null };
    mTitle.textContent = 'Gravando';
    mHint.textContent = 'Aperte os botoes do controle na ordem do combo. Cada toque conta como um passo.';
    mRec.textContent = '\u25A0 Parar';
    modal.classList.add('gravando');
    passosEl.textContent = 'nenhum passo ainda';
    return;
  }
  // parar
  const passos = gravando.passos.slice();
  gravando = null;
  modal.classList.remove('gravando');
  if (!passos.length) {
    mTitle.textContent = 'Nova macro';
    mHint.textContent = 'Nenhum botao foi apertado. Tente de novo: aperte Gravar e toque nos botoes.';
    mRec.textContent = '\u25CF Gravar';
    passosEl.textContent = '';
    return;
  }
  mTitle.textContent = 'Combo gravado';
  mHint.textContent = 'De um nome pro botao. Depois e so apertar ele no jogo.';
  mRec.style.display = 'none';
  mSave.style.display = '';
  mSave.dataset.passos = JSON.stringify(passos);
  atualizarPassos(passos);
  if (!mName.value) mName.value = 'COMBO';
};

function atualizarPassos(passos) {
  const lista = passos || (gravando && gravando.passos) || [];
  if (!lista.length) { passosEl.textContent = 'nenhum passo ainda'; return; }
  passosEl.textContent = lista.map(function (p, i) { return (i + 1) + '. ' + p.b.toUpperCase() + ' ' + p.ms + 'ms'; }).join('  \u2192  ');
}

mSave.onclick = () => {
  const passos = JSON.parse(mSave.dataset.passos || '[]');
  if (!passos.length) return;
  const id = 'm' + Date.now().toString(36);
  dados.macros.push({
    id: id,
    label: (mName.value || 'MACRO').toUpperCase().slice(0, 14),
    steps: passos,
    x: 50, y: 50, s: 1, hid: false,
  });
  salvar();
  fecharModal();
  aplicar();
  selecionar(id);
  if (!editing) document.getElementById('bedit').click();
};

// ---------------------------------------------------------------- tela cheia
/** Alterna entre o layout de menu (sem analogico) e o de jogo. */
function alternarModo() {
  const novo = dados.modo === 'menu' ? 'jogo' : 'menu';
  salvar();
  const guardado = localStorage.getItem(LKEY + ':' + novo);
  if (guardado) {
    try { dados = JSON.parse(guardado); } catch (e) { dados.modo = novo; }
    dados.modo = novo;
  } else {
    // primeira vez neste modo: copia o atual e esconde/mostra o analogico
    dados = JSON.parse(JSON.stringify(dados));
    dados.modo = novo;
    for (const id of ['ls', 'rs']) if (dados.nodes[id]) dados.nodes[id].hid = (novo === 'menu');
  }
  salvar();
  aplicarMarca();
  aplicar();
  atualizarBotaoModo();
}

function atualizarBotaoModo() {
  const b = document.getElementById('bmodo');
  b.textContent = dados.modo === 'menu' ? 'MENU' : 'JOGO';
  b.classList.toggle('modoMenu', dados.modo === 'menu');
}

document.getElementById('bmodo').onclick = alternarModo;

document.getElementById('bperfis').onclick = () => {
  location.href = '/inicio' + location.search;
};

document.getElementById('bfull').onclick = () => {
  const d = document.documentElement;
  if (!document.fullscreenElement) { (d.requestFullscreen || d.webkitRequestFullscreen || function(){}).call(d); }
  else { (document.exitFullscreen || document.webkitExitFullscreen || function(){}).call(document); }
};

sincronizarPerfil();
aplicarMarca();
aplicar();
atualizarBotaoModo();
// o celular fica em pe na escolha do controle e deita aqui
if (window.PixelPad && PixelPad.tela) { try { PixelPad.tela('paisagem'); } catch (e) {} }
connect();
</script>
</body></html>`;
}
