# API environment switching

The app automatically switches API targets based on the build/runtime environment.

## Local development

Run Django:

```powershell
cd backend
python manage.py runserver 0.0.0.0:8000
```

Run Expo:

```powershell
cd mobile
npx expo start -c
```

When `__DEV__` is true, the mobile app derives the API host from Expo's `hostUri` and calls `http://<Metro-PC-LAN-IP>:8000`. Do not put the PythonAnywhere URL in `EXPO_PUBLIC_API_BASE_URL` for local development.

## Production

Set `EXPO_PUBLIC_API_BASE_URL=https://emilio2026.pythonanywhere.com` in the production build environment. Production builds then use that URL.

This means the same source code works locally and in production without editing `apiConfig.ts`.

## Important

If a physical Android phone is used for local testing, the phone and PC must be on the same network and Windows Firewall must allow inbound TCP port 8000.
