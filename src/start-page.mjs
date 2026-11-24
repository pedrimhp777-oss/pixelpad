// Tela inicial (/inicio): escolher marca do controle e tipo de jogo.
//
// Visual inspirado nos launchers de emulador de celular: cards de largura cheia
// com gradiente proprio, titulo em caixa alta e uma linha de descricao.
// Adaptado para paisagem (o celular fica deitado), entao os cards ficam em
// linha em vez de empilhados.

import { MARCAS, ESTILOS, dadosJS } from './presets.mjs';

export function startPage({ SVG }) {
  return String.raw`<!doctype html><html lang="pt-BR"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="theme-color" content="#0a0b0e">
<title>PixelPad</title>
<style>
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body { margin: 0; height: 100%; background: #0a0b0e; color: #e9ecf1;
    font-family: system-ui, -apple-system, sans-serif; user-select: none; -webkit-user-select: none;
    overflow: hidden; }
  .wrap { height: 100%; display: flex; flex-direction: column; gap: 10px; padding: 12px 16px 14px; }

  .topo { display: flex; align-items: center; gap: 12px; }
  .logo { width: 44px; height: 44px; border-radius: 13px; flex: none;
    background: radial-gradient(circle at 32% 28%, #ffd34d, #f09100 70%);
    display: grid; place-items: center; font-weight: 900; font-size: 15px; color: #2a1600;
    box-shadow: 0 0 18px rgba(240,145,0,.45); }
  h1 { margin: 0; font-size: 21px; font-weight: 900; font-style: italic; letter-spacing: .6px;
    color: #f7c518; line-height: 1.05; }
  .topo p { margin: 1px 0 0; font-size: 11.5px; color: #8a94a3; }
  #jogar { margin-left: auto; padding: 11px 26px; border: 0; border-radius: 12px;
    background: #2f6df6; color: #fff; font-size: 14px; font-weight: 800; font-family: inherit;
    letter-spacing: .5px; }
  #jogar:active { transform: scale(.98); }

  .secao { display: flex; flex-direction: column; gap: 6px; min-height: 0; }
  .secao h2 { margin: 0; font-size: 9.5px; letter-spacing: 1.6px; color: #6b7787; font-weight: 800; }
  .linha { display: grid; gap: 8px; grid-template-columns: repeat(3, 1fr); }
  #estilos { grid-template-columns: repeat(4, 1fr); }

  .card { position: relative; border-radius: 13px; padding: 9px 11px; border: 2px solid transparent;
    background: linear-gradient(135deg, var(--a), var(--b)); cursor: pointer; overflow: hidden;
    display: flex; flex-direction: column; gap: 2px; transition: transform .1s, border-color .1s; }
  .card:active { transform: scale(.985); }
  .card::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,.06), rgba(0,0,0,.28)); }
  .card > * { position: relative; z-index: 1; }
  .card b { font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: .5px;
    color: #fff; line-height: 1.15; }
  .card small { font-size: 9.5px; line-height: 1.25; color: rgba(255,255,255,.82); }
  .card.sel { border-color: #fff; box-shadow: 0 0 0 1px rgba(255,255,255,.35), 0 6px 18px rgba(0,0,0,.5); }
  .card .ok { position: absolute; top: 7px; right: 8px; z-index: 2; font-size: 10px; font-weight: 900;
    color: #0a0b0e; background: #fff; border-radius: 50%; width: 15px; height: 15px;
    display: none; place-items: center; }
  .card.sel .ok { display: grid; }

  .sim { display: flex; gap: 3px; align-items: center; margin-bottom: 1px; }
  .sim i { width: 13px; height: 13px; border-radius: 50%; display: grid; place-items: center;
    font-size: 7px; font-weight: 900; font-style: normal; }
  .sim i svg { width: 9px; height: 9px; }

  .rodape { margin-top: auto; display: flex; align-items: center; gap: 10px; min-height: 0; }
  #detalhe { font-size: 10.5px; color: #7d8797; line-height: 1.35; flex: 1;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  #detalhe b { color: #b9c4d2; }
  #meu { background: none; border: 0; color: #6b7787; font-size: 10.5px; font-family: inherit;
    padding: 4px 2px; flex: none; }

  @media (min-height: 520px) {
    .wrap { padding: 18px 22px; gap: 14px; }
    h1 { font-size: 26px; }
    .logo { width: 54px; height: 54px; font-size: 18px; }
    .card { padding: 13px 15px; }
    .card b { font-size: 15px; }
    .card small { font-size: 11.5px; }
    .secao h2 { font-size: 11px; }
    #jogar { padding: 14px 34px; font-size: 16px; }
    .sim i { width: 18px; height: 18px; font-size: 9px; }
    .sim i svg { width: 12px; height: 12px; }
  }
</style></head><body>
<div class="wrap">
  <div class="topo">
    <div class="logo">PP</div>
    <div>
      <h1>PIXELPAD</h1>
      <p>Escolha como quer jogar</p>
    </div>
    <button id="jogar">JOGAR</button>
  </div>

  <div class="secao">
    <h2>ESTILO DO CONTROLE</h2>
    <div class="linha" id="marcas"></div>
  </div>

  <div class="secao">
    <h2>TIPO DE JOGO</h2>
    <div class="linha" id="estilos"></div>
  </div>

  <div class="rodape">
    <div id="detalhe"></div>
    <button id="meu">usar meu layout atual</button>
  </div>
</div>
<script>
const SVGS = ` + JSON.stringify(SVG) + `;
` + dadosJS() + `

const CHAVE = 'pixelpadPerfil';
const qs = location.search || '';
const comMenu = qs.indexOf('menu=1') >= 0;

let perfil = { marca: 'ps', estilo: 'padrao' };
try { const j = JSON.parse(localStorage.getItem(CHAVE)); if (j && j.marca && MARCAS[j.marca]) perfil = j; } catch (e) {}

if (localStorage.getItem(CHAVE) && !comMenu) location.replace('/game' + qs);

function irJogo() {
  const limpo = qs.replace(/([?&])menu=1&?/, '$1').replace(/[?&]$/, '');
  location.href = '/game' + limpo;
}

function simbolos(m) {
  const ordem = ['y', 'x', 'b', 'a'];
  let html = '';
  for (const k of ordem) {
    const f = m.faces[k];
    const c = m.cores[k] || ['#222', '#fff'];
    const dentro = SVGS[f] ? SVGS[f] : f;
    html += '<i style="background:' + c[0] + ';color:' + c[1] + '">' + dentro + '</i>';
  }
  return '<div class="sim">' + html + '</div>';
}

function cartaoMarca(id, m) {
  const el = document.createElement('div');
  el.className = 'card' + (perfil.marca === id ? ' sel' : '');
  el.style.setProperty('--a', m.grad[0]);
  el.style.setProperty('--b', m.grad[1]);
  el.innerHTML = '<span class="ok">&#10003;</span>' + simbolos(m) +
    '<b>' + m.nome + '</b><small>' + m.resumo + '</small>';
  el.onclick = () => { perfil.marca = id; desenhar(); };
  return el;
}

function cartaoEstilo(id, e) {
  const el = document.createElement('div');
  el.className = 'card' + (perfil.estilo === id ? ' sel' : '');
  el.style.setProperty('--a', e.grad[0]);
  el.style.setProperty('--b', e.grad[1]);
  el.innerHTML = '<span class="ok">&#10003;</span><b>' + e.nome + '</b><small>' + e.resumo + '</small>';
  el.onclick = () => { perfil.estilo = id; desenhar(); };
  return el;
}

function desenhar() {
  const cm = document.getElementById('marcas');
  const ce = document.getElementById('estilos');
  cm.innerHTML = ''; ce.innerHTML = '';
  for (const id in MARCAS) cm.appendChild(cartaoMarca(id, MARCAS[id]));
  for (const id in ESTILOS) ce.appendChild(cartaoEstilo(id, ESTILOS[id]));
  const m = MARCAS[perfil.marca], e = ESTILOS[perfil.estilo];
  document.getElementById('detalhe').innerHTML =
    '<b>' + m.nome + ' + ' + e.nome + '</b> &middot; ' + e.resumo + '.';
}

document.getElementById('jogar').onclick = () => {
  try { localStorage.setItem(CHAVE, JSON.stringify(perfil)); } catch (e) {}
  irJogo();
};
document.getElementById('meu').onclick = irJogo;

desenhar();
</script>
</body></html>`;
}
