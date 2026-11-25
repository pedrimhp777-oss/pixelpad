// Presets de layout do gamepad.
//
// Duas dimensoes independentes:
//   MARCA  -> quais simbolos aparecem nos 4 botoes da direita e nos ombros
//   ESTILO -> onde cada controle fica (ergonomia por tipo de jogo)
//
// As posicoes seguem as convencoes dos emuladores de celular:
//   - PPSSPP / AetherSX2 (PSP/PS2): direcional a esquerda, △○✕□ a direita,
//     L/R nos cantos de cima, analógico embaixo a esquerda
//   - Xbox Cloud Gaming / Dolphin: analógico esquerdo em cima, direcional
//     embaixo, A B X Y a direita, gatilhos como barras nos cantos
//   - Snes9x EX+ / RetroArch (Nintendo classico): direcional a esquerda,
//     X em cima / Y a esquerda / A a direita / B embaixo, L e R nos cantos,
//     sem analógico e sem gatilho analógico
//
// Coordenadas em % da tela (x da esquerda, y do topo), s = escala.

export const MARCAS = {
  ps: {
    nome: 'PlayStation',
    grad: ['#1a3f8f', '#2f6df6'],
    resumo: 'triangulo, bola, X, quadrado',
    faces: { y: 'triangle', x: 'square', b: 'circle', a: 'cross' },
    cores: {
      y: ['#10291d', '#4de3a0'], x: ['#341025', '#ff7ac8'],
      b: ['#341018', '#ff6b81'], a: ['#101f34', '#6aa9ff'],
    },
    rotulos: {},
    ocultar: [],
  },
  xbox: {
    nome: 'Xbox',
    grad: ['#0a5c1a', '#2fa84f'],
    resumo: 'A verde, B vermelho, X azul, Y amarelo',
    faces: { y: 'Y', x: 'X', b: 'B', a: 'A' },
    cores: {
      a: ['#0f7b0f', '#ffffff'], b: ['#c62828', '#ffffff'],
      x: ['#1565c0', '#ffffff'], y: ['#c79a00', '#1a1a1a'],
    },
    rotulos: { l1: 'LB', l2: 'LT', r1: 'RB', r2: 'RT', share: 'VIEW', options: 'MENU', ps: 'XBOX' },
    ocultar: [],
  },
  snes: {
    nome: 'Nintendo classico',
    grad: ['#8a1f1f', '#e2453c'],
    resumo: 'X em cima, Y a esquerda, A a direita, B embaixo',
    faces: { y: 'X', x: 'Y', b: 'A', a: 'B' },
    cores: {
      y: ['#2a3f8f', '#cdd6ff'], x: ['#2f7a3f', '#c9f0d2'],
      b: ['#9c2a2a', '#ffd6d6'], a: ['#9c7d10', '#fff0b8'],
    },
    rotulos: { l1: 'L', r1: 'R', ps: 'HOME' },
    // controle de 4 botoes: sem analogico, sem gatilho analogico, sem touchpad
    ocultar: ['ls', 'rs', 'lt', 'rt', 'tp', 'ps'],
  },
};

