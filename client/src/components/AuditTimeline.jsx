import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, History, Plus } from 'lucide-react';
import axios from 'axios';

export default function AuditTimeline({ incidentId, timeline = [], onAddAction }) {
  const [newAction, setNewAction] = useState('');
  const [responder, setResponder] = useState('SecOps Analyst');
  const [verification, setVerification] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    try {
      setVerifying(true);
      const res = await axios.get(`http://localhost:5000/api/incidents/${incidentId}/verify-chain`);
      setVerification(res.data);
    } catch {
      setVerification({ valid: false, error: 'Verification network call failed' });
    } finally {
      setVerifying(false);
    }
  };

  const handleAppend = (e) => {
    e.preventDefault();
    if (!newAction.trim()) return;
    onAddAction({ action: newAction, responder, phase: 'CONTAINMENT_ERADICATION_RECOVERY' });
    setNewAction('');
  };

  return (
    <div className="bg-panelDark border border-borderDark rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-white">Chain of Custody Evidence Timeline</h2>
        </div>
        <button
          onClick={handleVerify}
          disabled={verifying}
          className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-600 px-3 py-1.5 rounded transition"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          {verifying ? 'Checking Hashes...' : 'Verify Cryptographic Integrity'}
        </button>
      </div>

      {verification && (
        <div
          className={`mb-4 px-3 py-2 text-xs rounded border flex items-center gap-2 ${
            verification.valid
              ? 'bg-emerald-950/40 border-emerald-600 text-emerald-300'
              : 'bg-rose-950/40 border-rose-600 text-rose-300'
          }`}
        >
          {verification.valid ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
          <span>
            {verification.valid
              ? `Integrity Verified: All ${verification.totalEventsVerified} events cryptographically unbroken.`
              : `Tampering Alert: ${verification.error}`}
          </span>
        </div>
      )}

      {/* Append New Action Input */}
      <form onSubmit={handleAppend} className="flex gap-2 mb-5">
        <input
          type="text"
          placeholder="Log incident response action (e.g. Cut internet to Server 03)..."
          value={newAction}
          onChange={(e) => setNewAction(e.target.value)}
          className="flex-1 bg-slateDark border border-borderDark px-3 py-2 text-xs rounded focus:outline-none focus:border-indigo-500"
        />
        <input
          type="text"
          value={responder}
          onChange={(e) => setResponder(e.target.value)}
          className="w-36 bg-slateDark border border-borderDark px-3 py-2 text-xs rounded focus:outline-none focus:border-indigo-500 text-slate-300"
        />
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 text-xs font-semibold rounded flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> Append Event[cite: 1, 2]
        </button>
      </form>

      {/* Timeline List */}
      <div className="space-y-3 font-mono text-xs">
        {timeline.map((item, idx) => (
          <div key={idx} className="border-l-2 border-indigo-600 pl-3.5 py-1 relative">
            <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-4 ring-panelDark" />
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
              <span>{new Date(item.timestamp).toLocaleString()} UTC</span>
              <span className="text-slate-300 font-sans font-medium">{item.responder}</span>
            </div>
            <div className="text-slate-100 font-sans text-sm mb-1">{item.action}</div>
            <div className="text-[10px] text-slate-500 truncate">
              SHA-256: <span className="text-slate-400">{item.currentHash}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}