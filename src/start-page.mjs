// Tela inicial (/inicio): escolher marca do controle e tipo de jogo.
//
// Ela e a primeira coisa que o app abre. Se ja existe um perfil salvo, pula
// direto pro gamepad - a menos que venha com ?menu=1 (botao "Perfis").

import { MARCAS, ESTILOS, dadosJS } from './presets.mjs';

export function startPage({ SVG }) {
  return String.raw`<!doctype html><html lang="pt-BR"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="theme-color" content="#0d0f12">
<title>PixelPad</title>
<style>
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body { margin: 0; min-height: 100%; background: #0d0f12; color: #e6e8ec;
    font-family: system-ui, -apple-system, sans-serif; user-select: none; -webkit-user-select: none; }
  .wrap { max-width: 1100px; margin: 0 auto; padding: 18px 20px 40px; }
  header { text-align: center; margin: 6px 0 18px; }
  h1 { margin: 0; font-size: 34px; letter-spacing: -.5px; }
  h1 span { color: #2f6df6; }
  header p { margin: 6px 0 0; color: #8a94a3; font-size: 15px; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 1.6px; color: #6b7787;
    margin: 22px 0 10px; font-weight: 700; }
  .grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); }
  .card { background: #121821; border: 1.5px solid #1e2836; border-radius: 14px; padding: 14px;
    cursor: pointer; transition: border-color .12s, background .12s; display: flex; flex-direction: column; gap: 10px; }
  .card:active { transform: scale(.985); }
  .card.sel { border-color: #2f6df6; background: #14203a; }
  .card b { font-size: 16px; }
  .card small { color: #7d8797; font-size: 12.5px; line-height: 1.45; }
  .diamante { display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr);
    gap: 1px; width: 68px; height: 68px; margin: 2px auto 0; }
  .diamante .b { width: auto; height: auto; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; }
  .diamante .b svg { width: 15px; height: 15px; }
  .diamante .y { grid-area: 1 / 2; }
  .diamante .x { grid-area: 2 / 1; }
  .diamante .b2 { grid-area: 2 / 3; }
  .diamante .a { grid-area: 3 / 2; }
  .bolinha { display: flex; align-items: center; gap: 7px; color: #7d8797; font-size: 12.5px; }
  .bolinha i { width: 9px; height: 9px; border-radius: 50%; background: #263140; display: block; }
  .card.sel .bolinha i { background: #2f6df6; }
  .acoes { display: flex; flex-direction: column; gap: 10px; margin-top: 26px; align-items: center; }
  #jogar { width: 100%; max-width: 420px; padding: 17px; border: 0; border-radius: 14px;
    background: #2f6df6; color: #fff; font-size: 18px; font-weight: 800; font-family: inherit; }
  #jogar:active { transform: scale(.99); }
  #meu { background: none; border: 0; color: #7d8797; font-size: 14px; font-family: inherit; padding: 6px; }
  #voltar { background: none; border: 0; color: #7db6ff; font-size: 14px; font-family: inherit; padding: 6px; }

  @media (max-height: 820px) {
    .wrap { padding: 10px 18px 22px; }
    header { margin: 0 0 6px; }
    h1 { font-size: 23px; }
    header p { font-size: 12px; margin-top: 3px; }
    h2 { font-size: 10.5px; margin: 11px 0 6px; letter-spacing: 1.3px; }
    .grid { grid-template-columns: repeat(auto-fit, minmax(175px, 1fr)); gap: 9px; }
    .card { padding: 9px 10px; gap: 5px; border-radius: 11px; }
    .diamante { width: 46px; height: 46px; }
    .diamante .b { font-size: 10px; }
    .diamante .b svg { width: 12px; height: 12px; }
    .card b { font-size: 13.5px; }
    .card small { font-size: 11px; }
    .bolinha { font-size: 10.5px; }
    .acoes { margin-top: 13px; gap: 4px; }
    #jogar { padding: 12px; font-size: 15px; max-width: 300px; border-radius: 12px; }
    #meu, #voltar { font-size: 12px; }
  }

  @media (max-height: 460px) {
    .wrap { padding: 6px 12px 10px; }
    header { margin: 0 0 2px; }
    h1 { font-size: 15px; }
    header p { display: none; }
    h2 { font-size: 8.5px; margin: 6px 0 4px; letter-spacing: 1px; }
    .grid { grid-template-columns: repeat(3, 1fr); gap: 6px; }
    #estilos { grid-template-columns: repeat(4, 1fr); }
    .card { padding: 5px 7px; gap: 2px; border-radius: 8px; }
    .diamante { width: 30px; height: 30px; margin: 0 auto; gap: 0; }
    .diamante .b { font-size: 7px; }
    .diamante .b svg { width: 8px; height: 8px; }
    .card b { font-size: 10.5px; }
    .card small { font-size: 8.5px; line-height: 1.25; }
    .bolinha { display: none; }
    .acoes { margin-top: 7px; gap: 2px; }
    #jogar { padding: 7px; font-size: 11px; max-width: 220px; border-radius: 8px; }
    #meu, #voltar { font-size: 9px; padding: 2px; }
  }
  .oculto { display: none !important; }
</style></head><body>
<div class="wrap">
  <header>
    <h1>Pixel<span>Pad</span></h1>
    <p>Escolha como quer jogar</p>
  </header>

  <h2>1. Estilo do controle</h2>
  <div class="grid" id="marcas"></div>

  <h2>2. Tipo de jogo</h2>
  <div class="grid" id="estilos"></div>

  <div class="acoes">
    <button id="jogar">Jogar</button>
    <button id="voltar" class="oculto">&larr; voltar para o controle</button>
    <button id="meu">usar meu layout atual (sem mudar nada)</button>
  </div>
</div>
<script>
const SVGS = ` + JSON.stringify(SVG) + `;
` + dadosJS() + `

const CHAVE_PERFIL = 'pixelpadPerfil';
const qs = location.search || '';
const comMenu = qs.indexOf('menu=1') >= 0;

let perfil = { marca: 'ps', estilo: 'padrao' };
try { const j = JSON.parse(localStorage.getItem(CHAVE_PERFIL)); if (j && j.marca) perfil = j; } catch (e) {}

// ja escolheu antes e nao pediu o menu -> vai direto pro controle
if (localStorage.getItem(CHAVE_PERFIL) && !comMenu) {
  location.replace('/game' + qs);
} else {
  document.getElementById('voltar').classList.toggle('oculto', !comMenu);
}

function irPara(url) { location.href = url; }

function cartaoMarca(id, m) {
  const el = document.createElement('div');
  el.className = 'card' + (perfil.marca === id ? ' sel' : '');
  el.dataset.marca = id;
  const f = m.faces;
  const cor = k => (m.cores[k] ? 'background:' + m.cores[k][0] + ';color:' + m.cores[k][1] : '');
  const dentro = k => (f[k] && SVGS[f[k]] ? SVGS[f[k]] : (f[k] || ''));
  el.innerHTML =
    '<div class="diamante">' +
      '<div class="b y" style="' + cor('y') + '">' + dentro('y') + '</div>' +
      '<div class="b x" style="' + cor('x') + '">' + dentro('x') + '</div>' +
      '<div class="b b2" style="' + cor('b') + '">' + dentro('b') + '</div>' +
      '<div class="b a" style="' + cor('a') + '">' + dentro('a') + '</div>' +
    '</div>' +
    '<b>' + m.nome + '</b><small>' + m.resumo + '</small>' +
    '<span class="bolinha"><i></i>selecionado</span>';
  el.onclick = () => { perfil.marca = id; desenhar(); };
  return el;
}

function cartaoEstilo(id, e) {
  const el = document.createElement('div');
  el.className = 'card' + (perfil.estilo === id ? ' sel' : '');
  el.dataset.estilo = id;
  el.innerHTML = '<b>' + e.nome + '</b><small>' + e.resumo + '</small>' +
    '<span class="bolinha"><i></i>selecionado</span>';
  el.onclick = () => { perfil.estilo = id; desenhar(); };
  return el;
}

function desenhar() {
  const cm = document.getElementById('marcas');
  const ce = document.getElementById('estilos');
  cm.innerHTML = ''; ce.innerHTML = '';
  for (const id in MARCAS) cm.appendChild(cartaoMarca(id, MARCAS[id]));
  for (const id in ESTILOS) ce.appendChild(cartaoEstilo(id, ESTILOS[id]));
}

document.getElementById('jogar').onclick = () => {
  try { localStorage.setItem(CHAVE_PERFIL, JSON.stringify(perfil)); } catch (e) {}
  irPara('/game' + qs.replace(/([?&])menu=1&?/, '$1').replace(/[?&]$/, ''));
};

document.getElementById('meu').onclick = () => {
  irPara('/game' + qs.replace(/([?&])menu=1&?/, '$1').replace(/[?&]$/, ''));
};

document.getElementById('voltar').onclick = () => {
  irPara('/game' + qs.replace(/([?&])menu=1&?/, '$1').replace(/[?&]$/, ''));
};

desenhar();
</script>
</body></html>`;
}
