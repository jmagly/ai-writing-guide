import { useEffect, useState } from 'react';
import { api } from '../api';
import { fmtId } from '../util';
import type { ExecutorCapabilities, Instance, Loadout } from '../types';

type Runtime = 'host' | 'docker' | 'qemu';

const DOCKER_IMAGE_OPTIONS = [
  { value: 'agentic/codex:latest', label: 'Codex' },
  { value: 'agentic/claude:latest', label: 'Claude' },
  { value: 'agentic/opencode:latest', label: 'OpenCode' },
  { value: 'agentic/automation-control:latest', label: 'Automation control' },
  { value: 'agentic/agent:dev', label: 'Agent dev base' },
];

const FALLBACK_LOADOUTS: Loadout[] = [
  { id: 'host-tools', label: 'host-tools', description: 'Host tools', runtimes: ['host'] },
  { id: 'agentic-dev', label: 'agentic-dev', description: 'Full development environment', runtimes: ['docker', 'container', 'qemu', 'vm'] },
  { id: 'claude-only', label: 'claude-only', description: 'Claude provider loadout', runtimes: ['docker', 'container', 'qemu', 'vm'] },
  { id: 'codex-only', label: 'codex-only', description: 'Codex provider loadout', runtimes: ['docker', 'container', 'qemu', 'vm'] },
  { id: 'opencode-only', label: 'opencode-only', description: 'OpenCode provider loadout', runtimes: ['docker', 'container', 'qemu', 'vm'] },
  { id: 'full-suite', label: 'full-suite', description: 'Multi-provider tool suite', runtimes: ['qemu', 'vm'] },
];

