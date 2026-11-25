@echo off
rem Dublu clic: pune logo-ul temei pe scurtaturile Thunderbird. Cu -Restore pune la loc iconitele vechi.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0iconita-windows.ps1" %*
