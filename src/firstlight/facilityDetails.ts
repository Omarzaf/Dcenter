import {
  AppBase,
  Color,
  Entity,
  LIGHTFALLOFF_INVERSESQUARED,
  StandardMaterial,
} from "playcanvas";

type Point = [number, number, number];

/** Authored, non-interactive site details. All geometry and materials are owned here. */
export function addFacilityDetails(
  app: AppBase,
  parent: Entity,
): { setNight(amount: number): void; dispose(): void } {
  const root = new Entity("Industrial site finishes");
  parent.addChild(root);
  const batch = app.batcher?.addGroup("Immutable site finishes", false, 90);
  const materials: StandardMaterial[] = [];

  function material(name: string, hex: string, gloss = 0.15, metalness = 0) {
    const mat = new StandardMaterial();
    mat.name = name;
    mat.diffuse = new Color().fromString(hex);
    mat.gloss = gloss;
    mat.useMetalness = true;
    mat.metalness = metalness;
    mat.update();
    materials.push(mat);
    return mat;
  }

  const gravel = material("Compacted grey aggregate", "#737d80");
  const concrete = material("Weathered concrete", "#97a3a8");
  const chalk = material("Faded safety paint", "#c7c9bc");
  const steel = material("Galvanised steel", "#61727c", 0.38, 0.55);
  const dark = material("Drain recess and joints", "#29363e", 0.08);
  const wear = material("Sealed asphalt repairs", "#4a585e", 0.1);
  const ochre = material("Ochre hazard paint", "#c99b54");
  const glass = material("Distant factory glazing", "#657d88", 0.5, 0.15);
  const terrain = material("Distant shelterbelt", "#667672");
  const amber = material("Warm fixture diffuser", "#e7c190");
  const mint = material("Prepared utility indicator", "#91d1ba");
  amber.emissive = new Color().fromString("#ffd29b");
  mint.emissive = new Color().fromString("#8cddbd");
  glass.emissive = new Color().fromString("#b8cbd3");

  function mesh(
    name: string,
    at: Point,
    size: Point,
    mat: StandardMaterial,
    shape: "box" | "cylinder" | "sphere" = "box",
  ) {
    const entity = new Entity(name);
    entity.addComponent("render", {
      type: shape,
      material: mat,
      castShadows: false,
      receiveShadows: true,
    });
    entity.setLocalPosition(...at);
    entity.setLocalScale(...size);
    root.addChild(entity);
    if (batch && entity.render) entity.render.batchGroupId = batch.id;
    return entity;
  }

  // Keep the hall, southeast sightline, delivery area and road entirely unobstructed.
  mesh(
    "North gravel maintenance strip",
    [0, 0.025, -10.9],
    [25, 0.035, 1.15],
    gravel,
  );
  mesh(
    "East gravel drainage verge",
    [14.3, 0.027, -0.6],
    [1.55, 0.04, 14],
    gravel,
  );
  mesh(
    "Service yard concrete pad",
    [12, 0.045, -8.6],
    [5, 0.07, 3.1],
    concrete,
  );
  for (let i = 0; i < 10; i++) {
    // A fixed, sparse aggregate pattern gives the verge scale without scatter clutter.
    mesh(
      "Aggregate seam",
      [14.3, 0.052, -6.5 + i * 1.3],
      [1.1, 0.012, 0.025],
      wear,
    );
  }
  for (const x of [-8, -1, 6, 13]) {
    mesh(
      "Service road expansion seal",
      [x, 0.071, 9.1],
      [0.026, 0.012, 4.5],
      dark,
    );
  }
  mesh("Road resurfacing patch", [8.1, 0.073, 10.5], [2.9, 0.012, 0.72], wear);
  mesh("Patched utility trench", [7.1, 0.074, 8], [0.58, 0.014, 2.1], wear);
  mesh("Road edge paint north", [1.5, 0.077, 6.94], [21.7, 0.013, 0.07], chalk);
  mesh(
    "Road edge paint south",
    [0.5, 0.078, 11.25],
    [27.8, 0.014, 0.07],
    chalk,
  );

  function grate(x: number, z: number, length: number, height = 0.09) {
    mesh("Drain channel recess", [x, height, z], [0.44, 0.028, length], dark);
    for (const side of [-1, 1]) {
      mesh(
        "Drain frame",
        [x + side * 0.24, height + 0.024, z],
        [0.035, 0.035, length],
        steel,
      );
    }
    for (let i = 0; i < 7; i++) {
      mesh(
        "Grate crossbar",
        [x, height + 0.021, z - length / 2 + 0.12 + (i * (length - 0.24)) / 6],
        [0.44, 0.03, 0.055],
        steel,
      );
    }
  }
  grate(13.27, 1.6, 2.3);
  grate(-10.3, 3.1, 1.4);
  grate(11.7, 10.1, 1.15);
  mesh(
    "Access cover",
    [4.1, 0.085, 10.25],
    [0.68, 0.035, 0.68],
    dark,
    "cylinder",
  );
  mesh(
    "Access cover inset",
    [4.1, 0.106, 10.25],
    [0.56, 0.008, 0.56],
    steel,
    "cylinder",
  );

  // Paired supports sit under the existing plant-to-hall pipework, not on playable bays.
  for (const z of [-1.6, 2.4]) {
    for (const x of [7.7, 8.75]) {
      mesh("Pipe support footing", [x, 0.14, z], [0.42, 0.2, 1.2], concrete);
      mesh("Pipe support upright", [x, 0.45, z], [0.1, 0.45, 0.12], steel);
      mesh("Pipe support crosshead", [x, 0.72, z], [0.17, 0.12, 1.05], steel);
    }
  }
  for (const x of [-5.6, -1.4, 2.8]) {
    mesh("Wall pipe bracket", [x, 0.65, -4.8], [0.14, 0.26, 0.62], steel);
  }
  for (const x of [-5.2, 0.4, 4.9]) {
    mesh("Overhead tray cable loom", [x, 3.43, -3.63], [1.8, 0.07, 0.25], dark);
    mesh(
      "Cable loom retaining band",
      [x, 3.47, -3.63],
      [0.06, 0.04, 0.3],
      steel,
    );
  }

  // Service clearances, impact protection and small fixed plant instrumentation.
  for (const x of [8.1, 12.8]) {
    mesh("Plant bollard footing", [x, 0.14, 4.8], [0.36, 0.2, 0.36], concrete);
    mesh(
      "Plant impact bollard",
      [x, 0.7, 4.8],
      [0.13, 1.05, 0.13],
      ochre,
      "cylinder",
    );
    mesh(
      "Bollard reflective band",
      [x, 0.98, 4.8],
      [0.137, 0.14, 0.137],
      chalk,
      "cylinder",
    );
  }
  mesh("Plant clearance line", [10.4, 0.45, 4.53], [4.55, 0.018, 0.065], ochre);
  mesh("Plant service panel", [12, 1.07, -3.18], [0.54, 0.75, 0.14], steel);
  mesh(
    "Plant service panel label",
    [12, 1.18, -3.096],
    [0.3, 0.18, 0.014],
    chalk,
  );
  mesh(
    "Prepared plant power indicator",
    [12.12, 0.87, -3.09],
    [0.055, 0.055, 0.025],
    mint,
  );
  for (let i = 0; i < 5; i++) {
    mesh(
      "Electrical clearance stripe",
      [-7.7 + i * 0.38, 0.423, -6.75],
      [0.08, 0.02, 0.47],
      ochre,
    ).setLocalEulerAngles(0, 35, 0);
  }
  mesh("Yard spare pipe support", [12.1, 0.2, -8.6], [2.9, 0.24, 1.1], dark);
  for (const z of [-8.86, -8.34]) {
    mesh(
      "Stored insulated pipe",
      [12.1, 0.48, z],
      [0.31, 2.6, 0.31],
      steel,
      "cylinder",
    ).setLocalEulerAngles(0, 0, 90);
  }

  // Detail the existing distant warehouses instead of introducing another skyline.
  for (const [x, z, width, height] of [
    [-27, -27, 10, 6],
    [-10, -32, 13, 4],
    [10, -33, 11, 7],
    [29, -25, 12, 5],
  ]) {
    const front = z + 3.54;
    mesh(
      "Warehouse loading apron",
      [x, -0.29, front + 2.2],
      [width + 1.8, 0.09, 4.6],
      gravel,
    );
    mesh(
      "Warehouse clerestory ribbon",
      [x, height - 0.8, front],
      [width - 1.3, 0.7, 0.055],
      glass,
    );
    for (const side of [-1, 1]) {
      const doorX = x + side * width * 0.26;
      mesh(
        "Warehouse loading door",
        [doorX, 1.25, front + 0.014],
        [2.5, 3.1, 0.065],
        steel,
      );
      mesh(
        "Loading door frame",
        [doorX, 2.86, front + 0.08],
        [2.76, 0.13, 0.18],
        concrete,
      );
      mesh(
        "Loading dock threshold",
        [doorX, -0.23, front + 0.27],
        [2.8, 0.2, 0.55],
        dark,
      );
      for (let i = 0; i < 3; i++) {
        mesh(
          "Roller door panel joint",
          [doorX, 0.55 + i * 0.7, front + 0.054],
          [2.4, 0.03, 0.015],
          dark,
        );
      }
    }
    mesh(
      "Roof ventilation enclosure",
      [x + width * 0.24, height + 0.19, z - 0.5],
      [1.9, 0.65, 1.6],
      steel,
    );
    mesh(
      "Roof exhaust cap",
      [x + width * 0.24, height + 0.57, z - 0.5],
      [2.1, 0.1, 1.8],
      concrete,
    );
  }
  // Broad, low shelterbelts stay behind the industrial park, preserving the horizon.
  for (const [x, z, width, depth] of [
    [-37, -48, 37, 15],
    [0, -53, 46, 18],
    [40, -47, 35, 15],
  ]) {
    mesh(
      "Distant landscape berm",
      [x, -3.1, z],
      [width, 7, depth],
      terrain,
      "sphere",
    );
  }

  // Existing yard columns are at (-13, 5) and (14, 6); these lights align with their heads.
  const lamps: Entity[] = [];
  for (const [x, y, z, range] of [
    [-13, 3.58, 5, 9],
    [14, 3.58, 6, 9],
    [0.25, 2.68, -5.12, 8],
  ]) {
    const lamp = new Entity("Unshadowed warm site light");
    lamp.addComponent("light", {
      type: "omni",
      color: new Color(1, 0.79, 0.52),
      intensity: 0,
      range,
      falloffMode: LIGHTFALLOFF_INVERSESQUARED,
      castShadows: false,
    });
    lamp.setLocalPosition(x, y, z);
    root.addChild(lamp);
    lamps.push(lamp);
  }
  for (const x of [-5.8, -1.5, 2.8]) {
    mesh("Wall luminaire backplate", [x, 2.55, -5.53], [0.6, 0.2, 0.06], steel);
    mesh(
      "Wall luminaire diffuser",
      [x, 2.49, -5.42],
      [0.47, 0.06, 0.18],
      amber,
    );
  }
  for (const [x, z] of [
    [-13, 5],
    [14, 6],
  ]) {
    mesh("Yard lamp warm diffuser", [x, 3.74, z], [0.45, 0.026, 0.28], amber);
  }

  let disposed = false;
  let night = -1;
  function setNight(amount: number) {
    if (disposed) return;
    const value = Number.isFinite(amount)
      ? Math.max(0, Math.min(1, amount))
      : 0;
    if (Math.abs(value - night) < 0.001) return;
    night = value;
    amber.emissiveIntensity = 0.2 + value * 2.6;
    mint.emissiveIntensity = 0.35 + value * 0.8;
    glass.emissiveIntensity = value * 0.12;
    amber.update();
    mint.update();
    glass.update();
    for (const lamp of lamps) {
      if (lamp.light) lamp.light.intensity = value * 3.2;
      lamp.enabled = value > 0.01;
    }
  }
  setNight(0);
  if (batch) app.batcher?.generate([batch.id]);

  return {
    setNight,
    dispose() {
      if (disposed) return;
      disposed = true;
      if (batch) app.batcher?.removeGroup(batch.id);
      root.destroy();
      for (const mat of materials) mat.destroy();
    },
  };
}
