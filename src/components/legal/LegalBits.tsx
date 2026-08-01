import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared prose scale for all legal / disclosure pages: bigger body text,
 *  clear heading steps, comfortable line-height. */
export const legalProse = cn(
  "prose prose-neutral dark:prose-invert max-w-none",
  "prose-headings:font-extrabold prose-headings:tracking-tight",
  "prose-h2:text-2xl sm:prose-h2:text-3xl prose-h2:mt-10 prose-h2:mb-3",
  "prose-h3:text-lg prose-h3:mt-6",
  "prose-p:text-[1.0625rem] sm:prose-p:text-lg prose-p:leading-[1.8] prose-p:text-muted-foreground",
  "prose-strong:text-foreground prose-li:text-muted-foreground prose-li:leading-[1.8]",
  "prose-a:text-primary prose-a:font-semibold",
);

/** Oversized opening line — the one sentence that matters most on the page. */
export const Lead = ({ children }: { children: ReactNode }) => (
  <p className="not-prose text-xl sm:text-2xl font-bold leading-snug text-foreground mb-8">
    {children}
  </p>
);

/** A pulled-out key takeaway so pages don't read as one block of text. */
export const KeyPoint = ({ label = "In short", children }: { label?: string; children: ReactNode }) => (
  <div className="not-prose my-7 rounded-2xl border-l-4 border-primary bg-accent/60 px-5 py-4">
    <div className="text-[11px] font-extrabold uppercase tracking-wider text-primary">{label}</div>
    <p className="text-base sm:text-lg font-semibold leading-relaxed text-foreground mt-1.5">{children}</p>
  </div>
);

/** Section wrapper with a numbered, scannable heading. */
export const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="mt-10 first:mt-0">
    <h2 className="not-prose text-2xl sm:text-3xl font-extrabold tracking-tight mb-3">{title}</h2>
    <div className="space-y-4 text-[1.0625rem] sm:text-lg leading-[1.8] text-muted-foreground">{children}</div>
  </section>
);

/** Page masthead used across the legal pages. */
export const LegalHeader = ({
  icon,
  eyebrow = "Legal",
  title,
  updated,
}: {
  icon: ReactNode;
  eyebrow?: string;
  title: string;
  updated?: string;
}) => (
  <header className="not-prose mb-8">
    <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-primary bg-accent px-3 py-1 rounded-full">
      {icon} {eyebrow}
    </div>
    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mt-3">{title}</h1>
    {updated && <p className="text-sm text-muted-foreground mt-2">Last updated: {updated}</p>}
  </header>
);
