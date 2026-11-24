// Gera a autoridade certificadora local e o certificado do servidor.
//
// Roda automaticamente no primeiro start. Cada instalacao tem a SUA propria CA
// (nunca versione a pasta certs/: quem tiver a chave da CA consegue assinar
// certificados que o seu celular aceitaria).

import fs from 'node:fs';
import path from 'node:path';
import selfsigned from 'selfsigned';

const DAYS = 3650;

export async function ensureCerts(rootDir, lanIp) {
  const dir = path.join(rootDir, 'certs');
  const caCrtPath = path.join(dir, 'ca.crt');
  const srvCrtPath = path.join(dir, 'server.crt');
  const srvKeyPath = path.join(dir, 'server.key');
  const ipPath = path.join(dir, 'ip.txt');

  fs.mkdirSync(dir, { recursive: true });

  const alvo = String(lanIp || '').trim();
  const ipAtual = fs.existsSync(ipPath) ? fs.readFileSync(ipPath, 'utf8').trim() : '';

  if (fs.existsSync(caCrtPath) && fs.existsSync(srvCrtPath) && fs.existsSync(srvKeyPath) && ipAtual === alvo) {
    return { key: fs.readFileSync(srvKeyPath), cert: fs.readFileSync(srvCrtPath), caPath: caCrtPath };
  }

  // 1) CA propria (se ainda nao existe)
  let ca = null;
  if (!fs.existsSync(caCrtPath)) {
    ca = await selfsigned.generate([{ name: 'commonName', value: 'PixelPad Local CA' }], {
      days: DAYS,
      keySize: 2048,
      algorithm: 'sha256',
      extensions: [
        { name: 'basicConstraints', cA: true, critical: true },
        { name: 'keyUsage', keyCertSign: true, cRLSign: true, critical: true },
      ],
    });
    fs.writeFileSync(caCrtPath, ca.cert);
    fs.writeFileSync(path.join(dir, 'ca.key'), ca.private);
  }

  // 2) certificado do servidor, assinado pela CA
  const caPem = fs.existsSync(caCrtPath) ? fs.readFileSync(caCrtPath, 'utf8') : ca.cert;
  const caKey = ca ? ca.private : (fs.existsSync(path.join(dir, 'ca.key')) ? fs.readFileSync(path.join(dir, 'ca.key'), 'utf8') : null);
  if (!caKey) throw new Error('certs/ca.key nao encontrado - apague a pasta certs/ e rode de novo');

  const srv = await selfsigned.generate([{ name: 'commonName', value: alvo || 'pixelpad.local' }], {
    days: DAYS,
    keySize: 2048,
    algorithm: 'sha256',
    extensions: [
      { name: 'basicConstraints', cA: false },
      { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
      { name: 'extKeyUsage', serverAuth: true },
      {
        name: 'subjectAltName',
        altNames: [
          { type: 7, ip: alvo || '127.0.0.1' },
          { type: 7, ip: '127.0.0.1' },
          { type: 2, value: 'localhost' },
        ],
      },
    ],
  });

  fs.writeFileSync(srvCrtPath, srv.cert);
  fs.writeFileSync(srvKeyPath, srv.private);
  fs.writeFileSync(ipPath, alvo);

  return { key: fs.readFileSync(srvKeyPath), cert: fs.readFileSync(srvCrtPath), caPath: caCrtPath };
}
