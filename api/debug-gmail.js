// Debug endpoint to see what Gmail emails are found and what they contain.
// This helps us figure out why orders aren't showing up.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { gmail_token } = req.body;
  if (!gmail_token) {
    return res.status(400).json({ error: 'No Gmail token provided' });
  }

  const debug = { steps: [] };

  try {
    // Step 1: Try a broad search first
    const queries = [
      'from:(walmart.com OR walmart) subject:(order OR "Your order" OR "order confirmation") newer_than:90d',
      'from:walmart newer_than:90d',
      'walmart order newer_than:120d',
      'subject:walmart newer_than:120d',
    ];

    for (const query of queries) {
      const searchUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=5`;
      const searchResponse = await fetch(searchUrl, {
        headers: { Authorization: `Bearer ${gmail_token}` },
      });

      const searchData = await searchResponse.json();

      if (searchData.error) {
        debug.steps.push({
          query,
          error: searchData.error.message || searchData.error,
          status: searchResponse.status,
        });
        continue;
      }

      const count = searchData.messages?.length || 0;
      const total = searchData.resultSizeEstimate || 0;
      debug.steps.push({ query, found: count, estimatedTotal: total });

      // If we found messages with this query, peek at the first one
      if (count > 0) {
        const msgId = searchData.messages[0].id;
        const msgUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`;
        const msgResponse = await fetch(msgUrl, {
          headers: { Authorization: `Bearer ${gmail_token}` },
        });
        const msgData = await msgResponse.json();
        const headers = msgData.payload?.headers || [];

        debug.steps[debug.steps.length - 1].firstEmail = {
          subject: headers.find(h => h.name === 'Subject')?.value,
          from: headers.find(h => h.name === 'From')?.value,
          date: headers.find(h => h.name === 'Date')?.value,
        };

        // If we found results, also list all subjects
        const allSubjects = [];
        for (const msg of searchData.messages) {
          const mUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=Date`;
          const mRes = await fetch(mUrl, {
            headers: { Authorization: `Bearer ${gmail_token}` },
          });
          const mData = await mRes.json();
          const mHeaders = mData.payload?.headers || [];
          allSubjects.push({
            subject: mHeaders.find(h => h.name === 'Subject')?.value,
            date: mHeaders.find(h => h.name === 'Date')?.value,
          });
        }
        debug.steps[debug.steps.length - 1].allEmails = allSubjects;
      }
    }

    return res.status(200).json(debug);
  } catch (error) {
    debug.error = error.message;
    return res.status(500).json(debug);
  }
}
