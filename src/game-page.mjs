// Pagina do gamepad (/game).
//
// Cada botao do controle e um no independente: da pra arrastar, aumentar,
// diminuir e ocultar um por um. No modo edicao os controles ficam translucidos
// pra voce ver o jogo atras deles. A barra do editor fica no canto de cima.
//
// Macro: os botoes vem da tela /macros (configurada na tela inicial). Cada macro
// vira um botao extra aqui, em todos os estilos, e quem executa a sequencia e o
// PC - o tempo do combo nao depende do celular.

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
  #stage { position: absolute; inset: 0; overflow: hidden; touch-action: none; }
  .node { position: absolute; transform-origin: center center; touch-action: none;
    -webkit-user-select: none; user-select: none; }
  .node.sel { outline: 2px dashed #2b6df6; outline-offset: 5px; border-radius: 10px; }
  body.editing .node { opacity: .45; }
  body.editing .node.hid { opacity: .18; }
  body.editing .node.sel { opacity: 1; }
  body.editing .node { cursor: move; }
  body:not(.editing) .node.hid { display: none !important; }

  .btn { width: 22.5vmin; height: 11.2vmin; border-radius: 2.6vmin; font-size: 3.6vmin;
    letter-spacing: .2vmin; background: #151b24; color: #cdd6e2; }
  .btn.trig { background: #14202e; }
  .dp { width: 11vmin; height: 11vmin; border-radius: 2.2vmin; font-size: 4.6vmin; background: #151b24; color: #cdd6e2; }
  .face { width: 10.5vmin; height: 10.5vmin; border-radius: 50%; padding: 2.4vmin; }
  .face svg { width: 100%; height: 100%; }
  .face.y { background: #10291d; color: #4de3a0; }
  .face.x { background: #341025; color: #ff7ac8; }
  .face.b { background: #341018; color: #ff6b81; }
  .face.a { background: #101f34; color: #6aa9ff; }
  .sm { width: 15.5vmin; height: 9vmin; border-radius: 2.4vmin; font-size: 2.9vmin; background: #151b24; color: #cdd6e2; }
  .ps { width: 13.5vmin; height: 13.5vmin; border-radius: 50%; font-size: 3.2vmin; background: #1a2432; color: #cdd6e2; }

  .stick { border-radius: 50%; width: 32vmin; height: 32vmin;
    background: radial-gradient(circle, #1b222c 0%, #101620 72%); border: 1px solid #263140; }
  .stick .knob { position: absolute; left: 50%; top: 50%; width: 42%; height: 42%; border-radius: 50%;
    background: #2b6df6; opacity: .7; transform: translate(-50%,-50%); pointer-events: none; }

  .tp { width: 32vmin; height: 15vmin; border-radius: 2.6vmin; background: #121821; border: 1px solid #263140;
    display: flex; align-items: center; justify-content: center; }
  .tp span { font-size: 1.9vmin; letter-spacing: .3vmin; color: #3a4656; text-transform: uppercase; pointer-events: none; }

  .macro { width: 12vmin; height: 12vmin; border-radius: 50%; background: #2a2038; border: 1px solid #6a4a9c;
    color: #e6d9ff; display: grid; place-items: center; padding: 0; font-size: 5.2vmin; line-height: 1; }
  .macro.txt { font-size: 2.5vmin; font-weight: 800; letter-spacing: .1vmin; }
  .macro:active, .macro.on { background: #3d2c53; box-shadow: 0 0 0 2px #6a4a9c inset; }

  #hud { position: absolute; top: 1.5vmin; left: 50%; transform: translateX(-50%); display: flex;
    gap: 1.4vmin; z-index: 20; align-items: center; }
  #hud button { padding: 1.2vmin 2.2vmin; border-radius: 1.6vmin; font-size: 2.4vmin; background: #17202b; color: #cdd6e2; }
  #bperfis { display: grid; place-items: center; padding: 1.2vmin 2.1vmin !important; font-size: 3.9vmin !important; }
  #bperfis svg { width: 1em; height: 1em; display: block; }
  #st { font-size: 2.6vmin; font-weight: 800; padding: .6vmin 2vmin; border-radius: 1.2vmin;
    color: #4b5766; letter-spacing: .1vmin; }
  #st.on1 { color: #7db6ff; background: rgba(47,109,246,.18); border: 1px solid #2f6df6; }
  #st.on2 { color: #ff9a92; background: rgba(226,69,60,.18); border: 1px solid #e2453c; }

  #editor { position: absolute; top: 1.4vmin; left: 1.4vmin; display: none; gap: .8vmin; padding: 1vmin;
    background: #0b1017f2; border: 1px solid #1e2a3a; border-radius: 2vmin; z-index: 30; align-items: center; }
  #editor button { padding: 1.1vmin 1.8vmin; border-radius: 1.4vmin; font-size: 2.5vmin; background: #1b2a3d;
    color: #cdd6e2; min-width: 6.4vmin; }
  #editor button.on { background: #2b6df6; color: #fff; }
  body.editing #editor { display: flex; }

  #confirma, #ajustes { position: absolute; inset: 0; background: rgba(5,7,10,.72); display: none; z-index: 60;
    align-items: center; justify-content: center; }
  #confirma.aberto, #ajustes.aberto { display: flex; }
  #confirma .caixa, #ajustes .caixa { background: #171e2a; border: 1px solid #232f40; border-radius: 3vmin;
    padding: 3.6vmin 4vmin 2.8vmin; max-width: 92vmin; box-shadow: 0 3vmin 9vmin rgba(0,0,0,.65); }
  #confirma h3, #ajustes h3 { margin: 0 0 1.2vmin; font-size: 3.4vmin; font-weight: 800; }
  #confirma p, #ajustes p { margin: 0 0 2.8vmin; font-size: 2.7vmin; line-height: 1.5; color: #97a3b4; }
  #confirma .botoes, #ajustes .botoes { display: flex; gap: 1.8vmin; }
  #confirma button, #ajustes button { flex: 1; padding: 2.2vmin 3vmin; border-radius: 2vmin; border: 0;
    font-size: 3vmin; font-weight: 700; }
  #cCancelar { background: #101620; color: #97a3b4; border: 1px solid #232f40; }
  #cAcao { background: #2b6df6; color: #fff; }
  /* ajustes do toque: um par de botoes que mostra o escolhido */
  #ajustes .seg { display: flex; gap: 1.2vmin; margin: 0 0 2vmin; }
  #ajustes .seg button { background: #101620; color: #97a3b4; border: 1px solid #232f40; }
  #ajustes .seg button.on { background: #2b6df6; color: #fff; border-color: #2b6df6; }
  #ajustes .dica { font-size: 2.3vmin !important; color: #6f7b8c !important; margin-bottom: 2.4vmin !important; }
  #aFechar { background: #2b6df6; color: #fff; }

  #rot { display: none; position: absolute; inset: 0; align-items: center; justify-content: center;
    text-align: center; font-size: 5vmin; padding: 10vmin; color: #7db6ff; }

  /* telas menos largas (tablet, 16:10, 4:3): encolhe um pouco pra nao encostar na borda */
  @media (max-aspect-ratio: 19/10) {
    .btn { width: 20vmin; height: 10.2vmin; font-size: 3.3vmin; }
    .dp { width: 9.8vmin; height: 9.8vmin; font-size: 4.2vmin; }
    .face { width: 9.6vmin; height: 9.6vmin; padding: 2.2vmin; }
    .sm { width: 14.4vmin; height: 8.2vmin; font-size: 2.7vmin; }
    .ps { width: 12.4vmin; height: 12.4vmin; font-size: 3vmin; }
    .macro { width: 11vmin; height: 11vmin; font-size: 4.8vmin; }
    .stick { width: 29vmin; height: 29vmin; }
  }
  /* fica em pe: mostra o aviso de girar (a classe vem do JS, mais confiavel que a
     media query quando o WebView roda em tela que acabou de girar) */
  @media (orientation: portrait) { #stage { display: none; } #rot { display: flex; } }
  body.retrato #stage { display: none; }
  body.retrato #rot { display: flex; }
</style></head><body>
<div id="stage"></div>
<div id="hud">
  <span id="st"></span>
  <button id="bmodo">JOGO</button>
  <button id="bperfis" title="Início"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M4 11.2 12 4.4l8 6.8V19a1.2 1.2 0 0 1-1.2 1.2h-4V14h-5.6v6.2h-4A1.2 1.2 0 0 1 4 19z"/></svg></button>
  <button id="bedit">&#9998; Editar</button>
</div>
<div id="editor">
  <button id="bminus" title="diminuir">&minus;</button>
  <button id="bplus" title="aumentar">+</button>
  <button id="beye" title="ocultar/mostrar">&#128065;</button>
  <button id="breset" title="voltar ao lugar de fábrica">&#8635;</button>
  <button id="bcfg" title="ajustes do toque">&#9881;</button>
  <button id="bdone" title="sair do editor">&#10003;</button>
</div>
<div id="ajustes">
  <div class="caixa">
    <h3>Ajustes do toque</h3>
    <p style="margin-bottom:1.2vmin">Analógico</p>
    <div class="seg">
      <button id="aFixo">Fixo</button>
      <button id="aDinamico">Dinâmico</button>
    </div>
    <p class="dica"><b>Fixo</b>: o analógico fica onde você colocou no editor.<br>
      <b>Dinâmico</b>: ele nasce onde o dedo tocar (metade de baixo da tela) e acompanha o dedo.</p>
    <div class="botoes"><button id="aFechar">Fechar</button></div>
  </div>
</div>
<div id="confirma">
  <div class="caixa">
    <h3>Voltar ao padrão?</h3>
    <p>Os botões voltam pro lugar de fábrica. Suas macros continuam salvas.</p>
    <div class="botoes">
      <button id="cCancelar">Cancelar</button>
      <button id="cAcao">Voltar</button>
    </div>
  </div>
</div>
<div id="rot">Gire o celular<br>para a horizontal</div>
<script>
const SVGS = ` + JSON.stringify(SVG) + `;
` + dadosJS() + `
const st = document.getElementById('st');
const stage = document.getElementById('stage');
const state = {a:0,b:0,x:0,y:0,lb:0,rb:0,ls:0,rs:0,back:0,start:0,du:0,dd:0,dl:0,dr:0,
               lx:0,ly:0,rx:0,ry:0,lt:0,rt:0};
let ws, editing = false, selected = null, selecionados = [];
let macros = [];   // vem de pixelpadMacros, configuradas em /macros

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
  { id:'l3', b:'ls', cls:'sm', txt:'L3' },
  { id:'r3', b:'rs', cls:'sm', txt:'R3' },
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
  if (n.b) el.dataset.b = n.b;
  stage.appendChild(el);
}

// ---------------------------------------------------------------- layout salvo
// Cada estilo (PlayStation/Xbox/Nintendo) tem o SEU layout, e cada modo
// (menu/jogo) tambem. A chave junta os dois: padLayoutV4:ps:menu
const LKEY = 'padLayoutV4';
const APARELHO_KEY = 'pixelpadAparelho';
const chaveLayout = (marca, modo) => LKEY + ':' + (MARCAS[marca] ? marca : 'ps') + ':' + (modo === 'jogo' ? 'jogo' : 'menu');
/** Todas as chaves de layout salvas (pra backup no PC). */
function keysLayout() {
  const out = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.indexOf(LKEY + ':') === 0) out.push(k);
    }
  } catch (e) {}
  return out;
}
const PERFIL_KEY = 'pixelpadPerfil';
const MACROS_KEY = 'pixelpadMacros';
// Layout de fabrica. Sao DOIS: o do modo MENU (sem analogico) e o do modo JOGO
// (com analogico). Os numeros vem do aparelho do autor, arrumados botao por botao,
// e valem pra todo celular. Ficam espelhados em src/presets.mjs (ESTILOS.padrao).
const DEF = {
  l1:{x:8,y:11,s:1}, l2:{x:8.1,y:25.8,s:1}, r1:{x:92,y:11,s:1}, r2:{x:92,y:25,s:1},
  du:{x:12.6,y:61.7,s:1.2}, dd:{x:12.6,y:89.3,s:1.2}, dl:{x:6.8,y:75.4,s:1.2}, dr:{x:18.4,y:75.4,s:1.2},
  ls:{x:29.3,y:49.4,s:0.8}, rs:{x:65.8,y:47.4,s:0.8}, y:{x:87.4,y:58,s:1.6}, x:{x:80.5,y:71.9,s:1.5},
  b:{x:94.2,y:73,s:1.5}, a:{x:87.2,y:87,s:1.5}, l3:{x:19,y:10.1,s:1.25}, r3:{x:80.7,y:10.8,s:1.25},
  tp:{x:66.2,y:19.1,s:0.9}, share:{x:40.2,y:92.2,s:0.8}, options:{x:55.7,y:91.2,s:0.8}, ps:{x:48.4,y:88.3,s:0.8},
};
const DEF_JOGO = {
  l1:{x:8.1,y:10.8,s:1}, l2:{x:8,y:25,s:1}, r1:{x:92,y:11,s:1}, r2:{x:92,y:25,s:1},
  du:{x:25.5,y:31.8,s:1.1}, dd:{x:25.5,y:57.1,s:1.1}, dl:{x:20.2,y:44.4,s:1.1}, dr:{x:30.8,y:44.4,s:1.1},
  ls:{x:11.9,y:81.2,s:1.1}, rs:{x:67.4,y:44.1,s:0.8}, y:{x:85.6,y:57.7,s:1.5}, x:{x:79.2,y:71.4,s:1.5},
  b:{x:93.5,y:70.5,s:1.5}, a:{x:86,y:87.2,s:1.6}, l3:{x:19.1,y:10.7,s:1.25}, r3:{x:81.5,y:11.4,s:1.15},
  tp:{x:68.6,y:11.5,s:0.9}, share:{x:42,y:91.1,s:0.8}, options:{x:57.6,y:90.7,s:0.8}, ps:{x:50.2,y:87.4,s:0.8},
};

// ------------------------------------------------------- backup no PC
// O layout mora no localStorage, que esta amarrado ao endereco do PC
// (http://192.168.x.x:8080). Se o IP mudar, o navegador considera outro site e o
// layout "desaparece". Por isso o gamepad manda uma copia pro PC a cada
// alteracao e, quando abre sem nada salvo, puxa a copia de volta.
function idAparelho() {
  let id = null;
  try { id = localStorage.getItem(APARELHO_KEY); } catch (e) {}
  if (!id) {
    id = 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    try { localStorage.setItem(APARELHO_KEY, id); } catch (e) {}
  }
  return id;
}

function tokenUrl() {
  try { return new URLSearchParams(location.search).get('t') || ''; } catch (e) { return ''; }
}

let enviarTimer = null;
function enviarBackup() {
  if (enviarTimer) clearTimeout(enviarTimer);
  enviarTimer = setTimeout(function () {
    enviarTimer = null;
    try {
      const corpo = JSON.stringify({
        id: idAparelho(),
        perfil: localStorage.getItem(PERFIL_KEY),
        layouts: (function () {
          const o = {};
          for (const k of keysLayout()) o[k] = localStorage.getItem(k);
          return o;
        })(),
        macros: localStorage.getItem(MACROS_KEY) || '[]',
      });
      fetch('/layout?t=' + encodeURIComponent(tokenUrl()), { method: 'POST', body: corpo });
    } catch (e) {}
  }, 700);
}

/** Abriu sem layout salvo (IP novo, cache limpo, celular novo): puxa do PC. */
function puxarBackup() {
  const vazio = keysLayout().length === 0;
  if (!vazio) return;
  let jaTentei = null;
  try { jaTentei = sessionStorage.getItem('pixelpadTenteiBackup'); } catch (e) {}
  if (jaTentei) return;
  try { sessionStorage.setItem('pixelpadTenteiBackup', '1'); } catch (e) {}
  fetch('/layout?t=' + encodeURIComponent(tokenUrl()) + '&id=' + encodeURIComponent(idAparelho()))
    .then(r => r.json())
    .then(function (d) {
      if (!d || !d.layouts) return;
      let achou = false;
      try {
        for (const k in d.layouts) {
          if (k.indexOf(LKEY + ':') !== 0 || typeof d.layouts[k] !== 'string') continue;
          localStorage.setItem(k, d.layouts[k]);
          achou = true;
        }
        if (d.macros && d.macros.length > 2) localStorage.setItem(MACROS_KEY, d.macros);
      } catch (e) {}
      if (achou) location.reload();
    })
    .catch(function () {});
}

/** Identidade de um layout: serve pra saber se o usuario mexeu ou esta de fabrica. */
function assinatura(nodes) {
  const ids = Object.keys(nodes || {}).sort();
  let t = '';
  for (const id of ids) {
    const L = nodes[id];
    if (!L || typeof L.x !== 'number') continue;
    t += id + ':' + Math.round(L.x * 10) + ',' + Math.round(L.y * 10) + ',' +
      Math.round((L.s || 1) * 100) + (L.hid ? 'h' : '') + '|';
  }
  return t;
}

/** Marca o layout atual como "de fabrica" (usado antes de qualquer arrasto). */
function marcarBase() { dados.base = assinatura(dados.nodes); }

/**
 * true se o layout salvo ainda e o de fabrica (ninguem arrastou nada).
 * Serve pra migracao saber se pode trocar: layout que o usuario arrumou NUNCA
 * e sobrescrito, mesmo quando sai versao nova com posicoes diferentes.
 */
function podeMigrar(nodes) {
  if (!dados.base) return false;       // veio de versao antiga: nao da pra saber, preserva
  return assinatura(nodes) === dados.base;
}

/** Monta o layout de fabrica do modo pedido (no MENU o analogico nao existe). */
function nosDoModo(modo) {
  const base = modo === 'jogo' ? DEF_JOGO : DEF;
  const nodes = {};
  for (const id in DEF) {
    const B = base[id] || DEF[id];
    nodes[id] = { x: B.x, y: B.y, s: B.s || 1, hid: false };
  }
  if (modo === 'menu') for (const id of ['ls', 'rs']) nodes[id].hid = true;
  return nodes;
}
// grupos do layout antigo (v1) -> filhos, pra nao perder o que ja foi ajustado
const V1 = {
  lsh:['l2','l1'], rsh:['r1','r2'], abxy:['y','x','b','a'], dpad:['du','dl','dr','dd'],
  cbtn:['share','options'], ls:['ls'], rs:['rs'], tp:['tp'], ps:['ps'],
};

/**
 * L3/R3 nasceram (0.15) embaixo, do lado dos analogicos. Depois eles passaram
 * pro canto de cima, ao lado de L1/R1 - e esse e o padrao de todo mundo agora,
 * nos tres estilos e nos dois modos. Aqui a gente move SO quem ainda esta na
 * posicao antiga de fabrica: L3/R3 que o usuario arrastou nao sao tocados.
 */
const L3R3_VELHOS = {
  l3: [[27, 83], [27, 83.4], [24, 90], [24.8, 83.4]],
  r3: [[73, 83], [73, 83.4], [79, 32]],
};
function l3r3Antigo(L, lista) {
  if (!L || typeof L.x !== 'number' || typeof L.y !== 'number') return false;
  for (const v of lista) if (Math.abs(L.x - v[0]) < 1.5 && Math.abs(L.y - v[1]) < 1.5) return true;
  return false;
}
/** Põe L3/R3 no lugar novo. Devolve true se mexeu em algo. */
function consertaL3R3(d) {
  if (!d || !d.nodes) return false;
  const fab = nosDoModo(d.modo === 'jogo' ? 'jogo' : 'menu');
  let mudou = false;
  for (const id of ['l3', 'r3']) {
    const alvo = fab[id];
    if (!alvo) continue;
    const L = d.nodes[id];
    if (!L) {
      d.nodes[id] = { x: alvo.x, y: alvo.y, s: alvo.s, hid: false };
      mudou = true;
    } else if (l3r3Antigo(L, L3R3_VELHOS[id])) {
      L.x = alvo.x; L.y = alvo.y; L.s = alvo.s;
      mudou = true;
    }
  }
  return mudou;
}

let dados = carregar();
const MIGRA_KEY = 'pixelpadLayoutV10';

function migrarLayout() {
  // 0.10.0 deixou os botoes maiores: o layout salvo da versao anterior ficaria
  // com os botoes encostando, entao ele e refeito uma vez a partir do preset.
  try { if (localStorage.getItem(MIGRA_KEY)) return; } catch (e) { return; }
  const estilo = dados.estilo && ESTILOS[dados.estilo] ? dados.estilo : 'padrao';
  const velhos = dados.nodes || {};
  // quem arrastou botao nao perde nada: so troca o padrao de quem esta de fabrica
  if (podeMigrar(velhos)) {
    dados.nodes = estilo === 'padrao' ? nosDoModo(dados.modo)
      : montarPreset(dados.marca || 'ps', estilo, dados.modo);
    // as macros ficam no mesmo layout: elas mantem o lugar onde estavam
    for (const id in velhos) if (id.charAt(0) === 'k') dados.nodes[id] = velhos[id];
    if (dados.modo === 'menu') {
      for (const id of ['ls', 'rs']) if (dados.nodes[id]) dados.nodes[id].hid = true;
    }
    marcarBase();
  }

  // o outro modo (menu/jogo) tambem tem layout salvo proprio e ficaria com os
  // botoes grandes por cima dos antigos - refaz ele junto
  const outro = dados.modo === 'menu' ? 'jogo' : 'menu';
  try {
    const g = JSON.parse(localStorage.getItem(chaveLayout(dados.marca, outro)));
    if (g && g.nodes && (!g.base || assinatura(g.nodes) === g.base)) {
      const antigos = g.nodes;
      const est = (g.estilo && ESTILOS[g.estilo]) ? g.estilo : estilo;
      g.nodes = (est === 'padrao') ? nosDoModo(outro)
        : montarPreset(g.marca || dados.marca || 'ps', est, outro);
      for (const id in antigos) if (id.charAt(0) === 'k') g.nodes[id] = antigos[id];
      g.modo = outro;
      delete g.macros;
      for (const id of ['ls', 'rs']) if (g.nodes[id]) g.nodes[id].hid = (outro === 'menu');
      g.base = assinatura(g.nodes);
      localStorage.setItem(chaveLayout(g.marca, outro), JSON.stringify(g));
    }
  } catch (e) {}

  try { localStorage.setItem(MIGRA_KEY, '1'); } catch (e) {}
  salvar();
}

function carregar() {
  // o jogo sempre abre no modo MENU; o layout e POR ESTILO (PlayStation, Xbox...)
  // e por modo, entao trocar de estilo nao bagunca o do outro.
  let p = null;
  try { p = JSON.parse(localStorage.getItem(PERFIL_KEY)); } catch (e) {}
  const marca = (p && MARCAS[p.marca]) ? p.marca : 'ps';
  const estilo = (p && p.estilo && ESTILOS[p.estilo]) ? p.estilo : 'padrao';

  let salvo = null;
  try { salvo = JSON.parse(localStorage.getItem(chaveLayout(marca, 'menu'))); } catch (e) {}
  if (salvo && salvo.nodes) {
    salvo.modo = 'menu';
    salvo.marca = marca;
    delete salvo.macros;
    for (const id of ['ls', 'rs']) if (salvo.nodes[id]) salvo.nodes[id].hid = true;
    if (consertaL3R3(salvo)) {
      try { localStorage.setItem(chaveLayout(marca, 'menu'), JSON.stringify(salvo)); } catch (e) {}
    }
    return salvo;
  }

  // ---- migracao dos esquemas antigos (layout unico, sem separar por estilo) ----
  // O que estava salvo vira o layout do estilo escolhido agora, sem perder nada.
  const antigoMenu = lerAntigo('padLayoutV3:menu');
  const antigoJogo = lerAntigo('padLayoutV3:jogo');
  const antigoSo = antigoMenu || lerAntigo('padLayoutV3') || lerAntigo('padLayoutV2') || lerAntigo('padLayoutV1');
  if (antigoSo && antigoSo.nodes) {
    const d = JSON.parse(JSON.stringify(antigoSo));
    d.modo = 'menu';
    d.marca = marca;
    d.estilo = estilo;
    d.perfil = marca + ':' + estilo;
    if (!d.base) delete d.base;
    for (const id in DEF) if (!d.nodes[id]) d.nodes[id] = Object.assign({}, DEF[id], { hid: false });
    for (const id of ['ls', 'rs']) if (d.nodes[id]) d.nodes[id].hid = true;
    delete d.macros;
    try {
      localStorage.setItem(chaveLayout(marca, 'menu'), JSON.stringify(d));
      if (antigoJogo && antigoJogo.nodes) {
        const j = JSON.parse(JSON.stringify(antigoJogo));
        j.modo = 'jogo'; j.marca = marca; j.estilo = estilo; j.perfil = marca + ':' + estilo;
        for (const id in DEF) if (!j.nodes[id]) j.nodes[id] = Object.assign({}, DEF[id], { hid: false });
        for (const id of ['ls', 'rs']) if (j.nodes[id]) j.nodes[id].hid = false;
        localStorage.setItem(chaveLayout(marca, 'jogo'), JSON.stringify(j));
      }
    } catch (e) {}
    consertaL3R3(d);
    return d;
  }

  const padrao = nosDoModo('menu');
  return { nodes: padrao, marca, estilo, modo: 'menu', perfil: marca + ':' + estilo,
    base: assinatura(padrao) };
}

/** Le um layout dos esquemas antigos (V1/V2/V3) e devolve no formato de hoje. */
function lerAntigo(chave) {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(chave)); } catch (e) { return null; }
  if (!d) return null;
  if (chave === 'padLayoutV1' || chave === 'padLayoutV2') return null;   // formatos muito antigos: ignora
  return (d && d.nodes) ? d : null;
}

/** Monta as posicoes de um preset e marca o que a marca esconde. */
function montarPreset(marca, estilo, modo) {
  const M = MARCAS[marca] || MARCAS.ps;
  const E = ESTILOS[estilo] || ESTILOS.padrao;
  const mapa = (modo && E[modo]) ? E[modo] : E.nodes;
  const base = (modo === 'jogo') ? DEF_JOGO : DEF;
  const nodes = {};
  for (const id in DEF) nodes[id] = { x: base[id].x, y: base[id].y, s: base[id].s || 1, hid: true };
  for (const id in mapa) {
    if (!nodes[id]) continue;
    const v = mapa[id];
    nodes[id] = { x: v[0], y: v[1], s: v[2], hid: false };
  }
  for (const id of M.ocultar) if (nodes[id]) nodes[id].hid = true;
  return nodes;
}

/** Refaz um layout salvo (de um modo) a partir do preset, mantendo as macros no lugar. */
function refazerModo(modo, marca, estilo) {
  try {
    const chave = chaveLayout(marca || dados.marca, modo);
    const g = JSON.parse(localStorage.getItem(chave));
    if (!g || !g.nodes) return;
    const antigos = g.nodes;
    const est = (estilo && ESTILOS[estilo]) ? estilo : ((g.estilo && ESTILOS[g.estilo]) ? g.estilo : 'padrao');
    g.nodes = (est === 'padrao') ? nosDoModo(modo) : montarPreset(marca || g.marca || 'ps', est, modo);
    for (const id in antigos) if (id.charAt(0) === 'k') g.nodes[id] = antigos[id];
    g.modo = modo;
    g.marca = marca || g.marca || 'ps';
    g.estilo = estilo || g.estilo || 'padrao';
    g.perfil = g.marca + ':' + g.estilo;
    g.base = assinatura(g.nodes);
    for (const id of ['ls', 'rs']) if (g.nodes[id]) g.nodes[id].hid = (modo === 'menu');
    localStorage.setItem(chave, JSON.stringify(g));
  } catch (e) {}
}

/**
 * Aplica o estilo escolhido na tela inicial.
 *
 * Cada estilo tem o SEU layout salvo (padLayoutV4:<estilo>:<modo>). Trocar de
 * estilo carrega o layout daquele estilo - se nunca foi usado, entra o de fabrica.
 * Entrar de novo pelo mesmo estilo nao mexe em nada.
 */
function sincronizarPerfil() {
  let p = null;
  try { p = JSON.parse(localStorage.getItem(PERFIL_KEY)); } catch (e) {}
  if (!p || !p.marca || !MARCAS[p.marca]) return;
  const estilo = p.estilo && ESTILOS[p.estilo] ? p.estilo : 'padrao';
  const alvo = p.marca + ':' + estilo;

  const trocou = dados.perfil !== alvo || dados.marca !== p.marca;
  if (!trocou) {
    dados.marca = p.marca;
    dados.perfil = alvo;
    if (!ESTILOS[dados.estilo]) dados.estilo = estilo;
    salvar();
    return;
  }

  dados.marca = p.marca;
  dados.estilo = estilo;
  dados.perfil = alvo;

  let salvo = null;
  try { salvo = JSON.parse(localStorage.getItem(chaveLayout(p.marca, dados.modo))); } catch (e) {}
  if (salvo && salvo.nodes) {
    // ja existe layout desse estilo neste modo: usa ele
    for (const id in DEF) {
      if (!salvo.nodes[id]) salvo.nodes[id] = { x: DEF[id].x, y: DEF[id].y, s: DEF[id].s || 1, hid: false };
    }
    for (const id of Object.keys(salvo.nodes)) if (id.charAt(0) === 'k') delete salvo.nodes[id];
    dados.nodes = salvo.nodes;
    if (salvo.base) dados.base = salvo.base; else delete dados.base;
  } else {
    dados.nodes = (estilo === 'padrao') ? nosDoModo(dados.modo) : montarPreset(p.marca, estilo, dados.modo);
    marcarBase();
  }
  if (dados.modo === 'menu') {
    for (const id of ['ls', 'rs']) if (dados.nodes[id]) dados.nodes[id].hid = true;
  }
  sincronizarMacros();
  salvar();
}

/** Simbolos e rotulos dos botoes conforme a marca escolhida. */
function aplicarMarca() {
  const M = MARCAS[dados.marca] || MARCAS.ps;
  const PADRAO_ROT = { l2: 'L2', l1: 'L1', r1: 'R1', r2: 'R2', l3: 'L3', r3: 'R3',
    share: 'SHARE', options: 'OPTIONS', ps: 'PS' };
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
    localStorage.setItem(chaveLayout(dados.marca, dados.modo), JSON.stringify(dados));
  } catch (e) {}
  enviarBackup();
}

/** No modo MENU o analogico nao existe na tela; no editor ele fica so translucido. */
function escondido(id, L) {
  if (dados.modo === 'menu' && (id === 'ls' || id === 'rs')) return true;
  return !!L.hid;
}

function aplicar() {
  alvosCache = null;   // as posicoes mudaram: o toque recalcula as areas
  for (const id in DEF) {
    const el = document.getElementById(id); if (!el) continue;
    const bruto = dados.nodes[id];
    const L = (bruto && typeof bruto.x === 'number' && typeof bruto.y === 'number') ? bruto : DEF[id];
    el.style.left = L.x + '%';
    el.style.top = L.y + '%';
    el.style.transform = 'translate(-50%,-50%) scale(' + (L.s || 1) + ')';
    el.classList.toggle('hid', escondido(id, L));
    el.classList.toggle('sel', editing && selecionados.indexOf(id) >= 0);
  }
  macros.forEach((m, iMacro) => {
    const id = m._id;
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('button');
      el.className = 'node macro';
      el.id = id;
      el.dataset.id = id;
      stage.appendChild(el);
    }
    // macro sem icone (as antigas) usa o raio, igual ao da tela de macros
    const rot = m.icone || '\u26A1';
    el.classList.remove('txt');
    if (el.textContent !== rot) el.textContent = rot;
    const L = dados.nodes[id] || { x: 30, y: 58 + Math.min(iMacro, 3) * 13, s: 1 };
    el.style.left = L.x + '%';
    el.style.top = L.y + '%';
    el.style.transform = 'translate(-50%,-50%) scale(' + (L.s || 1) + ')';
    el.classList.toggle('hid', !!L.hid);
    el.classList.toggle('sel', editing && selecionados.indexOf(id) >= 0);
  });
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

function push() { if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'pad', d: state })); }

function rodarMacro(m) {
  if (!ws || ws.readyState !== 1) return;
  if (navigator.vibrate) navigator.vibrate(m.turbo ? [8, 20, 8] : 10);
  ws.send(JSON.stringify({ t: 'macro', passos: m.passos, turbo: !!m.turbo }));
}

/** Le as macros da tela /macros e garante um lugar pra cada botao no layout. */
function sincronizarMacros() {
  let lista = [];
  try { lista = JSON.parse(localStorage.getItem(MACROS_KEY) || '[]'); } catch (e) {}
  macros = (Array.isArray(lista) ? lista : []).filter(m => m && m.id && Array.isArray(m.passos));
  const usados = {};
  macros.forEach((m, i) => {
    m._id = 'k' + m.id;
    usados[m._id] = 1;
    if (!dados.nodes[m._id]) {
      dados.nodes[m._id] = { x: 30, y: 62 + Math.min(i, 3) * 12, s: 1, hid: false };
    }
  });
  // macro apagada na tela de macros sai tambem do layout
  for (const id of Object.keys(dados.nodes)) {
    if (id.charAt(0) === 'k' && !usados[id]) delete dados.nodes[id];
  }
  for (const el of Array.from(stage.querySelectorAll('.macro'))) {
    if (!usados[el.id]) el.remove();
  }
  salvar();
}

// ---------------------------------------------------------------- toque
// Uma camada so de toque. Cada dedo (o pointerId) e dono de UM controle, e pode
// escorregar pra outro; dois dedos no mesmo botao se respeitam (conta por bit).
// O direcional e uma peca so, em 8 setores: a diagonal aperta dois bits com um
// dedo. A ideia veio dos ports de celular (Dragon Rage / Tenkaichi 3), onde o
// controle e um estado que o jogo le a cada quadro - aqui ele vira mensagem.

const FOLGA = 1.15;        // 15% a mais que o desenhado tambem conta como toque
const MIOLO_DPAD = 0.20;   // % do raio do direcional onde nada e apertado
const MORTA = 12;          // % do raio do analogico que nao manda nada (dedo parado treme)
const CURSO = 75;          // % do raio que ja da tilt total: corre com pouco dedo

// ajustes do toque: ficam no aparelho, nao no layout
const AJUSTES_KEY = 'pixelpadAjustes';
const ajustes = (function () {
  const a = { analogico: 'fixo' };
  try {
    const g = JSON.parse(localStorage.getItem(AJUSTES_KEY) || '{}');
    if (g && g.analogico === 'dinamico') a.analogico = 'dinamico';
  } catch (e) {}
  return a;
})();

let alvosCache = null;

function salvarAjustes() {
  try { localStorage.setItem(AJUSTES_KEY, JSON.stringify(ajustes)); } catch (e) {}
  alvosCache = null;
  mostrarAjustes();
}
function mostrarAjustes() {
  document.getElementById('aFixo').classList.toggle('on', ajustes.analogico !== 'dinamico');
  document.getElementById('aDinamico').classList.toggle('on', ajustes.analogico === 'dinamico');
}

function vibrar(ms) { if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }

// ---- registro dos controles (recalculado quando algo muda de lugar)

function caixaDe(el) {
  const r = el.getBoundingClientRect();
  return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, hw: r.width / 2, hh: r.height / 2 };
}

function alvos() {
  if (alvosCache) return alvosCache;
  const lista = [];

  // o direcional entra como UMA peca (o bloco das 4 setas)
  const setas = [];
  for (const id of GRUPO_DPAD) {
    const el = document.getElementById(id);
    if (el && !el.classList.contains('hid')) setas.push(el);
  }
  if (setas.length === 4) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const el of setas) {
      const r = el.getBoundingClientRect();
      x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top);
      x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom);
    }
    lista.push({ id: '__dpad', tipo: 'dpad', cx: (x0 + x1) / 2, cy: (y0 + y1) / 2,
                 hw: (x1 - x0) / 2, hh: (y1 - y0) / 2, membros: GRUPO_DPAD.slice() });
  }

  for (const id in DEF) {
    if (GRUPO_DPAD.indexOf(id) >= 0) continue;
    if (id === 'tp') continue;            // touchpad nao existe no Windows: nao recebe toque
    const el = document.getElementById(id);
    if (!el || el.classList.contains('hid')) continue;
    const a = caixaDe(el);
    a.id = id;
    a.el = el;
    a.tipo = (id === 'ls' || id === 'rs') ? 'stick' : 'botao';
    a.b = el.dataset.b || null;
    lista.push(a);
  }

  for (const m of macros) {
    const el = document.getElementById(m._id);
    if (!el || el.classList.contains('hid')) continue;
    const a = caixaDe(el);
    a.id = m._id; a.el = el; a.tipo = 'macro'; a.macro = m;
    lista.push(a);
  }

  alvosCache = lista;
  return lista;
}

