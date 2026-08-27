import './UI2.css'

type UI2Props = {
  oldApiCount: number
  newApiCount: number
  oldApiErrors: number
  newApiErrors: number
  isTrafficRunning: boolean
  onToggleTraffic: () => void
  onReset: () => void
}

type Level = 'good' | 'warning' | 'serious' | 'critical' | 'idle'

const pct = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : null)

const fmt = (value: number) => value.toLocaleString()

const fmtRate = (value: number | null) => (value === null ? '—' : `${value.toFixed(1)}%`)

/** Status band for an error rate. Bands map to the reserved status palette. */
const levelFor = (rate: number | null): { level: Level; label: string } => {
  if (rate === null) return { level: 'idle', label: 'No data yet' }
  if (rate >= 25) return { level: 'critical', label: 'Critical' }
  if (rate >= 15) return { level: 'serious', label: 'Serious' }
  if (rate >= 5) return { level: 'warning', label: 'Elevated' }
  return { level: 'good', label: 'Healthy' }
}

/** Status is never colour alone — every badge ships an icon and a label. */
function StatusIcon({ level }: { level: Level }) {
  if (level === 'good') {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (level === 'idle') {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <circle cx="8" cy="8" r="3" fill="currentColor" />
      </svg>
    )
  }
  if (level === 'critical') {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.75" />
        <path d="M8 4.75v4.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        <circle cx="8" cy="11.75" r="1" fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M8 2.5l6 11H2l6-11z" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M8 6.75v3" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="8" cy="11.75" r="0.9" fill="currentColor" />
    </svg>
  )
}

function StatusBadge({ level, label }: { level: Level; label: string }) {
  return (
    <span className="ui2-badge" data-level={level}>
      <StatusIcon level={level} />
      {label}
    </span>
  )
}

/**
 * Meter: the fill carries severity, the track is a dimmed step of the same hue so
 * state reads across the whole bar.
 */
function Meter({ rate, level, label }: { rate: number | null; level: Level; label: string }) {
  return (
    <div
      className="ui2-meter"
      data-level={level}
      role="meter"
      aria-valuenow={rate ?? undefined}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={rate === null ? 'no data' : `${rate.toFixed(1)} percent`}
      aria-label={label}
    >
      <span className="ui2-meter-fill" style={{ width: `${Math.min(rate ?? 0, 100)}%` }} />
    </div>
  )
}

type VersionCardProps = {
  version: 'OLD' | 'NEW'
  hits: number
  errors: number
  share: number | null
  isActive: boolean
}

function VersionCard({ version, hits, errors, share, isActive }: VersionCardProps) {
  const rate = pct(errors, hits)
  const { level, label } = levelFor(rate)

  return (
    <article className="ui2-card ui2-version" data-version={version} data-active={isActive}>
      <header className="ui2-version-head">
        <h3>
          <span className="ui2-key" aria-hidden="true" />
          {version} API
        </h3>
        {isActive && <span className="ui2-live-chip">serving</span>}
      </header>

      <p className="ui2-version-rate">
        {fmtRate(rate)}
        <span>error rate</span>
      </p>

      <Meter rate={rate} level={level} label={`${version} API error rate`} />
      <StatusBadge level={level} label={label} />

      <dl className="ui2-stats">
        <div>
          <dt>Requests</dt>
          <dd>{fmt(hits)}</dd>
        </div>
        <div>
          <dt>Errors</dt>
          <dd>{fmt(errors)}</dd>
        </div>
        <div>
          <dt>Share of traffic</dt>
          <dd>{fmtRate(share)}</dd>
        </div>
      </dl>
    </article>
  )
}

