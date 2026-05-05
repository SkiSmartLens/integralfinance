import { CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/utils";

interface Props {
  active: string;
  onChange: (id: string) => void;
}

export const CategoryNav = ({ active, onChange }: Props) => {
  return (
    <div className="border-b bg-background sticky top-0 z-30">
      <div className="container mx-auto px-4">
        <div className="flex gap-1 overflow-x-auto no-scrollbar py-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => onChange(c.id)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                active === c.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
