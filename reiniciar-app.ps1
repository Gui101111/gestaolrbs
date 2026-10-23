param([switch]$SemAbrirNavegador, [switch]$Celular)
$ErrorActionPreference = 'Stop'
$appDirectory = (Resolve-Path (Join-Path $PSScriptRoot 'diogo-automates')).Path
$nextExecutable = Join-Path $appDirectory 'node_modules\next\dist\bin\next'
# Match this application's full command; never stop other Node projects.
$escapedNext = [regex]::Escape($nextExecutable)
$commandPattern = '(?:^|\s)"?' + $escapedNext + '"?\s+start(?:\s|$)'
$appProcesses = @(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction Stop | Where-Object {
    $_.CommandLine -and $_.CommandLine -match $commandPattern
})
# Includes the obsolete instance on 3001.
foreach ($appProcess in $appProcesses) {
    Stop-Process -Id $appProcess.ProcessId -ErrorAction Stop
    Wait-Process -Id $appProcess.ProcessId -Timeout 15 -ErrorAction SilentlyContinue
}
# Stop the recorded temporary test instance only if its identity still matches.
$testRecordPath = Join-Path $appDirectory 'logs\test-server.json'
if (Test-Path -LiteralPath $testRecordPath) {
    $testRecord = Get-Content -LiteralPath $testRecordPath -Raw | ConvertFrom-Json
    $testProcess = Get-Process -Id ([int]$testRecord.pid) -ErrorAction SilentlyContinue
    if ($testProcess -and $testProcess.ProcessName -eq 'node' -and $testProcess.StartTime.ToUniversalTime().Ticks.ToString() -eq $testRecord.startedTicks) {
        $testHealth = Invoke-RestMethod 'http://127.0.0.1:3012/api/health' -TimeoutSec 5
        if ($testHealth.app -eq 'diogo-automates' -and $testHealth.revision -eq 'connection-recovery-v2' -and $testHealth.pid -eq $testProcess.Id) {
            Stop-Process -Id $testProcess.Id -ErrorAction Stop
            Wait-Process -Id $testProcess.Id -Timeout 15 -ErrorAction SilentlyContinue
        }
    }
}
& (Join-Path $PSScriptRoot 'iniciar-app.ps1') -SemAbrirNavegador:$SemAbrirNavegador -Celular:$Celular
