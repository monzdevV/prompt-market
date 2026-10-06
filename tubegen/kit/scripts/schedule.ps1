# Registra la tarea diaria en el Programador de tareas de Windows (cada día a las 09:00).
# Ejecutar una vez en PowerShell:  powershell -ExecutionPolicy Bypass -File scripts\schedule.ps1
$root = Split-Path -Parent $PSScriptRoot
$node = (Get-Command node).Source
$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$node`" pipeline\daily.mjs >> logs\daily.log 2>&1" -WorkingDirectory $root
$trigger = New-ScheduledTaskTrigger -Daily -At 9:00
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -WakeToRun -ExecutionTimeLimit (New-TimeSpan -Hours 4)
New-Item -ItemType Directory -Force (Join-Path $root "logs") | Out-Null
Register-ScheduledTask -TaskName "TubeGen diario" -Action $action -Trigger $trigger -Settings $settings -Description "Genera los vídeos del canal" -Force
Write-Host "Tarea 'TubeGen diario' registrada. Para quitarla: Unregister-ScheduledTask -TaskName 'TubeGen diario'"
