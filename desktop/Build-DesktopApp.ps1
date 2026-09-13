param([switch]$CreateShortcuts)
$ErrorActionPreference = 'Stop'
$gameRoot = Split-Path -Parent $PSScriptRoot
$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path -LiteralPath $compiler)) { throw 'The existing Windows .NET Framework compiler is unavailable. Nothing was installed.' }

# Reproduce the game's existing assets/icon.svg as a Windows multi-size icon.
# All drawing is local and uses the built-in Windows drawing library.
Add-Type -AssemblyName System.Drawing
$iconFile = Join-Path $PSScriptRoot 'ColossusWake.ico'
$frames = @()
foreach ($size in @(32,48,64,128,256)) {
    $bitmap = New-Object Drawing.Bitmap($size,$size)
    $graphics = [Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.ScaleTransform($size / 100.0, $size / 100.0)
    $background = New-Object Drawing.SolidBrush([Drawing.ColorTranslator]::FromHtml('#233b35'))
    $gold = New-Object Drawing.SolidBrush([Drawing.ColorTranslator]::FromHtml('#d6c397'))
    $outline = New-Object Drawing.Drawing2D.GraphicsPath
    $outline.AddArc(0,0,44,44,180,90); $outline.AddArc(56,0,44,44,270,90)
    $outline.AddArc(56,56,44,44,0,90); $outline.AddArc(0,56,44,44,90,90); $outline.CloseFigure()
    $graphics.FillPath($background,$outline)
    $coords = @(22,72,22,44,32,23,41,44,41,58,59,58,59,37,69,15,79,37,79,72)
    $points = for ($i=0; $i -lt $coords.Count; $i+=2) { New-Object Drawing.PointF($coords[$i],$coords[$i+1]) }
    $graphics.FillPolygon($gold,[Drawing.PointF[]]$points)
    $pen = New-Object Drawing.Pen($gold,5)
    $graphics.DrawLine($pen,17,77,83,77)
    $stream = New-Object IO.MemoryStream
    $bitmap.Save($stream,[Drawing.Imaging.ImageFormat]::Png)
    $frames += [pscustomobject]@{Size=$size;Bytes=$stream.ToArray()}
    $stream.Dispose(); $pen.Dispose(); $outline.Dispose(); $gold.Dispose(); $background.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
}
$file = [IO.File]::Create($iconFile)
$writer = New-Object IO.BinaryWriter($file)
try {
    $writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]$frames.Count)
    $offset = 6 + 16 * $frames.Count
    foreach ($frame in $frames) {
        $dimension = if ($frame.Size -eq 256) { 0 } else { $frame.Size }
        $writer.Write([byte]$dimension); $writer.Write([byte]$dimension); $writer.Write([byte]0); $writer.Write([byte]0)
        $writer.Write([uint16]1); $writer.Write([uint16]32); $writer.Write([uint32]$frame.Bytes.Length); $writer.Write([uint32]$offset)
        $offset += $frame.Bytes.Length
    }
    foreach ($frame in $frames) { $writer.Write([byte[]]$frame.Bytes) }
} finally { $writer.Dispose(); $file.Dispose() }
$executable = Join-Path $gameRoot 'Colossus Wake.exe'
& $compiler /nologo /target:winexe /optimize+ /reference:System.Windows.Forms.dll "/win32icon:$iconFile" "/out:$executable" (Join-Path $PSScriptRoot 'Launcher.cs')
if ($LASTEXITCODE -ne 0) { throw 'Desktop launcher compilation failed.' }

if ($CreateShortcuts) {
    $shell = New-Object -ComObject WScript.Shell
    foreach ($folder in @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'))) {
        $linkPath = Join-Path $folder 'Colossus Wake - Kaiju Game.lnk'
        $link = $shell.CreateShortcut($linkPath)
        $link.TargetPath = $executable; $link.WorkingDirectory = $gameRoot
        $link.IconLocation = "$executable,0"
        $link.Description = 'Open Colossus Wake: cities on kaijus, armored crawlers and airships.'
        $link.Save()
        Write-Output "Shortcut: $linkPath"
    }
}
Write-Output "Desktop app: $executable"
