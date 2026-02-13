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
          <button
            key={track.id}
            onClick={() => handleSelect(track)}
            className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${
              current?.id === track.id ? "border-ink-400 bg-ink-50" : "border-ink-100 hover:border-ink-200"
            }`}
          >
            {track.thumb ? (
              <img src={track.thumb} alt="" className="h-12 w-12 rounded-lg object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-ink-100 text-xs text-ink-500">
                Sem capa
              </div>
            )}
            <div className="flex flex-col text-sm">
              <span className="font-semibold text-ink-900 line-clamp-2">{track.title}</span>
              <span className="text-ink-400">{track.channel}</span>
            </div>
          </button>
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
          <div className="mt-2 text-sm text-ink-700">
            <div className="font-semibold">{current.title}</div>
            <div className="text-ink-400">{current.channel}</div>
          </div>
        )}
        {!current && <div className="text-xs text-ink-400">Selecione um resultado para tocar.</div>}
      </div>
    </div>
  );
}
