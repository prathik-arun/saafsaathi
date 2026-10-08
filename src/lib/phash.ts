/**
 * Perceptual hash ("dHash") of a photo, used for anti-cheat: the same photo
 * cannot earn scan points twice, even if it is re-saved or slightly resized.
 *
 * How it works: shrink the image to 9x8 grey pixels, then for each row
 * record whether each pixel is brighter than its right-hand neighbour.
 * That gives 64 bits, written as 16 hex characters.
 */
export function perceptualHash(source: CanvasImageSource): string {
  const canvas = document.createElement('canvas');
  canvas.width = 9;
  canvas.height = 8;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0, 9, 8);
  const { data } = ctx.getImageData(0, 0, 9, 8);

  const grey = (x: number, y: number) => {
    const i = (y * 9 + x) * 4;
    return data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  };

  let hex = '';
  for (let y = 0; y < 8; y++) {
    let byte = 0;
    for (let x = 0; x < 8; x++) {
      byte = (byte << 1) | (grey(x, y) > grey(x + 1, y) ? 1 : 0);
    }
    hex += byte.toString(16).padStart(2, '0');
  }
  return hex;
}
