// Never infer a sound's purpose from when it was fetched: Meet preloads audio.
export function soundURL(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'www.gstatic.com' || url.port ||
        !/^\/meet\/sounds\/[a-zA-Z0-9_-]+\.(mp3|ogg|wav)$/.test(url.pathname)) return null;
    return url.origin + url.pathname;
  } catch { return null; }
}
export function protectedSound(url) {
  return /\/(join_call|leave_call|knock|in_call_notify|error|speaker_test|volume_click|reaction_[a-z_]+)_/i.test(url);
}
export function label(url) {
  return new URL(url).pathname.split('/').pop().replace(/_[a-f0-9]{32}(?=\.)/i, '').replaceAll('_', ' ');
}
export function makeRules(urls) {
  return [...new Set(urls)].map((url, index) => {
    const canonical = soundURL(url);
    if (!canonical || protectedSound(canonical)) throw new Error('Only an unprotected Meet sound can be silenced.');
    return {
      id: index + 1, priority: 1,
      action: {type: 'redirect', redirect: {extensionPath: '/silence.wav'}},
      condition: {
        regexFilter: '^' + canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\?.*)?$',
        isUrlFilterCaseSensitive: true,
        initiatorDomains: ['meet.google.com'],
        resourceTypes: ['media', 'xmlhttprequest', 'other']
      }
    };
  });
}
