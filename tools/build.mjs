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
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const BUILD = path.join(ROOT, 'build');
const APP = path.join(BUILD, 'app');
const CACHE = path.join(BUILD, 'cache');
const DIST = path.join(ROOT, 'dist');

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
for (const f of ['server.mjs', 'vigem.mjs', 'certs.mjs']) {
  copiar(path.join(ROOT, 'src', f), path.join(APP, 'src', f));
}
for (const f of ['ViGEmClient.dll', 'README.md']) {
  copiar(path.join(ROOT, 'native', f), path.join(APP, 'native', f));
}

step('Instalando dependencias de producao');
execFileSync('npm', ['ci', '--omit=dev', '--no-audit', '--no-fund'], { cwd: APP, stdio: 'inherit', shell: true });
fs.rmSync(path.join(APP, 'package-lock.json'), { force: true });

const vbs = `' PixelPad - sobe o servidor sem janela e abre a pagina de pareamento.
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = dir
If fso.FileExists(dir & "\\node.exe") Then
  sh.Run """" & dir & "\\node.exe"" """ & dir & "\\src\\server.mjs""", 0, False
End If
WScript.Sleep 2500
sh.Run "http://127.0.0.1:8080/pair", 1, False
`;
fs.writeFileSync(path.join(APP, 'PixelPad.vbs'), vbs, { encoding: 'latin1' });

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

[Tasks]
Name: "autostart"; Description: "Iniciar junto com o Windows (recomendado)"; GroupDescription: "Opções:"; Flags: checkedonce
Name: "desktopicon"; Description: "Criar atalho na Área de Trabalho"; GroupDescription: "Opções:"

[Files]
Source: "${APP.replace(/\\/g, '\\\\')}\\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion

[Icons]
Name: "{group}\\{#AppName}"; Filename: "{app}\\PixelPad.vbs"; IconFilename: "{app}\\icon-512.png"; Comment: "Controle do PC pelo celular"
Name: "{autodesktop}\\{#AppName}"; Filename: "{app}\\PixelPad.vbs"; IconFilename: "{app}\\icon-512.png"; Tasks: desktopicon
Name: "{group}\\Desinstalar {#AppName}"; Filename: "{uninstallexe}"

[Registry]
Root: HKCU; Subkey: "Software\\Microsoft\\Windows\\CurrentVersion\\Run"; ValueType: string; ValueName: "PixelPad"; ValueData: """{app}\\PixelPad.vbs"""; Flags: uninsdeletevalue; Tasks: autostart

[Run]
Filename: "{sys}\\netsh.exe"; Parameters: "advfirewall firewall delete rule name=""PixelPad"""; Flags: runhidden
Filename: "{sys}\\netsh.exe"; Parameters: "advfirewall firewall add rule name=""PixelPad"" dir=in action=allow protocol=TCP localport=8080,8443 profile=private"; Flags: runhidden
Filename: "{app}\\PixelPad.vbs"; Description: "Abrir o PixelPad agora"; Flags: shellexec nowait postinstall skipifsilent

[UninstallRun]
Filename: "{sys}\\netsh.exe"; Parameters: "advfirewall firewall delete rule name=""PixelPad"""; Flags: runhidden

[UninstallDelete]
Type: filesandordirs; Name: "{app}\\data"
Type: filesandordirs; Name: "{app}\\certs"
Type: filesandordirs; Name: "{app}\\node_modules"
`;
const issPath = path.join(BUILD, 'installer.iss');
fs.writeFileSync(issPath, iss);

fs.mkdirSync(DIST, { recursive: true });

if (ISCC) {
  step('Compilando o instalador');
  execFileSync(ISCC, ['/Q', issPath], { stdio: 'inherit' });
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

step('Pronto');
for (const f of fs.readdirSync(DIST)) {
  const kb = fs.statSync(path.join(DIST, f)).size / 1024 / 1024;
  console.log(`     dist/${f}  (${kb.toFixed(1)} MB)`);
}
