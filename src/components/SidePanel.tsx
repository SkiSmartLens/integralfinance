import { useEffect, useRef, useState, ReactNode } from "react";
import { GripVertical, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title?: string;
  children: ReactNode;
  /** Collapsed (handle-only) width in px */
  minWidth?: number;
  /** Default expanded width (px) */
  defaultWidth?: number;
  /** Bump this number to force-expand the panel. */
  openSignal?: number;
}

/**
 * Draggable side panel anchored to the right edge of the viewport.
 * Drag the handle left/right to resize. Tap the handle to toggle.
 */
export const SidePanel = ({
  title = "Integral Stocks",
  children,
  minWidth = 44,
  defaultWidth = 340,
  openSignal,
}: Props) => {
  const [width, setWidth] = useState<number>(minWidth);
  const lastOpen = useRef<number>(defaultWidth);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);
  const moved = useRef(false);

  const maxW = () => Math.max(280, Math.min(560, Math.round(window.innerWidth * 0.6)));

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    moved.current = false;
    startX.current = e.clientX;
    startW.current = width;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = startX.current - e.clientX;
    if (Math.abs(dx) > 4) moved.current = true;
    const next = Math.max(minWidth, Math.min(maxW(), startW.current + dx));
    setWidth(next);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    if (!moved.current) {
      if (width <= minWidth + 4) setWidth(lastOpen.current);
      else { lastOpen.current = width; setWidth(minWidth); }
    } else if (width > minWidth + 4) {
      lastOpen.current = width;
    }
  };

  useEffect(() => {
    const onResize = () => setWidth((w) => Math.min(w, maxW()));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (openSignal == null) return;
    setWidth(lastOpen.current);
  }, [openSignal]);

  const open = width > minWidth + 4;

  return (
    <div
      className="fixed right-0 top-1/2 -translate-y-1/2 z-30 bg-card border shadow-2xl rounded-l-xl flex max-h-[80vh]"
      style={{ width, transition: dragging.current ? "none" : "width 220ms ease" }}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={cn(
          "w-[44px] flex flex-col items-center justify-center gap-3 cursor-grab active:cursor-grabbing select-none touch-none border-r shrink-0"
        )}
      >
        {open ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronLeft className="w-4 h-4 text-muted-foreground" />}
        <GripVertical className="w-4 h-4 text-muted-foreground" />
        <span
          className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground whitespace-nowrap"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          {title}
        </span>
      </div>
      {open && (
        <div className="flex-1 overflow-y-auto min-w-0">
          {children}
        </div>
      )}
    </div>
  );
};