/** O controle sob o dedo: o mais perto do centro entre os que passam no teste de toque. */
function acharAlvo(x, y, folga) {
  let melhor = null, melhorD = Infinity;
  for (const a of alvos()) {
    const dx = (x - a.cx) / (a.hw * folga || 1), dy = (y - a.cy) / (a.hh * folga || 1);
    if (dx * dx + dy * dy > 1) continue;
    const d = Math.hypot(x - a.cx, y - a.cy);
    if (d < melhorD) { melhorD = d; melhor = a; }
  }
  return melhor;
}

function acharPorId(id) {
  if (!id) return null;
  if (GRUPO_DPAD.indexOf(id) >= 0) {
    for (const a of alvos()) if (a.tipo === 'dpad') return a;
    return null;
  }
  for (const a of alvos()) if (a.id === id) return a;
  return null;
}

function aindaDentro(a, x, y, folga) {
  const dx = (x - a.cx) / (a.hw * folga || 1), dy = (y - a.cy) / (a.hh * folga || 1);
  return dx * dx + dy * dy <= 1;
}

// ---- botoes: quem esta segurando cada bit (dois dedos no mesmo botao)

const segurados = {};   // bit -> ids de controle que estao em cima dele

function segurar(a) {
  const b = a.b;
  if (!b) return;
  const lista = segurados[b] || (segurados[b] = []);
  if (lista.indexOf(a.id) < 0) lista.push(a.id);
  // L2/R2 sao gatilhos analogicos (0..255): mandar 1 nao aperta nada nos jogos
  state[b] = (b === 'lt' || b === 'rt') ? 255 : 1;
  if (a.el) a.el.classList.add('on');
}
function soltar(a) {
  const b = a.b;
  if (!b) return;
  const lista = segurados[b] || [];
  const i = lista.indexOf(a.id);
  if (i >= 0) lista.splice(i, 1);
  if (!lista.length) state[b] = 0;
  if (a.el) a.el.classList.remove('on');
}

