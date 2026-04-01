import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { DEMO_ROUTES, DEMO_AIRPORTS } from "./demoData";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080/airlume-web/resources/analysis";
const EARTH_RADIUS = 5;

const AIRPORTS = {
  CYOW: { lat: 45.3225, lon: -75.6692 },
  CYYZ: { lat: 43.6777, lon: -79.6248 },
  CYTZ: { lat: 43.6275, lon: -79.3963 },
  KJFK: { lat: 40.6413, lon: -73.7781 },
  KLAX: { lat: 33.9425, lon: -118.408 },
  KORD: { lat: 41.9742, lon: -87.9073 },
  EGLL: { lat: 51.477,  lon: -0.4614  },
  LFPG: { lat: 49.0097, lon: 2.5478   },
  EHAM: { lat: 52.3086, lon: 4.7639   },
  RJTT: { lat: 35.5494, lon: 139.7798 },
  OMDB: { lat: 25.2528, lon: 55.3644  },
  YSSY: { lat: -33.946, lon: 151.177  },
  ZBAA: { lat: 40.0799, lon: 116.603  },
  FAOR: { lat: -26.133, lon: 28.242   },
  SBGR: { lat: -23.435, lon: -46.473  },
  ...DEMO_AIRPORTS,
};



/* ================================
   UTILITIES
================================ */
const latLonToVec3 = (lat, lon, r = EARTH_RADIUS) => {
  const phi   = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta)
  );
};

const riskColor = (risk) => {
  switch ((risk || "").toUpperCase()) {
    case "CRITICAL": return 0xff3b30;
    case "HIGH":     return 0xff9500;
    case "MODERATE": return 0xffcc00;
    case "LOW":      return 0x34c759;
    default:         return 0x888888;
  }
};

const createGreatCircle = (start, end, segments = 200) => {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    pts.push(
      new THREE.Vector3()
        .copy(start).lerp(end, i / segments)
        .normalize()
        .multiplyScalar(EARTH_RADIUS + 0.08)
    );
  }
  return pts;
};

const smoothstep = (t) => t * t * (3 - 2 * t);


/* ================================
   ANALYSIS RESULTS PANEL
================================ */
const riskHex = (risk) => "#" + riskColor(risk).toString(16).padStart(6, "0");

const riskBg = (risk) => {
  switch ((risk || "").toUpperCase()) {
    case "CRITICAL": return "rgba(255,59,48,0.12)";
    case "HIGH":     return "rgba(255,149,0,0.12)";
    case "MODERATE": return "rgba(255,204,0,0.12)";
    case "LOW":      return "rgba(52,199,89,0.12)";
    default:         return "rgba(255,255,255,0.06)";
  }
};

const recStyle = (risk) => {
  const map = {
    LOW:      { bg: "rgba(52,199,89,0.08)",  border: "rgba(52,199,89,0.35)",  icon: "✅" },
    MODERATE: { bg: "rgba(255,204,0,0.08)",  border: "rgba(255,204,0,0.35)",  icon: "⚠️" },
    HIGH:     { bg: "rgba(255,149,0,0.08)",  border: "rgba(255,149,0,0.35)",  icon: "🚨" },
    CRITICAL: { bg: "rgba(255,59,48,0.08)",  border: "rgba(255,59,48,0.35)",  icon: "🛑" },
  };
  return map[(risk || "").toUpperCase()] || map.LOW;
};

