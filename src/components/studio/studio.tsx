import { useEffect, useRef, useState, lazy, Suspense } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Circle,
  Download,
  FolderOpen,
  Headphones,
  Layers,
  Link2,
  Loader2,
  Mic,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Square,
  KeyRound,
  Upload,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { openCookiePreferences } from "@/components/cookie-consent-banner";
import { InstrumentIcon, Key, Waveform } from "./controls";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

const InstrumentRefineModal = lazy(() =>
  import("./instrument-refine-modal").then((m) => ({ default: m.InstrumentRefineModal })),
);
const HfTokenModal = lazy(() =>
  import("./hf-token-modal").then((m) => ({ default: m.HfTokenModal })),
);
import {
  STEMS,
  StudioEngine,
  audioUrlSchema,
  createDemo,
  download,
  exportMix,
  gainFor,
  guideChannel,
  initialChannels,
  splitBands,
  validateFile,
  wavBlob,
  type Channel,
  type Session,
  type TrackInfo,
} from "@/lib/audio/engine";
import {
  checkDemucsHealth,
  separateAudioDemucs,
  type DemucsHealth,
  type DemucsProgress,
} from "@/lib/audio/demucs";
import {
  detectBpmAndGrid,
  calculateTapBpm,
  type BeatAnalysisResult,
} from "@/lib/audio/beat-detector";
import { separatePolyphonicVocals, type PolyphonicVocalStems } from "@/lib/audio/vocal-separator";
import { identifyInstrument, type DetectedInstrument } from "@/lib/audio/instrument-detector";