// ---- direcional em 8 setores (a diagonal aperta dois bits com um dedo)

const SETORES = [['dr'], ['dr', 'du'], ['du'], ['du', 'dl'],
                 ['dl'], ['dl', 'dd'], ['dd'], ['dd', 'dr']];

function setorDpad(a, x, y) {
  const dx = x - a.cx, dy = y - a.cy;
  const raio = Math.max(a.hw, a.hh);
  if (Math.hypot(dx, dy) < raio * MIOLO_DPAD) return [];
  const ang = (Math.atan2(-dy, dx) * 180 / Math.PI + 360 + 22.5) % 360;
  return SETORES[Math.floor(ang / 45) % 8];
}

function aplicarSetor(a, dirs) {
  for (const id of GRUPO_DPAD) {
    const on = dirs.indexOf(id) >= 0;
    state[id] = on ? 1 : 0;
    const el = document.getElementById(id);
    if (el) el.classList.toggle('on', on);
  }
}

// ---- analogico: zona morta, curso curto e (opcional) nasce onde o dedo cai

function bytesStick(dx, dy, raio) {
  const d = Math.hypot(dx, dy);
  if (!raio || d <= 0) return [0, 0];
  const morta = raio * MORTA / 100;
  const cheio = Math.max(morta + 1, raio * CURSO / 100);
  if (d <= morta) return [0, 0];
  const t = Math.min(1, (d - morta) / (cheio - morta));
  const ang = Math.atan2(dy, dx);
  return [Math.round(Math.cos(ang) * t * 32767), Math.round(-Math.sin(ang) * t * 32767)];
}

