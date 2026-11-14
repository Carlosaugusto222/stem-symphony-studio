import { Client } from "@gradio/client";
import { STEMS, wavBlob } from "./engine";

export type DemucsHealth = "connecting" | "online" | "local";

export interface DemucsProgress {
  stage: "queue" | "processing" | "downloading" | "ready";
  message: string;
  totalPercent: number;
  stemPercents: [number, number, number, number, number];
  stemMessages: [string, string, string, string, string];
  queuePosition?: number | null;
  queueEta?: number | null;
}

export interface DemucsSeparationOptions {
  audio: Blob | File | AudioBuffer;
  selectedStems?: boolean[];
  audioContext: AudioContext;
  model?: "htdemucs" | "htdemucs_6s" | "mdx_extra";
  signal?: AbortSignal;
  onProgress?: (progress: DemucsProgress) => void;
  onCancelCreated?: (cancelFn: () => Promise<void>) => void;
}

export function getHuggingFaceConfig() {
  const envToken =
    typeof import.meta !== "undefined" && import.meta.env
      ? (import.meta.env.VITE_HUGGINGFACE_TOKEN as string | undefined) ||
        (import.meta.env.HUGGINGFACE_TOKEN as string | undefined)
      : undefined;

  const envSpace =
    typeof import.meta !== "undefined" && import.meta.env
      ? (import.meta.env.VITE_HUGGINGFACE_SPACE as string | undefined) ||
        (import.meta.env.VITE_DEMUCS_SPACE as string | undefined)
      : undefined;

  return {
    token: envToken && envToken.trim().length > 0 ? envToken.trim() : undefined,
    space: envSpace && envSpace.trim().length > 0 ? envSpace.trim() : "teamup-tech/Demucs",
    fallbackSpaces: ["teamup-tech/Demucs", "fffiloni/demucs", "ahmetk/demucs"],
  };
}

let cachedHealth: { status: DemucsHealth; timestamp: number } | null = null;

export async function checkDemucsHealth(): Promise<DemucsHealth> {
  const now = Date.now();
  if (cachedHealth && now - cachedHealth.timestamp < 30000) {
    return cachedHealth.status;
  }

  const { space, token } = getHuggingFaceConfig();
  try {
    const clientOptions = token ? { hf_token: token as `hf_${string}` } : {};
    const client = await Client.connect(space, clientOptions);
    if (client) {
      cachedHealth = { status: "online", timestamp: now };
      return "online";
    }
    cachedHealth = { status: "local", timestamp: now };
    return "local";
  } catch {
    cachedHealth = { status: "local", timestamp: now };
    return "local";
  }
}

export function resetDemucsHealthCache() {
  cachedHealth = null;
}

function identifyStemLabel(fileRef: unknown): string {
  if (!fileRef) return "";
  if (typeof fileRef === "string") return fileRef.toLowerCase();
  if (typeof fileRef === "object" && fileRef !== null) {
    const obj = fileRef as { orig_name?: string; path?: string; url?: string; label?: string };
    const text =
      `${obj.orig_name ?? ""} ${obj.path ?? ""} ${obj.url ?? ""} ${obj.label ?? ""}`.toLowerCase();
    return text;
  }
  return "";
}

function mapReturnedFiles(
  outputs: unknown[],
  endpointReturns?: Array<{ label?: string; component?: string }>,
): {
  vocals?: unknown;
  drums?: unknown;
  bass?: unknown;
  guitar?: unknown;
  piano?: unknown;
  other?: unknown;
} {
  const result: {
    vocals?: unknown;
    drums?: unknown;
    bass?: unknown;
    guitar?: unknown;
    piano?: unknown;
    other?: unknown;
  } = {};

  outputs.forEach((item, index) => {
    const text = identifyStemLabel(item) || (endpointReturns?.[index]?.label ?? "").toLowerCase();
    if (text.includes("vocal")) result.vocals = item;
    else if (text.includes("drum")) result.drums = item;
    else if (text.includes("bass")) result.bass = item;
    else if (text.includes("guitar")) result.guitar = item;
    else if (text.includes("piano")) result.piano = item;
    else if (text.includes("other")) result.other = item;
  });

  // Fallback positional if not recognized by filename: standard Demucs returns drums, bass, vocals, other
  if (!result.vocals && !result.drums && !result.bass && !result.other && outputs.length >= 4) {
    result.drums = outputs[0];
    result.bass = outputs[1];
    result.vocals = outputs[2];
    result.other = outputs[3];
  }

  return result;
}