function AnalysisPanel({ analysis, origin, destination }) {
  const rec = recStyle(analysis.riskLevel);

  const statCard = (label, value, unit = "") => (
    <div style={{
      background: "rgba(15,23,42,0.8)",
      border: "1px solid rgba(56,189,248,0.15)",
      borderRadius: 14, padding: "22px 18px", textAlign: "center",
    }}>
      <div style={{ fontSize: "0.72em", color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: "2em", fontWeight: 700, color: riskHex(analysis.riskLevel) }}>
        {value}<span style={{ fontSize: "0.5em", color: "#94a3b8", marginLeft: 3 }}>{unit}</span>
      </div>
    </div>
  );

  return (
    <div style={{ marginTop: 32, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginBottom: 28 }}>
        {[origin, destination].map((code, i) => (
          <React.Fragment key={i}>
            {i === 1 && <span style={{ fontSize: "1.8em", color: "#475569" }}>→</span>}
            <div style={{
              background: "rgba(14,165,233,0.1)", border: "1px solid rgba(14,165,233,0.35)",
              padding: "12px 28px", borderRadius: 12,
              fontFamily: "monospace", fontSize: "1.8em", fontWeight: 700,
              color: "#38bdf8", letterSpacing: 4,
            }}>{code}</div>
          </React.Fragment>
        ))}
      </div>

      {analysis.totalDistance > 0 && (
        <div style={{ textAlign: "center", color: "#64748b", fontSize: "0.88em", marginBottom: 24 }}>
          <span style={{ color: "#94a3b8", fontWeight: 600 }}>Total Distance:</span> {analysis.totalDistance} km
          &nbsp;|&nbsp;
          <span style={{ color: "#94a3b8", fontWeight: 600 }}>Waypoints:</span> {analysis.waypointCount}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 28 }}>
        {statCard("⚡ Lightning Risk", `${parseFloat(analysis.lightningProbability).toFixed(1)}`, "%")}
        <div style={{
          background: "rgba(15,23,42,0.8)", border: "1px solid rgba(56,189,248,0.15)",
          borderRadius: 14, padding: "22px 18px", textAlign: "center",
        }}>
          <div style={{ fontSize: "0.72em", color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>📊 Risk Level</div>
          <div style={{ fontSize: "1.6em", fontWeight: 700, color: riskHex(analysis.riskLevel) }}>{analysis.riskLevel}</div>
        </div>
        <div style={{
          background: "rgba(15,23,42,0.8)", border: "1px solid rgba(56,189,248,0.15)",
          borderRadius: 14, padding: "22px 18px", textAlign: "center",
        }}>
          <div style={{ fontSize: "0.72em", color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>🛡️ Safety</div>
          <div style={{ fontSize: "1.1em", fontWeight: 700, color: "#e2e8f0" }}>{analysis.safetyStatus}</div>
        </div>
        {analysis.averageRisk > 0 && statCard("📈 Avg Risk", `${parseFloat(analysis.averageRisk).toFixed(1)}`, "%")}
      </div>

      <div style={{
        background: "rgba(14,165,233,0.06)", border: "1px solid rgba(14,165,233,0.18)",
        borderRadius: 16, padding: 24, marginBottom: 28,
      }}>
        <div style={{ fontSize: "0.85em", fontWeight: 700, color: "#38bdf8", marginBottom: 16 }}>🌤 Current Weather Conditions</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))", gap: 12 }}>
          {[
            { icon: "🌡️", value: `${parseFloat(analysis.temperature).toFixed(1)}°C`, label: "Temperature" },
            { icon: "💧", value: `${parseFloat(analysis.humidity).toFixed(1)}%`,    label: "Humidity" },
            { icon: "📊", value: `${parseFloat(analysis.pressure).toFixed(0)}`,     label: "Pressure hPa" },
            { icon: "💨", value: `${parseFloat(analysis.windSpeed).toFixed(1)} m/s`, label: "Wind Speed" },
          ].map(({ icon, value, label }) => (
            <div key={label} style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 10, padding: "16px 12px", textAlign: "center",
            }}>
              <div style={{ fontSize: "1.6em", marginBottom: 6 }}>{icon}</div>
              <div style={{ fontSize: "1.25em", fontWeight: 700, color: "#e2e8f0" }}>{value}</div>
              <div style={{ fontSize: "0.7em", color: "#64748b", textTransform: "uppercase", marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {analysis.newFlightLevel && (
        <div style={{
          background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.3)",
          borderRadius: 10, padding: "14px 18px", marginBottom: 16, fontSize: "0.9em", color: "#c4b5fd",
        }}>
          ✈ <strong>Suggested Flight Level:</strong> {analysis.newFlightLevel}
        </div>
      )}
      {analysis.alternateAirport && (
        <div style={{
          background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.3)",
          borderRadius: 10, padding: "14px 18px", marginBottom: 24, fontSize: "0.9em", color: "#c4b5fd",
        }}>
          🔀 <strong>Alternate Airport:</strong> {analysis.alternateAirport}
        </div>
      )}

      <div style={{
        background: rec.bg, border: `1px solid ${rec.border}`,
        borderRadius: 14, padding: "24px 28px", textAlign: "center", marginBottom: 28,
      }}>
        <div style={{ fontSize: "2.2em", marginBottom: 10 }}>{rec.icon}</div>
        <div style={{ fontSize: "0.95em", lineHeight: 1.7, color: "#cbd5e1" }}>{analysis.recommendation}</div>
      </div>

      {analysis.waypoints?.length > 0 && (
        <div style={{
          background: "rgba(15,23,42,0.6)", border: "1px solid rgba(56,189,248,0.1)",
          borderRadius: 16, padding: 24, marginBottom: 24,
        }}>
          <div style={{ fontSize: "0.85em", fontWeight: 700, color: "#38bdf8", marginBottom: 16 }}>
            📍 Waypoint Analysis ({analysis.waypoints.length} points)
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px,1fr))", gap: 12 }}>
            {analysis.waypoints.map((wp, i) => (
              <div key={i} style={{
                background: riskBg(wp.riskLevel || wp.risk),
                borderLeft: `4px solid ${riskHex(wp.riskLevel || wp.risk)}`,
                borderRadius: "0 10px 10px 0", padding: "14px 16px",
              }}>
                <div style={{ fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>
                  {wp.name || `Waypoint ${wp.number || i + 1}`}
                </div>
                {wp.distanceKm != null && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.83em", color: "#94a3b8", marginBottom: 4 }}>
                    <span>Distance</span><strong style={{ color: "#e2e8f0" }}>{wp.distanceKm} km</strong>
                  </div>
                )}
                {wp.riskPercent != null && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.83em", color: "#94a3b8", marginBottom: 4 }}>
                    <span>Lightning Risk</span><strong style={{ color: "#e2e8f0" }}>{parseFloat(wp.riskPercent).toFixed(1)}%</strong>
                  </div>
                )}
                {wp.latitude != null && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8em", color: "#64748b", marginBottom: 4 }}>
                    <span>Position</span>
                    <span>{parseFloat(wp.latitude).toFixed(2)}°, {parseFloat(wp.longitude).toFixed(2)}°</span>
                  </div>
                )}
                <span style={{
                  display: "inline-block", marginTop: 8, padding: "2px 10px", borderRadius: 20,
                  background: riskBg(wp.riskLevel || wp.risk),
                  color: riskHex(wp.riskLevel || wp.risk),
                  border: `1px solid ${riskHex(wp.riskLevel || wp.risk)}`,
                  fontSize: "0.75em", fontWeight: 700,
                }}>
                  {wp.riskLevel || wp.risk || "UNKNOWN"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================
   MAIN GLOBE COMPONENT
================================ */
function GlobeFlight({ origin, destination, onOriginChange, onDestinationChange, autoAnalyze }) {
  const mountRef     = useRef(null);
  const sceneRef     = useRef();
  const cameraRef    = useRef();
  const rendererRef  = useRef();
  const controlsRef  = useRef();
  const earthRef     = useRef();
  const overlayRef   = useRef();
  const animRef      = useRef();
  const spinRef      = useRef(true);
  const flyRef       = useRef(null);
const [demoMode,  setDemoMode]  = useState(false);
const [demoIndex, setDemoIndex] = useState(0);

  // Plane HTML overlay (avoids all WebGL blending issues)
  const planeElRef    = useRef(null);   // the <div> element
  const planeRouteRef = useRef(null);   // { points[], progress }

  const [analysis, setAnalysis] = useState(null);
  const [error,    setError]    = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [hasRoute, setHasRoute] = useState(false);

  /* ================================
     INIT THREE.JS SCENE
  ================================ */
  useEffect(() => {
    const mount  = mountRef.current;
    const width  = mount.parentElement?.clientWidth || mount.clientWidth || 800;
    const height = 600;

    /* Scene */
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000814);
    sceneRef.current = scene;

    /* Camera */
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 14);
    cameraRef.current = camera;

    /* Renderer */
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace    = THREE.SRGBColorSpace;
    renderer.toneMapping         = THREE.NoToneMapping;      // no tone mapping = no blowout ever
    renderer.toneMappingExposure = 1.0;
    renderer.setClearColor(0x000814, 1);                     // explicit opaque dark clear — never goes white
    rendererRef.current = renderer;
    mount.appendChild(renderer.domElement);

    /* Controls */
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance   = 6.0;
    controls.maxDistance   = 40;
    controlsRef.current = controls;

    /* Lighting */
    scene.add(new THREE.AmbientLight(0xffffff, 2.5));
    const sun = new THREE.DirectionalLight(0xfff4e0, 2.0);
    sun.position.set(10, 5, 10);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0x8ab4f8, 0.6);
    fill.position.set(-10, -5, -5);
    scene.add(fill);

    /* Stars */
    const starPos = new Float32Array(6000 * 3);
    for (let i = 0; i < starPos.length; i++) starPos[i] = (Math.random() - 0.5) * 400;
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.18, sizeAttenuation: true })));

    /* Earth group (spins) */
    const earthGroup = new THREE.Group();
    earthGroup.rotation.y = Math.PI;
    scene.add(earthGroup);
    earthRef.current = earthGroup;

    const earthMesh = new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_RADIUS, 128, 128),
      new THREE.MeshStandardMaterial({ color: 0x1a6b4a, roughness: 0.55, metalness: 0 })
    );
    earthGroup.add(earthMesh);

    // Try local texture first, fall back to Three.js CDN, then solid color
    const tryLoadTexture = (urls, idx = 0) => {
      if (idx >= urls.length) {
        earthMesh.material.color.set(0x1a6b4a);
        earthMesh.material.roughness = 0.8;
        earthMesh.material.needsUpdate = true;
        return;
      }
      new THREE.TextureLoader().load(
        urls[idx],
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
          earthMesh.material.map = tex;
          earthMesh.material.color.set(0xffffff); // reset so texture shows full color
          earthMesh.material.needsUpdate = true;
        },
        undefined,
        () => tryLoadTexture(urls, idx + 1)
      );
    };
    tryLoadTexture([
      "/textures/earth1.jpeg",
      "/earth.jpg",
      "https://threejs.org/examples/textures/planets/earth_daymap.jpg",
      "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_daymap.jpg",
    ]);

    /* No atmosphere sphere — transparent meshes corrupt the depth buffer */


    /* Overlay group (never rotates — markers & plane live here) */
    const overlay = new THREE.Group();
    scene.add(overlay);
    overlayRef.current = overlay;

    /* Plane is rendered as an HTML <div> over the canvas.
       This completely avoids WebGL alpha/depth blending issues.
       The animate loop projects the world position to screen coords
       and moves the div each frame. */

    /* ── animate loop ── */
    const REFERENCE_DIST = 14;
    const BASE_PX        = 48;

    const animate = () => {
      animRef.current = requestAnimationFrame(animate);

      /* Earth auto-spin */
      if (spinRef.current) earthGroup.rotation.y += 0.0006;

      /* Smooth camera fly */
      const fly = flyRef.current;
      if (fly) {
        const t = Math.min((Date.now() - fly.startTime) / fly.duration, 1);
        const e = smoothstep(t);
        camera.position.lerpVectors(fly.fromPos,    fly.toPos,    e);
        controls.target.lerpVectors(fly.fromTarget, fly.toTarget, e);
        if (t >= 1) flyRef.current = null;
      }

      /* ── Plane HTML overlay: advance position + project to screen ── */
      const route   = planeRouteRef.current;
      const planeEl = planeElRef.current;

      if (route && planeEl) {
        route.progress = (route.progress + 0.00018) % 1;

        const pts  = route.points;
        const rawI = route.progress * (pts.length - 1);
        const i0   = Math.floor(rawI);
        const i1   = Math.min(i0 + 1, pts.length - 1);
        const frac = rawI - i0;

        const pos = new THREE.Vector3().lerpVectors(pts[i0], pts[i1], frac);

        // Project world → NDC → pixels
        const ndc    = pos.clone().project(camera);
        const canvas = renderer.domElement;
        const px     = ( ndc.x * 0.5 + 0.5) * canvas.clientWidth;
        const py     = (-ndc.y * 0.5 + 0.5) * canvas.clientHeight;

        // Hide if behind the globe (ndc.z > 1 means behind camera/clipped)
        const behindGlobe = pos.length() < EARTH_RADIUS - 0.1 || ndc.z > 1;
        planeEl.style.display = behindGlobe ? "none" : "block";
        planeEl.style.left    = px + "px";
        planeEl.style.top     = py + "px";

        // Rotation: nose always points toward destination
        // Project current pos and destination to CSS pixel space, compute angle
        // NDC: x right=+1, y up=+1. CSS pixels: x right, y DOWN.
        // So NDCpixel: px = (ndcX*0.5+0.5)*W,  py = (-ndcY*0.5+0.5)*H
        // Direction vector in pixel space: (destPx-curPx, destPy-curPy)
        // SVG nose points UP (CSS -Y), so angle = atan2(dx, -dy)
        {
          const destNdc = pts[pts.length - 1].clone().project(camera);
          const destPx  = ( destNdc.x * 0.5 + 0.5) * renderer.domElement.clientWidth;
          const destPy  = (-destNdc.y * 0.5 + 0.5) * renderer.domElement.clientHeight;
          const dx = destPx - px;
          const dy = destPy - py;
          const deg = Math.atan2(dx, -dy) * 180 / Math.PI;
          planeEl.style.transform = `translate(-50%, -50%) rotate(${deg}deg)`;
        }

        // FR24-style scale: proportional to camera distance
        const camDist  = camera.position.length();
        const scale    = camDist / REFERENCE_DIST ;
        const sizePx   = Math.round(BASE_PX * scale);
        planeEl.style.width  = sizePx + "px";
        planeEl.style.height = sizePx + "px";

        /* Contrail — WebGL line is fine (opaque-ish, no blending with earth) */
        const oldTrail = overlay.getObjectByName("trail");
        if (oldTrail) { overlay.remove(oldTrail); oldTrail.geometry.dispose(); }
        const trailPts = pts.slice(Math.max(0, i0 - 50), i0 + 1);
        if (trailPts.length > 1) {
          const trail = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(trailPts),
            new THREE.LineBasicMaterial({ color: 0x00d9ff, transparent: false })
          );
          trail.name = "trail";
          overlay.add(trail);
        }
      }

      controls.update();
      // Reproject airport SVG pins each frame
if (window._airPins) {
  window._airPins.forEach(({ el, worldPos }) => {
    const ndc = worldPos.clone().project(camera);
    const canvas = renderer.domElement;
    const px = ( ndc.x * 0.5 + 0.5) * canvas.clientWidth;
    const py = (-ndc.y * 0.5 + 0.5) * canvas.clientHeight;
    const hidden = ndc.z > 1;
    el.style.display = hidden ? "none" : "block";
    el.style.left = px + "px";
    el.style.top  = py + "px";
  });
}
      renderer.render(scene, camera);
    };
    animate();

    /* Resize handler */
    const handleResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animRef.current);
      renderer.dispose();
      if (mount?.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  /* ================================
     AUTO-ANALYZE (JSF URL params)
  ================================ */
  useEffect(() => {
    if (!autoAnalyze) return;
    const t = setTimeout(() => handleSubmit(), 400);
    return () => clearTimeout(t);
  }, [autoAnalyze]); // eslint-disable-line

  /* ================================
     CAMERA FLY-TO
  ================================ */
  const flyToRoute = (startVec, endVec) => {
    const camera   = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const mid = new THREE.Vector3()
      .copy(startVec).lerp(endVec, 0.5)
      .normalize()
      .multiplyScalar(EARTH_RADIUS * 0.1);

    const angDist  = startVec.angleTo(endVec);
    const zoomDist = THREE.MathUtils.clamp(
      EARTH_RADIUS + 2.5 + (angDist / Math.PI) * 8,
      EARTH_RADIUS + 2.5, 16
    );
    const camPos = mid.clone().normalize().multiplyScalar(zoomDist);

    flyRef.current = {
      fromPos:    camera.position.clone(),
      toPos:      camPos,
      fromTarget: controls.target.clone(),
      toTarget:   mid.clone(),
      startTime:  Date.now(),
      duration:   2200,
    };
  };

  /* ================================
     DRAW ROUTE + ACTIVATE PLANE
  ================================ */
  const drawRoute = (oLat, oLon, dLat, dLon, waypointData, oCode = '', dCode = '') => {
    const overlay = overlayRef.current;
    const earth   = earthRef.current;
    if (!overlay || !earth) return;

    /* Clear old route objects
       Spread first — overlay.children is a live array */
    [...overlay.children].forEach(c => {
      overlay.remove(c);
      if (c.geometry) c.geometry.dispose();
    });

    // Clear old HTML pins before drawing new ones
if (window._airPins) {
  window._airPins.forEach(({ el }) => el.remove());
  window._airPins = [];
}
    spinRef.current   = false;
    earth.rotation.y  = Math.PI;

    const startPt     = latLonToVec3(oLat, oLon);
    const endPt       = latLonToVec3(dLat, dLon);
    const curvePoints = createGreatCircle(startPt, endPt);

    flyToRoute(startPt, endPt);

    /* White arc — lifted higher off the globe for visible curve */
const arcPts = [];
for (let i = 0; i <= 200; i++) {
  const t   = i / 200;
  const arc = new THREE.Vector3()
    .copy(startPt).lerp(endPt, t)
    .normalize()
    .multiplyScalar(EARTH_RADIUS + (0.5 * Math.sin(t * Math.PI)));
  arcPts.push(arc);
}
const arcGeo = new THREE.BufferGeometry().setFromPoints(arcPts);
overlay.add(new THREE.Line(arcGeo,
  new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })
));


    /* Airport pins */
    const roundRect = (ctx, x, y, w, h, r) => {
      ctx.beginPath();
      ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
      ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
      ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
      ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
      ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
    };

    const makeAirportPin = (pos, col, icaoCode, isOrigin) => {
      const outward = pos.clone().normalize();
      const hexCol  = "#" + col.toString(16).padStart(6, "0");
      const poleH   = 0.14;
      const poleTop = pos.clone().add(outward.clone().multiplyScalar(poleH));

      overlay.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([pos.clone(), poleTop]),
        new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.85 })
      ));

      // SVG location pin as HTML overlay (same approach as the plane)