function moverStick(t, x, y) {
  const a = t.alvo;
  if (!a) return;
  const chaves = a.id === 'ls' ? ['lx', 'ly'] : ['rx', 'ry'];
  const v = bytesStick(x - t.ox, y - t.oy, t.raio);
  state[chaves[0]] = v[0];
  state[chaves[1]] = v[1];
  let dx = x - t.ox, dy = y - t.oy;
  const d = Math.hypot(dx, dy);
  if (d > t.raio) { dx = dx / d * t.raio; dy = dy / d * t.raio; }
  const knob = a.el && a.el.querySelector('.knob');
  if (knob) knob.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px))';
  push();
}

// no modo dinamico o desenho do analógico foi parar no dedo: volta pro lugar do layout
function voltarStick(a) {
  const bruto = dados.nodes[a.id];
  const L = (bruto && typeof bruto.x === 'number') ? bruto : DEF[a.id];
  if (!L || !a.el) return;
  a.el.style.left = L.x + '%';
  a.el.style.top = L.y + '%';
  alvosCache = null;
}

function zerarStick(a) {
  const chaves = a.id === 'ls' ? ['lx', 'ly'] : ['rx', 'ry'];
  state[chaves[0]] = 0;
  state[chaves[1]] = 0;
  const knob = a.el && a.el.querySelector('.knob');
  if (knob) knob.style.transform = 'translate(-50%,-50%)';
}

