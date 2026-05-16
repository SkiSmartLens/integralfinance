import { useState } from "react";
import {
  DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, arrayMove, rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Plus, X, RotateCcw, Check } from "lucide-react";
import { useWidgets, WIDGET_REGISTRY } from "@/lib/widgets";
import { onAction } from "@/lib/actions";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  TopGainersWidget, TopLosersWidget, MostActiveWidget, TrendingWidget,
  SectorsWidget, IndicesWidget, MyWatchlistWidget,
} from "@/components/widgets/Widgets";

const RENDER: Record<string, () => JSX.Element> = {
  top_gainers: TopGainersWidget,
  top_losers: TopLosersWidget,
  most_active: MostActiveWidget,
  trending: TrendingWidget,
  sectors: SectorsWidget,
  indices: IndicesWidget,
  my_watchlist: MyWatchlistWidget,
};

function SortableCard({
  id, editing, onRemove,
}: { id: string; editing: boolean; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const def = WIDGET_REGISTRY.find((w) => w.id === id);
  const Comp = RENDER[id];
  if (!def || !Comp) return null;
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "bg-card border rounded-lg overflow-hidden flex flex-col",
        isDragging && "opacity-60 ring-2 ring-primary",
      )}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2 min-w-0">
          {editing && (
            <button
              {...attributes} {...listeners}
              className="p-1 -m-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
              aria-label="Drag"
            >
              <GripVertical className="w-4 h-4" />
            </button>
          )}
          <span className="text-[11px] font-bold uppercase tracking-wider truncate">{def.label}</span>
        </div>
        {editing && (
          <button onClick={onRemove} className="p-1 rounded hover:bg-destructive/10 text-destructive" aria-label="Remove">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0 max-h-72 overflow-y-auto">
        <Comp />
      </div>
    </div>
  );
}

export const WidgetBar = () => {
  const { order, add, remove, reorder, reset } = useWidgets();
  const [editing, setEditing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  // Allow AI to flip into edit mode via custom event
  useEffect(() => onAction((a) => {
    if (a.type === "addWidget" || a.type === "removeWidget" || a.type === "reorderWidgets") {
      // Briefly highlight by entering edit mode so users see the change
      setEditing(true);
      window.setTimeout(() => setEditing(false), 2500);
    }
  }), []);

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(String(active.id));
    const newIndex = order.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    reorder(arrayMove(order, oldIndex, newIndex));
  };

  const available = WIDGET_REGISTRY.filter((w) => !order.includes(w.id));

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">Your Dashboard</h2>
          <p className="text-xs text-muted-foreground">
            Drag to rearrange. Ask Integral AI to add or remove widgets for you.
          </p>
        </div>
        <div className="flex items-center gap-1">
          {editing && (
            <>
              <button
                onClick={() => setShowAdd((v) => !v)}
                className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-muted hover:bg-accent"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
              <button
                onClick={reset}
                className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-muted hover:bg-accent"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            </>
          )}
          <button
            onClick={() => { setEditing((v) => !v); setShowAdd(false); }}
            className={cn(
              "flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md transition-colors",
              editing ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent",
            )}
          >
            {editing ? <><Check className="w-3.5 h-3.5" /> Done</> : <><Pencil className="w-3.5 h-3.5" /> Customize</>}
          </button>
        </div>
      </div>

      {editing && showAdd && (
        <div className="bg-card border rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2">
            Add a widget
          </div>
          {available.length === 0 ? (
            <div className="text-xs text-muted-foreground">All widgets are on the board.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {available.map((w) => (
                <button
                  key={w.id}
                  onClick={() => { add(w.id); setShowAdd(false); }}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full border hover:bg-accent"
                  title={w.desc}
                >
                  + {w.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {order.length === 0 ? (
        <div className="bg-card border rounded-lg p-6 text-center text-sm text-muted-foreground">
          No widgets. Click <span className="font-semibold">Customize → Add</span> or ask Integral AI to add some.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={order} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {order.map((id) => (
                <SortableCard key={id} id={id} editing={editing} onRemove={() => remove(id)} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
};
