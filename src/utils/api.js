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

export function imageToBase64(file, maxWidth = 1024, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(dataUrl.split(',')[1]);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
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
