$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

try {
    $localPortText = if ([string]::IsNullOrWhiteSpace($env:PORT)) { '4178' } else { $env:PORT }
    $localPort = 0
    if ($localPortText -notmatch '^\d+$' -or -not [int]::TryParse($localPortText, [ref]$localPort) -or $localPort -lt 1 -or $localPort -gt 65535) {
        throw 'PORT must be an integer from 1 to 65535.'
    }
    $localUrl = "http://127.0.0.1:$localPort"

    function Get-LocalHealth {
        try {
            $healthReply = Invoke-WebRequest -Uri "$localUrl/health" -UseBasicParsing -TimeoutSec 2 -MaximumRedirection 0
            if ($healthReply.StatusCode -ne 200) { return 'other' }
            try { $healthBody = $healthReply.Content | ConvertFrom-Json } catch { return 'other' }
            if ($healthBody.app -ceq 'colossus-wake-local' -and $healthBody.version -eq 1) { return 'ready' }
            return 'other'
        } catch {
            if ($null -ne $_.Exception.Response) { return 'other' }
            return 'missing'
        }
    }

    $healthState = Get-LocalHealth
    if ($healthState -eq 'other') {
        throw "Port $localPort belongs to an unrecognized service. Set PORT to a free port and try again."
    }
    if ($healthState -ne 'ready') {
        $nodeCommand = Get-Command node.exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
        $nodePath = if ($null -ne $nodeCommand) { $nodeCommand.Source } else { $null }
        if ([string]::IsNullOrWhiteSpace($nodePath)) {
            $bundledNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
            if (Test-Path -LiteralPath $bundledNode -PathType Leaf) { $nodePath = $bundledNode }
        }
        if ([string]::IsNullOrWhiteSpace($nodePath)) {
            throw 'Node.js was not found on PATH or in the bundled Codex runtime. Nothing was installed.'
        }
        $serverPath = Join-Path $PSScriptRoot 'server.mjs'
        if (-not (Test-Path -LiteralPath $serverPath -PathType Leaf)) { throw 'server.mjs is missing beside Play.ps1.' }
        $logDirectory = Join-Path $PSScriptRoot 'logs'
        New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
        $logTag = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
        $outputLog = Join-Path $logDirectory "server-$logTag.out.log"
        $errorLog = Join-Path $logDirectory "server-$logTag.err.log"
        $serverArgument = '"' + $serverPath + '"'
        $oldPortValue = $env:PORT
        try {
            $env:PORT = [string]$localPort
            $serverProcess = Start-Process -FilePath $nodePath -ArgumentList $serverArgument -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput $outputLog -RedirectStandardError $errorLog -PassThru
        } finally {
            $env:PORT = $oldPortValue
        }
        $serverProcess.Id | Set-Content -LiteralPath (Join-Path $logDirectory "server-$localPort.pid") -Encoding Ascii
        for ($attempt = 0; $attempt -lt 30; $attempt++) {
            Start-Sleep -Milliseconds 200
            $healthState = Get-LocalHealth
            if ($healthState -eq 'ready') { break }
            if ($healthState -eq 'other') { throw "Port $localPort answered with an unrecognized service. Browser was not opened." }
            $serverProcess.Refresh()
            if ($serverProcess.HasExited) { throw "The local server exited. See $errorLog" }
        }
        if ($healthState -ne 'ready') { throw "The local server did not become ready. See $errorLog" }
    }
    Start-Process -FilePath "$localUrl/"
    Write-Host "Opened Colossus Wake at $localUrl/"
    Write-Host 'The local server stays running so the browser can reload the game.'
} catch {
    Write-Host "Could not start Colossus Wake: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
