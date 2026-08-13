@echo off
setlocal
cd /d "%~dp0"
if exist db.sqlite3 (
  copy /Y db.sqlite3 db.sqlite3.backup >nul
  del /F /Q db.sqlite3
  echo Existing db.sqlite3 backed up to db.sqlite3.backup
)
python manage.py migrate
if errorlevel 1 (
  echo Migration failed.
  exit /b 1
)
python manage.py createsuperuser
endlocal
