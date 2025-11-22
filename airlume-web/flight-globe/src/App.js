import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

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

// Enhanced color scheme
const riskColor = (risk) => {
  switch ((risk || "").toUpperCase()) {
    case "CRITICAL": return "#ff4444";
    case "HIGH": return "#ffaa00";
    case "MODERATE": return "#ffdd00";
    case "LOW": return "#44ff44";
    default: return "#888888";
  }
};

// Improved curved path creation
const createGreatCirclePath = (start, end, segments = 50) => {
  const points = [];
  
  // Convert to spherical coordinates
  const startSpherical = new THREE.Spherical().setFromVector3(start);
  const endSpherical = new THREE.Spherical().setFromVector3(end);
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    
    // Interpolate spherical coordinates
    const phi = startSpherical.phi * (1 - t) + endSpherical.phi * t;
    const theta = startSpherical.theta * (1 - t) + endSpherical.theta * t;
    
    const point = new THREE.Vector3().setFromSphericalCoords(5.05, phi, theta);
    points.push(point);
  }
  
  return points;
};

function GlobeFlight({ origin, destination, onOriginChange, onDestinationChange }) {
  const mountRef = useRef(null);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);

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
    if (!mountRef.current) return;

    // Initialize Three.js scene
    const width = mountRef.current.clientWidth;
    const height = 600;
    
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x001122);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 12);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;

    // Clear previous renderer
    while (mountRef.current.firstChild) {
      mountRef.current.removeChild(mountRef.current.firstChild);
    }
    mountRef.current.appendChild(renderer.domElement);

    // Add orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
    controlsRef.current = controls;

    // Enhanced lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    scene.add(directionalLight);

    // Create earth with better texture
    const geometry = new THREE.SphereGeometry(5, 64, 64);
    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load("https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg");
    
    const material = new THREE.MeshPhongMaterial({
      map: earthTexture,
      specular: new THREE.Color(0x333333),
      shininess: 5
    });
    
    const earth = new THREE.Mesh(geometry, material);
    scene.add(earth);

    // Add atmospheric glow
    const atmosphereGeometry = new THREE.SphereGeometry(5.1, 64, 64);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.1
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphere);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      earth.rotation.y += 0.001;
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current) return;
      const newWidth = mountRef.current.clientWidth;
      const newHeight = 600;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (renderer) renderer.dispose();
      if (controls) controls.dispose();
    };
  }, []);

  useEffect(() => {
    if (!analysis || !sceneRef.current) return;

    const scene = sceneRef.current;
    
    // Clear previous flight paths and markers
    const objectsToRemove = [];
    scene.children.forEach(child => {
      if (child.userData.isFlightElement) {
        objectsToRemove.push(child);
      }
    });
    objectsToRemove.forEach(obj => scene.remove(obj));

    // Draw flight route with waypoints
    if (analysis.waypoints && analysis.waypoints.length > 1) {
      const validWaypoints = analysis.waypoints.filter(wp => 
        wp.latitude !== 0 && wp.longitude !== 0
      );

      if (validWaypoints.length > 1) {
        // Create points for the entire route
        const routePoints = [];
        
        for (let i = 0; i < validWaypoints.length; i++) {
          const point = latLonToVec3(
            validWaypoints[i].latitude, 
            validWaypoints[i].longitude, 
            5.05
          );
          routePoints.push(point);
        }

        // Create a smooth curve through all waypoints
        if (routePoints.length >= 2) {
          try {
            const curve = new THREE.CatmullRomCurve3(routePoints);
            curve.curveType = 'centripetal';
            curve.tension = 0.5;

            // Get points along the curve
            const curvePoints = curve.getPoints(100);
            
            // Create the flight path as a line instead of tube for better reliability
            const lineGeometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
            const lineMaterial = new THREE.LineBasicMaterial({
              color: 0x0088ff,
              linewidth: 3,
              transparent: true,
              opacity: 0.8
            });
            const flightPath = new THREE.Line(lineGeometry, lineMaterial);
            flightPath.userData.isFlightElement = true;
            scene.add(flightPath);

            // Add a thicker line for better visibility
            const thickLineGeometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
            const thickLineMaterial = new THREE.LineBasicMaterial({
              color: 0x00ffff,
              linewidth: 1,
              transparent: true,
              opacity: 0.3
            });
            const thickFlightPath = new THREE.Line(thickLineGeometry, thickLineMaterial);
            thickFlightPath.userData.isFlightElement = true;
            scene.add(thickFlightPath);

          } catch (error) {
            console.warn('Error creating curved path, using straight lines:', error);
            // Fallback: create straight lines between waypoints
            for (let i = 0; i < routePoints.length - 1; i++) {
              const lineGeometry = new THREE.BufferGeometry().setFromPoints([
                routePoints[i],
                routePoints[i + 1]
              ]);
              const lineMaterial = new THREE.LineBasicMaterial({
                color: 0x0088ff,
                linewidth: 2,
                transparent: true,
                opacity: 0.8
              });
              const line = new THREE.Line(lineGeometry, lineMaterial);
              line.userData.isFlightElement = true;
              scene.add(line);
            }
          }
        }

        // Add waypoint markers with risk colors
        validWaypoints.forEach((wp, index) => {
          const position = latLonToVec3(wp.latitude, wp.longitude, 5.08);
          
          // Risk sphere
          const sphereGeometry = new THREE.SphereGeometry(0.08, 16, 16);
          const sphereMaterial = new THREE.MeshBasicMaterial({
            color: riskColor(wp.riskLevel),
            emissive: riskColor(wp.riskLevel),
            emissiveIntensity: 0.5
          });
          const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
          sphere.position.copy(position);
          sphere.userData.isFlightElement = true;
          scene.add(sphere);

          // Pulsing glow effect for high risk points
          if (wp.riskLevel === "HIGH" || wp.riskLevel === "CRITICAL") {
            const glowGeometry = new THREE.SphereGeometry(0.15, 16, 16);
            const glowMaterial = new THREE.MeshBasicMaterial({
              color: riskColor(wp.riskLevel),
              transparent: true,
              opacity: 0.3
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            glow.position.copy(position);
            glow.userData.isFlightElement = true;
            scene.add(glow);

            // Animate glow
            const animateGlow = () => {
              const scale = 1 + 0.3 * Math.sin(Date.now() * 0.005);
              glow.scale.set(scale, scale, scale);
              requestAnimationFrame(animateGlow);
            };
            animateGlow();
          }

          // Connection lines to earth
          const earthPosition = latLonToVec3(wp.latitude, wp.longitude, 5.0);
          const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            earthPosition, position
          ]);
          const lineMaterial = new THREE.LineBasicMaterial({
            color: riskColor(wp.riskLevel),
            transparent: true,
            opacity: 0.4
          });
          const line = new THREE.Line(lineGeometry, lineMaterial);
          line.userData.isFlightElement = true;
          scene.add(line);
        });

        // Add start and end markers
        const startPos = latLonToVec3(
          validWaypoints[0].latitude, 
          validWaypoints[0].longitude, 
          5.1
        );
        const endPos = latLonToVec3(
          validWaypoints[validWaypoints.length - 1].latitude, 
          validWaypoints[validWaypoints.length - 1].longitude, 
          5.1
        );

        // Start marker (green)
        const startGeometry = new THREE.SphereGeometry(0.12, 16, 16);
        const startMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const startMarker = new THREE.Mesh(startGeometry, startMaterial);
        startMarker.position.copy(startPos);
        startMarker.userData.isFlightElement = true;
        scene.add(startMarker);

        // End marker (red)
        const endGeometry = new THREE.SphereGeometry(0.12, 16, 16);
        const endMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const endMarker = new THREE.Mesh(endGeometry, endMaterial);
        endMarker.position.copy(endPos);
        endMarker.userData.isFlightElement = true;
        scene.add(endMarker);
      }
    }
  }, [analysis]);

  return (
    <div style={{ background: "linear-gradient(135deg, #0c2461 0%, #1e3799 50%, #0a3d62 100%)", color: "#fff", minHeight: "100vh", padding: 32 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <h1 style={{ 
          fontSize: "2.5rem", 
          marginBottom: "0.5rem",
          background: "linear-gradient(45deg, #fff, #a0e7ff)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          textAlign: "center"
        }}>
          ✈️ Flight Path Globe Visualization
        </h1>
        <p style={{ 
          textAlign: "center", 
          marginBottom: "2rem",
          fontSize: "1.1rem",
          opacity: 0.8
        }}>
          Real-time 3D Lightning Risk Assessment
        </p>
        
        <div style={{ 
          background: "rgba(255,255,255,0.1)", 
          padding: "20px", 
          borderRadius: "15px",
          marginBottom: "2rem",
          backdropFilter: "blur(10px)"
        }}>
          <div style={{ display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <label style={{ display: "block", marginBottom: "5px", fontSize: "0.9rem", opacity: 0.8 }}>Origin ICAO:</label>
              <input 
                value={origin} 
                onChange={e => onOriginChange(e.target.value.toUpperCase())}
                style={{
                  padding: "10px 15px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.3)",
                  background: "rgba(0,0,0,0.3)",
                  color: "white",
                  fontSize: "1rem",
                  width: "120px"
                }}
                placeholder="e.g., CYOW"
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "5px", fontSize: "0.9rem", opacity: 0.8 }}>Destination ICAO:</label>
              <input 
                value={destination} 
                onChange={e => onDestinationChange(e.target.value.toUpperCase())}
                style={{
                  padding: "10px 15px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.3)",
                  background: "rgba(0,0,0,0.3)",
                  color: "white",
                  fontSize: "1rem",
                  width: "120px"
                }}
                placeholder="e.g., CYYZ"
              />
            </div>
            <div style={{ flex: 1, minWidth: "200px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontSize: "0.9rem", opacity: 0.8 }}>Instructions:</label>
              <div style={{ fontSize: "0.9rem", opacity: 0.7 }}>
                Drag to rotate • Scroll to zoom • Click waypoints for details
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div style={{
            background: "rgba(220, 53, 69, 0.2)",
            border: "1px solid rgba(220, 53, 69, 0.5)",
            padding: "15px",
            borderRadius: "10px",
            marginBottom: "20px",
            textAlign: "center"
          }}>
            ⚠️ Error: {error}
          </div>
        )}

        {!analysis && !error && (
          <div style={{
            background: "rgba(255,255,255,0.1)",
            padding: "40px",
            borderRadius: "15px",
            textAlign: "center",
            marginBottom: "20px"
          }}>
            <div style={{ fontSize: "3rem", marginBottom: "20px" }}>🌍</div>
            <h3>Loading Route & Risk Analysis...</h3>
            <p style={{ opacity: 0.7 }}>Fetching weather data and calculating lightning risks</p>
          </div>
        )}

        <div 
          ref={mountRef} 
          style={{ 
            width: "100%", 
            height: "600px",
            background: "radial-gradient(circle, #1a2980 0%, #26d0ce 100%)",
            borderRadius: "15px",
            overflow: "hidden",
            boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
          }}
        />

        {analysis && (
          <div style={{
            background: "rgba(255,255,255,0.1)",
            padding: "25px",
            borderRadius: "15px",
            marginTop: "20px",
            backdropFilter: "blur(10px)"
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px", marginBottom: "20px" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "2rem", marginBottom: "10px" }}>🛫</div>
                <div style={{ fontWeight: "bold", fontSize: "1.2rem" }}>{analysis.origin} → {analysis.destination}</div>
                <div style={{ opacity: 0.8 }}>Flight Route</div>
              </div>
              
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "2rem", marginBottom: "10px" }}>📏</div>
                <div style={{ fontWeight: "bold", fontSize: "1.2rem" }}>{analysis.totalDistance} km</div>
                <div style={{ opacity: 0.8 }}>Total Distance</div>
              </div>
              
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "2rem", marginBottom: "10px" }}>⚡</div>
                <div style={{ 
                  fontWeight: "bold", 
                  fontSize: "1.2rem",
                  color: riskColor(analysis.riskLevel)
                }}>
                  {analysis.lightningProbability}% Max Risk
                </div>
                <div style={{ opacity: 0.8 }}>{analysis.riskLevel} Level</div>
              </div>
              
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "2rem", marginBottom: "10px" }}>📍</div>
                <div style={{ fontWeight: "bold", fontSize: "1.2rem" }}>{analysis.waypointCount}</div>
                <div style={{ opacity: 0.8 }}>Waypoints</div>
              </div>
            </div>
            
            <div style={{
              background: "rgba(0,0,0,0.3)",
              padding: "15px",
              borderRadius: "10px",
              textAlign: "center"
            }}>
              <strong>Recommendation:</strong> {analysis.recommendation}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Main App component with state management
export default function App() {
  const [origin, setOrigin] = React.useState("CYOW");
  const [destination, setDestination] = React.useState("CYYZ");

  return (
    <GlobeFlight 
      origin={origin}
      destination={destination}
      onOriginChange={setOrigin}
      onDestinationChange={setDestination}
    />
  );
}