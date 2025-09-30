<#
.SYNOPSIS
  Prefix all files in a workspace with "Map" and update in-file references.

.DESCRIPTION
  - Recursively renames every file by adding the prefix "Map" to the filename, except:
    * .git folder and any of its contents
    * Dotfiles (like .gitattributes) — renaming these can break Git; skipped by default
  - Updates references in common text/code files (html, js, css, json, py, md, txt) from the old filename to the new Map-prefixed name.
  - Provides a DryRun mode for preview and an Execute mode to apply changes.

.PARAMETER Root
  The root path to process. Defaults to the script's parent directory.

.PARAMETER DryRun
  Preview the planned changes without applying them (default).

.PARAMETER Execute
  Apply the changes.

.PARAMETER IncludeExtensions
  Additional file extensions (comma-separated) to treat as text for reference updates (e.g., "yaml,yml,ts").

.EXAMPLE
  # Preview only
  .\MapBulkPrefix.ps1 -DryRun

.EXAMPLE
  # Execute renames and reference updates
  .\MapBulkPrefix.ps1 -Execute

.NOTES
  - Run in PowerShell 5+ on Windows.
  - Ensure your editor is closed or has auto-refresh when running renames.
  - Commit your work before running to allow easy rollback.
#>

[CmdletBinding(SupportsShouldProcess=$true)]
param(
  [string]$Root = (Split-Path -Parent $MyInvocation.MyCommand.Path),
  [switch]$DryRun = $true,
  [switch]$Execute,
  [string]$IncludeExtensions = ''
)

if ($Execute) { $DryRun = $false }

Write-Host "Map Bulk Prefix - Root: $Root" -ForegroundColor Cyan

if (-not (Test-Path -LiteralPath $Root -PathType Container)) {
  Write-Error "Root path not found: $Root"
  exit 1
}

# Build list of files to rename: skip .git and any filenames starting with Map or dotfiles
$allFiles = Get-ChildItem -Path $Root -Recurse -File -Force |
  Where-Object {
    $_.FullName -notmatch "\\\.git\\" -and
    $_.Name -notmatch '^(Map|\.).*'
  }

if (-not $allFiles) {
  Write-Host "No files to rename (everything already Map-prefixed or only dotfiles present)." -ForegroundColor Yellow
}

# Prepare mapping
$renameMap = @()
foreach ($f in $allFiles) {
  $newName = "Map$($f.Name)"
  $renameMap += [pscustomobject]@{
    OldPath = $f.FullName
    NewPath = (Join-Path $f.DirectoryName $newName)
    OldName = $f.Name
    NewName = $newName
  }
}

Write-Host "Planned renames:" -ForegroundColor Green
$renameMap | Select-Object OldPath, NewPath | Format-Table -AutoSize | Out-String | Write-Host

if ($DryRun) {
  Write-Host "DryRun mode: no changes applied. Run with -Execute to apply." -ForegroundColor Yellow
  return
}

# Apply renames
foreach ($m in $renameMap) {
  if (Test-Path -LiteralPath $m.NewPath) {
    Write-Warning "Target already exists, skipping: $($m.NewPath)"
    continue
  }
  try {
    Rename-Item -LiteralPath $m.OldPath -NewName $m.NewName -Force -ErrorAction Stop
    Write-Host "Renamed: $($m.OldPath) -> $($m.NewPath)" -ForegroundColor Gray
  }
  catch {
    Write-Error "Failed to rename $($m.OldPath): $_"
  }
}

# Text files to update references in
$baseExt = @('html','htm','js','css','json','py','md','txt')
$extraExt = @()
if ($IncludeExtensions) {
  $extraExt = $IncludeExtensions.Split(',') | ForEach-Object { $_.Trim().ToLower() } | Where-Object { $_ }
}
$extSet = ($baseExt + $extraExt) | Select-Object -Unique

$glob = $extSet | ForEach-Object { "*." + $_ }
$textFiles = Get-ChildItem -Path $Root -Recurse -File -Include $glob -Force |
  Where-Object { $_.FullName -notmatch "\\\.git\\" }

Write-Host "Updating references in $($textFiles.Count) text files..." -ForegroundColor Green

# Build a hashtable for faster lookup by old name
$mapByOldName = @{}
foreach ($m in $renameMap) { $mapByOldName[$m.OldName] = $m.NewName }

foreach ($tf in $textFiles) {
  try {
    $content = Get-Content -LiteralPath $tf.FullName -Raw -ErrorAction Stop
  }
  catch {
    Write-Warning "Skipping reference update (read failed): $($tf.FullName)"
    continue
  }

  $updated = $false
  foreach ($kv in $mapByOldName.GetEnumerator()) {
    $old = [regex]::Escape($kv.Key)
    $new = $kv.Value
    $newContent = [regex]::Replace($content, $old, [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $new })
    if (![object]::ReferenceEquals($newContent, $content)) { $content = $newContent; $updated = $true }
  }

  if ($updated) {
    try {
      Set-Content -LiteralPath $tf.FullName -Value $content -Encoding UTF8 -NoNewline
      Write-Host "Updated references in: $($tf.FullName)" -ForegroundColor Gray
    }
    catch {
      Write-Warning "Failed to update references in: $($tf.FullName)"
    }
  }
}

Write-Host "All done. Review git diff and test your app." -ForegroundColor Cyan
