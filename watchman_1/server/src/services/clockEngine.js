// Deterministic regulatory obligation engine.
//
// Input:  the sealed timeline + the rule pack + the org profile + "now".
// Output: every notification obligation, with its deadline, who/what started it,
//         and the legal citation.
// No AI, no database, no randomness: same input -> same output. That is the point.
import { readFileSync } from 'node:fs';

const load = (name) => JSON.parse(readFileSync(new URL(`../rules/${name}`, import.meta.url)));
export const RULES = load('regulations.json');
export const ORG_PROFILE = load('orgProfile.json');
export const FACTS = load('facts.json');
export const FACT_KEYS = new Set(FACTS.map((f) => f.key));

const HOUR = 3600 * 1000;

/** Latest asserted value of each fact, folded from FACT events in the timeline. */
export function deriveFacts(timeline = []) {
  const facts = {};
  for (const ev of timeline) {
    if (ev.type !== 'FACT') continue;
    const { key, value, awareAt } = ev.details || {};
    facts[key] = {
      key,
      value,
      awareAt: awareAt || new Date(ev.timestamp).toISOString(),
      assertedAt: new Date(ev.timestamp).toISOString(),
      actor: ev.actor,
      role: ev.role,
      seq: ev.seq,
    };
  }
  return facts;
}

function deriveByStage(timeline, type) {
  const out = {};
  for (const ev of timeline) {
    if (ev.type !== type) continue;
    out[ev.details?.stageId] = {
      at: ev.details?.effectiveAt || new Date(ev.timestamp).toISOString(),
      actor: ev.actor,
      role: ev.role,
      seq: ev.seq,
      reference: ev.details?.reference,
      justification: ev.details?.justification,
    };
  }
  return out;
}

export function addBusinessDays(start, n) {
  // Counts Mon–Fri only. The day of determination itself is day 0.
  const d = new Date(start);
  let counted = 0;
  while (counted < n) {
    d.setUTCDate(d.getUTCDate() + 1);
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) counted++;
  }
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

function addDuration(start, spec) {
  const s = new Date(start);
  if (spec.hours != null) return new Date(s.getTime() + spec.hours * HOUR);
  if (spec.businessDays != null) return addBusinessDays(s, spec.businessDays);
  if (spec.months != null) {
    const d = new Date(s);
    d.setUTCMonth(d.getUTCMonth() + spec.months);
    return d;
  }
  throw new Error(`Unknown duration spec ${JSON.stringify(spec)}`);
}

function describeDuration(spec) {
  if (spec.hours != null) return `${spec.hours}h`;
  if (spec.businessDays != null) return `${spec.businessDays} business days`;
  return `${spec.months} month${spec.months > 1 ? 's' : ''}`;
}

function tierFor(remainingMs, totalMs) {
  if (remainingMs <= 0) return 'overdue';
  const frac = totalMs > 0 ? remainingMs / totalMs : 0;
  if (frac < 0.25 || remainingMs < HOUR) return 'urgent';
  if (frac < 0.5) return 'warning';
  return 'ok';
}

const STATUS_ORDER = { running: 0, asap: 1, waiting: 2, submitted: 3, waived: 4, not_triggered: 5 };

/**
 * Evaluate every obligation for an incident.
 * @returns {{ now, obligations: object[], summary: object, facts: object }}
 */
