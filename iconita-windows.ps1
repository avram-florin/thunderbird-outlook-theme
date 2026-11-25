# Pune logo-ul temei pe scurtaturile Thunderbird din Windows (meniul Start,
# desktop, taskbar). Windows 11 ia iconita butonului din taskbar din scurtatura
# din meniul Start comun (ProgramData), care se schimba doar ca administrator:
# scriptul cere o singura data acceptul (fereastra UAC).
#   iconita-windows.cmd            pune logo-ul
#   iconita-windows.cmd -Restore   pune la loc iconitele de dinainte
# Nu modifica fisierele aplicatiei Thunderbird, doar scurtaturile (.lnk).
param([switch]$Restore, [string]$UserAppData = $env:APPDATA, [string]$UserProfile = $env:USERPROFILE)
$ErrorActionPreference = 'Stop'

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  # utilizatorul curent: dupa ridicare, $env:APPDATA ar putea fi al altui cont
  $argList = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$PSCommandPath`"",
    '-UserAppData', "`"$env:APPDATA`"", '-UserProfile', "`"$env:USERPROFILE`"")
  if ($Restore) { $argList += '-Restore' }
  Start-Process powershell.exe -Verb RunAs -ArgumentList $argList
  exit
}
$userAppData = $UserAppData; $userProfile = $UserProfile

$dir = Join-Path $env:ProgramData 'ThunderbirdOutlookTheme'
$ico = Join-Path $dir 'thunderbird-t-pasare.ico'
$backup = Join-Path $dir 'iconite-vechi.json'
$folders = @(
  (Join-Path $env:ProgramData 'Microsoft\Windows\Start Menu\Programs'),
  (Join-Path $env:PUBLIC 'Desktop'),
  (Join-Path $userAppData 'Microsoft\Windows\Start Menu\Programs'),
  (Join-Path $userProfile 'Desktop'),
  (Join-Path $userAppData 'Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar')
)
$shell = New-Object -ComObject WScript.Shell
$links = foreach ($f in $folders) {
  if (Test-Path $f) {
    Get-ChildItem $f -Filter *.lnk -Recurse -ErrorAction SilentlyContinue | Where-Object {
      $shell.CreateShortcut($_.FullName).TargetPath -like '*\thunderbird.exe'
    }
  }
}
if (-not $links) { Write-Host 'Nu am gasit nicio scurtatura Thunderbird.'; Read-Host 'Enter pentru inchidere'; exit 1 }

if ($Restore) {
  if (-not (Test-Path $backup)) { Write-Host 'Nu exista copia iconitelor vechi.'; Read-Host 'Enter pentru inchidere'; exit 1 }
  $old = Get-Content $backup -Raw | ConvertFrom-Json
  foreach ($e in $old) {
    if (Test-Path $e.Path) { $l = $shell.CreateShortcut($e.Path); $l.IconLocation = $e.Icon; $l.Save(); Write-Host "Refacut: $($e.Path)" }
  }
} else {
  New-Item -ItemType Directory -Force $dir | Out-Null
  Copy-Item (Join-Path $PSScriptRoot 'Icons\thunderbird-t-pasare.ico') $ico -Force
  # copia se face o singura data, ca o a doua rulare sa nu retina logo-ul ca "vechi"
  if (-not (Test-Path $backup)) {
    $links | ForEach-Object { [pscustomobject]@{ Path = $_.FullName; Icon = $shell.CreateShortcut($_.FullName).IconLocation } } |
      ConvertTo-Json | Set-Content $backup -Encoding UTF8
  }
  foreach ($k in $links) { $l = $shell.CreateShortcut($k.FullName); $l.IconLocation = "$ico,0"; $l.Save(); Write-Host "Logo pus: $($k.FullName)" }
}
ie4uinit.exe -show
Write-Host ''
Write-Host 'Gata. Daca taskbar-ul arata inca iconita veche, deconecteaza-te si reconecteaza-te in Windows.'
Read-Host 'Enter pentru inchidere'
