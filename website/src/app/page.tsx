import { ArrowUpRight, Download } from 'lucide-react'
import { NotchNav } from '@/components/NotchNav'
import { Features } from '@/components/Features'
import { ToolGrid } from '@/components/Mocks'
import { Reveal } from '@/components/Reveal'
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
    description: 'Shows how much of your Claude Code, Codex, Cursor and other AI tool usage limits you have left, in a notch at the top of your Windows screen.',
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
              className="group mx-auto mb-7 inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-black py-1.5 pl-1.5 pr-3.5 text-[13px] text-white/75 shadow-[0_0_30px_rgba(255,255,255,0.08)] transition-colors hover:border-white/30 hover:text-white"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 font-semibold text-white">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#4ade80] opacity-70" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-[#4ade80]" />
                </span>
                v{release.version}
              </span>
              Free for Windows
              <ArrowUpRight size={14} className="text-white/40 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
            </a>
            <h1 className="mx-auto max-w-[820px] text-balance text-4xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
              Know what&apos;s left before your AI tools run dry.
            </h1>
            <p className="mx-auto mt-6 max-w-[620px] text-pretty text-lg leading-relaxed text-white/58">
              HOVR puts the usage limits of Claude Code, Codex, Cursor and more in a small notch at the top of your screen. Hover it to see every limit, when it resets, and which will run out first.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href={release.url}
                className="inline-flex h-12 items-center gap-2.5 rounded-full bg-white px-7 text-[15px] font-semibold text-black transition-transform hover:scale-[1.03] active:scale-95"
              >
                <Download size={18} strokeWidth={2.4} />
                Download for Windows
              </a>
              <a href={REPO} className="inline-flex h-12 items-center rounded-full border border-white/12 px-6 text-[15px] font-medium text-white/80 transition-colors hover:bg-white/8">
                View on GitHub
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
        <Section id="features" eyebrow="Features" title="Everything your tools hide behind a different screen, in one hover.">
          <Features />
        </Section>

        {/* tools */}
        <Section id="tools" eyebrow="Supported tools" title="Reads the limits your tools actually enforce.">
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
                  <Download size={16} strokeWidth={2.4} />
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
            <h2 className="mx-auto max-w-[640px] text-balance text-3xl font-semibold tracking-tight md:text-5xl">Stop finding out you are out when a request fails.</h2>
            <a
              href={release.url}
              className="mt-8 inline-flex h-12 items-center gap-2.5 rounded-full bg-white px-7 text-[15px] font-semibold text-black transition-transform hover:scale-[1.03] active:scale-95"
            >
              <Download size={18} strokeWidth={2.4} />
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
