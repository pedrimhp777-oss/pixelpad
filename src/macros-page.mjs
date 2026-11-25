// Tela de macros (/macros), em retrato.
//
// Macro e um botao extra no controle que executa uma sequencia: cada passo
// segura um conjunto de botoes por um tempo; passo sem botao e pausa.
//
// Fica fora da tela de jogo de proposito: quem esta jogando nao quer configurar
// combo no meio da partida. Chega-se aqui pela tela inicial, e o botao criado
// aparece em todos os estilos de controle.

import { MARCAS, dadosJS } from './presets.mjs';

export function macrosPage({ SVG, nome = '' }) {
  return String.raw`<!doctype html><html lang="pt-BR"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="theme-color" content="#0a0b0e">
<title>PixelPad - macros</title>
<style>
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body { margin: 0; height: 100%; background: #0a0b0e; color: #e9ecf1;
    font-family: system-ui, -apple-system, sans-serif; user-select: none; -webkit-user-select: none; }
  body { overflow: hidden; }

  .wrap { height: 100%; display: flex; flex-direction: column; padding: 18px 16px 14px; overflow: hidden; }
  .topo { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
  #voltar { width: 40px; height: 40px; border-radius: 12px; border: 1px solid #1e2836;
    background: #141a24; color: #8a94a3; font-size: 19px; line-height: 1; flex: none; }
  .topo h1 { margin: 0; font-size: 21px; font-weight: 800; letter-spacing: .3px; }

  .sombra { position: fixed; inset: 0; background: rgba(5,7,10,.72); display: none; z-index: 50;
    align-items: center; justify-content: center; padding: 24px; animation: surgir .12s ease-out; }
  .sombra.aberto { display: flex; }
  @keyframes surgir { from { opacity: 0 } to { opacity: 1 } }
  .dialogo { background: #171e2a; border: 1px solid #232f40; border-radius: 20px; padding: 22px 20px 16px;
    max-width: 320px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,.65);
    animation: subir .14s ease-out; }
  @keyframes subir { from { transform: scale(.94); opacity: 0 } to { transform: scale(1); opacity: 1 } }
  .dialogo h3 { margin: 0 0 8px; font-size: 17px; font-weight: 800; }
  .dialogo p { margin: 0 0 18px; font-size: 13px; line-height: 1.5; color: #97a3b4; }
  .dialogo .botoes { display: flex; gap: 10px; }
  .dialogo button { flex: 1; padding: 13px; border-radius: 13px; border: 0; font: inherit;
    font-size: 14px; font-weight: 700; }
  #dCancelar { background: #101620; color: #97a3b4; border: 1px solid #232f40; }
  #dAcao { background: #e0453f; color: #fff; }
  #dAcao.neutro { background: #2f6df6; }
  .dialogo button:active { transform: scale(.98); }

  .intro { background: #171e2a; border: 1px solid #222c3c; border-radius: 18px; padding: 16px;
    display: flex; flex-direction: column; gap: 10px; flex: none; }
  .intro .cabeca { display: flex; align-items: center; gap: 12px; }
  .raio { width: 42px; height: 42px; border-radius: 50%; background: #3a3320; color: #ffd34d;
    display: grid; place-items: center; font-size: 19px; flex: none; }
  .intro b { font-size: 17px; font-weight: 800; }
  .intro p { margin: 0; font-size: 12.5px; line-height: 1.5; color: #97a3b4; }

  .rolagem { flex: 1; overflow-y: auto; margin: 14px -2px 0; padding: 0 2px; }
  .mac { background: #171e2a; border: 1px solid #222c3c; border-radius: 16px; padding: 14px 16px;
    margin-bottom: 10px; display: flex; align-items: center; gap: 12px; }
  .mac .txt { flex: 1; min-width: 0; }
  .mac b { display: block; font-size: 16px; font-weight: 800; margin-bottom: 3px; }
  .mac small { display: block; font-size: 12px; color: #8a94a3; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis; }
  .mac small i { color: #ff9a3c; font-style: normal; }
  .mac button { width: 38px; height: 38px; border-radius: 11px; border: 1px solid #222c3c;
    background: #101620; color: #c3ccd9; font-size: 15px; flex: none; }
  .mac button:active { background: #1b2431; }
  .mac button.lixo { color: #ff8f86; }
  .vazio { text-align: center; color: #4b5766; font-size: 13px; padding: 26px 10px; line-height: 1.6; }

  #nova { margin-top: 12px; flex: none; background: #2f6df6; color: #fff; border: 0; border-radius: 14px;
    padding: 15px; font-family: inherit; font-size: 15px; font-weight: 800; letter-spacing: .3px; }
  #nova:active { transform: scale(.99); }

  /* ---------------- editor ---------------- */
  #editor { position: fixed; inset: 0; background: #0a0b0e; display: none; flex-direction: column; z-index: 10; }
  #editor.aberto { display: flex; }
  #editor .topo { padding: 18px 16px 8px; margin: 0; }
  #fNome { margin: 0 16px; width: calc(100% - 32px); background: #101620; border: 1px solid #2b3a4d;
    color: #e9ecf1; border-radius: 14px; padding: 14px 16px; font: inherit; font-size: 15px; }
  #fNome:focus { outline: 0; border-color: #2f6df6; }

  .turbo { display: flex; align-items: center; gap: 12px; padding: 14px 18px; }
  .turbo .txt { flex: 1; }
  .turbo b { display: block; font-size: 13.5px; font-weight: 600; color: #dfe5ee; }
  .turbo small { font-size: 11.5px; color: #7d8797; line-height: 1.4; }
  .sw { position: relative; width: 50px; height: 30px; flex: none; }
  .sw input { position: absolute; opacity: 0; width: 100%; height: 100%; margin: 0; }
  .sw span { position: absolute; inset: 0; border-radius: 30px; background: #2a3442; transition: background .15s; }
  .sw span::after { content: ''; position: absolute; top: 3px; left: 3px; width: 24px; height: 24px;
    border-radius: 50%; background: #8a94a3; transition: transform .15s, background .15s; }
  .sw input:checked + span { background: #2f6df6; }
  .sw input:checked + span::after { transform: translateX(20px); background: #fff; }

  #passos { flex: 1; overflow-y: auto; padding: 6px 16px 4px; }
  .passo { background: #141b26; border: 1px solid #1f2a39; border-radius: 16px; padding: 12px 14px;
    margin-bottom: 10px; }
  .passo .cab { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .passo .cab b { font-size: 13.5px; color: #c3ccd9; flex: 1; }
  .passo .cab em { font-style: normal; font-size: 12.5px; font-weight: 700; color: #ff9a3c; }
  .passo .cab button { width: 30px; height: 30px; border-radius: 9px; border: 0; background: transparent;
    color: #7d8797; font-size: 14px; }
  .grade { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; }
  .grade button { height: 40px; border-radius: 11px; border: 1px solid #2b3a4d; background: #101620;
    color: #c3ccd9; font-family: inherit; font-size: 12.5px; font-weight: 700; letter-spacing: .3px;
    display: grid; place-items: center; padding: 0; }
  .grade button svg { width: 17px; height: 17px; }
  .grade button.on { background: #2f6df6; border-color: #2f6df6; color: #fff; }
  .grade button.vazioBt { border-style: dashed; border-color: #1f2a39; background: transparent; }
  input[type=range] { -webkit-appearance: none; appearance: none; width: 100%; height: 26px;
    background: transparent; margin: 8px 0 0; }
  input[type=range]::-webkit-slider-runnable-track { height: 6px; border-radius: 6px; background: #24344b; }
  input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 22px; height: 22px;
    border-radius: 50%; background: #ff9a3c; margin-top: -8px; border: 0; }

  #mais { margin: 2px 16px 8px; background: transparent; border: 1px dashed #2b3a4d; color: #7d8797;
    border-radius: 14px; padding: 13px; font-family: inherit; font-size: 13.5px; font-weight: 700; }
  .acoes { display: flex; gap: 10px; padding: 10px 16px 16px; }
  .acoes button { flex: 1; border: 0; border-radius: 14px; padding: 15px; font-family: inherit;
    font-size: 14.5px; font-weight: 800; }
  #cancelar { background: #141a24; color: #8a94a3; border: 1px solid #1e2836 !important; }
  #salvar { background: #2f6df6; color: #fff; }
</style></head><body>
<div class="wrap">
  <div class="topo">
    <button id="voltar">&#8592;</button>
    <h1>Macros</h1>
  </div>

  <div class="intro">
    <div class="cabeca">
      <div class="raio">&#9889;</div>
      <b>Macros</b>
    </div>
    <p>Uma macro é um botão seu na tela que executa uma sequência: um combo, ou vários
    botões ao mesmo tempo. Cada passo segura os botões por um tempo; um passo sem
    botões é uma pausa.</p>
  </div>

  <div class="rolagem"><div id="lista"></div></div>
  <button id="nova">+ Nova macro</button>
</div>

<div id="editor">
  <div class="topo">
    <button id="fechar">&#8592;</button>
    <h1 id="titulo">Nova macro</h1>
  </div>
  <input id="fNome" maxlength="14" placeholder="Nome" autocomplete="off" spellcheck="false">
  <label class="turbo">
    <div class="txt">
      <b>Repetir enquanto segura</b>
      <small>Executa de novo enquanto o botão estiver apertado (turbo)</small>
    </div>
    <span class="sw"><input type="checkbox" id="fTurbo"><span></span></span>
  </label>
  <div id="passos"></div>
  <button id="mais">+ Adicionar passo</button>
  <div class="acoes">
    <button id="cancelar">Cancelar</button>
    <button id="salvar">Salvar</button>
  </div>
</div>

<div class="sombra" id="sombra">
  <div class="dialogo" role="dialog" aria-modal="true">
    <h3 id="dTitulo">Apagar macro?</h3>
    <p id="dTexto"></p>
    <div class="botoes">
      <button id="dCancelar">Cancelar</button>
      <button id="dAcao">Apagar</button>
    </div>
  </div>
</div>

<script>
const SVGS = ` + JSON.stringify(SVG) + `;
` + dadosJS() + `
if (window.PixelPad && PixelPad.tela) { try { PixelPad.tela('retrato'); } catch (e) {} }

const CHAVE = 'pixelpadMacros';
const qs = location.search || '';
let perfil = { marca: 'ps' };
try { const j = JSON.parse(localStorage.getItem('pixelpadPerfil')); if (j && MARCAS[j.marca]) perfil = j; } catch (e) {}
const M = MARCAS[perfil.marca] || MARCAS.ps;

// ordem da grade igual a dos emuladores: faces, ombros, direcional, start/select
const BOTOES = [
  ['a', 'b', 'x', 'y'],
  ['lb', 'rb', 'lt', 'rt'],
  ['du', 'dd', 'dl', 'dr'],
  ['start', 'back'],
];
const ROTULO = {
  lb: function () { return (M.rotulos && M.rotulos.l1) || 'L1'; },
  rb: function () { return (M.rotulos && M.rotulos.r1) || 'R1'; },
  lt: function () { return (M.rotulos && M.rotulos.l2) || 'L2'; },
  rt: function () { return (M.rotulos && M.rotulos.r2) || 'R2'; },
  du: function () { return '\u2191'; }, dd: function () { return '\u2193'; },
  dl: function () { return '\u2190'; }, dr: function () { return '\u2192'; },
  start: function () { return (M.rotulos && M.rotulos.options) || 'START'; },
  back: function () { return (M.rotulos && M.rotulos.share) || 'SELECT'; },
};
function rotulo(b) {
  if (ROTULO[b]) return ROTULO[b]();
  const sym = M.faces[b];
  const svg = SVGS[sym];
  return svg ? svg : (sym || b).toString().toUpperCase();
}
function rotuloTexto(b) {
  if (['a', 'b', 'x', 'y'].indexOf(b) < 0) return (ROTULO[b] ? ROTULO[b]() : b).toString();
  return { a: '\u2715', b: '\u25CB', x: '\u25A1', y: '\u25B3' }[b] || b;
}

let macros = [];
try { macroCarregar(); } catch (e) { macros = []; }
function macroCarregar() {
  const j = JSON.parse(localStorage.getItem(CHAVE) || '[]');
  macros = Array.isArray(j) ? j.filter(m => m && m.id) : [];
}
function macroSalvar() {
  try { localStorage.setItem(CHAVE, JSON.stringify(macros)); } catch (e) {}
}

// ---------------------------------------------------------------- lista
function resumo(m) {
  const partes = m.passos.map(function (p) {
    const b = (p.b || []).map(rotuloTexto).join('+');
    return (b ? b : 'pausa') + ' <i>' + p.ms + 'ms</i>';
  });
  return partes.join(' \u00b7 ');
}

function desenharLista() {
  const alvo = document.getElementById('lista');
  if (!macros.length) {
    alvo.innerHTML = '<p class="vazio">Nenhuma macro ainda.<br>Toque em <b>+ Nova macro</b> pra criar a primeira.</p>';
    return;
  }
  alvo.innerHTML = '';
  macros.forEach(function (m) {
    const d = document.createElement('div');
    d.className = 'mac';
    d.innerHTML = '<div class="txt"><b>' + esc(m.nome || 'MACRO') + '</b>'
      + '<small>' + resumo(m) + '</small></div>'
      + '<button class="lapis" title="editar">&#9998;</button>'
      + '<button class="lixo" title="apagar">&#128465;</button>';
    d.querySelector('.lapis').onclick = function () { abrir(m.id); };
    d.querySelector('.lixo').onclick = function () { apagar(m.id); };
    alvo.appendChild(d);
  });
}

function esc(t) {
  return String(t).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}

// ---------------------------------------------------------------- confirmacao
let acaoPendente = null;

function pedirConfirmacao(o) {
  document.getElementById('dTitulo').textContent = o.titulo;
  document.getElementById('dTexto').textContent = o.texto;
  const b = document.getElementById('dAcao');
  b.textContent = o.acao || 'Apagar';
  b.classList.toggle('neutro', !!o.neutro);
  acaoPendente = o.aoConfirmar;
  document.getElementById('sombra').classList.add('aberto');
  try { history.pushState({ dialogo: 1 }, ''); } catch (e) {}
}

function fecharDialogo(peloHistorico) {
  document.getElementById('sombra').classList.remove('aberto');
  acaoPendente = null;
  if (!peloHistorico && history.state && history.state.dialogo) {
    try { history.back(); } catch (e) {}
  }
}

document.getElementById('dCancelar').onclick = function () { fecharDialogo(false); };
document.getElementById('dAcao').onclick = function () {
  const acao = acaoPendente;
  fecharDialogo(false);
  if (acao) acao();
};
document.getElementById('sombra').addEventListener('pointerdown', function (ev) {
  if (ev.target.id === 'sombra') fecharDialogo(false);
});

function apagar(id) {
  const m = macros.find(function (x) { return x.id === id; });
  pedirConfirmacao({
    titulo: 'Apagar macro?',
    texto: '"' + ((m && m.nome) || 'MACRO') + '" sai do controle. Você pode criar outra igual depois.',
    acao: 'Apagar',
    aoConfirmar: function () {
      macros = macros.filter(function (x) { return x.id !== id; });
      macroSalvar();
      desenharLista();
      if (navigator.vibrate) navigator.vibrate(12);
    },
  });
}

// ---------------------------------------------------------------- editor
let editando = null;   // { id, nome, turbo, passos }

function abrir(id) {
  const m = id ? macros.find(function (x) { return x.id === id; }) : null;
  editando = m
    ? JSON.parse(JSON.stringify(m))
    : { id: 'm' + Date.now().toString(36), nome: '', turbo: false, passos: [] };
  if (!editando.passos.length) editando.passos.push({ b: [], ms: 100 });
  document.getElementById('titulo').textContent = m ? 'Editar macro' : 'Nova macro';
  document.getElementById('fNome').value = editando.nome || '';
  document.getElementById('fTurbo').checked = !!editando.turbo;
  document.getElementById('editor').classList.add('aberto');
  desenharPassos();
  // o voltar do Android fecha o editor em vez de sair da tela
  try { history.pushState({ editor: 1 }, ''); } catch (e) {}
}

function fechar() {
  document.getElementById('editor').classList.remove('aberto');
  editando = null;
  if (history.state && history.state.editor) { try { history.back(); } catch (e) {} }
}

window.addEventListener('popstate', function () {
  if (document.getElementById('sombra').classList.contains('aberto')) {
    fecharDialogo(true);
    return;
  }
  if (document.getElementById('editor').classList.contains('aberto')) {
    document.getElementById('editor').classList.remove('aberto');
    editando = null;
  }
});

function desenharPassos() {
  const alvo = document.getElementById('passos');
  alvo.innerHTML = '';
  editando.passos.forEach(function (p, i) {
    const d = document.createElement('div');
    d.className = 'passo';

    const cab = document.createElement('div');
    cab.className = 'cab';
    cab.innerHTML = '<b>Passo ' + (i + 1) + '</b><em>' + p.ms + ' ms</em>'
      + '<button title="apagar passo">&#128465;</button>';
    cab.querySelector('button').onclick = function () {
      editando.passos.splice(i, 1);
      if (!editando.passos.length) editando.passos.push({ b: [], ms: 100 });
      desenharPassos();
    };
    d.appendChild(cab);

    const grade = document.createElement('div');
    grade.className = 'grade';
    BOTOES.forEach(function (linha) {
      linha.forEach(function (b) {
        const bt = document.createElement('button');
        bt.innerHTML = rotulo(b);
        if ((p.b || []).indexOf(b) >= 0) bt.classList.add('on');
        bt.onclick = function () {
          p.b = p.b || [];
          const k = p.b.indexOf(b);
          if (k >= 0) p.b.splice(k, 1); else p.b.push(b);
          bt.classList.toggle('on');
        };
        grade.appendChild(bt);
      });
    });
    // completa a ultima linha (2 botoes) pra grade nao ficar torta
    for (let i2 = 0; i2 < 2; i2++) {
      const v = document.createElement('button');
      v.className = 'vazioBt';
      v.disabled = true;
      grade.appendChild(v);
    }
    d.appendChild(grade);

    const faixa = document.createElement('input');
    faixa.type = 'range';
    faixa.min = '20'; faixa.max = '1000'; faixa.step = '10';
    faixa.value = String(Math.min(1000, Math.max(20, p.ms || 100)));
    faixa.oninput = function () {
      p.ms = parseInt(faixa.value, 10);
      cab.querySelector('em').textContent = p.ms + ' ms';
    };
    d.appendChild(faixa);

    alvo.appendChild(d);
  });
}

document.getElementById('nova').onclick = function () { abrir(null); };
document.getElementById('mais').onclick = function () {
  editando.passos.push({ b: [], ms: 100 });
  desenharPassos();
  const pr = document.getElementById('passos');
  pr.scrollTop = pr.scrollHeight;
};
document.getElementById('fechar').onclick = fechar;
document.getElementById('cancelar').onclick = fechar;
document.getElementById('salvar').onclick = function () {
  const nome = (document.getElementById('fNome').value || '').trim();
  editando.nome = (nome || 'MACRO').toUpperCase().slice(0, 14);
  editando.turbo = document.getElementById('fTurbo').checked;
  editando.passos = editando.passos.filter(function (p) { return (p.b && p.b.length) || p.ms > 0; });
  if (!editando.passos.length) editando.passos = [{ b: [], ms: 100 }];
  const i = macros.findIndex(function (m) { return m.id === editando.id; });
  if (i >= 0) macros[i] = editando; else macros.push(editando);
  macroSalvar();
  fechar();
  desenharLista();
};

document.getElementById('voltar').onclick = function () {
  location.href = '/inicio' + qs;
};

desenharLista();
</script>
</body></html>`;
}