/** Analogo dinamico: o dedo que cai na metade de baixo (lado do analogico) comeca ali. */
function stickDaZona(x, y) {
  if (ajustes.analogico !== 'dinamico') return null;
  const r = stage.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  if (y - r.top < r.height * 0.30) return null;
  const rel = (x - r.left) / r.width;
  const id = rel < 0.45 ? 'ls' : (rel > 0.55 ? 'rs' : null);
  if (!id) return null;
  const a = acharPorId(id);
  return (a && a.tipo === 'stick') ? a : null;
}

// ---- cada dedo

const toques = {};

function apertar(t, x, y) {
  const a = t.alvo;
  if (!a) return;
  if (a.tipo === 'dpad') {
    t.dir = setorDpad(a, x, y);
    aplicarSetor(a, t.dir);
    vibrar(8); push();
    return;
  }
  if (a.tipo === 'stick') {
    t.raio = (a.el.getBoundingClientRect().width || 2 * a.hw) * 0.42;
    t.ox = a.cx; t.oy = a.cy;
    // no dinamico o centro nasce no dedo (nao pula pro tilt da borda), e o
    // desenho do analogico vai junto pra onde o dedo tocou
    if (ajustes.analogico === 'dinamico') {
      const r = stage.getBoundingClientRect();
      if (r.width && r.height) {
        t.ox = x; t.oy = y;
        a.el.style.left = ((x - r.left) / r.width * 100) + '%';
        a.el.style.top = ((y - r.top) / r.height * 100) + '%';
        t.mexeu = true;
        alvosCache = null;
      }
    }
    moverStick(t, x, y);
    return;
  }
  if (a.tipo === 'macro') {
    if (a.el) a.el.classList.add('on');
    rodarMacro(a.macro);
    return;
  }
  segurar(a);
  vibrar(8);
  push();
}

