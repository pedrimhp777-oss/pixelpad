// Gera o pacote distribuivel: instalador .exe + zip portatil.
//
//   node tools/build.mjs
//
// O que ele faz:
//   1. baixa o Node LTS oficial (so na primeira vez) para embutir no pacote
//   2. monta build/app com o app + as dependencias de producao
//   3. escreve o script do Inno Setup e compila dist/PixelPad-Setup-<versao>.exe
//   4. gera dist/PixelPad-<versao>-portable.zip (sem instalador)

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const BUILD = path.join(ROOT, 'build');
const APP = path.join(BUILD, 'app');
const CACHE = path.join(BUILD, 'cache');
const DIST = path.join(ROOT, 'dist');

// ---- assinatura de codigo (opcional)
// Sem certificado configurado o build sai igual (sem assinatura), so avisa. Com
// certificado, assina o instalador e os binarios nativos que vao dentro dele.
//   PIXELPAD_CERT=arquivo.pfx  PIXELPAD_CERT_PASS=senha
//   ou PIXELPAD_CERT_SUBJECT="Nome do certificado" (certificado no store do Windows)
//   ou PIXELPAD_SIGN_DLIB=... PIXELPAD_SIGN_METADATA=... (Azure Trusted Signing)
function acharSigntool() {
  if (process.env.PIXELPAD_SIGNTOOL) return process.env.PIXELPAD_SIGNTOOL;
  const kits = ['C:/Program Files (x86)/Windows Kits/10/bin', 'C:/Program Files/Windows Kits/10/bin'];
  for (const base of kits) {
    try {
      const vers = fs.readdirSync(base).sort().reverse();
      for (const v of vers) {
        const f = path.join(base, v, 'x64', 'signtool.exe');
        if (fs.existsSync(f)) return f;
      }
    } catch {}
  }
  return null;
}
const SIGNTOOL = acharSigntool();
const CERT_PFX = process.env.PIXELPAD_CERT;
const CERT_PASS = process.env.PIXELPAD_CERT_PASS || '';
const CERT_SUBJECT = process.env.PIXELPAD_CERT_SUBJECT;
const SIGN_DLIB = process.env.PIXELPAD_SIGN_DLIB;
const SIGN_MD = process.env.PIXELPAD_SIGN_METADATA;
const TIMESTAMP = process.env.PIXELPAD_TIMESTAMP || 'http://timestamp.digicert.com';
const ASSINA = !!SIGNTOOL && !!(SIGN_DLIB ? SIGN_MD : (CERT_PFX || CERT_SUBJECT));

function assinar(arquivo) {
  if (!ASSINA || !fs.existsSync(arquivo)) return false;
  const args = ['sign', '/fd', 'sha256', '/tr', TIMESTAMP, '/td', 'sha256'];
  if (SIGN_DLIB) args.push('/dlib', SIGN_DLIB, '/dmdf', SIGN_MD);
  else if (CERT_PFX) args.push('/f', CERT_PFX, '/p', CERT_PASS);
  else args.push('/n', CERT_SUBJECT);
  args.push(arquivo);
  try {
    execFileSync(SIGNTOOL, args, { stdio: 'inherit' });
    console.log('     assinado: ' + path.basename(arquivo));
    return true;
  } catch (e) {
    console.log('     [!] falhou assinar ' + path.basename(arquivo));
    return false;
  }
}
function nativosEm(dir) {
  const out = [];
  const ver = d => {
    let itens = [];
    try { itens = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const it of itens) {
      const f = path.join(d, it.name);
      if (it.isDirectory()) ver(f);
      else if (/\.(dll|node)$/i.test(it.name)) out.push(f);
    }
  };
  ver(dir);
  return out;
}

const NODE_VER = 'latest-v24.x';
const NODE_URL = `https://nodejs.org/dist/${NODE_VER}/win-x64/node.exe`;
const NODE_LIC = 'https://raw.githubusercontent.com/nodejs/node/v24.x/LICENSE';

const ISCC = [
  'C:/Users/pedro/AppData/Local/Programs/Inno Setup 6/ISCC.exe',
  'C:/Program Files (x86)/Inno Setup 6/ISCC.exe',
  'C:/Program Files/Inno Setup 6/ISCC.exe',
].find(p => fs.existsSync(p));

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const step = msg => console.log(`\n  >> ${msg}`);

