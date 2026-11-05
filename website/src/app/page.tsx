import { ArrowUpRight } from 'lucide-react'
import { NotchNav } from '@/components/NotchNav'
import { Features } from '@/components/Features'
import { ToolGrid } from '@/components/Mocks'
import { Reveal } from '@/components/Reveal'
import { WindowsIcon } from '@/components/WindowsIcon'
import { NotchStage } from '@/components/Stage'
import { getRelease } from '@/lib/release'
import { REPO, SITE_URL } from '@/lib/site'


function Section({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mx-auto w-full max-w-[1080px] scroll-mt-24 px-5 py-12 md:py-16">
      <Reveal>
        <p className="mb-3 text-[13px] font-medium uppercase tracking-[0.14em] text-white/40">{eyebrow}</p>
        <h2 className="max-w-[720px] text-balance text-3xl font-semibold tracking-tight md:text-5xl">{title}</h2>
      </Reveal>
      <div className="mt-8">{children}</div>
    </section>
  )
}

export default async function Home() {
  const release = await getRelease()
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'HOVR',
    url: SITE_URL,
    description: 'A live Dynamic Island for Windows that shows how much of your Claude Code, Codex, Cursor and other AI tool usage limits you have left.',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Windows',
    softwareVersion: release.version,
    downloadUrl: release.url,
    license: 'https://www.apache.org/licenses/LICENSE-2.0',
    image: `${SITE_URL}/opengraph-image.png`,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    author: { '@type': 'Person', name: 'Ethan Rodrigues', url: 'https://github.com/EthanRodrigues001' }
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\u003c') }} />
      <NotchNav downloadUrl={release.url} />
      <main id="top">
        {/* hero */}
        <section className="relative overflow-hidden px-5 pb-8 pt-32 text-center md:pt-40">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[560px] [mask-image:linear-gradient(to_bottom,black,transparent)] bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:56px_56px]" />
          <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[900px] -translate-x-1/2 bg-[radial-gradient(ellipse_50%_100%_at_50%_0%,rgba(255,255,255,0.16),transparent_70%)]" />
          <Reveal>
            <a
              href={release.page}
              className="group mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] py-[3px] pl-[3px] pr-2.5 text-[12px] text-white/65 transition-colors hover:border-white/30 hover:text-white"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2 py-0.5 text-[11.5px] font-semibold text-white">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#4ade80] opacity-70" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-[#4ade80]" />
                </span>
                v{release.version}
              </span>
              Free for Windows
              <ArrowUpRight size={12} className="text-white/40 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
            </a>
            <h1 className="mx-auto max-w-[820px] text-balance text-4xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
              A Dynamic Island for your AI limits.
            </h1>
            <p className="mx-auto mt-6 max-w-[620px] text-pretty text-lg leading-relaxed text-white/58">
              Windows never got one, so we built it. A live little notch on your screen shows what&apos;s left on Claude Code, Codex, Cursor and more. Hover to see when each limit resets and which one runs dry first.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href={release.url}
                className="inline-flex h-12 items-center gap-2.5 rounded-full bg-white px-7 text-[15px] font-semibold text-black transition-transform hover:scale-[1.03] active:scale-95"
              >
                <WindowsIcon size={18} />
                Download for Windows
              </a>
              <a href={REPO} className="group inline-flex h-12 items-center gap-2 px-3 text-[15px] font-medium text-white/65 transition-colors hover:text-white">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.83 1.18 3.09 0 4.42-2.7 5.4-5.27 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"/></svg>
                <span className="underline decoration-white/25 underline-offset-[5px] transition-colors group-hover:decoration-white">View on GitHub</span>
                <ArrowUpRight size={14} className="text-white/35 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
              </a>
            </div>
            <p className="mt-4 text-[13px] text-white/38">
              Windows x64 · installs for your account, no admin rights{release.sizeMb ? ` · ${release.sizeMb} MB` : ''}
            </p>
          </Reveal>
        </section>

        {/* live demo */}
        <section id="demo" className="scroll-mt-24 px-5 pb-10">
          <NotchStage />
        </section>

        {/* features */}
        <Section id="features" eyebrow="Features" title="One hover. Every limit your tools hide.">
          <Features />
        </Section>

        {/* tools */}
        <Section id="tools" eyebrow="Supported tools" title="Plugs into the tools you already use.">
          <Reveal>
            <ToolGrid />
            <p className="mt-5 max-w-[640px] text-[14px] leading-relaxed text-white/45">
              Claude Code, Codex, Cursor, Antigravity, Grok and OpenCode show live limits. Muse, Pi, Fx, Devin, Droid, Copilot and Gemini CLI are detected, but have no usage source yet.
            </p>
          </Reveal>
        </Section>

        {/* install */}
        <Section id="install" eyebrow="Install" title="Two steps, no admin rights.">
          <div className="grid gap-4 md:grid-cols-2">
            <Reveal>
              <div className="h-full rounded-[26px] border border-white/8 bg-white/[0.025] p-6">
                <ol className="space-y-5 text-[15px] text-white/70">
                  <li className="flex gap-4">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-[13px] font-semibold text-black">1</span>
                    <span>
                      Download <code className="rounded bg-white/10 px-1.5 py-0.5 text-[13px]">HOVR-Setup-{release.version}.exe</code>.
                    </span>
                  </li>
                  <li className="flex gap-4">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-[13px] font-semibold text-black">2</span>
                    <span>Run it and press Install. HOVR opens when it finishes.</span>
                  </li>
                </ol>
                <a
                  href={release.url}
                  className="mt-7 inline-flex h-11 items-center gap-2 rounded-full bg-white px-6 text-[14px] font-semibold text-black transition-transform hover:scale-[1.03] active:scale-95"
                >
                  <WindowsIcon size={16} />
                  Download for Windows
                </a>
                <p className="mt-4 text-[13px] text-white/40">
                  Open it by hovering the pill at the top of the screen, pressing <kbd className="rounded bg-white/10 px-1.5 py-0.5">Alt</kbd> + <kbd className="rounded bg-white/10 px-1.5 py-0.5">C</kbd>, or clicking the tray icon.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="h-full rounded-[26px] border border-amber-300/20 bg-amber-300/[0.04] p-6">
                <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-amber-200/70">Heads up</p>
                <h3 className="mt-2 text-lg font-semibold">Windows may warn you</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-white/58">
                  The installer is not code-signed yet, so SmartScreen may say &quot;Windows protected your PC&quot;. Choose <b className="text-white/85">More info</b>, then <b className="text-white/85">Run anyway</b>.
                </p>
                <p className="mt-4 text-[15px] leading-relaxed text-white/58">
                  HOVR checks for updates every few hours and installs them when you quit, so you only do this once.
                </p>
              </div>
            </Reveal>
          </div>
        </Section>

        {/* privacy */}
        <Section id="privacy" eyebrow="Privacy" title="Your sign-ins stay on your PC.">
          <Reveal>
            <ul className="grid gap-3 text-[15px] text-white/62 md:grid-cols-2">
              {[
                'HOVR reads sign-in files your tools already keep and asks each tool’s own service for your usage. It never modifies those files.',
                'No analytics and no telemetry. Your usage is not sent anywhere but to the service it belongs to.',
                'An expired sign-in is not renewed: HOVR tells you to open that tool once. Antigravity is the one exception, using a short-lived token kept in memory only.',
                'Other network calls: an update check against GitHub, and an optional daily download of a public price list for cost estimates.'
              ].map((t) => (
                <li key={t} className="rounded-[22px] border border-white/8 bg-white/[0.025] p-5 leading-relaxed">
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>
        </Section>

        {/* final cta */}
        <section className="px-5 pb-24 text-center">
          <Reveal>
            <h2 className="mx-auto max-w-[640px] text-balance text-3xl font-semibold tracking-tight md:text-5xl">Know before the request fails.</h2>
            <a
              href={release.url}
              className="mt-8 inline-flex h-12 items-center gap-2.5 rounded-full bg-white px-7 text-[15px] font-semibold text-black transition-transform hover:scale-[1.03] active:scale-95"
            >
              <WindowsIcon size={18} />
              Download HOVR {release.version}
            </a>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-white/8 px-5 py-10 text-[13px] text-white/40">
        <div className="mx-auto flex max-w-[1080px] flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <p>
            HOVR is open source under the{' '}
            <a className="underline underline-offset-4 hover:text-white" href={`${REPO}/blob/main/LICENSE`}>
              Apache License 2.0
            </a>
            . Started as a fork of Edge-Drop. Not affiliated with the tools it reads.
          </p>
          <nav className="flex gap-5">
            <a className="hover:text-white" href={REPO}>GitHub</a>
            <a className="hover:text-white" href={`${REPO}/releases`}>Releases</a>
            <a className="hover:text-white" href={`${REPO}/issues`}>Issues</a>
          </nav>
        </div>
      </footer>
    </>
  )
}
