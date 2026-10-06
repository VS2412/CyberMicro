import React, { useRef, useState } from 'react';
import { Archive, Upload, Fingerprint, ArrowRightLeft, ShieldCheck, ShieldAlert, FileSearch, User } from 'lucide-react';
import { api, errorMessage } from '../api';
import { fmtUtc } from '../lib/format';

/** SHA-256 of a File, computed locally with the browser's WebCrypto API. */
async function sha256File(file) {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const fmtBytes = (n) => (n == null ? '' : n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`);

export default function EvidencePanel({ incident, actor, role, onAction, prompt, toast, setIncident }) {
  const [hashing, setHashing] = useState(null);
  const [drag, setDrag] = useState(false);
  const pickRef = useRef(null);
  const verifyRef = useRef(null);
  const [verifyTarget, setVerifyTarget] = useState(null);
  const evidence = incident.evidence || [];

  const register = async (file) => {
    if (!file) return;
    setHashing(file.name);
    const sha256 = await sha256File(file);
    setHashing(null);
    const values = await prompt({
      title: `Register evidence: ${file.name}`,
      help: `SHA-256 fingerprint computed in your browser: ${sha256}. The file itself is not uploaded; only its fingerprint and custody details are sealed into the record. You (${actor}) become the first custodian.`,
      confirmLabel: 'Register & seal',
      fields: [
        { name: 'sourceHost', label: 'Collected from (host / system)', placeholder: 'e.g. Azure WAF (prod-weu-waf01)', optional: true },
        { name: 'storageLocation', label: 'Where the original is stored', defaultValue: 'Evidence vault: immutable (WORM) storage, case folder', optional: true },
        { name: 'description', label: 'Description', placeholder: 'e.g. WAF log export covering 23:00–02:30 UTC', optional: true, multiline: true },
      ],
    });
    if (!values) return;
    onAction('/evidence', { name: file.name, sha256, size: file.size, mime: file.type, ...values });
  };

  const transfer = async (e) => {
    const values = await prompt({
      title: `Hand over custody: ${e.name}`,
      help: `Current custodian: ${e.custodian}. Every hand-over is sealed with who, to whom, when and why, which is what makes evidence admissible.`,
      confirmLabel: 'Record hand-over',
      fields: [
        { name: 'to', label: 'Receiving custodian', placeholder: 'e.g. Forensics: Dr. Lena Weiss (external DFIR)' },
        { name: 'reason', label: 'Reason', placeholder: 'e.g. Forensic analysis of exfiltration volume' },
      ],
    });
    if (values) onAction(`/evidence/${e._id}/transfer`, values);
  };

  const reverify = async (file) => {
    const e = verifyTarget;
    setVerifyTarget(null);
    if (!file || !e) return;
    setHashing(file.name);
    const sha256 = await sha256File(file);
    setHashing(null);
    try {
      const res = await api.post(`/incidents/${incident._id}/evidence/${e._id}/verify`, { sha256, actor, role });
      setIncident(res.data.incident);
      toast(res.data.match ? `✓ ${file.name} matches the registered fingerprint of ${e.name}` : `✖ MISMATCH: ${file.name} is NOT the file registered as ${e.name}. It has been altered or substituted.`, res.data.match ? 'info' : 'error');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Archive className="w-5 h-5 text-teal-400" /> Evidence register &amp; chain of custody
        </h2>
        <p className="text-[11px] text-slate-400 max-w-3xl">
          Each file is fingerprinted (SHA-256) in your browser. Change one byte of the file and the fingerprint changes completely. We record who
          collected it, where it is stored, and every hand-over. Files never leave this machine.
        </p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); register(e.dataTransfer.files?.[0]); }}
        onClick={() => pickRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition ${drag ? 'border-teal-400 bg-teal-950/30' : 'border-borderDark hover:border-teal-700'}`}
      >
        <Upload className="w-6 h-6 text-teal-400 mx-auto mb-1" />
        <div className="text-sm text-slate-200">{hashing ? `Computing SHA-256 of ${hashing}…` : 'Drop an evidence file here, or click to choose'}</div>
        <div className="text-[11px] text-slate-500">e.g. demo-evidence/waf-export-2026-10-06.csv</div>
        <input ref={pickRef} type="file" className="hidden" onChange={(e) => { register(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
      <input ref={verifyRef} type="file" className="hidden" onChange={(e) => { reverify(e.target.files?.[0]); e.target.value = ''; }} />

      {evidence.length === 0 ? (
        <div className="text-xs text-slate-500 italic">No evidence registered yet.</div>
      ) : (
        <ul className="space-y-2">
          {evidence.map((e) => (
            <li key={e._id} className={`border rounded-lg p-3 ${e.registryMatchesChain === false || e.lastVerified?.match === false ? 'border-rose-600 bg-rose-950/30' : 'border-borderDark bg-slateDark/40'}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white">{e.name} <span className="text-[11px] font-normal text-slate-400">{fmtBytes(e.size)}{e.sourceHost ? ` · from ${e.sourceHost}` : ''}</span></div>
                  <div className="font-mono text-[10px] text-teal-300 break-all flex items-start gap-1 mt-0.5">
                    <Fingerprint className="w-3 h-3 shrink-0 mt-0.5" /> SHA-256 {e.sha256}
                  </div>
                  {e.description && <div className="text-[11px] text-slate-400 mt-0.5">{e.description}</div>}
                  <div className="text-[11px] text-slate-400 mt-0.5">Stored: {e.storageLocation}</div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => { setVerifyTarget(e); verifyRef.current?.click(); }} className="text-[11px] px-2 py-1 rounded border border-teal-700 text-teal-300 hover:bg-teal-950 flex items-center gap-1">
                    <FileSearch className="w-3 h-3" /> Re-verify file
                  </button>
                  <button onClick={() => transfer(e)} className="text-[11px] px-2 py-1 rounded border border-slate-600 text-slate-300 hover:bg-slate-800 flex items-center gap-1">
                    <ArrowRightLeft className="w-3 h-3" /> Hand over
                  </button>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px]">
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 flex items-center gap-1"><User className="w-3 h-3" /> {e.collectedBy} · collected {fmtUtc(e.collectedAt)}</span>
                {e.transfers.map((t, i) => (
                  <React.Fragment key={i}>
                    <span className="text-slate-500">→</span>
                    <span title={t.reason} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">{t.to} · {fmtUtc(t.at)}</span>
                  </React.Fragment>
                ))}
                <span className="ml-auto text-slate-400">Current custodian: <b className="text-slate-200">{e.custodian}</b></span>
              </div>

              {e.lastVerified && (
                <div className={`mt-1.5 text-[11px] flex items-center gap-1 ${e.lastVerified.match ? 'text-emerald-300' : 'text-rose-300 font-semibold'}`}>
                  {e.lastVerified.match ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                  {e.lastVerified.match ? 'Intact: re-verified' : 'MISMATCH: presented file differs from the registered evidence'} by {e.lastVerified.by} at {fmtUtc(e.lastVerified.at)}
                </div>
              )}
              {e.registryMatchesChain === false && (
                <div className="mt-1 text-[11px] text-rose-300 font-semibold">Registry record differs from the sealed registration event: the database entry was altered.</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
