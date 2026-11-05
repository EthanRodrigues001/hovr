'use client'

import dynamic from 'next/dynamic'

/** The demo reads window and measures layout, so it only renders in the browser. */
export const NotchStage = dynamic(() => import('./NotchStage').then((m) => m.NotchStage), {
  ssr: false,
  loading: () => <div className="mx-auto h-[420px] w-full max-w-[1080px] rounded-[28px] border border-white/10 bg-[#0a0a0b]" />
})