const pinEl = document.createElement("div");
pinEl.style.cssText = `
  position: absolute;
  width: 32px;
  height: 32px;
  pointer-events: none;
  transform: translate(-50%, -100%);
  z-index: 9;
  filter: drop-shadow(0 0 6px ${isOrigin ? 'rgba(0,230,118,0.9)' : 'rgba(255,68,68,0.9)'});
`;
pinEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 40 40">
<path fill="${isOrigin ? '#02fc83' : '#0f03f5'}" d="M 19.96875 -0.0234375 C 20.050781 -0.0234375 20.128906 -0.0234375 20.210938 -0.0234375 C 21.351562 -0.0195312 22.472656 0 23.59375 0.234375 C 23.667969 0.25 23.746094 0.265625 23.824219 0.28125 C 26.875 0.917969 29.722656 2.140625 32.1875 4.0625 C 32.257812 4.113281 32.324219 4.167969 32.398438 4.222656 C 33.613281 5.167969 34.757812 6.285156 35.703125 7.5 C 35.792969 7.609375 35.792969 7.609375 35.882812 7.722656 C 38.589844 11.101562 40.035156 15.4375 40.023438 19.746094 C 40.023438 19.972656 40.027344 20.203125 40.027344 20.433594 C 40.03125 21.476562 39.9375 22.484375 39.765625 23.515625 C 39.742188 23.648438 39.742188 23.648438 39.722656 23.785156 C 39.171875 26.839844 37.84375 29.746094 35.9375 32.1875 C 35.878906 32.261719 35.820312 32.339844 35.757812 32.417969 C 34.792969 33.617188 33.714844 34.757812 32.5 35.703125 C 32.425781 35.761719 32.355469 35.824219 32.277344 35.882812 C 29.78125 37.882812 26.722656 39.171875 23.59375 39.765625 C 23.53125 39.777344 23.46875 39.792969 23.402344 39.804688 C 21.054688 40.261719 18.347656 40.175781 16.015625 39.6875 C 15.898438 39.664062 15.898438 39.664062 15.773438 39.636719 C 12.875 39.019531 10.148438 37.761719 7.8125 35.9375 C 7.738281 35.878906 7.660156 35.820312 7.582031 35.757812 C 6.382812 34.792969 5.242188 33.714844 4.296875 32.5 C 4.207031 32.390625 4.207031 32.390625 4.117188 32.277344 C 2.117188 29.78125 0.828125 26.722656 0.234375 23.59375 C 0.222656 23.53125 0.207031 23.46875 0.195312 23.402344 C -0.230469 21.214844 -0.222656 18.585938 0.234375 16.40625 C 0.25 16.332031 0.265625 16.253906 0.28125 16.175781 C 1.085938 12.332031 2.839844 8.9375 5.546875 6.09375 C 5.589844 6.046875 5.636719 6 5.683594 5.953125 C 6.308594 5.300781 6.949219 4.703125 7.671875 4.164062 C 7.816406 4.058594 7.957031 3.953125 8.101562 3.84375 C 8.757812 3.347656 9.4375 2.90625 10.15625 2.5 C 10.207031 2.472656 10.253906 2.441406 10.304688 2.414062 C 13.253906 0.726562 16.597656 -0.0390625 19.96875 -0.0234375 Z M 9.765625 5.078125 C 9.691406 5.132812 9.613281 5.1875 9.539062 5.242188 C 8.9375 5.679688 8.375 6.15625 7.8125 6.640625 C 7.722656 6.71875 7.722656 6.71875 7.628906 6.792969 C 7.316406 7.058594 7.046875 7.335938 6.78125 7.648438 C 6.6875 7.757812 6.589844 7.867188 6.488281 7.972656 C 5.4375 9.089844 4.617188 10.367188 3.90625 11.71875 C 3.875 11.777344 3.84375 11.839844 3.808594 11.902344 C 2.507812 14.386719 1.917969 17.15625 1.921875 19.945312 C 1.925781 20.054688 1.925781 20.054688 1.925781 20.164062 C 1.929688 22.085938 2.222656 23.867188 2.8125 25.703125 C 2.832031 25.761719 2.851562 25.820312 2.871094 25.878906 C 3.652344 28.257812 5.019531 30.308594 6.640625 32.1875 C 6.71875 32.277344 6.71875 32.277344 6.792969 32.371094 C 7.058594 32.683594 7.335938 32.953125 7.648438 33.21875 C 7.757812 33.3125 7.867188 33.410156 7.972656 33.511719 C 9.089844 34.5625 10.367188 35.382812 11.71875 36.09375 C 11.777344 36.125 11.839844 36.15625 11.902344 36.191406 C 13.875 37.226562 16.136719 37.871094 18.359375 38.046875 C 18.453125 38.054688 18.453125 38.054688 18.550781 38.0625 C 23.417969 38.4375 28.132812 36.828125 31.828125 33.667969 C 31.949219 33.566406 32.066406 33.460938 32.1875 33.359375 C 32.25 33.308594 32.308594 33.257812 32.371094 33.207031 C 32.683594 32.941406 32.953125 32.664062 33.21875 32.351562 C 33.3125 32.242188 33.410156 32.132812 33.511719 32.027344 C 34.5625 30.910156 35.382812 29.632812 36.09375 28.28125 C 36.125 28.222656 36.15625 28.160156 36.191406 28.097656 C 37.492188 25.613281 38.082031 22.84375 38.078125 20.054688 C 38.074219 19.980469 38.074219 19.910156 38.074219 19.835938 C 38.070312 17.914062 37.777344 16.132812 37.1875 14.296875 C 37.167969 14.238281 37.148438 14.179688 37.128906 14.121094 C 36.347656 11.742188 34.980469 9.691406 33.359375 7.8125 C 33.308594 7.75 33.257812 7.691406 33.207031 7.628906 C 32.941406 7.316406 32.664062 7.046875 32.351562 6.78125 C 32.242188 6.6875 32.132812 6.589844 32.027344 6.488281 C 30.957031 5.484375 29.730469 4.667969 28.4375 3.984375 C 28.375 3.949219 28.3125 3.917969 28.246094 3.882812 C 26.214844 2.824219 23.929688 2.132812 21.640625 1.953125 C 21.578125 1.949219 21.511719 1.941406 21.449219 1.9375 C 17.410156 1.628906 13.0625 2.660156 9.765625 5.078125 Z M 9.765625 5.078125 "/>
<path fill="${isOrigin ? '#f0f2f1' : '#fbfbfb'}" d="M 25.863281 9.964844 C 26.105469 10.179688 26.335938 10.398438 26.5625 10.625 C 26.628906 10.691406 26.699219 10.757812 26.765625 10.828125 C 28.453125 12.582031 29.195312 14.949219 29.160156 17.34375 C 29.046875 20.882812 26.375 24.382812 24.375 27.109375 C 24.316406 27.191406 24.316406 27.191406 24.253906 27.277344 C 23.625 28.140625 22.976562 28.996094 22.316406 29.835938 C 22.195312 29.992188 22.074219 30.144531 21.953125 30.300781 C 21.777344 30.523438 21.601562 30.746094 21.425781 30.96875 C 21.359375 31.054688 21.292969 31.136719 21.226562 31.222656 C 21.132812 31.34375 21.039062 31.460938 20.941406 31.582031 C 20.886719 31.648438 20.835938 31.71875 20.777344 31.789062 C 20.496094 32.089844 20.265625 32.128906 19.859375 32.144531 C 19.382812 32.046875 19.09375 31.675781 18.820312 31.304688 C 18.742188 31.203125 18.667969 31.105469 18.59375 31.007812 C 18.554688 30.957031 18.515625 30.90625 18.476562 30.855469 C 18.328125 30.660156 18.175781 30.472656 18.019531 30.285156 C 17.480469 29.617188 16.972656 28.929688 16.464844 28.234375 C 16.332031 28.054688 16.199219 27.875 16.066406 27.695312 C 14.910156 26.160156 13.84375 24.558594 12.890625 22.890625 C 12.851562 22.824219 12.8125 22.753906 12.773438 22.683594 C 11.3125 20.144531 10.355469 17.566406 11.121094 14.632812 C 11.566406 13.054688 12.394531 11.738281 13.515625 10.546875 C 13.578125 10.476562 13.578125 10.476562 13.644531 10.402344 C 14.40625 9.585938 15.402344 9.054688 16.40625 8.59375 C 16.472656 8.5625 16.542969 8.53125 16.613281 8.496094 C 19.617188 7.179688 23.390625 7.890625 25.863281 9.964844 Z M 15.234375 11.640625 C 15.128906 11.734375 15.128906 11.734375 15.023438 11.832031 C 13.75 13.035156 12.871094 14.726562 12.792969 16.5 C 12.714844 19.792969 15.113281 22.996094 16.953125 25.546875 C 17.039062 25.667969 17.125 25.789062 17.210938 25.910156 C 17.664062 26.542969 18.128906 27.171875 18.605469 27.789062 C 18.824219 28.070312 19.039062 28.355469 19.25 28.640625 C 19.292969 28.699219 19.335938 28.757812 19.382812 28.820312 C 19.464844 28.929688 19.546875 29.042969 19.625 29.15625 C 19.722656 29.28125 19.820312 29.40625 19.921875 29.53125 C 19.972656 29.53125 20.023438 29.53125 20.078125 29.53125 C 20.195312 29.394531 20.308594 29.25 20.414062 29.105469 C 20.484375 29.011719 20.558594 28.917969 20.628906 28.824219 C 20.664062 28.773438 20.703125 28.722656 20.742188 28.671875 C 20.859375 28.515625 20.980469 28.359375 21.097656 28.203125 C 22.042969 26.980469 22.96875 25.738281 23.828125 24.453125 C 23.867188 24.394531 23.910156 24.332031 23.949219 24.269531 C 24.535156 23.390625 25.089844 22.496094 25.609375 21.574219 C 25.695312 21.417969 25.785156 21.265625 25.875 21.109375 C 26.328125 20.308594 26.652344 19.460938 26.953125 18.59375 C 27 18.464844 27 18.464844 27.042969 18.328125 C 27.488281 16.824219 27.128906 15.042969 26.40625 13.679688 C 26.039062 13.039062 25.589844 12.480469 25.078125 11.953125 C 25.035156 11.90625 24.992188 11.859375 24.949219 11.808594 C 23.890625 10.640625 22.097656 9.929688 20.546875 9.835938 C 18.582031 9.757812 16.726562 10.304688 15.234375 11.640625 Z M 15.234375 11.640625 "/>
<path fill="white" d="M 23.371094 12.511719 C 24.59375 13.464844 25.398438 14.839844 25.601562 16.375 C 25.609375 16.492188 25.617188 16.605469 25.625 16.71875 C 25.628906 16.769531 25.632812 16.820312 25.636719 16.875 C 25.703125 18.378906 25.078125 19.765625 24.132812 20.898438 C 23.132812 21.972656 21.746094 22.574219 20.292969 22.671875 C 18.753906 22.714844 17.421875 22.242188 16.25 21.25 C 16.191406 21.203125 16.136719 21.152344 16.078125 21.105469 C 14.984375 20.097656 14.476562 18.695312 14.359375 17.242188 C 14.3125 15.753906 14.867188 14.347656 15.828125 13.226562 C 17.847656 11.113281 20.992188 10.898438 23.371094 12.511719 Z M 17.195312 14.679688 C 16.585938 15.425781 16.320312 16.308594 16.328125 17.265625 C 16.441406 18.296875 16.832031 19.105469 17.585938 19.820312 C 18.394531 20.457031 19.359375 20.796875 20.390625 20.703125 C 21.445312 20.535156 22.300781 20.0625 22.96875 19.21875 C 23.558594 18.277344 23.792969 17.351562 23.59375 16.25 C 23.316406 15.246094 22.742188 14.40625 21.835938 13.871094 C 20.214844 13.027344 18.449219 13.34375 17.195312 14.679688 Z M 17.195312 14.679688 "/>
</svg>`;
/*pinEl.innerHTML = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 40 40">
<path fill="${isOrigin ? '#00e676' : '#ff4444'}" d="M0 0 C4.97779304 2.65997367 8.91970505 6.97786514 10.69921875 12.31640625 C11.82287872 26.97924786 11.82287872 26.97924786 6.69921875 33.31640625 C1.75599278 38.23381903 -2.13277073 39.48787385 -9.05078125 39.62890625 C-16.02600194 39.56425436 -19.77802335 38.85765632 -24.7890625 33.8203125 C-29.81713576 28.14071425 -29.64573405 23.06770256 -29.578125 15.7734375 C-29.09357469 9.73362031 -26.74202498 6.42851104 -22.23828125 2.44140625 C-16.13824755 -1.97138409 -7.14300069 -2.12228374 0 0 Z M-12.30078125 6.31640625 C-12.30078125 6.64640625 -12.30078125 6.97640625 -12.30078125 7.31640625 C-10.32078125 7.31640625 -8.34078125 7.31640625 -6.30078125 7.31640625 C-6.30078125 6.98640625 -6.30078125 6.65640625 -6.30078125 6.31640625 C-8.28078125 6.31640625 -10.26078125 6.31640625 -12.30078125 6.31640625 Z M-17.30078125 10.31640625 C-16.30078125 12.31640625 -16.30078125 12.31640625 -16.30078125 12.31640625 Z M-2.30078125 10.31640625 C-1.30078125 12.31640625 -1.30078125 12.31640625 -1.30078125 12.31640625 Z M-18.30078125 13.31640625 C-17.30078125 16.31640625 -17.30078125 16.31640625 -17.30078125 16.31640625 Z M-11.30078125 13.31640625 C-11.30078125 14.63640625 -11.30078125 15.95640625 -11.30078125 17.31640625 C-9.98078125 17.31640625 -8.66078125 17.31640625 -7.30078125 17.31640625 C-7.30078125 15.99640625 -7.30078125 14.67640625 -7.30078125 13.31640625 C-8.62078125 13.31640625 -9.94078125 13.31640625 -11.30078125 13.31640625 Z M-1.30078125 13.31640625 C-0.30078125 16.31640625 -0.30078125 16.31640625 -0.30078125 16.31640625 Z M-17.30078125 17.31640625 C-16.30078125 19.31640625 -16.30078125 19.31640625 -16.30078125 19.31640625 Z M-2.30078125 17.31640625 C-1.30078125 19.31640625 -1.30078125 19.31640625 -1.30078125 19.31640625 Z M-14.30078125 23.31640625 C-13.30078125 25.31640625 -13.30078125 25.31640625 -13.30078125 25.31640625 Z M-5.30078125 23.31640625 C-4.30078125 25.31640625 -4.30078125 25.31640625 -4.30078125 25.31640625 Z M-12.30078125 26.31640625 C-11.30078125 28.31640625 -11.30078125 28.31640625 -11.30078125 28.31640625 Z M-7.30078125 26.31640625 C-6.30078125 28.31640625 -6.30078125 28.31640625 -6.30078125 28.31640625 Z M-10.30078125 29.31640625 C-10.30078125 29.97640625 -10.30078125 30.63640625 -10.30078125 31.31640625 C-9.64078125 31.31640625 -8.98078125 31.31640625 -8.30078125 31.31640625 C-8.30078125 30.65640625 -8.30078125 29.99640625 -8.30078125 29.31640625 C-8.96078125 29.31640625 -9.62078125 29.31640625 -10.30078125 29.31640625 Z" transform="translate(29.30078125,0.68359375)"/>
</svg>`;*/

