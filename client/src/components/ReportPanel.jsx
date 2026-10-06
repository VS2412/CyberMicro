import React, { useEffect, useState } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { FileText, FileDown, Sparkles, Pencil, CheckCircle2, CircleDashed, Lock, Stamp, AlertTriangle, ListChecks } from 'lucide-react';
import { api } from '../api';
import ComplianceReportPDF from './ComplianceReportPDF';
import { fmtUtc, ROLE_LABEL } from '../lib/format';

function Provenance({ item }) {
  if (item.system) return <span className="text-sky-300">from sealed timeline{item.note ? ` (${item.note})` : ''}</span>;
  if (item.pendingAiDraft) return <span className="text-amber-300 flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI draft: needs human approval</span>;
  if (item.source === 'human') return <span className="text-emerald-300">entered by {item.approvedBy}</span>;
  return <span className="text-slate-500">missing</span>;
}

export default function ReportPanel({ incident, meta, role, actor, onAction, prompt, toast }) {
  const [fieldDefs, setFieldDefs] = useState({});
  const [drafting, setDrafting] = useState(null);
  const status = incident.reportStatus;
  const fields = incident.report?.fields || {};

  useEffect(() => {
    api.get('/report-fields').then((r) => setFieldDefs(r.data)).catch(() => {});
  }, []);

  const edit = async (key, { prefill, approvedDraft } = {}) => {
    const def = fieldDefs[key] || { label: key };
    const values = await prompt({
      title: approvedDraft ? `Review AI draft: ${def.label}` : def.label,
      help: approvedDraft
        ? 'Read and correct the AI draft. Approving makes it your statement, sealed into the audit trail under your name.'
        : def.help,
      confirmLabel: approvedDraft ? 'Approve as my statement' : 'Save',
      fields: [{ name: 'value', label: def.label, multiline: def.type === 'textarea', type: def.type === 'number' ? 'text' : 'text', defaultValue: prefill ?? fields[key]?.value ?? '' }],
    });
    if (!values) return;
    onAction('/report/fields', { key, value: values.value, approvedDraft });
  };

  const draft = async (key) => {
    setDrafting(key);
    const data = await onAction('/report/draft', { key });
    setDrafting(null);
    if (data?.draftNote) toast(`Draft check: ${data.draftNote}`, 'warn');
  };

  const fillMeasures = () => {
    const done = (incident.steps || []).filter((s) => ['done', 'approved'].includes(s.status));
    const text = done.length
      ? done.map((s) => `- ${s.status === 'done' ? 'Done' : 'Planned'}: ${s.text}`).join('\n')
      : '- (no completed or approved steps yet)';
    edit('measures_taken', { prefill: text });
  };

  const finalize = async () => {
    const values = await prompt({
      title: 'Finalise compliance report',
      help: 'This seals the report into the audit trail. The head seal printed on the PDF lets anyone later verify that the record has not changed since.',
      confirmLabel: 'Finalise & seal',
      fields: [],
    });
    if (values) onAction('/report/finalize', {});
  };

  if (!status) return null;
  const pct = status.total ? Math.round((status.done / status.total) * 100) : 0;
  const canSign = ['INCIDENT_COMMANDER', 'DPO', 'LEGAL'].includes(role);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" /> Compliance report
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${status.finalized ? 'border-emerald-600 text-emerald-300' : 'border-slate-600 text-slate-400'}`}>
              {status.finalized ? `FINAL · ${fmtUtc(incident.report.finalizedAt)} · ${incident.report.finalizedBy}` : 'DRAFT'}
            </span>
          </h2>
          <p className="text-[11px] text-slate-400 max-w-2xl">
            Built only from structured, sealed data. For every triggered obligation, Watchman checks the fields the regulation requires.
            AI may draft narrative text, but it counts only once a human approves it.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={finalize}
            disabled={!status.canFinalize || !canSign || status.finalized}
            title={!canSign ? 'Only Incident Commander, DPO or Legal can finalise' : status.canFinalize ? '' : 'Complete all required items first'}
            className="text-xs px-3 py-2 rounded bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 font-semibold"
          >
            <Stamp className="w-4 h-4" /> Finalise &amp; seal
          </button>
          <PDFDownloadLink
            document={<ComplianceReportPDF incident={incident} meta={meta} fieldDefs={fieldDefs} />}
            fileName={`Watchman-${incident._id.slice(-6)}-${status.finalized ? 'FINAL' : 'DRAFT'}.pdf`}
            className="text-xs px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500 flex items-center gap-1.5 font-semibold"
          >
            {({ loading }) => (<><FileDown className="w-4 h-4" /> {loading ? 'Preparing PDF…' : 'Export PDF'}</>)}
          </PDFDownloadLink>
        </div>
      </div>

      <div className="border border-borderDark rounded-lg p-3 bg-slateDark/40">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-slate-300">Required items complete: <b className="text-white">{status.done}/{status.total}</b> across {status.sections.length} triggered obligations</span>
          <span className={status.canFinalize ? 'text-emerald-300' : 'text-amber-300'}>{status.canFinalize ? 'Ready to finalise' : `${status.blockers.length} blocking`}</span>
        </div>
        <div className="h-2 rounded bg-slate-800 overflow-hidden">
          <div className={`h-full transition-all ${status.canFinalize ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
        </div>
        {status.changedSinceFinal && (
          <div className="mt-2 text-[11px] text-amber-300 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Records changed since the report was finalised: re-issue an updated report.</div>
        )}
        {!incident.integrity?.valid && (
          <div className="mt-2 text-[11px] text-rose-300 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Audit chain broken: a report cannot be finalised on untrusted data.</div>
        )}
      </div>

      {status.sections.length === 0 ? (
        <div className="border border-dashed border-borderDark rounded-lg p-6 text-center text-xs text-slate-400">
          No notification obligation is triggered yet, so there&apos;s nothing to report to a regulator. Confirm determinations to see what each regulator requires.
        </div>
      ) : (
        <div className="grid xl:grid-cols-2 gap-3">
          {status.sections.map((sec) => (
            <section key={sec.stageId} className="border border-borderDark rounded-lg p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="text-sm font-semibold text-white">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 mr-1.5">{sec.regulationId}</span>
                    {sec.title}
                  </div>
                  <div className="text-[11px] text-slate-400">{sec.obligation} · {sec.deadline?.includes?.('T') ? `due ${fmtUtc(sec.deadline)}` : sec.deadline} · {sec.status}</div>
                </div>
                <span className={`text-xs font-bold ${sec.done === sec.total ? 'text-emerald-300' : 'text-amber-300'}`}>{sec.done}/{sec.total}</span>
              </div>
              <ul className="space-y-1.5">
                {sec.items.map((it) => {
                  const def = fieldDefs[it.key];
                  return (
                    <li key={it.key} className={`rounded border px-2 py-1.5 text-xs ${it.complete ? 'border-emerald-900 bg-emerald-950/20' : it.pendingAiDraft ? 'border-amber-700 bg-amber-950/20' : 'border-borderDark'}`}>
                      <div className="flex items-start gap-1.5">
                        {it.complete ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" /> : <CircleDashed className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2">
                            <span className="text-slate-200 font-medium">{it.label}</span>
                            <span className="text-[10px] text-indigo-300">{it.clause}</span>
                          </div>
                          {it.value !== null && it.value !== undefined && (
                            <div className="text-[11px] text-slate-300 whitespace-pre-wrap mt-0.5">
                              {it.system && it.key.endsWith('_time') ? fmtUtc(it.value) : typeof it.value === 'number' ? it.value.toLocaleString('en-US') : String(it.value)}
                            </div>
                          )}
                          <div className="text-[10px] mt-0.5"><Provenance item={it} /></div>
                        </div>
                        {!it.system ? (
                          <div className="flex gap-1 shrink-0">
                            {it.pendingAiDraft && (
                              <button onClick={() => edit(it.key, { approvedDraft: true })} className="px-1.5 py-0.5 rounded bg-amber-700 hover:bg-amber-600 text-[10px]">Review &amp; approve</button>
                            )}
                            {def?.aiDraftable && !it.complete && !it.pendingAiDraft && (
                              <button onClick={() => draft(it.key)} disabled={drafting === it.key} className="px-1.5 py-0.5 rounded border border-fuchsia-700 text-fuchsia-300 hover:bg-fuchsia-950 text-[10px] flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> {drafting === it.key ? 'Drafting…' : 'Draft with AI'}
                              </button>
                            )}
                            {it.key === 'measures_taken' && !it.complete && (
                              <button onClick={fillMeasures} title="Pre-fill from completed / approved plan steps" className="px-1.5 py-0.5 rounded border border-cyan-700 text-cyan-300 hover:bg-cyan-950 text-[10px] flex items-center gap-1">
                                <ListChecks className="w-3 h-3" /> From plan
                              </button>
                            )}
                            <button
                              onClick={() => edit(it.key)}
                              disabled={it.key === 'materiality_assessment' && role !== 'LEGAL'}
                              title={it.key === 'materiality_assessment' && role !== 'LEGAL' ? 'Legal only' : 'Edit'}
                              className="p-1 rounded border border-slate-600 text-slate-300 hover:bg-slate-800 disabled:opacity-30"
                            >
                              {it.key === 'materiality_assessment' && role !== 'LEGAL' ? <Lock className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
      <p className="text-[10px] text-slate-500">Acting as {actor} ({ROLE_LABEL[role]}). Shared fields (e.g. nature of the incident) fill every regulator section that needs them.</p>
    </div>
  );
}
