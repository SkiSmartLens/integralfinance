import { useEffect, useRef, useState, ReactNode } from "react";
import { GripHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title?: string;
  children: ReactNode;
  /** Collapsed (handle-only) height in px */
  minHeight?: number;
  /** Default expanded height (px) on first open */
  defaultHeight?: number;
  /** Bump this number to force-expand the sheet. */
  openSignal?: number;
}

/**
 * Draggable bottom sheet, inspired by MarketWatch Virtual Stock Exchange.
 * Drag the handle up/down to resize. Tap the handle to toggle collapsed/open.
 */
export const DragSheet = ({
  title = "Integral Stocks",
  children,
  minHeight = 52,
  defaultHeight = 380,
}: Props) => {
  const [height, setHeight] = useState<number>(minHeight);
  const lastOpen = useRef<number>(defaultHeight);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startH = useRef(0);
  const moved = useRef(false);

  const maxH = () => Math.max(200, Math.round(window.innerHeight * 0.85));

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    moved.current = false;
    startY.current = e.clientY;
    startH.current = height;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dy = startY.current - e.clientY;
    if (Math.abs(dy) > 4) moved.current = true;
    const next = Math.max(minHeight, Math.min(maxH(), startH.current + dy));
    setHeight(next);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    if (!moved.current) {
      // Tap toggles
      if (height <= minHeight + 4) setHeight(lastOpen.current);
      else { lastOpen.current = height; setHeight(minHeight); }
    } else if (height > minHeight + 4) {
      lastOpen.current = height;
    }
  };

  useEffect(() => {
    const onResize = () => setHeight((h) => Math.min(h, maxH()));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const open = height > minHeight + 4;

  return (
    <div
      className="fixed left-0 right-0 bottom-0 z-30 bg-card border-t shadow-2xl rounded-t-xl"
      style={{ height, transition: dragging.current ? "none" : "height 220ms ease" }}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={cn(
          "h-[52px] flex items-center px-4 gap-3 cursor-grab active:cursor-grabbing select-none touch-none",
          "border-b"
        )}
      >
        <div className="flex-1 flex flex-col items-center -ml-6">
          <GripHorizontal className="w-5 h-5 text-muted-foreground -mb-1" />
          <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-muted-foreground">
            {title}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
          {open ? "Drag down" : "Drag up"}
        </span>
      </div>
      <div
        className="overflow-y-auto"
        style={{ height: Math.max(0, height - 52) }}
      >
        {children}
      </div>
    </div>
  );
};
