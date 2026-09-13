import {
  AppBase,
  Color,
  Entity,
  StandardMaterial,
  Vec2,
  Vec3,
  PROJECTION_PERSPECTIVE,
  BLEND_NORMAL,
  TONEMAP_ACES,
  type CameraComponent,
} from "playcanvas";
import type { FacilitySceneProps, Utility } from "./types";
import { createFacilityAtmosphere } from "./facilityAtmosphere";
import { addFacilityDetails } from "./facilityDetails";
import { createCampaignWorld } from "./campaignWorld";

type Point = [number, number, number];
type Swatch =
  | "grass"
  | "grassLight"
  | "earth"
  | "concrete"
  | "floor"
  | "seam"
  | "wall"
  | "trim"
  | "asphalt"
  | "white"
  | "glass"
  | "steel"
  | "dark"
  | "wood"
  | "amber"
  | "water"
  | "data"
  | "leaf"
  | "leafLight"
  | "bark"
  | "paper"
  | "red"
  | "green";

const palette: Record<Swatch, string> = {
  grass: "#999d86",
  grassLight: "#aaa98c",
  earth: "#73796b",
  concrete: "#b7b8b2",
  floor: "#cacbc4",
  seam: "#acb0ac",
  wall: "#d8d5cc",
  trim: "#6a777b",
  asphalt: "#555c61",
  white: "#e6e4dc",
  glass: "#718b9a",
  steel: "#657c84",
  dark: "#2b363e",
  wood: "#ae956e",
  amber: "#e1ad5d",
  water: "#68b8b6",
  data: "#86afd4",
  leaf: "#59695a",
  leafLight: "#7a866d",
  bark: "#756f5e",
  paper: "#e9e7dc",
  red: "#e78260",
  green: "#a8ce89",
};

export const BAY_X = [-3.7, -0.1, 3.5] as const;
export const TARGETS: Record<
  string,
  { point: Point; label: string; short: string }
> = {
  expansion: {
    point: [25, 1.7, -0.5],
    label: "Inspect the expansion",
    short: "Hall 02",
  },
  battery: {
    point: [-10, 2.3, -10.3],
    label: "Inspect the energy reserve",
    short: "Reserve",
  },
  delivery: {
    point: [-8.5, 1.3, 6.8],
    label: "Inspect the delivery",
    short: "Delivery",
  },
  "bay-0": { point: [-3.7, 0.4, 1], label: "Select Bay A", short: "Bay A" },
  "bay-1": { point: [-0.1, 0.4, 1], label: "Select Bay B", short: "Bay B" },
  "bay-2": { point: [3.5, 0.4, 1], label: "Select Bay C", short: "Bay C" },
  power: {
    point: [-3.8, 3, -7.5],
    label: "Inspect the electrical room",
    short: "Power room",
  },
  cooling: {
    point: [10.2, 2.2, 1.5],
    label: "Inspect the cooling plant",
    short: "Cooling plant",
  },
  network: {
    point: [5.9, 2.3, -5.4],
    label: "Inspect the network connection",
    short: "Network",
  },
  controls: {
    point: [5.8, 1.5, 3.7],
    label: "Inspect the cooling control",
    short: "Cooling control",
  },
  rack: {
    point: [-0.1, 3.1, 1],
    label: "Inspect the installed rack",
    short: "Rack 01",
  },
};

export interface FacilityWorld {
  camera: Entity;
  update: (props: FacilitySceneProps) => void;
  animate: (dt: number, enabled: boolean) => void;
  focus: (
    width: number,
    height: number,
    zoom: number,
    pan: Point,
    orbit?: [number, number],
  ) => void;
  getHour: () => number;
  project: (point: Point) => Vec3;
  rackPoint: () => Point;
  needsAnimation: () => boolean;
  dispose: () => void;
}

