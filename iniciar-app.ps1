param([switch]$SemAbrirNavegador, [switch]$Celular)
$ErrorActionPreference = 'Stop'
$appDirectory = Join-Path $PSScriptRoot 'diogo-automates'
$installedNode = Get-Command node -ErrorAction SilentlyContinue
$nodeExecutable = if ($installedNode) { $installedNode.Source } else { Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
$nextExecutable = Join-Path $appDirectory 'node_modules\next\dist\bin\next'
$appUrl = 'http://localhost:3002'
$healthUrl = 'http://127.0.0.1:3002/api/health'
# Phone mode listens on every interface so a device on the same Wi-Fi can connect.
$listenAddress = if ($Celular) { '0.0.0.0' } else { '127.0.0.1' }
$envFile = Join-Path $appDirectory '.env.local'
$logDirectory = Join-Path $appDirectory 'logs'
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null

function Get-AppPassword {
    if (-not (Test-Path -LiteralPath $envFile)) { return '' }
    $line = Get-Content -LiteralPath $envFile | Where-Object { $_ -match '^\s*APP_PASSWORD\s*=' } | Select-Object -Last 1
    if (-not $line) { return '' }
    return ($line -replace '^\s*APP_PASSWORD\s*=\s*', '').Trim().Trim('"', "'")
}

# Letters and digits only: .env files treat $, # and quotes specially.
function New-AppPassword {
    do {
        $password = Read-Host 'Crie uma senha para o acesso pelo celular (minimo 6 letras ou numeros)'
    } until ($password -match '^[A-Za-z0-9]{6,}$')
    $prefix = ''
    if ((Test-Path -LiteralPath $envFile) -and -not ([System.IO.File]::ReadAllText($envFile)).EndsWith("`n")) { $prefix = "`r`n" }
    # AppendAllText writes UTF-8 without a BOM, which would otherwise corrupt the first key.
    [System.IO.File]::AppendAllText($envFile, $prefix + "APP_PASSWORD=$password`r`n")
    return $password
}

function Open-FirewallPort {
    $ruleName = 'Diogo Automates - celular (porta 3002)'
    try {
        if (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue) { return }
        Write-Output 'Liberando a porta 3002 no Firewall do Windows. Confirme o pedido de administrador.'
        $command = "New-NetFirewallRule -DisplayName '$ruleName' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3002 -RemoteAddress LocalSubnet -Profile Any | Out-Null"
        $encoded = [Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes($command))
        Start-Process powershell.exe -Verb RunAs -Wait -WindowStyle Hidden -ArgumentList '-NoProfile', '-EncodedCommand', $encoded
    } catch {
        Write-Warning 'A porta 3002 nao foi liberada no firewall. Se o celular nao conectar, permita o Node.js no Firewall do Windows.'
    }
}

try {
    $appPassword = Get-AppPassword
    if ($Celular -and -not $appPassword) { $appPassword = New-AppPassword }
    $existing = netstat -ano -p tcp | Select-String '(127\.0\.0\.1|0\.0\.0\.0):3002\s+.*LISTENING'
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
        $server = Start-Process -FilePath $nodeExecutable -ArgumentList @(('"' + $nextExecutable + '"'), 'start', '--hostname', $listenAddress, '--port', '3002') -WorkingDirectory $appDirectory -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDirectory 'server.log') -RedirectStandardError (Join-Path $logDirectory 'server-error.log') -PassThru
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
    $probeHeaders = @{}
    if ($appPassword) {
        # The cookie lib/access.ts expects: sha256 of "diogo-automates:<password>".
        $hash = [System.Security.Cryptography.SHA256]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes("diogo-automates:$appPassword"))
        $probeHeaders['Cookie'] = 'da_acesso=' + (-join ($hash | ForEach-Object { $_.ToString('x2') }))
    }
    Invoke-RestMethod 'http://127.0.0.1:3002/api/jobs?limit=1' -Headers $probeHeaders -TimeoutSec 5 | Out-Null
    if (-not $SemAbrirNavegador) { Start-Process $appUrl }
    Write-Output "App atualizado disponivel em $appUrl"
    if ($Celular) {
        Open-FirewallPort
        $addresses = @(Get-NetIPConfiguration -ErrorAction SilentlyContinue | Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' } | ForEach-Object { $_.IPv4Address.IPAddress })
        Write-Output ''
        Write-Output 'No celular, conectado ao mesmo Wi-Fi deste computador, abra:'
        foreach ($address in $addresses) { Write-Output "    http://${address}:3002" }
        if (-not $addresses) { Write-Output '    http://IPV4:3002  (veja o IPv4 deste computador com o comando ipconfig)' }
        Write-Output "Senha: $appPassword"
        Write-Output 'Para trocar a senha, edite APP_PASSWORD em diogo-automates\.env.local e execute este atalho de novo.'
    }
} catch {
    $_.Exception.Message | Set-Content (Join-Path $logDirectory 'startup-error.log')
    if (-not $SemAbrirNavegador) {
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, 'Diogo Automates') | Out-Null
    }
    throw
}
