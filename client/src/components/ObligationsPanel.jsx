import React, { useState } from 'react';
import { MessageSquareWarning, AlarmClock, AlertTriangle, CheckCircle2, ExternalLink, Hourglass, Scale, Send, ShieldOff, Eye } from 'lucide-react';
import { fmtCountdown, fmtUtc, ROLE_LABEL } from '../lib/format';
import TeamsCardPreview from './TeamsCardPreview';

const HOUR = 3600e3;

function liveTier(remainingMs, totalMs) {
  if (remainingMs <= 0) return 'overdue';
  const frac = totalMs > 0 ? remainingMs / totalMs : 0;
  if (frac < 0.25 || remainingMs < HOUR) return 'urgent';
  if (frac < 0.5) return 'warning';
  return 'ok';
}

const TIER_STYLE = {
  ok: { card: 'border-emerald-700/60 bg-emerald-950/30', text: 'text-emerald-300', bar: 'bg-emerald-500' },
  warning: { card: 'border-amber-600/70 bg-amber-950/30', text: 'text-amber-300', bar: 'bg-amber-500' },
  urgent: { card: 'border-rose-500/80 bg-rose-950/40', text: 'text-rose-300', bar: 'bg-rose-500' },
  overdue: { card: 'border-rose-500 bg-rose-950/70 animate-pulse-slow', text: 'text-rose-200', bar: 'bg-rose-600' },
};

function TriggeredBy({ ob }) {
  const t = ob.triggeredBy;
  if (!t) return null;
  const anchorLabel = ob.anchor?.kind === 'submission' ? ob.anchor.label : null;
  return (
    <div className="text-[11px] text-slate-400 leading-snug">
      {anchorLabel ? (
        <>Started by <span className="text-slate-200">{anchorLabel}</span></>
      ) : (
        <>
          Started by <span className="text-slate-200">{t.actor}</span> ({ROLE_LABEL[t.role] || t.role}) confirming{' '}
          <span className="text-slate-200">“{ob.anchor?.label || t.label || t.key}”</span> · event #{ob.anchor?.fact?.seq ?? t.seq}
        </>
      )}
      {ob.startedAt && <> · aware {fmtUtc(ob.startedAt)}</>}
    </div>
  );
}

