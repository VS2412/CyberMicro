import mongoose from 'mongoose';

export const NIST_PHASES = ['PREPARATION', 'DETECTION_ANALYSIS', 'CONTAINMENT_ERADICATION_RECOVERY', 'POST_INCIDENT'];
export const ROLES = ['ANALYST', 'INCIDENT_COMMANDER', 'DPO', 'LEGAL'];

// One sealed entry in the hash-chained audit timeline (see utils/cryptoChain.js).
// The timeline is the system of record: facts that drive regulatory clocks are
// derived from it, so tampering with it is both detectable and visible.
const TimelineEventSchema = new mongoose.Schema({
  seq: { type: Number, required: true },
  timestamp: { type: Date, required: true },
  type: { type: String, required: true },
  action: { type: String, required: true },
  phase: { type: String, enum: NIST_PHASES },
  actor: { type: String, required: true },
  role: { type: String },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  previousHash: { type: String, required: true },
  currentHash: { type: String, required: true },
}, { minimize: false });

const StepSchema = new mongoose.Schema({
  playbookId: { type: String },          // null => AI-proposed, not from an approved playbook
  stepId: { type: String },
  phase: { type: String, enum: NIST_PHASES, required: true },
  text: { type: String, required: true },
  rationale: { type: String },
  attack: [{ type: String }],
  evidence: [{ type: String }],
  source: { type: String, enum: ['playbook', 'ai'], required: true },
  status: { type: String, enum: ['proposed', 'approved', 'rejected', 'done'], default: 'proposed' },
  decidedBy: { type: String },
  decidedAt: { type: Date },
});

const TechniqueSchema = new mongoose.Schema({
  inputId: { type: String, required: true },   // what the AI / analyst typed
  id: { type: String },                        // canonical ATT&CK ID after validation
  name: { type: String },                      // name from the official dataset, never from the AI
  tactics: [{ type: String }],
  url: { type: String },
  status: { type: String, enum: ['valid', 'remapped', 'deprecated', 'rejected'], required: true },
  note: { type: String },
  source: { type: String, enum: ['ai', 'analyst', 'playbook'], required: true },
  review: { type: String, enum: ['confirmed', 'removed'] },   // analyst review of AI/playbook mappings
  reviewedBy: { type: String },
}, { _id: false });

const SuggestedFactSchema = new mongoose.Schema({
  key: { type: String, required: true },
  value: { type: mongoose.Schema.Types.Mixed },
  rationale: { type: String },
  status: { type: String, enum: ['pending', 'confirmed', 'dismissed'], default: 'pending' },
  by: { type: String, enum: ['ai', 'rules'], default: 'ai' },
}, { _id: false });

const TransferSchema = new mongoose.Schema({
  from: String, to: String, reason: String, at: Date, by: String,
}, { _id: false });

const EvidenceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sha256: { type: String, required: true, match: /^[a-f0-9]{64}$/ },
  size: { type: Number },
  mime: { type: String },
  description: { type: String },
  sourceHost: { type: String },
  collectedBy: { type: String, required: true },
  collectedAt: { type: Date, required: true },
  storageLocation: { type: String },
  custodian: { type: String, required: true },
  transfers: [TransferSchema],
  lastVerified: { at: Date, by: String, match: Boolean },
});

const ReportFieldSchema = new mongoose.Schema({
  value: { type: mongoose.Schema.Types.Mixed },
  source: { type: String, enum: ['human', 'ai_draft', 'system'], default: 'human' },
  approvedBy: { type: String },
  approvedAt: { type: Date },
}, { _id: false });

const IncidentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, maxlength: 5000 },
    severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
    status: { type: String, enum: ['ACTIVE', 'CONTAINED', 'RESOLVED', 'CLOSED'], default: 'ACTIVE' },
    currentPhase: { type: String, enum: NIST_PHASES, default: 'DETECTION_ANALYSIS' },
    source: {
      kind: { type: String, default: 'manual' },   // 'manual' | 'sentinel' | 'scenario'
      scenarioId: { type: String },
      alert: { type: mongoose.Schema.Types.Mixed },
    },
    summary: { type: String },
    playbookIds: [{ type: String }],
    ai: {
      provider: String, model: String, mode: String, generatedAt: Date, warnings: [String],
    },
    observables: [{ type: { type: String }, value: String, _id: false }],
    suggestedFacts: [SuggestedFactSchema],
    steps: [StepSchema],
    techniques: [TechniqueSchema],
    evidence: [EvidenceSchema],
    report: {
      fields: { type: Map, of: ReportFieldSchema, default: {} },
      finalizedAt: Date,
      finalizedBy: String,
      finalHeadHash: String,
    },
    timeline: [TimelineEventSchema],
  },
  { timestamps: true, optimisticConcurrency: true }
);

export const Incident = mongoose.model('Incident', IncidentSchema);
