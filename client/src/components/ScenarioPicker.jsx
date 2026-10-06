import React, { useEffect, useState } from 'react';
import { Flame, FolderOpen, PlusCircle, Radar, ClipboardPaste } from 'lucide-react';
import { api, errorMessage } from '../api';
import { fmtUtc } from '../lib/format';

const SEV_STYLE = {
  CRITICAL: 'text-rose-300 border-rose-700 bg-rose-950/50',
  HIGH: 'text-orange-300 border-orange-700 bg-orange-950/40',
  MEDIUM: 'text-amber-300 border-amber-700 bg-amber-950/40',
  LOW: 'text-slate-300 border-slate-600 bg-slate-900',
};

export default function ScenarioPicker({ onOpen, onLoad, toast }) {
  const [scenarios, setScenarios] = useState([]);
  const [recent, setRecent] = useState([]);
  const [custom, setCustom] = useState({ title: '', description: '', severity: 'HIGH' });
  const [pasted, setPasted] = useState('');

  const ingest = (e) => {
    e.preventDefault();
    try {
      onOpen({ sentinel: JSON.parse(pasted) });
    } catch {
      toast('That is not valid JSON. Paste the incident object exported from Sentinel / Defender.', 'error');
    }
  };

  useEffect(() => {
    api.get('/scenarios').then((r) => setScenarios(r.data)).catch((e) => toast(errorMessage(e), 'error'));
    api.get('/incidents').then((r) => setRecent(r.data)).catch(() => {});
  }, [toast]);

  return (
    <div className="grid lg:grid-cols-3 gap-5">
      <section className="lg:col-span-2 bg-panelDark border border-borderDark rounded-xl p-5">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Radar className="w-5 h-5 text-amber-400" /> Incoming alerts (Microsoft Sentinel / Defender XDR)
        </h2>
        <p className="text-xs text-slate-400 mb-4">Pick an alert to open it as an incident. Opening an incident starts no regulatory clock by itself.</p>
        <div className="space-y-3">
          {scenarios.map((sc) => (
            <button
              key={sc.id}
              onClick={() => onOpen({ scenarioId: sc.id })}
              className="w-full text-left bg-slateDark/60 border border-borderDark hover:border-indigo-500 rounded-lg p-4 transition group"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-mono text-slate-500">
                    {sc.sentinel.providerName} · incident #{sc.sentinel.incidentNumber} · {fmtUtc(sc.sentinel.lastActivityTimeUtc)}
                  </div>
                  <div className="text-sm font-semibold text-white group-hover:text-indigo-200">{sc.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{sc.summary}</div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {sc.sentinel.tactics.map((t) => (
                      <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{t}</span>
                    ))}
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${SEV_STYLE[sc.severity]}`}>{sc.severity}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="space-y-5">
        <section className="bg-panelDark border border-borderDark rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
            <PlusCircle className="w-4 h-4 text-indigo-400" /> Report a new incident
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onOpen(custom);
            }}
            className="space-y-2"
          >
            <input
              required
              placeholder="Title"
              value={custom.title}
              onChange={(e) => setCustom({ ...custom, title: e.target.value })}
              className="w-full bg-slateDark border border-borderDark rounded px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
            />
            <textarea
              required
              rows={4}
              placeholder="What happened? What have you observed?"
              value={custom.description}
              onChange={(e) => setCustom({ ...custom, description: e.target.value })}
              className="w-full bg-slateDark border border-borderDark rounded px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
            />
            <div className="flex gap-2">
              <select
                value={custom.severity}
                onChange={(e) => setCustom({ ...custom, severity: e.target.value })}
                className="bg-slateDark border border-borderDark rounded px-2 py-2 text-xs"
              >
                {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => <option key={s}>{s}</option>)}
              </select>
              <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 rounded text-xs font-semibold flex items-center justify-center gap-1">
                <Flame className="w-3.5 h-3.5" /> Open incident
              </button>
            </div>
          </form>
        </section>

        <section className="bg-panelDark border border-borderDark rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-1">
            <ClipboardPaste className="w-4 h-4 text-sky-400" /> Paste a Sentinel / Defender incident
          </h2>
          <p className="text-[11px] text-slate-500 mb-2">JSON from the Sentinel API or an exported incident. Fields are mapped directly; no AI involved.</p>
          <form onSubmit={ingest} className="space-y-2">
            <textarea
              rows={3}
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder='{"properties": {"title": "...", "description": "...", "severity": "High", "incidentNumber": 4200}}'
              className="w-full bg-slateDark border border-borderDark rounded px-3 py-2 text-[11px] font-mono focus:outline-none focus:border-sky-500"
            />
            <button type="submit" disabled={!pasted.trim()} className="w-full bg-sky-700 hover:bg-sky-600 disabled:opacity-40 rounded text-xs font-semibold py-2">
              Import as incident
            </button>
          </form>
        </section>

        {recent.length > 0 && (
          <section className="bg-panelDark border border-borderDark rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
              <FolderOpen className="w-4 h-4 text-slate-400" /> Recent incidents
            </h2>
            <ul className="space-y-1 max-h-64 overflow-y-auto">
              {recent.map((i) => (
                <li key={i._id}>
                  <button onClick={() => onLoad(i._id)} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-slate-800 flex justify-between gap-2">
                    <span className="truncate text-slate-200">{i.title}</span>
                    <span className="text-slate-500 shrink-0">{fmtUtc(i.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
