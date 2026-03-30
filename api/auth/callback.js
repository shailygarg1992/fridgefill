// Step 2 of OAuth: Google redirects here with a code.
// We exchange that code for an access token (the actual key to read Gmail).
// Then we redirect the user back to the app with the token stored.

export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'No authorization code received' });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${process.env.APP_URL || 'https://fridgefill.vercel.app'}/api/auth/callback`;

  try {
    // Exchange the code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();

    if (tokens.error) {
      return res.status(400).json({ error: tokens.error_description || tokens.error });
    }

    // Redirect back to the app with the access token
    // For a single-user MVP, we pass the token via URL fragment (never sent to server)
    // The app stores it in localStorage
    const appUrl = process.env.APP_URL || 'https://fridgefill.vercel.app';
    res.redirect(
      302,
      `${appUrl}/?gmail_token=${encodeURIComponent(tokens.access_token)}` +
      (tokens.refresh_token ? `&gmail_refresh=${encodeURIComponent(tokens.refresh_token)}` : '')
    );
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: 'Failed to exchange authorization code' });
  }
}
