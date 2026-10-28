Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$images = Join-Path $root "assets\images"
New-Item -ItemType Directory -Force -Path $images | Out-Null

function New-CheckBitmap {
    param(
        [int]$Size,
        [bool]$Transparent,
        [double]$Scale
    )

    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    if ($Transparent) {
        $g.Clear([System.Drawing.Color]::Transparent)
    }
    else {
        $g.Clear([System.Drawing.Color]::FromArgb(21, 128, 61))
    }

    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, [float]($Size * 0.085))
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

    $cx = $Size / 2.0
    $cy = $Size / 2.0
    $w = $Size * $Scale

    $points = [System.Drawing.PointF[]]@(
        (New-Object System.Drawing.PointF([float]($cx - 0.30 * $w), [float]($cy + 0.02 * $w))),
        (New-Object System.Drawing.PointF([float]($cx - 0.08 * $w), [float]($cy + 0.24 * $w))),
        (New-Object System.Drawing.PointF([float]($cx + 0.34 * $w), [float]($cy - 0.22 * $w)))
    )

    $g.DrawLines($pen, $points)
    $pen.Dispose()
    $g.Dispose()
    return $bmp
}

$icon = New-CheckBitmap -Size 1024 -Transparent $false -Scale 0.62
$icon.Save((Join-Path $images "icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$icon.Dispose()

$splash = New-CheckBitmap -Size 512 -Transparent $true -Scale 0.62
$splash.Save((Join-Path $images "splash-icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$splash.Dispose()

$foreground = New-CheckBitmap -Size 1024 -Transparent $true -Scale 0.42
$foreground.Save((Join-Path $images "android-icon-foreground.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$foreground.Dispose()

$monochrome = New-CheckBitmap -Size 1024 -Transparent $true -Scale 0.42
$monochrome.Save((Join-Path $images "android-icon-monochrome.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$monochrome.Dispose()

$background = New-Object System.Drawing.Bitmap(1024, 1024)
$bgGraphics = [System.Drawing.Graphics]::FromImage($background)
$bgGraphics.Clear([System.Drawing.Color]::FromArgb(21, 128, 61))
$bgGraphics.Dispose()
$background.Save((Join-Path $images "android-icon-background.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$background.Dispose()

Write-Output "Iconos generados en $images"
