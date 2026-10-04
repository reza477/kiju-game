param(
  [Parameter(Mandatory = $true)][string]$PlanPath,
  [switch]$Apply
)
$ErrorActionPreference = 'Stop'
$plan = Get-Content -LiteralPath $PlanPath -Raw | ConvertFrom-Json
if ($plan.version -ne 1) { throw 'Unsupported evidence plan version.' }
$repository = Split-Path $PSScriptRoot -Parent
$worktrees = @(& git -C $repository worktree list --porcelain | Where-Object { $_.StartsWith('worktree ') } | ForEach-Object { [IO.Path]::GetFullPath($_.Substring(9)) })
if ($LASTEXITCODE -ne 0) { throw 'Cannot verify registered worktrees.' }
$roots = @($plan.roots | ForEach-Object { [IO.Path]::GetFullPath([string]$_) })
foreach ($root in $roots) {
  $parent = Split-Path $root -Parent
  if ((Split-Path $root -Leaf) -ne 'artifacts' -or (Split-Path $parent -Leaf) -ne 'Kiju Game' -or $parent -notin $worktrees) { throw "Unapproved evidence root: $root" }
  $tracked = @(& git -C $parent ls-files -- artifacts)
  if ($LASTEXITCODE -ne 0 -or $tracked.Count) { throw "Artifacts root has tracked files or cannot be checked: $root" }
}
$validatedDirectories = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
function Confirm-EvidencePath([string]$path) {
  $full = [IO.Path]::GetFullPath($path)
  $root = @($roots | Where-Object { $full.StartsWith($_.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase) })
  if ($root.Count -ne 1) { throw "Path is not strictly inside one approved artifacts root: $full" }
  $cursor = $full
  while ($cursor) {
    if ($validatedDirectories.Contains($cursor)) { break }
    if (Test-Path -LiteralPath $cursor) {
      $item = Get-Item -LiteralPath $cursor -Force
      if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Reparse point rejected: $cursor" }
      if ($item.PSIsContainer) { [void]$validatedDirectories.Add($cursor) }
    }
    $cursor = Split-Path $cursor -Parent
  }
  return $full
}
$protected = @($plan.protectedPaths | ForEach-Object { Confirm-EvidencePath ([string]$_) })
$protectedExact = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
$protectedFolders = @($protected | Where-Object { Test-Path -LiteralPath $_ -PathType Container })
foreach ($keep in $protected) { [void]$protectedExact.Add($keep) }
function Test-Protected([string]$path) {
  if ($protectedExact.Contains($path)) { return $true }
  foreach ($keep in $protectedFolders) {
    if ($path.StartsWith($keep.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase)) { return $true }
  }
  return $false
}
$files = @{}
$folders = @{}
foreach ($candidate in $plan.candidates) {
  $target = Confirm-EvidencePath ([string]$candidate)
  if (!(Test-Path -LiteralPath $target)) { continue }
  $item = Get-Item -LiteralPath $target -Force
  $items = @($item)
  if ($item.PSIsContainer) { $items += @(Get-ChildItem -LiteralPath $target -Recurse -Force) }
  foreach ($entry in $items) {
    $full = Confirm-EvidencePath $entry.FullName
    if (Test-Protected $full) { continue }
    if ($entry.PSIsContainer) { $folders[$full] = $true; continue }
    $files[$full] = [ordered]@{ path = $full; bytes = [long]$entry.Length; modifiedTicks = $entry.LastWriteTimeUtc.Ticks }
  }
}
$entries = @($files.Values | Sort-Object { $_.path })
$bytes = [long]0
foreach ($entry in $entries) { $bytes += [long]$entry.bytes }
if ($plan.expectedFiles -ne $entries.Count -or $plan.expectedBytes -ne $bytes) { throw 'Candidate count/bytes disagree with the independently audited plan.' }
$output = Confirm-EvidencePath ([string]$plan.output)
if (Test-Path -LiteralPath $output) { throw "Refusing to overwrite a previous cleanup ledger: $output" }
$record = [ordered]@{ version = 1; at = [DateTime]::UtcNow.ToString('o'); mode = $(if ($Apply) { 'apply' } else { 'preview' }); roots = $roots; retainedGroups = $plan.retainedGroups; protectedPaths = $protected; plannedFiles = $entries.Count; plannedBytes = $bytes; removedFiles = 0; removedBytes = 0; errors = @(); files = $entries }
if ($Apply) {
  $validatedDirectories.Clear()
  # Recheck all enumerated files before deleting any; never pass generated paths to another shell.
  foreach ($entry in $entries) {
    $full = Confirm-EvidencePath $entry.path
    $current = Get-Item -LiteralPath $full -Force
    if ($current.PSIsContainer -or $current.Length -ne $entry.bytes -or $current.LastWriteTimeUtc.Ticks -ne $entry.modifiedTicks -or (Test-Protected $full)) { throw "Evidence changed during preflight: $full" }
  }
  # Persist the exact plan before starting so interrupted cleanup remains auditable.
  $record | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $output -Encoding utf8
  $validatedDirectories.Clear()
  foreach ($entry in $entries) {
    try {
      $full = Confirm-EvidencePath $entry.path
      Remove-Item -LiteralPath $full -Force
      if (Test-Path -LiteralPath $full) { throw 'File still exists after removal.' }
      $record.removedFiles++
      $record.removedBytes += $entry.bytes
    } catch { $record.errors += [ordered]@{ path = $entry.path; error = $_.Exception.Message } }
  }
  foreach ($folder in ($folders.Keys | Sort-Object Length -Descending)) {
    $full = Confirm-EvidencePath $folder
    if ((Test-Path -LiteralPath $full) -and !(Test-Protected $full) -and @(Get-ChildItem -LiteralPath $full -Force).Count -eq 0) { Remove-Item -LiteralPath $full -Force }
  }
}
$record.finishedAt = [DateTime]::UtcNow.ToString('o')
$record | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $output -Encoding utf8
[ordered]@{ mode = $record.mode; plannedFiles = $record.plannedFiles; plannedBytes = $record.plannedBytes; removedFiles = $record.removedFiles; removedBytes = $record.removedBytes; errors = $record.errors.Count; ledger = $output } | ConvertTo-Json
if ($record.errors.Count) { exit 1 }
