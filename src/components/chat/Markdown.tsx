import { Fragment } from "react";
import { cn } from "@/lib/util";

/*
 * A small Markdown renderer for coach replies: paragraphs, bullet and numbered
 * lists, headings, **bold** and *italic*. Enough for chat, no dependency.
 */

function inline(text: string, keyBase: string) {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const bold = tok.startsWith("**") || tok.startsWith("__");
    const inner = bold ? tok.slice(2, -2) : tok.slice(1, -1);
    out.push(bold ? <strong key={`${keyBase}-${i++}`} className="font-semibold text-fg">{inner}</strong> : <em key={`${keyBase}-${i++}`}>{inner}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type Block = { kind: "p"; text: string } | { kind: "h"; text: string } | { kind: "ul"; items: string[] } | { kind: "ol"; items: string[] };

function blocks(src: string): Block[] {
  const out: Block[] = [];
  for (const chunk of src.replace(/\r/g, "").split(/\n{2,}/)) {
    const lines = chunk.split("\n").filter((l) => l.trim());
    let para: string[] = [];
    const flush = () => {
      if (para.length) out.push({ kind: "p", text: para.join("\n") });
      para = [];
    };
    for (const line of lines) {
      const ul = line.match(/^\s*[-*•]\s+(.*)/);
      const ol = line.match(/^\s*\d+[.)]\s+(.*)/);
      const h = line.match(/^\s*#{1,4}\s+(.*)/);
      const last = out[out.length - 1];
      if (h) {
        flush();
        out.push({ kind: "h", text: h[1] });
      } else if (ul || ol) {
        flush();
        const kind = ul ? "ul" : "ol";
        const item = (ul ?? ol)![1];
        if (last && last.kind === kind && para.length === 0) last.items.push(item);
        else out.push({ kind, items: [item] });
      } else {
        para.push(line.trim());
      }
    }
    flush();
  }
  return out;
}

export function Markdown({ text, caret, className }: { text: string; caret?: boolean; className?: string }) {
  const bs = blocks(text);
  return (
    <div className={cn("flex flex-col gap-2.5 text-[15px] leading-[1.6] text-fg", className)}>
      {bs.map((b, i) => {
        const end = caret && i === bs.length - 1;
        if (b.kind === "h") return <p key={i} className={cn("pt-1 text-[14px] font-semibold text-fg", end && "caret")}>{inline(b.text, `h${i}`)}</p>;
        if (b.kind === "p")
          return (
            <p key={i} className={cn("whitespace-pre-wrap", end && "caret")}>
              {inline(b.text, `p${i}`)}
            </p>
          );
        const List = b.kind === "ul" ? "ul" : "ol";
        return (
          <List key={i} className="flex flex-col gap-1.5">
            {b.items.map((it, j) => (
              <li key={j} className={cn("flex gap-2.5", end && j === b.items.length - 1 && "caret")}>
                {b.kind === "ul" ? <span className="mt-[10px] h-[5px] w-[5px] shrink-0 rounded-full bg-fg-muted" /> : <span className="w-4 shrink-0 text-fg-subtle tabular-nums">{j + 1}.</span>}
                <span className="min-w-0">
                  <Fragment>{inline(it, `l${i}-${j}`)}</Fragment>
                </span>
              </li>
            ))}
          </List>
        );
      })}
      {caret && bs.length === 0 && <p className="caret" />}
    </div>
  );
}
