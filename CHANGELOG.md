# Change Log

All notable changes to the "dot8assetmanager" extension will be documented in this file.

## [0.1.6] - 2026-11-22

- Prevented **Touch Asset Metadata** from processing `action.metadata` as an asset sidecar, avoiding duplicate `enable`/`Enable` properties and unwanted timestamp fields.
- Limited metadata updates to sidecars whose corresponding source asset exists.
- Corrected the root-folder metadata scan glob.
- Added regression coverage for asset, action, and orphaned metadata files.

## [0.1.5] - 2026-07-26
- Add summary


## [0.1.4] - 2026-06-20
- Feedback Command


## [0.1.3] - 2026-05-17

- Fixed command execution logging to capture stdout output when errors occur

## [0.1.2] - 2026-05-08

- Made `enable` field optional in action.metadata files, defaulting to `true` when omitted


## [0.1.1] - 2026-05-02

- Updated README metadata placeholder documentation:
	- Replaced trigger-oriented wording with file information variables.
	- Added workspace root metadata placeholders (`${root}`, `${root0}`, `${root1}`, ...).
	- Corrected placeholder name to `${filenamewithoutextension}`.

## [0.1.0] - 2026-04-28

- First working preview release.
- Added and stabilized core commands:
	- Update Changed Assets
	- Update All Assets
	- Touch Asset Metadata
- Documentation updates for configuration and workflow behavior.


## [0.0.1] - 2026-04-12

- Initial release.
