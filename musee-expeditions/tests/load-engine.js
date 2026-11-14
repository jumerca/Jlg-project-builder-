// Charge les modules du moteur (sans interface) dans un contexte Node isolé.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ENGINE = ['core', 'data', 'objects', 'state', 'expeditions', 'conservation', 'exhibitions', 'visitors', 'finances', 'sim'];
module.exports = function loadEngine() {
  const ctx = { console, TextEncoder, TextDecoder, btoa: (s) => Buffer.from(s, 'binary').toString('base64'), atob: (s) => Buffer.from(s, 'base64').toString('binary') };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of ENGINE) {
    const file = path.join(__dirname, '..', 'js', f + '.js');
    vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });
  }
  return ctx.ME;
};
