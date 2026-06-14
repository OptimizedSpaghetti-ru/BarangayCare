# PowerShell script to generate Android icons from source icon
# This script creates icons in all required Android densities

param(
    [string]$SourceIcon = "icon/no-bg-icon.png",
    [string]$ResPath = "android/app/src/main/res"
)

function Test-ImageMagick {
    try {
        $result = magick --version
        return $true
    } catch {
        return $false
    }
}

# Icon sizes for different densities (width x height)
$IconSizes = @{
    "mdpi"    = 48
    "hdpi"    = 72
    "xhdpi"   = 96
    "xxhdpi"  = 144
    "xxxhdpi" = 192
}

$LandscapeIconSizes = @{
    "land-hdpi"    = 72
    "land-mdpi"    = 48
    "land-xhdpi"   = 96
    "land-xxhdpi"  = 144
    "land-xxxhdpi" = 192
}

$PortraitIconSizes = @{
    "port-hdpi"    = 72
    "port-mdpi"    = 48
    "port-xhdpi"   = 96
    "port-xxhdpi"  = 144
    "port-xxxhdpi" = 192
}

Write-Host "Checking for ImageMagick..." -ForegroundColor Cyan
if (-not (Test-ImageMagick)) {
    Write-Host "ImageMagick not found. Please install ImageMagick from https://imagemagick.org/script/download.php" -ForegroundColor Red
    exit 1
}

Write-Host "Generating Android launcher icons..." -ForegroundColor Green

# Generate mipmap icons
foreach ($density in $IconSizes.Keys) {
    $size = $IconSizes[$density]
    $outputDir = "$ResPath/mipmap-$density"
    
    if (-not (Test-Path $outputDir)) {
        New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
    }
    
    Write-Host "  Creating $density icon ($size x $size)..." -ForegroundColor Yellow
    magick convert "$SourceIcon" -resize "${size}x${size}" -background transparent -gravity center -extent "${size}x${size}" "$outputDir/ic_launcher.png"
    magick convert "$SourceIcon" -resize "${size}x${size}" -background transparent -gravity center -extent "${size}x${size}" "$outputDir/ic_launcher_round.png"
}

# Generate drawable landscape/portrait icons
foreach ($key in $LandscapeIconSizes.Keys) {
    $size = $LandscapeIconSizes[$key]
    $outputDir = "$ResPath/drawable-$key"
    
    if (-not (Test-Path $outputDir)) {
        New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
    }
    
    Write-Host "  Creating $key icon ($size x $size)..." -ForegroundColor Yellow
    magick convert "$SourceIcon" -resize "${size}x${size}" -background transparent -gravity center -extent "${size}x${size}" "$outputDir/ic_notification.png"
}

foreach ($key in $PortraitIconSizes.Keys) {
    $size = $PortraitIconSizes[$key]
    $outputDir = "$ResPath/drawable-$key"
    
    if (-not (Test-Path $outputDir)) {
        New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
    }
    
    Write-Host "  Creating $key icon ($size x $size)..." -ForegroundColor Yellow
    magick convert "$SourceIcon" -resize "${size}x${size}" -background transparent -gravity center -extent "${size}x${size}" "$outputDir/ic_notification.png"
}

Write-Host "Icon generation complete!" -ForegroundColor Green
