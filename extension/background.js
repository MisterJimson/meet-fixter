import {soundURL, makeRules} from './rules.js';

// Serialize storage and rule changes, including concurrent requests from Meet tabs.
let queue = Promise.resolve();
function serial(work) {
  const result = queue.then(work);
  queue = result.catch(error => console.error('Meet Fixter:', error));
  return result;
}
chrome.webRequest.onBeforeRequest.addListener(details => {
  if (details.initiator !== 'https://meet.google.com') return;
  const url = soundURL(details.url);
  if (!url) return;
  void serial(async () => {
    const {sounds = []} = await chrome.storage.local.get('sounds');
    if (!sounds.includes(url)) await chrome.storage.local.set({sounds: [...sounds, url]});
  });
}, {urls: ['https://www.gstatic.com/meet/sounds/*']});

async function state() {
  const [{sounds = []}, rules] = await Promise.all([
    chrome.storage.local.get('sounds'), chrome.declarativeNetRequest.getDynamicRules()
  ]);
  // The actual installed rules are the source of truth, even after a worker restart.
  const muted = sounds.filter(url => rules.some(rule => new RegExp(rule.condition.regexFilter).test(url)));
  return {sounds, muted};
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || sender.url !== chrome.runtime.getURL('popup.html')) return;
  const result = serial(async () => {
    if (message.type === 'state') return state();
    if (message.type === 'mute') {
      const current = await state();
      if (!current.sounds.includes(message.url)) throw new Error('This sound has not been observed in Meet.');
      const muted = message.enabled ? [...current.muted, message.url] : current.muted.filter(url => url !== message.url);
      const rules = await chrome.declarativeNetRequest.getDynamicRules();
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: rules.map(rule => rule.id), addRules: makeRules(muted)
      });
      return state();
    }
    throw new Error('Unknown action.');
  });
  result.then(value => respond({ok: true, ...value}), error => respond({ok: false, error: error.message}));
  return true;
});
