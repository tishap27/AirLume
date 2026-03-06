import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

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
        // So NDC→pixel: px = (ndcX*0.5+0.5)*W,  py = (-ndcY*0.5+0.5)*H
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

    spinRef.current   = false;
    earth.rotation.y  = Math.PI;

    const startPt     = latLonToVec3(oLat, oLon);
    const endPt       = latLonToVec3(dLat, dLon);
    const curvePoints = createGreatCircle(startPt, endPt);

    flyToRoute(startPt, endPt);

    /* Gradient route arc */
    const flatPts   = [];
    const arcColors = [];
    for (let i = 0; i < curvePoints.length - 1; i++) {
      const t = i / (curvePoints.length - 1);
      let r, g, b;
      if (t < 0.5) {
        const f = t * 2; r = Math.round(f * 255); g = Math.round(230 - f * 16); b = Math.round(118 - f * 118);
      } else {
        const f = (t - 0.5) * 2; r = 255; g = Math.round(214 - f * 214); b = 0;
      }
      const col = new THREE.Color(r/255, g/255, b/255);
      const a = curvePoints[i], bb2 = curvePoints[i+1];
      flatPts.push(a.x,a.y,a.z, bb2.x,bb2.y,bb2.z);
      arcColors.push(col.r,col.g,col.b, col.r,col.g,col.b);
    }

    // Gradient
    const gradGeo = new THREE.BufferGeometry();
    gradGeo.setAttribute("position", new THREE.Float32BufferAttribute(flatPts, 3));
    gradGeo.setAttribute("color",    new THREE.Float32BufferAttribute(arcColors, 3));
    overlay.add(new THREE.LineSegments(gradGeo,
      new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95 })
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

      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.038, 14, 14),
        new THREE.MeshBasicMaterial({ color: col })
      );
      dot.position.copy(pos);
      overlay.add(dot);


      const CW = 320, CH = 80;
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
        .add(outward.clone().multiplyScalar(poleH + 0.22))
        .add(sideDir.clone().multiplyScalar(isOrigin ? 0.20 : -0.20));
      lSprite.position.copy(labelPos);
      lSprite.scale.set(0.28, 0.075, 1);
      overlay.add(lSprite);
    };

    makeAirportPin(startPt, 0x00e676, oCode || "ORIG", true);
    makeAirportPin(endPt,   0xff4444, dCode || "DEST", false);

    /* Activate plane HTML overlay */
    if (planeElRef.current) planeElRef.current.style.display = "block";
    planeRouteRef.current = { points: curvePoints, progress: 0 };


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
    }}>
      {/* Header row: logo left + title center */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, minHeight: 60 }}>
        <img
          src="textures/logo.png"
          alt="AirLume logo"
          style={{ position: "absolute", left: 0, height: 52, width: "auto", objectFit: "contain" }}
        />
        <h1 style={{
          textAlign: "center", fontSize: "2rem", fontWeight: 700,
          letterSpacing: "0.04em", margin: 0,
          background: "linear-gradient(90deg, #00e0ff, #ffffff, #00e0ff)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          ✈ AirLume Route Analyzer
        </h1>
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
          filter:         "drop-shadow(0 0 6px rgba(0,210,255,0.9))",
          zIndex:         10,
        }}>
          {/* SVG plane — top-down commercial jet, white with cyan glow */}
          <svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            {/* Fuselage */}
            <ellipse cx="50" cy="50" rx="7" ry="38" fill="#ffffff"/>
            {/* Nose */}
            <polygon points="50,5 44,28 56,28" fill="#f0f0f0"/>
            {/* Main wings */}
            <polygon points="50,38 8,62 14,70 50,52 86,70 92,62" fill="#e8f0ff"/>
            {/* Engine L */}
            <ellipse cx="20" cy="60" rx="7" ry="12" fill="#cccccc"/>
            <ellipse cx="20" cy="51" rx="7" ry="5" fill="#555555"/>
            {/* Engine R */}
            <ellipse cx="80" cy="60" rx="7" ry="12" fill="#cccccc"/>
            <ellipse cx="80" cy="51" rx="7" ry="5" fill="#555555"/>
            {/* H-stabilizers */}
            <polygon points="50,75 28,88 32,94 50,82 68,94 72,88" fill="#e0e8ff"/>
            {/* Cockpit */}
            <ellipse cx="50" cy="22" rx="5" ry="9" fill="#1a4fa0" opacity="0.9"/>
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