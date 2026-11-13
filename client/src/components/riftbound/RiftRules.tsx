import { parseRiftRules } from "@shared/riftRules";
import { RiftTokenView } from "./RiftSymbol";

export default function RiftRules({
  text,
  rich,
  className = "",
  emptyLabel = "Bu kart için metin bulunmuyor.",
}: {
  text?: string | null;
  rich?: string | null;
  className?: string;
  emptyLabel?: string;
}) {
  const blocks = parseRiftRules(text, rich);
  if (!blocks.length) {
    return <div className={`text-sm leading-relaxed text-zinc-400 ${className}`} data-testid="rift-card-rules">
      <p role="status">{emptyLabel}</p>
    </div>;
  }

  return (
    <div className={`space-y-2.5 ${className}`} data-testid="rift-card-rules">
      {blocks.map((block, blockIndex) => block.kind === "list" ? (
        <ul className="my-2 space-y-2 border-l border-indigo-300/25 pl-3" key={`list-${blockIndex}`}>
          {block.lines.map((line, lineIndex) => (
            <li key={`choice-${lineIndex}`} className="relative flex min-w-0 items-start gap-2 leading-relaxed">
              <span className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-300/80" aria-hidden="true" />
              <span className="min-w-0 [overflow-wrap:anywhere]">{line.map((token, i) => <RiftTokenView key={i} token={token} />)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="leading-relaxed [overflow-wrap:anywhere]" key={`paragraph-${blockIndex}`}>
          {block.lines.map((line, lineIndex) => (
            <span className="block" key={`line-${lineIndex}`}>
              {line.map((token, i) => <RiftTokenView key={i} token={token} />)}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}
