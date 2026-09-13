import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  AppBase,
  AppOptions,
  BatchManager,
  CameraComponentSystem,
  LightComponentSystem,
  RenderComponentSystem,
  createGraphicsDevice,
  DEVICETYPE_WEBGL2,
  FILLMODE_FILL_WINDOW,
  RESOLUTION_AUTO,
} from "playcanvas";
import type { FacilitySceneProps } from "./types";
import { Camera, Moon, Sun, Sunset, X, RotateCcw } from "lucide-react";
import {
  createFacilityWorld,
  TARGETS,
  type FacilityWorld,
} from "./facilityWorld";

interface ViewState {
  zoom: number;
  pan: [number, number, number];
  orbit: [number, number];
}
const originalView = (): ViewState => ({
  zoom: 1,
  pan: [0, 0, 0],
  orbit: [0, 0],
});

export default function FacilityScene(props: FacilitySceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const closeViewRef = useRef<HTMLButtonElement>(null);
  const markerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const latestProps = useRef(props);
  const viewRef = useRef<ViewState>(originalView());
  const refreshRef = useRef<(() => void) | null>(null);
  const [ready, setReady] = useState(false);
  const [fallback, setFallback] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  latestProps.current = props;

  useEffect(() => {
    if (props.viewControlsOpen && ready) closeViewRef.current?.focus();
  }, [props.viewControlsOpen, ready]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let app: AppBase | null = null;
    let device: Awaited<ReturnType<typeof createGraphicsDevice>> | null = null;
    let world: FacilityWorld | null = null;
    let observer: ResizeObserver | null = null;
    let lastTimeReport = -1;
    let contextLost = false;
    let clock = 0;
    let lastRender = 0;

    function projectMarkers() {
      if (!world) return;
      const width = canvas!.clientWidth,
        height = canvas!.clientHeight;
      const panels = latestProps.current.campaign
        ? [
            ...document.querySelectorAll<HTMLElement>(
              ".cp-header, .cp-chapter-caption, .cp-decision, .cp-guide, .cp-toolbar, .fl-view-console",
            ),
          ]
            .map((element) => element.getBoundingClientRect())
            .filter((rect) => rect.width && rect.height)
        : [];
      for (const [id, element] of Object.entries(markerRefs.current)) {
        if (!element) continue;
        const point = id === "rack" ? world.rackPoint() : TARGETS[id].point;
        const screen = world.project(point);
        const halfWidth = element.offsetWidth / 2;
        const halfHeight = element.offsetHeight / 2;
        const obscured = panels.some(
          (rect) =>
            screen.x + halfWidth > rect.left &&
            screen.x - halfWidth < rect.right &&
            screen.y + halfHeight > rect.top &&
            screen.y - halfHeight < rect.bottom,
        );
        const visible =
          !obscured &&
          screen.z > 0 &&
          screen.x > 12 &&
          screen.x < width - 12 &&
          screen.y > 60 &&
          screen.y < height - 75;
        element.style.left = `${screen.x}px`;
        element.style.top = `${screen.y}px`;
        element.style.visibility = visible ? "visible" : "hidden";
        element.style.opacity = visible ? "1" : "0";
      }
    }
    function resize() {
      if (!app || !world || cancelled) return;
      app.resizeCanvas();
      world.focus(
        canvas!.clientWidth,
        canvas!.clientHeight,
        viewRef.current.zoom,
        viewRef.current.pan,
        viewRef.current.orbit,
      );
      projectMarkers();
      app.renderNextFrame = true;
    }
    function refresh() {
      if (!world || !app) return;
      if (latestProps.current.paused) endDrag();
      world.update(latestProps.current);
      app.autoRender = false;
      resize();
      app.renderNextFrame = true;
    }
    function onVisibility() {
      if (document.hidden) endDrag();
      if (app) {
        app.autoRender = false;
        app.renderNextFrame = !document.hidden;
      }
    }
    let drag: { id: number; x: number; y: number; pan: boolean } | null = null;
    function onPointerDown(event: PointerEvent) {
      if (
        !event.isPrimary ||
        drag ||
        latestProps.current.paused ||
        event.button > 2 ||
        event.button === 1
      )
        return;
      drag = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        pan: event.shiftKey || event.button === 2,
      };
      canvas!.setPointerCapture(event.pointerId);
      canvas!.classList.add("is-dragging");
    }
    function onPointerMove(event: PointerEvent) {
      if (!drag || drag.id !== event.pointerId || latestProps.current.paused)
        return;
      const dx = event.clientX - drag.x,
        dy = event.clientY - drag.y;
      drag.x = event.clientX;
      drag.y = event.clientY;
      const view = viewRef.current;
      if (drag.pan) {
        view.pan[0] = Math.max(
          -8,
          Math.min(8, view.pan[0] - (dx * 0.025) / view.zoom),
        );
        view.pan[2] = Math.max(
          -8,
          Math.min(8, view.pan[2] - (dy * 0.025) / view.zoom),
        );
      } else {
        view.orbit[0] = Math.max(
          -100,
          Math.min(100, view.orbit[0] - dx * 0.22),
        );
        view.orbit[1] = Math.max(-20, Math.min(28, view.orbit[1] + dy * 0.13));
      }
      resize();
    }
    function onPointerEnd(event: PointerEvent) {
      if (drag?.id !== event.pointerId) return;
      endDrag();
    }
    function endDrag() {
      const id = drag?.id;
      drag = null;
      if (id !== undefined && canvas!.hasPointerCapture(id))
        canvas!.releasePointerCapture(id);
      canvas!.classList.remove("is-dragging");
    }
    function onWheel(event: WheelEvent) {
      if (event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      if (latestProps.current.paused) return;
      viewRef.current.zoom = Math.max(
        0.65,
        Math.min(
          2.3,
          viewRef.current.zoom *
            Math.exp(-Math.max(-200, Math.min(200, event.deltaY)) * 0.002),
        ),
      );
      resize();
    }
    function preventMenu(event: Event) {
      event.preventDefault();
    }
    function onContextLost(event: Event) {
      event.preventDefault();
      endDrag();
      contextLost = true;
      if (app) {
        app.autoRender = false;
        if (typeof app.frameRequestId === "number")
          cancelAnimationFrame(app.frameRequestId);
        app.frameRequestId = null;
      }
      if (!cancelled) {
        setFallback(
          "The facility view was interrupted. Your assignment and progress are safe.",
        );
        setReady(false);
        latestProps.current.onReady?.(false);
      }
    }
    function onContextRestored() {
      // The device restores its own buffers, textures and shaders before this
      // listener runs. Keep the existing world instead of acquiring the same
      // canvas again and compiling a second set of graphics resources.
      if (cancelled || !app || !world) return;
      contextLost = false;
      refresh();
      app.requestAnimationFrame();
      setFallback(null);
      setReady(true);
      latestProps.current.onReady?.(true);
    }

    function releaseResources() {
      endDrag();
      refreshRef.current = null;
      observer?.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas!.removeEventListener("webglcontextlost", onContextLost);
      canvas!.removeEventListener("webglcontextrestored", onContextRestored);
      canvas!.removeEventListener("pointerdown", onPointerDown);
      canvas!.removeEventListener("pointermove", onPointerMove);
      canvas!.removeEventListener("pointerup", onPointerEnd);
      canvas!.removeEventListener("pointercancel", onPointerEnd);
      canvas!.removeEventListener("lostpointercapture", onPointerEnd);
      canvas!.removeEventListener("wheel", onWheel);
      canvas!.removeEventListener("contextmenu", preventMenu);
      if (app && typeof app.frameRequestId === "number")
        cancelAnimationFrame(app.frameRequestId);
      // Initialization can fail after a context is acquired. Release that context
      // even when the engine has not reached a state its destroy method expects.
      try {
        world?.dispose();
      } finally {
        world = null;
        try {
          if (app) app.destroy();
          else device?.destroy();
        } catch {
          device?.destroy();
        } finally {
          app = null;
          device = null;
        }
      }
    }

    async function initialize() {
      setFallback(null);
      setReady(false);
      device = await createGraphicsDevice(canvas!, {
        deviceTypes: [DEVICETYPE_WEBGL2],
        antialias: true,
        powerPreference: "low-power",
      });
      if (cancelled) {
        device.destroy();
        device = null;
        return;
      }
      if (device.deviceType !== DEVICETYPE_WEBGL2) {
        device.destroy();
        device = null;
        throw new Error("WebGL2 is unavailable");
      }
      device.maxPixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      const options = new AppOptions();
      options.graphicsDevice = device;
      options.batchManager = BatchManager;
      options.componentSystems = [
        RenderComponentSystem,
        CameraComponentSystem,
        LightComponentSystem,
      ];
      app = new AppBase(canvas!);
      app.init(options);
      app.setCanvasFillMode(FILLMODE_FILL_WINDOW);
      app.setCanvasResolution(RESOLUTION_AUTO);
      world = createFacilityWorld(app);
      world.update(latestProps.current);
      app.on("update", (dt: number) => {
        if (cancelled || document.hidden || contextLost) return;
        clock += dt;
        const animated = !latestProps.current.paused && world?.needsAnimation();
        world?.animate(
          dt,
          !latestProps.current.reducedMotion && !latestProps.current.paused,
        );
        if (app && animated && clock - lastRender >= 1 / 30) {
          app.renderNextFrame = true;
          lastRender = clock;
          projectMarkers();
        }
        if (world) {
          canvas!.dataset.cameraPosition = world.camera
            .getPosition()
            .toString();
          canvas!.dataset.siteHour = world.getHour().toFixed(4);
          canvas!.dataset.cameraView = latestProps.current.cameraView;
          canvas!.dataset.timeMode = latestProps.current.timeMode;
          if (clock - lastTimeReport >= 0.5) {
            latestProps.current.onTimeChange?.(world.getHour());
            lastTimeReport = clock;
          }
        }
      });
      refreshRef.current = refresh;
      observer = new ResizeObserver(resize);
      observer.observe(canvas!.parentElement ?? canvas!);
      window.addEventListener("resize", resize);
      document.addEventListener("visibilitychange", onVisibility);
      canvas!.addEventListener("webglcontextlost", onContextLost);
      canvas!.addEventListener("webglcontextrestored", onContextRestored);
      canvas!.addEventListener("pointerdown", onPointerDown);
      canvas!.addEventListener("pointermove", onPointerMove);
      canvas!.addEventListener("pointerup", onPointerEnd);
      canvas!.addEventListener("pointercancel", onPointerEnd);
      canvas!.addEventListener("lostpointercapture", onPointerEnd);
      canvas!.addEventListener("wheel", onWheel, { passive: false });
      canvas!.addEventListener("contextmenu", preventMenu);
      app.start();
      app.autoRender = false;
      resize();
      setReady(true);
      latestProps.current.onReady?.(true);
    }
    initialize().catch(() => {
      releaseResources();
      if (!cancelled) {
        setFallback(
          "The 3D view is unavailable on this device. You can continue with the facility controls below.",
        );
        latestProps.current.onReady?.(false);
      }
    });
    return () => {
      cancelled = true;
      releaseResources();
    };
  }, [retry]);

  useEffect(() => {
    viewRef.current = originalView();
    refreshRef.current?.();
  }, [props.cameraView, props.selectedTarget, props.intro]);

  useEffect(() => {
    refreshRef.current?.();
  });

  function changeView(
    action:
      | "in"
      | "out"
      | "left"
      | "right"
      | "up"
      | "down"
      | "reset"
      | "orbit-left"
      | "orbit-right",
  ) {
    const view = viewRef.current;
    if (action === "reset") viewRef.current = originalView();
    else if (action === "in" || action === "out")
      view.zoom = Math.max(
        0.65,
        Math.min(2.3, view.zoom + (action === "in" ? 0.15 : -0.15)),
      );
    else if (action === "orbit-left" || action === "orbit-right")
      view.orbit[0] = Math.max(
        -100,
        Math.min(100, view.orbit[0] + (action === "orbit-left" ? -15 : 15)),
      );
    else {
      const amount = 1.7 / view.zoom;
      if (action === "left") {
        view.pan[0] -= amount;
        view.pan[2] += amount * 0.7;
      }
      if (action === "right") {
        view.pan[0] += amount;
        view.pan[2] -= amount * 0.7;
      }
      if (action === "up") {
        view.pan[0] -= amount * 0.7;
        view.pan[2] -= amount;
      }
      if (action === "down") {
        view.pan[0] += amount * 0.7;
        view.pan[2] += amount;
      }
      view.pan[0] = Math.max(-8, Math.min(8, view.pan[0]));
      view.pan[2] = Math.max(-8, Math.min(8, view.pan[2]));
    }
    refreshRef.current?.();
  }

  const targets: string[] = props.campaign
    ? [
        "expansion",
        "rack",
        "power",
        "cooling",
        "network",
        ...(props.campaign.batteryInstalled ? ["battery"] : []),
      ]
    : props.placementMode
      ? ["bay-0", "bay-1", "bay-2"]
      : props.rackBay === null
        ? ["delivery"]
        : [
            ...(!props.powerConnected || props.overlay === "power"
              ? ["power"]
              : []),
            ...(!props.coolingConnected || props.overlay === "cooling"
              ? ["cooling"]
              : []),
            ...(!props.networkConnected || props.overlay === "network"
              ? ["network"]
              : []),
            ...(props.fault || props.selectedTarget === "controls"
              ? ["controls"]
              : []),
            "rack",
          ];
  const absolute: CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
  };
  return (
    <div
      className={`fl-facility-scene ${ready ? "is-ready" : "is-loading"} ${props.intro ? "is-intro" : ""}`}
      style={absolute}
    >
      <canvas
        key={retry}
        ref={canvasRef}
        className="fl-world-canvas"
        aria-label={
          props.campaign
            ? "Meridian campus: data halls, expansion works, cooling, power and network dependencies"
            : "First Light facility: a cutaway data hall, electrical room, cooling yard and delivery area"
        }
        style={{ ...absolute, display: "block" }}
      />
      <div
        className="fl-world-wash"
        aria-hidden="true"
        style={{
          ...absolute,
          pointerEvents: "none",
          background:
            "linear-gradient(180deg,rgba(13,23,35,.05),transparent 50%,rgba(13,23,35,.12))",
        }}
      />
      {!props.intro && ready && (
        <div
          className="fl-world-markers"
          style={{ ...absolute, pointerEvents: "none" }}
          aria-label="Facility equipment"
        >
          {targets.map((id) => (
            <button
              key={id}
              ref={(element) => {
                markerRefs.current[id] = element;
              }}
              type="button"
              className={`fl-world-marker ${props.selectedTarget === id ? "is-selected" : ""} ${id === "controls" && props.fault ? "is-fault" : ""} ${id.startsWith("bay-") ? "is-bay" : ""}`}
              aria-label={TARGETS[id].label}
              aria-pressed={props.selectedTarget === id}
              onClick={() => props.onSelect(id)}
              style={{
                position: "absolute",
                transform: "translate(-50%, -100%)",
                pointerEvents: "auto",
                visibility: "hidden",
              }}
            >
              <span className="fl-marker-dot" aria-hidden="true" />
              <span>{TARGETS[id].short}</span>
            </button>
          ))}
        </div>
      )}
      {props.viewControlsOpen && ready && (
        <div
          className="fl-view-console"
          id="fl-view-console"
          role="region"
          aria-label="View and lighting"
        >
          <div className="fl-view-heading">
            <span>
              <Camera size={16} /> Explore the campus
            </span>
            <button
              className="fl-icon"
              ref={closeViewRef}
              aria-label="Close view and lighting"
              onClick={props.onCloseViewControls}
            >
              <X size={18} />
            </button>
          </div>
          <p>Find your point of view.</p>
          <div
            className="fl-view-presets"
            role="group"
            aria-label="Camera viewpoint"
          >
            {(["campus", "hall", "plant"] as const).map((view) => (
              <button
                key={view}
                aria-pressed={props.cameraView === view}
                onClick={() => props.onCameraViewChange(view)}
              >
                {view === "campus"
                  ? "Campus"
                  : view === "hall"
                    ? "Data hall"
                    : "Cooling yard"}
              </button>
            ))}
          </div>
          <div className="fl-lighting-label">
            LIGHTING{" "}
            <span>
              {props.reducedMotion
                ? "Automatic motion off"
                : "A full day in 4 minutes"}
            </span>
          </div>
          <div
            className="fl-light-presets"
            role="group"
            aria-label="Scene lighting"
          >
            {(["cycle", "day", "night"] as const).map((mode) => (
              <button
                key={mode}
                aria-pressed={props.timeMode === mode}
                onClick={() => props.onTimeModeChange(mode)}
              >
                {mode === "cycle" ? (
                  <Sunset size={16} />
                ) : mode === "day" ? (
                  <Sun size={16} />
                ) : (
                  <Moon size={16} />
                )}
                {mode === "cycle"
                  ? "Day cycle"
                  : mode === "day"
                    ? "Day"
                    : "Night"}
              </button>
            ))}
          </div>
          <p className="fl-view-hint">
            Drag to orbit · Scroll to zoom
            <br />
            Shift + drag to move across the site.
          </p>
          <div
            className="fl-view-adjust"
            role="group"
            aria-label="Facility camera"
          >
            {(
              [
                ["in", "+", "Zoom in"],
                ["out", "−", "Zoom out"],
                ["left", "←", "Pan left"],
                ["right", "→", "Pan right"],
                ["up", "↑", "Pan up"],
                ["down", "↓", "Pan down"],
                ["orbit-left", "↶", "Orbit left"],
                ["orbit-right", "↷", "Orbit right"],
              ] as const
            ).map(([action, symbol, label]) => (
              <button
                type="button"
                key={action}
                onClick={() => changeView(action)}
                aria-label={label}
              >
                {symbol}
              </button>
            ))}
          </div>
          <button
            className="fl-view-reset"
            type="button"
            onClick={() => changeView("reset")}
            aria-label="Reset facility view"
          >
            <RotateCcw size={13} /> Reset view
          </button>
          <small>
            Scene time changes the atmosphere. Your mission clock only advances
            when you act.
          </small>
        </div>
      )}
      {fallback && (
        <section className="fl-world-fallback" role="status">
          <p>{fallback}</p>
          <button type="button" onClick={() => setRetry((value) => value + 1)}>
            Retry facility view
          </button>
          {!props.intro && (
            <div
              className="fl-fallback-equipment"
              aria-label="Facility equipment controls"
            >
              {targets.map((id) => (
                <button
                  type="button"
                  key={id}
                  onClick={() => props.onSelect(id)}
                >
                  {TARGETS[id].short}
                </button>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
