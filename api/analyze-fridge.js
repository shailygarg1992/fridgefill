import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a grocery inventory analyst and smart budget optimizer for a family that shops at Walmart.

Your job:
1. Analyze fridge photo(s) to identify items visible and estimate their quantity level (full, half, low, empty).
2. Cross-reference what you see against the user's purchase history to determine what needs restocking.
3. Flag non-fridge items (pantry, frozen, baby, household) that are due for reorder based on purchase frequency.
4. Optimize for Walmart's $35 free delivery threshold with smart filler suggestions.
5. Detect strategic buy opportunities where items are significantly cheaper than baseline.

IMPORTANT RULES:
- Only suggest items from the user's purchase history. Never suggest random items.
- For the $35 filler: prioritize pull-forward staples (items needed in 1-2 orders), then long-shelf-life items, then non-grocery needs. Never suggest extra perishables.
- For strategic buys: only recommend stocking up on non-perishable or frozen items. For perishables on sale, recommend normal quantity.
- Be conservative with confidence scores.

You MUST respond with valid JSON matching this exact schema (no markdown, no code fences, just raw JSON):
{
  "fridge_contents": [
    { "item": "string", "status": "full|half|low|empty|not_found", "confidence": 0.0-1.0 }
  ],
  "restock_list": [
    {
      "item": "exact product name from history",
      "id": "staple id",
      "urgency": "need_now|need_soon|dont_forget",
      "reason": "brief explanation",
      "qty": number,
      "est_price": number,
      "walmart_search": "pre-built walmart search URL"
    }
  ],
  "estimated_total": number,
  "free_delivery": {
    "threshold": 35.00,
    "current_total": number,
    "gap": number,
    "status": "met|needs_filler|too_low",
    "filler_suggestions": [
      {
        "item": "product name",
        "id": "staple id",
        "reason": "why this is a smart filler",
        "strategy": "pull_forward_staple|long_shelf_life|non_grocery_need",
        "est_price": number,
        "qty": number,
        "walmart_search": "walmart search URL"
      }
    ],
    "recommendation": "brief recommendation text"
  },
  "strategic_buys": [
    {
      "item": "product name",
      "id": "staple id",
      "baseline_price": number,
      "current_price": number,
      "discount_pct": number,
      "savings_per_unit": number,
      "recommended_qty": number,
      "total_savings": number,
      "reason": "explanation",
      "walmart_search": "walmart search URL"
    }
  ]
}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { images, purchase_history, today } = req.body;

    if (!images || images.length === 0) {
      return res.status(400).json({ error: 'At least one image is required' });
    }

    const content = [];

    for (const img of images) {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: img,
        },
      });
    }

    content.push({
      type: 'text',
      text: `Today's date: ${today}

Here is the user's complete Walmart purchase history:
${JSON.stringify(purchase_history, null, 2)}

Known staple baseline prices for strategic buy detection:
- a2 Milk Vitamin D Whole Milk, 59 oz: $3.93/each (perishable)
- Great Value 2% Reduced Fat Milk, Gallon: $2.70 (perishable)
- Marketside Cage-Free Large Brown Eggs, 18 ct: $3.93 (moderate shelf life)
- Fresh Fuji Apples, 3 lb Bag: $3.34 (perishable)
- Great Value Garbanzos Chick Peas, 15.5 oz: $0.77/can (non-perishable, great to stock up)
- Great Value Triple Berry Blend, 48 oz (Frozen): $10.15 (frozen, great to stock up)
- Great Value Mango Chunks, 16 oz (Frozen): $3.07 (frozen, great to stock up)
- Great Value Raw Honey, 16 oz: $5.64 (non-perishable, great to stock up)
- Great Value Vegetable Oil, 1 Gallon: $8.43 (non-perishable, great to stock up)
- Parent's Choice Diapers Size 4, 192 ct: $24.64 (non-perishable, great to stock up)

Analyze the fridge photo(s). Identify everything visible, estimate quantity levels, determine what needs restocking based on purchase patterns and what you see, and generate the complete restock recommendation with free delivery optimization. Return ONLY valid JSON.`,
    });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
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
        throw new Error('Failed to parse Claude response as JSON');
      }
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Analyze fridge error:', error);
    return res.status(500).json({
      error: 'Analysis failed',
      message: error.message,
    });
  }
}
