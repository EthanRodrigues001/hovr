import { spawn, ChildProcess } from 'node:child_process'

export function getSystemPowerShellPath(): string {
  const systemRoot = process.env.SystemRoot || 'C:\\Windows'
  return `${systemRoot}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`
}

const SENTINEL = '__PS_DONE__'

interface QueueItem {
  command: string
  resolve: (output: string) => void
  reject: (err: Error) => void
}

class PersistentPowerShell {
  private proc: ChildProcess | null = null
  private queue: QueueItem[] = []
  private running = false
  private outputBuffer = ''
  private powershellPath: string

  constructor() {
    this.powershellPath = getSystemPowerShellPath()
    if (process.platform === 'win32') {
      this.init()
    }
  }

  private init() {
    try {
      this.proc = spawn(this.powershellPath, ['-NoProfile', '-NonInteractive', '-Command', '-'], {
        // stderr was 'ignore'. That made every PowerShell failure silent — a
        // broken script still printed the completion sentinel, so callers saw a
        // successful run with empty output and could only guess why.
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true
      })

      this.proc.stderr?.on('data', (data) => {
        const msg = data.toString().trim()
        if (msg) console.error('[PersistentPowerShell] stderr:', msg)
      })

      this.proc.stdout?.on('data', (data) => {
        this.outputBuffer += data.toString()
        if (this.outputBuffer.includes(SENTINEL)) {
          // Everything before the sentinel is this command's output.
          const output = this.outputBuffer.slice(0, this.outputBuffer.indexOf(SENTINEL)).trim()
          this.outputBuffer = ''
          this.onCommandFinished(null, output)
        }
      })

      this.proc.on('close', () => {
        this.proc = null
        this.running = false
        // Re-init after a short delay if closed unexpectedly
        setTimeout(() => {
          if (process.platform === 'win32') {
            this.init()
          }
        }, 1000)
      })

      this.proc.on('error', (err) => {
        console.error('[PersistentPowerShell] error:', err)
        this.running = false
      })
    } catch (err) {
      console.error('[PersistentPowerShell] spawn failed:', err)
    }
  }

  private onCommandFinished(err: Error | null, output = '') {
    const active = this.queue.shift()
    if (active) {
      if (err) active.reject(err)
      else active.resolve(output)
    }
    this.running = false
    this.processQueue()
  }

  /** Run a script and resolve with everything it wrote to stdout. */
  public run(script: string, timeoutMs = 3000): Promise<string> {
    return new Promise((resolve, reject) => {
      this.queue.push({ command: script, resolve, reject })
      this.processQueue()

      // Fallback timeout to prevent hanging the app if powershell hangs
      setTimeout(() => {
        const idx = this.queue.findIndex(q => q.command === script)
        if (idx !== -1) {
          const removed = this.queue.splice(idx, 1)[0]
          removed.reject(new Error('TIMEOUT'))
          this.running = false
          // Restart powershell process if it timed out to ensure it's not in a bad state
          if (this.proc) {
            this.proc.kill()
            this.proc = null
          }
          this.processQueue()
        }
      }, timeoutMs)
    })
  }

  private processQueue() {
    if (this.running || !this.proc || this.queue.length === 0) return
    this.running = true
    const active = this.queue[0]
    
    try {
      const fullCmd = `${active.command}; Write-Host "${SENTINEL}"\n`
      this.proc.stdin?.write(fullCmd, 'utf8')
    } catch (err) {
      this.onCommandFinished(err as Error)
    }
  }

  public dispose() {
    if (this.proc) {
      this.proc.kill()
      this.proc = null
    }
  }
}

export const psHost = new PersistentPowerShell()