// estilo -> [x, y, escala]. Quem nao aparece fica oculto.
export const ESTILOS = {
  padrao: {
    nome: 'Padrao',
    grad: ['#a1440a', '#ff8a1f'],
    resumo: 'direcional em cima, analogico embaixo (padrao do PPSSPP)',
    // Numeros vindos do PPSSPP (UI/GamepadEmu.cpp, InitPadLayout) convertidos
    // para % com tela 1600x720: D_pad_Radius=50, spacing=60, scale=1.15.
    // O direcional sobe quando o analogico aparece; o analogico fica logo abaixo.
    nodes: {
      l1: [8, 11, 1], l2: [8, 25, 1], r1: [92, 11, 1], r2: [92, 25, 1],
      du: [9, 44, 1], dd: [9, 67, 1], dl: [4.2, 55.5, 1], dr: [13.8, 55.5, 1],
      ls: [9, 86, 0.8],
      y: [91, 41.5, 1], x: [87.5, 52.5, 1], b: [94.5, 52.5, 1], a: [91, 63.5, 1],
      rs: [91, 86, 0.8],
      tp: [50, 28, 0.9], share: [50, 92, 0.8], options: [58, 92, 0.8], ps: [50, 80, 0.8],
    },
  },
  luta: {
    nome: 'Luta',
    grad: ['#4a1f8a', '#8b5cf6'],
    resumo: 'direcional e 4 botoes grandes, sem analogico no caminho',
    nodes: {
      l1: [9, 7, 1.15], l2: [9, 20, 1.15], r1: [93, 7, 1.15], r2: [93, 20, 1.15],
      du: [15, 48, 1.3], dd: [15, 79, 1.3], dl: [7, 63, 1.3], dr: [23, 63, 1.3],
      y: [83, 27, 1.3], x: [72, 41, 1.3], b: [94, 41, 1.3], a: [83, 56, 1.3],
      share: [45, 92, 0.85], options: [55, 92, 0.85],
    },
  },
  corrida: {
    nome: 'Corrida',
    grad: ['#0f5f6b', '#20b8c9'],
    resumo: 'analogico grande na esquerda, gatilhos largos em cima',
    nodes: {
      ls: [17, 55, 1.45], rs: [58, 84, 0.85],
      l2: [8, 14, 1.4], r2: [92, 14, 1.4], l1: [28, 11, 0.95], r1: [72, 11, 0.95],
      y: [87, 32, 1.1], x: [73, 46, 1.1], b: [95, 46, 1.1], a: [87, 64, 1.1],
      share: [42, 90, 0.8], options: [52, 90, 0.8],
    },
  },
  plataforma: {
    nome: 'Plataforma',
    grad: ['#3f6c10', '#8fd428'],
    resumo: 'direcional na esquerda, pulo grande na direita',
    nodes: {
      du: [15, 44, 1.25], dd: [15, 80, 1.25], dl: [6, 62, 1.25], dr: [24, 62, 1.25],
      y: [86, 30, 1.15], x: [74, 44, 1.15], b: [96, 44, 1.15], a: [86, 59, 1.45],
      l1: [10, 12, 1.1], r1: [90, 12, 1.1],
      share: [45, 92, 0.8], options: [55, 92, 0.8],
    },
  },
};

/** Constroi os nodes de um preset: posicao do estilo + simbolos da marca. */
export function montarNodes(marca, estilo, baseIds) {
  const M = MARCAS[marca] || MARCAS.ps;
  const E = ESTILOS[estilo] || ESTILOS.padrao;
  const nodes = {};
  for (const id of baseIds) nodes[id] = { x: 50, y: 50, s: 1, hid: true };
  for (const id in E.nodes) {
    if (!nodes[id]) continue;
    const v = E.nodes[id];
    nodes[id] = { x: v[0], y: v[1], s: v[2], hid: false };
  }
  for (const id of M.ocultar) if (nodes[id]) nodes[id].hid = true;
  // sem analogico, direcional e botoes descem - e o que o PPSSPP faz quando
  // o stick esta oculto (D_pad_Y = screenBottom - raio, sem o -200 do stick)
  if (nodes.ls && nodes.ls.hid && nodes.rs && nodes.rs.hid) {
    for (const id of ['du', 'dd', 'dl', 'dr', 'y', 'x', 'b', 'a']) {
      if (nodes[id] && !nodes[id].hid) nodes[id].y = Math.min(92, nodes[id].y + 18);
    }
  }
  return { nodes, marca: M, estilo: E };
}
/** Trecho de JS embutido nas paginas (dados puros, sem funcao). */
export function dadosJS() {
  return 'const MARCAS = ' + JSON.stringify(MARCAS) + ';\nconst ESTILOS = ' + JSON.stringify(ESTILOS) + ';';
}
