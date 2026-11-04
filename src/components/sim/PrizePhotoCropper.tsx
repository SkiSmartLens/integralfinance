import { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { coverLayout, cropToDataUrl } from "@/lib/cropImage";

// The crop square on screen, and the saved photo (sharp on high-resolution
// screens, where a prize box is up to 176 points wide), in pixels.
const VIEW = 240;
const SIZE = 320;
const MAX_ZOOM = 4;
// Well under the database's 60,000 characters per photo.
const MAX_LENGTH = 40_000;

/**
 * Fitting a prize photo into its square box: drag it to move it, and zoom
 * with the slider (or the arrow keys and + and −). Opens on a newly chosen
 * photo, or on the prize's current one to adjust, change or remove it.
 */
export const PrizePhotoCropper = ({
  src,
  title,
  onDone,
  onCancel,
  onChooseAnother,
  onRemove,
}: {
  src: string;
  title: string;
  onDone: (photo: string) => void;
  onCancel: () => void;
  onChooseAnother: () => void;
  /** Only when the prize already has a photo. */
  onRemove?: () => void;
}) => {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ id: number; x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    setImg(null);
    setFailed(false);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    const i = new Image();
    i.onload = () => setImg(i);
    i.onerror = () => setFailed(true);
    i.src = src;
  }, [src]);

  const layout = img ? coverLayout(img.naturalWidth, img.naturalHeight, VIEW, zoom, offset) : null;
  // Keeps the stored position inside the edges, so dragging back responds at once.
  const place = (x: number, y: number, z = zoom) => {
    if (!img) return;
    const l = coverLayout(img.naturalWidth, img.naturalHeight, VIEW, z, { x, y });
    setOffset({ x: l.x, y: l.y });
  };
  const zoomTo = (z: number) => {
    const next = Math.min(MAX_ZOOM, Math.max(1, z));
    setZoom(next);
    place(offset.x, offset.y, next);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = 8;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (moves[e.key]) {
      e.preventDefault();
      place(offset.x + moves[e.key][0], offset.y + moves[e.key][1]);
    } else if (e.key === "+" || e.key === "=") {
      zoomTo(zoom + 0.2);
    } else if (e.key === "-") {
      zoomTo(zoom - 0.2);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Drag the photo to move it and use the slider to zoom, so the prize fills the box.</DialogDescription>
        </DialogHeader>

        <div
          role="group"
          tabIndex={0}
          aria-label="Photo in its box. Arrow keys move it, plus and minus zoom."
          onKeyDown={onKeyDown}
          onPointerDown={(e) => {
            if (!layout) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, ox: layout.x, oy: layout.y };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (d && d.id === e.pointerId) place(d.ox + e.clientX - d.x, d.oy + e.clientY - d.y);
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          style={{ width: VIEW, height: VIEW }}
          className="relative mx-auto overflow-hidden rounded-2xl bg-muted ring-2 ring-primary/50 touch-none select-none cursor-grab active:cursor-grabbing outline-none focus-visible:ring-4"
        >
          {layout && (
            <img
              src={src}
              alt=""
              draggable={false}
              style={{ position: "absolute", left: layout.left, top: layout.top, width: layout.w, height: layout.h, maxWidth: "none" }}
            />
          )}
          {failed && (
            <p className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-muted-foreground">
              That file couldn't be opened as a picture. Try a JPEG or PNG.
            </p>
          )}
        </div>

        <label className="flex items-center gap-2.5 text-muted-foreground">
          <ZoomOut className="w-4 h-4 shrink-0" />
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => zoomTo(Number(e.target.value))}
            disabled={!img}
            aria-label="Zoom"
            className="flex-1 accent-primary"
          />
          <ZoomIn className="w-4 h-4 shrink-0" />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onChooseAnother}
            className="h-9 px-3 rounded-xl border-2 text-xs font-bold inline-flex items-center gap-1.5 hover:border-primary hover:text-primary"
          >
            <ImagePlus className="w-3.5 h-3.5" /> Choose a different photo
          </button>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="h-9 px-3 rounded-xl border-2 text-xs font-bold inline-flex items-center gap-1.5 text-rose-600 hover:border-rose-300"
            >
              <Trash2 className="w-3.5 h-3.5" /> Remove photo
            </button>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="h-10 px-4 rounded-xl text-sm font-bold text-muted-foreground hover:text-foreground">
            Cancel
          </button>
          <button
            type="button"
            disabled={!img || !layout}
            onClick={() => img && layout && onDone(cropToDataUrl(img, layout, VIEW, SIZE, MAX_LENGTH))}
            className="h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-extrabold disabled:opacity-50"
          >
            Use photo
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
