<#
.SYNOPSIS
    Biên dịch nhân F# Native AOT và thu thập binary vào thư mục phân phối nội bộ.

.DESCRIPTION
    Script hỗ trợ Nhóm Việc 7.3 (Đóng gói Windows VSIX):
      1. Chạy `dotnet publish -c Release` cho dự án core-engine (Native AOT).
      2. Chép `f-gitgraph-core.exe` và `git2-5853918.dll` vào `bin/win-x64/`.
    Sau khi chạy, dùng `pnpm run package:vsix:win` để đóng gói VSIX hoàn chỉnh.

.PARAMETER Configuration
    Cấu hình build (mặc định Release).

.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-native-win.ps1
#>

param(
    [string]$Configuration = "Release"
)

$ErrorActionPreference = "Stop"

# Gốc repository: script nằm tại scripts/.
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$coreEngineDir = Join-Path $repoRoot 'src\core-engine'
$publishDir = Join-Path $coreEngineDir "bin\$Configuration\net10.0\win-x64\publish"
$targetDir = Join-Path $repoRoot 'bin\win-x64'

Write-Output "==> Biên dịch nhân F# Native AOT ($Configuration)..."

Push-Location $coreEngineDir
try {
    dotnet publish core-engine.fsproj -c $Configuration -r win-x64 --nologo -v minimal
    if ($LASTEXITCODE -ne 0) {
        throw "dotnet publish thất bại (mã $LASTEXITCODE)"
    }
}
finally {
    Pop-Location
}

$exe = Join-Path $publishDir 'f-gitgraph-core.exe'
$dll = Join-Path $publishDir 'git2-5853918.dll'

if (-not (Test-Path $exe)) {
    throw "Không tìm thấy f-gitgraph-core.exe tại $publishDir"
}
if (-not (Test-Path $dll)) {
    throw "Không tìm thấy git2-5853918.dll tại $publishDir"
}

New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
Copy-Item $exe -Destination $targetDir -Force
Copy-Item $dll -Destination $targetDir -Force

$exeSize = [math]::Round((Get-Item (Join-Path $targetDir 'f-gitgraph-core.exe')).Length / 1KB, 1)
$dllSize = [math]::Round((Get-Item (Join-Path $targetDir 'git2-5853918.dll')).Length / 1KB, 1)

Write-Output "==> Đã chép vào $targetDir :"
Write-Output "    f-gitgraph-core.exe  ($exeSize KiB)"
Write-Output "    git2-5853918.dll     ($dllSize KiB)"
