import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, History, Plus, Link2, Fingerprint } from 'lucide-react';
import { api } from '../api';
import { fmtUtcSeconds, ROLE_LABEL, PHASE_LABEL, shortHash } from '../lib/format';

const TYPE_STYLE = {
  INCIDENT_CREATED: 'bg-slate-700 text-slate-200',
  FACT: 'bg-indigo-800 text-indigo-100',
  NOTE: 'bg-slate-800 text-slate-300',
  AI_ANALYSIS: 'bg-fuchsia-900 text-fuchsia-200',
  AI_SUGGESTION_DISMISSED: 'bg-fuchsia-950 text-fuchsia-300',
  STEP_DECISION: 'bg-cyan-900 text-cyan-200',
  TECHNIQUE: 'bg-violet-900 text-violet-200',
  EVIDENCE_REGISTERED: 'bg-teal-900 text-teal-200',
  EVIDENCE_TRANSFER: 'bg-teal-900 text-teal-200',
  EVIDENCE_VERIFIED: 'bg-teal-900 text-teal-200',
  NOTIFICATION_SUBMITTED: 'bg-sky-900 text-sky-200',
  OBLIGATION_WAIVED: 'bg-slate-700 text-slate-200',
  REPORT_FIELD: 'bg-emerald-900 text-emerald-200',
  REPORT_FINALIZED: 'bg-emerald-800 text-emerald-100',
};

export default function AuditTimeline({ incident, onAction }) {
  const [newAction, setNewAction] = useState('');
  const [phase, setPhase] = useState('CONTAINMENT_ERADICATION_RECOVERY');
  const [verification, setVerification] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const integrity = incident.integrity;
  const statusOf = (seq) => integrity?.events?.[seq]?.status || 'ok';

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await api.get(`/incidents/${incident._id}/verify-chain`);
      // A short pause so the check is visible on stage; the real work takes milliseconds.
      await new Promise((r) => setTimeout(r, 600));
      setVerification(res.data);
    } catch {
      setVerification({ valid: false, reason: 'Verification request failed' });
    } finally {
      setVerifying(false);
    }
  };

  const handleAppend = (e) => {
    e.preventDefault();
    if (!newAction.trim()) return;
    onAction('/timeline', { action: newAction, phase });
    setNewAction('');
  };

  const shown = verification || integrity;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-slate-400" /> Sealed incident timeline
          </h2>
          <p className="text-[11px] text-slate-400 max-w-xl">
            Every event is sealed with {integrity?.algorithm} and linked to the previous seal. Editing, deleting or
            reordering any past event breaks every seal after it.
          </p>
        </div>
        <button
          onClick={handleVerify}
          disabled={verifying}
          className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-600 px-3 py-2 rounded transition"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          {verifying ? 'Re-computing every seal…' : 'Verify integrity'}
        </button>
      </div>

      <div
        className={`px-3 py-2.5 text-xs rounded border flex items-start gap-2 ${
          shown?.valid ? 'bg-emerald-950/40 border-emerald-700 text-emerald-200' : 'bg-rose-950/60 border-rose-500 text-rose-200'
        }`}
      >
        {shown?.valid ? <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" /> : <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />}
        <div className="space-y-0.5 min-w-0">
          <div className="font-semibold">
            {shown?.valid
              ? `Integrity verified: all ${shown.totalEvents} events intact`
              : `TAMPERING DETECTED: ${shown?.reason}`}
          </div>
          <div className="font-mono text-[10px] opacity-80 break-all flex items-center gap-1">
            <Fingerprint className="w-3 h-3 shrink-0" /> head seal {shown?.headHash}
          </div>
          {verification && <div className="text-[10px] opacity-70">Checked {fmtUtcSeconds(verification.checkedAt)}</div>}
        </div>
      </div>

      <form onSubmit={handleAppend} className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Log an action or observation (e.g. Blocked 203.0.113.45 at the perimeter firewall)"
          value={newAction}
          onChange={(e) => setNewAction(e.target.value)}
          className="flex-1 min-w-[16rem] bg-slateDark border border-borderDark px-3 py-2 text-xs rounded focus:outline-none focus:border-indigo-500"
        />
        <select
          value={phase}
          onChange={(e) => setPhase(e.target.value)}
          className="bg-slateDark border border-borderDark px-2 py-2 text-xs rounded text-slate-300"
        >
          {Object.entries(PHASE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 text-xs font-semibold rounded flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Seal into timeline
        </button>
      </form>

      <ol className="space-y-1.5">
        {incident.timeline.map((ev) => {
          const st = statusOf(ev.seq);
          const rowClass =
            st === 'tampered' ? 'border-rose-500 bg-rose-950/60'
              : st === 'untrusted' ? 'border-rose-800/70 bg-rose-950/25'
                : 'border-borderDark bg-slateDark/40';
          return (
            <li key={ev.seq} className={`border rounded-md px-3 py-2 ${rowClass}`}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                <span className="font-mono text-slate-500">#{ev.seq}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${TYPE_STYLE[ev.type] || 'bg-slate-800 text-slate-300'}`}>{ev.type}</span>
                <span className="font-mono text-slate-400">{fmtUtcSeconds(ev.timestamp)}</span>
                <span className="text-slate-300">{ev.actor}{ev.role ? ` · ${ROLE_LABEL[ev.role] || ev.role}` : ''}</span>
                {ev.phase && <span className="text-slate-500">· {PHASE_LABEL[ev.phase]}</span>}
                {st === 'tampered' && <span className="ml-auto text-rose-300 font-bold">✖ SEAL BROKEN: modified after recording</span>}
                {st === 'untrusted' && <span className="ml-auto text-rose-400">untrusted (after break)</span>}
              </div>
              <div className="text-sm text-slate-100 mt-0.5">{ev.action}</div>
              {ev.details?.note && <div className="text-[11px] text-slate-400">“{ev.details.note}”</div>}
              {ev.details?.awareAt && <div className="text-[11px] text-slate-400">aware at {fmtUtcSeconds(ev.details.awareAt)}</div>}
              {ev.details?.demoOffsetHours && <div className="text-[10px] text-amber-400">recorded during demo time-travel (+{ev.details.demoOffsetHours}h)</div>}
              <div className="font-mono text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                <Link2 className="w-3 h-3" /> prev {shortHash(ev.previousHash)} → seal {shortHash(ev.currentHash)}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
