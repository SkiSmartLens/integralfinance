import { CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { LineChart, Filter, Calendar, Pencil, Check, RotateCcw, GripVertical, X, Plus } from "lucide-react";
import { WatchlistButton } from "@/components/WatchlistButton";
import { useState, useEffect } from "react";
import {
  DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, arrayMove, horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useNavOrder } from "@/lib/navOrder";

interface Props {
  active: string;
  onChange: (id: string) => void;
  activeSub?: string;
  onSubChange?: (subId: string | undefined) => void;
}

function SortableChip({
  id, label, active, editing, onClick, onRemove,
}: { id: string; label: string; active: boolean; editing: boolean; onClick: () => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center rounded-full text-sm font-medium whitespace-nowrap transition-colors",
        active && !editing ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
        isDragging && "opacity-60 ring-2 ring-primary",
        editing && "pr-1",
      )}
    >
      {editing && (
        <button
          {...attributes} {...listeners}
          className="pl-2 pr-1 py-2 cursor-grab active:cursor-grabbing text-muted-foreground"
          aria-label="Drag"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
      )}
      <button
        onClick={onClick}
        disabled={editing}
        className={cn("px-4 py-2", editing && "cursor-default")}
      >
        {label}
      </button>
      {editing && (
        <button
          onClick={onRemove}
          className="ml-1 p-1 rounded-full hover:bg-destructive/10 text-destructive"
          aria-label={`Hide ${label}`}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export const CategoryNav = ({ active, onChange, activeSub, onSubChange }: Props) => {
  const activeCat = CATEGORIES.find((c) => c.id === active);
  const subs = activeCat?.subTopics ?? [];
  const { order, hidden, visible, setOrder, show, hide, reset } = useNavOrder();
  const [editing, setEditing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setEditing(false); setShowAdd(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing]);

  const onDragEnd = (e: DragEndEvent) => {
    const { active: a, over } = e;
    if (!over || a.id === over.id) return;
    const oldIndex = visible.indexOf(String(a.id));
    const newIndex = visible.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const newVisible = arrayMove(visible, oldIndex, newIndex);
    // Splice the reordered visible items back into the full order, preserving hidden positions
    const next: string[] = [];
    let v = 0;
    for (const id of order) {
      if (hidden.includes(id)) next.push(id);
      else { next.push(newVisible[v]); v++; }
    }
    setOrder(next);
  };

  const hiddenDefs = CATEGORIES.filter((c) => hidden.includes(c.id));

  return (
    <div className="border-b bg-background sticky top-0 z-30">
      <div className="container mx-auto px-4">
        <div className="flex gap-1 overflow-x-auto no-scrollbar py-2 items-center">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={visible} strategy={horizontalListSortingStrategy}>
              <div className="flex gap-1 items-center">
                {visible.map((id) => {
                  const c = CATEGORIES.find((x) => x.id === id);
                  if (!c) return null;
                  return (
                    <SortableChip
                      key={c.id}
                      id={c.id}
                      label={c.label}
                      active={active === c.id}
                      editing={editing}
                      onClick={() => onChange(c.id)}
                      onRemove={() => hide(c.id)}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>

          <div className="flex items-center gap-1 ml-1">
            {editing && hiddenDefs.length > 0 && (
              <button
                onClick={() => setShowAdd((v) => !v)}
                className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full bg-muted hover:bg-accent"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            )}
            {editing && (
              <button
                onClick={reset}
                className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full bg-muted hover:bg-accent"
                title="Restore default order"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => { setEditing((v) => !v); setShowAdd(false); }}
              className={cn(
                "flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full transition-colors",
                editing ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent",
              )}
              title="Customize categories"
            >
              {editing ? <><Check className="w-3.5 h-3.5" /> Done</> : <><Pencil className="w-3.5 h-3.5" /> Edit</>}
            </button>
          </div>

          {!editing && (
            <>
              <WatchlistButton />
              <Link
                to="/calendar"
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap bg-muted hover:bg-muted/70"
              >
                <Calendar className="w-4 h-4" />
                Calendar
              </Link>
              <Link
                to="/screener"
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap bg-muted hover:bg-muted/70"
              >
                <Filter className="w-4 h-4" />
                Screener
              </Link>
              <Link
                to="/sim"
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap bg-primary text-primary-foreground hover:opacity-90"
              >
                <LineChart className="w-4 h-4" />
                Simulator
              </Link>
            </>
          )}
        </div>

        {editing && showAdd && hiddenDefs.length > 0 && (
          <div className="pb-2 flex flex-wrap gap-1.5">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground self-center pr-1">
              Bring back:
            </span>
            {hiddenDefs.map((c) => (
              <button
                key={c.id}
                onClick={() => { show(c.id); }}
                className="text-xs font-semibold px-3 py-1 rounded-full border hover:bg-accent"
              >
                + {c.label}
              </button>
            ))}
          </div>
        )}

        {!editing && subs.length > 0 && (
          <div className="flex gap-1 overflow-x-auto no-scrollbar pb-2 -mt-1 items-center">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground pr-2 shrink-0">
              {activeCat?.label}:
            </span>
            <button
              onClick={() => onSubChange?.(undefined)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors border",
                !activeSub
                  ? "bg-foreground text-background border-foreground"
                  : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              All
            </button>
            {subs.map((s) => (
              <button
                key={s.id}
                onClick={() => onSubChange?.(s.id)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors border",
                  activeSub === s.id
                    ? "bg-foreground text-background border-foreground"
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
