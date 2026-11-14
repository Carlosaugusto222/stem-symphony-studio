import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Circle, Download, FolderOpen, Headphones, Link2, Loader2, Mic, Pause, Play, RotateCcw, Square, Upload, X } from 'lucide-react';
import { Key, Waveform } from './controls';
import { STEMS, StudioEngine, audioUrlSchema, createDemo, download, exportMix, gainFor, guideChannel, initialChannels, splitBands, validateFile, type Channel, type Session } from '@/lib/audio/engine';

const timecode = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${(seconds % 60).toFixed(2).padStart(5, '0')}`;
export function Studio() {
  const engine = useRef<StudioEngine | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const recordingStream = useRef<MediaStream | null>(null);
  const [screen, setScreen] = useState<'upload' | 'mixer'>('upload');
  const [library, setLibrary] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [selected, setSelected] = useState([true, true, true, true, true]);
  const [quality, setQuality] = useState('studio');
  const [status, setStatus] = useState<'empty' | 'decoding' | 'preview' | 'processing' | 'ready'>('empty');
  const [progress, setProgress] = useState([0, 0, 0, 0, 0]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [url, setUrl] = useState('');
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

  function getEngine() { if (!engine.current) engine.current = new StudioEngine(); return engine.current; }
  useEffect(() => () => { abort.current?.abort(); engine.current?.dispose(); recordingStream.current?.getTracks().forEach(t => t.stop()); }, []);
  useEffect(() => { engine.current?.update(channels); }, [channels]);
  useEffect(() => { engine.current?.click(click); }, [click]);
  useEffect(() => {
    const timer = setInterval(() => {
      const e = engine.current;
      if (!e?.playing) return;
      const p = e.position(), duration = e.buffers[0]?.duration ?? 0;
      if (screen === 'mixer' && loop && p >= loopB) { void e.play(channels, loopA); setPosition(loopA); }
      else if (p >= duration) { e.stop(); e.offset = 0; setPosition(0); setPlaying(false); setPreview(false); }
      else setPosition(p);
      setMeters(e.analysers.map(a => { const values = new Uint8Array(a.frequencyBinCount); a.getByteFrequencyData(values); return Math.min(10, Math.round(values.reduce((s, v) => s + v, 0) / values.length / 10)); }));
    }, 60);
    return () => clearInterval(timer);
  }, [channels, screen, loop, loopA, loopB]);

  function changeChannel(i: number, update: Partial<Channel>) { setChannels(cs => cs.map((c, j) => j === i ? { ...c, ...update } : c)); }
  function resetTransport() { engine.current?.stop(); if (engine.current) engine.current.offset = 0; setPlaying(false); setPreview(false); setPosition(0); }
  function loadSession(s: Session) { resetTransport(); setSession(s); const e = getEngine(); e.buffers = s.buffers; e.rate = 1; setSpeed(100); setLoopB(s.buffers[0]?.duration ?? 24); setLoop(false); setChannels(initialChannels()); setPractice(null); setScreen('mixer'); setLibrary(false); setError(''); }
  async function demo() {
    try { setError(''); setNotice(''); const existing = sessions.find(s => s.kind === 'demo'); const s = existing ?? createDemo(getEngine().context); if (!existing) setSessions(ss => [...ss, s]); loadSession(s); }
    catch { setError('Não foi possível iniciar o áudio neste navegador.'); }
  }
  async function ingest(file: File) {
    try {
      validateFile(file); resetTransport(); setError(''); setNotice(''); setStatus('decoding'); setProgress([0, 0, 0, 0, 0]);
      const original = await getEngine().context.decodeAudioData(await file.arrayBuffer());
      const s: Session = { name: file.name, original, buffers: [], kind: 'bands', size: `${(file.size / 1024 / 1024).toFixed(1)} MB` };
      setSession(s); setStatus('preview');
    } catch (err) { setError(err instanceof Error && !err.message.includes('decode') ? err.message : 'Não foi possível ler este áudio. Tente um arquivo WAV ou MP3 válido.'); setStatus('empty'); }
    if (fileInput.current) fileInput.current.value = '';
  }
  async function loadUrl() {
    const valid = audioUrlSchema.safeParse(url);
    if (!valid.success) { setError('Cole um link HTTPS direto para um arquivo de áudio.'); return; }
    if (/youtube\.com|youtu\.be/i.test(new URL(valid.data).hostname)) { setError('YouTube não fornece áudio direto. Envie um arquivo ou um link de nuvem com download direto.'); return; }
    try {
      setError(''); setStatus('decoding');
      const response = await fetch(valid.data, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error();
      const length = Number(response.headers.get('content-length') ?? 0);
      if (length > 120 * 1024 * 1024) throw new Error('O arquivo excede o limite de 120MB.');
      const blob = await response.blob(); const filename = decodeURIComponent(new URL(valid.data).pathname.split('/').pop() ?? 'audio.wav');
      await ingest(new File([blob], /\.[a-z0-9]+$/i.test(filename) ? filename : 'audio.wav', { type: blob.type }));
    } catch (err) { setStatus('empty'); setError(err instanceof Error && err.message.includes('120MB') ? err.message : 'Não foi possível acessar o link. Verifique se ele permite download direto e acesso pelo navegador.'); }
  }
  async function extract() {
    if (!session?.original || !selected.some(Boolean)) return;
    resetTransport(); setStatus('processing'); setError(''); setProgress([0, 0, 0, 0, 0]);
    const controller = new AbortController(); abort.current = controller;
    try {
      const buffers = await splitBands(session.original, selected, i => setProgress(p => p.map((v, j) => j === i ? 100 : v)), controller.signal, quality === 'studio');
      const s = { ...session, buffers }; setSession(s); setSessions(ss => [...ss.filter(x => x.name !== s.name), s]); setStatus('ready');
    } catch (err) { setStatus('preview'); if (err instanceof Error && err.name !== 'AbortError') setError('A preparação falhou. Tente novamente com um áudio menor.'); }
  }
  function cancel() { abort.current?.abort(); resetTransport(); setStatus(session?.original ? 'preview' : 'empty'); setProgress([0, 0, 0, 0, 0]); setNotice('Processamento cancelado. Seu áudio continua disponível.'); }
  async function previewAudio() {
    if (!session?.original) return;
    const e = getEngine();
    if (preview) { resetTransport(); return; }
    e.buffers = [session.original]; e.offset = 0; await e.play([{ db: 0, pan: 0, mute: false, solo: false }]); setPreview(true);
  }
  async function togglePlay() {
    try { const e = getEngine(); if (playing) { e.stop(); setPlaying(false); setMeters([0, 0, 0, 0, 0]); } else { await e.play(channels); setPlaying(true); } }
    catch { setError('Não foi possível reproduzir. Tente novamente.'); }
  }
  function seek(value: number) { const e = getEngine(); const wasPlaying = e.playing; e.stop(); e.offset = value; setPosition(value); if (wasPlaying) void e.play(channels, value); }
  function selectPractice(i: number) {
    setChannels(cs => cs.map((c, j) => j === practice ? { ...c, mute: false, db: initialChannels()[j]?.db ?? 0 } : c).map((c, j) => j === i ? guide ? guideChannel(c) : { ...c, mute: true } : c)); setPractice(i);
  }
  function setGuideMode(value: boolean) { setGuide(value); if (practice !== null) setChannels(cs => cs.map((c, i) => i === practice ? value ? guideChannel(c) : { ...c, mute: true } : c)); }
  async function exportAudio() {
    if (!session) return; setExporting(true); setError('');
    try { download(await exportMix(session.buffers, channels, speed / 100), 'playalong-customizado.wav'); setNotice('Play-along exportado em WAV estéreo.'); }
    catch { setError('Não foi possível exportar o áudio.'); } finally { setExporting(false); }
  }
  async function record() {
    if (recording) { recorder.current?.stop(); setRecording(false); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); recordingStream.current = stream;
      const r = new MediaRecorder(stream), chunks: Blob[] = []; recorder.current = r;
      r.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      r.onstop = () => { download(new Blob(chunks, { type: r.mimeType }), r.mimeType.includes('mp4') ? 'minha-pratica.m4a' : 'minha-pratica.webm'); stream.getTracks().forEach(t => t.stop()); setNotice('Sua prática foi gravada e baixada.'); };
      r.start(); setRecording(true); setError('');
    } catch { setError('Permita o acesso ao microfone para gravar sua prática.'); }
  }

  const busy = status === 'processing' || status === 'decoding';
  const total = Math.round(progress.reduce((a, b) => a + b, 0) / 5);
  const duration = session?.buffers[0]?.duration ?? 24;
  return <main className="studio">
    {screen === 'upload' ? <>
      <header className="studio-header">
        <div className="brand"><span className="brand-mark" />PLAYALONG <span>// ENGINE v2.4</span></div>
        <span className="header-divider" />
        <span className="status-pill"><i />STATUS: {busy ? 'PROCESSANDO' : 'PRONTO'}</span>
        <span className="status-pill">MODELO: DEMUCS v4 HD</span>
        <span className="status-pill sample-pill">48kHz LOSSLESS</span>
        <Key className="library-key" onClick={() => setLibrary(true)}><FolderOpen /> BIBLIOTECA DE FAIXAS <span className="muted">({sessions.length})</span></Key>
      </header>
      <div className="ingestion-grid">
        <section className="drop-panel">
          <div className={`drop-zone ${dragging ? 'is-dragging' : ''}`} onDragOver={e => { e.preventDefault(); if (!busy) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); const file = e.dataTransfer.files[0]; if (file && !busy) void ingest(file); }}>
            <Key className="drop-trigger" disabled={busy} onClick={() => fileInput.current?.click()} aria-label="Enviar arquivo de áudio"><Waveform /><h1>ARRASTE SEU ÁUDIO OU CLIQUE PARA ENVIAR</h1><span>WAV · FLAC · MP3 ATÉ 120MB</span></Key>
            <input ref={fileInput} type="file" accept=".wav,.flac,.mp3,.aif,.aiff,.m4a" hidden onChange={e => { const file = e.target.files?.[0]; if (file) void ingest(file); }} />
            <form className="url-input" onSubmit={e => { e.preventDefault(); void loadUrl(); }}><Link2 size={13} /><input aria-label="Link direto de áudio" placeholder="Ou cole link direto (YouTube / Nuvem)" value={url} maxLength={2048} onChange={e => setUrl(e.target.value)} disabled={busy} /><Key type="submit" disabled={busy || !url}>CARREGAR</Key></form>
          </div>
        </section>
        <section className="selection-panel">
          <h2>CANAIS A EXTRAIR &gt;</h2>
          <div className="stem-select">{STEMS.map((s, i) => <Key key={s} active={selected[i]} aria-pressed={selected[i]} disabled={busy} onClick={() => setSelected(ss => ss.map((v, j) => j === i ? !v : v))}>{selected[i] && <Check size={12} />}{i === 4 ? 'TECLADOS / OUTROS' : s}</Key>)}</div>
          <h2 className="quality-label">QUALIDADE &gt;</h2>
          <div className="quality-toggle"><Key active={quality === 'studio'} primary={quality === 'studio'} disabled={busy} onClick={() => setQuality('studio')}>MODO ESTÚDIO - ALTA FIDELIDADE</Key><Key primary={quality === 'fast'} disabled={busy} onClick={() => setQuality('fast')}>MODO RÁPIDO</Key></div>
        </section>
      </div>
      {status === 'empty' ? <section className="empty-monitor">
        <div className="empty-label"><span className="tiny-led" /> SESSÃO DE ENSAIO</div>
        <div className="demo-content"><div><h2>Seu próximo ensaio começa aqui.</h2><p>MATTE SESSION · D MAIOR · 125 BPM · 5 STEMS</p></div><Key primary onClick={() => void demo()}><Play size={14} /> OUVIR DEMONSTRAÇÃO <ArrowRight size={14} /></Key></div>
        <div className="empty-tracks">{STEMS.map(s => <div key={s}><span>{s}</span><Waveform /></div>)}</div>
        <div className="demo-note">Composição original de demonstração · Voz sintetizada e instrumentos independentes</div>
      </section> : <section className="separation-monitor">
        <div className="monitor-title"><h2>{session?.name ?? 'Lendo arquivo de áudio...'}</h2><span className="muted">{session?.size}</span><span className="remaining">TEMPO RESTANTE <b>{status === 'ready' ? '0s' : busy ? 'CALCULANDO' : '—'}</b></span></div>
        {session?.original && <div className="source-preview"><Key size="icon" title={preview ? 'Pausar prévia' : 'Ouvir prévia'} aria-label={preview ? 'Pausar prévia' : 'Ouvir prévia'} onClick={() => void previewAudio()} disabled={status === 'processing'}>{preview ? <Pause /> : <Play />}</Key><Waveform buffer={session.original} /><span>{timecode(session.original.duration)}</span></div>}
        <div className="processing-disclosure"><span className="tiny-led" /><span>PRÉVIA LOCAL POR FREQUÊNCIAS · Não isola instrumentos por IA. Demucs HD requer conexão externa.</span></div>
        <div className="overall-progress"><progress value={total} max={100} aria-label="Progresso geral" /><span>{status === 'decoding' ? <Loader2 className="spin" /> : `${total}%`}</span></div>
        <div className="stem-progress">{STEMS.map((s, i) => <div className="progress-row" key={s}><span>{s}</span><progress value={progress[i]} max={100} aria-label={`Progresso ${s}`} /><span>{progress[i]}%</span><span className="muted">{!selected[i] ? 'Não selecionado' : status === 'ready' ? 'Concluído' : status === 'processing' ? ['Preparando faixa de voz...', 'Preparando transientes...', 'Processando frequências graves...', 'Isolando transientes e solos...', 'Separando ambiências e pads...'][i] : 'Aguardando preparação'}</span></div>)}</div>
      </section>}
      {error && <div className="feedback error" role="alert">{error}<Key size="icon" aria-label="Fechar erro" onClick={() => setError('')}><X /></Key></div>}
      {notice && <div className="feedback" role="status">{notice}</div>}
      <footer className="studio-footer upload-footer"><span className="footer-engine"><span className="tiny-led" />48kHz / 24-bit Lossless Engine</span>{status !== 'empty' && <Key onClick={cancel}>CANCELAR</Key>}{status === 'preview' && <Key primary disabled={!selected.some(Boolean)} onClick={() => void extract()}><Upload size={14} /> PREPARAR PRÉVIA LOCAL</Key>}{status !== 'preview' && <Key primary disabled={status !== 'ready'} onClick={() => { if (session) loadSession(session); }}>ABRIR NO MIXER DE ENSAIO <ArrowRight size={14} /></Key>}</footer>
    </> : <>
      <section className="transport-panel">
        <div className="transport-display"><div className="time-display">{timecode(position)} <span>/ {timecode(duration)}</span></div><div className="song-display"><h1>{session?.name.replace(/\.[^/.]+$/, '').toUpperCase()}</h1>{session?.kind === 'bands' && <span>PRÉVIA POR FREQUÊNCIAS · NÃO SÃO STEMS ISOLADOS</span>}</div><div className="song-meta"><span>KEY <b>{session?.kind === 'demo' ? 'D MAJ' : '—'}</b></span><span>BPM <b>{session?.kind === 'demo' ? '125.0' : '—'}</b></span></div></div>
        <div className="transport-keys"><Key size="icon" title="Voltar ao início" aria-label="Voltar ao início" onClick={() => seek(0)}><RotateCcw /></Key><Key size="icon" primary aria-label={playing ? 'Pausar' : 'Reproduzir'} onClick={() => void togglePlay()}>{playing ? <Pause /> : <Play />}</Key><Key active={click} aria-pressed={click} onClick={() => setClick(!click)}><span className="tiny-led" />{click ? 'CLICK ON' : 'CLICK OFF'}</Key></div>
      </section>
      <input className="seek-bar" type="range" min={0} max={duration} step={.01} value={Math.min(position, duration)} aria-label="Posição da música" onChange={e => seek(Number(e.target.value))} />
      <nav className="song-sections">{['INTRO', 'VERSE 1', 'CHORUS', 'GUITAR SOLO'].map((s, i) => <Key key={s} active={Math.floor(position / (duration / 4)) === i} onClick={() => seek(duration * i / 4)}>{s}</Key>)}</nav>
      <section className="practice-strip"><span>PRÁTICA ATIVA &gt;</span><div className="practice-instruments">{STEMS.map((s, i) => <Key key={s} active={practice === i} aria-pressed={practice === i} onClick={() => selectPractice(i)}>{i === 4 ? 'SYNTH/OUTROS' : s}{practice === i && channels[i]?.mute ? ' (MUTED)' : ''}</Key>)}</div><div className="practice-mode"><Key primary={!guide} onClick={() => setGuideMode(false)}>MUTE TOTAL</Key><Key primary={guide} onClick={() => setGuideMode(true)}>GUIA 20%</Key></div></section>
      <section className="channel-grid">{STEMS.map((s, i) => {
        const c = channels[i]; if (!c) return null; const silent = gainFor(c, channels) === 0;
        return <article className={`channel-strip ${silent ? 'channel-muted' : ''}`} key={s}>
          <header><span>CH 0{i + 1}</span><h2>{s}</h2></header><Waveform buffer={session?.buffers[i]} muted={silent} />
          <div className="channel-keys"><Key active={c.solo} aria-pressed={c.solo} aria-label={`Solo ${s}`} onClick={() => changeChannel(i, { solo: !c.solo })}>SOLO</Key><Key active={c.mute} aria-pressed={c.mute} aria-label={`Mute ${s}`} onClick={() => changeChannel(i, { mute: !c.mute })}>MUTE</Key></div>
          <div className="fader-area"><div className="level-meter">{Array.from({ length: 10 }, (_, j) => <i key={j} className={playing && !silent && j < (meters[i] ?? 0) ? 'lit' : ''} />)}</div><div className="fader-scale">{['+6', '0', '-10', '-30', '-∞'].map(v => <span key={v}>{v}</span>)}</div><div className="fader-track"><input type="range" min={-60} max={6} step={.1} value={c.db} aria-label={`Volume ${s} em dB`} onChange={e => changeChannel(i, { db: Number(e.target.value), mute: false })} /></div></div>
          <div className="channel-bottom"><label className="pan-knob" title={`Pan ${s}`}><input type="range" min={-1} max={1} step={.01} value={c.pan} aria-label={`Pan ${s}`} onChange={e => changeChannel(i, { pan: Number(e.target.value) })} /><svg viewBox="0 0 32 32"><line x1="16" y1="6" x2="16" y2="14" transform={`rotate(${c.pan * 120} 16 16)`} /></svg></label><output>{silent ? '-∞' : c.db.toFixed(1)} dB</output><span>{c.pan === 0 ? 'C' : `${c.pan < 0 ? 'L' : 'R'}${Math.round(Math.abs(c.pan) * 100)}`}</span></div>
          <Key className="channel-guide" active={Math.abs(c.db - 20 * Math.log10(.2)) < .01 && !c.mute} aria-label={`Guia 20% ${s}`} onClick={() => setChannels(cs => cs.map((v, j) => j === i ? guideChannel(v) : v))}>GUIA 20%</Key>
        </article>;
      })}</section>
      <section className="study-tools"><label>VELOCIDADE <input type="range" aria-label="Velocidade" min={50} max={150} value={speed} onChange={e => { const rate = Number(e.target.value); const eng = getEngine(), p = eng.position(); eng.stop(); eng.offset = p; eng.rate = rate / 100; setSpeed(rate); if (playing) void eng.play(channels, p); }} /><output>{speed}%</output></label><Key active={loop} onClick={() => { if (loopB <= loopA) { setError('O ponto B deve ficar depois do ponto A.'); return; } setLoop(!loop); }}>LOOP A-B</Key><Key title="Definir início do loop" onClick={() => { if (position < loopB) setLoopA(position); }}>A {timecode(loopA)}</Key><Key title="Definir fim do loop" onClick={() => { if (position > loopA) setLoopB(position); }}>B {timecode(loopB)}</Key><Key className="reset-mix" title="Restaurar mixagem" onClick={() => { setChannels(initialChannels()); setPractice(null); }}><RotateCcw /> RESET</Key></section>
      {error && <div className="feedback error" role="alert">{error}<Key size="icon" aria-label="Fechar erro" onClick={() => setError('')}><X /></Key></div>}{notice && <div className="feedback" role="status">{notice}</div>}
      <footer className="studio-footer"><Key className="back-upload" onClick={() => { resetTransport(); setScreen('upload'); setNotice(''); }}><ArrowLeft /> CARREGAR OUTRA MÚSICA</Key><span className="footer-engine"><span className="tiny-led" />48kHz / 24-bit Lossless Engine</span><Key active={recording} onClick={() => void record()}>{recording ? <Square /> : <Circle size={10} fill="currentColor" />}{recording ? 'PARAR GRAVAÇÃO' : 'REC PERFORMANCE'}</Key><Key primary disabled={exporting} onClick={() => void exportAudio()}>{exporting ? <Loader2 className="spin" /> : <Download />} {exporting ? 'EXPORTANDO...' : 'EXPORTAR PLAY-ALONG CUSTOMIZADO'}</Key></footer>
    </>}
    {library && <div className="modal-backdrop" onClick={() => setLibrary(false)}><section className="library-modal" role="dialog" aria-modal="true" aria-label="Biblioteca de faixas" onClick={e => e.stopPropagation()}><header><h2>BIBLIOTECA DE FAIXAS</h2><Key size="icon" aria-label="Fechar biblioteca" onClick={() => setLibrary(false)}><X /></Key></header><div className="library-row"><Headphones /><div><h3>MATTE SESSION</h3><span>D MAIOR · 125 BPM · 5 STEMS · DEMONSTRAÇÃO</span></div><Key primary onClick={() => void demo()} aria-label="Abrir demonstração"><Play /></Key></div>{sessions.filter(s => s.kind !== 'demo').map((s, i) => <div className="library-row" key={i}><Mic /><div><h3>{s.name}</h3><span>{s.size} · PRÉVIA POR FREQUÊNCIAS</span></div><Key onClick={() => loadSession(s)} aria-label={`Abrir ${s.name}`}><ArrowRight /></Key></div>)}<p className="library-note">Os áudios enviados ficam nesta sessão do navegador. Baixe sua mixagem antes de fechar.</p></section></div>}
  </main>;
}