param()
# Publishes the local app through a Cloudflare quick tunnel and hands the link to the
# phone: copied to the clipboard and shown as a QR code to scan from the screen.
$ErrorActionPreference = 'Stop'
$appDirectory = Join-Path $PSScriptRoot 'diogo-automates'
$toolsDirectory = Join-Path $appDirectory 'tools'
$logDirectory = Join-Path $appDirectory 'logs'
$installedNode = Get-Command node -ErrorAction SilentlyContinue
$nodeExecutable = if ($installedNode) { $installedNode.Source } else { Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }

# Anyone with the link reaches the app, so it must run with a password. Restarting
# makes sure the server has loaded it, including one created just now.
& (Join-Path $PSScriptRoot 'reiniciar-app.ps1') -SemAbrirNavegador -ExigirSenha

$installedCloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue
$cloudflared = if ($installedCloudflared) { $installedCloudflared.Source } else { Join-Path $toolsDirectory 'cloudflared.exe' }
if (-not (Test-Path -LiteralPath $cloudflared)) {
    Write-Output 'Baixando o cloudflared da Cloudflare (somente na primeira vez)...'
    New-Item -ItemType Directory -Path $toolsDirectory -Force | Out-Null
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile "$cloudflared.download" -UseBasicParsing
    Move-Item -LiteralPath "$cloudflared.download" -Destination $cloudflared -Force
}

Write-Output 'Criando o link publico. Isso leva alguns segundos...'
$qrPage = Join-Path $logDirectory 'link-celular.html'
$tunnelLog = Join-Path $logDirectory 'cloudflared.log'
Set-Content -LiteralPath $tunnelLog -Value ''
$link = $null
# cloudflared logs to stderr, which Windows PowerShell turns into errors under 'Stop'.
$ErrorActionPreference = 'Continue'
# Quick tunnel names are hyphenated words; requiring a hyphen skips api.trycloudflare.com in error lines.
& $cloudflared tunnel --no-autoupdate --url http://127.0.0.1:3002 2>&1 | ForEach-Object {
    Add-Content -LiteralPath $tunnelLog -Value "$_"
    if (-not $link -and "$_" -match 'https://[a-z0-9]+(-[a-z0-9]+)+\.trycloudflare\.com') {
        $link = $Matches[0]
        Set-Clipboard -Value $link
        & $nodeExecutable (Join-Path $appDirectory 'scripts\link-qr.cjs') $link $qrPage
        if ($LASTEXITCODE -eq 0) { Start-Process $qrPage }
        Write-Output ''
        Write-Output "Link para o celular: $link"
        Write-Output 'O link ja foi copiado e o QR code abriu no navegador. Escaneie com a camera do celular.'
        Write-Output 'Mantenha esta janela aberta: fecha-la encerra o link. Cada execucao gera um link novo.'
    }
}
if (-not $link) { Write-Output 'Nao foi possivel criar o link. Confira a internet e consulte diogo-automates\logs\cloudflared.log.' }
