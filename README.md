# VEIL

A desktop app for Deadlock: install the measured CompLock mods, write engine settings safely, and shape your health bars, crosshair and hit sounds before they reach the game.

- **Mods**: every CompLock mod with its benchmark numbers and before/after shots, plus VEIL's own cvar tweaks
- **Forge**: preview health bars and damage numbers over a 3D hero
- **Crosshair**: 32 presets, an editor, in-game cvars or an overlay that can draw any shape (Alt+Shift+X)
- **Hit sounds**: synthesised kits or your own files, trimmed and tuned
- **Console**: searchable cvar index
- **Install**: finds Deadlock through Steam, backs up `gameinfo.gi`, manages addon paks

Download the installer from [Releases](../../releases). The app updates itself from new releases.

## Develop

```bash
cd veil
npm install
npm run dev
```

Ship an update: bump `version` in `veil/package.json`, commit, then push a tag like `v0.2.1`. The Release workflow builds the installer and publishes it.

Mod files, benchmark numbers and comparison images belong to CompLock (HoppCX and jcStani, deadlockconfig.com). Hero models and art come from the game via the community Deadlock API. VEIL is not affiliated with Valve.
