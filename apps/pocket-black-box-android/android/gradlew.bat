@echo off
where gradle >nul 2>nul
if errorlevel 1 (
  echo Gradle 8.10.x must be installed locally. This launcher does not download tools.
  exit /b 1
)
gradle %*