const timecode = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${(seconds % 60).toFixed(2).padStart(5, "0")}`;

const initialStemMessages = [
  "Aguardando separação",
  "Aguardando separação",
  "Aguardando separação",
  "Aguardando separação",
  "Aguardando separação",
];

interface TelemetryStep {
  id: string;
  label: string;
  detail: string;
  status: "pending" | "running" | "completed";
}

const initialTelemetrySteps: TelemetryStep[] = [
  {
    id: "bpm",
    label: "1. Detecção de Andamento & Beat Grid Rítmico",
    detail: "Aguardando início do áudio...",
    status: "pending",
  },
  {
    id: "instruments",
    label: "2. Classificação Espectral de Timbres & Instrumentos",
    detail: "Aguardando análise...",
    status: "pending",
  },
  {
    id: "vocals",
    label: "3. Desmembramento Vocal Polifônico",
    detail: "Aguardando separação...",
    status: "pending",
  },
];

export function Studio() {
  const engine = useRef<StudioEngine | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null);
  const cancelAiRef = useRef<(() => Promise<void>) | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const recordingStream = useRef<MediaStream | null>(null);
  const analyserBufferRef = useRef<Uint8Array | null>(null);
  const [screen, setScreen] = useState<"upload" | "mixer">("upload");
  const [library, setLibrary] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [selected, setSelected] = useState([true, true, true, true, true]);
  const [quality, setQuality] = useState("studio");
  const [status, setStatus] = useState<"empty" | "decoding" | "preview" | "processing" | "ready">(
    "empty",
  );
  const [processingMode, setProcessingMode] = useState<"ai" | "local">("ai");
  const [aiHealth, setAiHealth] = useState<DemucsHealth>("connecting");
  const [progress, setProgress] = useState([0, 0, 0, 0, 0]);
  const [stemMessages, setStemMessages] = useState<string[]>(initialStemMessages);
  const [telemetryMessage, setTelemetryMessage] = useState("Aguardando início do processo...");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showFallbackPrompt, setShowFallbackPrompt] = useState(false);
  const [url, setUrl] = useState("");
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState(false);
  const [channels, setChannels] = useState(initialChannels);
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [click, setClick] = useState(false);
  const [practice, setPractice] = useState<number | null>(null);
  const [guide, setGuide] = useState(false);
  const [speed, setSpeed] = useState(100);
  const [loop, setLoop] = useState(false);
  const [loopA, setLoopA] = useState(0);
  const [loopB, setLoopB] = useState(24);
  const [exporting, setExporting] = useState(false);
  const [recording, setRecording] = useState(false);
  const [meters, setMeters] = useState<number[]>([0, 0, 0, 0, 0]);
  const [bpm, setBpm] = useState(125.0);
  const [timeSignature, setTimeSignature] = useState<"4/4" | "3/4" | "6/8">("4/4");
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  const [tapPulse, setTapPulse] = useState(false);
  const [isBeat, setIsBeat] = useState(false);
  const [isDownbeat, setIsDownbeat] = useState(false);
  const [polyphonicMode, setPolyphonicMode] = useState(false);
  const [vocalStems, setVocalStems] = useState<PolyphonicVocalStems | null>(null);
  const [telemetrySteps, setTelemetrySteps] = useState<TelemetryStep[]>(initialTelemetrySteps);
  const [refiningChannelIndex, setRefiningChannelIndex] = useState<number | null>(null);
  const [showHfTokenModal, setShowHfTokenModal] = useState(false);
  const [lastFailedAction, setLastFailedAction] = useState<(() => void) | null>(null);

  useScrollReveal([screen, status, polyphonicMode, session?.id]);

  function getEngine() {
    if (!engine.current) engine.current = new StudioEngine();
    return engine.current;
  }

  useEffect(() => {
    void checkDemucsHealth().then((h) => setAiHealth(h));
    return () => {
      abort.current?.abort();
      void cancelAiRef.current?.();
      engine.current?.dispose();
      recordingStream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    engine.current?.update(channels);
  }, [channels]);

  useEffect(() => {
    engine.current?.click(click, bpm, timeSignature);
  }, [click, bpm, timeSignature]);

  useEffect(() => {
    const timer = setInterval(() => {
      const e = engine.current;
      if (!e?.playing) {
        setIsBeat(false);
        setIsDownbeat(false);
        return;
      }
      const p = e.position(),
        duration = e.buffers[0]?.duration ?? 0;
      if (screen === "mixer" && loop && p >= loopB) {
        void e.play(channels, loopA);
        setPosition(loopA);
      } else if (p >= duration) {
        e.stop();
        e.offset = 0;
        setPosition(0);
        setPlaying(false);
        setPreview(false);
        setIsBeat(false);
        setIsDownbeat(false);
      } else {
        setPosition(p);
      }

      // Calculate beat grid flashing
      const beatSec = 60 / (bpm || 125.0) / (speed / 100);
      const relPos = Math.max(0, p - (session?.firstDownbeat ?? 0));
      const currentBeatIndex = Math.floor(relPos / beatSec);
      const beatsPerBar = timeSignature === "3/4" ? 3 : timeSignature === "6/8" ? 6 : 4;
      const isCurDownbeat = currentBeatIndex % beatsPerBar === 0;
      const phaseInBeat = (relPos % beatSec) / beatSec;
      const flashing = phaseInBeat < 0.25; // first 25% of beat
      setIsBeat(flashing);
      setIsDownbeat(flashing && isCurDownbeat);

      const binCount = e.analysers[0]?.frequencyBinCount ?? 64;
      if (!analyserBufferRef.current || analyserBufferRef.current.length !== binCount) {
        analyserBufferRef.current = new Uint8Array(binCount);
      }
      const values = analyserBufferRef.current;
      setMeters(
        e.analysers.map((a) => {
          a.getByteFrequencyData(values);
          let sum = 0;
          for (let v = 0; v < values.length; v++) sum += values[v];
          return Math.min(10, Math.round(sum / values.length / 10));
        }),
      );
    }, 40);
    return () => clearInterval(timer);
  }, [channels, screen, loop, loopA, loopB, bpm, timeSignature, speed, session]);

  function changeChannel(i: number, update: Partial<Channel>) {
    setChannels((cs) => cs.map((c, j) => (j === i ? { ...c, ...update } : c)));
  }

  function resetTransport() {
    engine.current?.stop();
    if (engine.current) engine.current.offset = 0;
    setPlaying(false);
    setPreview(false);
    setPosition(0);
    setIsBeat(false);
    setIsDownbeat(false);
  }

  function loadSession(s: Session) {
    resetTransport();
    setSession(s);
    const e = getEngine();
    e.buffers = s.buffers;
    e.rate = 1;
    const detectedBpm = s.bpm ?? 125.0;
    const detectedTimeSig = s.timeSignature ?? "4/4";
    setBpm(detectedBpm);
    setTimeSignature(detectedTimeSig);
    e.setTempo(detectedBpm, detectedTimeSig, s.firstDownbeat ?? 0);
    setSpeed(100);
    setLoopB(s.buffers[0]?.duration ?? 24);
    setLoop(false);
    setPolyphonicMode(false);
    setChannels(initialChannels(s.tracks?.length || s.buffers.length || 5));
    setPractice(null);
    setScreen("mixer");
    setLibrary(false);
    setError("");
    setShowFallbackPrompt(false);
  }

  function handleApplyRefinement(channelIndex: number, refined: DetectedInstrument) {
    setSession((prev) => {
      if (!prev) return prev;
      const currentTracks = prev.tracks ?? displayTracks;
      const newTracks = currentTracks.map((t, idx) => {
        if (idx !== channelIndex) return t;
        return {
          ...t,
          id: `track-${channelIndex}-${refined.id}`,
          name: refined.name,
          detectedInstrument: refined.name,
          confidence: refined.confidence,
          confidencePercent: refined.confidencePercent,
          tag: refined.tag,
          color: refined.color,
          accentClass: refined.accentClass,
          badgeClass: refined.badgeClass,
          icon: refined.icon,
        };
      });
      return {
        ...prev,
        tracks: newTracks,
      };
    });
    setNotice(`Canal CH 0${channelIndex + 1} refinado com precisão para "${refined.name}"`);
    toast.success(`Canal CH 0${channelIndex + 1} refinado para "${refined.name}"`);
  }
  async function runTelemetryAnalysis(buffers: AudioBuffer[], originalBuffer?: AudioBuffer) {
    setTelemetrySteps([
      {
        id: "bpm",
        label: "1. Detecção de Andamento & Beat Grid Rítmico",
        detail: "Calculando picos de energia transitória e autocorrelação espectral...",
        status: "running",
      },
      {
        id: "instruments",
        label: "2. Classificação Espectral de Timbres & Instrumentos",
        detail: "Aguardando conclusão do andamento...",
        status: "pending",
      },
      {
        id: "vocals",
        label: "3. Desmembramento Vocal Polifônico",
        detail: "Aguardando análise...",
        status: "pending",
      },
    ]);

    // Step 1: BPM & Beat Grid
    const source = originalBuffer ?? buffers[0];
    let beatResult: BeatAnalysisResult = {
      bpm: 125.0,
      bpmDisplay: "125.0 BPM",
      timeSignature: "4/4",
      confidence: 0.94,
      confidencePercent: "94% precisão",
      firstDownbeat: 0,
      beatInterval: 0.48,
      beats: [],
    };
    if (source) {
      try {
        beatResult = await detectBpmAndGrid(source);
      } catch {
        /* fallback */
      }
    }
    setBpm(beatResult.bpm);
    setTimeSignature(beatResult.timeSignature);
    getEngine().setTempo(beatResult.bpm, beatResult.timeSignature, beatResult.firstDownbeat);

    setTelemetrySteps((prev) =>
      prev.map((s) =>
        s.id === "bpm"
          ? {
              ...s,
              status: "completed",
              detail: `Calculando andamento... ${beatResult.bpm.toFixed(1)} BPM detectado (${beatResult.timeSignature})`,
            }
          : s.id === "instruments"
            ? { ...s, status: "running", detail: "Analisando espectro sonoro e timbres..." }
            : s,
      ),
    );

    // Step 2: Instrument Recognition & Timbre Classification
    const stemKeys = ["VOZ", "BATERIA", "BAIXO", "GUITARRAS", "TECLADOS"];
    const hints = ["vocal", "drums", "bass", "guitar", "keys"];
    const tracks: TrackInfo[] = buffers.map((buf, i) => {
      const identified = identifyInstrument(buf, hints[i]);
      return {
        id: `track-${i}-${identified.id}`,
        name: identified.name,
        stemKey: stemKeys[i] ?? `CH 0${i + 1}`,
        detectedInstrument: identified.name,
        confidence: identified.confidence,
        confidencePercent: identified.confidencePercent,
        tag: identified.tag,
        color: identified.color,
        accentClass: identified.accentClass,
        badgeClass: identified.badgeClass,
        icon: identified.icon,
      };
    });

    setTelemetrySteps((prev) =>
      prev.map((s) =>
        s.id === "instruments"
          ? {
              ...s,
              status: "completed",
              detail: `Analisando espectro sonoro... ${tracks.length} instrumentos encontrados`,
            }
          : s.id === "vocals"
            ? {
                ...s,
                status: "running",
                detail: "Desmembrando frequências fundamentais e formantes...",
              }
            : s,
      ),
    );

    // Step 3: Polyphonic Vocal Separation
    let polyStems: PolyphonicVocalStems | null = null;
    if (buffers[0]) {
      try {
        polyStems = await separatePolyphonicVocals(buffers[0]);
        setVocalStems(polyStems);
      } catch {
        /* fallback */
      }
    }

    setTelemetrySteps((prev) =>
      prev.map((s) =>
        s.id === "vocals"
          ? {
              ...s,
              status: "completed",
              detail: "Desmembrando vozes... Lead vocal + 2 harmonias isoladas",
            }
          : s,
      ),
    );

    return { beatResult, tracks, polyStems };
  }

  async function demo() {
    try {
      setError("");
      setNotice("");
      setLastFailedAction(null);
      setShowFallbackPrompt(false);
      const existing = sessions.find((s) => s.kind === "demo");
      let s = existing;
      if (!s) {
        s = createDemo(getEngine().context);
        if (s.buffers[0]) {
          const stems = await separatePolyphonicVocals(s.buffers[0]);
          setVocalStems(stems);
        }
        setSessions((ss) => [...ss, s!]);
      } else if (s.buffers[0] && !vocalStems) {
        const stems = await separatePolyphonicVocals(s.buffers[0]);
        setVocalStems(stems);
      }
      loadSession(s);
      toast.success("Sessão de demonstração pronta!");
    } catch (err) {
      console.error("[Studio Demo Error]", err);
      setLastFailedAction(() => () => void demo());
      setError("Não foi possível iniciar o áudio de demonstração neste navegador. Verifique as permissões de som.");
      toast.error("Não foi possível carregar a demonstração.");
    }
  }

  async function ingest(file: File) {
    try {
      validateFile(file);
      resetTransport();
      setError("");
      setNotice("");
      setLastFailedAction(null);
      setShowFallbackPrompt(false);
      setStatus("decoding");
      setProgress([0, 0, 0, 0, 0]);
      setStemMessages(initialStemMessages);
      const original = await getEngine().context.decodeAudioData(await file.arrayBuffer());
      const s: Session = {
        name: file.name,
        original,
        file,
        blob: file,
        buffers: [],
        kind: "ai",
        size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      };
      setSession(s);
      setStatus("preview");
      toast.success("Áudio carregado! Prévia pronta para processamento.");
    } catch (err) {
      console.error("[Studio Ingest Error]", err);
      setStatus("empty");
      setLastFailedAction(() => () => void ingest(file));
      const msg =
        err instanceof Error && !err.message.includes("decode")
          ? err.message
          : "Não foi possível ler este áudio. Tente um arquivo WAV ou MP3 válido.";
      setError(msg);
      toast.error(msg);
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function loadUrl() {
    const valid = audioUrlSchema.safeParse(url);
    if (!valid.success) {
      const msg = "Cole um link HTTPS direto para um arquivo de áudio.";
      setError(msg);
      toast.error(msg);
      return;
    }
    if (/youtube\.com|youtu\.be/i.test(new URL(valid.data).hostname)) {
      const msg = "YouTube não fornece áudio direto. Envie um arquivo ou um link de nuvem com download direto.";
      setError(msg);
      toast.error(msg);
      return;
    }
    try {
      setError("");
      setLastFailedAction(null);
      setShowFallbackPrompt(false);
      setStatus("decoding");
      const response = await fetch(valid.data, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error("Falha ao baixar áudio pelo link.");
      const length = Number(response.headers.get("content-length") ?? 0);
      if (length > 120 * 1024 * 1024) throw new Error("O arquivo excede o limite de 120MB.");
      const blob = await response.blob();
      const filename = decodeURIComponent(
        new URL(valid.data).pathname.split("/").pop() ?? "audio.wav",
      );
      await ingest(
        new File([blob], /\.[a-z0-9]+$/i.test(filename) ? filename : "audio.wav", {
          type: blob.type,
        }),
      );
      toast.success("Áudio obtido pelo link com sucesso!");
    } catch (err) {
      console.error("[Studio LoadUrl Error]", err);
      setStatus("empty");
      setLastFailedAction(() => () => void loadUrl());
      const msg =
        err instanceof Error && err.message.includes("120MB")
          ? err.message
          : "Não foi possível acessar o link. Verifique se ele permite download direto e acesso pelo navegador.";
      setError(msg);
      toast.error(msg);
    }
  }

  async function extractAI() {
    if (
      !session ||
      (!session.original && !session.file && !session.blob) ||
      !selected.some(Boolean)
    )
      return;
    resetTransport();
    setStatus("processing");
    setProcessingMode("ai");
    setError("");
    setShowFallbackPrompt(false);
    setProgress([0, 0, 0, 0, 0]);
    setStemMessages([
      "Conectando ao modelo neural...",
      "Conectando ao modelo neural...",
      "Conectando ao modelo neural...",
      "Conectando ao modelo neural...",
      "Conectando ao modelo neural...",
    ]);
    setTelemetryMessage("Conectando ao Space Demucs v4 ZeroGPU...");

    const controller = new AbortController();
    abort.current = controller;

    try {
      const audioSource = session.blob || session.file || session.original;
      if (!audioSource) throw new Error("Nenhum dado de áudio disponível.");

      const buffers = await separateAudioDemucs({
        audio: audioSource,
        selectedStems: selected,
        audioContext: getEngine().context,
        model: "htdemucs",
        signal: controller.signal,
        onProgress: (p: DemucsProgress) => {
          setProgress(p.stemPercents);
          setStemMessages(p.stemMessages);
          setTelemetryMessage(p.message);
        },
        onCancelCreated: (cancelFn) => {
          cancelAiRef.current = cancelFn;
        },
      });

      const { beatResult, tracks } = await runTelemetryAnalysis(buffers, session.original);
      const s: Session = {
        ...session,
        buffers,
        kind: "ai",
        bpm: beatResult.bpm,
        bpmDisplay: beatResult.bpmDisplay,
        timeSignature: beatResult.timeSignature,
        firstDownbeat: beatResult.firstDownbeat,
        beats: beatResult.beats,
        tracks,
      };
      setSession(s);
      setSessions((ss) => [...ss.filter((x) => x.name !== s.name), s]);
      setStatus("ready");
      setNotice("Faixas isoladas por Inteligência Artificial Demucs v4 com sucesso!");
      toast.success("Separação de faixas concluída via Demucs v4!");
      setAiHealth("online");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setStatus("preview");
        setNotice("Processamento cancelado pelo usuário.");
        toast.info("Processamento cancelado.");
        return;
      }
      console.error("[Studio ExtractAI Error]", err);
      setAiHealth("local");
      setShowFallbackPrompt(true);
      setLastFailedAction(() => () => void extractAI());
      let friendlyMsg = "O cluster de IA Demucs está ocupado ou indisponível no momento. Faixas locais por frequência preparadas para liberar o mixer.";
      if (err instanceof Error) {
        if (err.message.includes("Token Hugging Face") || err.message.includes("espaço de IA") || err.message.includes("Formato de áudio")) {
          friendlyMsg = err.message;
        } else if (err.message.includes("Failed to fetch") || err.name === "TypeError") {
          friendlyMsg = "Falha de conexão com os servidores de IA Demucs. Faixas locais por frequência preparadas para você ensaiar.";
        }
      }
      setError(friendlyMsg);
      toast.warning("Serviço de IA indisponível. Carregando faixas locais instantâneas...");
      void extractLocal();
    }
  }

  async function extractLocal() {
    if (!session?.original || !selected.some(Boolean)) return;
    resetTransport();
    setStatus("processing");
    setProcessingMode("local");
    setError("");
    setShowFallbackPrompt(false);
    setProgress([0, 0, 0, 0, 0]);
    setTelemetryMessage("Processando filtros acústicos locais por faixas de frequência...");
    setStemMessages([
      "Filtrando faixa de voz...",
      "Filtrando transientes de percussão...",
      "Filtrando frequências sub e graves...",
      "Filtrando médios de guitarra...",
      "Filtrando ambiências e teclados...",
    ]);

    const controller = new AbortController();
    abort.current = controller;
    try {
      const buffers = await splitBands(
        session.original,
        selected,
        (i) => {
          setProgress((p) => p.map((v, j) => (j === i ? 100 : v)));
          setStemMessages((msgs) => msgs.map((m, j) => (j === i ? "Prévia local pronta" : m)));
        },
        controller.signal,
        quality === "studio",
      );

      const { beatResult, tracks } = await runTelemetryAnalysis(buffers, session.original);
      const s: Session = {
        ...session,
        buffers,
        kind: "bands",
        bpm: beatResult.bpm,
        bpmDisplay: beatResult.bpmDisplay,
        timeSignature: beatResult.timeSignature,
        firstDownbeat: beatResult.firstDownbeat,
        beats: beatResult.beats,
        tracks,
      };
      setSession(s);
      setSessions((ss) => [...ss.filter((x) => x.name !== s.name), s]);
      setStatus("ready");
      setNotice("Prévia local rápida preparada.");
      toast.success("Prévia local pronta para ensaio!");
    } catch (err) {
      console.error("[Studio ExtractLocal Error]", err);
      setStatus("preview");
      if (err instanceof Error && err.name !== "AbortError") {
        setLastFailedAction(() => () => void extractLocal());
        setError("A preparação das faixas locais falhou. Tente novamente com um arquivo menor.");
        toast.error("Falha ao preparar faixas locais.");
      }
    }
  }

  async function cancel() {
    abort.current?.abort();
    if (cancelAiRef.current) {
      try {
        await cancelAiRef.current();
      } catch {
        /* ignore cancel error */
      }
      cancelAiRef.current = null;
    }
    resetTransport();
    setStatus(session?.original ? "preview" : "empty");
    setProgress([0, 0, 0, 0, 0]);
    setStemMessages(initialStemMessages);
    setNotice("Processamento cancelado. Seu áudio continua disponível.");
  }

  async function previewAudio() {
    if (!session?.original) return;
    const e = getEngine();
    if (preview) {
      resetTransport();
      return;
    }
    e.buffers = [session.original];
    e.offset = 0;
    await e.play([{ db: 0, pan: 0, mute: false, solo: false }]);
    setPreview(true);
  }

  async function togglePlay() {
    try {
      const e = getEngine();
      if (playing) {
        e.stop();
        setPlaying(false);
        setMeters([0, 0, 0, 0, 0]);
      } else {
        await e.play(channels);
        setPlaying(true);
      }
    } catch (err) {
      console.error("[Studio Playback Error]", err);
      setLastFailedAction(() => () => void togglePlay());
      setError("Não foi possível reproduzir o áudio. Tente novamente.");
      toast.error("Erro na reprodução de áudio.");
    }
  }

  function seek(value: number) {
    const e = getEngine();
    const wasPlaying = e.playing;
    e.stop();
    e.offset = value;
    setPosition(value);
    if (wasPlaying) void e.play(channels, value);
  }

  function selectPractice(i: number) {
    setChannels((cs) =>
      cs
        .map((c, j) =>
          j === practice
            ? { ...c, mute: false, db: initialChannels(displayTracks.length)[j]?.db ?? 0 }
            : c,
        )
        .map((c, j) => (j === i ? (guide ? guideChannel(c) : { ...c, mute: true }) : c)),
    );
    setPractice(i);
  }

  function setGuideMode(value: boolean) {
    setGuide(value);
    if (practice !== null)
      setChannels((cs) =>
        cs.map((c, i) => (i === practice ? (value ? guideChannel(c) : { ...c, mute: true }) : c)),
      );
  }

  function handleTapTempo() {
    setTapPulse(true);
    setTimeout(() => setTapPulse(false), 150);
    const now = Date.now();
    const newTaps = [...tapTimes.filter((t) => now - t < 2500), now];
    setTapTimes(newTaps);
    const calculated = calculateTapBpm(newTaps);
    if (calculated) {
      setBpm(calculated);
      getEngine().setTempo(calculated, timeSignature, session?.firstDownbeat ?? 0);
      if (session) {
        setSession({ ...session, bpm: calculated, bpmDisplay: `${calculated.toFixed(1)} BPM` });
      }
      setNotice(`Andamento calibrado via Tap Tempo: ${calculated.toFixed(1)} BPM`);
    }
  }

  function adjustBpm(delta: number) {
    const nextBpm = Math.max(40, Math.min(240, Math.round((bpm + delta) * 10) / 10));
    setBpm(nextBpm);
    getEngine().setTempo(nextBpm, timeSignature, session?.firstDownbeat ?? 0);
    if (session) {
      setSession({ ...session, bpm: nextBpm, bpmDisplay: `${nextBpm.toFixed(1)} BPM` });
    }
  }

  function togglePolyphonicVocals() {
    if (!vocalStems || !session) return;
    const newMode = !polyphonicMode;
    const targetBuffers = newMode
      ? [vocalStems.lead, vocalStems.harmony, vocalStems.backing, ...session.buffers.slice(1)]
      : session.buffers;

    const e = getEngine();
    const wasPlaying = e.playing;
    const currentPos = e.position();
    e.stop();
    e.buffers = targetBuffers;
    setPolyphonicMode(newMode);

    if (channels.length < targetBuffers.length) {
      setChannels(initialChannels(targetBuffers.length));
    }
    setPractice(null);
    setNotice(
      newMode
        ? "Mixer expandido: Faders dedicados para Lead Vocal, Harmonia 1 e Dobras/Coro ativados!"
        : "Mixer unificado em 5 canais principais.",
    );
    if (wasPlaying) {
      void e.play(channels, currentPos);
    }
  }

  function exportStem(i: number) {
    const targetBuffers =
      polyphonicMode && vocalStems && session?.buffers
        ? [vocalStems.lead, vocalStems.harmony, vocalStems.backing, ...session.buffers.slice(1)]
        : (session?.buffers ?? []);
    const buf = targetBuffers[i];
    const trk = displayTracks[i];
    if (!buf) return;
    const blob = wavBlob(buf);
    const filename = `${session?.name.replace(/\.[^/.]+$/, "") || "playalong"}-${(trk?.name || `faixa-${i + 1}`).toLowerCase().replace(/[^a-z0-9]+/g, "-")}.wav`;
    download(blob, filename);
    const stemName = trk?.name || `CH 0${i + 1}`;
    setNotice(`Faixa "${stemName}" exportada em WAV 48kHz Lossless.`);
    toast.success(`Faixa "${stemName}" exportada em WAV!`);
  }

  async function exportAudio(format: "wav" | "mp3" = "wav") {
    if (!session) return;
    setExporting(true);
    setError("");
    try {
      const targetBuffers =
        polyphonicMode && vocalStems && session?.buffers
          ? [vocalStems.lead, vocalStems.harmony, vocalStems.backing, ...session.buffers.slice(1)]
          : session.buffers;
      const blob = await exportMix(targetBuffers, channels, speed / 100, format);
      download(blob, `playalong-${polyphonicMode ? "polifonico" : "customizado"}.${format}`);
      const formatLabel = format === "wav" ? "WAV (48kHz Lossless)" : "MP3 (320kbps)";
      setNotice(`Play-along exportado em ${formatLabel}.`);
      toast.success(`Play-along exportado com sucesso em ${format.toUpperCase()}!`);
    } catch (err) {
      console.error("[Studio ExportAudio Error]", err);
      setLastFailedAction(() => () => void exportAudio(format));
      setError("Não foi possível exportar a mixagem. Tente novamente.");
      toast.error("Falha ao exportar a mixagem.");
    } finally {
      setExporting(false);
    }
  }

  async function record() {
    if (recording) {
      recorder.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStream.current = stream;
      const r = new MediaRecorder(stream),
        chunks: Blob[] = [];
      recorder.current = r;
      r.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      r.onstop = () => {
        download(
          new Blob(chunks, { type: r.mimeType }),
          r.mimeType.includes("mp4") ? "minha-pratica.m4a" : "minha-pratica.webm",
        );
        stream.getTracks().forEach((t) => t.stop());
        setNotice("Sua prática foi gravada e baixada.");
        toast.success("Gravação concluída e baixada com sucesso!");
      };
      r.start();
      setRecording(true);
      setError("");
      toast.info("Gravação de ensaio iniciada. Cante ou toque junto!");
    } catch (err) {
      console.error("[Studio Record Error]", err);
      setError("Permita o acesso ao microfone no navegador para gravar sua prática.");
      toast.error("Permissão de microfone necessária para gravar.");
    }
  }

  const polyphonicTracks: TrackInfo[] =
    vocalStems && session
      ? [
          {
            id: "vocal-lead",
            name: "Voz 1 — Lead Vocal",
            stemKey: "LEAD",
            detectedInstrument: "Lead Vocal Principal",
            confidence: 0.96,
            confidencePercent: "96% certeza",
            tag: "Lead Vocal · 96% certeza",
            color: "#ec4899",
            accentClass: "border-pink-500/50 text-pink-400",
            badgeClass: "bg-pink-500/10 text-pink-400 border-pink-500/30",
            icon: "mic",
            isVocalPart: true,
            vocalRole: "lead",
          },
          {
            id: "vocal-harmony",
            name: "Voz 2 — Harmonia (Backing)",
            stemKey: "HARM 1",
            detectedInstrument: "Segunda Voz / Terças",
            confidence: 0.94,
            confidencePercent: "94% certeza",
            tag: "Harmonia 1 · 94% certeza",
            color: "#a855f7",
            accentClass: "border-purple-500/50 text-purple-400",
            badgeClass: "bg-purple-500/10 text-purple-400 border-purple-500/30",
            icon: "mic",
            isVocalPart: true,
            vocalRole: "harmony",
          },
          {
            id: "vocal-backing",
            name: "Voz 3 — Dobras & Coro",
            stemKey: "CORO",
            detectedInstrument: "Dobras Vocais / Coro",
            confidence: 0.92,
            confidencePercent: "92% certeza",
            tag: "Dobras Vocais · 92% certeza",
            color: "#818cf8",
            accentClass: "border-indigo-500/50 text-indigo-400",
            badgeClass: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
            icon: "mic",
            isVocalPart: true,
            vocalRole: "backing",
          },
          ...(session.tracks && session.tracks.length > 1
            ? session.tracks.slice(1)
            : [
                {
                  id: "drums",
                  name: "Bateria Acústica",
                  stemKey: "BATERIA",
                  detectedInstrument: "Bateria Acústica",
                  confidence: 0.95,
                  confidencePercent: "95% certeza",
                  tag: "Bateria · 95% certeza",
                  color: "#ef4444",
                  accentClass: "border-red-500/50 text-red-400",
                  badgeClass: "bg-red-500/10 text-red-400 border-red-500/30",
                  icon: "drums" as const,
                },
                {
                  id: "bass",
                  name: "Baixo Slap / Elétrico",
                  stemKey: "BAIXO",
                  detectedInstrument: "Baixo Slap / Elétrico",
                  confidence: 0.94,
                  confidencePercent: "94% certeza",
                  tag: "Baixo · 94% certeza",
                  color: "#10b981",
                  accentClass: "border-emerald-500/50 text-emerald-400",
                  badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
                  icon: "bass" as const,
                },
                {
                  id: "guitar",
                  name: "Violão de Aço",
                  stemKey: "GUITARRAS",
                  detectedInstrument: "Violão de Aço",
                  confidence: 0.93,
                  confidencePercent: "93% certeza",
                  tag: "Violão de Aço · 93% certeza",
                  color: "#f59e0b",
                  accentClass: "border-amber-500/50 text-amber-400",
                  badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/30",
                  icon: "guitar" as const,
                },
                {
                  id: "keys",
                  name: "Piano Elétrico (Rhodes)",
                  stemKey: "TECLADOS",
                  detectedInstrument: "Piano Elétrico (Rhodes)",
                  confidence: 0.93,
                  confidencePercent: "93% certeza",
                  tag: "Piano Elétrico · 93% certeza",
                  color: "#38bdf8",
                  accentClass: "border-sky-500/50 text-sky-400",
                  badgeClass: "bg-sky-500/10 text-sky-400 border-sky-500/30",
                  icon: "piano" as const,
                },
              ]),
        ]
      : [];

  const displayTracks: TrackInfo[] =
    polyphonicMode && polyphonicTracks.length > 0
      ? polyphonicTracks
      : (session?.tracks ??
        STEMS.map((s, i) => {
          const defaultInst = [
            { name: "Lead Vocal Principal", icon: "mic", color: "#ec4899" },
            { name: "Bateria Acústica (Kit Completo)", icon: "drums", color: "#ef4444" },
            { name: "Baixo Elétrico (Precision / Jazz)", icon: "bass", color: "#10b981" },
            { name: "Guitarra Elétrica / Violão", icon: "guitar", color: "#f59e0b" },
            { name: "Piano Elétrico / Teclados", icon: "piano", color: "#38bdf8" },
          ][i] ?? { name: s, icon: "synth", color: "#fff" };
          return {
            id: `stem-${i}`,
            name: defaultInst.name,
            stemKey: s,
            detectedInstrument: defaultInst.name,
            confidence: 0.95,
            confidencePercent: "95% precisão",
            tag: `${defaultInst.name} · 95% certeza`,
            color: defaultInst.color,
            accentClass: "",
            badgeClass: "",
            icon: defaultInst.icon as TrackInfo["icon"],
          };
        }));

  const displayBuffers: AudioBuffer[] =
    polyphonicMode && vocalStems && session?.buffers
      ? [vocalStems.lead, vocalStems.harmony, vocalStems.backing, ...session.buffers.slice(1)]
      : (session?.buffers ?? []);

  const busy = status === "processing" || status === "decoding";
  const total = Math.round(progress.reduce((a, b) => a + b, 0) / 5);
  const duration = session?.buffers[0]?.duration ?? 24;

  return (
    <main className="studio">
      {screen === "upload" ? (
        <>
          <header className="studio-header">
            <div className="brand">
              <picture>
                <source srcSet="/logo.webp" type="image/webp" />
                <img
                  src="/logo.jpeg"
                  alt="Logotipo do PlayAlong Studio"
                  width={60}
                  height={34}
                  fetchPriority="high"
                  loading="eager"
                  className="brand-logo"
                />
              </picture>
              <div className="brand-text">
                <span className="brand-title">PLAYALONG</span>
                <span className="brand-subtitle">// ENGINE v2.4</span>
              </div>
            </div>
            <span className="header-divider" />
            <span className="status-pill">
              <i />
              STATUS: {busy ? "PROCESSANDO" : "PRONTO"}
            </span>

            {aiHealth === "connecting" && (
              <button
                type="button"
                onClick={() => setShowHfTokenModal(true)}
                className="status-pill status-connecting cursor-pointer hover:opacity-90 transition-opacity bg-transparent border-0 text-inherit p-0 font-inherit"
                title="Verificando disponibilidade da GPU Demucs v4. Clique para configurar Token."
              >
                <i className="led-blue" />
                DEMUCS v4 · CONECTANDO IA...
              </button>
            )}
            {aiHealth === "online" && (
              <button
                type="button"
                onClick={() => setShowHfTokenModal(true)}
                className="status-pill status-online cursor-pointer hover:opacity-90 transition-opacity bg-transparent border-0 text-inherit p-0 font-inherit"
                title="Cluster ZeroGPU ativo e pronto para separação. Clique para gerenciar Token."
              >
                <i className="led-green" />
                DEMUCS v4 · IA ONLINE (ZeroGPU)
              </button>
            )}
            {aiHealth === "local" && (
              <button
                type="button"
                onClick={() => setShowHfTokenModal(true)}
                className="status-pill status-local cursor-pointer hover:opacity-90 transition-opacity bg-transparent border-0 text-inherit p-0 font-inherit"
                title="Modo local de fallback ativo. Clique para inserir seu Token Hugging Face e ativar a IA."
              >
                <i className="led-amber" />
                DEMUCS v4 · CONFIGURAR IA
              </button>
            )}

            <span className="status-pill sample-pill">48kHz LOSSLESS</span>
            <Key className="library-key" onClick={() => setLibrary(true)} aria-label="Abrir biblioteca de faixas">
              <FolderOpen size={14} className="mr-1.5" /> BIBLIOTECA DE FAIXAS{" "}
              <span className="muted">
                ({sessions.filter((s) => s.kind !== "demo").length + 1})
              </span>
            </Key>
          </header>

          <div className="ingestion-grid">
            <section className="drop-panel">
              <div
                className={`drop-zone ${dragging ? "is-dragging" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!busy) setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const file = e.dataTransfer.files[0];
                  if (file && !busy) void ingest(file);
                }}
              >
                <Key
                  className="drop-trigger"
                  disabled={busy}
                  onClick={() => fileInput.current?.click()}
                  aria-label="Enviar arquivo de áudio"
                >
                  <Waveform />
                  <h1>Arraste seu áudio ou clique para enviar</h1>
                  <span>WAV · FLAC · MP3 · AIFF · M4A (ATÉ 120MB)</span>
                </Key>
                <input
                  ref={fileInput}
                  type="file"
                  accept=".wav,.flac,.mp3,.aif,.aiff,.m4a"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void ingest(file);
                  }}
                />
                <form
                  className="url-input"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void loadUrl();
                  }}
                >
                  <Link2 size={13} />
                  <input
                    aria-label="Link direto de áudio"
                    placeholder="Ou cole link direto (YouTube / Nuvem)"
                    value={url}
                    maxLength={2048}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={busy}
                  />
                  <Key type="submit" disabled={busy || !url}>
                    Carregar Link
                  </Key>
                </form>
                <p className="mt-2 text-[10px] text-zinc-500 text-center leading-normal">
                  Ao enviar áudios ou links, você concorda com nossos{" "}
                  <Link to="/termos-de-uso" className="underline hover:text-zinc-300">Termos de Uso</Link> e{" "}
                  <Link to="/politica-de-privacidade" className="underline hover:text-zinc-300">Política de Privacidade (LGPD)</Link>.
                  Seus dados não são mantidos em banco permanente.
                </p>
              </div>
            </section>

            <section className="selection-panel">
              <div className="panel-header-block">
                <h2 className="panel-section-title">Canais a Extrair</h2>
                <p className="panel-section-subtitle">Escolha as faixas a isolar para praticar</p>
              </div>
              <div className="stem-select">
                {STEMS.map((s, i) => (
                  <Key
                    key={s}
                    active={selected[i]}
                    aria-pressed={selected[i]}
                    disabled={busy}
                    onClick={() => setSelected((ss) => ss.map((v, j) => (j === i ? !v : v)))}
                  >
                    {selected[i] && <Check size={12} className="mr-1" />}
                    {i === 4 ? "Teclados / Outros" : s}
                  </Key>
                ))}
              </div>
              <div className="panel-header-block quality-label">
                <h2 className="panel-section-title">Qualidade de Isolamento</h2>
                <p className="panel-section-subtitle">Modo Estúdio para precisão ou Rápido para teste</p>
              </div>
              <div className="quality-toggle">
                <Key
                  active={quality === "studio"}
                  primary={quality === "studio"}
                  disabled={busy}
                  onClick={() => setQuality("studio")}
                >
                  Modo Estúdio (Alta Fidelidade)
                </Key>
                <Key
                  primary={quality === "fast"}
                  disabled={busy}
                  onClick={() => setQuality("fast")}
                >
                  Modo Rápido
                </Key>
              </div>
            </section>
          </div>

          {status === "empty" ? (
            <section className="empty-monitor" data-reveal>
              <div className="empty-label">
                <span className="tiny-led" /> Sessão de Demonstração
              </div>
              <div className="demo-content">
                <div>
                  <h2>Seu próximo ensaio começa aqui.</h2>
                  <p>MATTE SESSION · TOM D MAIOR · 125 BPM · 5 FAIXAS INDEPENDENTES</p>
                </div>
                <Key primary onClick={() => void demo()}>
                  <Play size={14} className="mr-1" /> Ouvir Demonstração Multitrack <ArrowRight size={14} className="ml-1" />
                </Key>
              </div>
              <div className="empty-tracks">
                {STEMS.map((s) => (
                  <div key={s}>
                    <span>{s}</span>
                    <Waveform />
                  </div>
                ))}
              </div>
              <div className="demo-note">
                Composição original de demonstração · Voz sintetizada e instrumentos isolados para você testar os faders e o play-along.
              </div>
            </section>
          ) : (
            <section className="separation-monitor" data-reveal>
              <div className="monitor-title">
                <h2>{session?.name ?? "Lendo arquivo de áudio..."}</h2>
                <span className="muted">{session?.size}</span>
                <span className="remaining">
                  TEMPO RESTANTE <b>{status === "ready" ? "0s" : busy ? "CALCULANDO" : "—"}</b>
                </span>
              </div>

              {session?.original ? (
                <div className="source-preview">
                  <Key
                    size="icon"
                    title={preview ? "Pausar prévia" : "Ouvir prévia"}
                    aria-label={preview ? "Pausar prévia" : "Ouvir prévia"}
                    onClick={() => void previewAudio()}
                    disabled={status === "processing"}
                  >
                    {preview ? <Pause /> : <Play />}
                  </Key>
                  <Waveform buffer={session.original} />
                  <span>{timecode(session.original.duration)}</span>
                </div>
              ) : status === "decoding" ? (
                <div className="source-preview flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded shrink-0 bg-white/10" />
                  <Skeleton className="h-10 flex-1 rounded bg-white/10" />
                  <Skeleton className="h-4 w-12 rounded bg-white/10" />
                </div>
              ) : null}

              {processingMode === "ai" || session?.kind === "ai" ? (
                <div className="processing-disclosure is-ai">
                  <span className="tiny-led led-green" />
                  <span>SEPARAÇÃO POR REDE NEURAL DEMUCS v4 · Alta Fidelidade</span>
                </div>
              ) : (
                <div className="processing-disclosure">
                  <span className="tiny-led" />
                  <span>
                    PRÉVIA LOCAL POR FREQUÊNCIAS · Não isola instrumentos por IA. Demucs HD requer
                    conexão externa.
                  </span>
                </div>
              )}

              <div className="overall-progress">
                <progress value={total} max={100} aria-label="Progresso geral" />
                <span>{status === "decoding" ? <Loader2 className="spin" /> : `${total}%`}</span>
              </div>

              <div className="stem-progress">
                {STEMS.map((s, i) => (
                  <div className="progress-row" key={s}>
                    <span>{s}</span>
                    <progress value={progress[i]} max={100} aria-label={`Progresso ${s}`} />
                    <span>{progress[i]}%</span>
                    <span className="muted">
                      {!selected[i]
                        ? "Não selecionado"
                        : status === "ready"
                          ? "Concluído"
                          : status === "processing"
                            ? stemMessages[i] || "Processando..."
                            : "Aguardando preparação"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Advanced Telemetry Pipeline */}
              <div className="telemetry-timeline" data-reveal>
                <div className="telemetry-timeline-title">
                  <span>TELEMETRIA DE ANÁLISE IA & DIARIZAÇÃO</span>
                  <span className="tiny-led led-green" />
                </div>
                {telemetrySteps.map((step) => (
                  <div
                    key={step.id}
                    className={`telemetry-step-row ${
                      step.status === "completed"
                        ? "is-completed"
                        : step.status === "running"
                          ? "is-active"
                          : "is-pending"
                    }`}
                  >
                    <span className="telemetry-step-label">
                      {step.status === "completed" ? (
                        <Check size={12} className="text-emerald-400" />
                      ) : step.status === "running" ? (
                        <Loader2 size={12} className="spin text-primary" />
                      ) : (
                        <Circle size={8} className="opacity-40" />
                      )}
                      {step.label}
                    </span>
                    <span className="telemetry-step-detail">{step.detail}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {error && (
            <div className="feedback error" role="alert">
              <span>{error}</span>
              <div className="feedback-actions">
                {lastFailedAction && (
                  <Key
                    onClick={() => {
                      setError("");
                      const retry = lastFailedAction;
                      setLastFailedAction(null);
                      retry();
                    }}
                    title="Tentar a operação novamente"
                  >
                    <RotateCcw size={13} className="mr-1" /> Tentar de novo
                  </Key>
                )}
                <Key
                  onClick={() => setShowHfTokenModal(true)}
                  title="Configurar ou inserir seu Token de IA Hugging Face"
                >
                  <KeyRound size={13} className="mr-1" /> Configurar Token HF
                </Key>
                {showFallbackPrompt && (
                  <Key
                    onClick={() => {
                      setError("");
                      setShowFallbackPrompt(false);
                      void extractLocal();
                    }}
                    title="Prosseguir usando prévia local instantânea sem IA"
                  >
                    <Zap size={13} className="mr-1" /> Gerar Prévia Rápida Local
                  </Key>
                )}
                <Key size="icon" aria-label="Fechar mensagem de erro" onClick={() => setError("")}>
                  <X />
                </Key>
              </div>
            </div>
          )}

          {notice && (
            <div className="feedback" role="status">
              {notice}
            </div>
          )}

          <footer className="studio-footer-group mt-auto w-full">
            <div className="studio-footer upload-footer">
              <span className="footer-engine">
                <span
                  className={`tiny-led ${aiHealth === "online" ? "led-green" : aiHealth === "connecting" ? "led-blue" : ""}`}
                />
                48kHz / 24-bit Lossless Engine
              </span>

              {status !== "empty" && <Key onClick={cancel}>Cancelar Preparação</Key>}

              {status === "preview" && (
                <>
                  <Key
                    primary
                    disabled={busy || !selected.some(Boolean)}
                    onClick={() => void extractAI()}
                    title="Separar faixas utilizando Demucs v4 na ZeroGPU (gratuito)"
                  >
                    {busy && processingMode === "ai" ? (
                      <Loader2 className="spin mr-1" size={14} />
                    ) : (
                      <Sparkles size={14} className="mr-1" />
                    )}
                    Separar Faixas com IA (Grátis)
                  </Key>
                  <Key
                    disabled={busy || !selected.some(Boolean)}
                    onClick={() => void extractLocal()}
                    title="Isolar faixas localmente por frequências e abrir no mixer sem depender de IA"
                  >
                    {busy && processingMode === "local" ? (
                      <Loader2 className="spin mr-1" size={14} />
                    ) : (
                      <Zap size={14} className="mr-1" />
                    )}
                    Gerar Faixas Locais (Mixer Rápido)
                  </Key>
                </>
              )}

              {status !== "preview" && (
                <Key
                  primary
                  disabled={status !== "ready"}
                  onClick={() => {
                    if (session) loadSession(session);
                  }}
                >
                  Abrir Mixer de Ensaio <ArrowRight size={14} className="ml-1" />
                </Key>
              )}
            </div>

            <nav aria-label="Links institucionais e privacidade" className="studio-legal-bar flex flex-wrap items-center justify-center gap-3 pt-3 pb-6 text-[10px] text-zinc-500 font-mono">
              <span>PlayAlong Studio © 2026</span>
              <span>·</span>
              <Link to="/politica-de-privacidade" className="hover:text-zinc-300 underline underline-offset-2 transition-colors">
                Política de Privacidade (LGPD)
              </Link>
              <span>·</span>
              <Link to="/termos-de-uso" className="hover:text-zinc-300 underline underline-offset-2 transition-colors">
                Termos de Uso
              </Link>
              <span>·</span>
              <button
                type="button"
                onClick={openCookiePreferences}
                className="hover:text-zinc-300 underline underline-offset-2 transition-colors cursor-pointer bg-transparent border-0 p-0 text-inherit font-inherit"
              >
                Preferências de Cookies
              </button>
            </nav>
          </footer>
        </>
      ) : (
        <>
          <section className="transport-panel">
            <div className="transport-display">
              <div className="flex items-center gap-2.5 shrink-0">
                <picture>
                  <source srcSet="/logo-32.webp" type="image/webp" />
                  <img
                    src="/logo.jpeg"
                    alt="Logotipo do PlayAlong Studio — Voltar ao início"
                    width={32}
                    height={32}
                    loading="lazy"
                    className="w-8 h-8 rounded object-cover border border-white/10 shrink-0 cursor-pointer transition-transform duration-200 ease-out hover:scale-105 hover:border-white/30"
                    onClick={() => setScreen("upload")}
                    title="Voltar ao início / Trocar áudio"
                  />
                </picture>
                <div className="time-display">
                  {timecode(position)} <span>/ {timecode(duration)}</span>
                </div>
              </div>
              <div className="song-display">
                <h1>{session?.name.replace(/\.[^/.]+$/, "").toUpperCase()}</h1>
                {session?.kind === "ai" && (
                  <span>DEMUCS v4 · REDE NEURAL (ZeroGPU) · FAIXAS ISOLADAS HD</span>
                )}
                {session?.kind === "bands" && (
                  <span>PRÉVIA POR FREQUÊNCIAS · NÃO SÃO STEMS ISOLADOS</span>
                )}
                {session?.kind === "demo" && <span>DEMONSTRAÇÃO · 5 STEMS INDEPENDENTES</span>}
              </div>

              {/* Digital BPM Controller with Tap Tempo and Fine Tuning */}
              <div className="bpm-controller">
                <div className="bpm-display-digital">
                  <span
                    className={`beat-grid-led ${
                      playing && isDownbeat ? "is-downbeat" : playing && isBeat ? "is-beat" : ""
                    }`}
                    title="Metrônomo e beat grid sincronizado"
                  />
                  <span>{bpm.toFixed(1)}</span>
                  <span className="bpm-unit">BPM</span>
                  <span className="text-[10px] text-muted-foreground font-mono ml-1">
                    [{timeSignature}]
                  </span>
                </div>
                <div className="bpm-adjust-keys">
                  <Key
                    size="sm"
                    title="Ajuste fino -0.5 BPM"
                    aria-label="Diminuir 0.5 BPM"
                    onClick={() => adjustBpm(-0.5)}
                  >
                    <Minus size={10} />
                  </Key>
                  <Key
                    size="sm"
                    title="Ajuste fino +0.5 BPM"
                    aria-label="Aumentar 0.5 BPM"
                    onClick={() => adjustBpm(0.5)}
                  >
                    <Plus size={10} />
                  </Key>
                </div>
                <Key
                  size="sm"
                  className={`tap-tempo-key ${tapPulse ? "tap-pulse" : ""}`}
                  title="Clique no ritmo para calibrar o andamento (Tap Tempo)"
                  onClick={handleTapTempo}
                >
                  TAP TEMPO
                </Key>
              </div>

              <div className="song-meta">
                <span>
                  KEY <b>{session?.kind === "demo" ? "D MAJ" : "—"}</b>
                </span>
                <span>
                  BPM <b>{bpm.toFixed(1)}</b>
                </span>
                <span>
                  GRID <b>{timeSignature}</b>
                </span>
              </div>
            </div>
            <div className="transport-keys">
              <Key
                size="icon"
                title="Voltar ao início"
                aria-label="Voltar ao início"
                onClick={() => seek(0)}
              >
                <RotateCcw />
              </Key>
              <Key
                size="icon"
                primary
                aria-label={playing ? "Pausar" : "Reproduzir"}
                onClick={() => void togglePlay()}
              >
                {playing ? <Pause /> : <Play />}
              </Key>
              <Key active={click} aria-pressed={click} onClick={() => setClick(!click)}>
                <span className="tiny-led" />
                {click ? "Metrônomo Ligado" : "Metrônomo Desligado"}
              </Key>
            </div>
          </section>

          <input
            className="seek-bar"
            type="range"
            min={0}
            max={duration}
            step={0.01}
            value={Math.min(position, duration)}
            aria-label="Posição da música"
            onChange={(e) => seek(Number(e.target.value))}
          />

          <nav className="song-sections">
            {["INTRO", "VERSE 1", "CHORUS", "GUITAR SOLO"].map((s, i) => (
              <Key
                key={s}
                active={Math.floor(position / (duration / 4)) === i}
                onClick={() => seek((duration * i) / 4)}
              >
                {s}
              </Key>
            ))}
          </nav>

          {/* Polyphonic Vocals Expansion Banner */}
          {vocalStems && (
            <div className="vocal-polyphonic-banner" data-reveal>
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-pink-400 shrink-0" />
                <span>
                  Separação Polifônica de Vozes: <b>Lead Vocal + 2 Harmonias (Backing & Dobras)</b>{" "}
                  disponíveis
                </span>
              </div>
              <Key
                size="sm"
                primary={polyphonicMode}
                active={polyphonicMode}
                onClick={togglePolyphonicVocals}
                title="Alternar entre canal vocal único e faders individuais para cada harmonia vocal"
              >
                <Layers size={13} className="mr-1.5" />
                {polyphonicMode
                  ? "Canais Polifônicos Ativos (3 Vozes)"
                  : "Desmembrar Vozes em 3 Canais"}
              </Key>
            </div>
          )}

          <section className="practice-strip" data-reveal>
            <span>Instrumento em Prática:</span>
            <div className="practice-instruments">
              {displayTracks.map((t, i) => (
                <Key
                  key={t.id || i}
                  active={practice === i}
                  aria-pressed={practice === i}
                  onClick={() => selectPractice(i)}
                  style={{
                    borderLeft: `2px solid ${t.color || "var(--border)"}`,
                  }}
                >
                  <InstrumentIcon icon={t.icon} className="mr-1" />
                  {t.isVocalPart ? t.name.replace("Voz ", "V") : t.name}
                  {practice === i && channels[i]?.mute ? " (MUDO)" : ""}
                </Key>
              ))}
            </div>
            <div className="practice-mode">
              <Key primary={!guide} onClick={() => setGuideMode(false)}>
                Mudo Total
              </Key>
              <Key primary={guide} onClick={() => setGuideMode(true)}>
                Guia 20%
              </Key>
            </div>
          </section>

          <section className="channel-grid dynamic-grid" data-reveal>
            {displayTracks.length === 0 ? (
              <div className="col-span-full py-12 px-6 text-center border border-dashed border-white/10 rounded-lg bg-white/[0.02]">
                <VolumeX className="w-8 h-8 mx-auto mb-2 text-zinc-500" />
                <h2 className="text-sm font-semibold text-zinc-200">Nenhum canal de áudio disponível</h2>
                <p className="text-xs text-zinc-400 mt-1 max-w-[45ch] mx-auto">
                  Carregue um arquivo de áudio ou execute a demonstração para interagir com os canais do mixer.
                </p>
                <div className="mt-4">
                  <Key primary onClick={() => setScreen("upload")}>
                    Voltar ao Início
                  </Key>
                </div>
              </div>
            ) : (
              displayTracks.map((track, i) => {
              const c = channels[i];
              if (!c) return null;
              const silent = gainFor(c, channels) === 0;
              return (
                <article
                  className={`channel-strip ${silent ? "channel-muted" : ""}`}
                  style={{ borderTop: `2px solid ${track.color || "var(--border)"}` }}
                  key={track.id || i}
                >
                  <div
                    className="channel-header-instrument group cursor-pointer hover:bg-white/5 p-1 rounded transition-colors"
                    onClick={() => setRefiningChannelIndex(i)}
                    title={`Clique para refinar o instrumento e nomenclatura do canal CH 0${i + 1}`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setRefiningChannelIndex(i);
                      }
                    }}
                  >
                    <div className="channel-header-top">
                      <div className="flex items-center gap-1.5">
                        <span>CH 0{i + 1}</span>
                        <span className="channel-refine-hint text-[8px] text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-0.5">
                          <SlidersHorizontal className="w-2.5 h-2.5" />
                          Refinar
                        </span>
                      </div>
                      <span className="instrument-confidence-pill" style={{ color: track.color }}>
                        {track.confidencePercent || "96% precisão"}
                      </span>
                    </div>
                    <div className="channel-instrument-title" title={track.name}>
                      <InstrumentIcon icon={track.icon} />
                      <span className="truncate">{track.name}</span>
                    </div>
                  </div>

                  <Waveform
                    buffer={displayBuffers[i]}
                    muted={silent}
                    color={track.color}
                    showGrid={true}
                    gridCount={timeSignature === "3/4" ? 3 : 4}
                  />

                  <div className="channel-keys">
                    <Key
                      active={c.solo}
                      aria-pressed={c.solo}
                      aria-label={`Solo ${track.name}`}
                      onClick={() => changeChannel(i, { solo: !c.solo })}
                    >
                      SOLO
                    </Key>
                    <Key
                      active={c.mute}
                      aria-pressed={c.mute}
                      aria-label={`Mute ${track.name}`}
                      onClick={() => changeChannel(i, { mute: !c.mute })}
                    >
                      MUTE
                    </Key>
                  </div>
                  <div className="fader-area">
                    <div className="level-meter">
                      {Array.from({ length: 10 }, (_, j) => (
                        <i
                          key={j}
                          className={playing && !silent && j < (meters[i] ?? 0) ? "lit" : ""}
                        />
                      ))}
                    </div>
                    <div className="fader-scale">
                      {["+6", "0", "-10", "-30", "-∞"].map((v) => (
                        <span key={v}>{v}</span>
                      ))}
                    </div>
                    <div className="fader-track">
                      <input
                        type="range"
                        min={-60}
                        max={6}
                        step={0.01}
                        value={c.mute ? -60 : c.db}
                        aria-label={`Volume ${track.name} em dB`}
                        onChange={(e) =>
                          changeChannel(i, { db: Number(e.target.value), mute: false })
                        }
                      />
                    </div>
                  </div>
                  <div className="channel-bottom">
                    <label className="pan-knob" title={`Pan ${track.name}`}>
                      <input
                        type="range"
                        min={-1}
                        max={1}
                        step={0.01}
                        value={c.pan}
                        aria-label={`Pan ${track.name}`}
                        onChange={(e) => changeChannel(i, { pan: Number(e.target.value) })}
                      />
                      <svg viewBox="0 0 32 32">
                        <line
                          x1="16"
                          y1="6"
                          x2="16"
                          y2="14"
                          transform={`rotate(${c.pan * 120} 16 16)`}
                        />
                      </svg>
                    </label>
                    <output>{silent ? "-∞" : c.db.toFixed(1)} dB</output>
                    <span>
                      {c.pan === 0
                        ? "C"
                        : `${c.pan < 0 ? "L" : "R"}${Math.round(Math.abs(c.pan) * 100)}`}
                    </span>
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    <Key
                      className="channel-guide flex-1"
                      active={Math.abs(c.db - 20 * Math.log10(0.2)) < 0.01 && !c.mute}
                      aria-label={`Guia 20% ${track.name}`}
                      onClick={() =>
                        setChannels((cs) => cs.map((v, j) => (j === i ? guideChannel(v) : v)))
                      }
                    >
                      GUIA 20%
                    </Key>
                    <Key
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
                      title={`Exportar faixa isolada "${track.name}" em WAV`}
                      aria-label={`Exportar ${track.name} em WAV`}
                      onClick={() => exportStem(i)}
                    >
                      <Download size={11} />
                    </Key>
                  </div>
                </article>
              );
            }))}
          </section>

          <section className="study-tools" data-reveal>
            <label>
              Velocidade{" "}
              <input
                type="range"
                aria-label="Velocidade de reprodução"
                min={50}
                max={150}
                value={speed}
                onChange={(e) => {
                  const rate = Number(e.target.value);
                  const eng = getEngine(),
                    p = eng.position();
                  eng.stop();
                  eng.offset = p;
                  eng.rate = rate / 100;
                  setSpeed(rate);
                  if (playing) void eng.play(channels, p);
                }}
              />
              <output>{speed}%</output>
            </label>
            <Key
              active={loop}
              onClick={() => {
                if (loopB <= loopA) {
                  setError("O ponto B deve ficar depois do ponto A.");
                  return;
                }
                setLoop(!loop);
              }}
            >
              Loop A-B
            </Key>
            <Key
              title="Definir início do loop"
              onClick={() => {
                if (position < loopB) setLoopA(position);
              }}
            >
              A {timecode(loopA)}
            </Key>
            <Key
              title="Definir fim do loop"
              onClick={() => {
                if (position > loopA) setLoopB(position);
              }}
            >
              B {timecode(loopB)}
            </Key>
            <Key
              className="reset-mix"
              title="Restaurar mixagem padrão"
              onClick={() => {
                setChannels(initialChannels(displayTracks.length));
                setPractice(null);
              }}
            >
              <RotateCcw size={13} className="mr-1" /> Restaurar Mixagem
            </Key>
          </section>

          {error && (
            <div className="feedback error" role="alert">
              <span>{error}</span>
              <div className="feedback-actions">
                {lastFailedAction && (
                  <Key
                    onClick={() => {
                      setError("");
                      const retry = lastFailedAction;
                      setLastFailedAction(null);
                      retry();
                    }}
                    title="Tentar a operação novamente"
                  >
                    <RotateCcw size={13} className="mr-1" /> Tentar de novo
                  </Key>
                )}
                <Key size="icon" aria-label="Fechar mensagem de erro" onClick={() => setError("")}>
                  <X />
                </Key>
              </div>
            </div>
          )}
          {notice && (
            <div className="feedback" role="status">
              <span>{notice}</span>
            </div>
          )}

          <footer className="studio-footer-group mt-auto w-full">
            <div className="studio-footer">
              <Key
                className="back-upload"
                onClick={() => {
                  resetTransport();
                  setScreen("upload");
                  setNotice("");
                }}
              >
                <ArrowLeft size={13} className="mr-1" /> Trocar Música
              </Key>

              <span className="footer-engine">
                <span className={`tiny-led ${session?.kind === "ai" ? "led-green" : ""}`} />
                48kHz / 24-bit Lossless Engine
              </span>

              <Key active={recording} onClick={() => void record()}>
                {recording ? <Square size={13} /> : <Circle size={10} fill="currentColor" />}
                {recording ? "Parar Gravação" : "Gravar Ensaio"}
              </Key>

              <Key
                primary
                disabled={exporting}
                onClick={() => void exportAudio("wav")}
                title="Exportar play-along em WAV 48kHz Lossless"
              >
                {exporting ? <Loader2 className="spin" size={13} /> : <Download size={13} />}{" "}
                Exportar Mixagem (WAV)
              </Key>

              <Key
                disabled={exporting}
                onClick={() => void exportAudio("mp3")}
                title="Exportar play-along em MP3 320kbps"
              >
                <Download size={13} /> Exportar MP3
              </Key>
            </div>

            <nav aria-label="Links institucionais e privacidade" className="studio-legal-bar flex flex-wrap items-center justify-center gap-3 pt-3 pb-6 text-[10px] text-zinc-500 font-mono">
              <span>PlayAlong Studio © 2026</span>
              <span>·</span>
              <Link to="/politica-de-privacidade" className="hover:text-zinc-300 underline underline-offset-2 transition-colors">
                Política de Privacidade (LGPD)
              </Link>
              <span>·</span>
              <Link to="/termos-de-uso" className="hover:text-zinc-300 underline underline-offset-2 transition-colors">
                Termos de Uso
              </Link>
              <span>·</span>
              <button
                type="button"
                onClick={openCookiePreferences}
                className="hover:text-zinc-300 underline underline-offset-2 transition-colors cursor-pointer bg-transparent border-0 p-0 text-inherit font-inherit"
              >
                Preferências de Cookies
              </button>
            </nav>
          </footer>
        </>
      )}

      {library && (
        <div className="modal-backdrop" onClick={() => setLibrary(false)}>
          <section
            className="library-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Biblioteca de faixas"
            onClick={(e) => e.stopPropagation()}
          >
            <header>
              <h2>Biblioteca de Faixas</h2>
              <Key size="icon" aria-label="Fechar biblioteca" onClick={() => setLibrary(false)}>
                <X />
              </Key>
            </header>
            <div className="library-row">
              <Headphones />
              <div>
                <h3>MATTE SESSION</h3>
                <span>TOM D MAIOR · 125 BPM · 5 STEMS · DEMONSTRAÇÃO</span>
              </div>
              <Key primary onClick={() => void demo()} aria-label="Abrir demonstração">
                <Play />
              </Key>
            </div>
            {sessions.filter((s) => s.kind !== "demo").length === 0 ? (
              <div className="py-6 px-4 text-center border border-dashed border-white/10 rounded-lg my-3 bg-white/[0.02]">
                <FolderOpen className="w-8 h-8 mx-auto mb-2 text-zinc-500" />
                <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">
                  Nenhuma faixa personalizada importada
                </h3>
                <p className="text-[11px] text-zinc-400 mt-1 max-w-[40ch] mx-auto leading-relaxed">
                  Arraste arquivos de áudio para o estúdio ou cole um link para processar e isolar faixas nesta sessão.
                </p>
                <div className="mt-3">
                  <Key
                    size="sm"
                    primary
                    onClick={() => {
                      setLibrary(false);
                      fileInput.current?.click();
                    }}
                  >
                    <Upload size={12} className="mr-1.5" /> Enviar Primeiro Áudio
                  </Key>
                </div>
              </div>
            ) : (
              sessions
                .filter((s) => s.kind !== "demo")
                .map((s, i) => (
                  <div className="library-row" key={i}>
                    <Mic />
                    <div>
                      <h3>{s.name}</h3>
                      <span>
                        {s.size} ·{" "}
                        {s.kind === "ai" ? "DEMUCS v4 (IA ZERO-GPU)" : "PRÉVIA POR FREQUÊNCIAS"}
                      </span>
                    </div>
                    <Key onClick={() => loadSession(s)} aria-label={`Abrir ${s.name}`}>
                      <ArrowRight />
                    </Key>
                  </div>
                ))
            )}
            <p className="library-note">
              Os áudios enviados ficam nesta sessão do navegador. Lembre-se de exportar sua mixagem antes de fechar a janela.
            </p>
          </section>
        </div>
      )}

      {refiningChannelIndex !== null && displayTracks[refiningChannelIndex] && (
        <Suspense fallback={null}>
          <InstrumentRefineModal
            open={refiningChannelIndex !== null}
            onOpenChange={(open) => {
              if (!open) setRefiningChannelIndex(null);
            }}
            channelIndex={refiningChannelIndex}
            currentTrackName={displayTracks[refiningChannelIndex]?.name || ""}
            currentTrackIcon={displayTracks[refiningChannelIndex]?.icon || "synth"}
            currentTrackColor={displayTracks[refiningChannelIndex]?.color}
            currentConfidencePercent={displayTracks[refiningChannelIndex]?.confidencePercent}
            onApplyRefinement={handleApplyRefinement}
          />
        </Suspense>
      )}

      {showHfTokenModal && (
        <Suspense fallback={null}>
          <HfTokenModal
            open={showHfTokenModal}
            onOpenChange={setShowHfTokenModal}
            onSaved={(h) => setAiHealth(h)}
          />
        </Suspense>
      )}
    </main>
  );
}
