// Vercel serverless OAuth bridge for the native Marketplace app.
// Google redirects here with the OAuth response in the URL fragment.
// Fragments are only available in the browser, so this endpoint returns
// explicit HTML (not a static-file rewrite) that forwards the complete URL
// to the Marketplace custom scheme.
//
// Keeping this as a serverless function also prevents Android browsers from
// treating /oauthredirect as a downloadable static file.

module.exports = function handler(req, res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Content-Disposition", "inline");

  res.status(200).send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>Returning to Marketplace…</title>
</head>
<body style="font-family:system-ui;text-align:center;padding-top:20vh">
  <p>Returning to Marketplace…</p>
  <p><a id="open-app" href="#">Open Marketplace</a></p>
  <script>
    (function () {
      var query = window.location.search || "";
      var hash = window.location.hash || "";
      var target = "marketplace://oauthredirect" + query + hash;
      var link = document.getElementById("open-app");
      if (link) link.href = target;

      // Give the browser a moment to paint the page, then invoke the
      // registered Android custom scheme.
      setTimeout(function () {
        window.location.href = target;
      }, 50);
    })();
  </script>
</body>
</html>`);
};
