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

const riskColor = (risk) => {
  switch ((risk || "").toUpperCase()) {
    case "CRITICAL": return { hex: "#ff4444", decimal: 0xff4444 };
    case "HIGH": return { hex: "#ffaa00", decimal: 0xffaa00 };
    case "MODERATE": return { hex: "#ffdd00", decimal: 0xffdd00 };
    case "LOW": return { hex: "#44ff44", decimal: 0x44ff44 };
    default: return { hex: "#888888", decimal: 0x888888 };
  }
};

function GlobeFlight({ origin, destination, onOriginChange, onDestinationChange }) {
  const mountRef = useRef(null);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const earthRef = useRef(null);
  const animationIdRef = useRef(null);
  const cameraAnimationRef = useRef(null);
  const shouldRotateRef = useRef(true);

  const animateCamera = (startPos, endPos, targetLook, duration = 1500) => {
    const startTime = Date.now();
    
    if (cameraAnimationRef.current) {
      cancelAnimationFrame(cameraAnimationRef.current);
    }

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      const currentPos = new THREE.Vector3().lerpVectors(startPos, endPos, easeProgress);
      cameraRef.current.position.copy(currentPos);
      cameraRef.current.lookAt(targetLook);
      
      if (controlsRef.current) {
        controlsRef.current.target.copy(targetLook);
        controlsRef.current.update();
      }
      
      if (progress < 1) {
        cameraAnimationRef.current = requestAnimationFrame(animate);
      }
    };
    
    animate();
  };

  const positionCameraForRoute = (waypoints) => {
    if (!waypoints || waypoints.length < 2 || !cameraRef.current) return;

    const validWaypoints = waypoints.filter(wp => wp.latitude !== 0 && wp.longitude !== 0);
    if (validWaypoints.length < 2) return;

    // Get origin and destination positions
    const originPos = latLonToVec3(validWaypoints[0].latitude, validWaypoints[0].longitude);
    const destPos = latLonToVec3(
      validWaypoints[validWaypoints.length - 1].latitude,
      validWaypoints[validWaypoints.length - 1].longitude
    );

    // Calculate midpoint
    const midpoint = new THREE.Vector3().addVectors(originPos, destPos).multiplyScalar(0.5);
    
    // Calculate distance between origin and destination
    const distanceBetweenPoints = originPos.distanceTo(destPos);
    
    // Position camera for optimal route viewing
    const routeVector = new THREE.Vector3().subVectors(destPos, originPos).normalize();
    const perpendicular = new THREE.Vector3(-routeVector.z, 0, routeVector.x).normalize();
    
    // Camera offset perpendicular to the route
    const cameraDistance = Math.max(10, distanceBetweenPoints * 1.8);
    const cameraOffset = perpendicular.multiplyScalar(cameraDistance * 0.6);
    
    const newCameraPos = new THREE.Vector3()
      .copy(midpoint)
      .add(cameraOffset)
      .normalize()
      .multiplyScalar(cameraDistance);
    
    // Add elevation for better view angle
    newCameraPos.y = Math.max(newCameraPos.y, cameraDistance * 0.4);

    // Get current camera position for smooth animation
    const currentCameraPos = cameraRef.current.position.clone();
    
    // Animate camera to new position
    animateCamera(currentCameraPos, newCameraPos, midpoint, 1200);
  };

  const handleSubmit = () => {
    if (!origin || !destination) {
      setError("Please enter both origin and destination codes");
      return;
    }
    
    setIsLoading(true);
    shouldRotateRef.current = false;
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
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        return response.json();
      })
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else if (!data.origin || !data.destination) {
          setError('Invalid response: missing route data');
        } else {
          setAnalysis(data);
          // Position camera after analysis is set
          setTimeout(() => positionCameraForRoute(data.waypoints), 100);
        }
      })
      .catch(err => {
        console.error('Fetch error:', err);
        setError(`Connection failed: ${err.message}`);
        shouldRotateRef.current = true; // Resume rotation on error
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = 600;
    
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x001122);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 3, 12);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;

    while (mountRef.current.firstChild) {
      mountRef.current.removeChild(mountRef.current.firstChild);
    }
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
    controls.enableZoom = true;
    controls.autoRotate = false;
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(10, 10, 5);
    scene.add(directionalLight);

    // Earth
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
    earthRef.current = earth;

    // Atmosphere
    const atmosphereGeometry = new THREE.SphereGeometry(5.15, 64, 64);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.15
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphere);

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      
      // Only rotate if allowed
      if (shouldRotateRef.current && earthRef.current) {
        earthRef.current.rotation.y += 0.0005;
      }
      
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

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
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      if (cameraAnimationRef.current) cancelAnimationFrame(cameraAnimationRef.current);
      renderer.dispose();
      controls.dispose();
    };
  }, []);

  // Draw flight path and markers
  useEffect(() => {
    if (!analysis || !sceneRef.current) return;

    const scene = sceneRef.current;
    
    // Remove previous flight elements
    const objectsToRemove = scene.children.filter(child => child.userData.isFlightElement);
    objectsToRemove.forEach(obj => scene.remove(obj));

    if (analysis.waypoints && analysis.waypoints.length > 1) {
      const validWaypoints = analysis.waypoints.filter(wp => wp.latitude !== 0 && wp.longitude !== 0);

      if (validWaypoints.length > 1) {
        // Create route points
        const routePoints = validWaypoints.map((wp, i) => {
          const offset = i === 0 || i === validWaypoints.length - 1 ? 5.05 : 5.04;
          return latLonToVec3(wp.latitude, wp.longitude, offset);
        });

        // Draw smooth flight path
        try {
          const curve = new THREE.CatmullRomCurve3(routePoints);
          curve.curveType = 'centripetal';
          curve.tension = 0.3;

          const curvePoints = curve.getPoints(150);
          
          // Main flight path - thin professional cyan
          const lineGeometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
          const lineMaterial = new THREE.LineBasicMaterial({
            color: 0x00d9ff,
            linewidth: 0.5,
            transparent: true,
            opacity: 1
          });
          const flightPath = new THREE.Line(lineGeometry, lineMaterial);
          flightPath.userData.isFlightElement = true;
          scene.add(flightPath);
        } catch (error) {
          console.warn('Curve error, using straight lines');
        }

        // Waypoint markers
        validWaypoints.forEach((wp, index) => {
          const position = latLonToVec3(wp.latitude, wp.longitude, 5.08);
          const color = riskColor(wp.riskLevel);

          // Main marker
          const sphereGeometry = new THREE.SphereGeometry(0.08, 16, 16);
          const sphereMaterial = new THREE.MeshBasicMaterial({
            color: color.decimal,
            emissive: color.decimal,
            emissiveIntensity: 0.6
          });
          const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
          sphere.position.copy(position);
          sphere.userData.isFlightElement = true;
          scene.add(sphere);

          // Glow for high-risk points
          if (wp.riskLevel === "HIGH" || wp.riskLevel === "CRITICAL") {
            const glowGeometry = new THREE.SphereGeometry(0.15, 12, 12);
            const glowMaterial = new THREE.MeshBasicMaterial({
              color: color.decimal,
              transparent: true,
              opacity: 0.25
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            glow.position.copy(position);
            glow.userData.isFlightElement = true;
            scene.add(glow);
          }

          // Connection line to surface
          const earthPosition = latLonToVec3(wp.latitude, wp.longitude, 5.0);
          const lineGeometry = new THREE.BufferGeometry().setFromPoints([earthPosition, position]);
          const lineMaterial = new THREE.LineBasicMaterial({
            color: color.decimal,
            transparent: true,
            opacity: 0.4
          });
          const line = new THREE.Line(lineGeometry, lineMaterial);
          line.userData.isFlightElement = true;
          scene.add(line);
        });

        // Start marker (green)
        const startPos = latLonToVec3(validWaypoints[0].latitude, validWaypoints[0].longitude, 5.12);
        const startGeometry = new THREE.SphereGeometry(0.12, 16, 16);
        const startMaterial = new THREE.MeshBasicMaterial({ 
          color: 0x00ff00,
          emissive: 0x00ff00,
          emissiveIntensity: 0.8
        });
        const startMarker = new THREE.Mesh(startGeometry, startMaterial);
        startMarker.position.copy(startPos);
        startMarker.userData.isFlightElement = true;
        scene.add(startMarker);

        // End marker (red)
        const endPos = latLonToVec3(
          validWaypoints[validWaypoints.length - 1].latitude,
          validWaypoints[validWaypoints.length - 1].longitude,
          5.12
        );
        const endGeometry = new THREE.SphereGeometry(0.12, 16, 16);
        const endMaterial = new THREE.MeshBasicMaterial({ 
          color: 0xff0000,
          emissive: 0xff0000,
          emissiveIntensity: 0.8
        });
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
          ✈️ AirLume Flight Route Analyzer
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
          <div style={{ display: "flex", gap: "20px", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div>
              <label style={{ display: "block", marginBottom: "5px", fontSize: "0.9rem", opacity: 0.8 }}>Origin ICAO:</label>
              <input 
                value={origin} 
                onChange={e => onOriginChange(e.target.value.toUpperCase())}
                onKeyPress={e => e.key === 'Enter' && handleSubmit()}
                style={{
                  padding: "10px 15px",
                  borderRadius: "8px",
                  border: "2px solid rgba(255,255,255,0.3)",
                  background: "rgba(0,0,0,0.3)",
                  color: "white",
                  fontSize: "1rem",
                  width: "120px",
                  transition: "all 0.3s"
                }}
                placeholder="e.g., CYOW"
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "5px", fontSize: "0.9rem", opacity: 0.8 }}>Destination ICAO:</label>
              <input 
                value={destination} 
                onChange={e => onDestinationChange(e.target.value.toUpperCase())}
                onKeyPress={e => e.key === 'Enter' && handleSubmit()}
                style={{
                  padding: "10px 15px",
                  borderRadius: "8px",
                  border: "2px solid rgba(255,255,255,0.3)",
                  background: "rgba(0,0,0,0.3)",
                  color: "white",
                  fontSize: "1rem",
                  width: "120px",
                  transition: "all 0.3s"
                }}
                placeholder="e.g., CYYZ"
              />
            </div>
            <button 
              onClick={handleSubmit}
              disabled={isLoading}
              style={{
                padding: "12px 28px",
                borderRadius: "8px",
                border: "none",
                background: isLoading ? "linear-gradient(135deg, #888 0%, #555 100%)" : "linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)",
                color: "white",
                fontSize: "1rem",
                fontWeight: "bold",
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.7 : 1,
                transition: "all 0.3s"
              }}
            >
              {isLoading ? "🔄 Analyzing..." : "🚀 Analyze Route"}
            </button>
          </div>
        </div>

        {error && (
          <div style={{
            background: "rgba(220, 53, 69, 0.2)",
            border: "2px solid rgba(220, 53, 69, 0.5)",
            padding: "15px",
            borderRadius: "10px",
            marginBottom: "20px",
            textAlign: "center"
          }}>
            ⚠️ Error: {error}
          </div>
        )}

        {!analysis && !isLoading && (
          <div style={{
            background: "rgba(255,255,255,0.1)",
            padding: "40px",
            borderRadius: "15px",
            textAlign: "center",
            marginBottom: "20px"
          }}>
            <div style={{ fontSize: "3rem", marginBottom: "20px" }}>🌍</div>
            <h3>Ready for Route Analysis</h3>
            <p style={{ opacity: 0.7 }}>Enter airport codes and click "Analyze Route" to visualize lightning risks</p>
          </div>
        )}

        {isLoading && (
          <div style={{
            background: "rgba(255,255,255,0.1)",
            padding: "40px",
            borderRadius: "15px",
            textAlign: "center",
            marginBottom: "20px"
          }}>
            <div style={{ fontSize: "3rem", marginBottom: "20px" }}>🔄</div>
            <h3>Analyzing Flight Route...</h3>
            <p style={{ opacity: 0.7 }}>Calculating lightning risks and weather conditions</p>
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
                  color: riskColor(analysis.riskLevel).hex
                }}>
                  {analysis.lightningProbability}% Max Risk
                </div>
                <div style={{ opacity: 0.8 }}>{analysis.riskLevel} Level</div>
              </div>
              
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "2rem", marginBottom: "10px" }}>📍</div>
                <div style={{ fontWeight: "bold", fontSize: "1.2rem" }}>{analysis.waypointCount}</div>
                <div style={{ opacity: 0.8 }}>Waypoints Analyzed</div>
              </div>
            </div>
            
            <div style={{
              background: "rgba(0,0,0,0.3)",
              padding: "15px",
              borderRadius: "10px",
              textAlign: "center",
              borderLeft: `4px solid ${riskColor(analysis.riskLevel).hex}`
            }}>
              <strong>Recommendation:</strong> {analysis.recommendation}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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