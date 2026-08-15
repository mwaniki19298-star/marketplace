Fixed the ReferenceError: Property 'auth' doesn't exist.

The feed initialization effect was moved from the root App() component into
MarketplaceApp(), where the existing auth state and listing state are defined.

The feed is now loaded only when auth exists, and it does not replace the
existing marketplace data if the feed request fails.

Run:
  cd mobile
  npx expo start -c
