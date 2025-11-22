# YTEMC Build Script

This folder contains the PowerShell build script used to package the extension for distribution and testing.

## Overview

-   Packages Chrome and Firefox as zip archives.
-   Builds a CRX for Edge/Chrome testing.
-   Organizes outputs under `build/output/<version>/`.

## Prerequisites

-   Windows with Microsoft Edge or Google Chrome installed.
-   PowerShell 5+.
-   Run from the project root or the `build/` folder.

## Usage

Interactive (choose zips/CRX/both):

```powershell
	.\build\ytemc-build.ps1
```

Auto-accept detected version from `CHANGELOG.md` and build zips:

```powershell
	.\build\ytemc-build.ps1 -AutoAccept
```

Build CRX only (no zips):

```powershell
	.\build\ytemc-build.ps1 -BuildCrx
```

Specify version explicitly:

```powershell
	.\build\ytemc-build.ps1 -Version 1.6.0
```

Run without the final pause:

```powershell
	.\build\ytemc-build.ps1 -NoPause
```

## Flags

-   `-AutoAccept` — accepts detected version (if found) and builds without prompts.
-   `-BuildCrx` — builds only CRX (skips Firefox zips).
-   `-Version <x.y.z>` — overrides the version used for packaging.
-   `-NoPause` — exits without the final prompt.

## Outputs

-   `build/output/<version>/`
    -   `ytemc-gc-<version>.zip` — Chrome package (if built)
    -   `ytemc-ff-<version>.zip` — Firefox package (if built)
    -   `ytemc-me-<version>.crx` — Edge/Chrome CRX (if built)

## Private Key (CRX)

-   Uses `build/ytemc.pem` if present.
-   If missing, the browser generates a new key on first CRX build and the script moves it to `build/ytemc.pem`.

## Staging & Exclusions

-   Staging excludes `_metadata`, `.vercel`, `build`, existing archives, and non-target manifests.

## Notes

-   When `CHANGELOG.md` is missing or the version cannot be detected, interactive mode prompts for the version; auto-accept mode will fail in that case.
-   CRX builds target Chrome/Edge only; Firefox packaging is skipped when building only CRX.

## Troubleshooting

-   "Neither Edge nor Chrome executable found": install Edge or Chrome.
-   "CRX file not produced": ensure your browser supports `--pack-extension` and `--pack-extension-key` flags.