// A fresh, collision-resistant instance name per launch. The executor keys
// agents by instance name, so two instances sharing a name (e.g. a Docker
// container and a VM both named `cockpit-<ts>`) register the same agent id and
// shadow each other — the second launch silently knocks the first offline.
// Date.now() alone collides within a page session (the name was generated once
// at mount and reused); add random entropy and regenerate on every open/launch.
const genInstanceName = () =>
  `cockpit-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.slice(0, 32);

export function LaunchInstanceModal({
  open,
  onClose,
  onLaunched,
}: {
  open: boolean;
  onClose: () => void;
  onLaunched: (instanceId?: string, openSession?: boolean, operationId?: string) => Promise<void> | void;
}) {
  const [runtime, setRuntime] = useState<Runtime>('host');
  const [name, setName] = useState(genInstanceName);
  const [loadout, setLoadout] = useState('host-tools');
  const [loadouts, setLoadouts] = useState<Loadout[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [hostId, setHostId] = useState('');
  const [executorCaps, setExecutorCaps] = useState<ExecutorCapabilities | null>(null);
  const [image, setImage] = useState('agentic/codex:latest');
  const [customImage, setCustomImage] = useState('');
  const [profile, setProfile] = useState('');
  const [sshKey, setSshKey] = useState('');
  const [mounts, setMounts] = useState('');
  const [openSession, setOpenSession] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState('');

  useEffect(() => {
    if (!open) return;
    // Fresh name every time the picker opens, so back-to-back launches (e.g.
    // Docker then VM) never collide on the executor's name-keyed agent registry.
    setName(genInstanceName());
    let cancelled = false;
    Promise.all([
      api<{ loadouts: Loadout[] }>('/api/loadouts').catch(() => ({ loadouts: [] as Loadout[] })),
      api<{ instances: Instance[] }>('/api/inventory').catch(() => ({ instances: [] as Instance[] })),
      api<ExecutorCapabilities>('/api/executor/capabilities').catch(() => null),
    ])
      .then(([lo, inv, caps]) => {
        if (cancelled) return;
        setLoadouts(lo.loadouts ?? []);
        setInstances(inv.instances ?? []);
        setExecutorCaps(caps);
        const firstHost = (inv.instances ?? []).find(isUsableHost);
        setHostId((current) => current || firstHost?.id || '');
      });
    return () => { cancelled = true; };
  }, [open]);

  if (!open) return null;

  const chooseRuntime = (next: Runtime) => {
    setRuntime(next);
    if (next === 'host') {
      setLoadout('host-tools');
    } else if (next === 'docker') {
      setLoadout('agentic-dev');
      setImage((current) => current || 'agentic/codex:latest');
    } else {
      setLoadout('profiles/basic.yaml');
    }
  };

  const launch = async () => {
    setBusy(true); setErr(''); setResult('');
    try {
      if (runtime === 'host') {
        const host = hostTargets(instances).find((i) => i.id === hostId) ?? hostTargets(instances)[0];
        if (host) {
          setResult(openSession
            ? `Using host target ${host.launch_context?.name ?? fmtId(host.id)}; starting session...`
            : `Using host target ${host.launch_context?.name ?? fmtId(host.id)}`);
          await onLaunched(host.id, openSession);
          if (openSession) onClose();
          return;
        }
        if (!executorCaps?.host_runtime_enabled) {
          throw new Error('Host runtime is not enabled on this executor. Enable the host supervisor or choose Docker container.');
        }
        const body = {
          name: name.replace(/[^a-z0-9-]/g, '-').replace(/^-+/, 'a-').slice(0, 63),
          runtime: 'host',
          loadout: 'host-tools',
          start: true,
        };
        const op = await api<{ id?: string; instance_id?: string; instanceId?: string; operation?: { id?: string }; result?: { instance_id?: string; instanceId?: string } }>('/api/instances', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });
        const instanceId = op.instance_id ?? op.instanceId ?? op.result?.instance_id ?? op.result?.instanceId;
        const operationId = op.id ?? op.operation?.id;
        setResult(openSession
          ? `Host launch accepted: ${instanceId ?? operationId ?? 'operation pending'}; waiting for session...`
          : `Host launch accepted: ${instanceId ?? operationId ?? 'operation pending'}`);
        await onLaunched(instanceId, openSession, operationId);
        if (openSession) onClose();
        else setName(genInstanceName());
        return;
      }
      const body: Record<string, unknown> = {
        name: name.replace(/[^a-z0-9-]/g, '-').replace(/^-+/, 'a-').slice(0, 63),
        runtime,
        start: true,
      };
      if (loadout) body.loadout = loadout;
      if (profile) body.profile = profile;
      if (runtime === 'docker') {
        body.image = image === '__custom__' ? customImage.trim() : image;
        body.agentshare = true;
      }
      if (runtime === 'qemu') {
        body.agentshare = true;
        if (sshKey.trim()) body.ssh_key = sshKey.trim();
      }
      if (runtime === 'docker' && mounts.trim()) body.mounts = mounts.split('\n').map((m) => m.trim()).filter(Boolean);
      const op = await api<{ id?: string; instance_id?: string; instanceId?: string; operation?: { id?: string }; result?: { instance_id?: string; instanceId?: string } }>('/api/instances', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const instanceId = op.instance_id ?? op.instanceId ?? op.result?.instance_id ?? op.result?.instanceId;
      const operationId = op.id ?? op.operation?.id;
      setResult(openSession
        ? `Launch accepted: ${instanceId ?? operationId ?? 'operation pending'}; waiting for session...`
        : `Launch accepted: ${instanceId ?? operationId ?? 'operation pending'}`);
      await onLaunched(instanceId, openSession, operationId);
      if (openSession) onClose();
      else setName(genInstanceName()); // modal stays open — next launch gets a fresh, non-colliding name
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="launch-instance-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="launch-instance-title">New instance</h2>
        <p className="hint">Create a runtime target. Existing instances and sessions keep running.</p>
        {err && <p className="err">{err}</p>}
        {result && <p className="hint ok-text">{result}</p>}
        <div className="form-grid">
          <label htmlFor="li-runtime">Runtime</label>
          <select id="li-runtime" value={runtime} onChange={(e) => chooseRuntime(e.target.value as Runtime)}>
            <option value="host">Host</option>
            <option value="docker">Docker container</option>
            <option value="qemu">VM / QEMU</option>
          </select>
          {runtime === 'host' ? (
            <>
              <label htmlFor="li-host-target">Host target</label>
              <select id="li-host-target" value={hostId} onChange={(e) => setHostId(e.target.value)}>
                {hostTargets(instances).map((i) => <option key={i.id} value={i.id}>{i.launch_context?.name ?? fmtId(i.id)} - {i.loadout}</option>)}
                {!hostTargets(instances).length && executorCaps?.host_runtime_enabled && <option value="">Local host runtime - create new</option>}
                {!hostTargets(instances).length && !executorCaps?.host_runtime_enabled && <option value="">Host runtime not enabled</option>}
              </select>
              {!hostTargets(instances).length && executorCaps?.host_runtime_enabled && (
                <>
                  <label htmlFor="li-name">Name</label>
                  <input id="li-name" value={name} onChange={(e) => setName(e.target.value)} />
                </>
              )}
            </>
          ) : (
            <>
              <label htmlFor="li-name">Name</label>
              <input id="li-name" value={name} onChange={(e) => setName(e.target.value)} />
            </>
          )}
          <label htmlFor="li-loadout">Instance loadout</label>
          {runtime === 'host' ? (
            <span className="ro">host-tools</span>
          ) : (
            <select id="li-loadout" value={loadout} onChange={(e) => setLoadout(e.target.value)}>
              {loadoutOptions(loadouts, runtime).map((l) => <option key={l.id} value={l.id}>{l.label}{l.description ? ` - ${l.description}` : ''}</option>)}
            </select>
          )}
          {runtime !== 'host' && (
            <>
              <label htmlFor="li-profile">Profile</label>
              <input id="li-profile" value={profile} onChange={(e) => setProfile(e.target.value)} placeholder="optional" />
            </>
          )}
          {runtime === 'qemu' && (
            <>
              <label htmlFor="li-ssh-key">SSH public key</label>
              <input
                id="li-ssh-key"
                value={sshKey}
                onChange={(e) => setSshKey(e.target.value)}
                placeholder="auto-detect, or ~/.ssh/agentic_ed25519.pub"
              />
            </>
          )}
          {runtime === 'docker' && (
            <>
              <label htmlFor="li-image">Container image</label>
              <div className="field-stack">
                <select id="li-image" value={image} onChange={(e) => setImage(e.target.value)}>
                  {DOCKER_IMAGE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label} - {option.value}</option>)}
                  <option value="__custom__">Custom image...</option>
                </select>
                {image === '__custom__' && (
                  <input
                    aria-label="Custom container image"
                    value={customImage}
                    onChange={(e) => setCustomImage(e.target.value)}
                    placeholder="registry.example.com/team/agent:tag"
                  />
                )}
              </div>
              <label htmlFor="li-mounts">Mounts</label>
              <textarea id="li-mounts" value={mounts} onChange={(e) => setMounts(e.target.value)} placeholder="/host/path:/container/path" />
            </>
          )}
          <label htmlFor="li-open-session">After launch</label>
          <label className="check-row">
            <input id="li-open-session" type="checkbox" checked={openSession} onChange={(e) => setOpenSession(e.target.checked)} />
            Start a session automatically when the instance is ready
          </label>
        </div>
        <div className="modal-actions">
          <button onClick={onClose} disabled={busy}>Close</button>
          <button className="cta" onClick={launch} disabled={busy || (runtime === 'host' && !hostId && !executorCaps?.host_runtime_enabled) || (runtime === 'host' && !hostId && !name.trim()) || (runtime !== 'host' && !name.trim()) || (runtime === 'docker' && image === '__custom__' && !customImage.trim())}>
            {busy ? 'Working...' : runtime === 'host' ? (openSession ? 'Start host session' : 'Use host') : openSession ? 'Create + start session' : 'Create instance'}
          </button>
        </div>
      </div>
    </div>
  );
}

function loadoutOptions(loadouts: Loadout[], runtime: Runtime) {
  if (runtime === 'host') return FALLBACK_LOADOUTS.filter((l) => l.id === 'host-tools');
  const aliases = runtime === 'docker' ? ['docker', 'container'] : runtime === 'qemu' ? ['qemu', 'vm'] : [runtime];
  const merged = [...loadouts, ...FALLBACK_LOADOUTS].reduce<Loadout[]>((acc, loadout) => {
    if (!acc.some((existing) => existing.id === loadout.id)) acc.push(loadout);
    return acc;
  }, []);
  const matching = merged.filter((l) => !l.runtimes?.length || l.runtimes.some((r) => aliases.includes(String(r).toLowerCase())));
  return matching.length ? matching : merged;
}

function hostTargets(instances: Instance[]) {
  return instances.filter(isUsableHost);
}

function isUsableHost(instance: Instance) {
  return instance.state === 'running'
    && instance.runtime_posture?.kind === 'host'
    && instance.session_backends?.some((backend) => backend.available !== false);
}
