import styles from './App.module.css';

/**
 * Legacy serve dashboard entry.
 *
 * The merged operator console now lives in apps/cockpit/web behind the Cockpit
 * Bridge. Keep this app buildable for `aiwg serve` static-file compatibility,
 * but do not mount a second Missions/Sandbox/Telemetry/Memory console here.
 */
export function App() {
  return (
    <main className={styles.app} role="main">
      <section className={styles.panel} aria-labelledby="legacy-dashboard-title">
        <p className={styles.eyebrow}>Legacy dashboard path</p>
        <h1 id="legacy-dashboard-title">AIWG Cockpit is the operator console</h1>
        <p>
          Mission Control, sandbox sessions, telemetry, memory, approvals, catalog
          exploration, and contributed actions have moved to the Cockpit surface.
        </p>
        <div className={styles.actions}>
          <code>aiwg cockpit</code>
          <a href="/api/health">Serve API health</a>
          <a href="/api/sandboxes">Sandboxes API</a>
        </div>
        <p className={styles.note}>
          This package remains only as a compatibility static bundle for
          <code> aiwg serve </code>. New UI work belongs under
          <code> apps/cockpit/web </code>.
        </p>
      </section>
    </main>
  );
}
