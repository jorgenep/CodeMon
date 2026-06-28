# CodeMon TCG

CodeMon TCG turns productive coding activity into a lightweight collectible card game inside VS Code. Earn XP from real editing patterns, buy booster packs, and build your binder over time.

## Features

- XP wallet in the status bar
- Shop flow for generation-based booster packs
- Sidebar binder webview for card collection and packs
- Centered, responsive pack-opening animation that scales with sidebar size (with max card/pack size caps)
- Reveal card positioning now keeps the card visually centered and prevents more than ~50% from moving off-screen at the top
- Achievement tracking with quiet in-editor feedback
- Anti-cheat heuristics for suspicious error-fix behavior

## Commands

- `CodeMon: Open Shop` (`codemon.openShop`)
- `CodeMon: Add Bonus Pack` (`codemon.addPack`)
- `CodeMon: Show Tracker Stats` (`codemon.showStats`)
- `CodeMon: Reset Tracker Stats` (`codemon.resetStats`)

## Requirements

- VS Code 1.75.0 or newer

## Extension Settings

This version does not contribute custom settings yet.

## Known Limitations

- Local state is stored in VS Code global state and does not sync between machines.
- Anti-cheat logic is heuristic and may occasionally under-reward edge cases.

## Release Notes

See CHANGELOG.md for version history.

### Latest Updates

- `0.1.3`: Sidebar icon compatibility update using a dedicated monochrome Activity Bar SVG to avoid placeholder icon rendering.
- `0.1.2`: Bonus Pack command fix for generation selection (`CodeMon: Add Bonus Pack`) plus release documentation updates.
- `0.1.1`: Responsive, centered pack-opening animation updates with bounded card travel in narrow and wide sidebars.

## Contributing

1. Fork the repository.
2. Open a PR with a clear summary and screenshots for UI changes.
3. Keep command IDs and persisted state keys backward compatible.

## License

MIT. See LICENSE for full text.