function ObligationCard({ ob, effectiveNow, role, onSubmit, onWaive }) {
  const [showWhy, setShowWhy] = useState(false);
  const running = ob.status === 'running';
  const remaining = running ? new Date(ob.deadline).getTime() - effectiveNow : 0;
  const tier = running ? liveTier(remaining, ob.totalMs) : null;
  const style = tier ? TIER_STYLE[tier] : null;
  const pct = running ? Math.min(100, Math.max(0, 100 - (remaining / ob.totalMs) * 100)) : 0;
  const canSubmit = ['INCIDENT_COMMANDER', 'DPO', 'LEGAL'].includes(role);
  const canWaive = ob.waivable && ['DPO', 'LEGAL'].includes(role);

  const cardClass =
    ob.status === 'submitted' ? 'border-sky-800/60 bg-sky-950/20'
      : ob.status === 'waived' ? 'border-slate-600 bg-slate-900/40'
        : ob.status === 'asap' ? 'border-amber-600/70 bg-amber-950/20'
          : ob.status === 'waiting' ? 'border-borderDark bg-slateDark/40'
            : style.card;

  return (
    <div className={`border rounded-lg p-3 transition-colors ${cardClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 text-slate-200">
              {ob.regulationId}
            </span>
            <span className="text-sm font-semibold text-white">{ob.label}</span>
            {ob.verify && (
              <span title={ob.verify} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/50 border border-amber-700 text-amber-300 cursor-help">
                verify
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{ob.regulator}</div>
        </div>

        <div className="text-right shrink-0">
          {running && (
            <>
              <div className={`font-mono text-lg font-bold tabular-nums ${style.text}`}>{fmtCountdown(remaining)}</div>
              <div className="text-[11px] text-slate-400">due {fmtUtc(ob.deadline)} · {ob.rule}</div>
            </>
          )}
          {ob.status === 'asap' && <div className="text-amber-300 text-sm font-semibold">{ob.deadlineText}</div>}
          {ob.status === 'waiting' && (
            <div className="text-slate-400 text-xs flex items-center gap-1 justify-end"><Hourglass className="w-3.5 h-3.5" /> waiting for {ob.waitingFor?.join(' / ')}</div>
          )}
          {ob.status === 'submitted' && (
            <div className={`text-sm font-semibold flex items-center gap-1 justify-end ${ob.onTime === false ? 'text-rose-300' : 'text-sky-300'}`}>
              <CheckCircle2 className="w-4 h-4" /> Submitted {ob.onTime === false ? 'LATE' : ob.onTime ? 'on time' : ''}
            </div>
          )}
          {ob.status === 'waived' && <div className="text-slate-300 text-sm font-semibold flex items-center gap-1 justify-end"><ShieldOff className="w-4 h-4" /> Not required (documented)</div>}
        </div>
      </div>

      {running && (
        <div className="h-1.5 rounded bg-slate-800 mt-2 overflow-hidden">
          <div className={`h-full ${style.bar} transition-all`} style={{ width: `${pct}%` }} />
        </div>
      )}

      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <TriggeredBy ob={ob} />
          {ob.status === 'submitted' && (
            <div className="text-[11px] text-slate-400">
              Recorded by {ob.submission.actor} at {fmtUtc(ob.submission.at)}{ob.submission.reference ? ` · ref ${ob.submission.reference}` : ''}
            </div>
          )}
          {ob.status === 'waived' && (
            <div className="text-[11px] text-slate-400">
              {ob.waiver.actor} ({ROLE_LABEL[ob.waiver.role]}): “{ob.waiver.justification}”
            </div>
          )}
          <button onClick={() => setShowWhy((v) => !v)} className="text-[11px] text-indigo-300 hover:text-indigo-200 flex items-center gap-1">
            <Scale className="w-3 h-3" /> {ob.citation}
          </button>
        </div>
        {(running || ob.status === 'asap') && (
          <div className="flex gap-1.5 shrink-0">
            {canWaive && (
              <button onClick={() => onWaive(ob)} className="text-[11px] px-2 py-1 rounded border border-slate-600 text-slate-300 hover:bg-slate-800">
                Not required…
              </button>
            )}
            <button
              onClick={() => onSubmit(ob)}
              disabled={!canSubmit}
              title={canSubmit ? 'Record that this notification was sent' : 'Only Incident Commander, DPO or Legal can record a submission'}
              className="text-[11px] px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <Send className="w-3 h-3" /> Mark submitted
            </button>
          </div>
        )}
      </div>

      {showWhy && (
        <div className="mt-2 text-[11px] border-t border-borderDark pt-2 space-y-1 text-slate-300">
          <div><span className="text-slate-500">In plain English:</span> {ob.plain}</div>
          <div><span className="text-slate-500">Legal text:</span> <em>“{ob.wording}”</em></div>
          {ob.candidates?.length > 1 && (
            <div>
              <span className="text-slate-500">Deadline = earliest of:</span>{' '}
              {ob.candidates.map((c) => `${c.rule} after ${c.anchor}${c.deadline ? ` (${fmtUtc(c.deadline)})` : ' (not started)'}`).join(' · ')}
            </div>
          )}
          {ob.waivable && <div><span className="text-slate-500">Exception:</span> {ob.waivable}</div>}
          <a href={ob.url} target="_blank" rel="noreferrer" className="text-indigo-300 inline-flex items-center gap-1">
            Source <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );
}

export default function ObligationsPanel({ incident, meta, now, role, onAction, prompt, toast }) {
  const [teams, setTeams] = useState(false);
  const offsetMs = (incident.clock?.demoOffsetHours || 0) * HOUR;
  const effectiveNow = now + offsetMs;
  const obligations = incident.obligations || [];
  const active = obligations.filter((o) => o.status !== 'not_triggered');
  const watching = obligations.filter((o) => o.status === 'not_triggered');
  const overdue = active.filter((o) => o.status === 'running' && new Date(o.deadline).getTime() <= effectiveNow).length;

  const submit = async (ob) => {
    const values = await prompt({
      title: `Record submission: ${ob.regulationId} – ${ob.label}`,
      help: 'Watchman never sends anything to a regulator itself. A human sends the notification, then records it here.',
      confirmLabel: 'Record submission',
      fields: [{ name: 'reference', label: 'Reference / ticket number (optional)', placeholder: 'e.g. DPC-2026-10432', optional: true }],
    });
    if (!values) return;
    onAction(`/obligations/${ob.stageId}/submit`, values);
  };
  const waive = async (ob) => {
    const values = await prompt({
      title: `Decide NOT to notify: ${ob.regulationId} – ${ob.label}`,
      help: `Allowed exception: ${ob.waivable} This decision is sealed into the audit trail with your name.`,
      confirmLabel: 'Record decision',
      fields: [{
        name: 'justification',
        label: 'Written justification (min 20 characters)',
        placeholder: 'e.g. Data was strongly encrypted and the key was not compromised, so the breach is unlikely to result in a risk to individuals.',
        multiline: true,
        minLength: 20,
      }],
    });
    if (!values) return;
    onAction(`/obligations/${ob.stageId}/waive`, values);
  };

  return (
    <section className="bg-panelDark border border-borderDark rounded-xl p-4 h-full">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <AlarmClock className="w-5 h-5 text-rose-400" /> Who must we tell, and by when?
          </h2>
          <p className="text-[11px] text-slate-400">
            Deterministic rule engine · rule pack {meta?.ruleset?.version} (reviewed {meta?.ruleset?.reviewedAt}) · {meta?.profile?.name}
          </p>
        </div>
        <div className="text-right text-xs space-y-1">
          <div className="text-slate-300"><span className="text-white font-bold">{active.filter((o) => o.status === 'running').length}</span> clocks running</div>
          {overdue > 0 && <div className="text-rose-300 font-bold">{overdue} OVERDUE</div>}
          {active.some((o) => o.status === 'running') && (
            <button onClick={() => setTeams(true)} className="text-[11px] px-2 py-0.5 rounded border border-[#5b5fc7] text-[#a6a9f5] hover:bg-[#5b5fc7]/20 inline-flex items-center gap-1">
              <MessageSquareWarning className="w-3 h-3" /> Teams alert
            </button>
          )}
        </div>
      </div>

      {incident.computedFromUntrustedData && (
        <div className="mb-3 text-xs border border-rose-600 bg-rose-950/60 text-rose-200 rounded p-2 flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Audit chain integrity is broken: these deadlines are computed from timeline data that may have been altered. Do not rely on them until the chain is investigated.
        </div>
      )}

      {active.length === 0 ? (
        <div className="border border-dashed border-borderDark rounded-lg p-5 text-center">
          <AlarmClock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <div className="text-sm text-slate-300 font-medium">No regulatory clock is running yet</div>
          <div className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Clocks don&apos;t start when an alert fires. They start when a responsible person confirms a legal trigger,
            e.g. &ldquo;personal-data breach confirmed&rdquo; (GDPR: &ldquo;72 hours after having become aware&rdquo;). Use the Key determinations panel.
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {active.map((ob) => (
            <ObligationCard key={ob.stageId} ob={ob} effectiveNow={effectiveNow} role={role} onSubmit={submit} onWaive={waive} />
          ))}
        </div>
      )}

      {watching.length > 0 && (
        <details className="mt-3 text-xs text-slate-400">
          <summary className="cursor-pointer select-none flex items-center gap-1.5 hover:text-slate-200">
            <Eye className="w-3.5 h-3.5" /> Watching {watching.length} more obligations (not triggered)
          </summary>
          <ul className="mt-2 space-y-1">
            {watching.map((o) => (
              <li key={o.stageId} className="flex justify-between gap-3">
                <span><span className="font-mono text-slate-300">{o.regulationId}</span> {o.label}</span>
                <span className="text-slate-500 text-right">needs: {o.missingFacts.map((m) => m.label).join(', ')}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="mt-3 text-[10px] text-slate-500 leading-snug">{meta?.ruleset?.disclaimer}</p>
      {teams && <TeamsCardPreview incident={incident} effectiveNow={effectiveNow} onClose={() => setTeams(false)} toast={toast} />}
    </section>
  );
}