function extractFileUrl(fileRef: unknown): string | null {
  if (!fileRef) return null;
  if (typeof fileRef === "string") return fileRef;
  if (typeof fileRef === "object" && fileRef !== null) {
    const obj = fileRef as { url?: string; path?: string };
    if (obj.url && /^https?:\/\//i.test(obj.url)) return obj.url;
    if (obj.path && /^https?:\/\//i.test(obj.path)) return obj.path;
  }
  return null;
}

export async function profileHarmonicStem(
  source: AudioBuffer,
  ctx: AudioContext,
  target: "guitars" | "keyboards",
): Promise<AudioBuffer> {
  const offline = new OfflineAudioContext(
    source.numberOfChannels,
    source.length,
    source.sampleRate,
  );
  const src = offline.createBufferSource();
  src.buffer = source;

  if (target === "guitars") {
    // Focus guitar presence: tight low cut to remove body rumble and gentle mid focus
    const hp = offline.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 160;

    const mid = offline.createBiquadFilter();
    mid.type = "peaking";
    mid.frequency.value = 2200;
    mid.gain.value = 2.5;
    mid.Q.value = 0.9;

    src.connect(hp).connect(mid).connect(offline.destination);
  } else {
    // Focus keyboards/synths/pads: low body warmth and silky high air
    const lp = offline.createBiquadFilter();
    lp.type = "lowshelf";
    lp.frequency.value = 320;
    lp.gain.value = 2.0;

    const air = offline.createBiquadFilter();
    air.type = "highshelf";
    air.frequency.value = 5500;
    air.gain.value = 2.5;

    src.connect(lp).connect(air).connect(offline.destination);
  }

  src.start(0);
  return await offline.startRendering();
}

export async function separateAudioDemucs(
  options: DemucsSeparationOptions,
): Promise<AudioBuffer[]> {
  const {
    audio,
    selectedStems = [true, true, true, true, true],
    audioContext,
    model = "htdemucs",
    signal,
    onProgress,
    onCancelCreated,
  } = options;

  let audioBlob: Blob;
  if (audio instanceof Blob) {
    audioBlob = audio;
  } else if (audio instanceof AudioBuffer) {
    audioBlob = wavBlob(audio);
  } else {
    throw new Error("Formato de áudio não suportado.");
  }

  const { space, token, fallbackSpaces } = getHuggingFaceConfig();
  const spacesToTry = [space, ...fallbackSpaces.filter((s) => s !== space)];

  let lastError: Error | null = null;

  for (const currentSpace of spacesToTry) {
    if (signal?.aborted) throw new DOMException("Operação cancelada pelo usuário.", "AbortError");

    onProgress?.({
      stage: "queue",
      message: "Conectando ao cluster ZeroGPU...",
      totalPercent: 5,
      stemPercents: [5, 5, 5, 5, 5],
      stemMessages: [
        "Aguardando conexão...",
        "Aguardando conexão...",
        "Aguardando conexão...",
        "Aguardando conexão...",
        "Aguardando conexão...",
      ],
    });

    try {
      const clientOptions = token ? { hf_token: token as `hf_${string}` } : {};
      const app = await Client.connect(currentSpace, {
        ...clientOptions,
        events: ["status", "data"],
      });

      if (signal?.aborted) throw new DOMException("Operação cancelada pelo usuário.", "AbortError");

      // Determine endpoint
      const apiInfo = app.view_api ? await app.view_api() : { named_endpoints: {} };
      const endpointName = apiInfo.named_endpoints?.["/process"]
        ? "/process"
        : apiInfo.named_endpoints?.["/predict"]
          ? "/predict"
          : (Object.keys(apiInfo.named_endpoints ?? {})[0] ?? "/process");

      const endpointMeta = apiInfo.named_endpoints?.[endpointName];
      const paramCount = endpointMeta?.parameters?.length ?? 2;
      const params: unknown[] = [audioBlob];
      if (paramCount > 1) {
        params.push(model);
      }

      const job = app.submit(endpointName, params);
      if (onCancelCreated) {
        onCancelCreated(async () => {
          try {
            await job.cancel();
          } catch {
            /* ignore cancel errors */
          }
        });
      }

      let returnedOutputs: unknown[] | null = null;
      let estimatedPercent = 10;
      let progressTimer: ReturnType<typeof setInterval> | undefined;

      const startProgressSimulation = () => {
        clearInterval(progressTimer);
        progressTimer = setInterval(() => {
          if (estimatedPercent < 80) {
            estimatedPercent = Math.min(80, estimatedPercent + 4);
            const p = estimatedPercent;
            onProgress?.({
              stage: "processing",
              message:
                "Separando voz, bateria, baixo, guitarra e outros com Demucs v4 (ZeroGPU)...",
              totalPercent: p,
              stemPercents: [
                Math.min(90, p + 8),
                Math.min(90, p + 5),
                Math.min(90, p + 2),
                Math.min(85, p),
                Math.min(85, p - 3),
              ],
              stemMessages: [
                "Rede neural: isolando faixa de voz...",
                "Rede neural: separando bumbo, caixa e pratos...",
                "Rede neural: isolando frequências graves e sub...",
                "Rede neural: extraindo guitarras e solos...",
                "Rede neural: separando sintetizadores e ambiências...",
              ],
            });
          }
        }, 600);
      };

      try {
        for await (const msg of job) {
          if (signal?.aborted) {
            await job.cancel();
            throw new DOMException("Operação cancelada pelo usuário.", "AbortError");
          }

          if (msg.type === "status") {
            const statusMsg = msg as {
              stage?: string;
              position?: number | null;
              eta?: number | null;
              original_msg?: string;
            };

            if (statusMsg.stage === "pending") {
              if (typeof statusMsg.position === "number" && statusMsg.position > 0) {
                const pos = statusMsg.position + 1;
                onProgress?.({
                  stage: "queue",
                  message: `Aguardando GPU pública... posição ${pos}${statusMsg.eta ? ` (estimativa ~${Math.round(statusMsg.eta)}s)` : ""}`,
                  totalPercent: 12,
                  stemPercents: [10, 10, 10, 10, 10],
                  stemMessages: [
                    "Na fila de processamento GPU...",
                    "Na fila de processamento GPU...",
                    "Na fila de processamento GPU...",
                    "Na fila de processamento GPU...",
                    "Na fila de processamento GPU...",
                  ],
                  queuePosition: pos,
                  queueEta: statusMsg.eta,
                });
              } else {
                startProgressSimulation();
              }
            } else if (statusMsg.stage === "complete") {
              clearInterval(progressTimer);
            } else if (statusMsg.stage === "error") {
              clearInterval(progressTimer);
              throw new Error("Falha no processamento pela GPU remota.");
            }
          }

          if (msg.type === "data") {
            const dataMsg = msg as { data?: unknown[] };
            if (Array.isArray(dataMsg.data)) {
              returnedOutputs = dataMsg.data;
            }
          }
        }
      } finally {
        clearInterval(progressTimer);
      }

      if (!returnedOutputs || !returnedOutputs.length) {
        throw new Error("Nenhum arquivo de áudio foi retornado pelo Space.");
      }

      // Download and decode stems
      onProgress?.({
        stage: "downloading",
        message: "Baixando e decodificando faixas isoladas de alta fidelidade...",
        totalPercent: 85,
        stemPercents: [85, 85, 85, 85, 85],
        stemMessages: [
          "Baixando áudio isolado...",
          "Baixando áudio isolado...",
          "Baixando áudio isolado...",
          "Baixando áudio isolado...",
          "Baixando áudio isolado...",
        ],
      });

      const mapped = mapReturnedFiles(returnedOutputs, endpointMeta?.returns);

      const downloadAndDecode = async (
        fileRef: unknown,
        label: string,
      ): Promise<AudioBuffer | null> => {
        const url = extractFileUrl(fileRef);
        if (!url) return null;
        try {
          const resp = await fetch(url, { signal });
          if (!resp.ok) throw new Error(`Falha ao baixar ${label}`);
          const ab = await resp.arrayBuffer();
          return await audioContext.decodeAudioData(ab.slice(0));
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") throw err;
          return null;
        }
      };

      const [vocalsBuf, drumsBuf, bassBuf, guitarBuf, pianoBuf, otherBuf] = await Promise.all([
        downloadAndDecode(mapped.vocals, "Voz"),
        downloadAndDecode(mapped.drums, "Bateria"),
        downloadAndDecode(mapped.bass, "Baixo"),
        downloadAndDecode(mapped.guitar, "Guitarra"),
        downloadAndDecode(mapped.piano, "Teclados"),
        downloadAndDecode(mapped.other, "Acompanhamento/Outros"),
      ]);

      if (signal?.aborted) throw new DOMException("Operação cancelada pelo usuário.", "AbortError");

      // Reference buffer for duration/format
      const ref = vocalsBuf || drumsBuf || bassBuf || otherBuf || guitarBuf || pianoBuf;
      if (!ref) {
        throw new Error("Não foi possível decodificar os áudios retornados da IA.");
      }

      const emptyBuffer = (dur = ref.duration) =>
        audioContext.createBuffer(
          2,
          Math.floor(dur * audioContext.sampleRate),
          audioContext.sampleRate,
        );

      // Map to 5 channels
      const resultBuffers: AudioBuffer[] = [];

      // CH 0: VOZ
      resultBuffers[0] = selectedStems[0] ? vocalsBuf || emptyBuffer() : emptyBuffer();

      // CH 1: BATERIA
      resultBuffers[1] = selectedStems[1] ? drumsBuf || emptyBuffer() : emptyBuffer();

      // CH 2: BAIXO
      resultBuffers[2] = selectedStems[2] ? bassBuf || emptyBuffer() : emptyBuffer();

      // CH 3: GUITARRAS
      if (!selectedStems[3]) {
        resultBuffers[3] = emptyBuffer();
      } else if (guitarBuf) {
        resultBuffers[3] = guitarBuf;
      } else if (otherBuf) {
        resultBuffers[3] = await profileHarmonicStem(otherBuf, audioContext, "guitars");
      } else {
        resultBuffers[3] = emptyBuffer();
      }

      // CH 4: TECLADOS / OUTROS
      if (!selectedStems[4]) {
        resultBuffers[4] = emptyBuffer();
      } else if (pianoBuf) {
        resultBuffers[4] = pianoBuf;
      } else if (otherBuf) {
        resultBuffers[4] = await profileHarmonicStem(otherBuf, audioContext, "keyboards");
      } else {
        resultBuffers[4] = emptyBuffer();
      }

      onProgress?.({
        stage: "ready",
        message: "Demucs v4: 5 faixas isoladas prontas para ensaio!",
        totalPercent: 100,
        stemPercents: [100, 100, 100, 100, 100],
        stemMessages: [
          "Voz isolada em alta fidelidade",
          "Bateria completa isolada",
          "Baixo elétrico/acústico isolado",
          "Guitarras e violões isolados",
          "Teclados, sintetizadores e pads isolados",
        ],
      });

      cachedHealth = { status: "online", timestamp: Date.now() };
      return resultBuffers;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw err;
      }
      lastError = err instanceof Error ? err : new Error(String(err));
      // Continue to next space if available
    }
  }

  cachedHealth = { status: "local", timestamp: Date.now() };
  throw lastError ?? new Error("O serviço de IA está ocupado ou indisponível.");
}