function UI2({
  oldApiCount,
  newApiCount,
  oldApiErrors,
  newApiErrors,
  isTrafficRunning,
  onToggleTraffic,
  onReset,
}: UI2Props) {
  const requests = oldApiCount + newApiCount
  const errors = oldApiErrors + newApiErrors
  const errorRate = pct(errors, requests)
  const { level, label } = levelFor(errorRate)

  const oldShare = pct(oldApiCount, requests)
  const newShare = pct(newApiCount, requests)

  return (
    <div className="ui2">
      <div className="ui2-backdrop" aria-hidden="true" />

      <div className="ui2-shell">
        <header className="ui2-header">
          <div className="ui2-brand">
            <img src="/osmo.png" alt="" width={36} height={36} />
            <div>
              <h1>Guarded Rollout Console</h1>
              <p>Old vs. new API, watched in real time</p>
            </div>
          </div>

          <div className="ui2-header-meta">
            <span className="ui2-flag-chip">UI 2.0</span>
            <span className="ui2-pulse" data-running={isTrafficRunning}>
              <span className="ui2-pulse-dot" aria-hidden="true" />
              {isTrafficRunning ? 'Traffic live' : 'Idle'}
            </span>
          </div>
        </header>

        <section className="ui2-card ui2-hero" aria-labelledby="ui2-hero-label">
          <div className="ui2-hero-main">
            <p className="ui2-label" id="ui2-hero-label">
              Overall error rate
            </p>
            <p className="ui2-hero-figure" aria-live="polite">
              {fmtRate(errorRate)}
            </p>
            <StatusBadge level={level} label={label} />
            <Meter rate={errorRate} level={level} label="Overall error rate" />
          </div>

          <dl className="ui2-hero-stats">
            <div>
              <dt>Requests</dt>
              <dd>{fmt(requests)}</dd>
            </div>
            <div>
              <dt>Errors</dt>
              <dd>{fmt(errors)}</dd>
            </div>
            <div>
              <dt>Successful</dt>
              <dd>{fmt(requests - errors)}</dd>
            </div>
          </dl>
        </section>

        <section className="ui2-card ui2-console" aria-label="Traffic controls">
          <button
            type="button"
            className="ui2-reactor"
            onClick={onToggleTraffic}
            data-running={isTrafficRunning}
            aria-pressed={isTrafficRunning}
          >
            <span className="ui2-reactor-ring" aria-hidden="true" />
            <span className="ui2-reactor-face">
              <span className="ui2-reactor-glyph" aria-hidden="true">
                {isTrafficRunning ? (
                  <svg viewBox="0 0 24 24" focusable="false">
                    <rect x="7" y="6" width="3.5" height="12" rx="1.25" fill="currentColor" />
                    <rect x="13.5" y="6" width="3.5" height="12" rx="1.25" fill="currentColor" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path d="M9 6.5l9 5.5-9 5.5V6.5z" fill="currentColor" />
                  </svg>
                )}
              </span>
              <span className="ui2-reactor-text">{isTrafficRunning ? 'Stop traffic' : 'Start traffic'}</span>
            </span>
          </button>

          <div className="ui2-console-side">
            <button type="button" className="ui2-secondary" onClick={onReset}>
              <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                <path
                  d="M13 8a5 5 0 1 1-1.6-3.7M13 2.5V5h-2.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Reset counters
            </button>
            <p className="ui2-hint">
              Start traffic, then run a guarded rollout in LaunchDarkly. When the new API&rsquo;s errors spike,
              the split below swings back to OLD.
            </p>
          </div>
        </section>

        <section className="ui2-card ui2-split" aria-labelledby="ui2-split-label">
          <div className="ui2-split-head">
            <p className="ui2-label" id="ui2-split-label">
              Traffic split
            </p>
            <ul className="ui2-legend">
              <li>
                <span className="ui2-swatch" data-version="OLD" aria-hidden="true" />
                OLD API
              </li>
              <li>
                <span className="ui2-swatch" data-version="NEW" aria-hidden="true" />
                NEW API
              </li>
            </ul>
          </div>

          <div
            className="ui2-split-bar"
            role="img"
            aria-label={`Traffic split: OLD API ${fmtRate(oldShare)}, NEW API ${fmtRate(newShare)}`}
          >
            <span className="ui2-split-seg" data-version="OLD" style={{ width: `${oldShare ?? 0}%` }} />
            <span className="ui2-split-seg" data-version="NEW" style={{ width: `${newShare ?? 0}%` }} />
          </div>

          <p className="ui2-split-values">
            <span>
              OLD <strong>{fmtRate(oldShare)}</strong>
            </span>
            <span>
              NEW <strong>{fmtRate(newShare)}</strong>
            </span>
          </p>
        </section>

        <section className="ui2-versions" aria-label="Per-version detail">
          <VersionCard
            version="OLD"
            hits={oldApiCount}
            errors={oldApiErrors}
            share={oldShare}
            isActive={isTrafficRunning && oldApiCount > 0}
          />
          <VersionCard
            version="NEW"
            hits={newApiCount}
            errors={newApiErrors}
            share={newShare}
            isActive={isTrafficRunning && newApiCount > 0}
          />
        </section>

        <details className="ui2-card ui2-table">
          <summary>View as table</summary>
          <table>
            <caption className="ui2-sr-only">Requests, errors and error rate per API version</caption>
            <thead>
              <tr>
                <th scope="col">Version</th>
                <th scope="col">Requests</th>
                <th scope="col">Errors</th>
                <th scope="col">Error rate</th>
                <th scope="col">Share</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">OLD API</th>
                <td>{fmt(oldApiCount)}</td>
                <td>{fmt(oldApiErrors)}</td>
                <td>{fmtRate(pct(oldApiErrors, oldApiCount))}</td>
                <td>{fmtRate(oldShare)}</td>
              </tr>
              <tr>
                <th scope="row">NEW API</th>
                <td>{fmt(newApiCount)}</td>
                <td>{fmt(newApiErrors)}</td>
                <td>{fmtRate(pct(newApiErrors, newApiCount))}</td>
                <td>{fmtRate(newShare)}</td>
              </tr>
              <tr>
                <th scope="row">Total</th>
                <td>{fmt(requests)}</td>
                <td>{fmt(errors)}</td>
                <td>{fmtRate(errorRate)}</td>
                <td>{requests > 0 ? '100.0%' : '—'}</td>
              </tr>
            </tbody>
          </table>
        </details>
      </div>
    </div>
  )
}

export default UI2
