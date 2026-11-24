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

## App Android (recomendado)

O app tira o navegador da jogada: abre em tela cheia, acha o PC sozinho na rede e
reconecta sozinho na próxima vez. Sem QR, sem digitar IP, sem certificado.

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
src/server.mjs   servidor HTTP/HTTPS + WebSocket + descoberta UDP + páginas
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
- [ ] perfis de layout prontos (FPS, plataforma, emulador)
- [ ] vibração/háptica no celular ao apertar botão
- [ ] suporte a mais de um celular ao mesmo tempo (multiplayer local)

## Licença

MIT. Use, modifique, publique — só não venda como se fosse seu.
