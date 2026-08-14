# Android installable build

## Clean install

PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
cd "C:\Users\pavilion\OneDrive\Desktop\Marketplace\mobile"
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm ci
npx expo-doctor
```

If `expo-doctor` reports duplicate `expo-constants`, confirm the lockfile is the updated one in this project and run `npm ci` again. The project now pins `expo-constants` at the Expo 54-compatible version and the lockfile hoists it to the top level.

## Test backend first

```powershell
Invoke-WebRequest https://emilio2026.pythonanywhere.com/api/health/
```

You need a JSON response containing `status: ok`. If you see Django's default install page, fix PythonAnywhere WSGI first.

## Build an installable APK

```powershell
npx eas-cli login
npx eas-cli build -p android --profile preview
```

The preview profile creates an `.apk` that can be installed directly on Android.

## Production Play Store build

```powershell
npx eas-cli build -p android --profile production
```

The production profile creates an Android App Bundle (`.aab`).

The app's production API endpoint is:

`https://emilio2026.pythonanywhere.com`

## EAS project

This project is already linked to EAS project `74068dfe-41f1-4547-8c6d-a8702ed12a25`. The ID is declared in `app.config.js`, so EAS will not try to modify the dynamic config.

If `expo-doctor` still reports nested `expo-constants` copies locally, run:

```powershell
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm ci
npm dedupe
npx expo-doctor
```

Then build:

```powershell
npx eas-cli build --platform android --profile preview
```
