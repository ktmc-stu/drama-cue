# Drama Cue

Internal theatre sound cue playback. English and 繁體中文（香港書面語）. Password locked. Firebase cloud sync with a fully working offline mode.

## Design

The interface uses one restrained design system across every screen:
- Regular-weight typography, no heavy display fonts
- Muted theatre palette: charcoal, warm amber, soft green, brick red, steel blue, teal, lavender
- No neon glows, no animated gradient backgrounds
- Consistent buttons, fields, panels, chips, tags, dialogs, scrollbars, and spacing
- Functional colour only: amber = standby, green = playing, red = stop/panic

## Run

Use a static server or GitHub Pages:

```bash
python3 -m http.server 8080
