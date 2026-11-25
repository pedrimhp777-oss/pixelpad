// Tela inicial (/inicio): escolher o estilo do controle, em retrato.
//
// Visual de launcher de emulador: cards de largura cheia com gradiente proprio,
// titulo em caixa alta e uma linha de descricao. Tocar no card ja entra no
// controle - nao tem botao "jogar".
//
// O celular fica em pe aqui (retrato) e deita sozinho quando abre o gamepad.

import { MARCAS, dadosJS } from './presets.mjs';

export function startPage({ SVG, nome = '', versao = '' }) {
  const nomeSeguro = String(nome).replace(/[<&"]/g, c => (c === '<' ? '&lt;' : c === '&' ? '&amp;' : '&quot;'));
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
  .wrap { height: 100%; display: flex; flex-direction: column; padding: 22px 18px 16px; }

  .topo { display: flex; align-items: center; gap: 13px; margin-bottom: 6px; }
  .topo .id { flex: 1; min-width: 0; }
  .sub { display: flex; align-items: center; justify-content: space-between; gap: 10px;
    margin: 0 0 20px 65px; min-height: 26px; }
  #macros { flex: none; display: flex; align-items: center; gap: 5px; height: 26px; padding: 0 9px;
    border-radius: 9px; border: 1px solid #1e2836; background: #141a24; color: #94a0b0;
    font-family: inherit; font-size: 9.5px; font-weight: 800; letter-spacing: .7px; text-transform: uppercase; }
  #macros span { font-size: 12px; color: #ffd34d; line-height: 1; }
  #macros:active { background: #1b222c; color: #e9ecf1; }
  .logo { width: 52px; height: 52px; border-radius: 15px; flex: none;
    background: radial-gradient(circle at 32% 28%, #ffd34d, #f09100 70%);
    display: grid; place-items: center; font-weight: 900; font-size: 18px; color: #2a1600;
    box-shadow: 0 0 22px rgba(240,145,0,.4); }
  h1 { margin: 0; font-size: 25px; font-weight: 900; font-style: italic; letter-spacing: .6px;
    color: #f7c518; line-height: 1; white-space: nowrap; }
  .pc { margin: 0; font-size: 12.5px; color: #8a94a3; display: flex; align-items: center; gap: 6px;
    min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pc b { color: #c3ccd9; font-weight: 600; overflow: hidden; text-overflow: ellipsis; }
  .pc i { width: 6px; height: 6px; border-radius: 50%; background: #3ddc84; flex: none;
    box-shadow: 0 0 6px rgba(61,220,132,.7); }
  .topo p b { color: #b9c4d2; font-weight: 600; }

  .lista { display: flex; flex-direction: column; gap: 12px; flex: 1; min-height: 0; }
  .rotulo { font-size: 10px; letter-spacing: 1.8px; color: #6b7787; font-weight: 800; margin: 0 0 8px; }

  .card { position: relative; border-radius: 18px; padding: 16px 18px; border: 2px solid transparent;
    background: linear-gradient(135deg, var(--a), var(--b)); overflow: hidden;
    display: flex; flex-direction: column; gap: 6px; transition: transform .09s, border-color .15s;
    min-height: 96px; justify-content: center; flex: 1; }
  .card:active { transform: scale(.975); }
  .card::after { content: ''; position: absolute; inset: 0;
    background: linear-gradient(180deg, rgba(0,0,0,.05), rgba(0,0,0,.32)); }
  .card > * { position: relative; z-index: 1; }
  .card b { font-size: 19px; font-weight: 900; text-transform: uppercase; letter-spacing: .6px;
    color: #fff; line-height: 1.1; }
  .card small { font-size: 12px; line-height: 1.35; color: rgba(255,255,255,.85); }
  .card.atual { border-color: rgba(255,255,255,.55); }

  .sim { display: flex; gap: 6px; align-items: center; margin-bottom: 3px; }
  .sim i { width: 21px; height: 21px; border-radius: 50%; display: grid; place-items: center;
    font-size: 10px; font-weight: 900; font-style: normal; }
  .sim i svg { width: 15px; height: 15px; }

  .rodape { margin-top: 18px; display: flex; align-items: stretch; gap: 9px; }
  .rodape button { background: #141a24; border: 1px solid #1e2836; color: #8a94a3; font-family: inherit;
    font-size: 12px; padding: 13px 8px; border-radius: 12px; flex: 1; line-height: 1.2; }
  .rodape button:active { background: #1b222c; }

  #versao { margin: 9px 0 0; text-align: center; font-size: 10.5px; color: #4d5563;
    letter-spacing: .3px; }
  #versao.velho { color: #ffb454; background: rgba(255,180,84,.08); border: 1px solid rgba(255,180,84,.25);
    border-radius: 10px; padding: 8px 10px; font-size: 11.5px; line-height: 1.35; }

  @media (max-height: 660px) {
    .wrap { padding: 14px 14px 12px; }
    .topo { margin-bottom: 4px; gap: 10px; }
    .sub { margin: 0 0 12px 52px; min-height: 24px; }
    .logo { width: 42px; height: 42px; border-radius: 12px; font-size: 15px; }
    h1 { font-size: 22px; }
    #macros { height: 24px; padding: 0 8px; font-size: 9px; gap: 4px; }
    .pc { font-size: 11.5px; }
    .lista { gap: 9px; }
    .card { min-height: 0; padding: 12px 15px; border-radius: 15px; }
    .card b { font-size: 16px; }
    .card small { font-size: 11px; }
    .sim i { width: 18px; height: 18px; }
    .sim i svg { width: 12px; height: 12px; }
    .rodape { margin-top: 12px; }
    .rodape button { padding: 11px 8px; font-size: 11.5px; }
    #versao { margin-top: 7px; font-size: 10px; }
  }
</style></head><body>
<div class="wrap">
  <div class="topo">
    <div class="logo">PP</div>
    <div class="id"><h1>PIXELPAD</h1></div>
  </div>
  <div class="sub">
    <p class="pc"><i></i><b>${nomeSeguro}</b></p>
    <button id="macros" title="Macros"><span>&#9889;</span>macros</button>
  </div>

  <p class="rotulo">ESTILO DO CONTROLE</p>
  <div class="lista" id="marcas"></div>

  <div class="rodape">
    <button id="meu">meu layout atual</button>
    <button id="trocar">trocar de PC</button>
  </div>
  <p id="versao"></p>
</div>
<script>
const SVGS = ` + JSON.stringify(SVG) + `;
` + dadosJS() + `

const CHAVE = 'pixelpadPerfil';
const VERSAO_PC = "${versao}";
const qs = location.search || '';
let perfil = { marca: 'ps', estilo: 'padrao' };
try {
  const j = JSON.parse(localStorage.getItem(CHAVE));
  if (j && j.marca && MARCAS[j.marca]) perfil = { marca: j.marca, estilo: j.estilo || 'padrao' };
} catch (e) {}

function irJogo() {
  // some com ?menu=1 (ele so existia pra pular o redirecionamento antigo)
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

function cartao(id, m) {
  const el = document.createElement('div');
  el.className = 'card' + (perfil.marca === id ? ' atual' : '');
  el.style.setProperty('--a', m.grad[0]);
  el.style.setProperty('--b', m.grad[1]);
  el.innerHTML = simbolos(m) + '<b>' + m.nome + '</b><small>' + m.resumo + '</small>';
  el.onclick = () => escolher(id);
  return el;
}

function escolher(id) {
  // um toque ja entra: nao tem botao de jogar
  perfil = { marca: id, estilo: 'padrao' };
  try { localStorage.setItem(CHAVE, JSON.stringify(perfil)); } catch (e) {}
  irJogo();
}

function desenhar() {
  const alvo = document.getElementById('marcas');
  alvo.innerHTML = '';
  for (const id in MARCAS) alvo.appendChild(cartao(id, MARCAS[id]));
}

// botao fisico "voltar" do Android volta pra lista de PCs em vez de sair do app
history.pushState({ tela: 'inicio' }, '');
window.addEventListener('popstate', function () {
  if (window.PixelPad && PixelPad.dispositivos) PixelPad.dispositivos();
  history.pushState({ tela: 'inicio' }, '');
});

document.getElementById('meu').onclick = irJogo;
document.getElementById('trocar').onclick = function () {
  if (window.PixelPad && PixelPad.dispositivos) PixelPad.dispositivos();
  else location.href = '/pair';
};
document.getElementById('macros').onclick = function () {
  location.href = '/macros' + qs;
};

desenhar();

// ---------------------------------------------------------------- versao
// A pagina vem sempre do PC (entao o visual se atualiza sozinho), mas o APK
// e instalado a mao e NAO se atualiza sozinho. Aqui a gente compara os dois e
// avisa quando o app do celular ficou pra tras.
function numeros(v) {
  return String(v || '').split('.').map(function (n) { return parseInt(n, 10) || 0; });
}
function maisNovo(a, b) {            // true se a > b
  const x = numeros(a), y = numeros(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const p = x[i] || 0, q = y[i] || 0;
    if (p !== q) return p > q;
  }
  return false;
}

(function () {
  const el = document.getElementById('versao');
  let app = null;
  try { if (window.PixelPad && PixelPad.versao) app = PixelPad.versao(); } catch (e) {}
  const noApp = !!app && app !== '?' && app !== 'null' && app !== '';
  if (!noApp) {
    // navegador (sem app instalado): so mostra a versao do PC
    if (VERSAO_PC) el.textContent = 'PixelPad v' + VERSAO_PC;
    return;
  }
  if (maisNovo(VERSAO_PC, app)) {
    el.className = 'velho';
    el.innerHTML = '&#9888; App desatualizado (v' + app + ') &middot; o PC est&aacute; na v' +
      VERSAO_PC + '<br><b>toque aqui pra atualizar</b>';
    el.onclick = function () {
      if (window.PixelPad && PixelPad.abrir) PixelPad.abrir(location.origin + '/android');
    };
  } else {
    el.textContent = 'app v' + app + '  ·  PC v' + VERSAO_PC;
  }
})();

// esta tela e sempre em pe
if (window.PixelPad && PixelPad.tela) { try { PixelPad.tela('retrato'); } catch (e) {} }
</script>
</body></html>`;
}
