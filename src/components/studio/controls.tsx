import { useMemo } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Mic, Music, Radio, Activity } from "lucide-react";

export function Key({
  active,
  primary,
  className,
  ...props
}: ButtonProps & { active?: boolean | undefined; primary?: boolean | undefined }) {
  return (
    <Button
      variant="ghost"
      className={cn("studio-key", active && "is-active", primary && "is-primary", className)}
      {...props}
    />
  );
}

export function Waveform({
  buffer,
  muted = false,
  color,
  showGrid = false,
  gridCount = 4,
}: {
  buffer?: AudioBuffer | undefined;
  muted?: boolean;
  color?: string;
  showGrid?: boolean;
  gridCount?: number;
}) {
  const heights = useMemo(() => {
    const data = buffer?.getChannelData(0);
    return Array.from({ length: 42 }, (_, i) => {
      if (!data) return 15 + Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.3)) * 70;
      const start = Math.floor((i * data.length) / 42),
        end = Math.floor(((i + 1) * data.length) / 42);
      let max = 0;
      for (let j = start; j < end; j += Math.max(1, Math.floor((end - start) / 300)))
        max = Math.max(max, Math.abs(data[j] ?? 0));
      return Math.max(4, Math.min(92, max * 250));
    });
  }, [buffer]);

  return (
    <div className="relative w-full">
      <svg
        className={cn("waveform", muted && "wave-muted")}
        viewBox="0 0 210 56"
        preserveAspectRatio="none"
        aria-label="Forma de onda do áudio"
      >
        {/* Subtle synchronized beat grid lines */}
        {showGrid &&
          Array.from({ length: gridCount }, (_, i) => {
            const x = (210 / gridCount) * i;
            return (
              <line
                key={`grid-${i}`}
                x1={x}
                x2={x}
                y1={0}
                y2={56}
                stroke="oklch(1 0 0 / 12%)"
                strokeWidth={i % 4 === 0 ? "1.5" : "0.75"}
                strokeDasharray={i % 4 === 0 ? undefined : "2 2"}
              />
            );
          })}
        {heights.map((h, i) => (
          <line
            key={i}
            x1={6 + i * 4.8}
            x2={6 + i * 4.8}
            y1={28 - h * 0.25}
            y2={28 + h * 0.25}
            stroke={color ? color : undefined}
          />
        ))}
      </svg>
    </div>
  );
}

export function InstrumentIcon({ icon, className }: { icon: string; className?: string }) {
  const c = cn("w-3.5 h-3.5 shrink-0", className);
  switch (icon) {
    case "mic":
      return <Mic className={c} />;
    case "guitar":
      return (
        <svg
          className={c}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m19 5-3 3" />
          <path d="m2 22 5.5-1.5L21.5 6.5a2.12 2.12 0 0 0-3-3L4.5 17.5 3 23Z" />
          <circle cx="11.5" cy="12.5" r="1.5" />
        </svg>
      );
    case "piano":
      return (
        <svg
          className={c}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="M6 8v8" />
          <path d="M10 8v8" />
          <path d="M14 8v8" />
          <path d="M18 8v8" />
        </svg>
      );
    case "drums":
    case "percussion":
      return (
        <svg
          className={c}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <ellipse cx="12" cy="8" rx="9" ry="4" />
          <path d="M3 8v8c0 2.21 4.03 4 9 4s9-1.79 9-4V8" />
          <path d="M12 12v8" />
        </svg>
      );
    case "bass":
      return (
        <svg
          className={c}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      );
    case "synth":
      return <Radio className={c} />;
    case "horn":
      return <Music className={c} />;
    default:
      return <Activity className={c} />;
  }
}
