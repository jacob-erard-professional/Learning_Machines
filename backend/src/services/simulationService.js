/**
 * @file simulationService.js
 * Deterministic what-if simulator for admin planning scenarios.
 */

import { SERVICE_AREA_ZIPS } from '../data/serviceAreaZips.js';

const STATE_LABELS = {
  utah: 'UT',
  idaho: 'ID',
  nevada: 'NV',
  wyoming: 'WY',
  montana: 'MT',
  colorado: 'CO',
  kansas: 'KS',
};

const CITY_ZIP_MAP = {
  'salt lake city': ['84101', '84102', '84108'],
  provo: ['84601', '84604'],
  boise: ['83702', '83704', '83709'],
  'las vegas': ['89101', '89102', '89103', '89119'],
  reno: ['89501', '89502'],
  'fort collins': ['80521', '80525'],
  boulder: ['80301'],
  greeley: ['80631'],
  longmont: ['80501'],
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function titleCase(value) {
  return String(value)
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getStateFromZip(zip) {
  const numeric = Number.parseInt(String(zip).slice(0, 3), 10);
  if (numeric >= 840 && numeric <= 847) return 'UT';
  if (numeric >= 832 && numeric <= 838) return 'ID';
  if (numeric >= 889 && numeric <= 899) return 'NV';
  if (numeric >= 820 && numeric <= 831) return 'WY';
  if (numeric >= 590 && numeric <= 599) return 'MT';
  if (numeric >= 800 && numeric <= 816) return 'CO';
  if (numeric >= 660 && numeric <= 679) return 'KS';
  return 'Unknown';
}

function buildZipLoadMap(requests) {
  const zipMap = new Map();

  for (const request of requests) {
    const zip = request.eventZip;
    if (!zip) continue;

    const existing = zipMap.get(zip) ?? {
      zip,
      city: request.eventCity ?? 'Unknown',
      count: 0,
      staffRequests: 0,
      mailRequests: 0,
      inServiceArea: Boolean(request.isInServiceArea),
      state: getStateFromZip(zip),
    };

    existing.count += 1;
    if (request.fulfillmentRoute === 'staff_deployment') existing.staffRequests += 1;
    if (request.fulfillmentRoute === 'mail') existing.mailRequests += 1;
    zipMap.set(zip, existing);
  }

  return zipMap;
}

function getBaselineMetrics(requests) {
  const total = requests.length;
  const staffRequests = requests.filter((r) => r.fulfillmentRoute === 'staff_deployment').length;
  const mailRequests = requests.filter((r) => r.fulfillmentRoute === 'mail').length;
  const pendingBacklog = requests.filter((r) => ['pending', 'needs_review'].includes(r.status)).length;
  const approvedUpcoming = requests.filter((r) => r.status === 'approved').length;
  const urgentOpen = requests.filter(
    (r) => r.urgency === 'urgent' && ['pending', 'needs_review', 'approved'].includes(r.status)
  ).length;

  return {
    totalRequests: total,
    staffCapacity: Math.max(4, Math.ceil(staffRequests / 3) || 4),
    monthlyDeployments: Math.max(staffRequests, approvedUpcoming),
    pendingBacklog,
    avgResponseDays: round1(clamp(1.5 + pendingBacklog * 0.35 + urgentOpen * 0.2, 1.5, 14)),
    staffRequests,
    mailRequests,
    urgentOpen,
  };
}

function defaultZipRows(zipMap, limit = 4) {
  return [...zipMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((item) => ({
      zip: item.zip,
      city: item.city,
      additionalCapacity: 0,
    }));
}

function parseScenario(scenario) {
  const text = scenario.toLowerCase();

  const moreStaffMatch =
    text.match(/(?:add|hire|with|had|have)\s+(\d+)\s+(?:more\s+)?staff/) ||
    text.match(/(\d+)\s+(?:additional|more)\s+staff/);
  if (moreStaffMatch) {
    return { type: 'staff_delta', amount: Number.parseInt(moreStaffMatch[1], 10) };
  }

  const fewerStaffMatch =
    text.match(/(?:cut|reduce)\s+staff(?:\s+deployment)?\s+capacity\s+by\s+(\d+)\s*%/) ||
    text.match(/(\d+)\s*%\s+(?:less|fewer)\s+staff/);
  if (fewerStaffMatch) {
    return { type: 'staff_capacity_percent', percent: -Number.parseInt(fewerStaffMatch[1], 10) };
  }

  const moreCapacityMatch =
    text.match(/increase\s+staff(?:\s+deployment)?\s+capacity\s+by\s+(\d+)\s*%/) ||
    text.match(/(\d+)\s*%\s+more\s+staff(?:\s+capacity)?/);
  if (moreCapacityMatch) {
    return { type: 'staff_capacity_percent', percent: Number.parseInt(moreCapacityMatch[1], 10) };
  }

  const demandDoubleMatch = text.match(/demand\s+(?:doubles|double)\s+in\s+(.+)/);
  if (demandDoubleMatch) {
    return { type: 'demand_multiplier', multiplier: 2, region: demandDoubleMatch[1].trim() };
  }

  const demandPercentMatch = text.match(/demand\s+(?:increases|increase|up)\s+by\s+(\d+)\s*%\s+in\s+(.+)/);
  if (demandPercentMatch) {
    return {
      type: 'demand_multiplier',
      multiplier: 1 + Number.parseInt(demandPercentMatch[1], 10) / 100,
      region: demandPercentMatch[2].trim(),
    };
  }

  if (text.includes('mailed materials ran out') || text.includes('mail materials ran out') || text.includes('mail ran out')) {
    return { type: 'mail_shortage' };
  }

  const serviceAreaStateMatch = text.match(/(?:open|opened|expand|expanded|new)\s+(?:a\s+)?new\s+service\s+area\s+in\s+([a-z\s]+)/) ||
    text.match(/expand\s+service\s+area\s+to\s+(?:include\s+)?([a-z\s]+)/);
  if (serviceAreaStateMatch) {
    return { type: 'service_area_expansion', target: serviceAreaStateMatch[1].trim() };
  }

  return { type: 'general' };
}

function findTargetZips(target, zipMap) {
  const normalized = target.toLowerCase().trim().replace(/[?.!]/g, '');
  const stateCode = STATE_LABELS[normalized];

  if (CITY_ZIP_MAP[normalized]) {
    return CITY_ZIP_MAP[normalized].map((zip) => zipMap.get(zip)).filter(Boolean);
  }

  if (stateCode) {
    return [...zipMap.values()].filter((item) => item.state === stateCode);
  }

  if (normalized.includes('rural')) {
    return [...zipMap.values()].filter((item) => item.count <= 1);
  }

  return [];
}

function simulateStaffDelta(requests, baseline, amount, zipMap) {
  const added = Math.max(1, amount);
  const capacityGain = added * 6;
  const before = {
    staffCapacity: baseline.staffCapacity,
    monthlyDeployments: baseline.monthlyDeployments,
    pendingBacklog: baseline.pendingBacklog,
    avgResponseDays: baseline.avgResponseDays,
  };
  const after = {
    staffCapacity: before.staffCapacity + added,
    monthlyDeployments: before.monthlyDeployments + capacityGain,
    pendingBacklog: Math.max(0, before.pendingBacklog - added * 3),
    avgResponseDays: round1(Math.max(1, before.avgResponseDays - added * 0.5)),
  };
  const affectedZips = [...zipMap.values()]
    .sort((a, b) => b.staffRequests - a.staffRequests)
    .slice(0, 4)
    .map((item, index) => ({
      zip: item.zip,
      city: item.city,
      additionalCapacity: Math.max(1, Math.round(capacityGain / (index + 3))),
    }));

  return {
    scenarioType: 'staff_delta',
    summary: `Adding ${added} staff members increases staff deployment capacity from ${before.staffCapacity} to ${after.staffCapacity} and raises projected monthly deployments from ${before.monthlyDeployments} to ${after.monthlyDeployments}. Pending backlog falls from ${before.pendingBacklog} to ${after.pendingBacklog}, which should shorten response time for open requests.`,
    before,
    after,
    affectedZips,
    tradeoffs: [
      `Estimated hiring or reassignment requirement: ${added} additional staff members.`,
      'Onboarding and field readiness will still create a short ramp-up period.',
      'More deployments may require added vehicles, kits, and coordinator coverage.',
    ],
  };
}

function simulateStaffCapacityPercent(baseline, percent, zipMap) {
  const multiplier = 1 + percent / 100;
  const capacityDelta = Math.max(1, Math.round(baseline.staffCapacity * Math.abs(percent) / 100));
  const before = {
    staffCapacity: baseline.staffCapacity,
    monthlyDeployments: baseline.monthlyDeployments,
    pendingBacklog: baseline.pendingBacklog,
    avgResponseDays: baseline.avgResponseDays,
  };
  const afterCapacity = Math.max(1, Math.round(before.staffCapacity * multiplier));
  const afterDeployments = Math.max(0, Math.round(before.monthlyDeployments * multiplier));
  const backlogDelta = percent < 0 ? Math.ceil(Math.abs(percent) / 10) : -Math.ceil(percent / 15);
  const after = {
    staffCapacity: afterCapacity,
    monthlyDeployments: afterDeployments,
    pendingBacklog: Math.max(0, before.pendingBacklog + backlogDelta),
    avgResponseDays: round1(clamp(before.avgResponseDays + (percent < 0 ? Math.abs(percent) / 20 : -percent / 30), 1, 21)),
  };

  const affectedZips = [...zipMap.values()]
    .sort((a, b) => b.staffRequests - a.staffRequests)
    .slice(0, 4)
    .map((item) => ({
      zip: item.zip,
      city: item.city,
      additionalCapacity: percent >= 0 ? capacityDelta : -capacityDelta,
    }));

  return {
    scenarioType: 'staff_capacity_percent',
    summary: `A ${Math.abs(percent)}% ${percent < 0 ? 'reduction' : 'increase'} in staff deployment capacity changes projected monthly deployments from ${before.monthlyDeployments} to ${after.monthlyDeployments}. Open backlog shifts from ${before.pendingBacklog} to ${after.pendingBacklog}, with response times moving from ${before.avgResponseDays} to ${after.avgResponseDays} days.`,
    before,
    after,
    affectedZips,
    tradeoffs: percent < 0
      ? [
          'Tighter staffing would force more selective approvals for staffed events.',
          'Short-notice requests would face the highest risk of delay.',
          'High-volume ZIPs would likely absorb most of the lost capacity.',
        ]
      : [
          'Additional staff capacity improves responsiveness but increases operating cost.',
          'Higher field capacity will also require more materials and scheduling coverage.',
          'The biggest gains will appear in ZIPs with repeat staff deployment demand.',
        ],
  };
}

function simulateDemandMultiplier(requests, baseline, multiplier, region, zipMap) {
  const targetZips = findTargetZips(region, zipMap);
  const targetCount = targetZips.reduce((sum, item) => sum + item.count, 0);
  const additionalDemand = Math.max(1, Math.round(targetCount * (multiplier - 1)));

  const before = {
    staffCapacity: baseline.staffCapacity,
    monthlyDeployments: baseline.monthlyDeployments,
    pendingBacklog: baseline.pendingBacklog,
    avgResponseDays: baseline.avgResponseDays,
  };
  const after = {
    staffCapacity: before.staffCapacity,
    monthlyDeployments: before.monthlyDeployments + Math.round(additionalDemand * 0.6),
    pendingBacklog: before.pendingBacklog + additionalDemand,
    avgResponseDays: round1(clamp(before.avgResponseDays + additionalDemand / 8, 1, 21)),
  };

  const affectedZips = (targetZips.length ? targetZips : defaultZipRows(zipMap))
    .slice(0, 4)
    .map((item) => ({
      zip: item.zip,
      city: item.city,
      additionalCapacity: Math.max(1, Math.round(item.count * (multiplier - 1))),
    }));

  return {
    scenarioType: 'demand_multiplier',
    summary: `${titleCase(region)} demand rising by ${Math.round((multiplier - 1) * 100)}% adds about ${additionalDemand} requests to the current queue. Without new capacity, backlog climbs from ${before.pendingBacklog} to ${after.pendingBacklog} and average response time stretches to ${after.avgResponseDays} days.`,
    before,
    after,
    affectedZips,
    tradeoffs: [
      'Current staffing would likely be sufficient only for the highest-priority requests.',
      'Material inventory and travel time would become more volatile in the affected region.',
      'This scenario likely requires either route rebalancing or incremental staffing support.',
    ],
  };
}

function simulateMailShortage(requests, baseline, zipMap) {
  const mailRequests = requests.filter((request) => request.fulfillmentRoute === 'mail');
  const displaced = Math.max(1, mailRequests.length);
  const before = {
    staffCapacity: baseline.staffCapacity,
    monthlyDeployments: baseline.monthlyDeployments,
    pendingBacklog: baseline.pendingBacklog,
    avgResponseDays: baseline.avgResponseDays,
  };
  const after = {
    staffCapacity: before.staffCapacity,
    monthlyDeployments: before.monthlyDeployments,
    pendingBacklog: before.pendingBacklog + displaced,
    avgResponseDays: round1(clamp(before.avgResponseDays + displaced / 10, 1, 21)),
  };

  const zipCounts = new Map();
  for (const request of mailRequests) {
    const current = zipCounts.get(request.eventZip) ?? {
      zip: request.eventZip,
      city: request.eventCity ?? 'Unknown',
      additionalCapacity: 0,
    };
    current.additionalCapacity += 1;
    zipCounts.set(request.eventZip, current);
  }

  const affectedZips = [...zipCounts.values()]
    .sort((a, b) => b.additionalCapacity - a.additionalCapacity)
    .slice(0, 4);

  return {
    scenarioType: 'mail_shortage',
    summary: `If mailed materials are unavailable, approximately ${displaced} requests would need to be rerouted, delayed, or converted to pickup. That pushes open backlog from ${before.pendingBacklog} to ${after.pendingBacklog} and increases expected response time to ${after.avgResponseDays} days.`,
    before,
    after,
    affectedZips: affectedZips.length ? affectedZips : defaultZipRows(zipMap),
    tradeoffs: [
      'Partners outside the service area would be affected first because they rely on mail fulfillment.',
      'Pickup and staffed-event alternatives would need manual coordination.',
      'Inventory shortages would create reputational risk if requestors are not contacted quickly.',
    ],
  };
}

function simulateServiceAreaExpansion(requests, baseline, target, zipMap) {
  const targetZips = findTargetZips(target, zipMap);
  const currentlyOutOfArea = targetZips.filter((item) => !SERVICE_AREA_ZIPS.has(item.zip));
  const impacted = currentlyOutOfArea.length ? currentlyOutOfArea : targetZips;
  const additionalCapacity = impacted.reduce((sum, item) => sum + item.count, 0);

  const before = {
    staffCapacity: baseline.staffCapacity,
    monthlyDeployments: baseline.monthlyDeployments,
    pendingBacklog: baseline.pendingBacklog,
    avgResponseDays: baseline.avgResponseDays,
  };
  const after = {
    staffCapacity: before.staffCapacity + Math.max(1, Math.ceil(additionalCapacity / 6)),
    monthlyDeployments: before.monthlyDeployments + additionalCapacity,
    pendingBacklog: before.pendingBacklog + Math.max(0, additionalCapacity - 2),
    avgResponseDays: round1(clamp(before.avgResponseDays + additionalCapacity / 12, 1, 21)),
  };

  const affectedZips = (impacted.length ? impacted : defaultZipRows(zipMap))
    .slice(0, 4)
    .map((item) => ({
      zip: item.zip,
      city: item.city,
      additionalCapacity: Math.max(1, item.count),
    }));

  return {
    scenarioType: 'service_area_expansion',
    summary: `Expanding the service area into ${titleCase(target)} would make ${additionalCapacity} existing requests better candidates for staffed support or local coordination. It would also raise deployment demand and likely require a larger field footprint to avoid backlog growth.`,
    before,
    after,
    affectedZips,
    tradeoffs: [
      'New service-area coverage requires local staffing, routing rules, and partner communications.',
      'Travel and logistics costs rise first, before the coverage benefits stabilize.',
      'This scenario is strongest where current demand already exists just outside the footprint.',
    ],
  };
}

function simulateGeneral(baseline, zipMap, scenario) {
  const before = {
    staffCapacity: baseline.staffCapacity,
    monthlyDeployments: baseline.monthlyDeployments,
    pendingBacklog: baseline.pendingBacklog,
    avgResponseDays: baseline.avgResponseDays,
  };

  return {
    scenarioType: 'general',
    summary: `The scenario "${scenario}" does not map to a structured capacity rule yet, so the simulator kept baseline operational metrics unchanged. Try specifying staff changes, demand shifts, mail shortages, or service-area expansion for a modeled result.`,
    before,
    after: { ...before },
    affectedZips: defaultZipRows(zipMap),
    tradeoffs: [
      'The simulator is optimized for capacity, demand, inventory, and service-area changes.',
      'Free-form strategic scenarios need more explicit operational assumptions to model accurately.',
    ],
  };
}

export function simulateScenario(requests, scenario) {
  const normalizedScenario = String(scenario ?? '').trim();
  const zipMap = buildZipLoadMap(requests);
  const baseline = getBaselineMetrics(requests);
  const parsed = parseScenario(normalizedScenario);

  let result;
  switch (parsed.type) {
    case 'staff_delta':
      result = simulateStaffDelta(requests, baseline, parsed.amount, zipMap);
      break;
    case 'staff_capacity_percent':
      result = simulateStaffCapacityPercent(baseline, parsed.percent, zipMap);
      break;
    case 'demand_multiplier':
      result = simulateDemandMultiplier(requests, baseline, parsed.multiplier, parsed.region, zipMap);
      break;
    case 'mail_shortage':
      result = simulateMailShortage(requests, baseline, zipMap);
      break;
    case 'service_area_expansion':
      result = simulateServiceAreaExpansion(requests, baseline, parsed.target, zipMap);
      break;
    default:
      result = simulateGeneral(baseline, zipMap, normalizedScenario);
      break;
  }

  return {
    scenario: normalizedScenario,
    summary: result.summary,
    before: result.before,
    after: result.after,
    affectedZips: result.affectedZips,
    tradeoffs: result.tradeoffs,
    scenarioType: result.scenarioType,
    impactSummary: result.summary,
    coverageChange: result.scenarioType === 'service_area_expansion'
      ? `Expanded coverage toward ${titleCase(parsed.target ?? '')}.`
      : 'No direct service-area boundary change modeled.',
    resourceTradeoffs: result.tradeoffs.join(' '),
    recommendations: result.tradeoffs.slice(0, 3),
  };
}
