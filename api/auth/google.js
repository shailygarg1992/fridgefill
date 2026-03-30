// Step 1 of OAuth: Redirect the user to Google's consent screen.
// Google will show: "FridgeFill wants to read your Gmail. Allow?"
// If they click Allow, Google redirects them to our callback URL with a code.

export default function handler(req, res) {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return res.status(500).json({ error: 'Google OAuth not configured' });
  }

  // We only ask for read-only Gmail access — we can't send or delete emails
  const scope = 'https://www.googleapis.com/auth/gmail.readonly';

  // After the user approves, Google sends them back to this URL
  const redirectUri = `${process.env.APP_URL || 'https://fridgefill.vercel.app'}/api/auth/callback`;

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('access_type', 'offline'); // Get a refresh token so we don't need to re-auth
  authUrl.searchParams.set('prompt', 'consent');

  res.redirect(302, authUrl.toString());
}
