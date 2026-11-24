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

## Requisitos

- **Windows 10/11** (o controle virtual usa XInput)
- **Node.js 20+**
- Driver **[ViGEmBus](https://github.com/nefarius/ViGEmBus/releases)** instalado
  (uma vez, precisa de admin e talvez reiniciar). É o mesmo driver que DS4Windows usa.

## Como rodar

```bash
npm install
npm start
```

O terminal mostra um **QR code**. Escaneie com o celular (mesma rede Wi-Fi) e pronto.

```
Gamepad :  https://192.168.x.x:8443/game?t=<token>
Trackpad:  http://192.168.x.x:8080
```

## Instalar como app no celular

1. Abra `http://<ip>:8080/ca.crt` no celular e instale o certificado
   (Configurações → Segurança → Criptografia e credenciais → Instalar certificado → **CA**)
2. Abra `http://<ip>:8080/app` — ele redireciona pro HTTPS
3. Chrome → menu ⋮ → **Instalar aplicativo**

O certificado é gerado na primeira execução, **só pra sua máquina**, e a chave
privada fica em `certs/` (que nunca vai pro Git).

## Segurança

- Toda conexão de controle exige um **token** (`data/token.txt`), que vai embutido
  no QR code. Sem o token, o WebSocket é recusado.
- O token e os certificados são locais. Não há conta, telemetria ou nuvem.
- Quem estiver na mesma rede **e** tiver o token controla o PC. Em rede pública
  (café, aeroporto), não rode.

## Estrutura

```
src/server.mjs   servidor HTTP/HTTPS + WebSocket + páginas (trackpad e gamepad)
src/vigem.mjs    controle virtual via ViGEmClient.dll (koffi, sem Python/.NET)
src/certs.mjs    gera a CA local e o certificado do servidor na 1a execução
native/          ViGEmClient.dll (x64)
certs/           gerado em runtime - NUNCA versionar
data/            token de pareamento - NUNCA versionar
```

## Roadmap

- [x] gamepad + trackpad + pareamento por QR + PWA instalável
- [ ] descoberta automática do PC na rede (sem digitar IP)
- [ ] executável único para Windows (sem precisar de Node instalado)
- [ ] app Android nativo (mata a etapa do certificado)
- [ ] perfis de layout prontos (FPS, plataforma, emulador)

## Licença

MIT. Use, modifique, publique — só não venda como se fosse seu.
