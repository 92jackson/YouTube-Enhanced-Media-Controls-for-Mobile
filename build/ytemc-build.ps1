param(
	[string]$Version,
	[switch]$AutoAccept,
	[switch]$NoPause,
	[switch]$BuildCrx
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step {
	param(
		[string]$Message
	)
	Write-Host "[STEP] $Message" -ForegroundColor Cyan
}

function Write-Ok {
	param(
		[string]$Message
	)
	Write-Host "[OK] $Message" -ForegroundColor Green
}

function Get-ProjectRoot {
	$scriptDir = $PSScriptRoot
	if ([string]::IsNullOrWhiteSpace($scriptDir)) {
		$scriptDir = Split-Path -Parent $PSCommandPath
	}
	# The script is in build/ directory, so project root is parent directory
	return Split-Path -Parent $scriptDir
}

function Get-ChangelogVersion {
	param(
		[string]$ChangelogPath
	)
	if (!(Test-Path $ChangelogPath)) {
		Write-Host "[INFO] CHANGELOG.md not found at $ChangelogPath" -ForegroundColor Yellow
		return $null
	}
	$content = Get-Content -Path $ChangelogPath -Raw
	$match = [regex]::Match($content, '##\s*\[([^\]]+)\]')
	if ($match.Success) {
		return $match.Groups[1].Value.Trim()
	}
	Write-Host "[INFO] Version not found in CHANGELOG.md" -ForegroundColor Yellow
	return $null
}

function Prompt-BuildChoice {
	param(
		[string]$Default = "z"
	)
	$choice = Read-Host "Build what? (z)ip(s), (c)rx, or (b)oth [default: z]"
	if ([string]::IsNullOrWhiteSpace($choice)) { $choice = $Default }
	switch ($choice.ToLower()) {
		"z" { return "zip" }
		"c" { return "crx" }
		"b" { return "both" }
		default { 
			Write-Warning "Invalid choice. Please enter z, c, or b."
			return Prompt-BuildChoice $Default
		}
	}
}

function Prompt-Version {
	param(
		[string]$Detected
	)
	Write-Host "[INFO] Detected version from CHANGELOG.md: $Detected"
	$input = Read-Host "Press Enter to accept or type a different version"
	$final = if ([string]::IsNullOrWhiteSpace($input)) { $Detected } else { $input.Trim() }
	while (-not ($final -match '^\d+(\.\d+)*$')) {
		Write-Warning "Invalid version format. Expected digits and dots (e.g., 1.2.3 or 1.2.4.2)."
		$final = Read-Host "Enter version number"
	}
	return $final
}

function Update-Version-Line {
	param(
		[string]$FilePath,
		[string]$Version
	)
	if (!(Test-Path $FilePath)) {
		Write-Warning ("Skipped updating manifest (missing): " + $FilePath)
		return $false
	}
	$content = Get-Content -Path $FilePath -Raw
	$pattern = '("version"\s*:\s*")([^"]+)(")'
	$updated = [regex]::Replace(
		$content,
		$pattern,
		{ param($m) $m.Groups[1].Value + $Version + $m.Groups[3].Value }
	)
	Set-Content -Path $FilePath -Value $updated -Encoding UTF8
	return $true
}

function Update-AllManifests {
	param(
		[string]$Root,
		[string]$Version
	)
	# Chrome: prefer manifest.json, fall back to manifest.gc.json; warn only if both missing
	$chromePrimary = Join-Path $Root 'manifest.json'
	$chromeFallback = Join-Path $Root 'manifest.gc.json'
	$hasChromePrimary = Test-Path $chromePrimary
	$hasChromeFallback = Test-Path $chromeFallback
	if ($hasChromePrimary -or $hasChromeFallback) {
		if ($hasChromePrimary) { [void](Update-Version-Line $chromePrimary $Version) }
		if ($hasChromeFallback) { [void](Update-Version-Line $chromeFallback $Version) }
	} else {
		Write-Warning "Chrome manifests missing: manifest.json and manifest.gc.json"
	}

	# Firefox manifest: warn if missing
	[void](Update-Version-Line (Join-Path $Root 'manifest.ff.json') $Version)
}

function Prepare-Staging {
	param(
		[string]$Root,
		[string]$TargetKey,
		[string]$OutputRoot
	)
	$staging = Join-Path $OutputRoot ("staging-" + $TargetKey + "-" + ([Guid]::NewGuid().ToString()))
	New-Item -ItemType Directory -Path $staging | Out-Null

	$xf = @("*.zip", "build-zips.ps1", "*.pem")
	$xd = @((Join-Path $Root '_metadata'), (Join-Path $Root '.vercel'), (Join-Path $Root 'build'))
	switch ($TargetKey) {
		"gc" { $xf += @("manifest.ff.json") }
		"ff" { $xf += @("manifest.json","manifest.ff.json") }
	}

	$robocopyArgs = @($Root, $staging, "/MIR", "/NFL", "/NDL", "/NP", "/R:2", "/W:2")
	if ($xd.Count -gt 0) { $robocopyArgs += @("/XD"); $robocopyArgs += $xd }
	if ($xf.Count -gt 0) { $robocopyArgs += @("/XF"); $robocopyArgs += $xf }

	Write-Step "Copying project files for $TargetKey (excluding _metadata, .vercel, build, manifests, zips, .pem)"
	& robocopy @robocopyArgs | Out-Null

	# Staging manifest will be ensured later per-target with fallback logic

	return $staging
}

function Ensure-StagingManifest {
	param(
		[string]$Root,
		[string]$TargetKey,
		[string]$Staging
	)
	$stagingManifest = Join-Path $Staging 'manifest.json'
	switch ($TargetKey) {
		'gc' {
			if (!(Test-Path $stagingManifest)) {
				$primary = Join-Path $Root 'manifest.json'
				$fallback = Join-Path $Root 'manifest.gc.json'
				if (Test-Path $primary) {
					Copy-Item -Path $primary -Destination $stagingManifest -Force
					return $true
				} elseif (Test-Path $fallback) {
					Write-Warning "Chrome manifest.json missing; falling back to manifest.gc.json"
					Copy-Item -Path $fallback -Destination $stagingManifest -Force
					return $true
				} else {
					Write-Warning "Skipping Chrome: no manifest.json or manifest.gc.json found"
					return $false
				}
			}
			return $true
		}
		'ff' {
			$ff = Join-Path $Root 'manifest.ff.json'
			if (Test-Path $ff) {
				Copy-Item -Path $ff -Destination $stagingManifest -Force
				return $true
			} else {
				Write-Warning "Skipping Firefox: manifest.ff.json missing"
				return $false
			}
		}
	}
}

function Cleanup-StagingDirs {
	param(
		[string]$OutputRoot
	)
	try {
		$emptyDir = Join-Path $OutputRoot '__empty__'
		if (!(Test-Path $emptyDir)) { New-Item -ItemType Directory -Path $emptyDir | Out-Null }
		Get-ChildItem -LiteralPath $OutputRoot -Directory -ErrorAction SilentlyContinue |
			Where-Object { $_.Name -like 'staging-*' } |
			ForEach-Object {
				# Use robocopy to mirror to empty dir to robustly wipe deep nested content
				& robocopy $emptyDir $_.FullName /MIR /NFL /NDL /NP /R:2 /W:2 | Out-Null
				try { Remove-Item -LiteralPath $_.FullName -Recurse -Force -ErrorAction SilentlyContinue } catch {}
			}
		try { Remove-Item -LiteralPath $emptyDir -Recurse -Force -ErrorAction SilentlyContinue } catch {}
	} catch {}
}

function Build-Zip {
	param(
		[string]$Staging,
		[string]$ZipPath
	)
	if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
	Add-Type -AssemblyName System.IO.Compression
	Add-Type -AssemblyName System.IO.Compression.FileSystem
	$resolvedStaging = (Resolve-Path -LiteralPath $Staging).Path
	$zipFs = $null
	$zip = $null
	$zipFs = [System.IO.File]::Open($ZipPath, [System.IO.FileMode]::Create, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
	try {
		$zip = New-Object System.IO.Compression.ZipArchive($zipFs, [System.IO.Compression.ZipArchiveMode]::Create, $false)
		Get-ChildItem -LiteralPath $resolvedStaging -Recurse -File | ForEach-Object {
			$rel = $_.FullName.Substring($resolvedStaging.Length).TrimStart([char]92, [char]47)
			$entryName = ($rel -replace '\\','/')
			[System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $entryName, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
		}
	} finally {
		if ($zip) { $zip.Dispose() }
		if ($zipFs) { $zipFs.Dispose() }
	}
}

function Assert-ZipHasPosixEntries {
	param(
		[string]$ZipPath
	)
	try {
		Add-Type -AssemblyName System.IO.Compression
		Add-Type -AssemblyName System.IO.Compression.FileSystem
		$z = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
		$hasWinSep = $false
		foreach ($e in $z.Entries) { if ($e.FullName -match '\\') { $hasWinSep = $true; break } }
		$z.Dispose()
		if ($hasWinSep) {
			Write-Host "[WARN] Zip contains Windows-style entry names: $ZipPath" -ForegroundColor Yellow
		} else {
			Write-Host "[CHECK] Zip entry paths are POSIX-style: $ZipPath" -ForegroundColor Green
		}
	} catch {
		Write-Host "[WARN] Could not validate zip entries: $ZipPath" -ForegroundColor Yellow
	}
}

function Get-BrowserExe {
	# Try Edge first, then Chrome
	$edge = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe' -ErrorAction SilentlyContinue
	if ($edge -and (Test-Path $edge.'(default)')) { return $edge.'(default)' }
	$chrome = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe' -ErrorAction SilentlyContinue
	if ($chrome -and (Test-Path $chrome.'(default)')) { return $chrome.'(default)' }
	throw "Neither Edge nor Chrome executable found. Install one or add its folder to PATH."
}

function Build-Crx {
	param(
		[string]$StagingDir,
		[string]$CrxPath,
		[string]$PemPath
	)
	
	# Get browser executable (try Edge first, then Chrome)
	$browser = Get-BrowserExe
	
	# Check if .pem file exists and provide info
	if (Test-Path $PemPath) {
		Write-Host "[INFO] Loading existing private key: $PemPath" -ForegroundColor Green
	} else {
		Write-Host "[INFO] No private key found, will create new one" -ForegroundColor Yellow
	}
	
	# If no key exists, generate one by letting the browser create it
	if (!(Test-Path $PemPath)) {
		Write-Step "Generating new private key: $PemPath"
		# First create the CRX without key to generate the key
		& $browser "--pack-extension=$StagingDir" 2>&1 | ForEach-Object { Write-Host "[BROWSER] $_" -ForegroundColor Gray }
		
		# The browser creates both .crx and .pem files in the staging directory
		$generatedPem = "$StagingDir.pem"
		$generatedCrx = "$StagingDir.crx"
		
		if (Test-Path $generatedPem) {
			Move-Item -Path $generatedPem -Destination $PemPath -Force
			Write-Ok "Private key generated: $PemPath"
		} else {
			throw "Failed to generate private key - .pem file not created by browser"
		}
	}
	
	# Now create the CRX with the key
	Write-Step "Creating CRX package using $browser"
	& $browser "--pack-extension=$StagingDir" "--pack-extension-key=$PemPath" 2>&1 | ForEach-Object { Write-Host "[BROWSER] $_" -ForegroundColor Gray }
	
	# Move the generated CRX to the final location
	$generatedCrx = "$StagingDir.crx"
	if (Test-Path $generatedCrx) {
		Move-Item -Path $generatedCrx -Destination $CrxPath -Force
		Write-Ok "CRX created: $CrxPath"
	} else {
		throw "CRX file not produced by browser"
	}
}

try {
	Write-Host "========================================" -ForegroundColor Cyan
	Write-Host "  YTEMC Build Script" -ForegroundColor Green
	Write-Host "========================================" -ForegroundColor Cyan
	Write-Host ""
	
	$root = Get-ProjectRoot
	Write-Host "[INFO] Project root: $root" -ForegroundColor White
	Write-Host "" -ForegroundColor White

	$detectedVersion = Get-ChangelogVersion (Join-Path $root 'CHANGELOG.md')
	if ([string]::IsNullOrWhiteSpace($Version)) {
		if ([string]::IsNullOrWhiteSpace($detectedVersion)) {
			Write-Host "[INFO] CHANGELOG.md not found or version not detected" -ForegroundColor Yellow
			if ($AutoAccept.IsPresent) {
				throw "Cannot auto-accept version: CHANGELOG.md not found or version not detected"
			} else {
				$version = Read-Host "Enter desired version number"
				while (-not ($version -match '^\d+(\.\d+)*$')) {
					Write-Warning "Invalid version format. Expected digits and dots (e.g., 1.2.3 or 1.2.4.2)."
					$version = Read-Host "Enter version number"
				}
				Write-Host "[INFO] Using manually entered version: $version" -ForegroundColor White
			}
		} else {
			if ($AutoAccept.IsPresent) {
				$version = $detectedVersion
				Write-Host "[INFO] Auto-accepted version from changelog: $version" -ForegroundColor White
			} else {
				$version = Prompt-Version $detectedVersion
				Write-Host "[INFO] Using version: $version" -ForegroundColor White
			}
		}
	} else {
		$version = $Version.Trim()
		Write-Host "[INFO] Using supplied version: $version" -ForegroundColor White
	}

	Write-Host ""
	Write-Step "Updating manifests to version $version"
	Update-AllManifests $root $version
	Write-Ok "Manifest versions updated."

	Write-Host ""
	$outputRoot = Join-Path $root ("build\output\" + $version)
	New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null
	Cleanup-StagingDirs $outputRoot

	# Determine what to build based on parameters or interactive prompt
	if ($BuildCrx.IsPresent) {
		# Parameter override: build only CRX
		$buildChoice = "crx"
	} elseif ($AutoAccept.IsPresent) {
		# Auto-accept mode: build zips by default
		$buildChoice = "zip"
	} else {
		# Interactive mode: ask user
		$buildChoice = Prompt-BuildChoice
	}
	
	# Set build flags based on choice
	switch ($buildChoice) {
		"zip" { $buildZips = $true; $buildCrx = $false }
		"crx" { $buildZips = $false; $buildCrx = $true }
		"both" { $buildZips = $true; $buildCrx = $true }
	}

	$targets = @(
		@{ key="gc"; label="Chrome"; base="ytemc-gc" },
		@{ key="ff"; label="Firefox"; base="ytemc-ff" }
	)

	foreach ($t in $targets) {
		# Skip Firefox if only building CRX (CRX is Chrome-only)
		if ($buildCrx -and -not $buildZips -and $t.key -eq "ff") {
			continue
		}
		
		# Skip Chrome if only building zips and Chrome manifest is missing
		if ($buildZips -and -not $buildCrx -and $t.key -eq "gc") {
			$chromePrimary = Join-Path $root 'manifest.json'
			$chromeFallback = Join-Path $root 'manifest.gc.json'
			if (-not (Test-Path $chromePrimary) -and -not (Test-Path $chromeFallback)) {
				Write-Warning "Skipping Chrome: no manifest.json or manifest.gc.json found"
				continue
			}
		}
		
		Write-Step "Preparing staging for $($t.label)"
		$staging = Prepare-Staging $root $t.key $outputRoot

		# Ensure manifest exists in staging (with target-specific fallback)
		if (-not (Ensure-StagingManifest $root $t.key $staging)) {
			Write-Warning ("Skipping " + $t.label + " packaging due to missing manifest(s).")
			try { Remove-Item -LiteralPath $staging -Recurse -Force -ErrorAction SilentlyContinue } catch {}
			continue
		}

		if ($buildZips) {
			Write-Step "Creating zip for $($t.label)"
			$zipName = $t.base + "-" + $version + ".zip"
			$zipPath = Join-Path $outputRoot $zipName
			Build-Zip $staging $zipPath
			Assert-ZipHasPosixEntries $zipPath
			Write-Ok "$($t.label) packaged: $zipPath"
		}

		if ($buildCrx -and $t.key -eq 'gc') {
			# Build Edge CRX using Chrome staging directory
			$crxName = 'ytemc-me-' + $version + '.crx'
			$crxPath = Join-Path $outputRoot $crxName
			$pemName = 'ytemc.pem'
			$pemPath = Join-Path (Join-Path $root "build") $pemName
			Build-Crx $staging $crxPath $pemPath
		}

		# Clean up staging directory for this target
		try { Remove-Item -LiteralPath $staging -Recurse -Force -ErrorAction SilentlyContinue } catch {}
	}

	# Final cleanup in case any old staging directories remain
	Cleanup-StagingDirs $outputRoot

	Write-Host ""
	Write-Host "========================================" -ForegroundColor Cyan
	Write-Host "[SUCCESS] All packages created in:" -ForegroundColor Green
	Write-Host "  $outputRoot" -ForegroundColor White
	Write-Host "========================================" -ForegroundColor Cyan
} catch {
	Write-Error $_
} finally {
	Write-Host ""
	if ($NoPause.IsPresent) {
		Write-Host "[INFO] NoPause set; exiting without prompt." -ForegroundColor White
	} else {
		Read-Host "Press Enter to exit"
	}
}