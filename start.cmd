@echo off
chcp 65001 >nul
cd /d "%~dp0"

rem Comments stay in English on purpose: after "chcp 65001", cmd.exe misreads the file
rem when lines before an external command contain Chinese (only the echo lines below have it).
rem Serve KTV from a local web server; opening index.html directly makes YouTube refuse (error 153).
rem Prefer Node.js + server.js: it also relays YouTube searches, so songs and karaoke versions can be searched in KTV.
rem Keep the port: the queue and settings are stored per URL, so a new port starts empty.
set "PORT=8766"
set "SERVE="
where node >nul 2>nul && set "SERVE=node server.js"
if not defined SERVE python --version >nul 2>nul && set "SERVE=python -m http.server %PORT% --bind 127.0.0.1"
if not defined SERVE py --version >nul 2>nul && set "SERVE=py -m http.server %PORT% --bind 127.0.0.1"
if defined SERVE goto run

echo 找不到 Node.js 或 Python，請先安裝其中一個（建議 Node.js，才能在 KTV 裡搜尋歌和伴唱版），再重新執行 start.cmd。
pause
exit /b 1

:run
rem Open the browser once the server is up
start "" /min powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep 2; Start-Process 'http://localhost:%PORT%/'"
if not "%SERVE%"=="node server.js" (
  echo KTV 開在 http://localhost:%PORT%/ ，唱完關掉這個視窗就好。
  echo 這台電腦沒有 Node.js，不能在 KTV 裡搜尋，點歌和伴唱版都要自己貼連結。
)
%SERVE%
rem The server only returns on an error (e.g. the port is taken); keep the message on screen
pause
