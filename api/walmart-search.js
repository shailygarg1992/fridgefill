export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const query = req.query.q
  if (!query) {
    return res.status(400).json({ error: 'Missing query parameter "q"' })
  }

  const apiKey = process.env.GOOGLE_CSE_API_KEY
  const cx = process.env.GOOGLE_CSE_ID

  if (!apiKey || !cx) {
    return res.status(200).json({ products: [{ name: query, image: null, price: null, id: null }] })
  }

  try {
    const gUrl = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent('walmart ' + query)}&searchType=image&num=1&imgSize=medium&key=${apiKey}&cx=${cx}`
    const response = await fetch(gUrl)
    const data = await response.json()

    if (data.error) {
      console.error('Google CSE error:', data.error.message)
      return res.status(200).json({ products: [{ name: query, image: null, price: null, id: null }] })
    }

    const item = data.items?.[0]
    const products = [{
      name: item?.title || query,
      image: item?.link || null,
      price: null,
      id: null,
    }]

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800')
    return res.status(200).json({ products })
  } catch (err) {
    console.error('Search error:', err.message)
    return res.status(200).json({ products: [{ name: query, image: null, price: null, id: null }] })
  }
}
