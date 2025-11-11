import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";

const API_URL = "http://localhost:8080/airlume-web/resources/analysis";

const latLonToVec3 = (lat, lon, radius = 5) => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
     radius * Math.cos(phi),
     radius * Math.sin(phi) * Math.sin(theta)
  );
};

// Get colors for risk levels
const riskColor = (risk) => {
  switch ((risk || "").toUpperCase()) {
    case "MODERATE": return "#f39c12";
    case "HIGH": return "#e67e22";
    case "CRITICAL": return "#e74c3c";
    default: return "#27ae60";
  }
};

function GlobeFlight({ origin, destination }) {
  const mountRef = useRef(null);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);

useEffect(() => {
  setError(null);
  setAnalysis(null);
  
  console.log(`Fetching: ${API_URL}?origin=${origin}&destination=${destination}`);
  
  fetch(`${API_URL}?origin=${origin}&destination=${destination}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  })
    .then(response => {
      console.log('Response status:', response.status);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('Received data:', data);
      if (data.error) {
        setError(data.error);
      } else if (!data.origin || !data.destination) {
        setError('Invalid response: missing route data');
      } else {
        setAnalysis(data);
      }
    })
    .catch(err => {
      console.error('Fetch error:', err);
      setError(`Connection failed: ${err.message}`);
    });
}, [origin, destination]);

  useEffect(() => {
    if (!analysis) return;
    const width = 600, height = 500;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 16);
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);

    const light = new THREE.AmbientLight(0xffffff, 1.1);
    scene.add(light);

    const geometry = new THREE.SphereGeometry(5, 64, 64);
    const texture = new THREE.TextureLoader().load("https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg");
    const material = new THREE.MeshPhongMaterial({ map: texture });
    const earth = new THREE.Mesh(geometry, material);
    scene.add(earth);

    // Draw great circle path connecting waypoints
    if (analysis.waypoints && analysis.waypoints.length > 0) {
  // Filter out invalid waypoints (lat/lon = 0)
  const validWaypoints = analysis.waypoints.filter(wp => 
    wp.latitude !== 0 && wp.longitude !== 0
  );
  
  if (validWaypoints.length === 0) {
    console.warn('No valid waypoint coordinates found');
    return;
  }
  
  const arcPoints = validWaypoints.map(wp =>
    latLonToVec3(wp.latitude, wp.longitude)
  );
      const curve = new THREE.CatmullRomCurve3(arcPoints);
      const curveGeom = new THREE.TubeGeometry(curve, 100, 0.06, 8, false);
      const curveMat = new THREE.MeshBasicMaterial({ color: "#08f" });
      scene.add(new THREE.Mesh(curveGeom, curveMat));

      // Waypoint spheres and color by risk
      analysis.waypoints.forEach((wp, i) => {
        const vec = latLonToVec3(wp.latitude, wp.longitude, 5.03);
        const markerGeom = new THREE.SphereGeometry(0.12, 24, 24);
        const markerMat = new THREE.MeshBasicMaterial({ color: riskColor(wp.riskLevel) });
        const marker = new THREE.Mesh(markerGeom, markerMat);
        marker.position.copy(vec);
        scene.add(marker);
      });
    }

    let frameId;
    const animate = () => {
      earth.rotation.y += 0.002;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      renderer.dispose();
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [analysis]);

  return (
    <div>
      {error && <div style={{color:"red"}}>Error: {error}</div>}
      {!analysis && !error && <div>Loading route & risk data...</div>}
      <div ref={mountRef}></div>
      {analysis && (
        <div style={{marginTop:16}}>
          <b>{analysis.origin} → {analysis.destination}</b><br />
          <span>Total Distance: <b>{analysis.totalDistance} km</b></span> | 
          <span> {analysis.waypointCount} Waypoints</span><br />
          <span>Max Risk: <b>{analysis.lightningProbability}%</b> | Avg Risk: <b>{analysis.averageRisk}%</b></span><br />
          <span>Recommendation: <b>{analysis.recommendation}</b></span>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [origin, setOrigin] = React.useState("CYOW");
  const [destination, setDestination] = React.useState("CYYZ");

  return (
    <div style={{ background: "#111", color: "#fff", minHeight: "100vh", padding: 32 }}>
      <h1>Canadian Flight Path Globe</h1>
      <p>Dynamic Lightning Risk Visualization</p>
      <label>
        Origin ICAO:{" "}
        <input value={origin} onChange={e => setOrigin(e.target.value.toUpperCase())} />
      </label>
      <label style={{ marginLeft: 12 }}>
        Destination ICAO:{" "}
        <input value={destination} onChange={e => setDestination(e.target.value.toUpperCase())} />
      </label>
      <GlobeFlight origin={origin} destination={destination} />
    </div>
  );
}
