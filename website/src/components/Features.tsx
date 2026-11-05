import Image from 'next/image'
import { BarChart3, Bell, CalendarRange, Gauge, ScanSearch, Sparkles, TrendingDown } from 'lucide-react'
import { DetectedRow, NotificationMock, PaceMock, PillMock } from './Mocks'
import { Reveal } from './Reveal'

function Card({
  icon: Icon,
  title,
  text,
  className = '',
  children,
  bleed
}: {
  icon: typeof Gauge
  title: string
  text: string
  className?: string
  children: React.ReactNode
  /** Visual touches the card edges instead of sitting inside padding. */
  bleed?: boolean
}) {
  return (
    <Reveal className={className}>
      <div className="flex h-full flex-col overflow-hidden rounded-[26px] border border-white/8 bg-white/[0.025] transition-colors hover:bg-white/[0.04]">
        <div className="p-5 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-full bg-white/10">
              <Icon size={15} />
            </span>
            <h3 className="text-[17px] font-semibold tracking-tight">{title}</h3>
          </div>
          <p className="mt-2.5 max-w-[56ch] text-[14.5px] leading-relaxed text-white/58">{text}</p>
        </div>
        <div className={`mt-auto flex flex-1 flex-col justify-end ${bleed ? '' : 'px-3 pb-3'}`}>{children}</div>
      </div>
    </Reveal>
  )
}

/** A real piece of the app, shown at its own resolution inside a card. */
function Shot({ src, w, h, alt }: { src: string; w: number; h: number; alt: string }) {
  return (
    <div className="border-t border-white/8 bg-[#0a0a0b]">
      <Image src={src} width={w} height={h} alt={alt} sizes="(min-width: 1080px) 1040px, 100vw" className="h-auto w-full" />
    </div>
  )
}

export function Features() {
  return (
    <div className="grid gap-3 md:grid-cols-12">
      <Card
        className="md:col-span-7"
        icon={Gauge}
        title="Pace, not just a number"
        text="A white marker on each bar shows where an even spend would be right now, so you see you are burning too fast while there is still time to slow down."
      >
        <PaceMock />
      </Card>
      <Card
        className="md:col-span-5"
        icon={ScanSearch}
        title="Finds your tools by itself"
        text="It reads the sign-in files your tools already keep. No account, key or config to enter."
      >
        <DetectedRow />
      </Card>

      <Card
        className="md:col-span-4"
        icon={Sparkles}
        title="A pill that stays out of the way"
        text="Collapsed, it shows what is left on each tool as a small ring, and hides over fullscreen apps."
      >
        <PillMock />
      </Card>
      <Card
        className="md:col-span-8"
        icon={TrendingDown}
        title="Forecast"
        text="Which limits will run out before they reset, when, and how long they stay locked."
        bleed
      >
        <Shot src="/ui/forecast-list.webp" w={1030} h={400} alt="HOVR Forecast: Claude Session runs out Saturday 15:57, Codex Monthly runs out Wednesday, Claude Weekly ends at about 87%" />
      </Card>

      <Card
        className="md:col-span-7"
        icon={BarChart3}
        title="Spend"
        text="Tokens and estimated API cost per day and per model, read from your tools' local session logs."
        bleed
      >
        <Shot src="/ui/spend.webp" w={1032} h={470} alt="HOVR Spend: daily cost chart for Claude, Antigravity and Codex over 30 days" />
      </Card>
      <Card
        className="md:col-span-5"
        icon={Bell}
        title="Alerts"
        text="A Windows notification when a limit is nearly used up or will run out early. Each one shows once per window."
      >
        <div className="flex flex-1 flex-col justify-end gap-2.5">
          <NotificationMock />
          <div className="rounded-2xl border border-white/10 bg-[#202023] p-3.5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)]">
            <p className="text-[13.5px] font-semibold text-white">Codex monthly will run out early</p>
            <p className="mt-0.5 text-[12.5px] leading-snug text-white/60">At the current pace it runs out Wed Nov 11, 8 days before it resets.</p>
          </div>
        </div>
      </Card>

      <Card
        className="md:col-span-12"
        icon={CalendarRange}
        title="Timeline"
        text="Every limit window on one calendar: the one that ended, the current one, and the next as a dashed bar, plus a summary of what resets by when."
        bleed
      >
        <Shot src="/ui/timeline.webp" w={1560} h={600} alt="HOVR Timeline: Claude, Codex and Antigravity limit windows on a two-week calendar" />
      </Card>
    </div>
  )
}
