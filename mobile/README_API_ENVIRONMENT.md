# API environment configuration

## Production

Production builds use the HTTPS Django API:

`https://emilio2026.pythonanywhere.com`

The production web application is:

`https://marketplace.co.ke`

EAS profiles include the required public Expo variables. Do not place Django secrets, Cloudinary API secrets, SMTP passwords, or other private credentials in `EXPO_PUBLIC_*` variables.

Run the production API check before a build:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL="https://emilio2026.pythonanywhere.com"
npm run check:api
```

## Local development

Copy `.env.local.example` to `.env.local` and replace the LAN IP with the machine running Django. Example:

`EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:8000`

For the Vite web client, use `VITE_API_BASE_URL=/api` and set `VITE_API_PROXY_TARGET` to the local Django URL.

The mobile app can also derive the development host automatically when no explicit API URL is set, but an explicit LAN URL is more predictable for physical-device testing.
