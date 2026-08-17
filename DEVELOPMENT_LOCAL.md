# Local development setup

## Backend
```bash
cd backend
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

## Web
```bash
cd mobile
npm install
npm run dev
```
The Vite app runs on `http://localhost:5173`.

## Android emulator
Build the Expo development client with:
```bash
cd mobile
npx eas-cli build --platform android --profile development
```
The development profile uses `http://10.0.2.2:8000`, which maps to the host PC's port 8000 from the Android emulator.

## Physical Android device
Use the `development-device` EAS profile after replacing `YOUR_LAN_IP` in `mobile/eas.json` with the PC's LAN IPv4 address, then rebuild. The phone and PC must be on the same network, and Django must listen on `0.0.0.0:8000`.

## Google OAuth local web
Add `http://localhost:5173` as an authorized JavaScript origin and `http://localhost:5173/oauthredirect` as an authorized redirect URI to the Google Web OAuth client. Native Android continues using the Android client ID and its deep-link redirect.

Production values are preserved in `mobile/.env.production` and `backend/.env.production`.


## Expo Go / native local API

Do not use `localhost` as the native device API address. The app now detects the computer IP from Expo's Metro `hostUri` during `__DEV__` and automatically uses `http://<computer-ip>:8000`.

Start Django so it listens on the LAN interface:

```bash
cd backend
python manage.py runserver 0.0.0.0:8000
```

Start Expo in LAN mode:

```bash
cd mobile
npx expo start --lan
```

Keep the phone and computer on the same Wi-Fi/LAN. On Windows, allow Python through the firewall for private networks if the phone still cannot connect.

The app logs the selected API URL in development as `[API] ...`, so check the terminal/Metro console if needed.
