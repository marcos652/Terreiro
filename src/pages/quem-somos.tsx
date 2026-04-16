import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { IMG_ALTAR_OFERENDAS, IMG_VELAS_JANELA, IMG_DEFUMADOR } from '@data/terreiro-images';

export default function QuemSomosPage() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0c0c14] text-white overflow-x-hidden">
      {/* Fixed top bar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 transition-all duration-500 ${
          scrollY > 60
            ? 'bg-[#0c0c14]/90 backdrop-blur-xl border-b border-white/5 shadow-lg shadow-black/20'
            : 'bg-transparent'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/10">
            <Image
              src="/logo-templo.svg"
              alt="Templo de Umbanda Luz e Fé"
              fill
              sizes="40px"
              className="object-contain"
              priority
            />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-white/40">
            Templo Luz e Fé
          </span>
        </div>
        <Link
          href="/login"
          className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-semibold text-white/70 backdrop-blur transition-all hover:border-indigo-500/30 hover:bg-indigo-500/10 hover:text-white"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Voltar ao Login
        </Link>
      </nav>

      {/* Ambient backgrounds */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(99,102,241,0.15),_transparent_60%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(168,85,247,0.12),_transparent_60%)]" />
      <div className="pointer-events-none fixed -left-32 top-20 h-72 w-72 rounded-full bg-indigo-500/20 blur-[120px]" />
      <div className="pointer-events-none fixed right-0 top-1/3 h-80 w-80 rounded-full bg-purple-500/15 blur-[120px]" />
      <div className="pointer-events-none fixed bottom-0 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-amber-500/10 blur-[100px]" />
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative flex min-h-[85vh] flex-col items-center justify-center px-6 pt-24 text-center">
        <div
          className="relative mb-8 h-32 w-32 overflow-hidden rounded-3xl bg-white/10 shadow-2xl ring-1 ring-white/10 backdrop-blur"
          style={{ transform: `translateY(${scrollY * 0.15}px)` }}
        >
          <Image
            src="/logo-templo.svg"
            alt="Templo de Umbanda Luz e Fé"
            fill
            sizes="128px"
            className="object-contain"
            priority
          />
        </div>

        <h1 className="font-display text-5xl font-bold leading-tight md:text-7xl">
          Templo de Umbanda{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Luz e Fé
          </span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/50 md:text-xl">
          Um espaço sagrado de acolhimento, fé e caridade. Aqui praticamos a Umbanda com amor,
          respeito às tradições e dedicação à espiritualidade.
        </p>

        {/* scroll indicator */}
        <div className="mt-16 flex flex-col items-center gap-2 text-white/20 animate-bounce">
          <span className="text-[10px] uppercase tracking-[0.3em]">Saiba mais</span>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* ═══════════ NOSSA HISTÓRIA ═══════════ */}
      <section className="relative mx-auto max-w-5xl px-6 py-24">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 text-[11px] uppercase tracking-[0.3em] text-indigo-400">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Nossa História
          </div>
          <h2 className="mt-4 font-display text-4xl font-semibold text-white md:text-5xl">
            Quem Somos
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl">
            <h3 className="mb-4 text-xl font-semibold text-white">🕊️ Nossa Missão</h3>
            <p className="text-sm leading-relaxed text-white/50">
              O Templo de Umbanda Luz e Fé é um centro espiritual dedicado à prática da Umbanda,
              religião de origem brasileira que une elementos de diversas tradições espirituais.
              Nossa missão é acolher todos aqueles que buscam paz, equilíbrio e orientação espiritual,
              promovendo a caridade, o amor ao próximo e o respeito à natureza.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl">
            <h3 className="mb-4 text-xl font-semibold text-white">🙏 Nossa Prática</h3>
            <p className="text-sm leading-relaxed text-white/50">
              Realizamos sessões de giras, passes espirituais, consultas e trabalhos de caridade.
              Nossos trabalhos são guiados pelos Orixás, Caboclos, Pretos-Velhos, Erês e demais
              entidades da Umbanda, sempre com respeito, seriedade e muito amor. Todos são
              bem-vindos, independentemente de crença ou origem.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════ GALERIA DE FOTOS ═══════════ */}
      <section className="relative mx-auto max-w-6xl px-6 py-16">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-1.5 text-[11px] uppercase tracking-[0.3em] text-amber-400">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            Nosso Espaço
          </div>
          <h2 className="mt-4 font-display text-4xl font-semibold text-white md:text-5xl">
            Nosso Espaço Sagrado
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-white/40">
            Conheça o ambiente do nosso terreiro — um espaço de paz, fé e conexão espiritual em meio à natureza.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              src: IMG_ALTAR_OFERENDAS,
              alt: 'Altar com oferendas e imagens sagradas',
              caption: 'Altar Sagrado',
              desc: 'Oferendas aos Orixás e entidades',
            },
            {
              src: IMG_VELAS_JANELA,
              alt: 'Velas acesas junto à janela com vista para a natureza',
              caption: 'Velas e Luz',
              desc: 'A iluminação espiritual no terreiro',
            },
            {
              src: IMG_DEFUMADOR,
              alt: 'Defumador com fumaça sagrada no terreiro',
              caption: 'Defumação',
              desc: 'Purificação e proteção espiritual',
            },
          ].map((img) => (
            <div
              key={img.caption}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl transition-all duration-500 hover:border-amber-500/20 hover:shadow-2xl hover:shadow-amber-500/5"
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden">
                <img
                  src={img.src}
                  alt={img.alt}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  loading="lazy"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c14] via-transparent to-transparent opacity-80" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <h3 className="text-lg font-semibold text-white">{img.caption}</h3>
                <p className="mt-1 text-sm text-white/50">{img.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ VALORES ═══════════ */}
      <section className="relative mx-auto max-w-5xl px-6 py-16">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-1.5 text-[11px] uppercase tracking-[0.3em] text-purple-400">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            Nossos Pilares
          </div>
          <h2 className="mt-4 font-display text-4xl font-semibold text-white md:text-5xl">
            Valores que nos guiam
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: '✨', title: 'Fé', desc: 'Crença inabalável nos Orixás e na espiritualidade que nos guia.' },
            { icon: '❤️', title: 'Caridade', desc: 'Ajudar o próximo sem distinção é o pilar da nossa prática.' },
            { icon: '🤝', title: 'Respeito', desc: 'Acolhemos todas as pessoas, independente de suas crenças.' },
            { icon: '🌿', title: 'Natureza', desc: 'Reverenciamos e cuidamos da natureza em todos os rituais.' },
          ].map((v) => (
            <div
              key={v.title}
              className="group rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center backdrop-blur-xl transition-all duration-300 hover:border-indigo-500/20 hover:bg-white/[0.07] hover:shadow-lg hover:shadow-indigo-500/5"
            >
              <div className="mb-3 text-4xl transition-transform duration-300 group-hover:scale-110">
                {v.icon}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">{v.title}</h3>
              <p className="text-xs leading-relaxed text-white/40">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ LOCALIZAÇÃO ═══════════ */}
      <section className="relative mx-auto max-w-5xl px-6 py-16">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-[11px] uppercase tracking-[0.3em] text-emerald-400">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            Localização
          </div>
          <h2 className="mt-4 font-display text-4xl font-semibold text-white md:text-5xl">
            Onde estamos
          </h2>
        </div>

        <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-3xl">
              📍
            </div>
          </div>
          <h3 className="text-xl font-semibold text-white">Endereço</h3>
          <p className="mt-3 text-base leading-relaxed text-white/60">
            Estrada vicinal Marília x Avencas, km 7
          </p>
          <p className="text-base text-white/60">
            Sítio Alto da Serra
          </p>
          <p className="mt-1 text-sm text-white/40">Marília – SP</p>

          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href="https://www.instagram.com/umbanda_luz_e_fe/"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 backdrop-blur transition-all duration-300 hover:border-pink-500/30 hover:bg-gradient-to-r hover:from-pink-500/10 hover:to-purple-500/10 hover:shadow-lg hover:shadow-pink-500/10"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-pink-400 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <circle cx="12" cy="12" r="5" />
                <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
              </svg>
              <span className="text-sm font-semibold text-white/70 transition-colors group-hover:text-white">
                @umbanda_luz_e_fe
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="relative border-t border-white/5 px-6 py-12">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center">
          <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/10">
            <Image
              src="/logo-templo.svg"
              alt="Templo de Umbanda Luz e Fé"
              fill
              sizes="48px"
              className="object-contain"
            />
          </div>
          <p className="text-xs text-white/30">
            Templo de Umbanda Luz e Fé · Marília – SP
          </p>
          <Link
            href="/login"
            className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-semibold text-white/60 transition-all hover:border-indigo-500/30 hover:bg-indigo-500/10 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Voltar ao Login
          </Link>
          <p className="text-[10px] text-white/15">
            © {new Date().getFullYear()} Todos os direitos reservados
          </p>
        </div>
      </footer>
    </div>
  );
}
