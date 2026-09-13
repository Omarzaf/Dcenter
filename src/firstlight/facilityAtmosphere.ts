import {
  AppBase,
  Color,
  Entity,
  FOG_LINEAR,
  SHADOWUPDATE_THISFRAME,
  type CameraComponent,
  type StandardMaterial,
} from "playcanvas";
import type { FacilitySceneProps, TimeMode } from "./types";

interface AtmosphereSurfaces {
  glazing: StandardMaterial;
  fixtures: StandardMaterial;
  setNight: (amount: number) => void;
}

const clamp = (value: number, min = 0, max = 1) =>
  Math.max(min, Math.min(max, value));
const wrapHour = (hour: number) => ((hour % 24) + 24) % 24;
const smooth = (low: number, high: number, value: number) => {
  const t = clamp((value - low) / (high - low));
  return t * t * (3 - 2 * t);
};

/** Visual solar time is independent of the mission's deterministic work clock. */
export function createFacilityAtmosphere(
  app: AppBase,
  camera: CameraComponent,
  surfaces: AtmosphereSurfaces,
) {
  const sun = new Entity("Sunlight");
  sun.addComponent("light", {
    type: "directional",
    intensity: 1.5,
    color: new Color(1, 0.84, 0.64),
    castShadows: true,
    shadowResolution: 1024,
    shadowDistance: 90,
    shadowUpdateMode: SHADOWUPDATE_THISFRAME,
    shadowBias: 0.12,
    normalOffsetBias: 0.15,
  });
  app.root.addChild(sun);
  const moon = new Entity("Cool night skylight");
  moon.addComponent("light", {
    type: "directional",
    color: new Color(0.53, 0.66, 0.95),
    intensity: 0,
    castShadows: false,
  });
  moon.setEulerAngles(52, 125, 0);
  app.root.addChild(moon);

  const skyDay = new Color().fromString("#b5c5cf");
  const skyDawn = new Color().fromString("#c9b49f");
  const skyNight = new Color().fromString("#152238");
  const sunDay = new Color(1, 0.96, 0.88);
  const sunDawn = new Color(1, 0.68, 0.4);
  const ambientDay = new Color(0.43, 0.46, 0.5);
  const ambientNight = new Color(0.12, 0.155, 0.23);
  const clear = new Color();
  const daylightSky = new Color();
  const sunColor = new Color();
  let hour = 6 + 40 / 60;
  let mode: TimeMode = "cycle";
  let paused = false;
  let reducedMotion = false;
  let transition = 1;
  let transitionStart = hour;
  let transitionDelta = 0;
  let transitionTarget = hour;
  let environmentTimer = 1;
  let shadowTimer = 0;
  let shadowDirty = true;
  let lastShadowRefresh = performance.now();
  let shadowWake: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;
  let lastDaylight = -1;
  app.scene.fog.type = FOG_LINEAR;
  surfaces.glazing.emissive.set(1, 0.78, 0.47);
  surfaces.glazing.emissiveIntensity = 0;
  surfaces.glazing.update();

  function applyLighting() {
    const angle = ((hour - 6) / 24) * Math.PI * 2;
    const elevation = Math.sin(angle);
    const daylight = smooth(-0.12, 0.3, elevation);
    const night = 1 - daylight;
    const warm = (1 - smooth(0.12, 0.62, elevation)) * daylight;
    daylightSky.lerp(skyDay, skyDawn, warm * 0.85);
    clear.lerp(skyNight, daylightSky, daylight);
    camera.clearColor.copy(clear);
    app.scene.fog.color.copy(clear);
    app.scene.fog.start = 62 - night * 13;
    app.scene.fog.end = 160 - night * 25;
    app.scene.ambientLight.lerp(ambientNight, ambientDay, daylight);

    if (sun.light) {
      sunColor.lerp(sunDay, sunDawn, warm);
      sun.light.color = sunColor;
      sun.light.intensity =
        daylight * (0.18 + 1.65 * Math.sqrt(Math.max(0, elevation)));
      sun.light.castShadows = daylight > 0.025;
      // The light remains above the horizon during the low-energy twilight blend.
      // Only this one light casts shadows; its map is refreshed at most every 0.75 s.
      sun.setEulerAngles(
        8 + Math.max(0, elevation) * 65,
        72 - (hour / 24) * 245,
        0,
      );
    }
    if (moon.light) moon.light.intensity = night * 0.48;
    surfaces.fixtures.emissiveIntensity = 0.1 + night * 1.9;
    surfaces.fixtures.update();
    surfaces.glazing.emissiveIntensity = night * 0.65;
    surfaces.glazing.update();
    surfaces.setNight(night);
    if (Math.abs(daylight - lastDaylight) > 0.002) shadowDirty = true;
    lastDaylight = daylight;
  }

  function markShadowDirty() {
    shadowDirty = true;
    // With motion disabled there will be no animation tick to service a dirty map.
    // Coalesce rapid manual orbit/zoom input into one map refresh per 750 ms.
    if (reducedMotion && !paused && sun.light) {
      const wait = 750 - (performance.now() - lastShadowRefresh);
      const refresh = () => {
        shadowWake = null;
        if (disposed || paused || !reducedMotion || !sun.light) return;
        sun.light.shadowUpdateMode = SHADOWUPDATE_THISFRAME;
        lastShadowRefresh = performance.now();
        shadowTimer = 0;
        shadowDirty = false;
        app.renderNextFrame = true;
      };
      if (wait <= 0) refresh();
      else if (shadowWake === null) shadowWake = setTimeout(refresh, wait);
    }
  }

  function update(props: FacilitySceneProps) {
    paused = props.paused;
    reducedMotion = props.reducedMotion;
    if (props.timeMode !== mode) {
      mode = props.timeMode;
      if (mode === "cycle") transition = 1;
      else {
        transitionStart = hour;
        transitionTarget = mode === "day" ? 12 : 23;
        transitionDelta = ((transitionTarget - hour + 36) % 24) - 12;
        transition = 0;
      }
    }
    if (reducedMotion && !paused && transition < 1) {
      hour = transitionTarget;
      transition = 1;
      shadowDirty = true;
      applyLighting();
      markShadowDirty();
    }
  }

  function animate(dt: number, allowed: boolean) {
    if (paused || reducedMotion || !allowed) return;
    const step = clamp(dt, 0, 0.1);
    if (transition < 1) {
      transition = Math.min(1, transition + step / 1.5);
      const eased = transition * transition * (3 - 2 * transition);
      hour = wrapHour(transitionStart + transitionDelta * eased);
      if (transition === 1) hour = transitionTarget;
      shadowDirty = true;
    } else if (mode === "cycle") {
      hour = wrapHour(hour + step * 0.1);
      shadowDirty = true;
    }
    environmentTimer += step;
    shadowTimer += step;
    if (environmentTimer >= 0.1) {
      environmentTimer = 0;
      applyLighting();
    }
    if (shadowDirty && shadowTimer >= 0.75 && sun.light) {
      sun.light.shadowUpdateMode = SHADOWUPDATE_THISFRAME;
      lastShadowRefresh = performance.now();
      shadowTimer = 0;
      shadowDirty = false;
    }
  }

  applyLighting();
  return {
    update,
    animate,
    getHour: () => hour,
    markShadowDirty,
    needsAnimation: () =>
      !paused &&
      !reducedMotion &&
      (mode === "cycle" || transition < 1 || shadowDirty),
    dispose: () => {
      disposed = true;
      if (shadowWake !== null) clearTimeout(shadowWake);
      sun.destroy();
      moon.destroy();
    },
  };
}
