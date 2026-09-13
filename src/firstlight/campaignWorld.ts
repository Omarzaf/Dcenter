import { AppBase, Color, Entity, StandardMaterial } from "playcanvas";
import type { CampaignVisual, ExpansionPhase } from "../campaign/types";

type Point = [number, number, number];
const PHASES: ExpansionPhase[] = [
  "planned",
  "ordered",
  "foundation",
  "delivered",
  "installed",
  "commissioned",
  "online",
];

/** The expansion is visible construction, not operating capacity until handover. */
export function createCampaignWorld(app: AppBase, parent: Entity) {
  const root = new Entity("Campaign construction and resilience");
  parent.addChild(root);
  const batch = app.batcher?.addGroup("Campaign static phases", false, 90);
  const materials: StandardMaterial[] = [];
  function material(name: string, color: string, emissive = false) {
    const mat = new StandardMaterial();
    mat.name = name;
    mat.diffuse = new Color().fromString(color);
    mat.gloss = 0.23;
    if (emissive) {
      mat.emissive.copy(mat.diffuse);
      mat.emissiveIntensity = 0.45;
    }
    mat.update();
    materials.push(mat);
    return mat;
  }
  const concrete = material("Extension concrete", "#a4acae");
  const wall = material("Extension wall panels", "#cad0ca");
  const steel = material("Extension steel", "#596c76");
  const dark = material("Extension equipment casing", "#24333c");
  const soil = material("Surveyed construction plot", "#79796a");
  const timber = material("Crates and formwork", "#ad946d");
  const asphalt = material("Extension service apron", "#58636a");
  const yellow = material("Construction safety marking", "#dec086");
  const cyan = material("Primary physical corridor", "#73b5d3", true);
  const coolant = material("Expansion cooling circuit", "#73b5d3", true);
  const green = material("Independent physical corridor", "#82cfb2", true);
  const temporary = material(
    "Temporary critical-service route",
    "#ceadf0",
    true,
  );
  const warning = material("Dependency unavailable", "#e99a69", true);
  const equipmentLed = material(
    "Extension operating indicators",
    "#9cceb9",
    true,
  );
  const lampSurface = material("Extension interior lights", "#f3d5a2", true);

  function group(name: string, at: Point = [0, 0, 0]) {
    const entity = new Entity(name);
    entity.setLocalPosition(...at);
    root.addChild(entity);
    return entity;
  }
  function mesh(
    name: string,
    at: Point,
    size: Point,
    mat: StandardMaterial,
    owner = root,
    dynamic = false,
    shape: "box" | "cylinder" = "box",
  ) {
    const entity = new Entity(name);
    entity.addComponent("render", {
      type: shape,
      material: mat,
      castShadows: true,
      receiveShadows: true,
    });
    entity.setLocalPosition(...at);
    entity.setLocalScale(...size);
    owner.addChild(entity);
    if (batch && !dynamic && entity.render)
      entity.render.batchGroupId = batch.id;
    return entity;
  }
  const plot = group("Survey and reserved footprint", [25, 0, -1]);
  mesh("Extension plot", [0, -0.1, 0], [14, 0.2, 13], soil, plot);
  mesh(
    "Extension vehicle access",
    [1, -0.03, 9.5],
    [20, 0.12, 4.8],
    asphalt,
    plot,
  );
  for (const x of [-6.5, 6.5])
    for (const z of [-6, 6]) {
      mesh("Survey stake", [x, 0.45, z], [0.09, 0.9, 0.09], yellow, plot);
      mesh("Survey marker", [x, 0.8, z], [0.38, 0.14, 0.04], yellow, plot);
    }
  for (const z of [-6, 6])
    mesh("Plot safety line", [0, 0.025, z], [13, 0.02, 0.1], yellow, plot);
  for (let i = 0; i < 6; i++)
    mesh(
      "Extension road marking",
      [-7 + i * 3, 0.045, 9.5],
      [1.5, 0.016, 0.08],
      concrete,
      plot,
    );

  const structure = group("Extension slab and structural frame", [25, 0, -1]);
  mesh("Poured slab", [0, 0.2, 0], [12, 0.4, 11], concrete, structure);
  for (const x of [-5.8, 0, 5.8]) {
    mesh(
      "North structural column",
      [x, 2.55, -5.2],
      [0.24, 4.7, 0.24],
      steel,
      structure,
    );
    mesh(
      "North framing beam",
      [x, 4.85, -5.2],
      [5.6, 0.25, 0.3],
      steel,
      structure,
    );
  }
  for (const z of [-4.6, -1, 3.5])
    mesh(
      "West frame column",
      [-5.8, 2.1, z],
      [0.2, 3.8, 0.2],
      steel,
      structure,
    );
  for (let z = -4.5; z < 5; z += 1.2)
    mesh(
      "Slab expansion seam",
      [0, 0.407, z],
      [11.6, 0.012, 0.017],
      steel,
      structure,
    );
  const works = group("Active construction equipment", [25, 0, -1]);
  for (const x of [-5, 5]) {
    mesh(
      "Temporary works trestle",
      [x, 0.68, 4.4],
      [1.4, 0.1, 0.12],
      yellow,
      works,
    );
    for (const side of [-0.52, 0.52])
      mesh(
        "Trestle foot",
        [x + side, 0.34, 4.4],
        [0.1, 0.62, 0.15],
        dark,
        works,
      );
  }
  mesh("Stacked wall panels", [3, 0.8, -2], [3.3, 0.7, 2.2], wall, works);
  mesh("Hoist mast", [-6.8, 4.5, -4.8], [0.3, 9, 0.3], yellow, works);
  mesh("Hoist boom", [-3.6, 8.9, -4.8], [6.7, 0.24, 0.24], yellow, works);
  mesh("Hoist cable", [-0.5, 6.7, -4.8], [0.025, 4.3, 0.025], dark, works);
  const delivery = group("Delivered expansion equipment", [25, 0, -1]);
  for (const [x, z] of [
    [-3, 2.8],
    [0, 2.8],
    [3, 2.8],
  ]) {
    mesh("Expansion pallet", [x, 0.5, z], [1.8, 0.16, 1.9], timber, delivery);
    mesh(
      "Sealed delivery crate",
      [x, 1.55, z],
      [1.65, 1.9, 1.75],
      timber,
      delivery,
    );
    for (const side of [-0.55, 0.55])
      mesh(
        "Crate restraint",
        [x + side, 1.6, z + 0.88],
        [0.1, 2, 0.03],
        dark,
        delivery,
      );
  }
  const fitted = group("Installed extension hall", [25, 0, -1]);
  mesh("North enclosure", [0, 2.65, -5.1], [11.5, 4.5, 0.2], wall, fitted);
  mesh(
    "North clerestory strip",
    [0, 3.9, -4.97],
    [10, 0.65, 0.05],
    dark,
    fitted,
  );
  mesh(
    "West enclosure cutaway",
    [-5.72, 1.7, -0.3],
    [0.18, 2.6, 9.9],
    wall,
    fitted,
  );
  for (const z of [-3.6, -3.1])
    mesh(
      "Extension overhead tray",
      [0, 3.5, z],
      [10.8, 0.14, 0.08],
      steel,
      fitted,
    );
  for (let x = -5; x <= 5; x++)
    mesh(
      "Extension tray rung",
      [x, 3.45, -3.35],
      [0.07, 0.08, 0.65],
      steel,
      fitted,
    );
  for (const x of [-3, 0, 3]) {
    mesh("Expansion rack casing", [x, 1.93, 0.3], [1.45, 3, 1.8], dark, fitted);
    mesh(
      "Expansion rack plinth",
      [x, 0.46, 0.3],
      [1.65, 0.15, 2],
      steel,
      fitted,
    );
    for (let i = 0; i < 7; i++) {
      mesh(
        "Expansion server tray",
        [x, 0.85 + i * 0.33, 1.22],
        [1.22, 0.2, 0.07],
        steel,
        fitted,
      );
      mesh(
        "Expansion status lamp",
        [x + 0.44, 0.85 + i * 0.33, 1.265],
        [0.07, 0.03, 0.012],
        equipmentLed,
        fitted,
      );
    }
    mesh(
      "Extension overhead luminaire",
      [x, 3.02, -4.85],
      [1.3, 0.08, 0.13],
      lampSurface,
      fitted,
    );
  }
  mesh(
    "Expansion utility bus",
    [0, 0.47, 3.2],
    [10.8, 0.06, 0.16],
    yellow,
    fitted,
  );
  mesh(
    "Expansion heat removal line",
    [0, 0.49, -1.9],
    [10.8, 0.07, 0.13],
    coolant,
    fitted,
  );
  const interiorLamp = new Entity("Extension warm work light");
  interiorLamp.addComponent("light", {
    type: "omni",
    color: new Color(1, 0.85, 0.65),
    intensity: 0,
    range: 13,
    castShadows: false,
  });
  interiorLamp.setLocalPosition(25, 3, -2);
  root.addChild(interiorLamp);

  const reserve = group("Installed finite energy reserve", [-10, 0, -10.3]);
  mesh("Reserve concrete pad", [0, 0.1, 0], [3, 0.2, 1.9], concrete, reserve);
  for (const x of [-0.8, 0, 0.8]) {
    mesh("Battery cabinet", [x, 1, 0], [0.7, 1.8, 1.5], wall, reserve);
    mesh("Battery door", [x, 1, 0.76], [0.6, 1.5, 0.025], steel, reserve);
    mesh(
      "Battery hazard label",
      [x, 1.2, 0.8],
      [0.22, 0.22, 0.018],
      yellow,
      reserve,
    );
  }
  const batteryFill = mesh(
    "Stored energy indicator",
    [0, 0.85, 0.81],
    [0.15, 1, 0.03],
    green,
    reserve,
    true,
  );
  const separatePower = group("Separated distribution path");
  mesh(
    "Independent electrical cabinet",
    [-11.6, 1.2, -6.8],
    [1.1, 2.4, 1.1],
    steel,
    separatePower,
  );
  mesh(
    "Separated electrical feeder",
    [-8, 0.18, -6.5],
    [7, 0.12, 0.13],
    yellow,
    separatePower,
  );
  const hybrid = group("Installed hybrid cooling equipment", [11, 0, -8]);
  mesh("Dry cooler module", [0, 1.3, 0], [3.4, 2.3, 2.2], steel, hybrid);
  for (const x of [-0.9, 0.9])
    mesh(
      "Dry cooler fan housing",
      [x, 2.53, 0],
      [1.3, 0.13, 1.3],
      dark,
      hybrid,
      false,
      "cylinder",
    );
  for (let i = 0; i < 5; i++)
    mesh(
      "Dry heat exchanger fin",
      [0, 0.7 + i * 0.3, 1.12],
      [3, 0.04, 0.04],
      dark,
      hybrid,
    );

  function route(name: string, points: Point[], mat: StandardMaterial) {
    const owner = group(name);
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1],
        b = points[i],
        length = Math.hypot(b[0] - a[0], b[2] - a[2]);
      const segment = mesh(
        name,
        [(a[0] + b[0]) / 2, 0.15, (a[2] + b[2]) / 2],
        [length, 0.06, 0.11],
        mat,
        owner,
      );
      segment.setLocalEulerAngles(
        0,
        (-Math.atan2(b[2] - a[2], b[0] - a[0]) * 180) / Math.PI,
        0,
      );
    }
    return owner;
  }
  const sharedA = route(
    "Carrier A shared landing corridor",
    [
      [5.9, 0, -5.4],
      [5.9, 0, -19],
      [31, 0, -19],
    ],
    cyan,
  );
  const sharedB = route(
    "Carrier B on the same corridor",
    [
      [6.3, 0, -5.4],
      [6.3, 0, -18.6],
      [31, 0, -18.6],
    ],
    cyan,
  );
  const diverse = route(
    "Testable independent western corridor",
    [
      [5.5, 0, -5.4],
      [5.5, 0, -10.7],
      [-11, 0, -10.7],
      [-11, 0, -21],
      [-31, 0, -21],
    ],
    green,
  );
  const outage = group("Unavailable shared corridor");
  const emergency = route(
    "Delivered temporary critical-service connection",
    [
      [5.1, 0, -5.4],
      [5.1, 0, -8.7],
      [-7, 0, -8.7],
      [-7, 0, 12],
      [-20, 0, 12],
    ],
    temporary,
  );
  for (const offset of [-0.3, 0.3]) {
    const cross = mesh(
      "Shared route interruption",
      [6.1, 0.3, -14],
      [1.5, 0.12, 0.14],
      warning,
      outage,
    );
    cross.setLocalEulerAngles(0, offset > 0 ? 45 : -45, 0);
  }
  const heat = group("Heat episode site indicators");
  mesh(
    "Grid restriction warning",
    [-4.6, 3, -7.3],
    [0.24, 0.24, 0.1],
    warning,
    heat,
  );
  mesh(
    "Water allocation warning",
    [12, 1.5, -3.1],
    [0.22, 0.22, 0.08],
    warning,
    heat,
  );

  let signature = "",
    night = 0,
    current: CampaignVisual | undefined;
  function applyLights() {
    const online = current?.expansionPhase === "online";
    equipmentLed.emissiveIntensity = online
      ? (0.55 + night * 0.7) * (current?.serviceFraction ?? 1)
      : 0.02;
    equipmentLed.update();
    lampSurface.emissiveIntensity = 0.2 + night * 1.5;
    lampSurface.update();
    if (interiorLamp.light) interiorLamp.light.intensity = night * 1.8;
    interiorLamp.enabled =
      root.enabled &&
      PHASES.indexOf(current?.expansionPhase ?? "planned") >= 4 &&
      night > 0.05;
  }
  root.enabled = false;
  return {
    update(next?: CampaignVisual) {
      const nextSignature = JSON.stringify(next ?? null);
      if (nextSignature === signature) return false;
      signature = nextSignature;
      current = next;
      root.enabled = Boolean(next);
      if (next) {
        const phase = PHASES.indexOf(next.expansionPhase);
        structure.enabled = phase >= 2;
        works.enabled = phase >= 2 && phase < 4;
        delivery.enabled = phase === 3;
        fitted.enabled = phase >= 4;
        reserve.enabled = next.batteryInstalled;
        separatePower.enabled = next.powerSeparated;
        hybrid.enabled = next.hybridCooling && phase >= 4;
        sharedA.enabled = next.chapter >= 3;
        sharedB.enabled = next.chapter >= 3 && !next.networkDiverse;
        diverse.enabled = next.networkDiverse;
        emergency.enabled = next.emergencyRoute;
        outage.enabled = next.cableOutage;
        heat.enabled = next.heat;
        batteryFill.setLocalScale(
          0.15,
          Math.max(0.01, next.batteryFraction),
          0.03,
        );
        batteryFill.setLocalPosition(0, 0.35 + next.batteryFraction / 2, 0.81);
        cyan.emissiveIntensity = next.cableOutage ? 0.02 : 0.42;
        cyan.diffuse.fromString(next.cableOutage ? "#625a5a" : "#73b5d3");
        cyan.update();
        green.emissiveIntensity = next.networkTested ? 0.7 : 0.15;
        green.update();
      }
      applyLights();
      if (batch) app.batcher?.generate([batch.id]);
      return true;
    },
    setNight(amount: number) {
      if (Math.abs(night - amount) < 0.01) return;
      night = amount;
      applyLights();
    },
    dispose() {
      if (batch) app.batcher?.removeGroup(batch.id);
      root.destroy();
      for (const mat of materials) mat.destroy();
    },
  };
}
