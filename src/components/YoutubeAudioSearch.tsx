import { useState } from "react";
import dynamic from "next/dynamic";

const ReactPlayer = dynamic(() => import("react-player/youtube"), { ssr: false });

type Track = { id: string; title: string; thumb: string; channel: string };

type ApiResponse = { items?: Track[]; error?: string };

type YoutubeAudioSearchProps = {
  variant?: "compact" | "full";
};

export default function YoutubeAudioSearch({ variant = "compact" }: YoutubeAudioSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [current, setCurrent] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const search = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/youtube-search?q=${encodeURIComponent(query.trim())}`);
      const data: ApiResponse = await response.json();
      if (!response.ok) {
        setError(data?.error || "Erro ao buscar no YouTube");
        setResults([]);
        return;
      }
      setResults(data.items || []);
    } catch (err) {
      setError("Erro ao buscar no YouTube");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (track: Track) => {
    setCurrent(track);
    setPlaying(true);
  };

  const isCompact = variant === "compact";

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-ink-300">YouTube</div>
          <div className="text-lg font-semibold text-ink-900">Buscar e tocar cantigas</div>
          <div className="text-xs text-ink-400">
            {isCompact ? "Somente áudio (player discreto)" : "Player em vídeo para ver e ouvir"}
          </div>
        </div>
      </div>

      <form onSubmit={search} className="flex flex-col gap-2 sm:flex-row">
        <input
          className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
          placeholder="Busque uma música ou ponto no YouTube"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-ink-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-ink-800 disabled:opacity-60"
        >
          {loading ? "Buscando..." : "Buscar"}
        </button>
      </form>

      {error && <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>}

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {results.map((track) => (
          <div
            key={track.id}
            className={`flex items-center gap-3 rounded-xl border px-3 py-2 transition ${
              current?.id === track.id ? "border-ink-400 bg-ink-50" : "border-ink-100 hover:border-ink-200"
            }`}
          >
            <button
              onClick={() => handleSelect(track)}
              className="flex flex-1 items-center gap-3 text-left"
            >
              {track.thumb ? (
                <img src={track.thumb} alt="" className="h-12 w-12 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-ink-100 text-xs text-ink-500 flex-shrink-0">
                  Sem capa
                </div>
              )}
              <div className="flex flex-col text-sm overflow-hidden">
                <span className="font-semibold text-ink-900 line-clamp-2">{track.title}</span>
                <span className="text-ink-400">{track.channel}</span>
              </div>
            </button>
            <a
              href={`https://www.y2mate.com/youtube/${track.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-ink-100 text-ink-400 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-600 transition"
              title="Baixar MP3"
              onClick={(e) => e.stopPropagation()}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </a>
          </div>
        ))}
        {!loading && results.length === 0 && (
          <div className="rounded-xl border border-dashed border-ink-100 bg-ink-50/70 px-3 py-3 text-sm text-ink-400">
            Nenhum resultado ainda. Busque pelo nome da cantiga.
          </div>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-ink-100 bg-ink-50/60 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-400">Reprodução</div>
          {current && (
            <button
              type="button"
              onClick={() => setPlaying((prev) => !prev)}
              className="text-xs font-semibold text-ink-500 underline"
            >
              {playing ? "Pausar" : "Reproduzir"}
            </button>
          )}
        </div>
        <div
          className={`relative overflow-hidden rounded-xl bg-black/80 ${
            isCompact ? "h-[120px]" : "aspect-video w-full"
          }`}
        >
          <ReactPlayer
            url={current ? `https://www.youtube.com/watch?v=${current.id}` : undefined}
            playing={playing}
            controls
            height="100%"
            width="100%"
            style={{ position: "absolute", top: 0, left: 0, borderRadius: 12 }}
            config={{ playerVars: { rel: 0, modestbranding: 1 } }}
          />
        </div>
        {current && (
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="text-sm text-ink-700 overflow-hidden">
              <div className="font-semibold truncate">{current.title}</div>
              <div className="text-ink-400">{current.channel}</div>
            </div>
            <a
              href={`https://www.y2mate.com/youtube/${current.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100 transition flex-shrink-0"
              title="Baixar MP3"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Baixar
            </a>
          </div>
        )}
        {!current && <div className="text-xs text-ink-400">Selecione um resultado para tocar.</div>}
      </div>
    </div>
  );
}
