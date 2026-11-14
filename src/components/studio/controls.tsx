import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';
export function Key({ active, primary, className, ...props }: ButtonProps & { active?: boolean | undefined; primary?: boolean | undefined }) {
  return <Button variant="ghost" className={cn('studio-key', active && 'is-active', primary && 'is-primary', className)} {...props} />;
}
export function Waveform({ buffer, muted = false }: { buffer?: AudioBuffer | undefined; muted?: boolean }) {
  const data = buffer?.getChannelData(0);
  const heights = Array.from({ length: 42 }, (_, i) => {
    if (!data) return 15 + Math.abs(Math.sin(i * 1.7) * Math.cos(i * .3)) * 70;
    const start = Math.floor(i * data.length / 42), end = Math.floor((i + 1) * data.length / 42);
    let max = 0; for (let j = start; j < end; j += Math.max(1, Math.floor((end - start) / 300))) max = Math.max(max, Math.abs(data[j] ?? 0));
    return Math.max(4, Math.min(92, max * 250));
  });
  return <svg className={cn('waveform', muted && 'wave-muted')} viewBox="0 0 210 56" preserveAspectRatio="none" aria-label="Forma de onda do áudio">{heights.map((h, i) => <line key={i} x1={6 + i * 4.8} x2={6 + i * 4.8} y1={28 - h * .25} y2={28 + h * .25} />)}</svg>;
}