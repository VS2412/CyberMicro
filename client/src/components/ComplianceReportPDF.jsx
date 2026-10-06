import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Never hyphenate: hashes, IDs and citations must print exactly as they are.
Font.registerHyphenationCallback((word) => [word]);

// Built-in PDF fonts only cover basic Latin, so this file avoids arrows/check-mark glyphs.
const C = { ink: '#0f172a', body: '#1e293b', mute: '#64748b', line: '#e2e8f0', ok: '#047857', warn: '#b45309', bad: '#b91c1c', brand: '#3730a3' };

const s = StyleSheet.create({
  page: { paddingTop: 34, paddingBottom: 48, paddingHorizontal: 34, fontSize: 8.5, fontFamily: 'Helvetica', color: C.body, lineHeight: 1.35 },
  banner: { backgroundColor: C.ink, color: '#fff', padding: 12, borderRadius: 3, marginBottom: 12 },
  h1: { fontSize: 15, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  sub: { fontSize: 7.5, color: '#cbd5e1', marginTop: 2 },
  watermark: { position: 'absolute', top: 330, left: 90, fontSize: 90, color: '#f1f5f9', fontFamily: 'Helvetica-Bold', transform: 'rotate(-30deg)' },
  section: { marginBottom: 11 },
  h2: { fontSize: 10.5, fontFamily: 'Helvetica-Bold', color: C.ink, marginBottom: 5, paddingBottom: 2, borderBottomWidth: 1, borderBottomColor: C.line },
  h3: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.ink, marginTop: 5, marginBottom: 3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  cell: { width: '48.8%', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: C.line, borderRadius: 2, padding: 5 },
  label: { fontSize: 6.5, color: C.mute, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
  th: { flexDirection: 'row', backgroundColor: '#f1f5f9', paddingVertical: 3, paddingHorizontal: 4, fontFamily: 'Helvetica-Bold', fontSize: 6.8, color: '#475569' },
  tr: { flexDirection: 'row', paddingVertical: 3, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: '#cbd5e1', fontSize: 7.2 },
  mono: { fontFamily: 'Courier', fontSize: 6.3 },
  note: { fontSize: 7, color: C.mute },
  footer: { position: 'absolute', bottom: 20, left: 34, right: 34, flexDirection: 'row', justifyContent: 'space-between', fontSize: 6.5, color: '#94a3b8', borderTopWidth: 1, borderTopColor: C.line, paddingTop: 5 },
});

// 64 hex chars don't fit a table column; print as two 32-char lines.
const seal = (h) => (h ? `${h.slice(0, 32)}\n${h.slice(32)}` : '-');
const utc = (iso) => (iso ? new Date(iso).toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : '-');
const ROLE = { ANALYST: 'Analyst', INCIDENT_COMMANDER: 'Incident Commander', DPO: 'DPO', LEGAL: 'Legal', AI: 'AI assistant' };

function Row({ cols, widths, styleOverride }) {
  return (
    <View style={[s.tr, styleOverride]} wrap={false}>
      {cols.map((c, i) => <Text key={i} style={{ width: widths[i], paddingRight: 4 }}>{c}</Text>)}
    </View>
  );
}

function Head({ cols, widths }) {
  return (
    <View style={s.th} fixed={false}>
      {cols.map((c, i) => <Text key={i} style={{ width: widths[i] }}>{c}</Text>)}
    </View>
  );
}

export default function ComplianceReportPDF({ incident, meta }) {
  const rs = incident.reportStatus || { sections: [], done: 0, total: 0 };
  const final = rs.finalized && !rs.changedSinceFinal;
  const integ = incident.integrity || {};
  const facts = Object.values(incident.facts || {}).filter((f) => f.value === true).sort((a, b) => a.seq - b.seq);
  const obligations = (incident.obligations || []).filter((o) => o.status !== 'not_triggered');
  const techniques = (incident.techniques || []).filter((t) => t.status !== 'rejected' && t.review !== 'removed');
  const steps = (incident.steps || []).filter((st) => ['done', 'approved'].includes(st.status));
  const evidence = incident.evidence || [];
  const W_OB = ['12%', '25%', '27%', '18%', '18%'];

  return (
    <Document title={`Incident report ${incident._id}`} author={meta?.profile?.name} subject="Regulatory incident report">
      <Page size="A4" style={s.page}>
        {!final && <Text style={s.watermark} fixed>DRAFT</Text>}

        <View style={s.banner}>
          <Text style={s.h1}>Incident Report &amp; Breach Notification Record</Text>
          <Text style={s.sub}>
            {meta?.profile?.name} | Incident {incident._id} | {final ? `FINAL, sealed ${utc(incident.report.finalizedAt)} by ${incident.report.finalizedBy}` : 'DRAFT, not finalised'}
          </Text>
          <Text style={s.sub}>Structured per NIST SP 800-61 | rule pack {meta?.ruleset?.version} (reviewed {meta?.ruleset?.reviewedAt}) | generated {utc(new Date().toISOString())}</Text>
        </View>

        <View style={s.section}>
          <Text style={s.h2}>1. Incident overview</Text>
          <View style={s.grid}>
            <View style={s.cell}><Text style={s.label}>Title</Text><Text>{incident.title}</Text></View>
            <View style={s.cell}><Text style={s.label}>Severity / status</Text><Text>{incident.severity} / {incident.status}</Text></View>
            <View style={s.cell}><Text style={s.label}>Opened</Text><Text>{utc(incident.createdAt)}{incident.source?.alert ? ` (${incident.source.alert.providerName} #${incident.source.alert.incidentNumber})` : ''}</Text></View>
            <View style={s.cell}>
              <Text style={s.label}>Audit chain integrity</Text>
              <Text style={{ color: integ.valid ? C.ok : C.bad, fontFamily: 'Helvetica-Bold' }}>{integ.valid ? `VERIFIED (${integ.totalEvents} sealed events)` : `BROKEN: ${integ.reason}`}</Text>
            </View>
          </View>
          <Text style={{ marginTop: 5 }}>{incident.description}</Text>
        </View>

        <View style={s.section}>
          <Text style={s.h2}>2. Regulatory notification obligations</Text>
          <Head cols={['Regulation', 'Obligation', 'Legal basis', 'Deadline', 'Status']} widths={W_OB} />
          {obligations.length === 0 && <Text style={s.note}>No notification obligation triggered.</Text>}
          {obligations.map((o) => (
            <Row
              key={o.stageId}
              widths={W_OB}
              cols={[
                o.regulationId,
                o.label,
                o.citation,
                o.deadline ? utc(o.deadline) : o.deadlineText || (o.waitingFor ? `after ${o.waitingFor.join(' / ')}` : '-'),
                o.status === 'submitted' ? `Submitted ${utc(o.submission.at)}${o.onTime === false ? ' (LATE)' : ''}`
                  : o.status === 'waived' ? `Not required: ${o.waiver.justification}`
                    : o.status === 'running' ? (new Date(o.deadline) < new Date(incident.clock?.now || Date.now()) ? 'OVERDUE' : 'Open')
                      : o.status,
              ]}
            />
          ))}
          <Text style={[s.note, { marginTop: 3 }]}>Deadlines computed deterministically from the sealed timeline. {meta?.ruleset?.disclaimer}</Text>
        </View>

        <View style={s.section}>
          <Text style={s.h2}>3. Required notification content ({rs.done}/{rs.total} items complete)</Text>
          {rs.sections.map((sec) => (
            <View key={sec.stageId} wrap={false}>
              <Text style={s.h3}>{sec.regulationId}: {sec.title} ({sec.done}/{sec.total})</Text>
              {sec.items.map((it) => (
                <View key={it.key} style={s.tr}>
                  <Text style={{ width: '18%', color: C.brand, paddingRight: 5 }}>{it.clause}</Text>
                  <Text style={{ width: '20%', fontFamily: 'Helvetica-Bold', paddingRight: 5 }}>{it.label}</Text>
                  <Text style={{ width: '46%', color: it.complete ? C.body : C.warn, paddingRight: 5 }}>
                    {it.value === null || it.value === undefined ? 'MISSING' : it.system && it.key.endsWith('_time') ? utc(it.value) : typeof it.value === 'number' ? it.value.toLocaleString('en-US') : String(it.value)}
                    {it.pendingAiDraft ? ' [AI DRAFT, NOT APPROVED]' : ''}
                  </Text>
                  <Text style={{ width: '16%', color: C.mute }}>{it.system ? 'sealed timeline' : it.source === 'human' ? `by ${it.approvedBy}` : it.pendingAiDraft ? 'AI draft' : '-'}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={s.section} wrap={false}>
          <Text style={s.h2}>4. Key determinations (human decisions that started the clocks)</Text>
          {facts.map((f) => (
            <Row key={f.key} widths={['34%', '26%', '24%', '16%']} cols={[(meta?.facts || []).find((d) => d.key === f.key)?.label || f.key, `${f.actor} (${ROLE[f.role] || f.role})`, `aware ${utc(f.awareAt)}`, `event #${f.seq}`]} />
          ))}
          {facts.length === 0 && <Text style={s.note}>None.</Text>}
        </View>

        <View style={s.section} wrap={false}>
          <Text style={s.h2}>5. MITRE ATT&amp;CK mapping (validated against {meta?.attack?.version})</Text>
          {techniques.map((t) => (
            <Row key={t.inputId} widths={['14%', '36%', '22%', '28%']} cols={[t.id, t.name, (t.tactics || []).join(', '), `${t.source}${t.review === 'confirmed' ? ', analyst-confirmed' : ', unreviewed'}${t.status === 'remapped' ? ` (was ${t.inputId})` : ''}`]} />
          ))}
          {techniques.length === 0 && <Text style={s.note}>None mapped.</Text>}
          {incident.observables?.length > 0 && <Text style={[s.note, { marginTop: 3 }]}>Indicators: {incident.observables.map((o) => `${o.type} ${o.value}`).join('; ')}</Text>}
        </View>

        <View style={s.section}>
          <Text style={s.h2}>6. Response actions (NIST SP 800-61 phases)</Text>
          {steps.map((st) => (
            <Row key={st._id} widths={['22%', '12%', '50%', '16%']} cols={[st.phase.replace(/_/g, ' '), st.stepId || 'AI-proposed', st.text, `${st.status} by ${st.decidedBy || '-'}`]} />
          ))}
          {steps.length === 0 && <Text style={s.note}>No actions approved or completed yet.</Text>}
        </View>

        <View style={s.section}>
          <Text style={s.h2}>7. Evidence register (chain of custody)</Text>
          {evidence.map((e) => (
            <View key={e._id} style={s.tr} wrap={false}>
              <View style={{ width: '30%' }}><Text style={{ fontFamily: 'Helvetica-Bold' }}>{e.name}</Text><Text style={s.note}>{e.size ? `${e.size.toLocaleString('en-US')} bytes` : ''} {e.sourceHost ? `from ${e.sourceHost}` : ''}</Text></View>
              <Text style={[s.mono, { width: '42%', paddingRight: 5 }]}>SHA-256{'\n'}{seal(e.sha256)}</Text>
              <Text style={{ width: '28%' }}>
                Collected {utc(e.collectedAt)} by {e.collectedBy}; custodian {e.custodian}{e.transfers?.length ? `; ${e.transfers.length} transfer(s)` : ''}{e.lastVerified ? `; re-verified ${e.lastVerified.match ? 'OK' : 'MISMATCH'}` : ''}
              </Text>
            </View>
          ))}
          {evidence.length === 0 && <Text style={s.note}>No evidence registered.</Text>}
        </View>

        <View style={s.section} break>
          <Text style={s.h2}>8. Sealed incident timeline</Text>
          <Head cols={['#', 'Time (UTC)', 'Actor', 'Event', 'Seal (HMAC-SHA256)']} widths={['4%', '15%', '17%', '34%', '30%']} />
          {incident.timeline.map((ev) => (
            <View key={ev.seq} style={[s.tr, integ.events?.[ev.seq]?.status !== 'ok' ? { backgroundColor: '#fee2e2' } : null]} wrap={false}>
              <Text style={{ width: '4%' }}>{ev.seq}</Text>
              <Text style={{ width: '15%' }}>{utc(ev.timestamp)}</Text>
              <Text style={{ width: '17%' }}>{ev.actor}{ev.role ? ` (${ROLE[ev.role] || ev.role})` : ''}</Text>
              <Text style={{ width: '34%' }}>{ev.action}</Text>
              <Text style={[s.mono, { width: '30%' }]}>{seal(ev.currentHash)}</Text>
            </View>
          ))}
          <View style={{ marginTop: 8, padding: 6, borderWidth: 1, borderColor: integ.valid ? C.ok : C.bad, borderRadius: 2 }} wrap={false}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Head seal at time of issue</Text>
            <Text style={[s.mono, { fontSize: 8 }]}>{integ.headHash}</Text>
            <Text style={[s.note, { marginTop: 3 }]}>
              Verification: each event is sealed with HMAC-SHA256 over its canonical JSON plus the previous event&apos;s seal. To verify this record later,
              re-run integrity verification in Watchman (or any implementation holding the bank&apos;s chain key) and compare the head seal with the value above.
              Any edit, deletion or reordering of an earlier event changes this value.
            </Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>Confidential | {meta?.profile?.name} | Not legal advice: confirm obligations with counsel</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
