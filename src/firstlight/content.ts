import type { MissionStage } from "./types";

export const STAGES: MissionStage[] = [
  "arrival",
  "survey",
  "placement",
  "power",
  "cooling",
  "network",
  "commissioning",
  "fault",
  "retest",
  "handover",
  "reflection",
  "expansion",
  "complete",
];

export const OBJECTIVES: Record<
  MissionStage,
  { title: string; instruction: string; target: string; label: string }
> = {
  arrival: {
    title: "A place to begin.",
    instruction: "Your first day at the facility.",
    target: "delivery",
    label: "Begin",
  },
  survey: {
    title: "Meet your first delivery",
    instruction:
      "Inspect the pallet outside Hall 01. Find out what arrived before you install it.",
    target: "delivery",
    label: "Find the delivery",
  },
  placement: {
    title: "Give the rack a home",
    instruction:
      "Choose a bay in Hall 01. Compare the utility routes, then confirm installation.",
    target: "bay-0",
    label: "Choose a bay",
  },
  power: {
    title: "Trace the power",
    instruction:
      "Select the electrical room. Connect its ready distribution circuit to your rack.",
    target: "power",
    label: "Find the electrical room",
  },
  cooling: {
    title: "Give the heat a way out",
    instruction:
      "Select the cooling plant and connect the rack’s cooling circuit.",
    target: "cooling",
    label: "Find the cooling plant",
  },
  network: {
    title: "Connect to the outside",
    instruction:
      "Select the network exchange. Complete the path to the university.",
    target: "network",
    label: "Find the network exchange",
  },
  commissioning: {
    title: "Test before you promise",
    instruction:
      "Run a controlled load test. The university is still safely disconnected.",
    target: "rack",
    label: "Inspect the rack",
  },
  fault: {
    title: "Find the missing response",
    instruction:
      "The cooling plant is connected, but its control is in manual standby. Inspect the control panel.",
    target: "controls",
    label: "Find the control panel",
  },
  retest: {
    title: "Prove the correction",
    instruction:
      "Run the same test again. A repaired setting is not a verified result.",
    target: "rack",
    label: "Inspect the rack",
  },
  handover: {
    title: "Bring the first service online",
    instruction:
      "All acceptance checks passed. Admit the university’s 6 kW teaching workload.",
    target: "rack",
    label: "Inspect the rack",
  },
  reflection: {
    title: "What kept the hall offline?",
    instruction: "Explain the cause before accepting the next assignment.",
    target: "rack",
    label: "Review the system",
  },
  expansion: {
    title: "A bigger promise",
    instruction:
      "A new request arrives. Choose how you would prepare for an uncertain delivery.",
    target: "network",
    label: "View the campus",
  },
  complete: {
    title: "First light",
    instruction: "One hall commissioned. One promise kept.",
    target: "rack",
    label: "Explore the facility",
  },
};

export const TARGET_NAMES: Record<string, string> = {
  delivery: "Delivery apron",
  "bay-0": "Bay A · west",
  "bay-1": "Bay B · center",
  "bay-2": "Bay C · east",
  power: "Electrical room",
  cooling: "Cooling plant",
  network: "Network exchange",
  controls: "Cooling control",
  rack: "University rack",
};

export const LESSONS = [
  {
    id: "commissioning",
    title: "Installed does not mean ready",
    unlock: 1,
    principle:
      "Commissioning checks whether connected systems work together as intended. Tests, corrections, documentation, and operator preparation come before customer handover.",
    here: "The shell and incoming utility connection were ready before you arrived. Your assignment is to install and commission its first rack. Our short exercise represents one part of a much larger process.",
    publisher: "U.S. Department of Energy · FEMP",
    source: "Commissioning in Federal Buildings",
    url: "https://www.energy.gov/cmei/femp/commissioning-federal-buildings",
  },
  {
    id: "routes",
    title: "Follow the entire path",
    unlock: 3,
    principle:
      "A powered rack still needs heat removal and connectivity. Capacity is useful only when every required dependency is available.",
    here: "Each bay uses different route lengths. Connecting a source draws a route to the bay you actually chose; every service prerequisite is checked before handover.",
    publisher: "U.S. Department of Energy · 2024",
    source: "Best Practices Guide for Energy-Efficient Data Center Design",
    url: "https://www.energy.gov/cmei/femp/articles/best-practices-guide-energy-efficient-data-center-design",
  },
  {
    id: "cooling",
    title: "Cooling is a connected system",
    unlock: 4,
    principle:
      "Heat must move from the IT equipment through a cooling system to the environment. A connected unit can still fail to respond if its controls are wrong.",
    here: "The first test uses an illustrative 6 kW IT load. Manual standby prevents automatic heat removal; enabling the control and repeating the test verifies the response. This is a simplified exercise, not thermal engineering software.",
    publisher: "U.S. Department of Energy · FEMP",
    source: "Cooling Water Efficiency Opportunities for Federal Data Centers",
    url: "https://www.energy.gov/cmei/femp/cooling-water-efficiency-opportunities-federal-data-centers",
  },
  {
    id: "units",
    title: "Power and energy are different",
    unlock: 9,
    principle:
      "kW describes a rate of energy use. kWh describes energy used over time. A battery’s power rating alone cannot tell you how long it will supply a workload.",
    here: "At a steady 6 kW, one hour of IT operation uses 6 kWh. This chapter shows illustrative equipment power; it does not claim a measured annual PUE or a real construction quotation.",
    publisher: "U.S. Department of Energy · 2015",
    source: "United States Electricity Industry Primer",
    url: "https://www.energy.gov/sites/prod/files/2015/12/f28/united-states-electricity-industry-primer.pdf",
  },
  {
    id: "procurement",
    title: "The opening date has dependencies",
    unlock: 11,
    principle:
      "Grid connections, equipment delivery, installation, and testing can determine when a new hall can open. A hardware order is not operational capacity.",
    here: "The next assignment introduces fictional shipment uncertainty. The installed rack keeps working. Your preparation choice is recorded for the campaign; no real export law is being simulated.",
    publisher: "International Energy Agency · 2025",
    source: "Energy and AI: AI and energy security",
    url: "https://www.iea.org/reports/energy-and-ai/ai-and-energy-security",
  },
];

export const CHAPTERS = [
  {
    number: "01",
    title: "First light",
    description: "Commission the first hall",
    available: true,
  },
  {
    number: "02",
    title: "The promise",
    description: "Plan a phased expansion",
    available: true,
  },
  {
    number: "03",
    title: "The weak link",
    description: "Test what redundancy really means",
    available: true,
  },
  {
    number: "04",
    title: "The shipment",
    description: "Adapt to a disrupted supply chain",
    available: true,
  },
  {
    number: "05",
    title: "The long week",
    description: "Balance energy, water, and service",
    available: true,
  },
  {
    number: "06",
    title: "The handover",
    description: "Leave a resilient operation",
    available: true,
  },
];
