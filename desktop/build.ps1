# 构建 Windows 单文件桌面版：人生倾诉器.exe
#
# 产物：desktop/out/人生倾诉器.exe
# 依赖：Windows 的 .NET Framework 4.8 编译器（系统自带）、Node.js（构建网页）、WebView2 SDK（自动下载）
[CmdletBinding()]
param(
    [switch]$SkipWebBuild,
    [string]$OutputDir
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$desktop = $PSScriptRoot
if (-not $OutputDir) { $OutputDir = Join-Path $desktop 'out' }

$csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path $csc)) {
    throw "找不到 .NET Framework 编译器：$csc"
}

$sdkVersion = '1.0.2903.40'
$cache = Join-Path $desktop '.cache'
$sdkDir = Join-Path $cache "webview2-$sdkVersion"
$coreDll = Join-Path $sdkDir 'lib\net462\Microsoft.Web.WebView2.Core.dll'
$winformsDll = Join-Path $sdkDir 'lib\net462\Microsoft.Web.WebView2.WinForms.dll'
$loaderDll = Join-Path $sdkDir 'runtimes\win-x64\native\WebView2Loader.dll'

if (-not (Test-Path $coreDll)) {
    Write-Host '下载 WebView2 SDK…'
    New-Item -ItemType Directory -Force -Path $cache | Out-Null
    $nupkg = Join-Path $cache "webview2-$sdkVersion.zip"
    Invoke-WebRequest -Uri "https://www.nuget.org/api/v2/package/Microsoft.Web.WebView2/$sdkVersion" -OutFile $nupkg -UseBasicParsing
    if (Test-Path $sdkDir) { Remove-Item -Recurse -Force $sdkDir }
    Expand-Archive -Path $nupkg -DestinationPath $sdkDir -Force
    Remove-Item $nupkg -Force
}

$dist = Join-Path $root 'dist'
if (-not $SkipWebBuild) {
    Write-Host '构建网页资源…'
    $npm = (Get-Command npm.cmd -ErrorAction Stop).Source
    Push-Location $root
    try { & $npm run build; if ($LASTEXITCODE -ne 0) { throw 'npm run build 失败' } }
    finally { Pop-Location }
}
if (-not (Test-Path (Join-Path $dist 'index.html'))) {
    throw '找不到 dist/index.html，请先运行 npm run build'
}

$temp = Join-Path $env:TEMP 'lifeconfidant-desktop-build'
if (Test-Path $temp) { Remove-Item -Recurse -Force $temp }
New-Item -ItemType Directory -Force -Path $temp | Out-Null

Copy-Item (Join-Path $desktop 'Program.cs') $temp
Copy-Item (Join-Path $desktop 'app.manifest') $temp
Copy-Item (Join-Path $desktop 'app.ico') $temp
Copy-Item $coreDll, $winformsDll, $loaderDll $temp

Add-Type -AssemblyName System.IO.Compression.FileSystem
$webZip = Join-Path $temp 'web.zip'
[System.IO.Compression.ZipFile]::CreateFromDirectory($dist, $webZip)

$compilerArgs = @(
    '/nologo',
    '/target:winexe',
    '/platform:x64',
    '/optimize+',
    '/codepage:65001',
    "/out:$temp\LifeConfidant.exe",
    "/win32icon:$temp\app.ico",
    "/win32manifest:$temp\app.manifest",
    "/resource:$webZip,web.zip",
    "/resource:$coreDll,Microsoft.Web.WebView2.Core.dll",
    "/resource:$winformsDll,Microsoft.Web.WebView2.WinForms.dll",
    "/resource:$loaderDll,WebView2Loader.dll",
    "/r:$coreDll",
    "/r:$winformsDll",
    '/r:System.IO.Compression.dll',
    '/r:System.IO.Compression.FileSystem.dll',
    "$temp\Program.cs"
)

Write-Host '编译单文件 EXE…'
& $csc $compilerArgs
if ($LASTEXITCODE -ne 0) { throw '编译失败' }

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$target = Join-Path $OutputDir '人生倾诉器.exe'
Copy-Item (Join-Path $temp 'LifeConfidant.exe') $target -Force

$size = [Math]::Round((Get-Item $target).Length / 1MB, 2)
$hash = (Get-FileHash $target -Algorithm SHA256).Hash
Write-Host ''
Write-Host "已生成：$target"
Write-Host "大小：$size MB"
Write-Host "SHA256：$hash"
