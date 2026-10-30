/**
 * About tab: version, update status, how to open the notch, and a plain statement
 * of what hovr touches on this machine.
 */
import { useStore } from '../../store/appStore'
import { edge } from '../../lib/edge'

export function AboutTab() {
  const version = useStore((s) => s.version)
  const update = useStore((s) => s.updateInfo)
  const installUpdate = useStore((s) => s.installUpdate)

  return (
    <div className="tab-body">
      <div className="tab-head">
        <div>
          <h2>About HOVR</h2>
          <p className="muted">Version {version || '…'}</p>
        </div>
        {update && (
          <button className="btn btn-primary" onClick={() => void installUpdate()}>
            {update.downloaded ? `Restart to update to ${update.latestVersion}` : `Update ${update.latestVersion} available`}
          </button>
        )}
      </div>

      <section className="about-block">
        <h3>Opening the notch</h3>
        <p>Hover the pill at the top of the screen, press <kbd>Alt</kbd> + <kbd>C</kbd>, or click the tray icon.</p>
      </section>

      <section className="about-block">
        <h3>What hovr touches</h3>
        <p>
          hovr reads the sign-in files that your AI tools already keep on this PC and asks each tool's own service
          for your usage. It never changes those files, never refreshes your tokens, never writes them anywhere, and
          never sends them to anyone except the service they belong to.
        </p>
        <p className="muted">Open Providers and expand a row to see exactly which file and service each one uses.</p>
      </section>

      <section className="about-block">
        <h3>Heads up</h3>
        <p className="muted">
          The usage endpoints are the same private ones each tool's own usage screen calls. They can change without
          notice; when one does, that provider shows a message instead of numbers.
        </p>
      </section>

      <div className="about-actions">
        <button className="btn btn-ghost" onClick={() => void edge.quitApp()}>
          Quit HOVR
        </button>
      </div>
    </div>
  )
}
