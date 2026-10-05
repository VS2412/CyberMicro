import React, { useState } from 'react';
import axios from 'axios';
import { PDFDownloadLink } from '@react-pdf/renderer';
import CountdownClock from './components/CountdownClock';
import NistPlaybook from './components/NistPlaybook';
import AuditTimeline from './components/AuditTimeline';
import ComplianceReportPDF from './components/ComplianceReportPDF';
import { Shield, FileDown, Flame, RefreshCw } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

const SCENARIOS = [
  {
    title: 'Ransomware on WS-102 Core Loan Server',
    severity: 'CRITICAL',
    dataBreachConfirmed: true,
    description: 'Ransomware detected encrypting loan ledger volume on internal workstation WS-102; volume shadow copies deleted and suspicious outbound C2 beaconing observed[cite: 1, 2].'
  },
  {
    title: 'Unauthorized Exfiltration via /api/v2/export',
    severity: 'HIGH',
    dataBreachConfirmed: true,
    description: 'External IP 194.26.29.112 dumped 50,000 plaintext customer account and transaction records using an unauthenticated public API parameter[cite: 1, 2].'
  },
  {
    title: 'Executive Phishing & Session Token Hijacking',
    severity: 'MEDIUM',
    dataBreachConfirmed: false,
    description: 'Chief Financial Officer reported clicking a fraudulent invoice attachment; simultaneous active sessions detected originating from two distinct countries[cite: 1, 2].'
  }
];

export default function App() {
  const [incident, setIncident] = useState(null);
  const [loadingPlaybook, setLoadingPlaybook] = useState(false);

  const startScenario = async (sc) => {
    try {
      const res = await axios.post(`${API_BASE}/incidents`, {
        title: sc.title,
        description: sc.description,
        severity: sc.severity,
        dataBreachConfirmed: sc.dataBreachConfirmed,
        responder: 'SecOps Incident Commander'
      });
      setIncident(res.data);
    } catch (err) {
      alert('Failed to initialize incident: ' + err.message);
    }
  };

  const handleGeneratePlaybook = async () => {
    if (!incident) return;
    try {
      setLoadingPlaybook(true);
      const res = await axios.post(`${API_BASE}/incidents/${incident._id}/generate-playbook`);
      setIncident((prev) => ({
        ...prev,
        suggestedSteps: res.data.suggestedSteps,
        mitreTechniques: res.data.mitreTechniques,
        regulatoryClock: res.data.regulatoryClock,
      }));
    } catch (err) {
      alert('AI error: ' + err.message);
    } finally {
      setLoadingPlaybook(false);
    }
  };

  const handleAddTimelineAction = async (payload) => {
    try {
      const res = await axios.post(`${API_BASE}/incidents/${incident._id}/timeline`, payload);
      setIncident((prev) => ({ ...prev, timeline: res.data.timeline }));
    } catch (err) {
      alert('Failed to log action: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-borderDark pb-5">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600/20 border border-indigo-500/40 p-2.5 rounded-lg">
            <Shield className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Incident Response Helper & Compliance Assistant[cite: 1, 2]</h1>
            <p className="text-xs text-slate-400">NIST SP 800-61 Lifecycle Management for Regulated Banking[cite: 1, 2]</p>
          </div>
        </div>

        {/* Dynamic PDF Export Button */}
        {incident && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIncident(null)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-2 border border-borderDark rounded-md transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset Demo
            </button>

            <PDFDownloadLink
              document={<ComplianceReportPDF incident={incident} />}
              fileName={`Compliance-Report-${incident._id.slice(-6)}.pdf`}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-md transition shadow"
            >
              {({ loading }) => (
                <>
                  <FileDown className="w-4 h-4" />
                  {loading ? 'Preparing PDF...' : 'Export Compliance Report (PDF)[cite: 1, 2]'}
                </>
              )}
            </PDFDownloadLink>
          </div>
        )}
      </header>

      {/* Scenario Selector */}
      {!incident ? (
        <div className="bg-panelDark border border-borderDark p-8 rounded-xl max-w-2xl mx-auto text-center space-y-5">
          <Flame className="w-10 h-10 text-amber-500 mx-auto" />
          <h2 className="text-lg font-semibold">Select a Banking Breach Scenario to Test[cite: 1, 2]</h2>
          <div className="grid gap-3 text-left">
            {SCENARIOS.map((sc, i) => (
              <button
                key={i}
                onClick={() => startScenario(sc)}
                className="bg-slateDark border border-borderDark hover:border-indigo-500 p-4 rounded-lg text-xs space-y-1 transition text-left"
              >
                <div className="flex justify-between font-bold text-slate-200">
                  <span>{sc.title}</span>
                  <span className="text-rose-400 font-mono">{sc.severity}</span>
                </div>
                <div className="text-slate-400">{sc.description}</div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 72-Hour Countdown Clock */}
          <CountdownClock
            deadline={incident.regulatoryClock?.deadline}
            triggered={incident.regulatoryClock?.triggered}
          />

          {/* Active Incident Summary */}
          <div className="bg-panelDark border border-borderDark p-4 rounded-lg flex flex-wrap justify-between items-center gap-3">
            <div>
              <span className="text-xs font-mono text-indigo-400 uppercase tracking-wider block">Active Incident</span>
              <h3 className="text-base font-bold text-white">{incident.title}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{incident.description}</p>
            </div>
            <span className="bg-rose-950/60 border border-rose-700/60 text-rose-300 text-xs font-bold px-3 py-1 rounded">
              {incident.severity} SEVERITY
            </span>
          </div>

          {/* NIST 4-Phase Playbook & MITRE Mapping */}
          <NistPlaybook
            steps={incident.suggestedSteps}
            mitreTechniques={incident.mitreTechniques}
            onGeneratePlaybook={handleGeneratePlaybook}
            loading={loadingPlaybook}
          />

          {/* Chain-of-Custody Timeline */}
          <AuditTimeline
            incidentId={incident._id}
            timeline={incident.timeline}
            onAddAction={handleAddTimelineAction}
          />
        </div>
      )}
    </div>
  );
}