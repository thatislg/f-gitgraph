<#
.SYNOPSIS
    Sinh bộ icon PNG chuẩn (icon.png 128x128 và icon-512.png) cho F-GitGraph.
    Tuân thủ thiết kế: "Neon Hexagon & F-Branch" (Cyberpunk Modern).
#>

Add-Type -AssemblyName System.Drawing

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$resDir = Join-Path $repoRoot 'resources'

function Get-HexagonPoints([float]$cx, [float]$cy, [float]$r) {
    $dx = $r * 0.8660254
    $dy = $r * 0.5
    return @(
        [System.Drawing.PointF]::new($cx, $cy - $r),
        [System.Drawing.PointF]::new($cx + $dx, $cy - $dy),
        [System.Drawing.PointF]::new($cx + $dx, $cy + $dy),
        [System.Drawing.PointF]::new($cx, $cy + $r),
        [System.Drawing.PointF]::new($cx - $dx, $cy + $dy),
        [System.Drawing.PointF]::new($cx - $dx, $cy - $dy)
    )
}

function Create-RoundedRectPath([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $d = $r * 2
    $path.AddArc($x, $y, $d, $d, 180, 90)
    $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
    $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
    $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    return $path
}

$bmp512 = [System.Drawing.Bitmap]::new(512, 512, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp512)

$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$g.Clear([System.Drawing.Color]::Transparent)

# 1. Nền squircle bo góc carbon tối (padding 16px)
$bgRect = [System.Drawing.RectangleF]::new(16, 16, 480, 480)
$bgPath = Create-RoundedRectPath 16 16 480 480 105

$gradBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
    $bgRect,
    [System.Drawing.Color]::FromArgb(255, 18, 25, 42),
    [System.Drawing.Color]::FromArgb(255, 10, 14, 24),
    [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal
)
$g.FillPath($gradBrush, $bgPath)

# Viền ngoài tinh tế
$borderPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(180, 35, 48, 76), 3.0)
$g.DrawPath($borderPen, $bgPath)

# 2. Các đường nhánh F-Branch
# Trunk (Cyan Neon)
$cyanColor = [System.Drawing.Color]::FromArgb(255, 0, 240, 255)
$fuchsiaColor = [System.Drawing.Color]::FromArgb(255, 255, 0, 127)
$violetColor = [System.Drawing.Color]::FromArgb(255, 168, 85, 247)
$darkFill = [System.Drawing.Color]::FromArgb(255, 11, 15, 25)

# Glow nền mờ nhẹ cho nhánh
$glowPenCyan = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(45, 0, 240, 255), 48.0)
$glowPenCyan.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$glowPenCyan.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$g.DrawLine($glowPenCyan, 145, 120, 145, 392)

$glowPenFuchsia = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(45, 255, 0, 127), 48.0)
$glowPenFuchsia.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$glowPenFuchsia.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$pathGlow1 = [System.Drawing.Drawing2D.GraphicsPath]::new()
$pathGlow1.AddBezier(145, 160, 150, 135, 190, 135, 368, 135)
$g.DrawPath($glowPenFuchsia, $pathGlow1)

# Đường nét chính
$trunkPen = [System.Drawing.Pen]::new($cyanColor, 28.0)
$trunkPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$trunkPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$g.DrawLine($trunkPen, 145, 120, 145, 392)

$topBranchPen = [System.Drawing.Pen]::new($fuchsiaColor, 28.0)
$topBranchPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$topBranchPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$path1 = [System.Drawing.Drawing2D.GraphicsPath]::new()
$path1.AddBezier(145, 160, 150, 135, 190, 135, 368, 135)
$g.DrawPath($topBranchPen, $path1)

$midBranchPen = [System.Drawing.Pen]::new($violetColor, 28.0)
$midBranchPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$midBranchPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$path2 = [System.Drawing.Drawing2D.GraphicsPath]::new()
$path2.AddBezier(145, 305, 150, 275, 185, 275, 305, 275)
$g.DrawPath($midBranchPen, $path2)

# 3. Vẽ 4 nút lục giác commit nodes
function Draw-HexNode($gCtx, [float]$cx, [float]$cy, [float]$r, [System.Drawing.Color]$color) {
    $pts = Get-HexagonPoints $cx $cy $r
    $fillBrush = [System.Drawing.SolidBrush]::new($darkFill)
    $gCtx.FillPolygon($fillBrush, $pts)
    
    $strokePen = [System.Drawing.Pen]::new($color, 16.0)
    $strokePen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $gCtx.DrawPolygon($strokePen, $pts)

    $coreBrush = [System.Drawing.SolidBrush]::new($color)
    $coreR = $r * 0.28
    $gCtx.FillEllipse($coreBrush, $cx - $coreR, $cy - $coreR, $coreR * 2, $coreR * 2)
}

# Base trunk node (Cyan)
Draw-HexNode $g 145 392 48 $cyanColor

# Mid branch node (Violet)
Draw-HexNode $g 305 275 48 $violetColor

# Top branch node (Fuchsia)
Draw-HexNode $g 368 135 48 $fuchsiaColor

# Top trunk node (Cyan)
Draw-HexNode $g 145 120 48 $cyanColor

# Lưu file 512x512
$path512 = Join-Path $resDir 'icon-512.png'
$bmp512.Save($path512, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Output "==> Đã tạo $path512"

# 4. Thu nhỏ tạo icon.png 128x128
$bmp128 = [System.Drawing.Bitmap]::new(128, 128, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g128 = [System.Drawing.Graphics]::FromImage($bmp128)
$g128.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g128.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g128.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g128.DrawImage($bmp512, 0, 0, 128, 128)

$path128 = Join-Path $resDir 'icon.png'
$bmp128.Save($path128, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Output "==> Đã tạo $path128"

$g.Dispose()
$bmp512.Dispose()
$g128.Dispose()
$bmp128.Dispose()
