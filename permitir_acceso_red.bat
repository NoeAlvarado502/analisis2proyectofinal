@echo off
title Habilitar Acceso en Red Local (Firewall)
echo ================================================================
echo    JUGUETERIA QUETZAL - HABILITAR ACCESO EN RED LOCAL
echo ================================================================
echo.

rem Verificar si tiene permisos de Administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Solicitando permisos de Administrador...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -ArgumentList '/k \"\"%~f0\"\"' -Verb RunAs" 2>nul
    if %errorlevel% neq 0 (
        echo.
        echo [AVISO] Por favor haz clic derecho sobre este archivo y
        echo         selecciona 'Ejecutar como administrador'.
        echo.
        pause
    )
    exit /b
)

echo [1/3] Habilitando puerto 80 (Apache HTTP) en el Firewall de Windows...
netsh advfirewall firewall delete rule name="Jugueteria Apache (Puerto 80)" >nul 2>&1
netsh advfirewall firewall add rule name="Jugueteria Apache (Puerto 80)" dir=in action=allow protocol=TCP localport=80 profile=any >nul
echo       - Puerto 80 habilitado correctamente.

echo [2/3] Habilitando puertos 4000 y 3000 (Backend API Node.js) en el Firewall...
netsh advfirewall firewall delete rule name="Jugueteria Backend (Puerto 4000)" >nul 2>&1
netsh advfirewall firewall add rule name="Jugueteria Backend (Puerto 4000)" dir=in action=allow protocol=TCP localport=4000 profile=any >nul
netsh advfirewall firewall delete rule name="Jugueteria Backend (Puerto 3000)" >nul 2>&1
netsh advfirewall firewall add rule name="Jugueteria Backend (Puerto 3000)" dir=in action=allow protocol=TCP localport=3000 profile=any >nul
echo       - Puertos 4000 y 3000 habilitados correctamente.

echo [3/3] Permitiendo programa Apache HTTP Server...
netsh advfirewall firewall set rule name="Apache HTTP Server" new action=allow >nul 2>&1

echo.
echo ================================================================
echo  EXITO: Los puertos 80, 4000 y 3000 estan abiertos para tu red local.
echo.
echo  Las demas personas en tu misma red Wi-Fi pueden entrar a:
for /f "tokens=4" %%a in ('route print ^| findstr 0.0.0.0.*0.0.0.0 ^| findstr /v "Default"') do (
    echo    http://%%a/jugueteria/
    goto :ip_done2
)
:ip_done2
echo ================================================================
echo.
pause
