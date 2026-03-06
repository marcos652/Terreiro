import Link from 'next/link';
import Image from 'next/image';

export default function QuemSomosPage() {
  const pillars = [
    { title: 'Fé', desc: 'Culto aos orixás com respeito, caridade e disciplina.', color: 'from-amber-400 to-orange-500' },
    { title: 'Caridade', desc: 'Atendimentos, passes e apoio fraterno à comunidade.', color: 'from-emerald-400 to-teal-500' },
    { title: 'Organização', desc: 'Transparência financeira e gestão das atividades do terreiro.', color: 'from-indigo-400 to-blue-500' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-900 via-ink-950 to-black text-ink-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-5 py-12 md:py-16">
        <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-14 w-14 overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/20">
              <Image src="/logo-templo.svg" alt="Templo de Umbanda Luz e Fé" fill sizes="56px" className="object-contain" priority />
            </div>
            <div>
              <div className="font-display text-3xl font-semibold text-white">Templo de Umbanda Luz e Fé</div>
              <div className="text-xs uppercase tracking-[0.28em] text-ink-300">Marília / SP</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="https://instagram.com/umbanda_luz_e_fe"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:border-white/40"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="4" y="4" width="16" height="16" rx="4" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" />
              </svg>
              @umbanda_luz_e_fe
            </a>
            <Link
              href="/login"
              className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-ink-900 shadow-lg shadow-amber-400/30 hover:bg-amber-300"
            >
              Entrar no Portal
            </Link>
          </div>
        </header>

        <section className="grid gap-6 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10 md:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="text-xs uppercase tracking-[0.3em] text-amber-300">Quem somos</div>
            <h1 className="font-display text-4xl font-semibold text-white md:text-5xl">
              Uma casa de Umbanda dedicada à fé, à caridade e à transparência.
            </h1>
            <p className="text-lg text-ink-200">
              Conduzimos giras semanais, trabalhos de desenvolvimento mediúnico e ações sociais.
              Mantemos um portal interno para organizar finanças, escalas, cantigas e eventos —
              tudo de forma responsável e acessível para nossa comunidade.
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-ink-200">
              <span className="rounded-full border border-white/20 px-3 py-1">Giras: sábados, 19h</span>
              <span className="rounded-full border border-white/20 px-3 py-1">Endereço: Estrada Vicinal - Avencas, Marília/SP • CEP 17532-000</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-ink-900 shadow-lg hover:-translate-y-0.5 hover:shadow-white/30 transition"
              >
                Acessar portal do terreiro
              </Link>
              <a
                href="mailto:contato@umbandaluzefe.com"
                className="rounded-2xl border border-white/30 px-5 py-3 text-sm font-semibold text-white hover:border-white/60 transition"
              >
                Fale conosco
              </a>
            </div>
          </div>
          <div className="space-y-3">
            {pillars.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 backdrop-blur"
              >
                <div className={`mb-2 h-1 w-12 rounded-full bg-gradient-to-r ${item.color}`} />
                <div className="text-lg font-semibold text-white">{item.title}</div>
                <div className="text-sm text-ink-200">{item.desc}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10 md:grid-cols-3">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-amber-300">Portal interno</div>
            <h2 className="mt-2 text-2xl font-semibold text-white">Gestão em um só lugar</h2>
            <p className="mt-2 text-sm text-ink-200">
              Controle financeiro (caixa e mensalidades), agenda de eventos, estoque, cantigas,
              notificações e gerenciamento de usuários com níveis de permissão.
            </p>
          </div>
          <div className="space-y-2 text-sm text-ink-200">
            <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3">
              <div className="text-white font-semibold">Financeiro</div>
              <div>Caixa, mensalidades, relatórios e metas mensais.</div>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3">
              <div className="text-white font-semibold">Agenda & Eventos</div>
              <div>Planejamento das giras e equipes responsáveis.</div>
            </div>
          </div>
          <div className="space-y-2 text-sm text-ink-200">
            <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3">
              <div className="text-white font-semibold">Cantigas e Estoque</div>
              <div>Repositório de pontos e controle de materiais.</div>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3">
              <div className="text-white font-semibold">Permissões</div>
              <div>Master, Editor e Visualizador com acesso liberado pelo portal.</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
