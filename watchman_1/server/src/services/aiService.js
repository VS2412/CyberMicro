import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const NIST_PHASES = [
  'PREPARATION',
  'DETECTION_ANALYSIS',
  'CONTAINMENT_ERADICATION_RECOVERY',
  'POST_INCIDENT'
];

export async function generateIncidentPlaybook({ title, description, severity }) {
  const prompt = `
You are an expert Enterprise Cyber Incident Responder for a regulated bank following NIST SP 800-61 Rev. 2 guidelines and MITRE ATT&CK enterprise matrix.

Analyze the following security incident:
- Title: ${title}
- Severity: ${severity}
- Incident Description: ${description}

Requirements:
1. Provide actionable next steps strictly distributed across the NIST phases:
   - PREPARATION
   - DETECTION_ANALYSIS
   - CONTAINMENT_ERADICATION_RECOVERY
   - POST_INCIDENT
2. Map identified adversarial techniques to the MITRE ATT&CK framework (provide techniqueId like "T1566" and name).
3. Evaluate if this incident presents a high likelihood of personal data or financial record breach under GDPR/banking regulation.
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash-lite',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          isLikelyRegulatoryBreach: { type: Type.BOOLEAN },
          mitreTechniques: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                techniqueId: { type: Type.STRING },
                name: { type: Type.STRING }
              },
              required: ['techniqueId', 'name']
            }
          },
          suggestedSteps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                phase: { 
                  type: Type.STRING, 
                  enum: NIST_PHASES 
                },
                task: { type: Type.STRING }
              },
              required: ['phase', 'task']
            }
          }
        },
        required: ['summary', 'isLikelyRegulatoryBreach', 'mitreTechniques', 'suggestedSteps']
      }
    }
  });

  return JSON.parse(response.text.trim());
}