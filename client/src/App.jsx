import React, { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from './api';
import { useNow, useStoredState } from './lib/hooks';
import { ROLE_LABEL, fmtUtc } from './lib/format';
import ObligationsPanel from './components/ObligationsPanel';
import FactsPanel from './components/FactsPanel';
import AuditTimeline from './components/AuditTimeline';
import PromptDialog from './components/PromptDialog';
import ScenarioPicker from './components/ScenarioPicker';
import NistPlaybook from './components/NistPlaybook';
import ReportPanel from './components/ReportPanel';
import EvidencePanel from './components/EvidencePanel';
import { Cpu, Shield, ShieldCheck, ShieldAlert, RefreshCw, Skull, TimerReset, FastForward, ListChecks, History, FileText, Archive } from 'lucide-react';

const TABS = [
  { key: 'plan', label: 'Response plan', icon: ListChecks },
  { key: 'timeline', label: 'Sealed timeline', icon: History },
  { key: 'evidence', label: 'Evidence', icon: Archive },
  { key: 'report', label: 'Report', icon: FileText },
];

function Toasts({ toasts }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`text-xs px-3 py-2 rounded-lg shadow-lg border ${
            t.kind === 'error' ? 'bg-rose-950 border-rose-600 text-rose-100' : t.kind === 'warn' ? 'bg-amber-950 border-amber-600 text-amber-100' : 'bg-slate-900 border-slate-600 text-slate-100'
          }`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [incident, setIncident] = useState(null);
  const [meta, setMeta] = useState(null);
  const [tab, setTab] = useStoredState('watchman.tab', 'plan');
  // ?tab=timeline in the URL opens a tab directly (handy for presenting).
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    if (t && TABS.some((x) => x.key === t)) setTab(t);
  }, [setTab]);
  const [actor, setActor] = useStoredState('watchman.actor', 'Asha Rao');
  const [role, setRole] = useStoredState('watchman.role', 'INCIDENT_COMMANDER');
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const now = useNow(1000);

  const toast = useCallback((text, kind = 'info') => {
    const id = Math.random();
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 7000 : 4500);
  }, []);

  // Promise-based in-page dialog, used by panels that need input.
  const prompt = useCallback((config) => new Promise((resolve) => setDialog({ config, resolve })), []);

  useEffect(() => {
    api.get('/meta').then((r) => setMeta(r.data)).catch((err) => toast(`Server unreachable: ${errorMessage(err)}`, 'error'));
  }, [toast]);

  // Keep the open incident in the URL (#<id>) so a page refresh doesn't lose it.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    api.get(`/incidents/${id}`)
      .then((res) => setIncident(res.data))
      .catch(() => { window.location.hash = ''; });
  }, []);

  useEffect(() => {
    if (incident?._id) window.location.hash = incident._id;
    else if (window.location.hash) history.replaceState(null, '', window.location.pathname);
  }, [incident?._id]);

  const incidentId = incident?._id;

  const refresh = useCallback(async () => {
    if (!incidentId) return;
    const res = await api.get(`/incidents/${incidentId}`);
    setIncident(res.data);
  }, [incidentId]);

  /** POST an action on the open incident as the current actor/role. */
  const act = useCallback(async (path, body = {}) => {
    try {
      const res = await api.post(`/incidents/${incidentId}${path}`, { ...body, actor, role });
      setIncident(res.data);
      return res.data;
    } catch (err) {
      toast(errorMessage(err), 'error');
      return null;
    }
  }, [incidentId, actor, role, toast]);

  const openIncident = async (payload) => {
    try {
      const res = await api.post('/incidents', { ...payload, actor, role });
      setIncident(res.data);
      setTab('plan');
    } catch (err) {
      toast(`Failed to open incident: ${errorMessage(err)}`, 'error');
    }
  };

  const loadIncident = async (id) => {
    try {
      setIncident((await api.get(`/incidents/${id}`)).data);
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const timeTravel = async (offsetHours) => {
    try {
      await api.post('/demo/clock', { offsetHours });
      setMeta((m) => ({ ...m, demo: { ...m.demo, offsetHours } }));
      await refresh();
      toast(offsetHours ? `DEMO time machine: now = real time + ${offsetHours}h (stored records unchanged)` : 'Time machine reset to real time', 'warn');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const tamper = async () => {
    try {
      const res = await api.post(`/demo/tamper/${incident._id}`);
      toast(`Rogue insider (direct DB edit): ${res.data.story}`, 'warn');
      setIncident(res.data.incident);
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const demo = meta?.demo?.enabled;
  const offsetHours = incident?.clock?.demoOffsetHours ?? meta?.demo?.offsetHours ?? 0;
  const integrity = incident?.integrity;

  return (
    <div className="min-h-screen">
      <header className="border-b border-borderDark bg-panelDark/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <button onClick={() => setIncident(null)} className="flex items-center gap-2.5 mr-auto">
            <div className="bg-indigo-600/20 border border-indigo-500/40 p-1.5 rounded-lg">
              <Shield className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold tracking-tight text-white leading-tight">Watchman</div>
              <div className="text-[10px] text-slate-400 leading-tight hidden xl:block">Breach-notification assistant · {meta?.profile?.name}</div>
            </div>
          </button>

          {meta?.ai && (
            <span
              title={meta.ai.onDevice ? 'The AI model runs locally via Ollama: incident data never leaves this machine' : `AI provider: ${meta.ai.provider}`}
              className={`text-[11px] px-2 py-1 rounded border flex items-center gap-1 ${meta.ai.onDevice ? 'border-emerald-700 text-emerald-300 bg-emerald-950/30' : 'border-slate-600 text-slate-300'}`}
            >
              <Cpu className="w-3.5 h-3.5" /> {meta.ai.model} · {meta.ai.onDevice ? 'on-device' : meta.ai.provider}
            </span>
          )}

          {demo && (
            <div className="flex items-center gap-1 text-[11px]">
              <span className={`px-1.5 py-0.5 rounded font-bold ${offsetHours ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-400'}`}>
                {offsetHours ? `DEMO +${offsetHours}h` : 'DEMO'}
              </span>
              <span className="text-slate-500 ml-1 hidden min-[1700px]:inline">time machine:</span>
              {[0, 6, 24, 60].map((h) => (
                <button
                  key={h}
                  onClick={() => timeTravel(h)}
                  className={`px-1.5 py-0.5 rounded border ${offsetHours === h ? 'border-amber-500 text-amber-300' : 'border-borderDark text-slate-400 hover:text-white'}`}
                >
                  {h === 0 ? <><TimerReset className="w-3 h-3 inline" /> Now</> : <><FastForward className="w-3 h-3 inline" /> +{h}h</>}
                </button>
              ))}
              {incident && (
                <button onClick={tamper} className="ml-2 px-2 py-0.5 rounded border border-rose-700 text-rose-300 hover:bg-rose-950 flex items-center gap-1">
                  <Skull className="w-3 h-3" /> Rogue DB edit
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-slate-500 hidden min-[1700px]:inline">Acting as</span>
            <input
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              title="Acting as (your name is recorded on every action)"
              className="w-24 bg-slateDark border border-borderDark rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="bg-slateDark border border-borderDark rounded px-1.5 py-1 text-slate-200"
            >
              {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 py-5 space-y-5">
        {!incident ? (
          <ScenarioPicker onOpen={openIncident} onLoad={loadIncident} toast={toast} />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-mono text-indigo-400 uppercase tracking-wider">
                  Incident {incident._id.slice(-6)} · opened {fmtUtc(incident.createdAt)} · {incident.severity}
                </div>
                <h1 className="text-lg font-bold text-white">{incident.title}</h1>
                <p className="text-xs text-slate-400 max-w-4xl">{incident.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTab('timeline')}
                  className={`text-xs px-2.5 py-1.5 rounded border flex items-center gap-1.5 ${
                    integrity?.valid ? 'border-emerald-700 text-emerald-300 bg-emerald-950/30' : 'border-rose-500 text-rose-200 bg-rose-950/60 animate-pulse-slow'
                  }`}
                >
                  {integrity?.valid ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                  {integrity?.valid ? `Audit chain intact · ${integrity.totalEvents} events` : 'AUDIT CHAIN BROKEN'}
                </button>
                <button onClick={() => setIncident(null)} className="text-xs px-2.5 py-1.5 rounded border border-borderDark text-slate-400 hover:text-white flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5" /> Switch incident
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-7">
                <ObligationsPanel incident={incident} meta={meta} now={now} role={role} onAction={act} prompt={prompt} toast={toast} />
              </div>
              <div className="lg:col-span-5">
                <FactsPanel incident={incident} meta={meta} role={role} actor={actor} onAction={act} prompt={prompt} />
              </div>
            </div>

            <section className="bg-panelDark border border-borderDark rounded-xl">
              <nav className="flex border-b border-borderDark overflow-x-auto">
                {TABS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={`px-4 py-2.5 text-xs font-medium flex items-center gap-1.5 border-b-2 -mb-px whitespace-nowrap ${
                      tab === key ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" /> {label}
                    {key === 'timeline' && !integrity?.valid && <span className="w-2 h-2 rounded-full bg-rose-500" />}
                    {key === 'evidence' && incident.evidence?.length > 0 && <span className="text-[10px] px-1 rounded bg-slate-800 text-slate-300">{incident.evidence.length}</span>}
                    {key === 'report' && incident.reportStatus?.total > 0 && (
                      <span className={`text-[10px] px-1 rounded ${incident.reportStatus.canFinalize ? 'bg-emerald-800 text-emerald-200' : 'bg-slate-800 text-slate-300'}`}>
                        {incident.reportStatus.done}/{incident.reportStatus.total}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
              <div className="p-4">
                {tab === 'timeline' && <AuditTimeline incident={incident} onAction={act} />}
                {tab === 'plan' && <NistPlaybook incident={incident} meta={meta} role={role} onAction={act} />}
                {tab === 'evidence' && <EvidencePanel incident={incident} actor={actor} role={role} onAction={act} prompt={prompt} toast={toast} setIncident={setIncident} />}
                {tab === 'report' && <ReportPanel incident={incident} meta={meta} role={role} actor={actor} onAction={act} prompt={prompt} toast={toast} />}
              </div>
            </section>
          </>
        )}
      </main>

      {dialog && (
        <PromptDialog
          config={dialog.config}
          onClose={(values) => {
            dialog.resolve(values);
            setDialog(null);
          }}
        />
      )}
      <Toasts toasts={toasts} />
    </div>
  );
}
