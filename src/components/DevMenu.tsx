import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Settings2, Palette, Eye, EyeOff, RotateCcw, Trash2, Plus, X, Database,
  Navigation, LayoutGrid, Star, Send, Maximize2, Minimize2, Sun, Moon,
  ChevronRight, Bug, ArrowUp, ArrowDown,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { CATEGORIES } from "@/lib/categories";
import { useNavOrder } from "@/lib/navOrder";
import { useWidgets, WIDGET_REGISTRY } from "@/lib/widgets";
import { useWatchlist } from "@/hooks/useWatchlist";
import { dispatchAction, AI_ACTION_CATALOG } from "@/lib/actions";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const ROUTES = [
  { path: "/", label: "Home" },
  { path: "/watchlist", label: "Watchlist" },
  { path: "/screener", label: "Screener" },
  { path: "/calendar", label: "Calendar" },
  { path: "/sim", label: "Simulator" },
  { path: "/auth", label: "Auth" },
];

export const DevMenu = () => {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();
  const { order, hidden, visible, setOrder, hide, show, reset: resetNav } = useNavOrder();
  const { order: widgets, add: addW, remove: removeW, reset: resetW } = useWidgets();
  const { symbols: watch, add: addWatch, remove: removeWatch } = useWatchlist();

  const [theme, setTheme] = useState<"light" | "dark">(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light"
  );
  const [symInput, setSymInput] = useState("");
  const [watchInput, setWatchInput] = useState("");
  const [rawAction, setRawAction] = useState('{"type":"selectSymbol","symbol":"AAPL"}');
  const [storageVer, setStorageVer] = useState(0);

  // Keyboard shortcut: Ctrl/Cmd + . to open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === ".") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const applyTheme = (t: "light" | "dark") => {
    setTheme(t);
    document.documentElement.classList.toggle("dark", t === "dark");
    try { localStorage.setItem("theme", t); } catch {}
  };

  const storageEntries = useMemo(() => {
    const out: { key: string; size: number; preview: string }[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        const v = localStorage.getItem(k) ?? "";
        out.push({ key: k, size: v.length, preview: v.slice(0, 80) });
      }
    } catch {}
    return out.sort((a, b) => a.key.localeCompare(b.key));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageVer, open]);

  const moveCat = (id: string, dir: -1 | 1) => {
    const idx = order.indexOf(id);
    const next = [...order];
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= order.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setOrder(next);
  };

  const tryDispatchRaw = () => {
    try {
      const obj = JSON.parse(rawAction);
      dispatchAction(obj);
      toast({ title: "Action dispatched", description: obj.type });
    } catch (e: any) {
      toast({ title: "Invalid JSON", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          aria-label="Open dev menu"
          className="fixed bottom-4 left-4 z-[60] flex items-center gap-1.5 px-3 py-2 rounded-full bg-foreground text-background shadow-lg hover:opacity-90 text-xs font-bold"
        >
          <Settings2 className="w-3.5 h-3.5" />
          Dev
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Bug className="w-4 h-4 text-primary" /> Dev Menu
            <Badge variant="secondary" className="ml-2 text-[10px]">⌘/Ctrl + .</Badge>
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="nav" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 mt-3 grid grid-cols-7 h-9">
            <TabsTrigger value="nav" className="text-[11px]"><Navigation className="w-3 h-3" /></TabsTrigger>
            <TabsTrigger value="theme" className="text-[11px]"><Palette className="w-3 h-3" /></TabsTrigger>
            <TabsTrigger value="cats" className="text-[11px]"><LayoutGrid className="w-3 h-3" /></TabsTrigger>
            <TabsTrigger value="widgets" className="text-[11px]">W</TabsTrigger>
            <TabsTrigger value="watch" className="text-[11px]"><Star className="w-3 h-3" /></TabsTrigger>
            <TabsTrigger value="actions" className="text-[11px]"><Send className="w-3 h-3" /></TabsTrigger>
            <TabsTrigger value="storage" className="text-[11px]"><Database className="w-3 h-3" /></TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 px-5 py-4">
            {/* NAV */}
            <TabsContent value="nav" className="space-y-4 m-0">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Jump to route</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {ROUTES.map((r) => (
                    <Button
                      key={r.path}
                      variant={loc.pathname === r.path ? "default" : "outline"}
                      size="sm"
                      onClick={() => { nav(r.path); setOpen(false); }}
                      className="justify-start"
                    >
                      <ChevronRight className="w-3 h-3" /> {r.label}
                    </Button>
                  ))}
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Load symbol on Home</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="AAPL"
                    value={symInput}
                    onChange={(e) => setSymInput(e.target.value)}
                    className="h-9"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      const s = symInput.trim().toUpperCase();
                      if (!s) return;
                      if (loc.pathname !== "/") nav("/");
                      setTimeout(() => dispatchAction({ type: "selectSymbol", symbol: s }), 50);
                    }}
                  >Load</Button>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Window</Label>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => location.reload()}>
                    <RotateCcw className="w-3 h-3" /> Reload
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
                    else document.exitFullscreen?.();
                  }}>
                    <Maximize2 className="w-3 h-3" /> Fullscreen
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                    <ArrowUp className="w-3 h-3" /> Top
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* THEME */}
            <TabsContent value="theme" className="space-y-4 m-0">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold">Color theme</Label>
                  <p className="text-xs text-muted-foreground">Switch between light and dark.</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant={theme === "light" ? "default" : "outline"} onClick={() => applyTheme("light")}>
                    <Sun className="w-3 h-3" /> Light
                  </Button>
                  <Button size="sm" variant={theme === "dark" ? "default" : "outline"} onClick={() => applyTheme("dark")}>
                    <Moon className="w-3 h-3" /> Dark
                  </Button>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Primary hue</Label>
                <input
                  type="range" min={0} max={360} defaultValue={270}
                  onChange={(e) => {
                    const h = e.target.value;
                    document.documentElement.style.setProperty("--primary", `${h} 91% ${theme === "dark" ? "65%" : "35%"}`);
                    document.documentElement.style.setProperty("--ring", `${h} 91% ${theme === "dark" ? "65%" : "35%"}`);
                  }}
                  className="w-full"
                />
                <p className="text-[11px] text-muted-foreground">Live-edits the --primary HSL token.</p>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Radius</Label>
                <input
                  type="range" min={0} max={20} step={1} defaultValue={6}
                  onChange={(e) => document.documentElement.style.setProperty("--radius", `${Number(e.target.value) / 16}rem`)}
                  className="w-full"
                />
              </div>
            </TabsContent>

            {/* CATEGORIES */}
            <TabsContent value="cats" className="space-y-3 m-0">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Category order & visibility</Label>
                <Button size="sm" variant="ghost" onClick={resetNav}>
                  <RotateCcw className="w-3 h-3" /> Reset
                </Button>
              </div>
              <div className="space-y-1">
                {order.map((id) => {
                  const c = CATEGORIES.find((x) => x.id === id);
                  if (!c) return null;
                  const isHidden = hidden.includes(id);
                  return (
                    <div key={id} className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded border",
                      isHidden && "opacity-50",
                    )}>
                      <div className="flex flex-col">
                        <button onClick={() => moveCat(id, -1)} className="text-muted-foreground hover:text-foreground">
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button onClick={() => moveCat(id, 1)} className="text-muted-foreground hover:text-foreground">
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="flex-1 text-sm font-medium">{c.label}</span>
                      <span className="text-[10px] text-muted-foreground">{c.subTopics?.length ?? 0} subs</span>
                      <Switch
                        checked={!isHidden}
                        onCheckedChange={(v) => v ? show(id) : hide(id)}
                      />
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* WIDGETS */}
            <TabsContent value="widgets" className="space-y-3 m-0">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Dashboard widgets</Label>
                <Button size="sm" variant="ghost" onClick={resetW}>
                  <RotateCcw className="w-3 h-3" /> Reset
                </Button>
              </div>
              <div className="space-y-1">
                {WIDGET_REGISTRY.map((w) => {
                  const on = widgets.includes(w.id);
                  return (
                    <div key={w.id} className="flex items-center gap-2 px-2 py-1.5 rounded border">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{w.label}</div>
                        <div className="text-[11px] text-muted-foreground">{w.desc}</div>
                      </div>
                      <Switch checked={on} onCheckedChange={(v) => v ? addW(w.id) : removeW(w.id)} />
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* WATCHLIST */}
            <TabsContent value="watch" className="space-y-3 m-0">
              <div className="flex gap-2">
                <Input
                  placeholder="Add ticker e.g. NVDA"
                  value={watchInput}
                  onChange={(e) => setWatchInput(e.target.value)}
                  className="h-9"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && watchInput.trim()) {
                      addWatch(watchInput); setWatchInput("");
                    }
                  }}
                />
                <Button size="sm" onClick={() => { if (watchInput.trim()) { addWatch(watchInput); setWatchInput(""); } }}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              {watch.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Watchlist is empty.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {watch.map((s) => (
                    <button
                      key={s}
                      onClick={() => removeWatch(s)}
                      className="group flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted hover:bg-destructive/10 hover:text-destructive text-xs font-semibold"
                    >
                      {s}
                      <X className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ACTIONS */}
            <TabsContent value="actions" className="space-y-3 m-0">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Quick actions</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button size="sm" variant="outline" onClick={() => dispatchAction({ type: "resetWidgets" })}>Reset widgets</Button>
                  <Button size="sm" variant="outline" onClick={() => dispatchAction({ type: "setCategory", id: "tech" })}>Go Tech</Button>
                  <Button size="sm" variant="outline" onClick={() => dispatchAction({ type: "setCategory", id: "crypto" })}>Go Crypto</Button>
                  <Button size="sm" variant="outline" onClick={() => dispatchAction({ type: "scrollTo", target: "news" })}>Scroll to news</Button>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Dispatch raw action (JSON)</Label>
                <textarea
                  value={rawAction}
                  onChange={(e) => setRawAction(e.target.value)}
                  rows={3}
                  className="w-full text-xs font-mono p-2 rounded border bg-muted/40 outline-none focus:border-primary"
                />
                <Button size="sm" onClick={tryDispatchRaw} className="w-full">
                  <Send className="w-3 h-3" /> Dispatch
                </Button>
              </div>
              <Separator />
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Action catalog</Label>
                <div className="mt-2 space-y-1 text-[11px] font-mono">
                  {AI_ACTION_CATALOG.map((a) => (
                    <div key={a.type} className="p-2 rounded bg-muted/40">
                      <span className="text-primary font-bold">{a.type}</span>
                      <span className="text-muted-foreground"> — {a.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* STORAGE */}
            <TabsContent value="storage" className="space-y-3 m-0">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  localStorage ({storageEntries.length} keys)
                </Label>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setStorageVer((v) => v + 1)}>
                    <RotateCcw className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => {
                    if (confirm("Clear ALL localStorage?")) {
                      localStorage.clear();
                      setStorageVer((v) => v + 1);
                      toast({ title: "localStorage cleared" });
                    }
                  }}>
                    <Trash2 className="w-3 h-3" /> Clear all
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                {storageEntries.map((e) => (
                  <div key={e.key} className="flex items-start gap-2 p-2 rounded border text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono font-semibold truncate">{e.key}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{e.preview || <em>empty</em>}</div>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{e.size}b</span>
                    <button
                      onClick={() => { localStorage.removeItem(e.key); setStorageVer((v) => v + 1); }}
                      className="text-destructive hover:opacity-80"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <Separator />
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Session / Cookies</Label>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline" onClick={() => {
                    sessionStorage.clear();
                    toast({ title: "sessionStorage cleared" });
                  }}>
                    Clear session
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    document.cookie.split(";").forEach((c) => {
                      const name = c.split("=")[0].trim();
                      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
                    });
                    toast({ title: "Cookies cleared" });
                  }}>
                    Clear cookies
                  </Button>
                </div>
              </div>
              <Separator />
              <div className="text-[11px] text-muted-foreground space-y-1">
                <div>Route: <span className="font-mono">{loc.pathname}</span></div>
                <div>UA: <span className="font-mono break-all">{navigator.userAgent.slice(0, 60)}…</span></div>
                <div>Viewport: <span className="font-mono">{window.innerWidth}×{window.innerHeight}</span></div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
