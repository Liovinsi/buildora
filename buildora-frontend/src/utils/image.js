// Resize an image in the browser and return a data URL. Keeps uploads small enough
// to store directly in MongoDB for V1 (no file storage service needed).
const MAX_INPUT_BYTES = 10 * 1024 * 1024;
const MAX_DATA_URL_CHARS = 1_400_000;

export function assertImageFile(file) {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file');
  if (file.size > MAX_INPUT_BYTES) throw new Error('Image is too large (max 10 MB)');
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const el = new Image();
    // Remote (http) images need CORS to be drawn onto a canvas and exported.
    if (/^https?:/i.test(src)) el.crossOrigin = 'anonymous';
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Could not read this image'));
    el.src = src;
  });
}

export async function fileToResizedDataUrl(file, { maxSize = 1000, quality = 0.82 } = {}) {
  assertImageFile(file);

  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);

    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);

    // PNG keeps logo transparency; photos compress far better as JPEG.
    const type = file.type === 'image/png' && maxSize <= 512 ? 'image/png' : 'image/jpeg';
    const dataUrl = canvas.toDataURL(type, quality);
    if (dataUrl.length > MAX_DATA_URL_CHARS) throw new Error('Image is still too large after resizing. Try another one.');
    return dataUrl;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Rotate `src` by `rotation` degrees, cut out `area` (pixels, as reported by react-easy-crop
 * relative to the rotated image) and return a resized JPEG data URL.
 */
export async function cropImageToDataUrl(src, area, rotation = 0, { maxSize = 1000, quality = 0.82 } = {}) {
  const img = await loadImage(src);
  const rad = (rotation * Math.PI) / 180;
  const rotatedW = Math.abs(Math.cos(rad) * img.width) + Math.abs(Math.sin(rad) * img.height);
  const rotatedH = Math.abs(Math.sin(rad) * img.width) + Math.abs(Math.cos(rad) * img.height);

  const rotated = document.createElement('canvas');
  rotated.width = Math.round(rotatedW);
  rotated.height = Math.round(rotatedH);
  const rctx = rotated.getContext('2d');
  rctx.translate(rotated.width / 2, rotated.height / 2);
  rctx.rotate(rad);
  rctx.drawImage(img, -img.width / 2, -img.height / 2);

  const scale = Math.min(1, maxSize / Math.max(area.width, area.height));
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(area.width * scale));
  out.height = Math.max(1, Math.round(area.height * scale));
  const octx = out.getContext('2d');
  // JPEG has no transparency: fill corners exposed by rotation with white instead of black.
  octx.fillStyle = '#fff';
  octx.fillRect(0, 0, out.width, out.height);
  octx.drawImage(rotated, area.x, area.y, area.width, area.height, 0, 0, out.width, out.height);

  let dataUrl;
  try {
    dataUrl = out.toDataURL('image/jpeg', quality);
  } catch {
    throw new Error('This image is hosted elsewhere and cannot be edited. Use Replace to upload it instead.');
  }
  if (dataUrl.length > MAX_DATA_URL_CHARS) throw new Error('Image is still too large after editing. Try a smaller crop.');
  return dataUrl;
}