function soltarAlvo(t) {
  const a = t.alvo;
  if (!a) return;
  if (a.tipo === 'dpad') { aplicarSetor(a, []); t.dir = []; }
  else if (a.tipo === 'stick') { zerarStick(a); if (t.mexeu) voltarStick(a); }
  else if (a.tipo === 'macro') {
    if (a.el) a.el.classList.remove('on');
    if (a.macro && a.macro.turbo && ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'macroStop' }));
  } else { soltar(a); }
  t.alvo = null;
  push();
}

function noHud(ev) {
  const alvo = ev.target;
  return !!(alvo && alvo.closest && (alvo.closest('#editor') || alvo.closest('#hud')
    || alvo.closest('#confirma') || alvo.closest('#ajustes')));
}

stage.addEventListener('pointerdown', ev => {
  if (editing || noHud(ev)) return;
  ev.preventDefault();
  const no = ev.target && ev.target.closest ? ev.target.closest('.node') : null;
  let a = no ? acharPorId(no.dataset.id) : null;
  if (!a) a = acharAlvo(ev.clientX, ev.clientY, FOLGA);
  if (!a) a = stickDaZona(ev.clientX, ev.clientY);
  const t = { x0: ev.clientX, y0: ev.clientY, alvo: a, dir: [] };
  toques[ev.pointerId] = t;
  try { stage.setPointerCapture(ev.pointerId); } catch (e) {}
  if (a) apertar(t, ev.clientX, ev.clientY);
});

