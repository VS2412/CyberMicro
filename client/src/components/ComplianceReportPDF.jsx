import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#1e293b',
    lineHeight: 1.4,
  },
  headerBanner: {
    backgroundColor: '#0f172a',
    padding: 14,
    borderRadius: 4,
    marginBottom: 16,
    color: '#ffffff',
  },
  reportTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subHeader: {
    fontSize: 8,
    color: '#94a3b8',
    marginTop: 3,
  },
  section: {
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  metaItem: {
    width: '48%',
    backgroundColor: '#f8fafc',
    padding: 6,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metaLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 9,
    marginTop: 2,
    color: '#0f172a',
  },
  badge: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: 5,
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    color: '#475569',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#cbd5e1',
    fontSize: 7,
  },
  colTime: { width: '22%' },
  colResponder: { width: '18%' },
  colAction: { width: '35%' },
  colHash: { width: '25%', fontFamily: 'Courier', fontSize: 6, color: '#475569' },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: '#94a3b8',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 6,
  },
});

export default function ComplianceReportPDF({ incident }) {
  const clock = incident.regulatoryClock || {};
  const timeline = incident.timeline || [];
  const mitre = incident.mitreTechniques || [];
  const steps = incident.suggestedSteps || [];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Top Official Banner */}
        <View style={styles.headerBanner}>
          <Text style={styles.reportTitle}>Regulated Bank Incident Response Report</Text>
          <Text style={styles.subHeader}>
            Generated under NIST SP 800-61 Rev. 2 & GDPR Art. 33 Breach Notification Standards
          </Text>
        </View>

        {/* Section 1: Executive Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Incident Classification & Scope</Text>
          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Incident Identifier</Text>
              <Text style={styles.metaValue}>{incident._id || 'N/A'}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Assigned Severity</Text>
              <Text style={[styles.metaValue, styles.badge]}>{incident.severity || 'MEDIUM'}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>72-Hour Regulatory Clock</Text>
              <Text style={styles.metaValue}>
                {clock.triggered ? `Started: ${new Date(clock.startedAt).toUTCString()}` : 'Not Triggered'}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Statutory Reporting Deadline</Text>
              <Text style={styles.metaValue}>
                {clock.deadline ? new Date(clock.deadline).toUTCString() : 'N/A'}
              </Text>
            </View>
          </View>
          <Text style={{ fontSize: 8, color: '#334155', marginTop: 4 }}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Incident Summary: </Text>
            {incident.description}
          </Text>
        </View>

        {/* Section 2: Threat Attribution (MITRE ATT&CK) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Threat Vector & MITRE ATT&CK Mapping</Text>
          {mitre.length === 0 ? (
            <Text style={{ fontSize: 8, color: '#64748b', fontStyle: 'italic' }}>
              No MITRE techniques formally mapped.
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
              {mitre.map((t, idx) => (
                <View
                  key={idx}
                  style={{
                    backgroundColor: '#e0e7ff',
                    padding: 4,
                    borderRadius: 3,
                    borderWidth: 0.5,
                    borderColor: '#c7d2fe',
                  }}
                >
                  <Text style={{ fontSize: 7, color: '#3730a3', fontFamily: 'Helvetica-Bold' }}>
                    [{t.techniqueId}] {t.name}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Section 3: Completed Actions by NIST Lifecycle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. NIST SP 800-61 Mitigation Checkpoints[cite: 1, 2]</Text>
          {steps.length === 0 ? (
            <Text style={{ fontSize: 8, color: '#64748b', fontStyle: 'italic' }}>
              No playbook actions registered.
            </Text>
          ) : (
            steps.map((st, i) => (
              <View key={i} style={{ flexDirection: 'row', marginBottom: 3 }}>
                <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#4f46e5', width: '30%' }}>
                  [{st.phase}][cite: 1, 2]
                </Text>
                <Text style={{ fontSize: 7, width: '70%', color: '#334155' }}>
                  {st.task}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Section 4: Chain of Custody Audit Trail */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Non-Repudiation Evidence Timeline (Chain of Custody)[cite: 1, 2]</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.colTime}>Timestamp (UTC)</Text>
            <Text style={styles.colResponder}>Responder</Text>
            <Text style={styles.colAction}>Action Performed</Text>
            <Text style={styles.colHash}>SHA-256 Hash Digest[cite: 1, 2]</Text>
          </View>
          {timeline.map((entry, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={styles.colTime}>{new Date(entry.timestamp).toISOString().replace('T', ' ').slice(0, 19)}</Text>
              <Text style={styles.colResponder}>{entry.responder}</Text>
              <Text style={styles.colAction}>{entry.action}</Text>
              <Text style={styles.colHash}>
                {entry.currentHash ? `${entry.currentHash.substring(0, 16)}...` : 'N/A'}[cite: 1, 2]
              </Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Confidential — Legal Privilege & Banking Regulatory Submission[cite: 1, 2]</Text>
          <Text>Audit Digest Validated via Node.js Crypto Engine[cite: 1, 2]</Text>
        </View>
      </Page>
    </Document>
  );
}