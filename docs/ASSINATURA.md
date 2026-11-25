# Assinar o PixelPad (para tirar o alerta do SmartScreen)

O build **já está pronto** para assinar: `tools/build.mjs` assina o instalador, o
`native/ViGEmClient.dll` (que é redistribuído com ele) e o addon nativo do koffi.
Falta só o certificado. Este documento é o passo a passo.

---

## 1. Por que isso resolve

O Windows mostra dois avisos diferentes:

| Aviso | O que ele olha | Resolve com assinatura? |
|---|---|---|
| **SmartScreen** — "O Windows protegeu o seu PC" | assinatura digital + reputação do arquivo | **sim** (é o único jeito) |
| **Antivírus** — "Wacatac", "Trojan:Win32/…!ml" | comportamento (heuristics/ML) | ajuda muito, mas não 100% |

Assinado, o arquivo passa a mostrar o **seu nome** como editor e o SmartScreen para de
bloquear na hora (com certificado EV) ou em pouco tempo (com OV, ganhando reputação
conforme as pessoas baixam).

**Certificado autoassinado não resolve** — o Windows não confia nele.

---

## 2. Qual caminho pegar

Três opções, da mais barata para a mais "empresarial". Confira as condições atuais de
cada uma no site, porque elas mudam.

### A) SignPath.io — Open Source (grátis)

Feito para projeto open source. Eles assinam **no CI deles** (GitHub Actions), então o
build precisa rodar no GitHub Actions — e não na sua máquina.

- Pedido: <https://signpath.io/solutions/open-source/>
- Exige: repositório público, licença aprovada pela OSI (o nosso é **MIT**, serve),
  projeto com alguma atividade e um maintainer identificável.
- Como funciona: você instala o GitHub App deles no repositório, cria uma *signing
  policy* e o build passa a chamar a ação deles, que devolve o artefato assinado.
- **Consequência prática**: precisaríamos mover o build pro GitHub Actions (Inno Setup
  + Node + as ferramentas do Android). É trabalho, mas é o caminho grátis mais sólido.

### B) Certum — Open Source Code Signing (grátis)  ← mais simples pra nós

Certificado de código de verdade, emitido para projeto open source, **usado na sua
máquina** com `signtool` — encaixa direto no build atual, sem CI.

- Pedido: <https://certum.store/en/for-open-source/>
- Exige: domínio/repositório público (o GitHub serve), licença livre, documento de
  identidade do responsável e um pedido descrevendo o projeto.
- Entrega um certificado (no SimplySign / nuvem deles) que o `signtool` usa.
- Depois de aprovado, é só rodar o build com as variáveis do item 3.

### C) Azure Trusted Signing (barato, mensal)

PKI da própria Microsoft, assinatura automática, ótimo para CI.

- <https://azure.microsoft.com/products/trusted-signing>
- Exige conta Azure + validação de identidade (pessoa física ou empresa).
- Depois de configurado, o build usa `PIXELPAD_SIGN_DLIB` + `PIXELPAD_SIGN_METADATA`.

> **Recomendação:** tente o **B (Certum)** primeiro pelo encaixe com o build atual; se
> não rolar, o **A (SignPath)**; o **C** é o mais confortável se você já usa Azure.

---

## 3. Rodar o build assinando

Depois de ter o certificado, uma das três formas:

```powershell
# 1) arquivo .pfx (Certum, Sectigo, etc.)
$env:PIXELPAD_CERT      = 'C:\certs\pixelpad.pfx'
$env:PIXELPAD_CERT_PASS = 'senha-do-pfx'
npm run build:all
```

```powershell
# 2) certificado instalado no Windows (store do usuário ou da máquina)
$env:PIXELPAD_CERT_SUBJECT = 'PixelPad'      # ou o nome exato do sujeito
npm run build:all
```

```powershell
# 3) Azure Trusted Signing
$env:PIXELPAD_SIGN_DLIB     = 'C:\...\Azure.CodeSigning.Dlib.dll'
$env:PIXELPAD_SIGN_METADATA = 'C:\...\metadata.json'
npm run build:all
```

Extras:

- `PIXELPAD_TIMESTAMP` troca o servidor de carimbo de tempo (padrão:
  `http://timestamp.digicert.com`).
- `PIXELPAD_SIGNTOOL` força o caminho do `signtool.exe` se ele não estiver no Windows
  SDK padrão.

O build imprime `assinado: <arquivo>` para cada binário e, no fim, o `SHA256SUMS.txt`
já sai com os hashes **do arquivo assinado**.

---

## 4. Conferir que assinou

```powershell
Get-AuthenticodeSignature .\dist\PixelPad-Setup-0.20.0.exe | Format-List Status, SignerCertificate
```

Tem que aparecer `Status : Valid` e o seu nome no `SignerCertificate`.

Ou, com o Windows SDK:

```powershell
signtool verify /pa /v .\dist\PixelPad-Setup-0.20.0.exe
```

E os binários internos (precisam sair assinados dentro do pacote):

```powershell
Get-AuthenticodeSignature .\build\app\native\ViGEmClient.dll
Get-AuthenticodeSignature .\build\app\node_modules\@koromix\koffi-win32-x64\win32_x64\koffi.node
```

> O `node.exe` **não** entra nessa lista de propósito: ele é o binário oficial do Node,
> já assinado pela **OpenJS Foundation**, e re-assinar por cima só quebraria a
> assinatura dele.

---

## 5. Depois de assinar, o que mais ajuda

1. **Falso positivo no Microsoft Defender**: <https://www.microsoft.com/en-us/wdsi/filesubmission>
   (reenvie a cada versão que for detectada; correção em 24–72 h).
2. **Publicar no winget**: manifesto validado, com hash fixado —
   <https://github.com/microsoft/winget-pkgs>. Facilita a vida de quem instala.
3. **Manter o nome e a estrutura estáveis** entre versões: ajuda na reputação.

## 6. E o Android?

O alerta do **Play Protect** é outro assunto: ele aparece em **qualquer** APK instalado
fora da Play Store, assinado ou não. Não tem como sumir por assinatura. As saídas são
publicar na Play (o que conflita com a atualização própria do app, que baixa APK) ou
entrar em um repositório como o F-Droid.
