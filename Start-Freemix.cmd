@echo off
setlocal
cd /d "%~dp0"
echo Starting Freemix VM-420 at http://localhost:4200
echo Keep this window open while using Freemix.
start "" "http://localhost:4200"
node server.js
