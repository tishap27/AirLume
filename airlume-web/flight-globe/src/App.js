import React, { useRef, useEffect } from "react";
import * as THREE from "three";

// Map of Canadian airports (add or fetch more as needed)
const airports = {
  CYOW: { lat: 45.3225, lon: -75.6692 },
  CYYZ: { lat: 43.6777, lon: -79.6248 }
};

// Convert lat/lon to spherical coordinates on globe radius
const latLonToVec3 = (lat, lon, radius = 5) => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
     radius * Math.cos(phi),
     radius * Math.sin(phi) * Math.sin(theta)
  );
};

function GlobeFlight({ origin, destination }) {
  const mountRef = useRef(null);

  useEffect(() => {
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

    // Draw flight arc path if airports are valid
    const o = airports[origin], d = airports[destination];
    if (o && d) {
      const v1 = latLonToVec3(o.lat, o.lon);
      const v2 = latLonToVec3(d.lat, d.lon);
      const arcPoints = [];
      for (let i = 0; i <= 100; ++i) {
        const t = i / 100;
        const vec = new THREE.Vector3().lerpVectors(v1, v2, t).normalize().multiplyScalar(5.02);
        arcPoints.push(vec);
      }
      const curve = new THREE.CatmullRomCurve3(arcPoints);
      const curveGeom = new THREE.TubeGeometry(curve, 100, 0.06, 8, false);
      const curveMat = new THREE.MeshBasicMaterial({ color: 0xffcc44 });
      scene.add(new THREE.Mesh(curveGeom, curveMat));

      const markerGeom = new THREE.SphereGeometry(0.12, 24, 24);
      const markerMat = new THREE.MeshBasicMaterial({ color: 0x00ff44 });
      const marker1 = new THREE.Mesh(markerGeom, markerMat);
      const marker2 = new THREE.Mesh(markerGeom, markerMat);
      marker1.position.copy(v1);
      marker2.position.copy(v2);
      scene.add(marker1, marker2);
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
        mountRef.current.removeChild(renderer.domElement); // Safe null-check added here
      }
    };
  }, [origin, destination]);

  return <div ref={mountRef}></div>;
}

export default function App() {
  const [origin, setOrigin] = React.useState("CYOW");
  const [destination, setDestination] = React.useState("CYYZ");

  return (
    <div style={{ background: "#111", color: "#fff", minHeight: "100vh", padding: 32 }}>
      <h1>Canadian Flight Path Globe</h1>
      <p>Dynamic Great Circle Route Visualization</p>
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