/** A deliberately small, original geometry kit; no downloaded models or artwork. */
export function createFacilityWorld(app: AppBase): FacilityWorld {
  const materials: StandardMaterial[] = [];
  const sceneRoot = new Entity("First Light campus");
  app.root.addChild(sceneRoot);
  const architectureBatch = app.batcher?.addGroup("Static facility", false, 60);

  function material(color: string, glow = 0, opacity = 1): StandardMaterial {
    const mat = new StandardMaterial();
    mat.diffuse = new Color().fromString(color);
    mat.gloss = 0.15;
    if (glow > 0) {
      mat.emissive = new Color().fromString(color);
      mat.emissiveIntensity = glow;
    }
    if (opacity < 1) {
      mat.opacity = opacity;
      mat.blendType = BLEND_NORMAL;
      mat.depthWrite = false;
    }
    mat.update();
    materials.push(mat);
    return mat;
  }
  const swatches = Object.fromEntries(
    Object.entries(palette).map(([key, color]) => [key, material(color)]),
  ) as Record<Swatch, StandardMaterial>;
  for (const surface of ["steel", "trim", "dark", "glass"] as const) {
    swatches[surface].useMetalness = true;
    swatches[surface].metalness = surface === "glass" ? 0.25 : 0.35;
    swatches[surface].gloss = surface === "glass" ? 0.65 : 0.3;
    swatches[surface].update();
  }
  const glowAmber = material(palette.amber, 0.55);
  const statusMaterial = material(palette.dark);
  const controlMaterial = material(palette.water, 0.2);
  const heatMaterial = material(palette.red, 0.18, 0.2);
  const bayMaterial = material(palette.water, 0.18, 0.22);
  const selectionMaterial = material(palette.amber, 0.5);
  const routeMaterials: Record<Utility, StandardMaterial> = {
    power: material(palette.amber, 0.35),
    cooling: material(palette.water, 0.3),
    network: material(palette.data, 0.3),
  };

  function primitive(
    name: string,
    at: Point,
    size: Point,
    color: Swatch | StandardMaterial,
    shape: "box" | "cylinder" | "sphere" | "cone" = "box",
    parent = sceneRoot,
    shadows = true,
  ): Entity {
    const entity = new Entity(name);
    entity.addComponent("render", {
      type: shape,
      material: typeof color === "string" ? swatches[color] : color,
      castShadows: shadows,
      receiveShadows: true,
    });
    entity.setLocalPosition(...at);
    entity.setLocalScale(...size);
    parent.addChild(entity);
    // Only immutable architecture participates. Equipment, indicators, routes,
    // placement highlights and every movable group retain their own transforms.
    if (
      architectureBatch &&
      parent === sceneRoot &&
      typeof color === "string"
    ) {
      entity.render!.batchGroupId = architectureBatch.id;
    }
    return entity;
  }
  function box(
    name: string,
    at: Point,
    size: Point,
    color: Swatch | StandardMaterial,
    parent = sceneRoot,
    shadows = true,
  ) {
    return primitive(name, at, size, color, "box", parent, shadows);
  }
  function cylinder(
    name: string,
    at: Point,
    size: Point,
    color: Swatch | StandardMaterial,
    parent = sceneRoot,
  ) {
    return primitive(name, at, size, color, "cylinder", parent);
  }
  function group(
    name: string,
    at: Point = [0, 0, 0],
    parent = sceneRoot,
  ): Entity {
    const entity = new Entity(name);
    entity.setLocalPosition(...at);
    parent.addChild(entity);
    return entity;
  }
  function stripe(
    at: Point,
    size: Point,
    color: Swatch = "white",
    parent = sceneRoot,
  ) {
    return box("Painted ground marking", at, size, color, parent, false);
  }

  // A landscape continues beyond the site: the game occupies a place, not a display plinth.
  box(
    "Surrounding landscape",
    [0, -0.65, 0],
    [160, 0.6, 150],
    "grass",
    sceneRoot,
    false,
  );
  box("Site foundations", [0, -0.24, 0], [31, 0.5, 24], "concrete");
  box(
    "Service road",
    [0, 0.025, 9.1],
    [31, 0.08, 4.8],
    "asphalt",
    sceneRoot,
    false,
  );
  box(
    "Access road",
    [-14.5, -0.05, 18],
    [4.8, 0.1, 22],
    "asphalt",
    sceneRoot,
    false,
  );
  box(
    "Public road",
    [0, -0.15, 27],
    [160, 0.1, 6],
    "asphalt",
    sceneRoot,
    false,
  );
  for (let i = -10; i <= 10; i++)
    stripe([i * 5, -0.075, 27], [2.2, 0.015, 0.12], "paper");
  for (let i = -5; i < 6; i++)
    stripe([i * 2.6, 0.08, 9.2], [1.25, 0.018, 0.09], "paper");
  for (let z = 13; z < 25; z += 3)
    stripe([-14.5, 0.025, z], [0.1, 0.015, 1.25]);
  box("Pedestrian path", [-12.2, 0.05, 0.2], [1.5, 0.15, 15], "floor");
  for (let i = 0; i < 6; i++)
    stripe([-12.2, 0.1, 7.2 + i * 0.5], [1.4, 0.018, 0.23]);

  // Hall A is cut away on the two faces nearest the player.
  box("Hall A slab", [-0.3, 0.19, 0.2], [14.8, 0.38, 12], "floor");
  box("North wall", [-0.3, 2.35, -5.75], [14.8, 4.25, 0.22], "wall");
  box("West wall", [-7.65, 1.72, -0.5], [0.2, 3.05, 10.6], "wall");
  box("West wall cap", [-7.65, 3.3, -0.5], [0.35, 0.18, 10.8], "trim");
  box("North wall cap", [-0.3, 4.52, -5.75], [15, 0.2, 0.4], "trim");
  box("Front cutaway sill", [-0.3, 0.42, 6.12], [14.8, 0.12, 0.24], "trim");
  box("East cutaway sill", [7.1, 0.42, 0.2], [0.2, 0.12, 12], "trim");
  for (let i = 0; i < 7; i++) {
    box(
      "Clerestory frame",
      [-6.3 + i * 2, 3.55, -5.59],
      [1.65, 0.85, 0.09],
      "trim",
    );
    box(
      "Clerestory glazing",
      [-6.3 + i * 2, 3.55, -5.51],
      [1.47, 0.65, 0.08],
      "glass",
    );
  }
  for (let x = -6.7; x < 7; x += 1.2)
    stripe([x, 0.394, 0.2], [0.022, 0.009, 11.5], "seam");
  for (let z = -4.9; z < 6; z += 1.2)
    stripe([-0.3, 0.395, z], [14.4, 0.009, 0.022], "seam");
  for (const x of [-7.1, -0.2, 6.5]) {
    box("Structural column", [x, 2.42, -5.48], [0.26, 4.05, 0.3], "trim");
    box(
      "Wall-mounted luminaire",
      [x + 0.45, 2.9, -5.33],
      [0.42, 0.15, 0.15],
      glowAmber,
    );
  }
  // A high, open cable tray visually establishes infrastructure above the empty floor.
  for (const z of [-3.9, -3.35])
    box("Cable tray side rail", [-0.2, 3.4, z], [12.9, 0.12, 0.1], "steel");
  for (let x = -6; x <= 6; x += 0.7)
    box(
      "Cable tray rung",
      [x, 3.35, -3.63],
      [0.07, 0.08, 0.57],
      "steel",
      sceneRoot,
      false,
    );
  for (const x of [-5.6, 0, 5.8])
    box(
      "Cable tray suspension",
      [x, 3.91, -3.63],
      [0.04, 1.15, 0.04],
      "trim",
      sceneRoot,
      false,
    );

  // Clear aisles and three distinct build footprints, retained even before equipment arrives.
  const bayHighlights: Entity[] = [];
  for (let i = 0; i < 3; i++) {
    const x = BAY_X[i];
    box(`Rack bay ${i + 1} plinth`, [x, 0.43, 1], [2.1, 0.08, 2.6], "concrete");
    for (const side of [-1, 1]) {
      stripe([x + side * 1.02, 0.484, 1], [0.055, 0.012, 2.6], "white");
      stripe([x, 0.484, 1 + side * 1.27], [2.1, 0.012, 0.055], "white");
    }
    const highlight = box(
      `Available bay ${i + 1}`,
      [x, 0.49, 1],
      [2.03, 0.015, 2.53],
      bayMaterial,
      sceneRoot,
      false,
    );
    bayHighlights.push(highlight);
    for (let n = 0; n <= i; n++)
      stripe([x - i * 0.11 + n * 0.22, 0.405, 3], [0.12, 0.012, 0.43], "trim");
  }
  for (let i = 0; i < 8; i++)
    stripe([-5.5 + i * 1.5, 0.405, 4.8], [0.48, 0.012, 0.09], "amber");

  // The ready electrical room: two switchboards, insulated bushings and a shared incoming feed.
  box("Electrical room foundation", [-4.3, 0.2, -8], [7.5, 0.4, 3.8], "floor");
  box("Electrical room back wall", [-4.3, 1.9, -9.85], [7.5, 3.4, 0.2], "trim");
  box("Electrical room roof", [-4.3, 3.65, -8.6], [7.9, 0.2, 2.7], "steel");
  for (let i = 0; i < 3; i++) {
    const x = -6.6 + i * 1.6;
    box(
      "Switchgear cabinet",
      [x, 1.54, -8],
      [1.35, 2.65, 1.25],
      i === 2 ? "steel" : "concrete",
    );
    box("Cabinet inset panel", [x, 1.62, -7.35], [1.08, 1.95, 0.05], "trim");
    box("Cabinet display", [x - 0.12, 2.15, -7.31], [0.48, 0.3, 0.04], "dark");
    box("Safety tag", [x + 0.32, 1.35, -7.3], [0.2, 0.28, 0.04], "amber");
    box("Cabinet handle", [x + 0.43, 1.6, -7.29], [0.035, 0.35, 0.05], "white");
    for (let n = 0; n < 4; n++)
      box(
        "Vent louvre",
        [x, 0.68 + n * 0.13, -7.3],
        [0.84, 0.035, 0.04],
        "dark",
        sceneRoot,
        false,
      );
  }
  box("Transformer foundation", [-10.5, 0.2, -7.8], [3, 0.4, 3.3], "floor");
  box("Transformer tank", [-10.5, 1.22, -7.8], [1.6, 1.8, 1.8], "steel");
  for (let i = 0; i < 7; i++)
    box(
      "Transformer radiator fin",
      [-11.41, 1.22, -8.45 + i * 0.22],
      [0.22, 1.6, 0.08],
      "trim",
    );
  for (const x of [-11, -10.5, -10]) {
    cylinder("Transformer bushing", [x, 2.4, -7.8], [0.15, 0.7, 0.15], "paper");
    for (let n = 0; n < 3; n++)
      cylinder(
        "Bushing insulator",
        [x, 2.15 + n * 0.17, -7.8],
        [0.27, 0.06, 0.27],
        "white",
      );
  }
  box(
    "Incoming utility duct",
    [-10.5, 0.22, -11.4],
    [0.28, 0.24, 3.5],
    "amber",
  );

  // Cooling yard: two packaged units with real fan rings, impellers, intake fins and paired pipes.
  box("Cooling plant pad", [10.5, 0.22, 0.3], [5.1, 0.44, 9.5], "floor");
  const fans: Entity[] = [];
  for (const z of [-1.6, 2.4]) {
    box("Cooling unit base", [10.4, 0.55, z], [3.1, 0.18, 3], "dark");
    box("Air-cooled unit casing", [10.4, 1.22, z], [2.85, 1.3, 2.7], "wall");
    for (const side of [-1, 1])
      for (let n = 0; n < 7; n++) {
        box(
          "Heat exchanger fin",
          [10.4 + side * 1.44, 0.75 + n * 0.13, z],
          [0.045, 0.045, 2.35],
          "trim",
          sceneRoot,
          false,
        );
      }
    cylinder("Fan housing", [10.4, 1.95, z], [2, 0.2, 2], "trim");
    cylinder("Fan shadow", [10.4, 2.055, z], [1.72, 0.025, 1.72], "dark");
    const fan = group("Cooling fan impeller", [10.4, 2.1, z]);
    for (let n = 0; n < 4; n++) {
      const blade = box(
        "Fan blade",
        [0.39, 0, 0],
        [0.88, 0.025, 0.24],
        "concrete",
        group("Blade arm", [0, 0, 0], fan),
        false,
      );
      blade.parent?.setLocalEulerAngles(0, n * 90 + 25, 0);
    }
    cylinder("Fan hub", [0, 0.04, 0], [0.25, 0.1, 0.25], "white", fan);
    fans.push(fan);
    for (const delta of [-0.38, 0.38]) {
      box(
        "Plant pipe to hall",
        [8.25, 0.83, z + delta],
        [1.9, 0.12, 0.12],
        delta < 0 ? "water" : "steel",
      );
      cylinder(
        "Pipe riser",
        [7.4, 0.6, z + delta],
        [0.13, 0.52, 0.13],
        "steel",
      );
    }
  }
  // The prepared plant header feeds a west-side manifold; bay connection cost concerns
  // the branch from this manifold, not the common, already-installed yard pipework.
  for (const offset of [-0.16, 0.16]) {
    box(
      "Prepared cooling header east riser",
      [7.4, 0.83, -3.25 + offset],
      [0.1, 0.1, 3.3],
      "steel",
    );
    box(
      "Prepared cooling header along north wall",
      [0.35, 0.83, -4.8 + offset],
      [14.2, 0.1, 0.1],
      "steel",
    );
    box(
      "Prepared cooling header west return",
      [-6.7 + offset, 0.83, -2.95],
      [0.1, 0.1, 3.7],
      "steel",
    );
  }
  box("West cooling manifold", [-6.45, 0.9, -0.95], [0.68, 0.58, 0.48], "trim");
  cylinder("Manifold valve", [-6.45, 1.27, -0.95], [0.3, 0.09, 0.3], "water");
  box(
    "Ready manifold connection",
    [-6.02, 0.56, -0.95],
    [0.4, 0.12, 0.12],
    "water",
  );

  // Meet-me room, control panel and everyday working details give the hall a human scale.
  box("Network cabinet", [5.65, 1.54, -4.6], [1.5, 2.35, 1.1], "steel");
  box("Network cabinet front", [5.65, 1.53, -4.02], [1.3, 2.1, 0.06], "dark");
  for (let n = 0; n < 9; n++) {
    box(
      "Network switch",
      [5.65, 0.69 + n * 0.21, -3.96],
      [1.11, 0.15, 0.05],
      "trim",
      sceneRoot,
      false,
    );
    box(
      "Switch indicator",
      [6.06, 0.69 + n * 0.21, -3.92],
      [0.08, 0.045, 0.02],
      routeMaterials.network,
      sceneRoot,
      false,
    );
  }
  box(
    "Fiber conduit from street",
    [6.5, 0.14, -8.3],
    [0.12, 0.12, 5.4],
    "data",
  );
  box("Control pedestal", [5.8, 0.93, 3.7], [0.38, 1.05, 0.38], "steel");
  box("Control enclosure", [5.8, 1.56, 3.7], [0.82, 0.57, 0.26], "wall");
  box(
    "Cooling control display",
    [5.8, 1.58, 3.85],
    [0.62, 0.34, 0.03],
    controlMaterial,
  );
  box("Control button", [6.04, 1.38, 3.85], [0.09, 0.07, 0.03], "amber");
  box("Work table top", [-5.5, 1.19, -3.4], [2.4, 0.12, 0.9], "wood");
  for (const x of [-6.4, -4.6])
    box("Table support", [x, 0.81, -3.4], [0.09, 0.75, 0.72], "dark");
  box("Laptop base", [-5.9, 1.28, -3.3], [0.6, 0.04, 0.4], "trim");
  const laptop = box(
    "Laptop screen",
    [-5.9, 1.51, -3.48],
    [0.61, 0.44, 0.035],
    "dark",
  );
  laptop.setLocalEulerAngles(-12, 0, 0);
  box(
    "Open site plan",
    [-5, 1.26, -3.32],
    [0.64, 0.02, 0.49],
    "paper",
    sceneRoot,
    false,
  );
  cylinder("Coffee cup", [-4.59, 1.35, -3.4], [0.12, 0.18, 0.12], "amber");
  for (let n = 0; n < 3; n++)
    box(
      "Site plan line",
      [-5 + n * 0.17, 1.275, -3.32],
      [0.015, 0.009, 0.35],
      "trim",
      sceneRoot,
      false,
    );
  box("Door frame", [-7.48, 1.5, 3.1], [0.13, 2.3, 1.45], "trim");
  box("Exit door glazing", [-7.4, 1.5, 3.1], [0.05, 2.08, 1.25], "glass");
  cylinder("Fire extinguisher", [-6.95, 0.93, 4.6], [0.25, 0.8, 0.25], "red");
  box("Extinguisher handle", [-6.95, 1.37, 4.6], [0.22, 0.08, 0.14], "dark");

  // A delivery is already waiting. The pallet stays; the protective crate disappears on installation.
  const truck = group("Delivery truck", [-7, 0.08, 9.7]);
  box("Truck chassis", [0, 0.58, 0], [5.9, 0.28, 1.95], "dark", truck);
  box("Truck cargo body", [0.65, 1.9, 0], [4.15, 2.25, 2.06], "wall", truck);
  box(
    "Cargo stripe",
    [0.65, 1.6, 1.05],
    [4.15, 0.28, 0.025],
    "steel",
    truck,
    false,
  );
  for (let n = 0; n < 9; n++)
    box(
      "Cargo body rib",
      [-1.14 + n * 0.43, 1.98, 1.047],
      [0.025, 1.78, 0.018],
      "concrete",
      truck,
      false,
    );
  box("Truck cab", [-2.25, 1.35, 0], [1.65, 1.7, 1.94], "steel", truck);
  // Parked vehicle glass does not share the occupied hall's night emission.
  const vehicleGlass = swatches.glass.clone();
  vehicleGlass.name = "Unlit vehicle glazing";
  materials.push(vehicleGlass);
  box(
    "Cab front glass",
    [-3.095, 1.8, 0],
    [0.02, 0.63, 1.6],
    vehicleGlass,
    truck,
  );
  box(
    "Cab side glass",
    [-2.3, 1.8, 0.99],
    [1.18, 0.62, 0.02],
    vehicleGlass,
    truck,
  );
  box("Truck bumper", [-3.16, 0.68, 0], [0.12, 0.22, 2], "white", truck);
  for (const x of [-2.2, 1.8])
    for (const z of [-1.02, 1.02]) {
      const wheel = cylinder(
        "Truck wheel",
        [x, 0.55, z],
        [0.94, 0.22, 0.94],
        "dark",
        truck,
      );
      wheel.setLocalEulerAngles(90, 0, 0);
      const hub = cylinder(
        "Wheel hub",
        [x, 0.55, z * 1.1],
        [0.43, 0.03, 0.43],
        "concrete",
        truck,
      );
      hub.setLocalEulerAngles(90, 0, 0);
    }
  const delivery = group("Delivered equipment", [-8.7, 0.1, 5.9]);
  for (const z of [-0.6, 0, 0.6])
    box("Pallet runner", [0, 0.09, z], [1.9, 0.18, 0.19], "wood", delivery);
  for (let x = -0.8; x <= 0.8; x += 0.4)
    box("Pallet board", [x, 0.24, 0], [0.32, 0.12, 1.8], "wood", delivery);
  const crate = group("Protective transport crate", [0, 0.3, 0], delivery);
  box("Rack transit case", [0, 1.3, 0], [1.65, 2.6, 1.5], "wood", crate);
  for (const z of [-0.79, 0.79]) {
    for (const y of [0.25, 2.3])
      box("Crate bracing", [0, y, z], [1.8, 0.16, 0.08], "paper", crate);
    box("Packing label", [0.1, 1.3, z], [0.61, 0.53, 0.025], "white", crate);
  }
  for (const x of [-10.5, -6.9]) {
    primitive(
      "Delivery cone",
      [x, 0.4, 6.4],
      [0.43, 0.65, 0.43],
      "amber",
      "cone",
    );
    box("Cone base", [x, 0.1, 6.4], [0.55, 0.09, 0.55], "dark");
  }

  // Perimeter details, planting and distant buildings frame the playable campus.
  function tree(x: number, z: number, size = 1) {
    cylinder(
      "Tree trunk",
      [x, 0.8 * size, z],
      [0.3 * size, 1.7 * size, 0.3 * size],
      "bark",
    );
    primitive(
      "Tree crown",
      [x, 2.25 * size, z],
      [2.5 * size, 3.1 * size, 2.4 * size],
      "leaf",
      "sphere",
    );
    primitive(
      "Tree lit crown",
      [x - 0.45 * size, 2.8 * size, z - 0.3 * size],
      [1.85 * size, 1.9 * size, 1.9 * size],
      "leafLight",
      "sphere",
    );
  }
  for (const [x, z, size] of [
    [-17, -10, 1.15],
    [-17, -3, 0.85],
    [-17, 4, 1],
    [15.8, -9, 1.1],
    [17, -1, 0.9],
    [17, 7, 1.05],
    [-7, -16, 1.25],
    [2, -17, 0.9],
    [11, -17, 1.15],
    [-23, 5, 1.5],
    [23, -13, 1.5],
  ])
    tree(x, z, size);
  for (const [x, z] of [
    [-13, -4],
    [-13, 5],
    [14, 6],
    [14, -5],
  ]) {
    cylinder("Site lamp column", [x, 1.9, z], [0.12, 3.8, 0.12], "steel");
    box("Site lamp hood", [x, 3.85, z], [0.6, 0.15, 0.4], "steel");
    box("Site lamp light", [x, 3.76, z], [0.48, 0.03, 0.3], glowAmber);
  }
  for (let i = 0; i < 7; i++) {
    box(
      "Back fence post",
      [-14 + i * 4.7, 0.96, -11.7],
      [0.12, 1.9, 0.12],
      "trim",
    );
  }
  for (const y of [0.8, 1.7])
    box(
      "Back fence rail",
      [0, y, -11.7],
      [28.3, 0.06, 0.06],
      "trim",
      sceneRoot,
      false,
    );
  box("Native planting bed", [4.3, 0.06, 13.5], [16, 0.12, 2.6], "earth");
  for (let i = 0; i < 12; i++)
    primitive(
      "Low planting",
      [-2.5 + i * 1.27, 0.42, 13.6 + (i % 2) * 0.4],
      [0.94, 0.85, 0.83],
      i % 2 ? "grassLight" : "leafLight",
      "sphere",
    );
  for (const [x, z, w, h] of [
    [-27, -27, 10, 6],
    [-10, -32, 13, 4],
    [10, -33, 11, 7],
    [29, -25, 12, 5],
  ]) {
    box("Distant industrial building", [x, h / 2 - 0.3, z], [w, h, 7], "earth");
    box("Distant roof", [x, h - 0.2, z], [w + 0.4, 0.25, 7.3], "trim");
  }

  const rack = group("Installed rack");
  box("Rack base", [0, 0.1, 0], [1.55, 0.2, 1.8], "dark", rack);
  box("Rack body", [0, 1.5, 0], [1.42, 2.7, 1.65], "dark", rack);
  box("Rack top", [0, 2.88, 0], [1.57, 0.12, 1.8], "steel", rack);
  for (const x of [-0.68, 0.68])
    box(
      "Rack frame upright",
      [x, 1.5, 0.865],
      [0.07, 2.72, 0.08],
      "steel",
      rack,
    );
  for (let n = 0; n < 10; n++) {
    box(
      "Compute sled",
      [0, 0.39 + n * 0.24, 0.845],
      [1.2, 0.185, 0.08],
      n % 3 === 0 ? "steel" : "trim",
      rack,
      false,
    );
    box(
      "Sled vent",
      [-0.12, 0.39 + n * 0.24, 0.89],
      [0.72, 0.065, 0.015],
      "dark",
      rack,
      false,
    );
    box(
      "Sled handle",
      [-0.51, 0.39 + n * 0.24, 0.91],
      [0.035, 0.095, 0.035],
      "white",
      rack,
      false,
    );
    box(
      "Sled status indicator",
      [0.43, 0.39 + n * 0.24, 0.912],
      [0.07, 0.045, 0.02],
      statusMaterial,
      rack,
      false,
    );
  }
  for (let n = 0; n < 8; n++)
    box(
      "Rack side ventilation",
      [0.725, 0.65 + n * 0.26, 0],
      [0.018, 0.06, 1.34],
      "steel",
      rack,
      false,
    );
  const heat = group("Warm exhaust indicator", [0, 0, 0], rack);
  for (let i = 0; i < 3; i++)
    primitive(
      "Visible warm-air column",
      [-0.42 + i * 0.42, 3.15, -0.8],
      [0.44, 1.5 + i * 0.23, 0.35],
      heatMaterial,
      "sphere",
      heat,
      false,
    );
  const selection = group("Selection corners");
  for (const x of [-1, 1])
    for (const z of [-1, 1]) {
      box(
        "Selection corner x",
        [x * 1.07, 0.52, z * 1.37],
        [0.55, 0.035, 0.065],
        selectionMaterial,
        selection,
        false,
      );
      box(
        "Selection corner z",
        [x * 1.31, 0.52, z * 1.13],
        [0.065, 0.035, 0.55],
        selectionMaterial,
        selection,
        false,
      );
    }

  let props: FacilitySceneProps | null = null;
  let currentBay: number | null | undefined;
  let installProgress = 1;
  let elapsed = 0;
  let routeGroup: Entity | null = null;
  let routeRoots: Record<Utility, Entity> | null = null;
  let flowDots: Array<{
    entity: Entity;
    points: Point[];
    offset: number;
    utility: Utility;
  }> = [];
  function createRoutes(x: number) {
    routeGroup?.destroy();
    routeGroup = group("Connected utilities");
    flowDots = [];
    const routes: Record<Utility, Point[]> = {
      power: [
        [-3.8, 0.53, -7.1],
        [-5.45, 0.53, -7.1],
        [-5.45, 0.53, 3.6],
        [x, 0.53, 3.6],
        [x, 0.53, 1.7],
      ],
      cooling: [
        [-5.8, 0.56, -0.95],
        [x + 0.35, 0.56, -0.95],
        [x + 0.35, 0.56, 0.4],
      ],
      network: [
        [5.8, 0.59, -4],
        [5.8, 0.59, -2.3],
        [x - 0.35, 0.59, -2.3],
        [x - 0.35, 0.59, 0.4],
      ],
    };
    routeRoots = {} as Record<Utility, Entity>;
    for (const utility of ["power", "cooling", "network"] as const) {
      const root = group(`${utility} path`, [0, 0, 0], routeGroup);
      routeRoots[utility] = root;
      const points = routes[utility];
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1],
          b = points[i];
        box(
          `${utility} connected segment`,
          [(a[0] + b[0]) / 2, a[1], (a[2] + b[2]) / 2],
          [
            Math.max(0.09, Math.abs(a[0] - b[0])),
            0.065,
            Math.max(0.09, Math.abs(a[2] - b[2])),
          ],
          routeMaterials[utility],
          root,
          false,
        );
      }
      const dot = primitive(
        `${utility} flow indicator`,
        points[0],
        [0.15, 0.15, 0.15],
        "white",
        "sphere",
        root,
        false,
      );
      flowDots.push({
        entity: dot,
        points,
        offset: flowDots.length * 0.25,
        utility,
      });
    }
  }

  let campaignWorld: ReturnType<typeof createCampaignWorld> | null = null;
  let campusNight = 0;
  const details = addFacilityDetails(app, sceneRoot);
  const camera = new Entity("Facility camera");
  camera.addComponent("camera", {
    projection: PROJECTION_PERSPECTIVE,
    fov: 48,
    toneMapping: TONEMAP_ACES,
    nearClip: 0.1,
    farClip: 260,
    clearColor: new Color().fromString("#b5c5cf"),
  });
  app.root.addChild(camera);
  const cameraComponent = camera.camera as CameraComponent;
  const atmosphere = createFacilityAtmosphere(app, cameraComponent, {
    glazing: swatches.glass,
    fixtures: glowAmber,
    setNight: (amount) => {
      campusNight = amount;
      details.setNight(amount);
      campaignWorld?.setNight(amount);
    },
  });
  const projected = new Vec3();
  const projectInput = new Vec3();
  const cameraToPoint = new Vec3();
  const currentAim = new Vec3(0, 0.8, 0.5);
  const desiredAim = new Vec3(0, 0.8, 0.5);
  const currentShift = new Vec2();
  const desiredShift = new Vec2();
  let currentDistance = 46;
  let desiredDistance = 46;
  let currentYaw = 35;
  let desiredYaw = 35;
  let currentPitch = 37;
  let desiredPitch = 37;
  let cameraInitialized = false;
  let cameraSettling = false;
  let cameraClock = 0;
  let viewportWidth = 1440;
  let viewportHeight = 960;
  let viewZoom = 1;
  const viewPan: Point = [0, 0, 0];
  const viewOrbit: [number, number] = [0, 0];
  const radians = Math.PI / 180;
  const bounded = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value));

  function applyCamera() {
    // Slow, small movement on the title scene establishes depth without a camera
    // that wanders away from the facility or continues moving while paused.
    const drift =
      props?.intro && !props.reducedMotion
        ? Math.sin(cameraClock * 0.16) * 1.25
        : 0;
    const yaw = (currentYaw + drift) * radians;
    const pitch = currentPitch * radians;
    const horizontalDistance = Math.cos(pitch) * currentDistance;
    camera.setPosition(
      currentAim.x + Math.sin(yaw) * horizontalDistance,
      Math.max(2.3, currentAim.y + Math.sin(pitch) * currentDistance),
      currentAim.z + Math.cos(yaw) * horizontalDistance,
    );
    camera.lookAt(currentAim);
    cameraComponent.projectionOffset = currentShift;
  }

  function snapCamera() {
    currentAim.copy(desiredAim);
    currentShift.copy(desiredShift);
    currentDistance = desiredDistance;
    currentYaw = desiredYaw;
    currentPitch = desiredPitch;
    cameraSettling = false;
    applyCamera();
    atmosphere.markShadowDirty();
  }

  function retargetCamera() {
    const mobile = viewportWidth < 760;
    const aspect = Math.max(0.32, viewportWidth / Math.max(1, viewportHeight));
    const view = props?.cameraView ?? "campus";
    const intro = props?.intro ?? true;
    let target: Point =
      view === "hall"
        ? [0, 1.2, 0.5]
        : view === "plant"
          ? [10.35, 1.2, 0.4]
          : [0, 0.7, 0.5];
    let distance = view === "hall" ? 23 : view === "plant" ? 18.5 : 46;
    let pitch = view === "hall" ? 23 : view === "plant" ? 28 : 37;
    let yaw = view === "hall" ? 20 : view === "plant" ? 48 : 35;
    const selected = props?.selectedTarget;
    const selectedPoint: Point | undefined =
      selected === "rack"
        ? [BAY_X[currentBay ?? 1], 1.3, 1]
        : TARGETS[selected ?? ""]?.point;

    if (!intro && selectedPoint) {
      const hallTarget =
        selected === "rack" ||
        selected === "network" ||
        selected === "controls" ||
        selected?.startsWith("bay-");
      const plantTarget = selected === "cooling" || selected === "controls";
      if (
        view === "campus" ||
        (view === "hall" && hallTarget) ||
        (view === "plant" && plantTarget)
      ) {
        const amount = view === "campus" ? (mobile ? 0.86 : 0.45) : 0.38;
        target = [
          target[0] + (selectedPoint[0] - target[0]) * amount,
          target[1] + (Math.min(1.7, selectedPoint[1]) - target[1]) * amount,
          target[2] + (selectedPoint[2] - target[2]) * amount,
        ];
        if (view === "campus") {
          distance = mobile ? 33 : 39;
          pitch = selected === "power" ? 43 : selected === "delivery" ? 30 : 35;
        }
      }
    }
    if (props?.placementMode && view !== "plant") {
      target = [0, 0.8, 1];
      distance = view === "hall" ? 24 : 35;
      pitch = 37;
    }
    if (intro && view === "campus") {
      distance = 48;
      target = [0, 0.8, 0.7];
      yaw = 34;
      pitch = 33;
    }

    if (props?.campaign && !intro) {
      if (view === "campus" && !selectedPoint) {
        target = [8, 0.8, -1];
        distance = 66;
        pitch = 38;
        yaw = 31;
      }
      if (selected === "expansion") {
        target = [25, 1, -0.5];
        distance = mobile ? 35 : 30;
        pitch = 32;
        yaw = 26;
      }
      if (selected === "battery") {
        target = [-10, 1, -10.3];
        distance = mobile ? 32 : 24;
        pitch = 40;
        yaw = 25;
      }
    }

    if (mobile) {
      const halfWidth =
        intro && view === "campus"
          ? 18
          : view === "plant"
            ? 5.2
            : view === "hall"
              ? 7.3
              : selectedPoint
                ? 9.2
                : props?.campaign
                  ? 27
                  : 17;
      distance = Math.max(
        distance,
        halfWidth / (Math.tan(24 * radians) * aspect),
      );
    } else if (aspect < 1.3) distance *= 1.3 / aspect;

    const minDistance = view === "plant" ? 11.5 : view === "hall" ? 14 : 23;
    desiredDistance = bounded(
      distance / bounded(viewZoom, 0.65, 2.3),
      minDistance,
      mobile ? 115 : 80,
    );
    desiredAim.set(target[0] + viewPan[0], target[1], target[2] + viewPan[2]);
    desiredYaw = bounded(
      yaw + viewOrbit[0],
      view === "hall" ? -35 : -145,
      view === "hall" ? 65 : 145,
    );
    desiredPitch = bounded(pitch + viewOrbit[1], view === "hall" ? 14 : 19, 68);
    // Off-centre perspective keeps the subject physically centred on its optical
    // axis while allocating screen space to readable HUD and mentor controls.
    desiredShift.set(
      mobile
        ? 0
        : props?.campaign
          ? 0.18
          : -Math.min(0.39, (intro ? 480 : 340) / viewportWidth),
      mobile
        ? intro
          ? -0.32
          : props?.campaign
            ? props.viewControlsOpen
              ? 0.14
              : -0.4
            : 0.1
        : intro
          ? -0.07
          : -0.17,
    );
    cameraSettling = true;
    if (!cameraInitialized) {
      cameraInitialized = true;
      snapCamera();
      if (intro && !props?.reducedMotion && !props?.paused) {
        currentDistance *= 1.08;
        currentPitch += 3;
        currentYaw -= 4;
        cameraSettling = true;
        applyCamera();
      }
    } else if (props?.reducedMotion && !props.paused) snapCamera();
  }

  function animateCamera(dt: number) {
    const alpha = 1 - Math.exp(-Math.min(dt, 0.1) * 4.2);
    currentAim.lerp(currentAim, desiredAim, alpha);
    currentShift.lerp(currentShift, desiredShift, alpha);
    currentDistance += (desiredDistance - currentDistance) * alpha;
    currentYaw += (desiredYaw - currentYaw) * alpha;
    currentPitch += (desiredPitch - currentPitch) * alpha;
    cameraSettling =
      currentAim.distance(desiredAim) > 0.012 ||
      Math.abs(currentDistance - desiredDistance) > 0.015 ||
      Math.abs(currentYaw - desiredYaw) > 0.02 ||
      Math.abs(currentPitch - desiredPitch) > 0.02 ||
      currentShift.distance(desiredShift) > 0.001;
    if (!cameraSettling) {
      currentAim.copy(desiredAim);
      currentShift.copy(desiredShift);
      currentDistance = desiredDistance;
      currentYaw = desiredYaw;
      currentPitch = desiredPitch;
    }
    applyCamera();
    if (cameraSettling || props?.intro) atmosphere.markShadowDirty();
  }

  function update(next: FacilitySceneProps) {
    const old = props;
    props = next;
    atmosphere.update(next);
    if (next.campaign && !campaignWorld) {
      campaignWorld = createCampaignWorld(app, sceneRoot);
      campaignWorld.setNight(campusNight);
    }
    if (campaignWorld?.update(next.campaign)) atmosphere.markShadowDirty();
    if (currentBay !== next.rackBay) {
      atmosphere.markShadowDirty();
      currentBay = next.rackBay;
      installProgress = next.reducedMotion ? 1 : 0;
      if (currentBay !== null) {
        rack.setLocalPosition(BAY_X[currentBay], 0.49, 1);
        createRoutes(BAY_X[currentBay]);
      }
    }
    rack.enabled = next.rackBay !== null;
    crate.enabled = next.rackBay === null;
    // A stopped commissioning exercise has no continuing test load. Preserve the
    // failed-control indicator, but show warm exhaust only while a load is applied.
    heat.enabled = next.testRunning;
    for (const highlight of bayHighlights)
      highlight.enabled = next.placementMode;
    if (routeGroup) routeGroup.enabled = next.rackBay !== null;
    if (routeRoots) {
      routeRoots.power.enabled = next.powerConnected;
      routeRoots.cooling.enabled = next.coolingConnected;
      routeRoots.network.enabled = next.networkConnected;
    }
    const networkAvailable =
      !next.campaign?.cableOutage ||
      (next.campaign.networkTested &&
        (next.campaign.networkDiverse || next.campaign.emergencyRoute));
    for (const flow of flowDots)
      flow.entity.enabled =
        (next.live || next.testRunning) &&
        (flow.utility !== "network" || networkAvailable) &&
        !(next.fault && flow.utility === "cooling");
    const statusColor = next.fault
      ? palette.red
      : next.campaign && next.campaign.serviceFraction < 0.99
        ? palette.amber
        : next.live
          ? palette.green
          : next.testRunning
            ? palette.amber
            : next.powerConnected
              ? palette.water
              : palette.dark;
    statusMaterial.diffuse.fromString(statusColor);
    statusMaterial.emissive.fromString(statusColor);
    statusMaterial.emissiveIntensity = next.powerConnected ? 0.55 : 0;
    statusMaterial.update();
    controlMaterial.diffuse.fromString(
      next.fault ? palette.red : palette.water,
    );
    controlMaterial.emissive.fromString(
      next.fault ? palette.red : palette.water,
    );
    controlMaterial.update();
    const target =
      next.selectedTarget === "rack" &&
      currentBay !== null &&
      currentBay !== undefined
        ? ([BAY_X[currentBay], 0, 1] as Point)
        : TARGETS[next.selectedTarget ?? ""]?.point;
    selection.enabled = Boolean(target) && !next.intro;
    if (target) selection.setLocalPosition(target[0], 0, target[2]);
    for (const utility of ["power", "cooling", "network"] as const) {
      routeMaterials[utility].emissiveIntensity =
        next.overlay === utility ? 0.8 : 0.18;
      routeMaterials[utility].update();
    }
    if (
      old?.cameraView !== next.cameraView ||
      old?.selectedTarget !== next.selectedTarget ||
      old?.intro !== next.intro ||
      old?.placementMode !== next.placementMode ||
      old?.reducedMotion !== next.reducedMotion ||
      old?.paused !== next.paused ||
      old?.viewControlsOpen !== next.viewControlsOpen ||
      old?.campaign?.chapter !== next.campaign?.chapter ||
      old?.campaign?.expansionPhase !== next.campaign?.expansionPhase
    )
      retargetCamera();
  }

  function animate(dt: number, enabled: boolean) {
    if (!props) return;
    if (props.paused) return;
    if (!enabled || props.reducedMotion) {
      if (installProgress < 1) {
        installProgress = 1;
        rack.setLocalScale(1, 1, 1);
      }
      if (cameraSettling) snapCamera();
      return;
    }
    const step = Math.max(0, Math.min(dt, 0.1));
    cameraClock += step;
    if (cameraSettling || props.intro) animateCamera(step);
    atmosphere.animate(step, true);
    elapsed += Math.min(dt, 0.05);
    if (installProgress < 1) {
      installProgress = Math.min(1, installProgress + dt * 1.25);
      const eased = 1 - Math.pow(1 - installProgress, 3);
      rack.setLocalScale(1, 0.05 + eased * 0.95, 1);
      atmosphere.markShadowDirty();
    }
    if (
      props.coolingConnected &&
      !props.fault &&
      (props.live || props.testRunning)
    )
      for (const fan of fans) fan.rotateLocal(0, dt * 175, 0);
    for (const flow of flowDots) {
      flow.entity.enabled =
        (props.live || props.testRunning) &&
        !(props.fault && flow.utility === "cooling");
      const segment =
        ((elapsed * 0.35 + flow.offset) % 1) * (flow.points.length - 1);
      const index = Math.floor(segment),
        t = segment - index;
      const a = flow.points[index],
        b = flow.points[index + 1];
      flow.entity.setLocalPosition(
        a[0] + (b[0] - a[0]) * t,
        a[1] + 0.04,
        a[2] + (b[2] - a[2]) * t,
      );
    }
  }

  function focus(
    width: number,
    height: number,
    zoom: number,
    pan: Point,
    orbit: [number, number] = [0, 0],
  ) {
    const changed =
      width !== viewportWidth ||
      height !== viewportHeight ||
      zoom !== viewZoom ||
      pan[0] !== viewPan[0] ||
      pan[2] !== viewPan[2] ||
      orbit[0] !== viewOrbit[0] ||
      orbit[1] !== viewOrbit[1];
    viewportWidth = width;
    viewportHeight = height;
    viewZoom = zoom;
    viewPan[0] = pan[0];
    viewPan[2] = pan[2];
    viewOrbit[0] = orbit[0];
    viewOrbit[1] = orbit[1];
    if (changed || !cameraInitialized) retargetCamera();
  }

  return {
    camera,
    update,
    animate,
    focus,
    project: (point) => {
      projectInput.set(...point);
      cameraToPoint.sub2(projectInput, camera.getPosition());
      if (cameraToPoint.dot(camera.forward) <= cameraComponent.nearClip)
        return projected.set(-1000, -1000, -1);
      return cameraComponent.worldToScreen(projectInput, projected);
    },
    rackPoint: () => [BAY_X[currentBay ?? 1], 3.25, 1],
    getHour: atmosphere.getHour,
    needsAnimation: () =>
      Boolean(
        props &&
        !props.paused &&
        !props.reducedMotion &&
        (cameraSettling ||
          props.intro ||
          atmosphere.needsAnimation() ||
          installProgress < 1 ||
          props.live ||
          props.testRunning),
      ),
    dispose: () => {
      campaignWorld?.dispose();
      details.dispose();
      atmosphere.dispose();
      sceneRoot.destroy();
      camera.destroy();
      for (const mat of materials) mat.destroy();
    },
  };
}
