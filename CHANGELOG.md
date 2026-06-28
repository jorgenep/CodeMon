# Changelog

All notable changes to this project are documented in this file.

## [0.1.3] - 2026-06-28

### Changed

- Updated the Activity Bar container icon to use a dedicated, VS Code-compatible monochrome SVG glyph.
- Wired both the sidebar container and binder view icon contributions to `resources/activitybar-icon.svg` for consistent icon rendering.
- Refined icon asset compatibility to prevent fallback placeholder rendering in the sidebar.

## [0.1.2] - 2026-06-28

### Fixed

- Fixed `CodeMon: Add Bonus Pack` command crash caused by reading `pokemonDatabase.generations` from an array export.
- Updated generation picker logic to use exported `GENERATIONS` data when creating bonus pack choices.

### Changed

- Updated README and changelog entries to reflect pack-opening layout and animation refinements introduced after `0.1.1`.

## [0.1.1] - 2026-06-28

### Changed

- Centered pack-opening animation stage in the sidebar so cards and packs no longer render too high.
- Made pack/card reveal layout responsive to sidebar dimensions with bounded scaling and max-size caps.
- Updated animation travel distances to scale with rendered pack size for consistent motion across narrow and wide sidebar widths.
- Tuned final reveal resting position so opened cards sit visually centered in the sidebar.
- Added an upper-bound clamp so reveal motion does not place more than ~50% of a card above the visible stage.

## [0.1.0] - 2026-06-27

### Added

- Marketplace-ready extension metadata in package manifest.
- Professional repository files: README, LICENSE, CHANGELOG.
- Activity Bar SVG icon asset.
- `codemon.addPack` command registration and implementation.

### Changed

- Improved extension description and command labels for command palette clarity.
- Added package scripts for validation and VSIX packaging.
- Fixed contribution icon path mismatch (`icon.jpg` instead of missing `icon.png`).
- Corrected `.vscodeignore` to include runtime source and marketplace docs.
