#!/usr/bin/env bash
# Reset database script for Jugueteria DB
set -e

DB_USER="${DB_USER:-root}"
DB_PASS="${DB_PASS:-}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="$DIR/jugueteria_db.sql"
TEST_SQL_FILE="$DIR/jugueteria_test.sql"

echo "=== Reseteando base de datos jugueteria_db ==="
if [ -z "$DB_PASS" ]; then
  mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" < "$SQL_FILE"
  if [ -f "$TEST_SQL_FILE" ]; then
    echo "=== Reseteando base de datos jugueteria_test ==="
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" < "$TEST_SQL_FILE"
  fi
else
  mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" < "$SQL_FILE"
  if [ -f "$TEST_SQL_FILE" ]; then
    echo "=== Reseteando base de datos jugueteria_test ==="
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" < "$TEST_SQL_FILE"
  fi
fi

echo "=== Bases de datos recargadas con éxito ==="
