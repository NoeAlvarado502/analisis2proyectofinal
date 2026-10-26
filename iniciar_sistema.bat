@echo off
title Jugueteria Quetzal - Inicio del Sistema
echo ================================================================
echo    JUGUETERIA QUETZAL - SISTEMA ERP COMERCIAL
echo ================================================================
echo.
echo [1/3] Verificando servicios de XAMPP (Apache y MySQL)...

tasklist /FI "IMAGENAME eq httpd.exe" 2>NUL | find /I /N "httpd.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo   [OK] Apache esta en ejecucion.
) else (
    echo   [!] AVISO: Apache no parece estar iniciado en XAMPP.
    echo       Por favor inicia Apache desde el XAMPP Control Panel.
)

tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I /N "mysqld.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo   [OK] MySQL esta en ejecucion.
) else (
    echo   [!] AVISO: MySQL no parece estar iniciado en XAMPP.
    echo       Por favor inicia MySQL desde el XAMPP Control Panel.
)

echo.
echo [2/3] Abriendo la aplicacion en tu navegador Apache...
start http://localhost/jugueteria/

echo.
echo [3/3] Iniciando el Backend API (Node.js + Express en puerto 4000)...
echo.
echo   --------------------------------------------------------------
echo   URL Local:     http://localhost/jugueteria/
for /f "tokens=4" %%a in ('route print ^| findstr 0.0.0.0.*0.0.0.0 ^| findstr /v "Default"') do (
    echo   URL en Red:    http://%%a/jugueteria/
    goto :ip_done
)
:ip_done
echo   Backend API:   Puerto 4000
echo   Usuario demo:  admin
echo   Contrasena:    admin
echo   --------------------------------------------------------------
echo.
echo Presiona Ctrl + C en esta ventana cuando desees detener el backend.
echo.

cd /d "%~dp0backend"
npm start
