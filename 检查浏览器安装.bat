@echo off
chcp 65001 >nul
echo ==========================================
echo    Playwright 浏览器安装检查工具
echo ==========================================
echo.

echo [1/3] 检查 Chromium...
if exist "%LOCALAPPDATA%\ms-playwright\chromium-1208\chrome.exe" (
    echo ✓ Chromium 已安装
) else (
    echo ✗ Chromium 未安装
)

echo.
echo [2/3] 检查 Firefox...
if exist "%LOCALAPPDATA%\ms-playwright\firefox-1509\firefox.exe" (
    echo ✓ Firefox 已安装
) else (
    echo ✗ Firefox 未安装
)

echo.
echo [3/3] 检查 WebKit...
if exist "%LOCALAPPDATA%\ms-playwright\webkit-2248\Playwright.exe" (
    echo ✓ WebKit 已安装
) else (
    echo ✗ WebKit 未安装
)

echo.
echo ==========================================
echo 安装路径: %LOCALAPPDATA%\ms-playwright\
echo ==========================================
pause
