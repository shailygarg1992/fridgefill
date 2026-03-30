// This route reads Walmart order confirmation emails from Gmail
// and extracts structured order data (items, prices, dates).
//
// How it works:
// 1. Search Gmail for emails from Walmart about orders
// 2. For each email, download the full content
// 3. Parse the HTML to extract item names, quantities, prices
// 4. Return clean structured data the app can use

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { gmail_token } = req.body;

  if (!gmail_token) {
    return res.status(400).json({ error: 'Gmail token required. Connect Gmail first.' });
  }

  try {
    // Step 1: Search Gmail for Walmart order emails
    // The query is like a Gmail search: "from walmart subject order"
    const searchQuery = 'from:(walmart.com OR walmart) subject:(order OR "Your order" OR "order confirmation") newer_than:90d';
    const searchUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(searchQuery)}&maxResults=20`;

    const searchResponse = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${gmail_token}` },
    });

    if (!searchResponse.ok) {
      const err = await searchResponse.json();
      if (err.error?.code === 401) {
        return res.status(401).json({ error: 'Gmail token expired. Please reconnect Gmail.' });
      }
      throw new Error(err.error?.message || 'Gmail search failed');
    }

    const searchData = await searchResponse.json();
    const messageIds = searchData.messages || [];

    if (messageIds.length === 0) {
      return res.status(200).json({ orders: [], message: 'No Walmart order emails found in the last 90 days.' });
    }

    // Step 2: Fetch each email's content
    const emails = [];
    for (const msg of messageIds.slice(0, 15)) { // Cap at 15 emails to stay within limits
      const msgUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`;
      const msgResponse = await fetch(msgUrl, {
        headers: { Authorization: `Bearer ${gmail_token}` },
      });

      if (!msgResponse.ok) continue;
      const msgData = await msgResponse.json();

      // Extract subject and date from headers
      const headers = msgData.payload?.headers || [];
      const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '';
      const date = headers.find(h => h.name.toLowerCase() === 'date')?.value || '';

      // Extract email body (could be in parts or directly on payload)
      let body = '';
      if (msgData.payload?.body?.data) {
        body = decodeBase64Url(msgData.payload.body.data);
      } else if (msgData.payload?.parts) {
        // Walk through MIME parts looking for text/html or text/plain
        body = extractBodyFromParts(msgData.payload.parts);
      }

      if (body && subject) {
        // Strip HTML tags but keep text structure
        const textBody = body
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&#?\w+;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 3000); // Limit length for Claude

        emails.push({ subject, date, body: textBody });
      }
    }

    if (emails.length === 0) {
      return res.status(200).json({ orders: [], message: 'Found emails but could not read their content.' });
    }

    // Step 3: Use Claude to extract structured order data from the email text
    // This is smarter than regex because Walmart email formats change over time
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: `You extract Walmart order data from email text. Return ONLY valid JSON (no markdown, no code fences).

For each email that contains a Walmart order, extract:
- order_date: ISO date string (YYYY-MM-DD)
- items: array of { name, qty, price } where price is the total for that line (price × qty)

Skip emails that are not actual order confirmations (shipping updates, ads, etc).

Return: { "orders": [ { "order_date": "2026-03-25", "items": [ { "name": "Product Name", "qty": 1, "price": 3.99 } ] } ] }

If no valid orders found, return: { "orders": [] }`,
      messages: [{
        role: 'user',
        content: `Extract Walmart orders from these ${emails.length} emails:\n\n${emails.map((e, i) =>
          `--- EMAIL ${i + 1} ---\nSubject: ${e.subject}\nDate: ${e.date}\n${e.body}`
        ).join('\n\n')}`,
      }],
    });

    const text = response.content[0].text;
    let result;
    try {
      result = JSON.parse(text);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse order data from emails');
      }
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Parse orders error:', error);
    return res.status(500).json({ error: 'Failed to parse orders', message: error.message });
  }
}

// Gmail uses URL-safe base64 encoding
function decodeBase64Url(data) {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

// Walk through MIME parts to find the email body
function extractBodyFromParts(parts) {
  for (const part of parts) {
    // Prefer HTML for better structure
    if (part.mimeType === 'text/html' && part.body?.data) {
      return decodeBase64Url(part.body.data);
    }
    // Recurse into multipart sections
    if (part.parts) {
      const found = extractBodyFromParts(part.parts);
      if (found) return found;
    }
  }
  // Fall back to plain text
  for (const part of parts) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      return decodeBase64Url(part.body.data);
    }
  }
  return '';
}
