@echo off
title Jugueteria Quetzal - Publicar en Apache (XAMPP)
echo ================================================================
echo    Publicando Jugueteria Quetzal en Apache XAMPP
echo ================================================================
echo.
echo [1/2] Compilando el frontend React con base /jugueteria/...
cd /d "%~dp0frontend"
call npm run deploy:xampp

if "%ERRORLEVEL%"=="0" (
    echo.
    echo [2/2] [OK] Publicacion exitosa en C:\xampp\htdocs\jugueteria!
    echo.
    echo Puedes acceder en: http://localhost/jugueteria/
) else (
    echo.
    echo [X] Ocurrio un error al compilar o copiar los archivos.
)

echo.
pause
