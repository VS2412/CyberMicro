import mongoose from 'mongoose';
import { GENESIS_HASH } from '../utils/cryptoChain.js';

const TimelineEventSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now, required: true },
  action: { type: String, required: true },
  phase: {
    type: String,
    enum: ['PREPARATION', 'DETECTION_ANALYSIS', 'CONTAINMENT_ERADICATION_RECOVERY', 'POST_INCIDENT'],
    required: true,
  },
  responder: { type: String, required: true },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  previousHash: { type: String, required: true, default: GENESIS_HASH },
  currentHash: { type: String, required: true },
});

const IncidentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },
    currentPhase: {
      type: String,
      enum: ['PREPARATION', 'DETECTION_ANALYSIS', 'CONTAINMENT_ERADICATION_RECOVERY', 'POST_INCIDENT'],
      default: 'DETECTION_ANALYSIS',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'CONTAINED', 'RESOLVED', 'CLOSED'],
      default: 'ACTIVE',
    },
    regulatoryClock: {
      triggered: { type: Boolean, default: false },
      startedAt: { type: Date },
      deadline: { type: Date }, // Fixed UTC date set to startedAt + 72 hours
      dataBreachConfirmed: { type: Boolean, default: false },
    },
    mitreTechniques: [
      {
        techniqueId: { type: String }, // e.g., "T1566.001"
        name: { type: String },        // e.g., "Spearphishing Attachment"
      },
    ],
    suggestedSteps: [
      {
        phase: {
          type: String,
          enum: ['PREPARATION', 'DETECTION_ANALYSIS', 'CONTAINMENT_ERADICATION_RECOVERY', 'POST_INCIDENT'],
        },
        task: { type: String },
        completed: { type: Boolean, default: false },
        completedAt: { type: Date },
        completedBy: { type: String },
      },
    ],
    timeline: [TimelineEventSchema],
  },
  { timestamps: true }
);

export const Incident = mongoose.model('Incident', IncidentSchema);