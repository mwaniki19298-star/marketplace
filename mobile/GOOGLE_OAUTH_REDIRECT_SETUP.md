# Google OAuth redirect setup

Native Android Google OAuth uses this exact redirect URI:

https://marketplace-tau-sand.vercel.app/oauthredirect?native=1&flowName=GeneralOAuthFlow

Add that exact value to the **Authorized redirect URIs** of the Web OAuth 2.0 Client ID:

126323121709-2o26001nft4fkp19fl4l9k8jvmma6t4a.apps.googleusercontent.com

Do not add a trailing slash.

The Vercel bridge preserves Google's response query/fragment and redirects it to:

marketplace://oauthredirect

The Android app is configured to receive that deep link.
