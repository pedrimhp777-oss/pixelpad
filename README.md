# PixelPad

Seu celular vira **controle de Xbox** e **trackpad** do PC, pela rede local.
Sem cabo, sem nuvem, sem conta, sem instalar nada no celular.

Latência medida: **~1 ms** entre o toque na tela e o jogo receber o comando.

---

## Por que é rápido

```
celular --Wi-Fi--> seu PC --ViGEm(kernel)--> jogo
```

Não passa pela internet, não tem servidor no meio, não tem compressão de vídeo.
O estado do controle é enviado a **60 Hz** por WebSocket e aplicado por um driver
de kernel local. É por isso que funciona melhor que serviços de nuvem: eles não
têm como competir com 30 cm de Wi-Fi.

## O que você consegue fazer

| Recurso | Onde |
|---|---|
| Gamepad Xbox 360 virtual (analógicos, gatilhos, direcional) | `/game` |
| Layout estilo DualShock 4, deitado | `/game` |
| Trackpad: cursor, clique, rolagem com 2 dedos | `/` |
| Volume, mudo, play/pause do PC | `/` |
| Editar posição e tamanho de cada botão (salvo no celular) | `/game` → Editar |
| Instalar como app na tela inicial | `/app` |

## Instalação sem dor (Windows)

Baixe o **PixelPad-Setup-x.y.z.exe** em [Releases](https://github.com/pedrimhp777-oss/pixelpad/releases),
clique duas vezes, avançar, instalar. O instalador já traz o Node embutido: não precisa
instalar Node, nem abrir terminal, nem instalar certificado.

Ele cria o atalho, libera o firewall, pergunta se quer iniciar junto com o Windows e
abre a página com o QR code no final.

Prefere não instalar nada? Baixe o `.zip` portátil, descompacte e rode `PixelPad.vbs`.

> O instalador usa o Node LTS oficial (licença MIT, incluída no pacote).

## Conectar em qual PC

Antes de tudo, o app pergunta **em qual computador** você quer conectar. Ele
escuta a rede local e lista todos os PCs que estão rodando o PixelPad:

```
Notebook da sala
192.168.3.99  ·  1 de 2 controles conectados  ·  v0.8.0

PC do Pedro
192.168.3.12  ·  livre  ·  v0.8.0
```

Tocar no nome conecta. Serve pra quem tem dois PCs em casa e pra não conectar
no PixelPad errado quando tem mais de um na mesma rede Wi-Fi.

**O nome é você que escolhe.** Na página que abre no PC (`/pair`) tem o campo
**Nome deste PC** — o que você escrever ali é o que aparece no celular.

A mesma página mostra **quem está conectado agora**: P1 em azul, P2 em vermelho,
o IP do celular e há quanto tempo. Se o celular cair, some da lista na hora.

O app **não conecta sozinho**: quem escolhe é você, no toque. Numa rede com
mais de um PixelPad (ou num lugar público), entrar sozinho no PC errado seria pior.

## Estilo do controle (tela inicial)

O celular abre **em pé**, com os três estilos em cards. **Tocar no card já entra
no controle** — não tem botão de jogar. Quando o gamepad abre, a tela deita sozinha.

| Perfil | Direita | Ombros | Esconde |
|---|---|---|---|
| PlayStation | △ ○ ✕ □ | L1 L2 R1 R2, SHARE, OPTIONS | — |
| Xbox | A verde, B vermelho, X azul, Y amarelo | LB LT RB RT, VIEW, MENU | — |
| Nintendo clássico | X em cima, Y à esquerda, A à direita, B embaixo | L e R | analógicos, gatilhos analógicos, touchpad, PS |

O perfil usado por último aparece com a borda branca.

Embaixo ficam dois atalhos: **meu layout atual** (entra sem aplicar preset, mantendo
o que você arrumou) e **trocar de PC** (volta pra lista de computadores).

No canto de cima fica o **⚡** — é por ele que se chega nas [macros](#macros-combos).

### De onde vieram as posições

O layout padrão não é chute: saiu do código-fonte do [PPSSPP](https://github.com/hrydgard/ppsspp)
(`UI/GamepadEmu.cpp`, função `InitPadLayout`, com `D_pad_Radius = 50`,
`baseActionButtonSpacing = 60` e `scale = 1.15`):

```
D-pad .......... X = 2.5 * raio, Y = base - raio - 200 (sobe quando tem analógico)
Analógico ...... mesma X do d-pad, Y = base - 80   ← "right below the D pad"
Botões ......... X = largura - 2*espaçamento, Y = base - 2*espaçamento - 150
Analógico dir. . mesma X dos botões, Y = base - 80
Start/Select ... centro, embaixo
```

Ou seja: **direcional em cima e analógico logo abaixo** — o contrário do que a
maioria chuta ao montar um controle na tela, e é o que os emuladores fazem porque
o polegar alcança o analógico sem soltar o celular.

Quando a marca esconde os analógicos (Nintendo clássico), o direcional e os botões
descem — reproduzindo o mesmo ajuste que o PPSSPP faz ao ocultar o stick.

> Os presets de tipo de jogo (luta, corrida, plataforma) saíram da tela na 0.8.0:
> atrapalhavam mais do que ajudavam. O código deles continua em `src/presets.mjs`,
> inativo, caso voltem um dia.

## Editor de layout

Toque em **✎ Editar** e os controles ficam translúcidos, pra você ver o jogo atrás
deles enquanto arruma. A barra do editor fica no **canto superior esquerdo**, fora
do caminho do polegar:

- **arraste** qualquer botão pra mover (as 4 setas andam juntas, como um bloco só)
- **−** e **+** mudam o tamanho do botão selecionado
- **👁** oculta o botão (útil pra tirar o que você nunca usa do caminho)
- **↻** volta tudo pro lugar de fábrica
- **✓** sai do editor

Cada botão é independente: pode afastar o △ do ○, subir o analógico, encolher o
L2. Tudo fica salvo no celular e volta igual na próxima vez.

As setas do direcional são **um bloco**: ao selecionar uma, as quatro ficam
selecionadas. O **−** e **+** mudam o tamanho *e* a distância entre elas na mesma
proporção, então o cruzamento cresce sem as setas se encostarem — e se o bloco
passar da borda da tela, ele é empurrado de volta pra dentro sozinho.

O tamanho dos botões é em `vmin` (porção do menor lado da tela), então num celular
16:9, num 20:9 e num tablet 16:10 eles ocupam sempre a mesma fração da tela. Em
telas menos largas (tablet, 4:3) um ajuste automático encolhe um pouco os botões
pra nada encostar na borda.

> Quem já tinha um layout salvo antigo recebe o layout novo uma única vez na
> versão 0.10.0 (`pixelpadLayoutV4`), porque o antigo tinha as setas sobrepostas.

## Macros (combos)

A macro não se configura mais no meio do jogo: na **tela inicial**, toque no
**⚡** no canto de cima. Abre a tela de macros, com a explicação e a lista:

```
M1                                  ✎  🗑
✕+L1 100ms
```

**+ Nova macro** abre o editor:

- **Nome**
- **Ícone** — 12 opções + o 🎲 que sorteia um, pra diferenciar cada macro de relance
- **Repetir enquanto segura** — turbo: repete a sequência enquanto o botão estiver
  apertado
- **Passo 1, 2, 3…** — em cada passo você toca nos botões que devem ser segurados
  juntos (aceita vários) e arrasta a barra pra definir o tempo em ms
- passo sem nenhum botão = pausa, pra dar respiro entre as partes do combo
- **+ Adicionar passo** quantas vezes quiser, **Salvar**

Cada macro salva vira **um botão redondo no controle, em todos os estilos**, com o
ícone escolhido na criação (⚡ 🔥 🎯 🐉 …). Ele aparece no meio-esquerda da tela e você arrasta/dimensiona como qualquer outro
botão. Apertar dispara a sequência.

A sequência é executada **no PC**, não no celular — o intervalo entre os comandos
é preciso mesmo com o Wi-Fi ocupado. Medido aqui: 120ms de passo repetindo a
~150ms com o turbo ligado.

## Modo menu x modo jogo

O controle **sempre abre no modo MENU**, com os analógicos escondidos — que é o
que você precisa pra navegar em menu de jogo ou launcher. O botão **JOGO/MENU** no
topo troca pro controle completo.

Cada modo é editável e guardado separado: arrume o de menu com o ✎, vá pro JOGO,
arrume de novo — os dois ficam como você deixou.

## Dois jogadores (P1 e P2)

Conecte **até dois celulares** ao mesmo tempo, cada um com o seu controle:

- o primeiro que conectar vira **P1** (controle virtual número 1)
- o segundo vira **P2** (controle virtual número 2)
- o terceiro é recusado com um aviso na tela — dois é o limite
- cada tela mostra o seu P1/P2 no rodapé, então ninguém se confunde

Os controles virtuais só existem enquanto o celular está conectado: quando um sai,
o Windows deixa de ver aquele controle e a vaga fica livre para o próximo.

Quem conecta primeiro pega P1. Para trocar, feche o app do P1 e reconecte na ordem
que quiser. Funciona com dois celulares, ou um celular + o navegador do PC.

## App Android (recomendado)

O app tira o navegador da jogada: abre em tela cheia, em pé, lista os PCs que estão
rodando o PixelPad na rede e deixa você escolher. Sem QR, sem digitar IP, sem certificado.

1. Deixe o PixelPad aberto no PC
2. No celular, abra `http://<ip>:8080/android` — o próprio PC entrega o APK
3. O Chrome avisa sobre arquivo perigoso: aceite, é o APK
4. Autorize "instalar apps de fontes desconhecidas" para o Chrome e instale

Também está nos Releases como `PixelPad-x.y.z.apk` (20 KB). Requer Android 5.0+.

> O APK é assinado com uma chave local (`data/android.keystore`), não com uma
> chave de loja. Por isso o Android mostra o aviso de fonte desconhecida — normal
> para app fora da Play Store. Instalar versão nova é só instalar por cima.

## Requisitos

- **Windows 10/11** (o controle virtual usa XInput)
- **Node.js 20+**
- Driver **[ViGEmBus](https://github.com/nefarius/ViGEmBus/releases)** instalado
  (uma vez, precisa de admin e talvez reiniciar). É o mesmo driver que DS4Windows usa.

## Rodando pelo código (desenvolvimento)

```bash
npm install
npm start
```

Para gerar os pacotes distribuíveis:

```bash
npm run build
```

O terminal mostra um **QR code**. Escaneie com o celular (mesma rede Wi-Fi) e pronto.
Não precisa instalar certificado pra jogar: o QR aponta pro HTTP.

```
Gamepad :  http://192.168.x.x:8080/game?t=<token>
Trackpad:  http://192.168.x.x:8080
```

Se preferir, abra `http://127.0.0.1:8080/pair` no PC pra ver o QR na tela.

## Instalar como app no celular (opcional)

O gamepad funciona direto pelo navegador. Instalar como app só serve pra abrir
com um toque e ficar em tela cheia — e pra isso o Chrome exige HTTPS.

1. Abra `http://<ip>:8080/ca.crt` no celular e instale o certificado
   (Configurações → Segurança → Criptografia e credenciais → Instalar certificado → **CA**)
2. Abra `http://<ip>:8080/app` — ele redireciona pro HTTPS
3. Chrome → menu ⋮ → **Instalar aplicativo**

A CA e o certificado do servidor são gerados na primeira execução, **só pra sua
máquina**, e são refeitos sozinhos quando o IP do PC muda. A chave privada fica em
`certs/` (que nunca vai pro Git).

## Segurança

- Toda conexão de controle exige um **token** (`data/token.txt`), que vai embutido
  no QR code. Sem o token, o WebSocket é recusado.
- O token e os certificados são locais. Não há conta, telemetria ou nuvem.
- Quem estiver na mesma rede **e** tiver o token controla o PC. Em rede pública
  (café, aeroporto), não rode.

## Estrutura

```
src/server.mjs   servidor HTTP/HTTPS + WebSocket + descoberta UDP + macros
src/start-page.mjs  tela inicial em retrato (3 estilos)
src/macros-page.mjs tela de macros (lista + editor de passos)
src/game-page.mjs   o controle em si
src/presets.mjs     marcas (símbolos) e estilos (posições)
src/vigem.mjs    controle virtual via ViGEmClient.dll (koffi, sem Python/.NET)
src/certs.mjs    CA local + certificado do servidor assinado por ela (node-forge)
app-android/     app Android (Java puro, WebView + descoberta UDP)
tools/           build.mjs (instalador) e build-apk.mjs (APK sem Gradle)
native/          ViGEmClient.dll (x64)
certs/           gerado em runtime - NUNCA versionar
data/            token de pareamento - NUNCA versionar
```

## Roadmap

- [x] gamepad + trackpad + pareamento por QR + PWA instalável
- [x] descoberta automática do PC na rede (UDP broadcast)
- [x] instalador Windows com Node embutido
- [x] app Android nativo (mata a etapa do certificado)
- [x] macros configuráveis fora do jogo, com turbo
- [x] escolher em qual PC conectar (mais de um na mesma rede)
- [ ] vibração/háptica no celular ao apertar botão
- [x] dois celulares ao mesmo tempo (P1 e P2)
- [ ] vibração do controle virtual (o celular vibrar)

## Licença

MIT. Use, modifique, publique — só não venda como se fosse seu.
