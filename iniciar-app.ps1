param([switch]$SemAbrirNavegador)
$ErrorActionPreference = 'Stop'
$appDirectory = Join-Path $PSScriptRoot 'diogo-automates'
$installedNode = Get-Command node -ErrorAction SilentlyContinue
$nodeExecutable = if ($installedNode) { $installedNode.Source } else { Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
$nextExecutable = Join-Path $appDirectory 'node_modules\next\dist\bin\next'
$appUrl = 'http://localhost:3002'
$healthUrl = 'http://127.0.0.1:3002/api/health'
$logDirectory = Join-Path $appDirectory 'logs'
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
try {
    $existing = netstat -ano -p tcp | Select-String '127\.0\.0\.1:3002\s+.*LISTENING'
    if ($existing) {
        try { $health = Invoke-RestMethod $healthUrl -TimeoutSec 5 } catch { throw 'Existe uma versao antiga ou outro aplicativo na porta 3002. Execute Reiniciar-app.cmd.' }
        if ($health.app -ne 'diogo-automates' -or $health.revision -ne 'connection-recovery-v2') {
            throw 'A porta 3002 nao esta executando esta atualizacao. Execute Reiniciar-app.cmd.'
        }
    } else {
        if (-not (Test-Path -LiteralPath $nodeExecutable)) { throw 'Node.js nao encontrado.' }
        if (-not (Test-Path -LiteralPath (Join-Path $appDirectory '.next-local-v2\BUILD_ID'))) { throw 'A compilacao atualizada nao foi encontrada.' }
        & $nodeExecutable (Join-Path $appDirectory 'scripts\check-network.cjs')
        if ($LASTEXITCODE -ne 0) { throw 'O Windows nao conseguiu acessar o Higgsfield. Confira a conexao e execute este atalho diretamente no Windows.' }
        $env:NEXT_TELEMETRY_DISABLED = '1'
        $server = Start-Process -FilePath $nodeExecutable -ArgumentList @(('"' + $nextExecutable + '"'), 'start', '--hostname', '127.0.0.1', '--port', '3002') -WorkingDirectory $appDirectory -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDirectory 'server.log') -RedirectStandardError (Join-Path $logDirectory 'server-error.log') -PassThru
        $server.Id | Set-Content (Join-Path $logDirectory 'server.pid')
        $ready = $false
        for ($attempt = 0; $attempt -lt 40; $attempt++) {
            Start-Sleep -Milliseconds 500
            $server.Refresh()
            if ($server.HasExited) { throw 'O servidor parou. Consulte diogo-automates\logs\server-error.log.' }
            try {
                $health = Invoke-RestMethod $healthUrl -TimeoutSec 2
                if ($health.app -eq 'diogo-automates' -and $health.revision -eq 'connection-recovery-v2' -and $health.pid -eq $server.Id) { $ready = $true; break }
            } catch { }
        }
        if (-not $ready) { throw 'O servidor nao respondeu a tempo. Consulte diogo-automates\logs.' }
    }
    Invoke-RestMethod 'http://127.0.0.1:3002/api/jobs?limit=1' -TimeoutSec 5 | Out-Null
    if (-not $SemAbrirNavegador) { Start-Process $appUrl }
    Write-Output "App atualizado disponivel em $appUrl"
} catch {
    $_.Exception.Message | Set-Content (Join-Path $logDirectory 'startup-error.log')
    if (-not $SemAbrirNavegador) {
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, 'Diogo Automates') | Out-Null
    }
    throw
}
