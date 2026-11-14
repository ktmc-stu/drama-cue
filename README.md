# Drama Cue

A cue-based sound playback desk for theatre, in the spirit of QLab's audio workflow.
Static front end (GitHub Pages) + Firebase. English and 繁體中文（香港書面語）, switchable in Settings.
All interface glyphs are inline SVG icons — no emoji.

## Runs immediately

Open the app and choose **Offline desk**. Create a local passcode (4+ characters) and you are in a
fully working console seeded with two shows: *The Storm — Act I* (16 cues) and *Curtain Call* (4 cues).
Every seeded sound is synthesised in the browser with the Web Audio API, so GO produces real audio
with no uploads, no network and no Firebase project. Cue sheets persist in this browser; uploaded
files persist in IndexedDB.

Press **Preload** then **Space** to run the sheet. **Esc** fades everything out.

## What it does

- Cue types: **Audio, Fade, Stop, Wait, Memo**
- Standby pointer, **GO** (Space), **Panic** (Esc), pause all, stop all, back to top, show clock
- Per cue: level (dB), pan, fade in, fade out on stop, loop, rate, trim in/out, stop-others, hotkey, notes
- Waveform inspector: drag the amber markers to trim, click anywhere to audition from that point
- Continue modes: Manual, Auto-follow (on finish), Auto-continue (immediate, with delay)
- Live channel rack: elapsed / remaining, progress, per-channel meter, live level, pause, stop
- Master fader, master meter, single-action **Mute** in the top rail
- Search, type filter, flag filter, sort + direction, built-in and user-saved views
- Bulk selection (shift-click ranges), bulk duplicate, bulk delete, **Undo** (toast or Ctrl+Z)
- Drag to reorder, drag-and-drop audio to create cues, JSON export / import
- Multiple shows, realtime cloud sync, per-cue preload state dots, offline audio byte cache
- Output device selection (Chromium), idle auto-lock, reduced-motion switch

## Cloud setup (Firebase)

1. Create a Firebase project, add a **Web app**, paste its config into `firebase-config.js`.
2. **Authentication → Sign-in method → Email/Password: Enable.**
   **Authentication → Settings → User actions:** turn off "Enable create (sign-up)".
3. **Authentication → Users → Add user** — e.g. `crew@your-company.com` with a strong password.
   Add one account per operator, or share one crew account.
4. **Firestore Database → Create database** (production) → Rules → paste `firestore.rules` → Publish.
5. **Storage → Get started** → Rules → paste `storage.rules` → Publish.
   New projects may need the Blaze plan to provision Cloud Storage. To stay on the free Spark plan,
   skip Storage and use the inspector's **URL or repo path** field instead.
6. **Authentication → Settings → Authorized domains → Add domain:** `YOUR-NAME.github.io`
   (`localhost` is already authorised for local testing).

### The password lock

Cloud mode uses real Firebase Authentication; Firestore and Storage rules reject every unauthenticated
request, so cue sheets and audio stay private even though the page itself is public. The lock icon in
the top rail signs out and stops all sound. Offline mode uses a salted SHA-256 passcode held on the
device — it guards the local desk, not a server. Idle auto-lock is available in Settings; leave it at
**0** during a performance.

## Deploy

```bash
git init && git add . && git commit -m "Drama Cue"
git branch -M main
git remote add origin https://github.com/<you>/drama-cue.git
git push -u origin main
