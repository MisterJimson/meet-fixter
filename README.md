<img src="assets/icon.svg" width="64" height="64" alt="">

# Meet Fixter

A local Chrome Manifest V3 extension for silencing a chosen Google Meet picture-in-picture chime without turning off PiP or muting meeting audio.

**Status: configurable first version, requiring one-time sound selection.** The PiP sound has not been identified or verified in an authenticated live meeting here. Nothing is silenced until you select its sound file. Regular join, leave, knock, notification, error, volume-click, and reaction assets are protected from selection.

## Install

1. Open `chrome://extensions` in Google Chrome.
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select this repository's **extension** folder.
4. Pin **Meet Fixter** using Chrome's Extensions menu.
5. Reload any existing Meet tab before joining a meeting.

No build, package installation, or account is required. `npm run package` optionally produces `dist/meet-fixter.zip`; extract it before using Load unpacked.

## Choose the chime once

1. Enter a Meet meeting and switch tabs to trigger picture-in-picture.
2. Open Meet Fixter and click **Refresh** to list sound files requested by Meet.
3. Use **Preview** to identify the PiP chime, then check **Silence** for that file. If entry and exit use different files, select both. MP3 and OGG variants are separate files.
4. Reload Meet before your next call, since already-decoded audio stays in memory until the page reloads.
5. Check that PiP still opens silently, another participant's join notification still plays, and voices remain audible. Test joins both while switching tabs and while staying in Meet.

The sound list describes network requests, **not playback events**: Meet can preload sounds. Do not choose a sound merely because it appears near a tab switch. Selection is reversible by unchecking Silence and reloading Meet.

If no PiP sound appears, or its preview is also a regular meeting notification, leave it unselected. This implementation requires a separate sound asset; it cannot distinguish two uses of the same file or silence browser/OS-generated sounds. A live playback trace would be needed for that case. Google changing an asset's filename requires selecting the replacement; it will play normally in the meantime.

## How it works and privacy

A service worker observes requests to `https://www.gstatic.com/meet/sounds/*` initiated by `https://meet.google.com`. It stores only canonical sound URLs locally (no query strings, meeting codes, participant information, recordings, or telemetry). The popup previews original audio directly from Google.

For selected files, Chrome's `declarativeNetRequest` redirects the exact asset URL to a bundled 100 ms silent WAV. Rules are restricted to Meet initiators and audio/fetch resource types. Audio playback APIs, video, microphones, WebRTC, tab visibility, and PiP APIs are not modified. A join at the same instant as a tab switch is not blanket-muted.

Permissions:

- `webRequest`: discover sound filenames loaded by Meet.
- `storage`: keep the local sound list.
- `declarativeNetRequestWithHostAccess`: replace selected files with silence.
- Host access to Meet and Google's Meet sound directory: needed for observation and redirects. Chrome may display host permissions at domain granularity.

The Chrome rules are the source of truth for selected sounds and survive browser/worker restarts. No background page or server runs continuously.

## Development and verification

Run `npm test` (Node 20+) for URL isolation, protected meeting sounds, exact matching, silent WAV integrity, concurrent discovery, selection, restoration, and worker restart tests. These are automated logic tests using a mocked Chrome API; they do not replace the live Chrome/Meet check above.

Technical references: [Chrome declarativeNetRequest](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest), [Google Meet picture-in-picture help](https://support.google.com/meet/answer/13665919).
