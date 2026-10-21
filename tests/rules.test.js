import test from 'node:test';
import assert from 'node:assert/strict';
import {soundURL, protectedSound, makeRules} from '../extension/rules.js';
import {readFileSync} from 'node:fs';
const base = 'https://www.gstatic.com/meet/sounds/';
// Synthetic PiP filename: the real one must be selected in the user's meeting.
const pip = base + 'example_pip_chime_1234.ogg';

test('accepts only Google Meet audio asset URLs; strips query and fragment', () => {
  assert.equal(soundURL(pip + '?v=1#x'), pip);
  for (const url of [pip.replace('https:', 'http:'), pip.replace('www.gstatic.com', 'evil.test'), pip.replace('.ogg', '.js'), 'blob:https://meet.google.com/id', base + '../private.ogg', 'not a URL']) assert.equal(soundURL(url), null);
});
test('preserves ordinary meeting sounds including simultaneous join notifications', () => {
  const [rule] = makeRules([pip]);
  for (const name of ['join_call', 'leave_call', 'knock', 'in_call_notify', 'error', 'volume_click', 'reaction_confetti']) {
    const url = base + name + '_abcdef.ogg';
    assert.equal(protectedSound(url), true);
    assert.throws(() => makeRules([url]));
    assert.equal(new RegExp(rule.condition.regexFilter).test(url), false);
  }
  assert.deepEqual(rule.condition.initiatorDomains, ['meet.google.com']);
  assert.deepEqual(rule.condition.resourceTypes, ['media', 'xmlhttprequest', 'other']);
});
test('redirects only the exact chosen file, with optional query', () => {
  const [rule] = makeRules([pip, pip]);
  assert.equal(makeRules([pip, pip]).length, 1);
  assert.equal(rule.action.redirect.extensionPath, '/silence.wav');
  const pattern = new RegExp(rule.condition.regexFilter);
  assert.equal(pattern.test(pip), true);
  assert.equal(pattern.test(pip + '?version=2'), true);
  for (const url of [pip + '.evil', pip.replace('1234', '12345'), pip.replace('www.gstatic.com', 'wwwXgstaticXcom'), 'https://evil.test/?url=' + pip]) assert.equal(pattern.test(url), false);
  assert.deepEqual(makeRules([]), []);
});
test('replacement is valid, nonempty PCM silence', () => {
  const data = readFileSync(new URL('../extension/silence.wav', import.meta.url));
  assert.equal(data.toString('ascii', 0, 4), 'RIFF');
  assert.equal(data.toString('ascii', 8, 12), 'WAVE');
  assert.equal(data.readUInt32LE(24), 24000);
  assert.equal(data.readUInt32LE(40), 4800);
  assert.ok(data.subarray(44).every(byte => byte === 0));
});
