# PowerShell script to build BarangayCare Android APK

param(
    [string]$BuildType = "debug",
    [string]$SigningKeystore = ""
)

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Building BarangayCare Android App" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Check Android SDK
$androidHome = $env:ANDROID_SDK_ROOT
if (-not $androidHome) {
    Write-Host "Warning: ANDROID_SDK_ROOT not set. Gradle should handle this automatically." -ForegroundColor Yellow
}

# Navigate to Android directory
Push-Location "android"

try {
    Write-Host "Step 1: Running Gradle clean..." -ForegroundColor Green
    
    $gradleCmd = if (Test-Path "gradlew.bat") { ".\gradlew.bat" } else { "gradle" }
    
    & $gradleCmd clean
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Gradle clean failed" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "Step 2: Building $BuildType APK..." -ForegroundColor Green
    
    if ($BuildType -eq "release" -and $SigningKeystore) {
        Write-Host "Using signing keystore: $SigningKeystore" -ForegroundColor Yellow
        & $gradleCmd assembleRelease `
            -Pandroid.injected.signing.store.file="$SigningKeystore" `
            -Pandroid.injected.signing.store.password=$env:KEYSTORE_PASSWORD `
            -Pandroid.injected.signing.key.alias=$env:KEY_ALIAS `
            -Pandroid.injected.signing.key.password=$env:KEY_PASSWORD
    } else {
        & $gradleCmd assemble${BuildType.Substring(0,1).ToUpper()}$($BuildType.Substring(1))
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Gradle build failed" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "Step 3: Build complete!" -ForegroundColor Green
    Write-Host ""
    
    $apkDir = "app\build\outputs\apk\$BuildType"
    $apkPath = Get-Item -Path "$apkDir\*.apk" -ErrorAction SilentlyContinue | Select-Object -First 1
    
    if ($apkPath) {
        Write-Host "✓ APK created successfully:" -ForegroundColor Green
        Write-Host "  Path: $($apkPath.FullName)" -ForegroundColor Green
        Write-Host "  Size: $([math]::Round($apkPath.Length / 1MB, 2)) MB" -ForegroundColor Green
    } else {
        Write-Host "Note: Check $apkDir for APK output" -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Connect Android device via USB" -ForegroundColor Cyan
    Write-Host "  2. Enable USB debugging on device" -ForegroundColor Cyan
    Write-Host "  3. Run: adb install -r $apkDir\app-$BuildType.apk" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Or use Android Studio to deploy the app." -ForegroundColor Cyan

} finally {
    Pop-Location
}