stage.addEventListener('pointermove', ev => {
  if (editing) return;
  const t = toques[ev.pointerId];
  if (!t) return;
  ev.preventDefault();
  const a = t.alvo;

  // dedo caiu no vazio e escorregou pra um controle: aperta
  if (!a) {
    if (Math.hypot(ev.clientX - t.x0, ev.clientY - t.y0) < 8) return;
    const n = acharAlvo(ev.clientX, ev.clientY, 1);
    if (n && n.tipo !== 'macro' && n.tipo !== 'stick') {
      t.alvo = n;
      apertar(t, ev.clientX, ev.clientY);
    }
    return;
  }

  if (a.tipo === 'dpad') {
    const dir = setorDpad(a, ev.clientX, ev.clientY);
    if (dir.join() !== (t.dir || []).join()) {
      t.dir = dir; aplicarSetor(a, dir); vibrar(5); push();
    }
    return;
  }
  if (a.tipo === 'stick') { moverStick(t, ev.clientX, ev.clientY); return; }

  // botao ou macro: saiu de cima? solta. entrou num vizinho? passa o dedo pra ele.
  if (aindaDentro(a, ev.clientX, ev.clientY, FOLGA + 0.13)) return;
  const n = acharAlvo(ev.clientX, ev.clientY, 1);
  const podeIr = n && n.tipo !== 'macro' && n.tipo !== 'stick';
  soltarAlvo(t);
  if (podeIr) { t.alvo = n; apertar(t, ev.clientX, ev.clientY); }
});

function fimDoToque(ev) {
  const t = toques[ev.pointerId];
  if (!t) return;
  delete toques[ev.pointerId];
  soltarAlvo(t);
}
stage.addEventListener('pointerup', fimDoToque);
stage.addEventListener('pointercancel', fimDoToque);
window.addEventListener('blur', () => {
  for (const id in toques) { soltarAlvo(toques[id]); delete toques[id]; }
});

// engrenagem da barra do editor: ajustes do toque
document.getElementById('bcfg').onclick = () => {
  mostrarAjustes();
  document.getElementById('ajustes').classList.add('aberto');
};
document.getElementById('aFixo').onclick = () => { ajustes.analogico = 'fixo'; salvarAjustes(); };
document.getElementById('aDinamico').onclick = () => { ajustes.analogico = 'dinamico'; salvarAjustes(); };
document.getElementById('aFechar').onclick = () => {
  document.getElementById('ajustes').classList.remove('aberto');
  aplicar();
};

// ---------------------------------------------------------------- editor
const acharMacro = (id) => macros.find(m => m._id === id);

// as 4 setas andam juntas: editar uma por uma nao faz sentido
const GRUPO_DPAD = ['du', 'dd', 'dl', 'dr'];
const grupoDe = (id) => (GRUPO_DPAD.indexOf(id) >= 0 ? GRUPO_DPAD : [id]);
const idsSelecionados = () => (selecionados.length ? selecionados : (selected ? [selected] : []));

function selecionar(id) {
  selected = id;
  selecionados = grupoDe(id);
  const L = dados.nodes[id];
  document.getElementById('beye').classList.toggle('on', !!(L && L.hid));
  aplicar();
}

document.getElementById('bedit').onclick = () => {
  editing = !editing;
  document.body.classList.toggle('editing', editing);
  if (!editing) { selected = null; selecionados = []; }
  document.getElementById('bedit').textContent = editing ? '\u2713 OK' : '\u270E Editar';
  aplicar();
};

document.getElementById('bdone').onclick = () => document.getElementById('bedit').click();

