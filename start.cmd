@echo off
chcp 65001 >nul
cd /d "%~dp0"

rem 用本機網頁伺服器開 KTV（直接雙擊 index.html 的話 YouTube 會拒絕播放，錯誤 153）
rem 埠號要和 index.html 裡的 LOCAL_URL 一致
set "PORT=8766"
set "SERVE="
python --version >nul 2>nul && set "SERVE=python -m http.server %PORT% --bind 127.0.0.1"
if not defined SERVE py --version >nul 2>nul && set "SERVE=py -m http.server %PORT% --bind 127.0.0.1"
if not defined SERVE where npx >nul 2>nul && set "SERVE=npx --yes serve -l %PORT%"
if defined SERVE goto run

echo 找不到 Python 或 Node.js，請先安裝其中一個，再重新執行 start.cmd。
pause
exit /b 1

:run
rem 等伺服器起來再開瀏覽器
start "" /min powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep 2; Start-Process 'http://localhost:%PORT%/'"
echo KTV 開在 http://localhost:%PORT%/ ，唱完關掉這個視窗就好。
%SERVE%
