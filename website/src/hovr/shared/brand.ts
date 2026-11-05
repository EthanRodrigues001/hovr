/**
 * Single source of truth for user-facing app identity.
 *
 * Everything that renders the product name or links to the project reads from
 * here. The fork inherited these strings scattered across ~19 files, which is
 * how three of them ended up still pointing at the upstream repository after a
 * rename. Add to this object rather than hardcoding a name or URL again.
 */
export const BRAND = {
  name: 'HOVR',

  /**
   * hovr's own GitHub repository, or `null` while none exists.
   *
   * Null is meaningful, not a placeholder to fill in blindly: repo-dependent UI
   * (feedback button, star prompt, changelog fetch) checks this and hides itself
   * rather than linking somewhere wrong. Set it once the repo is real.
   */
  repoUrl: 'https://github.com/EthanRodrigues001/hovr' as string | null
} as const

/** `owner/repo` for GitHub API calls, or null when {@link BRAND.repoUrl} is unset. */
export function repoSlug(): string | null {
  if (!BRAND.repoUrl) return null
  const m = BRAND.repoUrl.match(/github\.com\/([^/]+\/[^/]+?)(?:\.git)?\/?$/)
  return m ? m[1] : null
}
