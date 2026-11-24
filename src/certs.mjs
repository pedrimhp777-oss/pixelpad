// Gera a autoridade certificadora local e o certificado do servidor.
//
// Roda sozinho no primeiro start e sempre que o IP do PC mudar.
//
// Por que isso existe: o Chrome so deixa "instalar como app" (PWA) em HTTPS.
// Como aqui nao existe dominio publico, a saida e uma CA propria: o celular
// confia nela uma vez e o certificado do servidor passa a ser valido.
//
// A chave da CA (certs/ca.key) NUNCA vai pro Git: quem tiver ela consegue
// assinar certificados que o seu celular aceitaria.

import fs from 'node:fs';
import path from 'node:path';
import forge from 'node-forge';

const DAYS = 3650;
const { pki } = forge;

function serial() {
  return '01' + Math.floor(Math.random() * 1e15).toString(16).padStart(14, '0');
}

function novaCA() {
  const keys = pki.rsa.generateKeyPair(2048);
  const cert = pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = serial();
  cert.validity.notBefore = new Date(Date.now() - 864e5);
  cert.validity.notAfter = new Date(Date.now() + DAYS * 864e5);

  const attrs = [
    { name: 'commonName', value: 'PixelPad Local CA' },
    { name: 'organizationName', value: 'PixelPad (chave local, gerada na sua maquina)' },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.setExtensions([
    { name: 'basicConstraints', cA: true, critical: true },
    { name: 'keyUsage', keyCertSign: true, cRLSign: true, critical: true },
    { name: 'subjectKeyIdentifier' },
  ]);
  cert.sign(keys.privateKey, forge.md.sha256.create());

  return {
    certPem: pki.certificateToPem(cert),
    keyPem: pki.privateKeyToPem(keys.privateKey),
    cert,
  };
}

function novoCertificado(caCert, caKey, ip) {
  const keys = pki.rsa.generateKeyPair(2048);
  const cert = pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = serial();
  cert.validity.notBefore = new Date(Date.now() - 864e5);
  cert.validity.notAfter = new Date(Date.now() + DAYS * 864e5);

  cert.setSubject([
    { name: 'commonName', value: ip || 'pixelpad.local' },
    { name: 'organizationName', value: 'PixelPad' },
  ]);
  cert.setIssuer(caCert.subject.attributes);
  cert.setExtensions([
    { name: 'basicConstraints', cA: false },
    { name: 'keyUsage', digitalSignature: true, keyEncipherment: true, critical: true },
    { name: 'extKeyUsage', serverAuth: true },
    {
      name: 'subjectAltName',
      altNames: [
        { type: 7, ip: ip || '127.0.0.1' },   // IP na rede local
        { type: 7, ip: '127.0.0.1' },
        { type: 2, value: 'localhost' },
      ],
    },
    { name: 'subjectKeyIdentifier' },
    { name: 'authorityKeyIdentifier', keyIdentifier: caCert.generateSubjectKeyIdentifier().getBytes() },
  ]);
  cert.sign(caKey, forge.md.sha256.create());

  return { certPem: pki.certificateToPem(cert), keyPem: pki.privateKeyToPem(keys.privateKey) };
}

export async function ensureCerts(rootDir, lanIp) {
  const dir = path.join(rootDir, 'certs');
  fs.mkdirSync(dir, { recursive: true });

  const caCrtPath = path.join(dir, 'ca.crt');
  const caKeyPath = path.join(dir, 'ca.key');
  const srvCrtPath = path.join(dir, 'server.crt');
  const srvKeyPath = path.join(dir, 'server.key');
  const ipPath = path.join(dir, 'ip.txt');

  const alvo = String(lanIp || '127.0.0.1').trim();
  const ipAtual = fs.existsSync(ipPath) ? fs.readFileSync(ipPath, 'utf8').trim() : '';

  // 1) CA: cria uma vez e reaproveita para sempre
  let caCert, caKey;
  if (fs.existsSync(caCrtPath) && fs.existsSync(caKeyPath)) {
    caCert = pki.certificateFromPem(fs.readFileSync(caCrtPath, 'utf8'));
    caKey = pki.privateKeyFromPem(fs.readFileSync(caKeyPath, 'utf8'));
  } else {
    const ca = novaCA();
    fs.chmodSync(dir, 0o700);
    fs.writeFileSync(caCrtPath, ca.certPem);
    fs.writeFileSync(caKeyPath, ca.keyPem, { mode: 0o600 });
    caCert = ca.cert;
    caKey = pki.privateKeyFromPem(ca.keyPem);
  }

  // 2) certificado do servidor: refaz se o IP mudou ou se o arquivo nao existe
  let precisa = !fs.existsSync(srvCrtPath) || !fs.existsSync(srvKeyPath) || ipAtual !== alvo;
  if (!precisa) {
    try {
      const atual = pki.certificateFromPem(fs.readFileSync(srvCrtPath, 'utf8'));
      const valido = atual.issuer.attributes[0].value === caCert.subject.attributes[0].value;
      if (!valido) precisa = true;
    } catch { precisa = true; }
  }

  if (precisa) {
    const srv = novoCertificado(caCert, caKey, alvo);
    fs.writeFileSync(srvCrtPath, srv.certPem);
    fs.writeFileSync(srvKeyPath, srv.keyPem, { mode: 0o600 });
    fs.writeFileSync(ipPath, alvo);
  }

  return {
    key: fs.readFileSync(srvKeyPath),
    cert: fs.readFileSync(srvCrtPath),
    caPath: caCrtPath,
  };
}
