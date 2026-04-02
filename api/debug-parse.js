// Lightweight diagnostic — NO Claude call, just tests Gmail access + HTML extraction.
// Hit POST /api/debug-parse with { "gmail_token": "..." }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { gmail_token } = req.body;
  if (!gmail_token) {
    return res.status(400).json({ error: 'No gmail_token in request body' });
  }

  const report = { steps: [], timestamp: new Date().toISOString() };

  function step(name, data) {
    report.steps.push({ step: name, ...data });
  }

  try {
    // STEP 1: Validate token
    const profileRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${gmail_token}` },
    });
    const profile = await profileRes.json();
    step('1_token_check', {
      ok: profileRes.ok,
      status: profileRes.status,
      email: profile.emailAddress || null,
      error: profile.error?.message || null,
    });
    if (!profileRes.ok) {
      return res.status(200).json(report);
    }

    // STEP 2: Search for ALL Walmart emails to find which types have item details
    const queries = [
      { label: 'All walmart emails', q: 'from:walmart.com newer_than:120d' },
      { label: 'Receipt emails', q: 'from:walmart.com subject:receipt newer_than:120d' },
      { label: 'Delivered emails', q: 'from:walmart.com subject:delivered newer_than:120d' },
      { label: 'Order ready', q: 'from:walmart.com subject:"order is" newer_than:120d' },
      { label: 'Substitution', q: 'from:walmart.com subject:substitut newer_than:120d' },
      { label: 'Arriving', q: 'from:walmart.com subject:arriving newer_than:120d' },
    ];

    for (const { label, q } of queries) {
      const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(q)}&maxResults=5`;
      const res2 = await fetch(url, { headers: { Authorization: `Bearer ${gmail_token}` } });
      const data = await res2.json();
      const count = data.messages?.length || 0;

      // Get subjects of found emails
      const subjects = [];
      if (data.messages) {
        for (const m of data.messages.slice(0, 5)) {
          const mRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=Date`,
            { headers: { Authorization: `Bearer ${gmail_token}` } }
          );
          const mData = await mRes.json();
          const h = mData.payload?.headers || [];
          subjects.push({
            subject: h.find(x => x.name === 'Subject')?.value,
            date: h.find(x => x.name === 'Date')?.value,
          });
        }
      }

      step(`2_search_${label}`, { query: q, found: count, subjects });
    }

    return res.status(200).json(report);
  } catch (error) {
    step('fatal_error', { error: error.message, stack: error.stack?.split('\n').slice(0, 3) });
    return res.status(200).json(report);
  }
}

function decodeBase64Url(data) {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

function deepMimeAnalysis(payload, depth = 0) {
  if (!payload) return { type: 'null' };
  const info = {
    mimeType: payload.mimeType,
    bodySize: payload.body?.size || 0,
    hasBodyData: !!(payload.body?.data),
    bodyDataLength: payload.body?.data?.length || 0,
    hasAttachmentId: !!(payload.body?.attachmentId),
    attachmentId: payload.body?.attachmentId || null,
  };
  if (payload.parts && depth < 4) {
    info.parts = payload.parts.map(p => deepMimeAnalysis(p, depth + 1));
  }
  return info;
}

async function findHtmlPart(parts, messageId, token, depth = 0) {
  // First pass: look for text/html
  for (const part of parts) {
    if (part.mimeType === 'text/html') {
      if (part.body?.data) {
        return { html: decodeBase64Url(part.body.data), method: `text/html with inline data (depth=${depth})` };
      }
      if (part.body?.attachmentId) {
        // Fetch via attachments API
        const attUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${part.body.attachmentId}`;
        try {
          const attRes = await fetch(attUrl, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (attRes.ok) {
            const attData = await attRes.json();
            if (attData.data) {
              return { html: decodeBase64Url(attData.data), method: `text/html via attachmentId (depth=${depth}, size=${part.body.size})` };
            }
            return { html: '', method: `text/html attachmentId fetch OK but no data (depth=${depth})` };
          }
          return { html: '', method: `text/html attachmentId fetch failed: ${attRes.status} (depth=${depth})` };
        } catch (e) {
          return { html: '', method: `text/html attachmentId fetch error: ${e.message} (depth=${depth})` };
        }
      }
      return { html: '', method: `text/html found but no data and no attachmentId (bodySize=${part.body?.size}, depth=${depth})` };
    }
  }

  // Recurse into nested parts
  for (const part of parts) {
    if (part.parts && depth < 4) {
      const found = await findHtmlPart(part.parts, messageId, token, depth + 1);
      if (found.html) return found;
    }
  }

  // Fallback: plain text
  for (const part of parts) {
    if (part.mimeType === 'text/plain') {
      if (part.body?.data) {
        return { html: decodeBase64Url(part.body.data), method: `FALLBACK: text/plain with inline data (depth=${depth})` };
      }
      if (part.body?.attachmentId) {
        const attUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${part.body.attachmentId}`;
        try {
          const attRes = await fetch(attUrl, { headers: { Authorization: `Bearer ${token}` } });
          if (attRes.ok) {
            const attData = await attRes.json();
            if (attData.data) return { html: decodeBase64Url(attData.data), method: `FALLBACK: text/plain via attachmentId (depth=${depth})` };
          }
        } catch {}
      }
    }
  }

  return { html: '', method: `nothing found at depth=${depth}` };
}

async function findPlainText(parts, messageId, token) {
  for (const part of parts) {
    if (part.mimeType === 'text/plain') {
      if (part.body?.data) return decodeBase64Url(part.body.data);
      if (part.body?.attachmentId) {
        const attUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${part.body.attachmentId}`;
        try {
          const attRes = await fetch(attUrl, { headers: { Authorization: `Bearer ${token}` } });
          if (attRes.ok) {
            const attData = await attRes.json();
            if (attData.data) return decodeBase64Url(attData.data);
          }
        } catch {}
      }
    }
    if (part.parts) {
      const found = await findPlainText(part.parts, messageId, token);
      if (found) return found;
    }
  }
  return '';
}
