import { ORDER_HISTORY } from '../data/staples';

export async function analyzeFridge(images) {
  const response = await fetch('/api/analyze-fridge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      images,
      purchase_history: ORDER_HISTORY,
      today: new Date().toISOString().split('T')[0],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err || 'Analysis failed');
  }

  return response.json();
}

export function imageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function getWalmartLink(searchQuery) {
  return `https://www.walmart.com/search?q=${searchQuery}`;
}

export function daysSince(dateStr) {
  const then = new Date(dateStr);
  const now = new Date();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}
