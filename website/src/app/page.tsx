import { BarChart3, Bell, Download, EyeOff, Gauge, Hourglass, Sparkles, TrendingDown } from 'lucide-react'
import { NotchNav } from '@/components/NotchNav'
import { PaceMock, PillMock, ToolGrid } from '@/components/Mocks'
import { Reveal } from '@/components/Reveal'
import { NotchStage } from '@/components/Stage'
import { getRelease } from '@/lib/release'

const REPO = 'https://github.com/EthanRodrigues001/hovr'

function Section({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mx-auto w-full max-w-[1080px] scroll-mt-24 px-5 py-20 md:py-28">
      <Reveal>
        <p className="mb-3 text-[13px] font-medium uppercase tracking-[0.14em] text-white/40">{eyebrow}</p>
        <h2 className="max-w-[720px] text-balance text-3xl font-semibold tracking-tight md:text-5xl">{title}</h2>
      </Reveal>
      <div className="mt-12">{children}</div>
    </section>
  )
}

function Card({ icon: Icon, title, children, wide }: { icon: typeof Gauge; title: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <Reveal className={wide ? 'md:col-span-2' : ''}>
      <div className="h-full rounded-[26px] border border-white/8 bg-white/[0.025] p-6 transition-colors hover:bg-white/[0.04]">
        <div className="mb-4 flex size-9 items-center justify-center rounded-full bg-white/8">
          <Icon size={17} />
        </div>
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        <div className="mt-2 text-[15px] leading-relaxed text-white/58">{children}</div>
      </div>
    </Reveal>
  )
}

export default async function Home() {
  const release = await getRelease()
  return (
    <>
      <NotchNav downloadUrl={release.url} />
      <main id="top">
        {/* hero */}
        <section className="relative overflow-hidden px-5 pb-10 pt-36 text-center md:pt-44">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,rgba(255,255,255,0.09),transparent_70%)]" />
          <Reveal>
            <p className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[13px] text-white/65">
              <span className="size-1.5 rounded-full bg-[#4ade80]" />
              Version {release.version} · free for Windows
            </p>
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
          <div className="grid gap-4 md:grid-cols-2">
            <Card icon={Gauge} title="Pace, not just a number" wide>
              <div className="grid items-center gap-6 md:grid-cols-2">
                <p>
                  A white marker on each bar shows where an even spend would be right now. You see you are burning too fast while there is still time to slow down, with a warning when a limit will run out before it resets.
                </p>
                <PaceMock />
              </div>
            </Card>
            <Card icon={Sparkles} title="A pill that stays out of the way">
              <p className="mb-5">The collapsed notch shows what is left on the limit you will hit first, as a small ring. It hides over fullscreen apps.</p>
              <PillMock />
            </Card>
            <Card icon={EyeOff} title="Finds your tools by itself">
              It reads the sign-in files your tools already keep, so there is no account, key or config to enter. Detected tools appear the moment they are signed in.
            </Card>
            <Card icon={TrendingDown} title="Forecast">
              Which limits will run out before they reset, when, and how long they stay locked.
            </Card>
            <Card icon={BarChart3} title="Spend">
              Tokens and estimated API cost per day and per model, read from your tools&apos; local session logs.
            </Card>
            <Card icon={Hourglass} title="Timeline">
              Every limit window on one time axis, with the next window as a dashed bar and a &quot;resets by when&quot; summary.
            </Card>
            <Card icon={Bell} title="Alerts">
              A Windows notification when a limit is nearly used up or will run out early. Each alert shows once per window.
            </Card>
          </div>
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
