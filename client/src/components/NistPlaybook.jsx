import React, { useState } from 'react';
import { CheckCircle2, Circle, Sparkles, Cpu, ShieldX, ThumbsUp, ThumbsDown, BookOpen, FlaskConical, Radar, RotateCcw } from 'lucide-react';
import AttackPanel from './AttackPanel';
import { PHASE_LABEL, fmtUtc } from '../lib/format';

const PHASES = Object.keys(PHASE_LABEL);
const MODE_LABEL = {
  live: { text: 'live', cls: 'bg-emerald-900 text-emerald-200 border-emerald-700' },
  replay: { text: 'recorded replay', cls: 'bg-amber-900 text-amber-200 border-amber-700' },
  fallback: { text: 'rules fallback (no AI)', cls: 'bg-slate-800 text-slate-200 border-slate-600' },
};

function StepRow({ step, role, onAction }) {
  const isAi = step.source === 'ai';
  const done = step.status === 'done';
  const rejected = step.status === 'rejected';
  const isIC = role === 'INCIDENT_COMMANDER';
  const decide = (decision) => onAction(`/steps/${step._id}/decision`, { decision });

  return (
    <li className={`rounded-md border px-2.5 py-2 ${isAi ? 'border-amber-700/70 bg-amber-950/20' : 'border-borderDark bg-slateDark/40'} ${rejected ? 'opacity-50' : ''}`}>
      <div className="flex items-start gap-2">
        <button
          onClick={() => decide(done ? 'reopen' : 'done')}
          disabled={rejected}
          title={done ? 'Reopen' : 'Mark done'}
          className="mt-0.5 shrink-0 disabled:cursor-not-allowed"
        >
          {done ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Circle className="w-4 h-4 text-slate-500 hover:text-slate-300" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className={`text-xs ${done ? 'text-slate-400 line-through' : rejected ? 'text-slate-500 line-through' : 'text-slate-100'}`}>{step.text}</div>
          <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px]">
            {isAi ? (
              <span className="px-1.5 py-0.5 rounded bg-amber-900/70 border border-amber-700 text-amber-200 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> AI-proposed · not in approved playbook
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 text-slate-300 font-mono">{step.stepId}</span>
            )}
            {step.attack?.map((a) => <span key={a} className="font-mono text-violet-300">{a}</span>)}
            {step.status === 'approved' && <span className="text-cyan-300">approved by {step.decidedBy}</span>}
            {step.status === 'rejected' && <span className="text-rose-300">rejected by {step.decidedBy}</span>}
            {done && <span className="text-emerald-300">done by {step.decidedBy} · {fmtUtc(step.decidedAt)}</span>}
          </div>
          {step.rationale && (
            <div className={`text-[11px] mt-1 flex gap-1 ${isAi ? 'text-amber-100/80' : 'text-fuchsia-200/90'}`}>
              <Sparkles className="w-3 h-3 shrink-0 mt-0.5" /> {isAi ? `Why: ${step.rationale}` : step.rationale}
            </div>
          )}
          {step.evidence?.length > 0 && (
            <div className="text-[10px] text-teal-300/80 mt-0.5">Evidence to preserve: {step.evidence.join(' · ')}</div>
          )}
        </div>
        {step.status === 'proposed' && (
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => decide('approve')}
              disabled={!isIC}
              title={isIC ? 'Approve step' : 'Only the Incident Commander can approve'}
              className="p-1 rounded border border-cyan-700 text-cyan-300 hover:bg-cyan-950 disabled:opacity-30"
            >
              <ThumbsUp className="w-3 h-3" />
            </button>
            <button
              onClick={() => decide('reject')}
              disabled={!isIC}
              title={isIC ? 'Reject step' : 'Only the Incident Commander can reject'}
              className="p-1 rounded border border-rose-800 text-rose-300 hover:bg-rose-950 disabled:opacity-30"
            >
              <ThumbsDown className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

export default function NistPlaybook({ incident, meta, role, onAction }) {
  const [loading, setLoading] = useState(false);
  const steps = incident.steps || [];
  const ai = incident.ai;
  const warnings = ai?.warnings || [];
  const rejections = warnings.filter((w) => /^(Rejected|Dropped|Discarded|Blocked|Ignored|Re-attached|Model gave|Summary contains)/.test(w));
  const notes = warnings.filter((w) => !rejections.includes(w));
  const provider = meta?.ai;

  const analyze = async () => {
    setLoading(true);
    await onAction('/analyze', {});
    setLoading(false);
  };

  const done = steps.filter((s) => s.status === 'done').length;
  const active = steps.filter((s) => s.status !== 'rejected').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" /> NIST SP 800-61 response plan
          </h2>
          <p className="text-[11px] text-slate-400 max-w-2xl">
            Steps come from the bank&apos;s approved playbooks. The AI picks the playbooks, tailors steps to this incident and may
            propose extras (flagged amber). The Incident Commander approves; every decision is sealed into the timeline.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={analyze}
            disabled={loading}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 text-xs font-semibold px-3.5 py-2 rounded-md"
          >
            {loading ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? `Analyzing on ${provider?.model || 'model'}…` : steps.length ? 'Re-analyze' : 'Analyze incident'}
          </button>
          {provider && (
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Cpu className="w-3 h-3" /> {provider.model} · {provider.onDevice ? 'on-device, no data leaves this machine' : provider.provider}
            </span>
          )}
        </div>
      </div>

      {ai?.generatedAt && (
        <div className="grid lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 border border-borderDark rounded-lg p-3 bg-slateDark/40 space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className={`px-1.5 py-0.5 rounded border ${MODE_LABEL[ai.mode]?.cls}`}>{MODE_LABEL[ai.mode]?.text}</span>
              <span className="text-slate-400">{ai.model} · {fmtUtc(ai.generatedAt)}{ai.durationMs ? ` · ${(ai.durationMs / 1000).toFixed(1)}s` : ''}</span>
              <span className="text-slate-400">· playbooks: <span className="font-mono text-slate-200">{incident.playbookIds?.join(', ')}</span> + PB-CORE</span>
            </div>
            {incident.summary && (
              <div>
                <div className="text-[10px] uppercase tracking-wide text-amber-300/80">AI-written summary · unverified, never copied into the report</div>
                <p className="text-xs text-slate-200">{incident.summary}</p>
              </div>
            )}
            {incident.observables?.length > 0 && (
              <div className="flex flex-wrap gap-1 items-center">
                <Radar className="w-3.5 h-3.5 text-slate-500" />
                {incident.observables.map((o) => (
                  <span key={o.value} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                    {o.type}: {o.value}
                  </span>
                ))}
              </div>
            )}
            {notes.length > 0 && <div className="text-[10px] text-amber-300/90">{notes.join(' · ')}</div>}
          </div>
          <div className="border border-rose-900/70 rounded-lg p-3 bg-rose-950/20">
            <div className="text-xs font-semibold text-rose-200 flex items-center gap-1.5">
              <ShieldX className="w-4 h-4" /> AI output checks: {rejections.length} item{rejections.length === 1 ? '' : 's'} caught
            </div>
            <p className="text-[10px] text-slate-400 mb-1">Anything the server could not verify was dropped before it reached the plan or report.</p>
            {rejections.length === 0 ? (
              <div className="text-[11px] text-emerald-300 flex items-center gap-1"><FlaskConical className="w-3 h-3" /> All model output passed validation.</div>
            ) : (
              <ul className="text-[11px] text-rose-100/90 space-y-0.5 max-h-40 overflow-y-auto list-disc pl-4">
                {rejections.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            )}
          </div>
        </div>
      )}

      <AttackPanel incident={incident} meta={meta} onAction={onAction} />

      {steps.length === 0 ? (
        <div className="border border-dashed border-borderDark rounded-lg p-6 text-center text-xs text-slate-400">
          No plan yet. Click <b>Analyze incident</b> to build one from the approved playbooks.
        </div>
      ) : (
        <>
          <div className="text-[11px] text-slate-400">{done}/{active} steps done</div>
          <div className="grid md:grid-cols-2 gap-3">
            {PHASES.map((phase, i) => {
              const phaseSteps = steps.filter((s) => s.phase === phase);
              return (
                <div key={phase} className="border border-borderDark rounded-lg p-3">
                  <h3 className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider mb-2">
                    {i + 1}. {PHASE_LABEL[phase]} <span className="text-slate-500 normal-case">({phaseSteps.length})</span>
                  </h3>
                  {phaseSteps.length === 0 ? (
                    <div className="text-xs text-slate-500 italic">No steps.</div>
                  ) : (
                    <ul className="space-y-1.5">
                      {phaseSteps.map((s) => <StepRow key={s._id} step={s} role={role} onAction={onAction} />)}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
