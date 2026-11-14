import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InstrumentIcon } from "./controls";
import {
  INSTRUMENT_TAXONOMY,
  CATEGORY_LABELS,
  type DetectedInstrument,
  type InstrumentCategory,
  refineInstrument,
} from "@/lib/audio/instrument-detector";
import { Check, Sparkles, SlidersHorizontal, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface InstrumentRefineModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelIndex: number;
  currentTrackName: string;
  currentTrackIcon: DetectedInstrument["icon"];
  currentTrackColor?: string;
  currentConfidencePercent?: string;
  onApplyRefinement: (channelIndex: number, refined: DetectedInstrument) => void;
}

export function InstrumentRefineModal({
  open,
  onOpenChange,
  channelIndex,
  currentTrackName,
  currentTrackIcon,
  currentTrackColor,
  currentConfidencePercent,
  onApplyRefinement,
}: InstrumentRefineModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string>("");
  const [customName, setCustomName] = useState("");
  const [customIcon, setCustomIcon] = useState<DetectedInstrument["icon"]>(currentTrackIcon || "synth");

  const categories = useMemo(() => {
    return [
      { id: "all", label: "Todos os Instrumentos" },
      { id: "vocais", label: CATEGORY_LABELS.vocais },
      { id: "percussao", label: CATEGORY_LABELS.percussao },
      { id: "baixo", label: CATEGORY_LABELS.baixo },
      { id: "cordas", label: CATEGORY_LABELS.cordas },
      { id: "teclas", label: CATEGORY_LABELS.teclas },
      { id: "metais", label: CATEGORY_LABELS.metais },
    ];
  }, []);

  const filteredInstruments = useMemo(() => {
    return INSTRUMENT_TAXONOMY.filter((inst) => {
      const matchesCategory = selectedCategory === "all" || inst.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        inst.name.toLowerCase().includes(q) ||
        inst.description.toLowerCase().includes(q) ||
        (inst.timbreCharacteristics && inst.timbreCharacteristics.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  function handleConfirm() {
    if (customName.trim().length > 0) {
      // User typed custom name
      const customInst: DetectedInstrument = {
        id: `custom-${customName.toLowerCase().replace(/\s+/g, "-")}`,
        name: customName.trim(),
        shortName: customName.trim().slice(0, 16),
        category: (selectedCategory === "all" ? "cordas" : selectedCategory) as InstrumentCategory,
        categoryLabel: selectedCategory === "all" ? "Personalizado" : (CATEGORY_LABELS[selectedCategory as InstrumentCategory] || "Personalizado"),
        confidence: 1.0,
        confidencePercent: "100% calibrado",
        tag: `${customName.trim()} · Calibrado`,
        icon: customIcon,
        color: currentTrackColor || "#38bdf8",
        accentClass: "border-sky-500/50 text-sky-400",
        badgeClass: "bg-sky-500/10 text-sky-400 border-sky-500/30",
        description: `Instrumento personalizado configurado manualmente para o canal CH 0${channelIndex + 1}`,
      };
      onApplyRefinement(channelIndex, customInst);
    } else if (selectedInstrumentId) {
      const selected = INSTRUMENT_TAXONOMY.find((i) => i.id === selectedInstrumentId);
      if (selected) {
        const refined = refineInstrument(selected, selected.id);
        onApplyRefinement(channelIndex, refined);
      }
    }
    onOpenChange(false);
  }

  const availableIcons: Array<DetectedInstrument["icon"]> = [
    "mic",
    "drums",
    "bass",
    "guitar",
    "piano",
    "synth",
    "percussion",
    "horn",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-zinc-950 border border-zinc-800 text-zinc-100 p-6 shadow-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300">
              CH 0{channelIndex + 1}
            </span>
            <DialogTitle className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
              Refinar Nomenclatura & Identificação de Instrumento
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-zinc-400">
            Ajuste com precisão cirúrgica a identificação do timbre e nomenclatura musical para este canal de áudio.
          </DialogDescription>
        </DialogHeader>

        {/* Current Track Banner */}
        <div className="flex items-center justify-between p-2.5 rounded bg-zinc-900/80 border border-zinc-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">Atualmente detectado:</span>
            <div className="flex items-center gap-1.5 font-semibold text-zinc-200">
              <InstrumentIcon icon={currentTrackIcon} className="w-3.5 h-3.5" />
              <span>{currentTrackName}</span>
            </div>
          </div>
          <span
            className="text-[10px] font-mono px-2 py-0.5 rounded border border-zinc-700 bg-zinc-800/80"
            style={{ color: currentTrackColor || "#38bdf8" }}
          >
            {currentConfidencePercent || "96% precisão"}
          </span>
        </div>

        {/* Search & Category Filter Tabs */}
        <div className="space-y-2 mt-1">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar instrumento por nome, timbre ou característica acústica..."
              className="pl-8 h-8 text-xs bg-zinc-900 border-zinc-800 focus:border-zinc-700"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "px-2.5 py-1 rounded text-xs whitespace-nowrap transition-colors border",
                  selectedCategory === cat.id
                    ? "bg-zinc-800 text-zinc-100 border-zinc-600 font-medium"
                    : "bg-zinc-900/60 text-zinc-400 border-zinc-800/80 hover:text-zinc-200 hover:bg-zinc-850",
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Instruments Grid */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[300px]">
          {filteredInstruments.map((inst) => {
            const isSelected = selectedInstrumentId === inst.id && !customName;
            return (
              <button
                key={inst.id}
                type="button"
                onClick={() => {
                  setSelectedInstrumentId(inst.id);
                  setCustomName("");
                }}
                className={cn(
                  "w-full text-left p-2.5 rounded-lg border transition-all flex items-start justify-between gap-3 group",
                  isSelected
                    ? "bg-zinc-900 border-zinc-600 ring-1 ring-zinc-500/50"
                    : "bg-zinc-900/40 border-zinc-800/80 hover:bg-zinc-900/90 hover:border-zinc-700",
                )}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div
                    className="p-1.5 rounded bg-zinc-800/80 border border-zinc-700/60 shrink-0 mt-0.5"
                    style={{ color: inst.color }}
                  >
                    <InstrumentIcon icon={inst.icon} className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-zinc-100 truncate">
                        {inst.name}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {inst.frequencyRange}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-tight">
                      {inst.description}
                    </p>
                    {inst.timbreCharacteristics && (
                      <p className="text-[10px] text-zinc-500 italic">
                        {inst.timbreCharacteristics}
                      </p>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5">
                  <span
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-zinc-800 bg-zinc-950/80"
                    style={{ color: inst.color }}
                  >
                    {inst.categoryLabel}
                  </span>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}

          {filteredInstruments.length === 0 && (
            <div className="text-center py-8 text-zinc-500 text-xs">
              Nenhum instrumento encontrado com o filtro "{searchQuery}".
            </div>
          )}
        </div>

        {/* Custom Instrument Name Option */}
        <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-zinc-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Ou especifique um instrumento personalizado:
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Input
              value={customName}
              onChange={(e) => {
                setCustomName(e.target.value);
                if (e.target.value) setSelectedInstrumentId("");
              }}
              placeholder="Ex: Cavaquinho, Sanfona, Flauta Doce, Guitarra Solo..."
              className="h-8 text-xs bg-zinc-950 border-zinc-800"
            />
            {/* Quick Icon Selector */}
            <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 p-0.5 rounded">
              {availableIcons.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setCustomIcon(icon)}
                  className={cn(
                    "p-1 rounded transition-colors",
                    customIcon === icon
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-300",
                  )}
                  title={`Ícone ${icon}`}
                >
                  <InstrumentIcon icon={icon} className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between pt-2 border-t border-zinc-800">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs text-zinc-400 hover:text-zinc-200"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedInstrumentId && !customName.trim()}
            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
          >
            Confirmar Refinamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
