// Compila o APK do PixelPad sem Gradle e sem Android Studio.
//
//   node tools/build-apk.mjs
//
// Usa so as ferramentas de linha de comando do SDK:
//   aapt2 (recursos) -> javac -> d8 (dex) -> zipalign -> apksigner
//
// O SDK e baixado uma vez em build/sdk (~120 MB, dois zips do dl.google.com).

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const BUILD = path.join(ROOT, 'build');
const SDK = path.join(BUILD, 'sdk');
const OUT = path.join(BUILD, 'apk');
const APP = path.join(ROOT, 'app-android');

const TARGET = 35;
const MIN = 21;
const KEYS = path.join(ROOT, 'data');
const KS = path.join(KEYS, 'android.keystore');
const SENHA = 'pixelpad';

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
// versionCode precisa ser inteiro e crescente: 0.3.1 -> 301
const [maj, min, pat] = pkg.version.split('.').map(Number);
const VERSION_CODE = maj * 10000 + min * 100 + (pat || 0);

const step = m => console.log(`\n  >> ${m}`);
// .bat no Windows precisa do cmd.exe; execFileSync direto dá EINVAL
const run = (cmd, args, opts = {}) => {
  if (/\.(bat|cmd)$/i.test(cmd)) {
    execFileSync('cmd.exe', ['/c', cmd, ...args], { stdio: 'inherit', ...opts });
  } else {
    execFileSync(cmd, args, { stdio: 'inherit', ...opts });
  }
};

// ---------------------------------------------------------------- SDK
const BT_ZIP = 'build-tools_r35_windows.zip';
const PLAT_ZIP = 'platform-35_r01.zip';

async function baixar(url, destino) {
  if (fs.existsSync(destino) && fs.statSync(destino).size > 1e6) return;
  console.log(`     baixando ${path.basename(destino)}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  fs.writeFileSync(destino, Buffer.from(await res.arrayBuffer()));
}

step('SDK do Android');
fs.mkdirSync(SDK, { recursive: true });
await baixar(`https://dl.google.com/android/repository/${BT_ZIP}`, path.join(SDK, BT_ZIP));
await baixar(`https://dl.google.com/android/repository/${PLAT_ZIP}`, path.join(SDK, PLAT_ZIP));
if (!fs.existsSync(path.join(SDK, 'android-15'))) {
  run('C:/Windows/System32/tar.exe', ['-xf', path.join(SDK, BT_ZIP)], { cwd: SDK });
}
if (!fs.existsSync(path.join(SDK, 'android-35'))) {
  run('C:/Windows/System32/tar.exe', ['-xf', path.join(SDK, PLAT_ZIP)], { cwd: SDK });
}
const BT = path.join(SDK, 'android-15');
const ANDROID_JAR = path.join(SDK, 'android-35', 'android.jar');
const AAPT2 = path.join(BT, 'aapt2.exe');
const D8 = path.join(BT, 'd8.bat');
const ZIPALIGN = path.join(BT, 'zipalign.exe');
const APKSIGNER = path.join(BT, 'apksigner.bat');
for (const f of [AAPT2, D8, ZIPALIGN, APKSIGNER, ANDROID_JAR]) {
  if (!fs.existsSync(f)) throw new Error('faltou ' + f);
}
console.log('     ok');

// ---------------------------------------------------------------- limpeza
step('Preparando');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'classes'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'dex'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'gen'), { recursive: true });
fs.mkdirSync(KEYS, { recursive: true });

// ---------------------------------------------------------------- recursos
step('Recursos (aapt2)');
run(AAPT2, ['compile', '--dir', path.join(APP, 'res'), '-o', path.join(OUT, 'res.zip')]);

const apkSemDex = path.join(OUT, 'base.apk');
run(AAPT2, [
  'link', '-o', apkSemDex,
  '-I', ANDROID_JAR,
  '--manifest', path.join(APP, 'AndroidManifest.xml'),
  '--min-sdk-version', String(MIN),
  '--target-sdk-version', String(TARGET),
  '--version-code', String(VERSION_CODE),
  '--version-name', pkg.version,
  '--java', path.join(OUT, 'gen'),
  path.join(OUT, 'res.zip'),
]);

// ---------------------------------------------------------------- java
step('Java (javac)');
const fontes = [];
(function varrer(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) varrer(p);
    else if (f.endsWith('.java')) fontes.push(p);
  }
})(path.join(APP, 'java'));
for (const f of fs.readdirSync(path.join(OUT, 'gen'), { recursive: true })) {
  if (String(f).endsWith('.java')) fontes.push(path.join(OUT, 'gen', String(f)));
}
run('javac', [
  '--release', '8',
  '-nowarn',
  '-classpath', ANDROID_JAR,
  '-d', path.join(OUT, 'classes'),
  ...fontes,
], { });

// ---------------------------------------------------------------- dex
step('Dex (d8)');
const classes = [];
(function varrer(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) varrer(p);
    else if (f.endsWith('.class')) classes.push(p);
  }
})(path.join(OUT, 'classes'));
run(D8, ['--release', '--lib', ANDROID_JAR, '--min-api', String(MIN), '--output', path.join(OUT, 'dex'), ...classes]);

// ---------------------------------------------------------------- empacota
step('Empacotando');
const dex = path.join(OUT, 'dex', 'classes.dex');
if (!fs.existsSync(dex)) throw new Error('d8 nao gerou classes.dex');
run('powershell', ['-NoProfile', '-Command', `
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $z = [System.IO.Compression.ZipFile]::Open('${apkSemDex.replace(/\\/g, '\\\\')}', 'Update')
  [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($z, '${dex.replace(/\\/g, '\\\\')}', 'classes.dex') | Out-Null
  $z.Dispose()
`]);

const alinhado = path.join(OUT, 'aligned.apk');
run(ZIPALIGN, ['-f', '-p', '4', apkSemDex, alinhado]);

// ---------------------------------------------------------------- assina
step('Assinando');
if (!fs.existsSync(KS)) {
  console.log('     gerando chave de assinatura (uma vez, fica em data/)');
  run('keytool', [
    '-genkeypair', '-keystore', KS, '-alias', 'pixelpad',
    '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10000',
    '-storepass', SENHA, '-keypass', SENHA,
    '-dname', 'CN=PixelPad, O=PixelPad, C=BR',
  ]);
}

const apkFinal = path.join(OUT, 'pixelpad.apk');
run(APKSIGNER, [
  'sign', '--ks', KS, '--ks-key-alias', 'pixelpad',
  '--ks-pass', 'pass:' + SENHA, '--key-pass', 'pass:' + SENHA,
  '--out', apkFinal, alinhado,
]);
run(APKSIGNER, ['verify', '--print-certs', apkFinal]);

// ---------------------------------------------------------------- distribui
step('Publicando o APK');
for (const destino of [path.join(ROOT, 'android'), path.join(ROOT, 'dist')]) {
  fs.mkdirSync(destino, { recursive: true });
}
// o servidor serve esse arquivo em /android (o celular baixa direto do PC)
fs.copyFileSync(apkFinal, path.join(ROOT, 'android', 'pixelpad.apk'));
fs.copyFileSync(apkFinal, path.join(ROOT, 'dist', `PixelPad-${pkg.version}.apk`));

const mb = fs.statSync(apkFinal).size / 1024 / 1024;
console.log(`\n  APK pronto: ${mb.toFixed(2)} MB  (versionCode ${VERSION_CODE})`);
console.log(`     android/pixelpad.apk   -> servido em http://<ip>:8080/android`);
console.log(`     dist/PixelPad-${pkg.version}.apk`);
