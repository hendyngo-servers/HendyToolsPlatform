@echo off
setlocal
cd /d "%~dp0"
where flutter >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Flutter SDK was not found. Install Flutter or use GitHub Actions to build the APK in the cloud.
  exit /b 1
)
if not exist generated_flutter_project flutter create --platforms=android,ios --project-name=hendy_tools_mobile --org=com.hendytools generated_flutter_project
copy /y pubspec.yaml generated_flutter_project\pubspec.yaml >nul
copy /y analysis_options.yaml generated_flutter_project\analysis_options.yaml >nul
if not exist generated_flutter_project\lib mkdir generated_flutter_project\lib
copy /y lib\main.dart generated_flutter_project\lib\main.dart >nul
cd generated_flutter_project
flutter pub get
if errorlevel 1 exit /b 1
echo Project ready. Use flutter run or flutter build apk --release.
