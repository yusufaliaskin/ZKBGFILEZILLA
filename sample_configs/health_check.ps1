<#
.SYNOPSIS
    Ziraat Katılım Bankası — Windows Server Health & Telemetry Check
.DESCRIPTION
    Monitors CPU load, available RAM, disk free space, and critical Windows services.
#>

[CmdletBinding()]
param (
    [int]$CpuThreshold = 85,
    [int]$MemoryFreeThresholdMB = 2048
)

Write-Host "[INFO] Windows Sistem Sağlık Taraması Başlatılıyor..." -ForegroundColor Cyan

# 1. CPU Load
$cpu = (Get-WmiObject win32_processor | Measure-Object -Property LoadPercentage -Average).Average
Write-Host "CPU Kullanımı: $cpu%" -ForegroundColor ($cpu -gt $CpuThreshold ? "Red" : "Green")

# 2. Free Memory
$os = Get-WmiObject win32_operatingsystem
$freeMemMB = [math]::Round($os.FreePhysicalMemory / 1024, 2)
Write-Host "Kullanılabilir Bellek: $freeMemMB MB" -ForegroundColor ($freeMemMB -lt $MemoryFreeThresholdMB ? "Yellow" : "Green")

# 3. Disk Space
Get-PSDrive -PSProvider FileSystem | Select-Object Name, @{Name="FreeGB";Expression={[math]::Round($_.Free/1GB,2)}}, @{Name="UsedGB";Expression={[math]::Round($_.Used/1GB,2)}} | Format-Table -AutoSize

# 4. Critical Services
$services = @("OpenSSH Server", "WinRM", "W32Time")
foreach ($svc in $services) {
    $status = Get-Service -Name $svc -ErrorAction SilentlyContinue
    if ($status) {
        Write-Host "Servis '$svc': $($status.Status)" -ForegroundColor ($status.Status -eq "Running" ? "Green" : "Red")
    }
}

Write-Host "[SUCCESS] Tarama başarıyla tamamlandı." -ForegroundColor Green
