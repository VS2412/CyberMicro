import React from 'react';
import { Gavel, Lock, Sparkles, Check, X, Undo2 } from 'lucide-react';
import { fmtUtc, ROLE_LABEL } from '../lib/format';

/** Convert an ISO time to the value format of <input type="datetime-local"> in UTC. */
const toLocalInput = (d) => new Date(d).toISOString().slice(0, 16);

export default function FactsPanel({ incident, meta, role, actor, onAction, prompt }) {
  const catalog = meta?.facts || [];
  const facts = incident.facts || {};
  const suggestions = (incident.suggestedFacts || []).filter((s) => s.status === 'pending');
  const offsetMs = (incident.clock?.demoOffsetHours || 0) * 3600e3;

  const confirm = async (def, fromSuggestion) => {
    const values = await prompt({
      title: `Confirm: ${def.label}`,
      help: `${def.question} ${def.help} This determination is sealed into the audit trail as made by ${actor} (${ROLE_LABEL[role]}).`,
      confirmLabel: 'Confirm determination',
      fields: [
        {
          name: 'awareAt',
          label: 'When did we become aware? (UTC). Legal clocks count from this moment.',
          type: 'datetime-local',
          defaultValue: toLocalInput(Date.now() + offsetMs),
        },
        {
          name: 'note',
          label: 'Basis for this determination (optional)',
          placeholder: fromSuggestion?.rationale || 'e.g. DLP logs show 50k customer rows sent to 194.26.29.112',
          optional: true,
          multiline: true,
        },
      ],
    });
    if (!values) return;
    onAction('/facts', { key: def.key, value: true, awareAt: new Date(`${values.awareAt}:00Z`).toISOString(), note: values.note });
  };

  const retract = async (def) => {
    const values = await prompt({
      title: `Retract: ${def.label}`,
      help: 'Retracting stops any clock this fact started. The original confirmation stays in the audit trail.',
      confirmLabel: 'Retract',
      fields: [{ name: 'note', label: 'Reason', placeholder: 'e.g. Forensics confirmed the exported file contained only synthetic test data', minLength: 10, multiline: true }],
    });
    if (!values) return;
    onAction('/facts', { key: def.key, value: false, note: values.note });
  };

  return (
    <section className="bg-panelDark border border-borderDark rounded-xl p-4 h-full">
      <h2 className="text-base font-semibold text-white flex items-center gap-2">
        <Gavel className="w-5 h-5 text-indigo-400" /> Key determinations
      </h2>
      <p className="text-[11px] text-slate-400 mb-3">
        Only these human decisions can start a regulatory clock. The AI may suggest, never decide.
      </p>

      {suggestions.length > 0 && (
        <div className="mb-3 space-y-2">
          {suggestions.map((s) => {
            const def = catalog.find((f) => f.key === s.key);
            if (!def) return null;
            const allowed = def.allowedRoles.includes(role);
            return (
              <div key={s.key} className="border border-fuchsia-700/60 bg-fuchsia-950/30 rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 text-[11px] text-fuchsia-300 font-semibold uppercase tracking-wide">
                  <Sparkles className="w-3.5 h-3.5" /> {s.by === 'rules' ? 'Keyword rule suggests' : 'AI suggests'}: confirm?
                </div>
                <div className="text-sm text-white mt-0.5">{def.label}</div>
                {s.rationale && <div className="text-[11px] text-slate-300 mt-0.5">“{s.rationale}”</div>}
                <div className="flex gap-1.5 mt-2">
                  <button
                    onClick={() => confirm(def, s)}
                    disabled={!allowed}
                    title={allowed ? '' : `Only ${def.allowedRoles.map((r) => ROLE_LABEL[r]).join(' / ')}`}
                    className="text-[11px] px-2 py-1 rounded bg-fuchsia-700 hover:bg-fuchsia-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {allowed ? <Check className="w-3 h-3" /> : <Lock className="w-3 h-3" />} Confirm
                  </button>
                  <button onClick={() => onAction(`/suggested-facts/${s.key}/dismiss`, {})} className="text-[11px] px-2 py-1 rounded border border-slate-600 text-slate-300 hover:bg-slate-800 flex items-center gap-1">
                    <X className="w-3 h-3" /> Dismiss
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ul className="divide-y divide-borderDark/70">
        {catalog.map((def) => {
          const f = facts[def.key];
          const yes = f?.value === true;
          const allowed = def.allowedRoles.includes(role);
          return (
            <li key={def.key} className="py-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className={`text-sm ${yes ? 'text-white font-medium' : 'text-slate-300'}`}>{def.label}</div>
                {yes ? (
                  <div className="text-[11px] text-emerald-300">
                    YES · {f.actor} ({ROLE_LABEL[f.role] || f.role}) · aware {fmtUtc(f.awareAt)} · event #{f.seq}
                  </div>
                ) : f?.value === false ? (
                  <div className="text-[11px] text-slate-500">Retracted by {f.actor} · event #{f.seq}</div>
                ) : (
                  <div className="text-[11px] text-slate-500" title={def.help}>{def.question}</div>
                )}
              </div>
              <div className="shrink-0">
                {yes ? (
                  <button
                    onClick={() => retract(def)}
                    disabled={!allowed}
                    className="text-[11px] px-2 py-1 rounded border border-slate-600 text-slate-400 hover:bg-slate-800 disabled:opacity-30 flex items-center gap-1"
                  >
                    <Undo2 className="w-3 h-3" /> Retract
                  </button>
                ) : (
                  <button
                    onClick={() => confirm(def)}
                    disabled={!allowed}
                    title={allowed ? def.help : `Only ${def.allowedRoles.map((r) => ROLE_LABEL[r]).join(' / ')} can confirm this`}
                    className="text-[11px] px-2 py-1 rounded border border-indigo-500/70 text-indigo-200 hover:bg-indigo-900/40 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {allowed ? <Check className="w-3 h-3" /> : <Lock className="w-3 h-3" />} Confirm
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
