import test from 'node:test';
import assert from 'node:assert/strict';

test('worker discovers only Meet sounds, persists selection, and restores it', async () => {
  let onRequest, onMessage;
  let rules = [];
  const storage = {};
  globalThis.chrome = {
    webRequest: {onBeforeRequest: {addListener(fn) { onRequest = fn; }}},
    storage: {local: {async get() {return structuredClone(storage);}, async set(value) {Object.assign(storage, value);}}},
    declarativeNetRequest: {
      async getDynamicRules() {return structuredClone(rules);},
      async updateDynamicRules({addRules}) {rules = structuredClone(addRules);}
    },
    runtime: {id: 'test', getURL: path => 'chrome-extension://test/' + path, onMessage: {addListener(fn) {onMessage = fn;}}}
  };
  await import('../extension/background.js');
  const sender = {id: 'test', url: 'chrome-extension://test/popup.html'};
  const send = message => new Promise(resolve => onMessage(message, sender, resolve));
  const pip = 'https://www.gstatic.com/meet/sounds/example_pip.ogg';
  const join = 'https://www.gstatic.com/meet/sounds/join_call_abc.ogg';
  onRequest({url: pip, initiator: 'https://other.test'});
  assert.deepEqual((await send({type: 'state'})).sounds, []);
  onRequest({url: pip, initiator: 'https://meet.google.com'});
  onRequest({url: join, initiator: 'https://meet.google.com'});
  onRequest({url: pip, initiator: 'https://meet.google.com'});
  assert.deepEqual((await send({type: 'state'})).sounds, [pip, join]);
  assert.equal((await send({type: 'mute', url: join, enabled: true})).ok, false);
  assert.equal((await send({type: 'mute', url: pip, enabled: true})).ok, true);
  assert.equal(rules.length, 1);
  assert.deepEqual((await send({type: 'state'})).muted, [pip]);
  // Restart the module: selection is read from Chrome's durable rules.
  await import('../extension/background.js?restart');
  assert.deepEqual((await send({type: 'state'})).muted, [pip]);
  assert.equal((await send({type: 'mute', url: pip, enabled: false})).ok, true);
  assert.deepEqual(rules, []);
});