async function baixar(url, destino) {
  if (fs.existsSync(destino) && fs.statSync(destino).size > 1000) return;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  fs.writeFileSync(destino, Buffer.from(await res.arrayBuffer()));
}

function copiar(origem, destino) {
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.copyFileSync(origem, destino);
}

// ---------------------------------------------------------------- 1. node
step('Node LTS para embutir');
fs.mkdirSync(CACHE, { recursive: true });
await baixar(NODE_URL, path.join(CACHE, 'node.exe'));
await baixar(NODE_LIC, path.join(CACHE, 'LICENSE-node.txt'));
const vNode = execFileSync(path.join(CACHE, 'node.exe'), ['-v']).toString().trim();
console.log(`     ${vNode}`);

// ---------------------------------------------------------------- 2. app
step('Montando build/app');
fs.rmSync(APP, { recursive: true, force: true });
fs.mkdirSync(APP, { recursive: true });

copiar(path.join(CACHE, 'node.exe'), path.join(APP, 'node.exe'));
copiar(path.join(CACHE, 'LICENSE-node.txt'), path.join(APP, 'LICENSE-node.txt'));
for (const f of ['package.json', 'package-lock.json', 'icon-192.png', 'icon-512.png', 'LICENSE', 'README.md']) {
  copiar(path.join(ROOT, f), path.join(APP, f));
}
copiar(path.join(BUILD, 'icon.ico'), path.join(APP, 'icon.ico'));
for (const f of fs.readdirSync(path.join(ROOT, 'src')).filter(x => x.endsWith('.mjs'))) {
  copiar(path.join(ROOT, 'src', f), path.join(APP, 'src', f));
}
for (const f of ['ViGEmClient.dll', 'README.md']) {
  copiar(path.join(ROOT, 'native', f), path.join(APP, 'native', f));
}
// o APK vai junto: o proprio servidor entrega ele em /android
const apkSrc = path.join(ROOT, 'android', 'pixelpad.apk');
if (fs.existsSync(apkSrc)) {
  copiar(apkSrc, path.join(APP, 'android', 'pixelpad.apk'));
} else {
  console.log('     (sem APK ainda - rode npm run build:apk para incluir o app Android)');
}

step('Assinatura dos binarios nativos');
if (!ASSINA) {
  console.log('     sem certificado configurado: o pacote sai sem assinatura');
} else {
  for (const f of nativosEm(APP)) assinar(f);
}

step('Instalando dependencias de producao');
execFileSync('npm', ['ci', '--omit=dev', '--no-audit', '--no-fund'], { cwd: APP, stdio: 'inherit', shell: true });
fs.rmSync(path.join(APP, 'package-lock.json'), { force: true });

// Sem lancador escondido: o atalho chama o proprio node.exe (assinado pela
// OpenJS Foundation) com o servidor. Um .vbs que sobe processo com a janela
// escondida + chave de autorun e o padrao que os antivirus marcam como virus.

const tamanho = execFileSync('powershell', ['-NoProfile', '-Command',
  `"{0:N1} MB" -f ((Get-ChildItem -Recurse '${APP}' | Measure-Object Length -Sum).Sum / 1MB)`])
  .toString().trim();
console.log(`     conteudo: ${tamanho}`);

