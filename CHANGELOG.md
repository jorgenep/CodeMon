# Changelog

All notable changes to this project are documented in this file.

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
