<#
.SYNOPSIS
    Đo đạc cold-start latency và dung lượng file nhị phân neo-git-core.exe (Native AOT).

.DESCRIPTION
    Script hỗ trợ kiểm định tính độc lập của nhân F# (Nhóm Việc 1):
      - Đo dung lượng file nhị phân phát hành.
      - Đo thời gian phản hồi khởi động lạnh (cold-start) qua lệnh `ping`.
      - Trả về phiên bản qua lệnh `--version`.

.PARAMETER ExePath
    Đường dẫn tới neo-git-core.exe. Nếu bỏ trống, script tự tìm file trong
    src/core-engine/bin/Release/**/publish/ (lấy bản mới nhất).

.PARAMETER Runs
    Số lần lặp đo cold-start (mặc định 20).

.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File measure_cold_start.ps1

.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File measure_cold_start.ps1 -Runs 50
#>

param(
    [string]$ExePath = "",
    [int]$Runs = 20
)

# Gốc repository: script nằm tại docs/04_reports/001_windows/
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path

if (-not $ExePath) {
    $candidate = Get-ChildItem -Path (Join-Path $repoRoot 'src\core-engine\bin\Release') `
        -Recurse -Filter 'neo-git-core.exe' -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -match 'publish' } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $candidate) {
        Write-Error "Không tìm thấy neo-git-core.exe. Hãy chạy 'dotnet publish -c Release' trong src/core-engine trước."
        exit 1
    }
    $ExePath = $candidate.FullName
}

if (-not (Test-Path $ExePath)) {
    Write-Error "File không tồn tại: $ExePath"
    exit 1
}

# --- Dung lượng file nhị phân ---
$binSize = (Get-Item $ExePath).Length
$sizeMb = [math]::Round($binSize / 1MB, 3)
$sizeKb = [math]::Round($binSize / 1KB, 1)

# --- Phiên bản ---
$version = (& $ExePath --version) -join ' '

# --- Đo cold-start latency ---
$times = New-Object System.Collections.Generic.List[double]
for ($i = 0; $i -lt $Runs; $i++) {
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    & $ExePath ping | Out-Null
    $sw.Stop()
    $times.Add($sw.Elapsed.TotalMilliseconds)
}

$times.Sort()
$min = $times[0]
$max = $times[$times.Count - 1]
$avg = ($times | Measure-Object -Average).Average

if ($times.Count % 2 -eq 1) {
    $median = $times[[int](($times.Count - 1) / 2)]
}
else {
    $median = ($times[[int]($times.Count / 2)] + $times[[int]($times.Count / 2 - 1)]) / 2
}

Write-Output "================================================"
Write-Output " Cold-Start Benchmark: neo-git-core (Native AOT)"
Write-Output "================================================"
Write-Output " Exe     : $ExePath"
Write-Output " Version : $version"
Write-Output " Size    : $sizeMb MB ($sizeKb KiB)"
Write-Output " Runs    : $Runs"
Write-Output (" Latency : min={0}ms  avg={1}ms  median={2}ms  max={3}ms" -f `
    [math]::Round($min, 3), [math]::Round($avg, 3), [math]::Round($median, 3), [math]::Round($max, 3))
Write-Output "================================================"
