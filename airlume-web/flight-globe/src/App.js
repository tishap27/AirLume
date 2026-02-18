import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const API_URL = "http://localhost:8080/airlume-web/resources/analysis";
const EARTH_RADIUS = 5;

/* ================================
   UTILITIES
================================ */

const latLonToVec3 = (lat, lon, radius = EARTH_RADIUS) => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
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

const createGreatCircle = (start, end, segments = 160) => {
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const v = new THREE.Vector3()
      .copy(start)
      .lerp(end, t)
      .normalize()
      .multiplyScalar(EARTH_RADIUS + 0.08);
    points.push(v);
  }
  return points;
};

/* ================================
   COMPONENT
================================ */

function GlobeFlight({ origin, destination, onOriginChange, onDestinationChange }) {
  const mountRef = useRef(null);
  const sceneRef = useRef();
  const cameraRef = useRef();
  const rendererRef = useRef();
  const controlsRef = useRef();
  const earthRef = useRef();
  const animationRef = useRef();
  const planeAnimRef = useRef();

  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  /* ================================
     INITIALIZE SCENE
  ================================ */

  useEffect(() => {
    const mount = mountRef.current;
    const width = mount.clientWidth;
    const height = 600;

    /* Scene */
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000814);
    sceneRef.current = scene;

    /* Camera */
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 4, 14);
    cameraRef.current = camera;

    /* Renderer */
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;
    mount.appendChild(renderer.domElement);

    /* Controls */
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 8;
    controls.maxDistance = 40;
    controlsRef.current = controls;

    /* Lighting — key fix: strong ambient so texture is always visible */
    const ambient = new THREE.AmbientLight(0xffffff, 2.5);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfff4e0, 2.0);
    sun.position.set(10, 5, 10);
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0x8ab4f8, 0.6);
    fill.position.set(-10, -5, -5);
    scene.add(fill);

    /* Stars */
    const starGeo = new THREE.BufferGeometry();
    const starCount = 6000;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) {
      starPositions[i] = (Math.random() - 0.5) * 400;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.18, sizeAttenuation: true });
    scene.add(new THREE.Points(starGeo, starMat));

    /* Earth — create mesh first, then assign texture in callback */
    const earthGeo = new THREE.SphereGeometry(EARTH_RADIUS, 128, 128);
    const earthMat = new THREE.MeshStandardMaterial({
      roughness: 0.55,
      metalness: 0.0,
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earth);
    earthRef.current = earth;

    /* Load texture asynchronously and apply when ready */
    const loader = new THREE.TextureLoader();
    loader.load(
      "/textures/earth1.jpeg",
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        earthMat.map = texture;
        earthMat.needsUpdate = true;
      },
      undefined,
      (err) => {
        console.error("Failed to load earth texture:", err);
        /* Fallback: blue/green procedural color so globe is still visible */
        earthMat.color = new THREE.Color(0x1a6b4a);
        earthMat.needsUpdate = true;
      }
    );

    /* Atmosphere glow */
    const atmGeo = new THREE.SphereGeometry(EARTH_RADIUS + 0.18, 64, 64);
    const atmMat = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.12,
      side: THREE.FrontSide,
    });
    scene.add(new THREE.Mesh(atmGeo, atmMat));

    /* Outer glow ring */
    const glowGeo = new THREE.SphereGeometry(EARTH_RADIUS + 0.45, 64, 64);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x2255cc,
      transparent: true,
      opacity: 0.04,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(glowGeo, glowMat));

    /* Animation loop */
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      earth.rotation.y += 0.0006;
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    /* Resize */
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
      cancelAnimationFrame(animationRef.current);
      if (planeAnimRef.current) cancelAnimationFrame(planeAnimRef.current);
      renderer.dispose();
      if (mount && renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  /* ================================
     FETCH ANALYSIS
  ================================ */

  const handleSubmit = () => {
    if (!origin || !destination) {
      setError("Enter both ICAO codes");
      return;
    }
    setLoading(true);
    setError(null);

    fetch(`${API_URL}?origin=${origin}&destination=${destination}`)
      .then((res) => {
        if (!res.ok) throw new Error("Server error");
        return res.json();
      })
      .then((data) => {
        if (!data.waypoints) throw new Error("Invalid route data");
        setAnalysis(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  /* ================================
     DRAW ROUTE
  ================================ */

  useEffect(() => {
    if (!analysis || !sceneRef.current) return;

    const scene = sceneRef.current;
    const earth = earthRef.current;

    /* Remove old flight elements */
    const toRemove = scene.children.filter((c) => c.userData.flight);
    toRemove.forEach((obj) => scene.remove(obj));

    /* Cancel previous plane animation */
    if (planeAnimRef.current) cancelAnimationFrame(planeAnimRef.current);

    const waypoints = analysis.waypoints.filter((w) => w.latitude && w.longitude);
    if (waypoints.length < 2) return;

    const startPt = latLonToVec3(waypoints[0].latitude, waypoints[0].longitude);
    const endPt = latLonToVec3(
      waypoints[waypoints.length - 1].latitude,
      waypoints[waypoints.length - 1].longitude
    );

    const curvePoints = createGreatCircle(startPt, endPt);

    /* Route line — glowing cyan */
    const routeGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
    const routeMat = new THREE.LineBasicMaterial({ color: 0x00e0ff, linewidth: 2 });
    const line = new THREE.Line(routeGeo, routeMat);
    line.userData.flight = true;
    scene.add(line);

    /* Origin & destination markers */
    [startPt, endPt].forEach((pos, i) => {
      const markerGeo = new THREE.SphereGeometry(0.1, 16, 16);
      const markerMat = new THREE.MeshBasicMaterial({
        color: i === 0 ? 0x00ff88 : 0xff4444,
      });
      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.position.copy(pos);
      marker.userData.flight = true;
      scene.add(marker);

      /* Pulse ring */
      const ringGeo = new THREE.RingGeometry(0.12, 0.18, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: i === 0 ? 0x00ff88 : 0xff4444,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(pos);
      ring.lookAt(new THREE.Vector3(0, 0, 0));
      ring.userData.flight = true;
      scene.add(ring);
    });

    /* Aircraft (cone) — travels along the route */
    const planeGeo = new THREE.ConeGeometry(0.1, 0.28, 16);
    const planeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.userData.flight = true;
    scene.add(plane);

    /* Trail — short segment behind plane */
    const trailMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
    });

    let progress = 0;
    const TRAIL_LEN = 20;

    const animatePlane = () => {
      planeAnimRef.current = requestAnimationFrame(animatePlane);
      progress += 0.0012;
      if (progress > 1) progress = 0;

      const idx = Math.floor(progress * (curvePoints.length - 1));
      const current = curvePoints[idx];
      const next = curvePoints[Math.min(idx + 1, curvePoints.length - 1)];

      /* Position — offset from earth surface by earth's current rotation */
      const rotated = current.clone().applyEuler(earth.rotation);
      plane.position.copy(rotated);

      /* Orient cone toward direction of travel */
      const dir = new THREE.Vector3().subVectors(next, current).normalize();
      const rotatedDir = dir.clone().applyEuler(earth.rotation);
      plane.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), rotatedDir);

      /* Update trail */
      const trailStart = Math.max(0, idx - TRAIL_LEN);
      const trailPts = curvePoints
        .slice(trailStart, idx + 1)
        .map((p) => p.clone().applyEuler(earth.rotation));

      /* Remove old trail */
      const oldTrail = scene.getObjectByName("planeTrail");
      if (oldTrail) scene.remove(oldTrail);

      if (trailPts.length > 1) {
        const trailGeo = new THREE.BufferGeometry().setFromPoints(trailPts);
        const trail = new THREE.Line(trailGeo, trailMat);
        trail.name = "planeTrail";
        trail.userData.flight = true;
        scene.add(trail);
      }
    };
    animatePlane();

    /* Waypoint risk markers */
    if (analysis.waypoints) {
      analysis.waypoints.forEach((wp) => {
        if (!wp.latitude || !wp.longitude) return;
        const pos = latLonToVec3(wp.latitude, wp.longitude);
        const rotated = pos.clone().applyEuler(earthRef.current.rotation);

        const dotGeo = new THREE.SphereGeometry(0.06, 8, 8);
        const dotMat = new THREE.MeshBasicMaterial({ color: riskColor(wp.risk) });
        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.position.copy(rotated);
        dot.userData.flight = true;
        scene.add(dot);
      });
    }
  }, [analysis]);

  /* ================================
     UI
  ================================ */

  return (
    <div
      style={{
        padding: "30px 24px",
        color: "white",
        background: "linear-gradient(160deg, #000d1a 0%, #001a2e 50%, #000814 100%)",
        minHeight: "100vh",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <h1
        style={{
          textAlign: "center",
          fontSize: "2rem",
          fontWeight: 700,
          letterSpacing: "0.04em",
          marginBottom: 24,
          background: "linear-gradient(90deg, #00e0ff, #ffffff, #00e0ff)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        ✈ AirLume Global Route Analyzer
      </h1>

      {/* Controls */}
      <div style={{ marginBottom: 20, textAlign: "center", display: "flex", justifyContent: "center", gap: 10 }}>
        <input
          value={origin}
          onChange={(e) => onOriginChange(e.target.value.toUpperCase())}
          placeholder="Origin ICAO"
          maxLength={4}
          style={{
            padding: "10px 16px",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(0,224,255,0.3)",
            borderRadius: 8,
            color: "white",
            fontSize: "1rem",
            outline: "none",
            width: 140,
          }}
        />
        <input
          value={destination}
          onChange={(e) => onDestinationChange(e.target.value.toUpperCase())}
          placeholder="Destination ICAO"
          maxLength={4}
          style={{
            padding: "10px 16px",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(0,224,255,0.3)",
            borderRadius: 8,
            color: "white",
            fontSize: "1rem",
            outline: "none",
            width: 140,
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            padding: "10px 24px",
            background: loading ? "rgba(0,224,255,0.2)" : "rgba(0,224,255,0.15)",
            border: "1px solid rgba(0,224,255,0.6)",
            borderRadius: 8,
            color: "#00e0ff",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "all 0.2s",
          }}
        >
          {loading ? "Analyzing..." : "Analyze Route"}
        </button>
      </div>

      {error && (
        <div style={{ color: "#ff6b6b", textAlign: "center", marginBottom: 12 }}>
          ⚠ {error}
        </div>
      )}

      {/* Globe */}
      <div
        ref={mountRef}
        style={{
          width: "100%",
          height: 600,
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 0 80px rgba(0,100,255,0.15), 0 30px 60px rgba(0,0,0,0.6)",
          border: "1px solid rgba(0,224,255,0.1)",
        }}
      />

      {/* Analysis Panel */}
      {analysis && (
        <div
          style={{
            marginTop: 24,
            padding: "20px 24px",
            background: "rgba(0,224,255,0.05)",
            border: "1px solid rgba(0,224,255,0.15)",
            borderRadius: 16,
          }}
        >
          <h2 style={{ margin: "0 0 12px", color: "#00e0ff", fontSize: "1.1rem" }}>
            Route Analysis — {origin} → {destination}
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {analysis.waypoints?.map((wp, i) => (
              <div
                key={i}
                style={{
                  padding: "8px 14px",
                  background: "rgba(255,255,255,0.05)",
                  border: `1px solid ${wp.risk ? "#" + riskColor(wp.risk).toString(16).padStart(6, "0") : "rgba(255,255,255,0.1)"}`,
                  borderRadius: 8,
                  fontSize: "0.82rem",
                  color: "#ccc",
                }}
              >
                <strong style={{ color: "white" }}>{wp.name || `WP${i + 1}`}</strong>
                {wp.risk && (
                  <span
                    style={{
                      marginLeft: 8,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: "#" + riskColor(wp.risk).toString(16).padStart(6, "0") + "33",
                      color: "#" + riskColor(wp.risk).toString(16).padStart(6, "0"),
                      fontSize: "0.75rem",
                      fontWeight: 700,
                    }}
                  >
                    {wp.risk}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================
   APP WRAPPER
================================ */

export default function App() {
  const [origin, setOrigin] = useState("CYOW");
  const [destination, setDestination] = useState("CYYZ");

  return (
    <GlobeFlight
      origin={origin}
      destination={destination}
      onOriginChange={setOrigin}
      onDestinationChange={setDestination}
    />
  );
}