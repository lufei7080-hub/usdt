@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Set Admin Password
echo.
echo This launcher sets the admin password.
echo (Use set_admin_password.bat - same tool)
echo.
call "%~dp0set_admin_password.bat"
