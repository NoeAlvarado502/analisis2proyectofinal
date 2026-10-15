# PowerShell reset script for Jugueteria DB
$ErrorActionPreference = "Stop"

$DB_USER = if ($env:DB_USER) { $env:DB_USER } else { "root" }
$DB_PASS = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { "" }
$DB_HOST = if ($env:DB_HOST) { $env:DB_HOST } else { "127.0.0.1" }
$DB_PORT = if ($env:DB_PORT) { $env:DB_PORT } else { "3306" }

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SqlFile = Join-Path $ScriptDir "jugueteria_db.sql"
$TestSqlFile = Join-Path $ScriptDir "jugueteria_test.sql"

# Detectar binario de mysql
$MysqlBin = "mysql"
if (-not (Get-Command "mysql" -ErrorAction SilentlyContinue)) {
    if (Test-Path "C:\xampp\mysql\bin\mysql.exe") {
        $MysqlBin = "C:\xampp\mysql\bin\mysql.exe"
    } elseif (Test-Path "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe") {
        $MysqlBin = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
    }
}

Write-Host "=== Reseteando base de datos jugueteria_db ===" -ForegroundColor Cyan
Write-Host "Ejecutando: $SqlFile con $MysqlBin" -ForegroundColor Gray

if ([string]::IsNullOrEmpty($DB_PASS)) {
    & $MysqlBin -h $DB_HOST -P $DB_PORT -u $DB_USER --default-character-set=utf8mb4 -e "source $SqlFile"
} else {
    & $MysqlBin -h $DB_HOST -P $DB_PORT -u $DB_USER "-p$DB_PASS" --default-character-set=utf8mb4 -e "source $SqlFile"
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "=== Error al recargar jugueteria_db ===" -ForegroundColor Red
    exit 1
}

if (Test-Path $TestSqlFile) {
    Write-Host "=== Reseteando base de datos jugueteria_test ===" -ForegroundColor Cyan
    Write-Host "Ejecutando: $TestSqlFile con $MysqlBin" -ForegroundColor Gray
    if ([string]::IsNullOrEmpty($DB_PASS)) {
        & $MysqlBin -h $DB_HOST -P $DB_PORT -u $DB_USER --default-character-set=utf8mb4 -e "source $TestSqlFile"
    } else {
        & $MysqlBin -h $DB_HOST -P $DB_PORT -u $DB_USER "-p$DB_PASS" --default-character-set=utf8mb4 -e "source $TestSqlFile"
    }
    if ($LASTEXITCODE -ne 0) {
        Write-Host "=== Error al recargar jugueteria_test ===" -ForegroundColor Red
        exit 1
    }
}

Write-Host "=== Bases de datos recargadas con éxito ===" -ForegroundColor Green
