import React, { useState } from 'react';
import { Crosshair, Check, X, Plus, ExternalLink, Download } from 'lucide-react';

const STATUS = {
  valid: { cls: 'border-emerald-700 bg-emerald-950/40 text-emerald-200', label: 'valid' },
  remapped: { cls: 'border-amber-600 bg-amber-950/40 text-amber-200', label: 'revoked → remapped' },
  deprecated: { cls: 'border-slate-500 bg-slate-800 text-slate-300', label: 'deprecated' },
  rejected: { cls: 'border-rose-700 bg-rose-950/40 text-rose-300', label: 'rejected' },
};
const SOURCE = { ai: 'AI', playbook: 'playbook reference', analyst: 'analyst' };

export default function AttackPanel({ incident, meta, onAction }) {
  const [input, setInput] = useState('');
  const techniques = incident.techniques || [];
  const shown = techniques.filter((t) => t.review !== 'removed');

  // Layer file for MITRE's ATT&CK Navigator (mitre-attack.github.io/attack-navigator): "Open existing layer" → upload.
  const exportLayer = () => {
    const color = { confirmed: '#16a34a', ai: '#f59e0b', playbook: '#94a3b8', analyst: '#16a34a' };
    const layer = {
      name: `Watchman ${incident._id.slice(-6)}: ${incident.title}`.slice(0, 100),
      versions: { navigator: '5.1.0', layer: '4.5' },
      domain: 'enterprise-attack',
      description: `Techniques mapped in Watchman, validated against ${meta?.attack?.version}. Green = analyst-confirmed, amber = AI-suggested, grey = playbook reference.`,
      techniques: shown.filter((t) => t.id).map((t) => ({
        techniqueID: t.id,
        color: t.review === 'confirmed' ? color.confirmed : color[t.source],
        comment: `${t.source}${t.review ? `, ${t.review}` : ''}${t.note ? `: ${t.note}` : ''}`,
        enabled: true,
      })),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(layer, null, 2)], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `watchman-${incident._id.slice(-6)}-attack-layer.json` });
    a.click();
    URL.revokeObjectURL(url);
  };

  const add = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    onAction('/techniques', { id: input.trim() });
    setInput('');
  };

  return (
    <div className="border border-borderDark rounded-lg p-3 bg-slateDark/40">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
            <Crosshair className="w-4 h-4 text-violet-400" /> MITRE ATT&amp;CK mapping
          </h3>
          <p className="text-[11px] text-slate-400">
            Every ID is checked against MITRE&apos;s official dataset ({meta?.attack?.techniques} techniques, {meta?.attack?.version}). Names come from MITRE, never from the AI.
          </p>
        </div>
        <form onSubmit={add} className="flex gap-1">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tag ID, e.g. T1086"
            className="w-44 bg-slateDark border border-borderDark rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-violet-500"
          />
          <button type="submit" className="text-xs px-2 py-1 rounded bg-violet-700 hover:bg-violet-600 flex items-center gap-1">
            <Plus className="w-3 h-3" /> Tag
          </button>
          {shown.some((t) => t.id) && (
            <button type="button" onClick={exportLayer} title="Download a layer for MITRE ATT&CK Navigator" className="text-xs px-2 py-1 rounded border border-violet-700 text-violet-300 hover:bg-violet-950 flex items-center gap-1">
              <Download className="w-3 h-3" /> Navigator layer
            </button>
          )}
        </form>
      </div>

      {shown.length === 0 ? (
        <div className="text-xs text-slate-500 italic">No techniques mapped yet. Run the analysis or tag one manually.</div>
      ) : (
        <ul className="grid md:grid-cols-2 gap-1.5">
          {shown.map((t) => {
            const st = STATUS[t.status];
            const needsReview = t.status !== 'rejected' && !t.review;
            return (
              <li key={t.inputId} className={`border rounded px-2 py-1.5 text-xs ${st.cls}`}>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`font-mono font-bold ${t.status === 'rejected' ? 'line-through' : ''}`}>{t.inputId}</span>
                  {t.status === 'remapped' && <span className="font-mono font-bold">→ {t.id}</span>}
                  {t.name && <span className="text-slate-100">{t.name}</span>}
                  {t.url && (
                    <a href={t.url} target="_blank" rel="noreferrer" className="opacity-60 hover:opacity-100"><ExternalLink className="w-3 h-3" /></a>
                  )}
                  <span className="ml-auto text-[10px] uppercase tracking-wide opacity-80">{st.label}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                  <span>source: {SOURCE[t.source]}</span>
                  {t.tactics?.length > 0 && <span>· {t.tactics.join(', ')}</span>}
                  {t.review === 'confirmed' && <span className="text-emerald-300">· ✓ confirmed by {t.reviewedBy}</span>}
                  {needsReview && (
                    <span className="ml-auto flex gap-1">
                      <span className="text-amber-300">needs analyst review</span>
                      <button title="Confirm this mapping fits the incident" onClick={() => onAction(`/techniques/${t.inputId}/review`, { decision: 'confirmed' })} className="px-1 rounded border border-emerald-700 text-emerald-300 hover:bg-emerald-900">
                        <Check className="w-3 h-3" />
                      </button>
                      <button title="Remove this mapping" onClick={() => onAction(`/techniques/${t.inputId}/review`, { decision: 'removed' })} className="px-1 rounded border border-rose-700 text-rose-300 hover:bg-rose-900">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>
                {t.note && <div className="text-[10px] mt-0.5 opacity-90">{t.note}</div>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
