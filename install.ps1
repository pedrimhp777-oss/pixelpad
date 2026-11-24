# PixelPad - instalacao no Windows
#
#   powershell -ExecutionPolicy Bypass -File install.ps1
#
# Faz duas coisas:
#   1. cria o atalho de inicializacao automatica (nao precisa de admin)
#   2. libera a porta no firewall (precisa de admin; se falhar, o Windows
#      pergunta sozinho na primeira vez que o Node escutar)

$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$vbs  = Join-Path $root 'start.vbs'

Write-Host ""
Write-Host "  PixelPad - instalacao" -ForegroundColor Cyan
Write-Host "  ====================" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "  [!] Node.js nao encontrado no PATH." -ForegroundColor Yellow
  Write-Host "      Instale a versao LTS em https://nodejs.org e rode de novo."
  exit 1
}

# 1) inicializacao automatica
$startup = [Environment]::GetFolderPath('Startup')
$lnk = Join-Path $startup 'PixelPad.lnk'
try {
  $ws = New-Object -ComObject WScript.Shell
  $s = $ws.CreateShortcut($lnk)
  $s.TargetPath = $vbs
  $s.WorkingDirectory = $root
  $s.Description = 'PixelPad - controle do PC pelo celular'
  $s.Save()
  Write-Host "  [ok] Inicia junto com o Windows: $lnk" -ForegroundColor Green
} catch {
  Write-Host "  [!] Nao consegui criar o atalho de inicializacao: $_" -ForegroundColor Yellow
}

# 2) firewall (admin)
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($isAdmin) {
  foreach ($port in 8080, 8443) {
    $nome = "PixelPad TCP $port"
    if (-not (Get-NetFirewallRule -DisplayName $nome -ErrorAction SilentlyContinue)) {
      try {
        New-NetFirewallRule -DisplayName $nome -Direction Inbound -Action Allow -Protocol TCP -LocalPort $port -Profile Private | Out-Null
        Write-Host "  [ok] Regra de firewall criada para a porta $port" -ForegroundColor Green
      } catch {
        Write-Host "  [!] Falha ao criar regra da porta $port" -ForegroundColor Yellow
      }
    } else {
      Write-Host "  [ok] Regra da porta $port ja existia" -ForegroundColor Green
    }
  }
  $nomeUdp = 'PixelPad UDP 9999'
  if (-not (Get-NetFirewallRule -DisplayName $nomeUdp -ErrorAction SilentlyContinue)) {
    try {
      New-NetFirewallRule -DisplayName $nomeUdp -Direction Inbound -Action Allow -Protocol UDP -LocalPort 9999 -Profile Private | Out-Null
      Write-Host "  [ok] Regra de firewall criada para a descoberta (UDP 9999)" -ForegroundColor Green
    } catch {
      Write-Host "  [!] Falha ao criar a regra de descoberta (UDP 9999)" -ForegroundColor Yellow
    }
  } else {
    Write-Host "  [ok] Regra de descoberta ja existia" -ForegroundColor Green
  }
} else {
  Write-Host "  [i] Sem admin: nao criei as regras de firewall." -ForegroundColor DarkGray
  Write-Host "      O Windows pergunta na primeira vez que o Node escutar. Aceite 'Redes privadas'." -ForegroundColor DarkGray
}

# 3) dependencias
if (-not (Test-Path (Join-Path $root 'node_modules'))) {
  Write-Host "  [i] Instalando dependencias..." -ForegroundColor DarkGray
  Push-Location $root
  npm install --no-audit --no-fund
  Pop-Location
}

Write-Host ""
Write-Host "  Pronto. Iniciando agora..." -ForegroundColor Cyan
Start-Process -FilePath $vbs
Start-Sleep -Seconds 4
Write-Host ""
Write-Host "  Se o console do servidor nao aparecer (ele roda escondido), abra" -ForegroundColor DarkGray
Write-Host "  a pasta 'data' e depois rode:  node src/server.mjs  para ver o QR code." -ForegroundColor DarkGray
Write-Host ""
