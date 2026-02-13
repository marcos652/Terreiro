import AppShell from "@components/AppShell";
import YoutubeAudioSearch from "@components/YoutubeAudioSearch";

export default function YoutubeMacumbaPage() {
  return (
    <AppShell
      title="Youtube Macumba"
      subtitle="Busque e ouça as cantigas direto do YouTube"
    >
      <div className="grid grid-cols-1 gap-6">
        <YoutubeAudioSearch />
      </div>
    </AppShell>
  );
}