// Store reference to update position each frame
const pinData = { el: pinEl, worldPos: pos.clone() };
//mount.parentElement.appendChild(pinEl);  // append to the relative wrapper div
mountRef.current.parentElement.appendChild(pinEl);

// Track this pin for position updates in the animate loop
if (!window._airPins) window._airPins = [];
window._airPins.push(pinData);


      const CW = 180, CH = 52;
      const canvas = document.createElement("canvas");
      canvas.width = CW; canvas.height = CH;
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "rgba(8,12,24,0.88)";
      roundRect(ctx, 0, 0, CW, CH, 18); ctx.fill();

      ctx.fillStyle = hexCol;
      roundRect(ctx, 0, 0, 10, CH, [18,0,0,18]); ctx.fill();

      ctx.strokeStyle = hexCol + "99"; ctx.lineWidth = 2.5;
      roundRect(ctx, 1, 1, CW-2, CH-2, 17); ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 38px 'Courier New', monospace";
      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillText(icaoCode, 26, 34);

      ctx.fillStyle = hexCol + "33";
      roundRect(ctx, 22, 52, 80, 20, 6); ctx.fill();
      ctx.fillStyle = hexCol;
      ctx.font = "bold 15px sans-serif"; ctx.textAlign = "left";
      ctx.fillText(isOrigin ? "ORIGIN" : "DEST", 28, 62);

      ctx.beginPath(); ctx.arc(CW-22, 22, 7, 0, Math.PI*2);
      ctx.fillStyle = hexCol; ctx.fill();

      const tex    = new THREE.CanvasTexture(canvas);
      const lSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
      const worldUp = new THREE.Vector3(0,1,0);
      const sideDir = new THREE.Vector3().crossVectors(outward, worldUp).normalize();
      const labelPos = pos.clone()
       .add(outward.clone().multiplyScalar(poleH + 0.05))