// ---------------------------------------------------------------- 3. instalador
step('Script do Inno Setup');
const iss = `#define AppName "PixelPad"
#define AppVersion "${pkg.version}"

[Setup]
AppId={{7C4B1A62-5E3D-4A9B-8F1C-2D6E9A0B7C31}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher=PixelPad
AppPublisherURL=https://github.com/pedrimhp777-oss/pixelpad
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
DisableProgramGroupPage=yes
OutputDir=${DIST.replace(/\\/g, '\\\\')}
OutputBaseFilename=PixelPad-Setup-{#AppVersion}
SetupIconFile=${path.join(BUILD, 'icon.ico').replace(/\\/g, '\\\\')}
UninstallDisplayIcon={app}\\icon-512.png
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\\BrazilianPortuguese.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "${APP.replace(/\\/g, '\\\\')}\\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion

[Tasks]
Name: "autostart"; Description: "Abrir junto com o Windows"; GroupDescription: "Opções:"; Flags: unchecked
Name: "desktopicon"; Description: "Criar atalho na Área de Trabalho"; GroupDescription: "Opções:"; Flags: unchecked

[Icons]
Name: "{group}\\{#AppName}"; Filename: "{app}\\node.exe"; Parameters: """{app}\\src\\server.mjs"""; WorkingDir: "{app}"; IconFilename: "{app}\\icon.ico"; Comment: "Controle do PC pelo celular"
Name: "{group}\\Desinstalar {#AppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\\{#AppName}"; Filename: "{app}\\node.exe"; Parameters: """{app}\\src\\server.mjs"""; WorkingDir: "{app}"; IconFilename: "{app}\\icon.ico"; Tasks: desktopicon
Name: "{userstartup}\\{#AppName}"; Filename: "{app}\\node.exe"; Parameters: """{app}\\src\\server.mjs"""; WorkingDir: "{app}"; IconFilename: "{app}\\icon.ico"; Tasks: autostart

[Run]
Filename: "{app}\\node.exe"; Parameters: """{app}\\src\\server.mjs"""; WorkingDir: "{app}"; Description: "Abrir o PixelPad agora"; Flags: nowait postinstall skipifsilent runasoriginaluser

[UninstallDelete]
Type: filesandordirs; Name: "{app}\\node_modules"

[Code]
// O servidor roda com a janela minimizada (da pra abrir e ver o log, e fechar
// pra desligar). Sem lancador escondido, sem chave de autorun, sem regra de
// firewall silenciosa: o Windows pergunta uma vez, na primeira execucao.
procedure MinimizarAtalho(const Lnk: String);
var Shell, Atalho: Variant;
begin
  if not FileExists(Lnk) then Exit;
  try
    Shell := CreateOleObject('WScript.Shell');
    Atalho := Shell.CreateShortcut(Lnk);
    Atalho.WindowStyle := 7;
    Atalho.Save;
  except
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    MinimizarAtalho(ExpandConstant('{group}\\{#AppName}.lnk'));
    MinimizarAtalho(ExpandConstant('{autodesktop}\\{#AppName}.lnk'));
    MinimizarAtalho(ExpandConstant('{userstartup}\\{#AppName}.lnk'));
  end;
end;

`;

const issPath = path.join(BUILD, 'installer.iss');
fs.writeFileSync(issPath, iss);

fs.mkdirSync(DIST, { recursive: true });

if (ISCC) {
  step('Compilando o instalador');
  execFileSync(ISCC, ['/Q', issPath], { stdio: 'inherit' });
  assinar(path.join(DIST, `PixelPad-Setup-${pkg.version}.exe`));
  console.log(`     dist/PixelPad-Setup-${pkg.version}.exe`);
} else {
  console.log('\n  [!] Inno Setup nao encontrado - instalador nao gerado.');
  console.log('      winget install -e --id JRSoftware.InnoSetup');
}

// ---------------------------------------------------------------- 4. portatil
step('Zip portatil');
const zip = path.join(DIST, `PixelPad-${pkg.version}-portable.zip`);
fs.rmSync(zip, { force: true });
execFileSync('powershell', ['-NoProfile', '-Command',
  `Compress-Archive -Path '${APP}\\*' -DestinationPath '${zip}' -CompressionLevel Optimal`],
  { stdio: 'inherit' });

step('SHA-256 dos arquivos');
const linhas = [];
for (const f of fs.readdirSync(DIST).sort()) {
  if (!f.startsWith('PixelPad-' + pkg.version) && !f.startsWith('PixelPad-Setup-' + pkg.version)) continue;
  if (!/\.(exe|zip|apk)$/i.test(f)) continue;
  const h = crypto.createHash('sha256');
  h.update(fs.readFileSync(path.join(DIST, f)));
  linhas.push(h.digest('hex') + '  ' + f);
}
fs.writeFileSync(path.join(DIST, 'SHA256SUMS.txt'), linhas.join('\n') + '\n');
for (const l of linhas) console.log('     ' + l);

step('Pronto');
for (const f of fs.readdirSync(DIST)) {
  const b = fs.statSync(path.join(DIST, f)).size;
  const tamanho = b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;
  console.log(`     dist/${f}  (${tamanho})`);
}
