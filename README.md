# 🎭 Drama Cue — QLab-style sound effect playback (English / 繁體中文)

Internal sound desk for drama performances. Static web app (GitHub Pages) + Firebase.
Password-locked; cue lists sync in realtime; audio is preloaded for instant, low-latency GO.

## Features
- Cue list: **Audio / Fade / Stop / Wait / Memo**, drag-to-reorder, duplicate, hotkeys
- Standby pointer + **GO** (Space), **PANIC** (Esc, fade-out), Pause all / Stop all
- Per cue: volume (dB), pan, fade in, fade out on stop, loop, rate, trim in/out, stop-others
- Continue modes: Manual / Auto-follow (after finish) / Auto-continue (immediately, with delay)
- Live panel: elapsed / remaining, progress, live volume, pause, stop; master volume + meter
- Multiple shows, JSON export/import, output-device selection (Chromium), offline audio cache
- Language: English / 繁體中文（香港書面語）— Settings → Language

## 1. Firebase setup
1. Create a Firebase project → add a **Web app** → copy the config into `firebase-config.js`.
2. **Authentication → Sign-in method → Email/Password: Enable.**
   In **Authentication → Settings → User actions**, disable “Enable create (sign-up)” so nobody
   can self-register.
3. **Authentication → Users → Add user**: e.g. `crew@your-drama.com` + a strong password.
   Share this one account with the crew (or add one account per operator).
4. **Firestore Database → Create database** (production mode) → Rules → paste `firestore.rules` → Publish.
5. **Storage → Get started** → Rules → paste `storage.rules` → Publish.
   *Note: new projects may need the Blaze plan to provision Cloud Storage. If you prefer to stay
   on the free Spark plan, skip Storage and use the “URL or repo path” field instead (see below).*
6. **Authentication → Settings → Authorized domains → Add domain**: `YOUR-NAME.github.io`
   (and `localhost` for testing).

### Password lock 密碼鎖
The lock is real Firebase Auth — Firestore/Storage rules reject anyone not signed in, so the data
is protected even though the page itself is public. 🔒 button = sign out (stops all sound).
Optional idle auto-lock in Settings (set **0** during a show).
Forgot password: reset it in Firebase console → Authentication → Users.

## 2. Deploy to GitHub
```bash
git init && git add . && git commit -m "Drama Cue"
git branch -M main
git remote add origin https://github.com/<you>/drama-cue.git
git push -u origin main