/**
 * Muda o tamanho dos controles selecionados. Quando e um grupo (as setas), os
 * botoes tambem se afastam do centro do grupo na mesma proporcao - senao so
 * cresceriam por cima uns dos outros.
 */
function escalar(delta) {
  const ids = idsSelecionados().filter(id => dados.nodes[id]);
  if (!ids.length) return;

  const antes = dados.nodes[ids[0]].s || 1;
  const depois = Math.min(3, Math.max(0.35, Math.round((antes + delta) * 100) / 100));
  if (depois === antes) return;
  const f = depois / antes;

  for (const id of ids) dados.nodes[id].s = depois;

  if (ids.length > 1) {
    let cx = 0, cy = 0;
    for (const id of ids) { cx += dados.nodes[id].x; cy += dados.nodes[id].y; }
    cx /= ids.length; cy /= ids.length;
    for (const id of ids) {
      const L = dados.nodes[id];
      L.x = Math.round((cx + (L.x - cx) * f) * 10) / 10;
      L.y = Math.round((cy + (L.y - cy) * f) * 10) / 10;
    }
    // se o bloco cresceu pra fora da tela, encosta ele de volta pra dentro
    let minX = 100, maxX = 0, minY = 100, maxY = 0;
    for (const id of ids) {
      const L = dados.nodes[id];
      minX = Math.min(minX, L.x); maxX = Math.max(maxX, L.x);
      minY = Math.min(minY, L.y); maxY = Math.max(maxY, L.y);
    }
    const dx = minX < 7 ? 7 - minX : (maxX > 93 ? 93 - maxX : 0);
    const dy = minY < 8 ? 8 - minY : (maxY > 92 ? 92 - maxY : 0);
    if (dx || dy) {
      for (const id of ids) {
        const L = dados.nodes[id];
        L.x = Math.round((L.x + dx) * 10) / 10;
        L.y = Math.round((L.y + dy) * 10) / 10;
      }
    }
  }

  salvar();
  aplicar();
}

document.getElementById('bminus').onclick = () => escalar(-0.1);
document.getElementById('bplus').onclick = () => escalar(0.1);
document.getElementById('beye').onclick = () => {
  const ids = idsSelecionados();
  if (!ids.length) return;
  const algumVisivel = ids.some(id => dados.nodes[id] && !dados.nodes[id].hid);
  for (const id of ids) {
    const L = dados.nodes[id];
    if (L) L.hid = algumVisivel;
  }
  salvar();
  selecionar(selected);
};
document.getElementById('breset').onclick = () => {
  document.getElementById('confirma').classList.add('aberto');
};

document.getElementById('cCancelar').onclick = () => {
  document.getElementById('confirma').classList.remove('aberto');
};

document.getElementById('cAcao').onclick = () => {
  document.getElementById('confirma').classList.remove('aberto');
  dados.nodes = (dados.estilo && dados.estilo !== 'padrao')
    ? montarPreset(dados.marca || 'ps', dados.estilo, dados.modo)
    : nosDoModo(dados.modo);
  marcarBase();
  selected = null;
  sincronizarMacros();
  salvar(); aplicarMarca(); aplicar();
};

// arrastar os nos no modo edicao
let arrastando = null;
stage.addEventListener('pointerdown', ev => {
  if (!editing) return;
  const no = ev.target.closest('.node');
  if (!no) { selected = null; selecionados = []; aplicar(); return; }
  selecionar(no.dataset.id);
  const membros = [];
  for (const id of selecionados) {
    const L = dados.nodes[id];
    if (L) membros.push({ L: L, x0: L.x, y0: L.y });
  }
  if (!membros.length) return;
  const r = stage.getBoundingClientRect();
  arrastando = { px: ev.clientX, py: ev.clientY, w: r.width, h: r.height, membros: membros };
  no.setPointerCapture(ev.pointerId);
});
stage.addEventListener('pointermove', ev => {
  if (!arrastando) return;
  const dx = (ev.clientX - arrastando.px) / arrastando.w * 100;
  const dy = (ev.clientY - arrastando.py) / arrastando.h * 100;
  for (const m of arrastando.membros) {
    m.L.x = Math.round((m.x0 + dx) * 10) / 10;
    m.L.y = Math.round((m.y0 + dy) * 10) / 10;
  }
  aplicar();
});
stage.addEventListener('pointerup', () => { if (arrastando) { arrastando = null; salvar(); } });
stage.addEventListener('pointercancel', () => { if (arrastando) { arrastando = null; salvar(); } });



// ---------------------------------------------------------------- tela cheia
/**
 * Alterna entre o layout de menu (sem analogico) e o de jogo.
 * O estilo (PlayStation/Xbox/Nintendo) e global: trocar de modo NUNCA troca os
 * simbolos dos botoes - cada estilo guarda um layout por modo.
 */
function alternarModo() {
  const novo = dados.modo === 'menu' ? 'jogo' : 'menu';
  const marca = dados.marca, estilo = dados.estilo, perfil = dados.perfil;
  salvar();

  const guardado = localStorage.getItem(chaveLayout(marca, novo));
  if (guardado) {
    try { dados = JSON.parse(guardado); } catch (e) { dados.modo = novo; }
    dados.modo = novo;
  } else {
    // primeira vez neste modo: entra o layout de fabrica dele
    const copia = JSON.parse(JSON.stringify(dados));
    dados = copia;
    dados.modo = novo;
    dados.nodes = (estilo && estilo !== 'padrao')
      ? montarPreset(marca || 'ps', estilo, novo)
      : nosDoModo(novo);
    marcarBase();
  }
  // marca/estilo voltam por cima: o layout do modo nao manda nos simbolos
  dados.marca = marca;
  dados.estilo = estilo;
  dados.perfil = perfil;
  for (const id of ['ls', 'rs']) if (dados.nodes[id]) dados.nodes[id].hid = (novo === 'menu');
  consertaL3R3(dados);
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

puxarBackup();
sincronizarPerfil();
migrarLayout();
sincronizarMacros();
aplicarMarca();
aplicar();
atualizarBotaoModo();
// o celular fica em pe na escolha do controle e deita aqui
if (window.PixelPad && PixelPad.tela) { try { PixelPad.tela('paisagem'); } catch (e) {} }

// Se o WebView nao atualizar o tamanho sozinho ao girar (acontece em alguns
// aparelhos), a tela fica com o layout de um tamanho e a janela de outro: os
// botoes aparecem cortados. Aqui a gente reaplica o layout a cada mudanca de
// tamanho/orientacao e avisa quando esta em pe.
function ajustarTela() {
  const retrato = window.innerHeight > window.innerWidth;
  document.body.classList.toggle('retrato', retrato);
  aplicar();
}
window.addEventListener('resize', ajustarTela);
window.addEventListener('orientationchange', function () {
  setTimeout(ajustarTela, 120);
  setTimeout(ajustarTela, 400);
});
if (window.visualViewport) window.visualViewport.addEventListener('resize', ajustarTela);
ajustarTela();
connect();
</script>
</body></html>`;
}
