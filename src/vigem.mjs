// Driver ViGEm acessado direto da DLL nativa - sem Python, sem .NET.
//
// Cria um controle Xbox 360 virtual e atualiza o estado a 60+ Hz.
// Requer o driver "ViGEmBus" instalado (https://github.com/nefarius/ViGEmBus).

import koffi from 'koffi';

const ERROR_NONE = 0x20000000;

const BUTTONS = {
  du: 0x0001, dd: 0x0002, dl: 0x0004, dr: 0x0008,
  start: 0x0010, back: 0x0020, ls: 0x0040, rs: 0x0080,
  lb: 0x0100, rb: 0x0200,
  a: 0x1000, b: 0x2000, x: 0x4000, y: 0x8000,
};

export function createPad(dllPath) {
  const lib = koffi.load(dllPath);

  const REPORT = koffi.struct('XUSB_REPORT', {
    wButtons: 'uint16', bLeftTrigger: 'uint8', bRightTrigger: 'uint8',
    sThumbLX: 'int16', sThumbLY: 'int16', sThumbRX: 'int16', sThumbRY: 'int16',
  });

  const alloc = lib.func('void *vigem_alloc()');
  const free = lib.func('void vigem_free(void *c)');
  const connect = lib.func('int vigem_connect(void *c)');
  const disconnect = lib.func('void vigem_disconnect(void *c)');
  const x360alloc = lib.func('void *vigem_target_x360_alloc()');
  const targetAdd = lib.func('int vigem_target_add(void *c, void *t)');
  const targetRemove = lib.func('int vigem_target_remove(void *c, void *t)');
  const targetFree = lib.func('void vigem_target_free(void *t)');
  const x360update = lib.func('int vigem_target_x360_update(void *c, void *t, XUSB_REPORT r)');

  const client = alloc();
  if (!client) throw new Error('vigem_alloc falhou (driver ViGEmBus nao instalado?)');
  let r = connect(client);
  if (r !== ERROR_NONE) { free(client); throw new Error('vigem_connect falhou: 0x' + (r >>> 0).toString(16)); }

  const target = x360alloc();
  r = targetAdd(client, target);
  if (r !== ERROR_NONE) { disconnect(client); free(client); throw new Error('vigem_target_add falhou: 0x' + (r >>> 0).toString(16)); }

  const report = { wButtons: 0, bLeftTrigger: 0, bRightTrigger: 0, sThumbLX: 0, sThumbLY: 0, sThumbRX: 0, sThumbRY: 0 };

  const clampAxis = v => Math.max(-32768, Math.min(32767, Math.round(v || 0)));
  const clampTrig = v => Math.max(0, Math.min(255, Math.round(v || 0)));

  return {
    /** Recebe o estado do celular: {a,b,x,y,lb,rb,back,start,du,dd,dl,dr,lx,ly,rx,ry,lt,rt} */
    update(s) {
      let bits = 0;
      for (const k in BUTTONS) if (s[k]) bits |= BUTTONS[k];
      report.wButtons = bits;
      report.bLeftTrigger = clampTrig(s.lt);
      report.bRightTrigger = clampTrig(s.rt);
      report.sThumbLX = clampAxis(s.lx);
      report.sThumbLY = clampAxis(s.ly);
      report.sThumbRX = clampAxis(s.rx);
      report.sThumbRY = clampAxis(s.ry);
      return x360update(client, target, report) === ERROR_NONE;
    },
    /** Solta tudo (usado quando o celular desconecta). */
    reset() {
      for (const k in report) report[k] = 0;
      x360update(client, target, report);
    },
    destroy() {
      try { targetRemove(client, target); } catch {}
      try { targetFree(target); } catch {}
      try { disconnect(client); } catch {}
      try { free(client); } catch {}
    },
  };
}

export { BUTTONS };
