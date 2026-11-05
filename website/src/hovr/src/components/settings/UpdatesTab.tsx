/**
 * Updates tab: the running version, what the updater is doing, and a manual check.
 * HOVR checks on its own at startup and every 4 hours.
 */
import { useStore } from '../../store/appStore'

export function UpdatesTab() {
  const version = useStore((s) => s.version)
  const status = useStore((s) => s.updateStatus)
  const check = useStore((s) => s.checkForUpdates)
  const install = useStore((s) => s.installUpdate)

  const line =
    status.phase === 'ready'
      ? `Version ${status.version} is downloaded and ready.`
      : status.phase === 'downloading'
        ? `Downloading version ${status.version ?? ''}...`
        : status.phase === 'checking'
          ? 'Checking for updates...'
          : status.phase === 'error'
            ? 'Could not reach GitHub. Try again in a moment.'
            : 'You are on the latest version.'

  return (
    <div className="tab-body">
      <div className="tab-head">
        <div>
          <h2>Updates</h2>
          <p className="muted">HOVR checks for a new version when it starts and every 4 hours.</p>
        </div>
      </div>

      <section className="about-block upd-card">
        <div>
          <div className="upd-ver">Version {version || '…'}</div>
          <p className="muted">{line}</p>
        </div>
        {status.phase === 'ready' ? (
          <button className="btn btn-primary" onClick={() => void install()}>
            Restart to update
          </button>
        ) : (
          <button className="btn" disabled={status.phase === 'checking' || status.phase === 'downloading'} onClick={() => void check()}>
            Check for updates
          </button>
        )}
      </section>

      <section className="about-block">
        <h3>How it works</h3>
        <p className="muted">
          New versions come from the HOVR releases on GitHub. They download in the background and install when you
          choose Restart to update, or the next time you quit HOVR. Your settings are kept.
        </p>
      </section>
    </div>
  )
}
