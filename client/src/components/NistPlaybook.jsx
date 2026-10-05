import React from 'react';
import { CheckCircle2, Circle, Sparkles, Tag } from 'lucide-react';

const PHASES = [
  { key: 'PREPARATION', label: '1. Preparation' },
  { key: 'DETECTION_ANALYSIS', label: '2. Detection & Analysis' },
  { key: 'CONTAINMENT_ERADICATION_RECOVERY', label: '3. Containment & Eradication' },
  { key: 'POST_INCIDENT', label: '4. Post-Incident Review' },
];

export default function NistPlaybook({ steps = [], mitreTechniques = [], onGeneratePlaybook, loading }) {
  return (
    <div className="bg-panelDark border border-borderDark rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">NIST SP 800-61 Action Plan</h2>
          <p className="text-xs text-slate-400">Structured workflow mapped to enterprise defense playbooks</p>
        </div>
        <button
          onClick={onGeneratePlaybook}
          disabled={loading}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-xs font-medium px-3.5 py-2 rounded-md transition shadow"
        >
          <Sparkles className="w-4 h-4" />
          {loading ? 'Analyzing with AI...' : 'Generate / Refresh AI Playbook'}
        </button>
      </div>

      {/* MITRE ATT&CK Badges */}
      {mitreTechniques.length > 0 && (
        <div className="mb-5 pb-4 border-b border-borderDark">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            Identified MITRE ATT&CK Techniques:
          </span>
          <div className="flex flex-wrap gap-2">
            {mitreTechniques.map((tech) => (
              <span
                key={tech.techniqueId}
                className="bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 text-xs px-2.5 py-1 rounded flex items-center gap-1.5"
              >
                <Tag className="w-3 h-3 text-indigo-400" />
                <strong>{tech.techniqueId}</strong>: {tech.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 4 NIST Phase Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PHASES.map(({ key, label }) => {
          const phaseTasks = steps.filter((s) => s.phase === key);
          return (
            <div key={key} className="bg-slateDark/60 border border-borderDark/80 rounded-md p-3.5">
              <h3 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2.5">
                {label}
              </h3>
              {phaseTasks.length === 0 ? (
                <div className="text-xs text-slate-500 italic">No tasks generated yet.</div>
              ) : (
                <ul className="space-y-2">
                  {phaseTasks.map((t, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-200">
                      <Circle className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                      <span>{t.task}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}