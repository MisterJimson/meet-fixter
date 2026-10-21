import {label, protectedSound} from './rules.js';
const $ = id => document.getElementById(id);
let audio;
async function send(message) {
  const result = await chrome.runtime.sendMessage(message);
  if (!result?.ok) throw new Error(result?.error || 'Extension could not respond. Try reopening this popup.');
  return result;
}
function showError(error) { $('feedback').textContent = error.message; }
function render({sounds, muted}) {
  $('status').textContent = muted.length ? `${muted.length} sound file${muted.length === 1 ? '' : 's'} silenced` : 'Setup needed — choose your PiP chime';
  if (muted.length) $('setup').open = false;
  $('sounds').replaceChildren();
  if (!sounds.length) {
    $('sounds').textContent = 'No sound files found yet. Reload Meet, enter your meeting, and switch tabs. Then click Refresh.';
  }
  for (const url of [...sounds].sort((a, b) => Number(protectedSound(a)) - Number(protectedSound(b)))) {
    const row = document.createElement('div'); row.className = 'sound';
    const title = document.createElement('strong'); title.textContent = label(url); title.title = url;
    const controls = document.createElement('div'); controls.className = 'controls';
    const preview = document.createElement('button'); preview.textContent = 'Preview';
    preview.setAttribute('aria-label', `Preview ${label(url)}`);
    preview.onclick = async () => {
      audio?.pause(); audio = new Audio(url);
      try { await audio.play(); } catch { showError(new Error('Preview could not play. Check your connection and try again.')); }
    };
    controls.append(preview);
    if (protectedSound(url)) {
      const note = document.createElement('span'); note.className = 'protected'; note.textContent = 'Kept on'; controls.append(note);
    } else {
      const toggle = document.createElement('label');
      const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = muted.includes(url);
      checkbox.setAttribute('aria-label', `Silence ${label(url)}`);
      checkbox.onchange = async () => {
        checkbox.disabled = true;
        try {
          render(await send({type: 'mute', url, enabled: checkbox.checked}));
          $('feedback').textContent = 'Saved. Reload Meet before your next call so it loads the updated audio.';
        } catch (error) { checkbox.checked = !checkbox.checked; checkbox.disabled = false; showError(error); }
      };
      toggle.append(checkbox, 'Silence'); controls.append(toggle);
    }
    row.append(title, controls); $('sounds').append(row);
  }
}
async function refresh() { try { render(await send({type: 'state'})); } catch (error) { showError(error); } }
$('refresh').onclick = refresh;
refresh();
