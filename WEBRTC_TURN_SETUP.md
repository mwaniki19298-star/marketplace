# Cross-network in-app calling (TURN)

The calling implementation now fetches ICE servers from the authenticated
Django API at:

`GET /api/calls/ice-servers/`

Google STUN remains enabled for direct connections. For phones/browsers on
different networks, a TURN relay is required when NAT/firewall rules prevent a
direct ICE path.

## Production backend configuration

On PythonAnywhere, configure this backend environment variable:

```text
WEBRTC_TURN_SERVERS_JSON=[{"urls":["turn:TURN_HOST:3478?transport=udp","turn:TURN_HOST:3478?transport=tcp"],"username":"TURN_USERNAME","credential":"TURN_CREDENTIAL"}]
```

Replace the placeholders with credentials from your TURN provider or your own
coturn server.

Do NOT put TURN credentials in `EXPO_PUBLIC_*` variables or in `App.tsx`.

After changing the backend environment, restart the PythonAnywhere web app.

## Why this fixes different-IP calls

STUN only discovers a public/server-reflexive address. TURN provides a relay
when the two peers cannot connect directly because of NAT, carrier NAT,
symmetric NAT, corporate firewalls, or restrictive Wi-Fi.

The call flow becomes:

Marketplace A -> Django signaling
Marketplace B -> Django signaling
A <-> B -> WebRTC direct path when possible
A -> TURN -> B -> WebRTC relay when direct connectivity fails

## Important

This code change makes the client TURN-ready, but a real TURN server must be
configured in production. Without `WEBRTC_TURN_SERVERS_JSON`, calls that can
use direct ICE paths will continue to work, while peers requiring a relay will
still fail.
