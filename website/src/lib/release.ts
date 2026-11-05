const REPO = 'EthanRodrigues001/hovr'
const FALLBACK = '1.0.4'

export interface Release {
  version: string
  url: string
  page: string
  sizeMb: number | null
}

/** Latest GitHub release, refreshed at most every 10 minutes; if the API is unreachable the button opens the latest release page. */
export async function getRelease(): Promise<Release> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { next: { revalidate: 600 }, headers: { Accept: 'application/vnd.github+json', ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) } })
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
    url: `https://github.com/${REPO}/releases/latest`,
    page: `https://github.com/${REPO}/releases/latest`,
    sizeMb: null
  }
}
