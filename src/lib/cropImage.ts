// Cropping a photo into a square: the maths behind the prize photo cropper.

export interface CoverLayout {
  /** The image's size on screen. */
  w: number;
  h: number;
  /** How far it's been moved from centered, kept so it still fills the square. */
  x: number;
  y: number;
  /** Its top-left corner within the square. */
  left: number;
  top: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Where an image sits in a square window `view` pixels wide: scaled so it
 * just covers the window, times `zoom` (1 or more), and moved by `offset`,
 * but never so far that a gap shows at an edge.
 */
export function coverLayout(naturalW: number, naturalH: number, view: number, zoom: number, offset: { x: number; y: number }): CoverLayout {
  const scale = (view / Math.min(naturalW, naturalH)) * Math.max(1, zoom);
  const w = naturalW * scale;
  const h = naturalH * scale;
  const x = clamp(offset.x, -(w - view) / 2, (w - view) / 2);
  const y = clamp(offset.y, -(h - view) / 2, (h - view) / 2);
  return { w, h, x, y, left: (view - w) / 2 + x, top: (view - h) / 2 + y };
}

/**
 * What's in the window, as a square picture `size` pixels wide, small enough
 * to save with the game: WebP where the browser can make it, else JPEG, at
 * the best quality that fits in `maxLength` characters.
 */
export function cropToDataUrl(img: HTMLImageElement, layout: CoverLayout, view: number, size: number, maxLength: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can't crop pictures.");
  const k = size / view;
  // A white background, for see-through PNGs saved as JPEG.
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, size, size);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, layout.left * k, layout.top * k, layout.w * k, layout.h * k);
  let url = "";
  for (const quality of [0.85, 0.75, 0.6, 0.45, 0.3]) {
    const webp = canvas.toDataURL("image/webp", quality);
    url = webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", quality);
    if (url.length <= maxLength) return url;
  }
  return url;
}
