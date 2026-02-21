import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const API_URL = "http://localhost:8080/airlume-web/resources/analysis";
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

/**
 * Standard spherical → cartesian.
 * lon=0 → +X axis, increases eastward.
 * This is the "textbook" mapping that matches a standard
 * equirectangular texture (lon 0 at center → seam at ±180).
 * THREE's SphereGeometry UV maps lon 0 (texture center-left)
 * to the +X side, so we just use the simple formula here
 * and let the earth mesh rotation handle orientation.
 */
const latLonToVec3 = (lat, lon, r = EARTH_RADIUS) => {
  // Matches Three.js SphereGeometry exactly: x=-sin(phi)*cos(theta), y=cos(phi), z=sin(phi)*sin(theta)
  // With earthGroup.rotation.y = Math.PI, the NASA Blue Marble texture (lon0 at left edge) aligns perfectly
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
   COMPONENT
================================ */

function GlobeFlight({ origin, destination, onOriginChange, onDestinationChange }) {
  const mountRef     = useRef(null);
  const sceneRef     = useRef();
  const cameraRef    = useRef();
  const rendererRef  = useRef();
  const controlsRef  = useRef();
  const earthRef     = useRef();       // the earth GROUP (spins)
  const overlayRef   = useRef();       // static group — markers live here, never spins
  const animRef      = useRef();
  const planeAnimRef = useRef();
  const spinRef      = useRef(true);
  const flyRef       = useRef(null);

  const [analysis, setAnalysis] = useState(null);
  const [error,    setError]    = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [hasRoute, setHasRoute] = useState(false);

  /* ================================
     INIT SCENE
  ================================ */
  useEffect(() => {
    const mount  = mountRef.current;
    const width  = mount.clientWidth;
    const height = 600;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000814);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 14);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace    = THREE.SRGBColorSpace;
    renderer.toneMapping         = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance   = 7;
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

    /* Earth GROUP — only this spins */
    const earthGroup = new THREE.Group();
    earthGroup.rotation.y = Math.PI; // NASA Blue Marble: lon=0 is at texture LEFT edge, not center
    scene.add(earthGroup);
    earthRef.current = earthGroup;

    const earthMesh = new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_RADIUS, 128, 128),
      new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0 })
    );
    earthGroup.add(earthMesh);

    new THREE.TextureLoader().load(
      "/textures/earth1.jpeg",
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        earthMesh.material.map = tex;
        earthMesh.material.needsUpdate = true;
      },
      undefined,
      () => { earthMesh.material.color.set(0x1a6b4a); earthMesh.material.needsUpdate = true; }
    );

    /* Atmosphere (part of earthGroup so it doesn't matter, it's symmetric) */
    earthGroup.add(new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_RADIUS + 0.18, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.12 })
    ));
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_RADIUS + 0.45, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x2255cc, transparent: true, opacity: 0.04, side: THREE.BackSide })
    ));

    /* OVERLAY GROUP — NEVER rotates. Markers and routes go here. */
    const overlay = new THREE.Group();
    scene.add(overlay);
    overlayRef.current = overlay;

    /* Main loop */
    const animate = () => {
      animRef.current = requestAnimationFrame(animate);
      if (spinRef.current) earthGroup.rotation.y += 0.0006;

      const fly = flyRef.current;
      if (fly) {
        const t = Math.min((Date.now() - fly.startTime) / fly.duration, 1);
        const e = smoothstep(t);
        camera.position.lerpVectors(fly.fromPos,    fly.toPos,    e);
        controls.target.lerpVectors(fly.fromTarget, fly.toTarget, e);
        if (t >= 1) flyRef.current = null;
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

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
      if (planeAnimRef.current) cancelAnimationFrame(planeAnimRef.current);
      renderer.dispose();
      if (mount?.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  /* ================================
     CAMERA FLY-TO
     startVec / endVec are in world
     space (from latLonToVec3, no rotation applied)
  ================================ */
  const flyToRoute = (startVec, endVec) => {
    const camera   = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const mid = new THREE.Vector3()
      .copy(startVec).lerp(endVec, 0.5)
      .normalize()
      .multiplyScalar(EARTH_RADIUS * 0.6);

    const angDist  = startVec.angleTo(endVec);
    const zoomDist = THREE.MathUtils.clamp(
      EARTH_RADIUS + 0.8 + (angDist / Math.PI) * 7,
      EARTH_RADIUS + 2, 20
    );

    const camPos = mid.clone().normalize().multiplyScalar(zoomDist);

    flyRef.current = {
      fromPos:    camera.position.clone(),
      toPos:      camPos,
      fromTarget: controls.target.clone(),
      toTarget:   mid.clone(),
      startTime:  Date.now(),
      duration:   1800,
    };
  };

  /* ================================
     DRAW ROUTE
     All objects go into overlayRef (never rotates).
     Because latLonToVec3 puts points in a coordinate
     system where lon=0→+X, and THREE's SphereGeometry
     also maps lon=0→+X (before any group rotation),
     the overlay coords exactly match the earth surface
     at rotation.y = 0, which is where we lock the earth.
  ================================ */
  const drawRoute = (oLat, oLon, dLat, dLon, waypointData) => {
    const overlay = overlayRef.current;
    const earth   = earthRef.current;
    if (!overlay || !earth) return;

    /* Cancel old plane anim */
    if (planeAnimRef.current) cancelAnimationFrame(planeAnimRef.current);

    /* Clear overlay */
    while (overlay.children.length) overlay.remove(overlay.children[0]);

    /* Stop earth spinning and snap its rotation to 0
       so the texture's lon=0 lines up with our coord system */
    spinRef.current = false;
    earth.rotation.y = Math.PI; // lock to texture-corrected orientation

    const startPt     = latLonToVec3(oLat, oLon);
    const endPt       = latLonToVec3(dLat, dLon);
    const curvePoints = createGreatCircle(startPt, endPt);

    /* Fly camera to face the route */
    flyToRoute(startPt, endPt);

    /* Route arc */
    const routeLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(curvePoints),
      new THREE.LineBasicMaterial({ color: 0x00e0ff })
    );
    overlay.add(routeLine);

    /* Airport markers */
    [[startPt, 0x00ff88], [endPt, 0xff4444]].forEach(([pos, col]) => {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 16, 16),
        new THREE.MeshBasicMaterial({ color: col })
      );
      dot.position.copy(pos);
      overlay.add(dot);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.15, 0.24, 32),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
      );
      ring.position.copy(pos);
      ring.lookAt(new THREE.Vector3(0, 0, 0));
      overlay.add(ring);
    });

    /* Animated plane */
    const plane = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.28, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    overlay.add(plane);

    const trailMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 });
    let progress = 0;

    const animatePlane = () => {
      planeAnimRef.current = requestAnimationFrame(animatePlane);
      progress += 0.0009;
      if (progress > 1) progress = 0;

      const idx  = Math.floor(progress * (curvePoints.length - 1));
      const cur  = curvePoints[idx];
      const next = curvePoints[Math.min(idx + 1, curvePoints.length - 1)];

      plane.position.copy(cur);
      plane.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3().subVectors(next, cur).normalize()
      );

      /* Trail */
      const oldTrail = overlay.getObjectByName("trail");
      if (oldTrail) overlay.remove(oldTrail);
      const tPts = curvePoints.slice(Math.max(0, idx - 30), idx + 1);
      if (tPts.length > 1) {
        const trail = new THREE.Line(new THREE.BufferGeometry().setFromPoints(tPts), trailMat);
        trail.name = "trail";
        overlay.add(trail);
      }
    };
    animatePlane();

    /* Waypoint risk dots */
    if (waypointData) {
      waypointData.forEach(wp => {
        if (!wp.latitude || !wp.longitude) return;
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.07, 8, 8),
          new THREE.MeshBasicMaterial({ color: riskColor(wp.risk) })
        );
        dot.position.copy(latLonToVec3(wp.latitude, wp.longitude));
        overlay.add(dot);
      });
    }
  };

  /* ================================
     ANALYZE
  ================================ */
  const handleSubmit = () => {
    if (!origin || !destination) { setError("Enter both ICAO codes"); return; }
    setError(null);

    const oInfo = AIRPORTS[origin];
    const dInfo = AIRPORTS[destination];
    if (oInfo && dInfo) {
      drawRoute(oInfo.lat, oInfo.lon, dInfo.lat, dInfo.lon, null);
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
                    wps[wps.length - 1].latitude, wps[wps.length - 1].longitude,
                    data.waypoints);
        } else if (oInfo && dInfo) {
          drawRoute(oInfo.lat, oInfo.lon, dInfo.lat, dInfo.lon, data.waypoints);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  const handleReset = () => {
    spinRef.current = true;
    if (earthRef.current) earthRef.current.rotation.y = Math.PI;
    setAnalysis(null);
    setHasRoute(false);
    setError(null);
    if (planeAnimRef.current) cancelAnimationFrame(planeAnimRef.current);
    const overlay = overlayRef.current;
    if (overlay) while (overlay.children.length) overlay.remove(overlay.children[0]);

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
     UI
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
      <img 
        src="/textures/logo.png" 
        alt="AirLume" 
        style={{ height: 60, width: "auto" }}
       
      />
      <h1 style={{
        textAlign: "center", fontSize: "2rem", fontWeight: 700,
        letterSpacing: "0.04em", marginBottom: 24,
        background: "linear-gradient(90deg, #00e0ff, #ffffff, #00e0ff)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
      }}>
       
        ✈ AirLume Route Analyzer
      </h1>

      <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <input value={origin} onChange={e => onOriginChange(e.target.value.toUpperCase())}
          placeholder="Origin ICAO" maxLength={4} style={inputStyle} />
        <input value={destination} onChange={e => onDestinationChange(e.target.value.toUpperCase())}
          placeholder="Destination ICAO" maxLength={4} style={inputStyle} />
        <button onClick={handleSubmit} disabled={loading} style={{
          padding: "10px 26px", background: "rgba(0,224,255,0.15)",
          border: "1px solid rgba(0,224,255,0.6)", borderRadius: 8,
          color: "#00e0ff", fontSize: "1rem", fontWeight: 600,
          cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, transition: "all 0.2s",
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

      <div ref={mountRef} style={{
        width: "100%", height: 600, borderRadius: 20, overflow: "hidden",
        boxShadow: "0 0 80px rgba(0,100,255,0.15), 0 30px 60px rgba(0,0,0,0.6)",
        border: "1px solid rgba(0,224,255,0.1)",
      }} />

      {analysis && (
        <div style={{
          marginTop: 24, padding: "20px 24px",
          background: "rgba(0,224,255,0.05)",
          border: "1px solid rgba(0,224,255,0.15)", borderRadius: 16,
        }}>
          <h2 style={{ margin: "0 0 12px", color: "#00e0ff", fontSize: "1.1rem" }}>
            Route Analysis — {origin} → {destination}
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {analysis.waypoints?.map((wp, i) => (
              <div key={i} style={{
                padding: "8px 14px", background: "rgba(255,255,255,0.05)",
                border: `1px solid ${wp.risk ? "#" + riskColor(wp.risk).toString(16).padStart(6,"0") : "rgba(255,255,255,0.1)"}`,
                borderRadius: 8, fontSize: "0.82rem", color: "#ccc",
              }}>
                <strong style={{ color: "white" }}>{wp.name || `WP${i + 1}`}</strong>
                {wp.risk && (
                  <span style={{
                    marginLeft: 8, padding: "2px 6px", borderRadius: 4,
                    background: "#" + riskColor(wp.risk).toString(16).padStart(6,"0") + "33",
                    color:      "#" + riskColor(wp.risk).toString(16).padStart(6,"0"),
                    fontSize: "0.75rem", fontWeight: 700,
                  }}>{wp.risk}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  // Read ICAO codes from URL params (passed by JSF redirect)
  // e.g. http://localhost:3000?origin=CYOW&destination=CYYZ
  const params   = new URLSearchParams(window.location.search);
  const initOrigin = params.get("origin")      || "CYOW";
  const initDest   = params.get("destination") || "CYYZ";
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