.add(sideDir.clone().multiplyScalar(isOrigin ? 0.06 : -0.06));
      lSprite.position.copy(labelPos);
      lSprite.scale.set(0.15, 0.06, 1);
      overlay.add(lSprite);
    };

    makeAirportPin(startPt, 0x00e676, oCode || "ORIG", true);
    makeAirportPin(endPt,   0x4444ff, dCode || "DEST", false);

    /* Activate plane HTML overlay */
    if (planeElRef.current) planeElRef.current.style.display = "block";
    planeRouteRef.current = { points: curvePoints, progress: 0 };


  };

  const runDemo = (index) => {
  const route = DEMO_ROUTES[index];
  setDemoMode(true);
  setDemoIndex(index);
  onOriginChange(route.origin);
  onDestinationChange(route.destination);
  const oInfo = AIRPORTS[route.origin];
  const dInfo = AIRPORTS[route.destination];
  if (oInfo && dInfo) {
    drawRoute(oInfo.lat, oInfo.lon, dInfo.lat, dInfo.lon, null, route.origin, route.destination);
    setHasRoute(true);
  }
  setAnalysis(route.data);
};

  /* ================================
     SUBMIT / RESET
  ================================ */
  const handleSubmit = () => {
    if (!origin || !destination) { setError("Enter both ICAO codes"); return; }
    setError(null);

    const oInfo = AIRPORTS[origin];
    const dInfo = AIRPORTS[destination];
    if (oInfo && dInfo) {
      drawRoute(oInfo.lat, oInfo.lon, dInfo.lat, dInfo.lon, null, origin, destination);
      setHasRoute(true);
    }

    setLoading(true);
    fetch(`${API_URL}?origin=${origin}&destination=${destination}`)
      .then(res => { if (!res.ok) throw new Error("Server error"); return res.json(); })
      .then(data => {
        if (!data.waypoints) throw new Error("Invalid route data");
        setAnalysis(data);
        setHasRoute(true);
        const wps = data.waypoints.filter(w => w.latitude && w.longitude);
        if (wps.length >= 2) {
          drawRoute(wps[0].latitude, wps[0].longitude,
                    wps[wps.length-1].latitude, wps[wps.length-1].longitude,
                    data.waypoints, origin, destination);
        } else if (oInfo && dInfo) {
          drawRoute(oInfo.lat, oInfo.lon, dInfo.lat, dInfo.lon, data.waypoints, origin, destination);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  const handleReset = () => {
    spinRef.current = true;
    if (earthRef.current) earthRef.current.rotation.y = Math.PI;
    setAnalysis(null); setHasRoute(false); setError(null);

    if (planeElRef.current) planeElRef.current.style.display = "none";
    planeRouteRef.current = null;

    if (window._airPins) {
  window._airPins.forEach(({ el }) => el.remove());
  window._airPins = [];
}

    const overlay = overlayRef.current;
    if (overlay) {
      [...overlay.children]
        .filter(c => c.name !== "__keep__")
        .forEach(c => { overlay.remove(c); if (c.geometry) c.geometry.dispose(); });
    }

    flyRef.current = {
      fromPos:    cameraRef.current.position.clone(),
      toPos:      new THREE.Vector3(0, 0, 14),
      fromTarget: controlsRef.current.target.clone(),
      toTarget:   new THREE.Vector3(0, 0, 0),
      startTime:  Date.now(),
      duration:   1400,
    };
  };

  /* ================================
     RENDER
  ================================ */
  const inputStyle = {
    padding: "10px 16px",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(0,224,255,0.35)",
    borderRadius: 8, color: "white",
    fontSize: "1rem", outline: "none",
    width: 150, letterSpacing: "0.08em",
  };

  return (
    <div style={{
      padding: "30px 24px", color: "white",
      background: "linear-gradient(160deg, #000d1a 0%, #001a2e 50%, #000814 100%)",
      minHeight: "100vh", fontFamily: "'Segoe UI', system-ui, sans-serif",
      position: "relative"
    }}>
      <h1 style={{
        textAlign: "center", fontSize: "2rem", fontWeight: 700,
        letterSpacing: "0.04em", marginBottom: 24,
        background: "linear-gradient(90deg, #00e0ff, #ffffff, #00e0ff)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
      }}>
         AirLume Route Analyzer
      </h1>
      <div style={{
  position: "absolute",
  top: 40,
  left: 40,
  width: 120,
  height: 60,
  zIndex: 100,
  pointerEvents: "none", // doesn't block clicks
}}>
  <img 
    src="/textures/logo.png"
    alt="AirLume Logo"
    style={{
      width: "100%",
      height: "100%",
      objectFit: "contain",
      filter: "drop-shadow(0 4px 12px rgba(0,224,255,0.4)) drop-shadow(0 0 20px rgba(0,224,255,0.2))"
    }}
    onError={(e) => {
      e.target.style.display = "none"; // hide if logo fails to load
    }}
  />
</div>

      <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <input value={origin} onChange={e => onOriginChange(e.target.value.toUpperCase())}
          placeholder="Origin ICAO" maxLength={4} style={inputStyle} />
        <input value={destination} onChange={e => onDestinationChange(e.target.value.toUpperCase())}
          placeholder="Destination ICAO" maxLength={4} style={inputStyle} />
        <button onClick={handleSubmit} disabled={loading} style={{
          padding: "10px 26px", background: "rgba(0,224,255,0.15)",
          border: "1px solid rgba(0,224,255,0.6)", borderRadius: 8,
          color: "#00e0ff", fontSize: "1rem", fontWeight: 600,
          cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
        }}>
          {loading ? "Analyzing…" : "Analyze Route"}
        </button>
        {hasRoute && (
          <button onClick={handleReset} style={{
            padding: "10px 18px", background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: 8, color: "#aaa", fontSize: "0.9rem", cursor: "pointer",
          }}>↺ Reset</button>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <span style={{ color: "#64748b", fontSize: "0.85rem", alignSelf: "center" }}>DEMO:</span>
        {DEMO_ROUTES.map((r, i) => (
          <button key={i} onClick={() => runDemo(i)} style={{
            padding: "7px 14px",
            background: demoMode && demoIndex === i ? "rgba(0,224,255,0.2)" : "rgba(255,255,255,0.05)",
            border: demoMode && demoIndex === i ? "1px solid rgba(0,224,255,0.8)" : "1px solid rgba(255,255,255,0.15)",
            borderRadius: 8,
            color: demoMode && demoIndex === i ? "#00e0ff" : "#94a3b8",
            fontSize: "0.8rem", cursor: "pointer",
          }}>
            {r.label}
          </button>
        ))}
      </div>

      {error && <div style={{ color: "#ff6b6b", textAlign: "center", marginBottom: 12 }}>⚠ {error}</div>}

      {/* Wrapper: position:relative so the plane <div> can be absolute over the canvas */}
      <div style={{ position: "relative", width: "100%", height: 600, borderRadius: 20, overflow: "hidden",
        boxShadow: "0 0 80px rgba(0,100,255,0.15), 0 30px 60px rgba(0,0,0,0.6)",
        border: "1px solid rgba(0,224,255,0.1)",
      }}>
        {/* Three.js canvas */}
        <div ref={mountRef} style={{ width: "100%", height: "100%" }} />

        {/* ── HTML plane icon — sits above canvas, zero WebGL blending ── */}
        <div ref={planeElRef} style={{
          display:        "none",           /* hidden until route loaded */
          position:       "absolute",
          pointerEvents:  "none",           /* don't block orbit controls */
          width:          48,
          height:         48,
          transformOrigin:"center center",
          transform:      "translate(-50%,-50%)",
          filter:         "drop-shadow(0 0 6px rgba(151, 3, 112, 0.9))",
          zIndex:         10,
        }}>
          {/* SVG plane — top-down commercial jet, white with cyan glow */}
         <svg
  xmlns="http://www.w3.org/2000/svg"
  width="54"
  height="54"
  viewBox="0 0 54 54"
>
  <g transform="translate(0,7) rotate(-60 27 27)">
  <path
    fill="#FFFFFF"
    d="M47.523 0.84C46.934 0.004 42.461 2.238 41.926 2.508C39.156 3.891 37.09 5.488 35.688 6.734C34.391 6.074 33.098 5.414 31.801 4.754C32.09 4.531 32.383 4.309 32.672 4.086C32.508 3.871 32.242 3.578 31.844 3.316C31.375 3.004 30.926 2.875 30.641 2.813C30.379 3.047 30.117 3.277 29.852 3.512C27.578 2.422 25.301 1.336 23.027 0.246C23.016 0.246 23.004 0.246 22.988 0.246C21.66 0.695 20.43 1.387 19.168 1.988C22.02 3.699 24.871 5.406 27.727 7.117L27.227 7.59C27.375 7.684 27.52 7.777 27.664 7.871C27.91 7.754 28.156 7.637 28.398 7.52C29.422 8.133 30.441 8.742 31.461 9.355L20.398 18.707C19.172 18.141 17.941 17.57 16.715 17.004C15.75 17.359 14.789 17.718 13.824 18.074L18.465 20.949C18.16 21.289 17.855 21.629 17.555 21.969C17.625 22.066 17.695 22.164 17.766 22.258C18.172 22.113 18.582 21.969 18.988 21.824C19.203 23.508 19.414 25.195 19.625 26.883C20.348 26.176 21.07 25.473 21.793 24.766C21.766 23.355 21.738 21.949 21.711 20.539L34.152 13.18L34.742 16.316L34.254 16.789L34.332 17.102C34.465 17.113 34.594 17.125 34.727 17.137C35.25 20.758 35.773 24.375 36.297 27.992C36.688 27.648 37 27.359 37.207 27.152C37.879 26.48 38.52 25.773 39.227 25.137C39.328 25.047 39.43 24.961 39.531 24.875C39.391 22.121 39.25 19.367 39.109 16.613C39.418 16.438 39.723 16.266 40.031 16.09C40.082 15.813 40.133 15.359 40.031 14.824C39.945 14.395 39.793 14.059 39.668 13.836C39.328 13.953 38.988 14.074 38.652 14.195C38.5 12.816 38.352 11.438 38.199 10.059C39.992 8.996 42.363 7.355 44.727 4.906C45.715 3.879 48 1.512 47.523 0.84Z"
  />
  </g>
</svg>

        </div>
      </div>

      {analysis && <AnalysisPanel analysis={analysis} origin={origin} destination={destination} />}
    </div>
  );
}

/* ================================
   APP ENTRY
================================ */
export default function App() {
  const params      = new URLSearchParams(window.location.search);
  const initOrigin  = params.get("origin")      || "CYOW";
  const initDest    = params.get("destination") || "CYYZ";
  const autoAnalyze = !!(params.get("origin") && params.get("destination"));

  const [origin,      setOrigin]      = useState(initOrigin);
  const [destination, setDestination] = useState(initDest);

  return (
    <GlobeFlight
      origin={origin}
      destination={destination}
      onOriginChange={setOrigin}
      onDestinationChange={setDestination}
      autoAnalyze={autoAnalyze}
    />
  );
}