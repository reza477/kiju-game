param([switch]$AppWindow, [switch]$ServerOnly)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

try {
    $localPortText = if ([string]::IsNullOrWhiteSpace($env:PORT)) { '4178' } else { $env:PORT }
    $localPort = 0
    if ($localPortText -notmatch '^\d+$' -or -not [int]::TryParse($localPortText, [ref]$localPort) -or $localPort -lt 1 -or $localPort -gt 65535) {
        throw 'PORT must be an integer from 1 to 65535.'
    }
    $localUrl = "http://127.0.0.1:$localPort"

    $nodeCommand = Get-Command node.exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    $nodePath = if ($null -ne $nodeCommand) { $nodeCommand.Source } else { $null }
    if ([string]::IsNullOrWhiteSpace($nodePath)) {
        $bundledNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
        if (Test-Path -LiteralPath $bundledNode -PathType Leaf) { $nodePath = $bundledNode }
    }
    if ([string]::IsNullOrWhiteSpace($nodePath)) { throw 'Node.js was not found. Nothing was installed.' }
    $identityCode = "const fs=require('fs'),c=require('crypto');console.log(c.createHash('sha256').update(fs.realpathSync(process.argv[1]).replaceAll(String.fromCharCode(92),'/').toLowerCase()).digest('hex'));"
    $expectedRootId = (& $nodePath -e $identityCode $PSScriptRoot | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or $expectedRootId -notmatch '^[a-f0-9]{64}$') { throw 'Could not verify the game folder.' }

    $appBrowser = $null
    if ($AppWindow -and -not $ServerOnly) {
        # Use the existing default-browser profile and exact origin so its
        # existing game saves remain available. Never use guest/private mode.
        $edgeCandidates = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe")
        $chromeCandidates = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe")
        $defaultHandler = (Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\Shell\Associations\UrlAssociations\http\UserChoice' -ErrorAction SilentlyContinue).ProgId
        $browserCandidates = if ($defaultHandler -like 'Chrome*') { $chromeCandidates + $edgeCandidates } else { $edgeCandidates + $chromeCandidates }
        $appBrowser = $browserCandidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
        if (-not $appBrowser) { throw 'Microsoft Edge or Google Chrome is required for the game window. Nothing was installed.' }
    }

    function Get-LocalHealth {
        $response = $null
        try {
            # HttpWebRequest works in a console-free Windows PowerShell host;
            # Invoke-WebRequest can require host state even with BasicParsing.
            $request = [System.Net.HttpWebRequest]::Create("$localUrl/health")
            $request.Proxy = $null
            $request.AllowAutoRedirect = $false
            $request.Timeout = 2000
            $request.ReadWriteTimeout = 2000
            $request.KeepAlive = $false
            $response = $request.GetResponse()
            if ([int]$response.StatusCode -ne 200) { return 'other' }
            $reader = New-Object IO.StreamReader($response.GetResponseStream())
            try { $healthText = $reader.ReadToEnd() } finally { $reader.Dispose() }
            try { $healthBody = $healthText | ConvertFrom-Json } catch { return 'other' }
            if ($healthBody.app -ceq 'colossus-wake-local' -and $healthBody.version -eq 1 -and $healthBody.rootId -ceq $expectedRootId) { return 'ready' }
            return 'other'
        } catch {
            if ($env:COLOSSUS_LAUNCH_DEBUG -eq '1') { Write-Host "Health check: $($_.Exception.Message)" }
            $healthException = $_.Exception
            while ($null -ne $healthException) {
                if ($null -ne $healthException.Response) { return 'other' }
                $healthException = $healthException.InnerException
            }
            return 'missing'
        } finally { if ($null -ne $response) { $response.Dispose() } }
    }

    $healthState = Get-LocalHealth
    if ($healthState -eq 'other') {
        throw "Port $localPort is being used by another app or an older game copy. Close that app, then open Colossus Wake again. Nothing else was opened or stopped."
    }
    if ($healthState -ne 'ready') {
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
    if ($ServerOnly) { Write-Output "Colossus Wake ready at $localUrl/"; exit 0 }
    # Recheck identity immediately before opening. A failed check never falls
    # back to a browser tab at an unverified local address.
    if ((Get-LocalHealth) -ne 'ready') { throw 'Game identity changed during startup. No window was opened.' }
    if ($AppWindow) {
        Start-Process -FilePath $appBrowser -ArgumentList @("--app=$localUrl/", '--start-maximized')
    } else { Start-Process -FilePath "$localUrl/" }
    Write-Host "Opened Colossus Wake at $localUrl/"
    Write-Host 'The local server stays running so the browser can reload the game.'
} catch {
    Write-Host "Could not start Colossus Wake: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
