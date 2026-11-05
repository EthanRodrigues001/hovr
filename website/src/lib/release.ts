const REPO = 'EthanRodrigues001/hovr'
const FALLBACK = '1.0.4'

export interface Release {
  version: string
  url: string
  page: string
  sizeMb: number | null
}

/** Latest GitHub release, cached for an hour; falls back to a known version if the API is unreachable. */
export async function getRelease(): Promise<Release> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { next: { revalidate: 3600 } })
    if (res.ok) {
      const data = (await res.json()) as { tag_name: string; assets: { name: string; size: number; browser_download_url: string }[] }
      const asset = data.assets.find((a) => /^HOVR-Setup-.*\.exe$/.test(a.name))
      if (asset)
        return {
          version: data.tag_name.replace(/^v/, ''),
          url: asset.browser_download_url,
          page: `https://github.com/${REPO}/releases/latest`,
          sizeMb: Math.round(asset.size / 1e6)
        }
    }
  } catch {
    /* fall through */
  }
  return {
    version: FALLBACK,
    url: `https://github.com/${REPO}/releases/latest/download/HOVR-Setup-${FALLBACK}.exe`,
    page: `https://github.com/${REPO}/releases/latest`,
    sizeMb: null
  }
}
