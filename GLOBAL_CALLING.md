# Global in-app calling

WebRTC cannot guarantee cross-network calls with STUN alone. Marketplace now supplies TURN servers to both web and native clients, with TCP/TLS fallbacks for restrictive networks.

The Django endpoint `/api/calls/ice-servers/` returns the ICE configuration. If `WEBRTC_TURN_SERVERS_JSON` is configured, that production configuration is used. If it is empty, the app temporarily falls back to Open Relay's public TURN service so calls can work across different subnets while production TURN is being configured.

For production, replace the fallback with your own TURN provider (for example Metered TURN or a self-hosted coturn server). Metered documents global TURN endpoints on ports 80/443 and recommends keeping UDP, TCP and TLS entries so ICE can fall back through restrictive firewalls.

Also note: TURN relays media traffic and can consume bandwidth. The public fallback is intended for testing/temporary use, not as a long-term capacity guarantee.
