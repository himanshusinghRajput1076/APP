@echo off
title IDEACON Live Server Starter
echo =======================================================
echo    IDEACON APPS - LIVE SERVER DEPLOYMENT
echo =======================================================
echo.
echo Step 1: Starting your local backend server...
start "Backend Server" cmd /k "cd /d e:\IDEACON\backend && py -m uvicorn server:app --host 0.0.0.0 --port 8000"
timeout /t 3 >nul

echo Step 2: Creating a public tunnel for the backend...
start "Backend Tunnel" cmd /k "ssh -R 80:localhost:8000 nokey@localhost.run -o ServerAliveInterval=60"
echo.
echo =======================================================
echo Look at the "Backend Tunnel" window that just opened.
echo Wait a few seconds for it to print a URL that looks like:
echo https://random-letters.lhr.life
echo =======================================================
echo.
set /p BACKEND_URL="Please PASTE that exact URL here and press Enter: "

echo EXPO_PUBLIC_BACKEND_URL=%BACKEND_URL% > e:\IDEACON\frontend\.env
echo Saved backend URL to frontend configuration!
echo.
echo Step 3: Compiling the Web App (This takes about 1-2 minutes)...
cd /d e:\IDEACON\frontend
call npx expo export -p web

echo Step 4: Starting the Web App server...
start "Frontend Server" cmd /k "cd /d e:\IDEACON\frontend && py -m http.server 3000 --directory dist"
timeout /t 3 >nul

echo Step 5: Creating a public tunnel for the frontend...
start "Frontend Tunnel" cmd /k "ssh -R 80:localhost:3000 nokey@localhost.run -o ServerAliveInterval=60"
echo.
echo =======================================================
echo ALL DONE! Look at the "Frontend Tunnel" window.
echo The URL printed there is your FINAL LIVE APP URL!
echo You can open that link on any phone in the world!
echo (DO NOT close any of the black windows while using the app)
echo =======================================================
pause