export function evaluateObligations({ timeline = [], now = new Date(), rules = RULES, profile = ORG_PROFILE }) {
  const nowMs = new Date(now).getTime();
  const facts = deriveFacts(timeline);
  const submissions = deriveByStage(timeline, 'NOTIFICATION_SUBMITTED');
  const waivers = deriveByStage(timeline, 'OBLIGATION_WAIVED');
  const factLabel = (k) => FACTS.find((f) => f.key === k)?.label || k;
  const obligations = [];

  for (const reg of rules.regulations) {
    if (!profile.jurisdictions.includes(reg.jurisdiction)) continue;

    for (const stage of reg.stages) {
      const base = {
        regulationId: reg.id,
        regulation: reg.name,
        regulator: reg.regulator,
        jurisdiction: reg.jurisdiction,
        url: reg.url,
        verify: reg.verify || null,
        stageId: stage.id,
        label: stage.label,
        citation: stage.citation,
        wording: stage.wording,
        plain: stage.plain,
        reportProfile: stage.reportProfile || null,
        waivable: stage.waivable || null,
      };

      const missing = stage.when.filter((k) => facts[k]?.value !== true);
      if (missing.length) {
        obligations.push({ ...base, status: 'not_triggered', missingFacts: missing.map((k) => ({ key: k, label: factLabel(k) })) });
        continue;
      }

      // The condition fact asserted last is what made this obligation apply.
      const conditionFacts = stage.when.map((k) => facts[k]);
      const last = conditionFacts.reduce((a, b) => (a.seq > b.seq ? a : b));
      const triggeredBy = { ...last, label: factLabel(last.key) };

      if (waivers[stage.id]) {
        obligations.push({ ...base, status: 'waived', triggeredBy, waiver: waivers[stage.id] });
        continue;
      }

      if (stage.noFixedDeadline) {
        const sub = submissions[stage.id];
        obligations.push({
          ...base,
          status: sub ? 'submitted' : 'asap',
          deadlineText: stage.noFixedDeadline,
          triggeredBy,
          startedAt: triggeredBy.awareAt,
          submission: sub || null,
        });
        continue;
      }

      // Each stage may have several deadline candidates; the EARLIEST applies
      // (e.g. DORA: 4h after classification, but never later than 24h after detection).
      const candidates = stage.deadlines.map((spec) => {
        let start = null;
        let anchor;
        if (spec.from.fact) {
          const f = facts[spec.from.fact];
          start = f?.value === true ? f.awareAt : null;
          anchor = { kind: 'fact', key: spec.from.fact, label: factLabel(spec.from.fact), fact: f || null };
        } else if (spec.from.submitted) {
          start = submissions[spec.from.submitted]?.at || null;
          anchor = { kind: 'submission', stageId: spec.from.submitted, label: `submission of ${spec.from.submitted}` };
        }
        return { start, anchor, rule: describeDuration(spec), due: start ? addDuration(start, spec) : null };
      });
      const available = candidates.filter((c) => c.due);

      if (!available.length) {
        obligations.push({
          ...base,
          status: 'waiting',
          triggeredBy,
          waitingFor: candidates.map((c) => c.anchor.label),
        });
        continue;
      }

      const chosen = available.reduce((a, b) => (a.due <= b.due ? a : b));
      const deadline = chosen.due.toISOString();
      const totalMs = chosen.due.getTime() - new Date(chosen.start).getTime();
      const sub = submissions[stage.id];
      const common = {
        ...base,
        triggeredBy,
        startedAt: new Date(chosen.start).toISOString(),
        deadline,
        rule: chosen.rule,
        anchor: chosen.anchor,
        candidates: candidates.map((c) => ({ rule: c.rule, anchor: c.anchor.label, deadline: c.due?.toISOString() || null })),
      };

      if (sub) {
        obligations.push({ ...common, status: 'submitted', submission: sub, onTime: new Date(sub.at) <= chosen.due });
      } else {
        const remainingMs = chosen.due.getTime() - nowMs;
        obligations.push({ ...common, status: 'running', remainingMs, totalMs, tier: tierFor(remainingMs, totalMs) });
      }
    }
  }

  obligations.sort((a, b) =>
    STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
    (a.deadline && b.deadline ? new Date(a.deadline) - new Date(b.deadline) : 0)
  );

  const running = obligations.filter((o) => o.status === 'running');
  return {
    now: new Date(nowMs).toISOString(),
    facts,
    obligations,
    summary: {
      running: running.length,
      overdue: running.filter((o) => o.tier === 'overdue').length,
      asap: obligations.filter((o) => o.status === 'asap').length,
      submitted: obligations.filter((o) => o.status === 'submitted').length,
      nextDeadline: running[0]?.deadline || null,
      nextStageId: running[0]?.stageId || null,
    },
    ruleset: { version: rules.version, reviewedAt: rules.reviewedAt, disclaimer: rules.disclaimer },
    profile,
  };
}
