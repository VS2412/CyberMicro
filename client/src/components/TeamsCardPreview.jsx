import React, { useMemo, useState } from 'react';
import { MessageSquareWarning, Copy, X } from 'lucide-react';
import { fmtCountdown, fmtUtc, ROLE_LABEL } from '../lib/format';

/** Build a Microsoft Teams Adaptive Card (schema 1.5) for the most urgent open obligations. */
function buildAdaptiveCard(incident, effectiveNow) {
  const running = (incident.obligations || [])
    .filter((o) => o.status === 'running')
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 3);
  const rs = incident.reportStatus;
  return {
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    type: 'AdaptiveCard',
    version: '1.5',
    body: [
      { type: 'TextBlock', text: 'Regulatory notification deadlines', weight: 'Bolder', size: 'Medium', color: running.some((o) => new Date(o.deadline) - effectiveNow < 12 * 3600e3) ? 'Attention' : 'Warning' },
      { type: 'TextBlock', text: `${incident.title} (${incident.severity})`, wrap: true, spacing: 'None' },
      ...running.map((o) => ({
        type: 'Container',
        separator: true,
        items: [
          { type: 'TextBlock', text: `${o.regulationId}: ${o.label}`, weight: 'Bolder', wrap: true },
          {
            type: 'FactSet',
            facts: [
              { title: 'Due', value: fmtUtc(o.deadline) },
              { title: 'Time left', value: fmtCountdown(new Date(o.deadline) - effectiveNow) },
              { title: 'Legal basis', value: o.citation },
              { title: 'Started by', value: `${o.triggeredBy?.actor} (${ROLE_LABEL[o.triggeredBy?.role] || o.triggeredBy?.role}): ${o.anchor?.label || o.triggeredBy?.label}` },
            ],
          },
        ],
      })),
      ...(rs?.total ? [{ type: 'TextBlock', text: `Report completeness: ${rs.done}/${rs.total} required items`, isSubtle: true, separator: true }] : []),
      { type: 'TextBlock', text: incident.integrity?.valid ? 'Audit chain: verified' : 'AUDIT CHAIN BROKEN: investigate before relying on these deadlines', color: incident.integrity?.valid ? 'Good' : 'Attention', size: 'Small' },
    ],
    actions: [{ type: 'Action.OpenUrl', title: 'Open incident in Watchman', url: window.location.href }],
  };
}

const COLOR = { Attention: 'text-rose-600', Warning: 'text-amber-600', Good: 'text-emerald-700' };

/** Rough visual rendering of the card in the style of a Teams message. */
function CardView({ card }) {
  const render = (el, i) => {
    if (el.type === 'TextBlock') {
      return (
        <div key={i} className={`${el.weight === 'Bolder' ? 'font-semibold' : ''} ${el.size === 'Medium' ? 'text-base' : el.size === 'Small' ? 'text-xs' : 'text-sm'} ${COLOR[el.color] || (el.isSubtle ? 'text-slate-500' : 'text-slate-800')} ${el.separator ? 'border-t border-slate-200 pt-2 mt-2' : ''}`}>
          {el.text}
        </div>
      );
    }
    if (el.type === 'FactSet') {
      return (
        <table key={i} className="text-xs text-slate-700 mt-1">
          <tbody>{el.facts.map((f) => <tr key={f.title}><td className="pr-3 font-semibold align-top whitespace-nowrap">{f.title}</td><td>{f.value}</td></tr>)}</tbody>
        </table>
      );
    }
    if (el.type === 'Container') return <div key={i} className="border-t border-slate-200 pt-2 mt-2">{el.items.map(render)}</div>;
    return null;
  };
  return (
    <div className="bg-white rounded-md shadow p-4 border-l-4 border-[#5b5fc7]">
      {card.body.map(render)}
      <div className="mt-3 flex gap-2">
        {card.actions.map((a) => <span key={a.title} className="text-xs px-3 py-1.5 rounded border border-slate-300 text-[#5b5fc7] font-semibold">{a.title}</span>)}
      </div>
    </div>
  );
}

export default function TeamsCardPreview({ incident, effectiveNow, onClose, toast }) {
  const [showJson, setShowJson] = useState(false);
  const card = useMemo(() => buildAdaptiveCard(incident, effectiveNow), [incident, effectiveNow]);
  const json = JSON.stringify(card, null, 2);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      toast('Adaptive Card JSON copied');
    } catch {
      setShowJson(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onMouseDown={onClose}>
      <div onMouseDown={(e) => e.stopPropagation()} className="bg-panelDark border border-borderDark rounded-xl p-5 w-full max-w-xl space-y-3 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <MessageSquareWarning className="w-5 h-5 text-[#7b83eb]" /> Microsoft Teams escalation preview
            </h3>
            <p className="text-[11px] text-slate-400">
              An Adaptive Card (v1.5) for the incident channel, built from the deterministic clocks. In production it is posted by a Teams
              Workflows webhook; in this demo nothing leaves the laptop.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="bg-[#f5f5f5] rounded-lg p-3">
          <div className="text-[11px] text-slate-500 mb-1.5"><b className="text-slate-700">Watchman</b> · Incident Response channel</div>
          <CardView card={card} />
        </div>
        <div className="flex gap-2">
          <button onClick={copy} className="text-xs px-3 py-1.5 rounded bg-[#5b5fc7] hover:bg-[#4f52b2] flex items-center gap-1"><Copy className="w-3.5 h-3.5" /> Copy card JSON</button>
          <button onClick={() => setShowJson((v) => !v)} className="text-xs px-3 py-1.5 rounded border border-borderDark text-slate-300">{showJson ? 'Hide' : 'Show'} JSON</button>
        </div>
        {showJson && <pre className="text-[10px] bg-slateDark border border-borderDark rounded p-2 overflow-x-auto max-h-64 text-slate-300">{json}</pre>}
      </div>
    </div>
  );
}
