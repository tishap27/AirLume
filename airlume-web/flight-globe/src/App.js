import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { MapPin, AlertTriangle, Cloud, Wind, Droplets, Gauge } from "lucide-react";

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
  const level = (risk || "").toUpperCase();
  switch (level) {
    case "CRITICAL":
      return { hex: "#dc2626", rgb: "239, 68, 68", label: "CRITICAL" };
    case "HIGH":
      return { hex: "#ea580c", rgb: "234, 88, 12", label: "HIGH" };
    case "MODERATE":
      return { hex: "#f59e0b", rgb: "245, 158, 11", label: "MODERATE" };
    default:
      return { hex: "#10b981", rgb: "16, 185, 129", label: "LOW" };
  }
};

const getRiskBar = (percentage) => {
  if (percentage > 35) return { color: "#dc2626", level: "CRITICAL" };
  if (percentage > 25) return { color: "#ea580c", level: "HIGH" };
  if (percentage > 15) return { color: "#f59e0b", level: "MODERATE" };
  return { color: "#10b981", level: "LOW" };
};

function GlobeFlight({ origin, destination }) {
  const mountRef = useRef(null);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setError(null);
    setAnalysis(null);
    setLoading(true);

    fetch(`${API_URL}?origin=${origin}&destination=${destination}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else if (!data.origin || !data.destination) {
          setError("Invalid response: missing route data");
        } else {
          setAnalysis(data);
        }
      })
      .catch((err) => {
        setError(`Connection failed: ${err.message}`);
      })
      .finally(() => setLoading(false));
  }, [origin, destination]);

  useEffect(() => {
    if (!analysis) return;

    const width = 800;
    const height = 600;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 16);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    const light = new THREE.AmbientLight(0xffffff, 1.1);
    scene.add(light);

    const geometry = new THREE.SphereGeometry(5, 64, 64);
    const texture = new THREE.TextureLoader().load(
      "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg"
    );
    const material = new THREE.MeshPhongMaterial({ map: texture });
    const earth = new THREE.Mesh(geometry, material);
    scene.add(earth);

    if (analysis.waypoints && analysis.waypoints.length > 0) {
      const validWaypoints = analysis.waypoints.filter(
        (wp) => wp.latitude !== 0 && wp.longitude !== 0
      );

      if (validWaypoints.length > 0) {
        const arcPoints = validWaypoints.map((wp) =>
          latLonToVec3(wp.latitude, wp.longitude)
        );
        const curve = new THREE.CatmullRomCurve3(arcPoints);
        const curveGeom = new THREE.TubeGeometry(curve, 100, 0.06, 8, false);
        const curveMat = new THREE.MeshBasicMaterial({ color: "#0ea5e9" });
        scene.add(new THREE.Mesh(curveGeom, curveMat));

        analysis.waypoints.forEach((wp) => {
          if (wp.latitude !== 0 && wp.longitude !== 0) {
            const vec = latLonToVec3(wp.latitude, wp.longitude, 5.03);
            const color = riskColor(wp.riskLevel);
            const markerGeom = new THREE.SphereGeometry(0.15, 24, 24);
            const markerMat = new THREE.MeshBasicMaterial({ color: color.hex });
            const marker = new THREE.Mesh(markerGeom, markerMat);
            marker.position.copy(vec);
            scene.add(marker);
          }
        });
      }
    }

    let frameId;
    const animate = () => {
      earth.rotation.y += 0.0008;
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

  const avgRisk = analysis ? parseFloat(analysis.averageRisk) : 0;
  const maxRisk = analysis ? parseFloat(analysis.lightningProbability) : 0;

  return (
    <div className="w-full h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-lg flex items-center justify-center">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">AirLume</h1>
              <p className="text-xs text-slate-400">Lightning Risk Prediction</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Panel - Controls & Info */}
          <div className="lg:col-span-1 space-y-4">
            {/* Route Input */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-3">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Route Planning</h2>
              <div className="space-y-2">
                <label className="block text-xs text-slate-400 font-medium">Origin (ICAO)</label>
                <input
                  type="text"
                  defaultValue="CYOW"
                  onChange={(e) => {
                    const parent = e.target.closest(".lg\\:col-span-1");
                    const destInput = parent.querySelector("[data-dest]");
                    window.setRoute?.(e.target.value.toUpperCase(), destInput.value);
                  }}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  placeholder="CYOW"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs text-slate-400 font-medium">Destination (ICAO)</label>
                <input
                  type="text"
                  data-dest
                  defaultValue="CYYZ"
                  onChange={(e) => {
                    const parent = e.target.closest(".lg\\:col-span-1");
                    const origInput = parent.querySelector("input:not([data-dest])");
                    window.setRoute?.(origInput.value, e.target.value.toUpperCase());
                  }}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  placeholder="CYYZ"
                />
              </div>
            </div>

            {/* Status Card */}
            {loading && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-slate-300">Loading route data...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-200">Error</p>
                  <p className="text-xs text-red-300 mt-1">{error}</p>
                </div>
              </div>
            )}

            {analysis && (
              <>
                {/* Route Summary */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-750 border border-slate-700 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <p className="text-2xl font-bold text-white">{analysis.origin}</p>
                      <p className="text-xs text-slate-400">Origin</p>
                    </div>
                    <div className="text-slate-500">→</div>
                    <div className="flex-1 text-right">
                      <p className="text-2xl font-bold text-white">{analysis.destination}</p>
                      <p className="text-xs text-slate-400">Destination</p>
                    </div>
                  </div>
                  <div className="border-t border-slate-700 pt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Distance</span>
                      <span className="font-semibold text-white">{analysis.totalDistance} km</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Waypoints</span>
                      <span className="font-semibold text-white">{analysis.waypointCount}</span>
                    </div>
                  </div>
                </div>

                {/* Risk Metrics */}
                <div className="space-y-2">
                  <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-slate-400 uppercase">Max Risk</p>
                      <span className={`text-lg font-bold ${getRiskBar(maxRisk).color === "#dc2626" ? "text-red-400" : getRiskBar(maxRisk).color === "#ea580c" ? "text-orange-400" : getRiskBar(maxRisk).color === "#f59e0b" ? "text-amber-400" : "text-green-400"}`}>
                        {maxRisk}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full transition-all duration-300 rounded-full"
                        style={{
                          width: `${maxRisk}%`,
                          backgroundColor: getRiskBar(maxRisk).color,
                        }}
                      />
                    </div>
                  </div>

                  <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-slate-400 uppercase">Avg Risk</p>
                      <span className={`text-lg font-bold ${getRiskBar(avgRisk).color === "#dc2626" ? "text-red-400" : getRiskBar(avgRisk).color === "#ea580c" ? "text-orange-400" : getRiskBar(avgRisk).color === "#f59e0b" ? "text-amber-400" : "text-green-400"}`}>
                        {avgRisk}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full transition-all duration-300 rounded-full"
                        style={{
                          width: `${avgRisk}%`,
                          backgroundColor: getRiskBar(avgRisk).color,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Recommendation */}
                <div
                  className={`rounded-lg p-3 border ${
                    maxRisk > 35
                      ? "bg-red-900/20 border-red-700"
                      : "bg-amber-900/20 border-amber-700"
                  }`}
                >
                  <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Recommendation</p>
                  <p className={`text-sm font-medium ${maxRisk > 35 ? "text-red-300" : "text-amber-300"}`}>
                    {analysis.recommendation}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Center - Globe */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
              <div ref={mountRef} className="w-full" style={{ height: "600px" }} />
            </div>
          </div>
        </div>

        {/* Waypoints Table */}
        {analysis && (
          <div className="mt-4 bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            <div className="bg-slate-900 px-6 py-3 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                Route Waypoints ({analysis.waypointCount})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-700 border-b border-slate-600">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Distance</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Lat / Lon</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Risk</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {analysis.waypoints.map((wp, idx) => {
                    const riskInfo = getRiskBar(wp.riskPercentage || 0);
                    return (
                      <tr key={idx} className="hover:bg-slate-700/50 transition-colors">
                        <td className="px-6 py-3 text-white font-medium">WP{idx + 1}</td>
                        <td className="px-6 py-3 text-slate-300">
                          {wp.distanceFromStart || (idx * 45)} km
                        </td>
                        <td className="px-6 py-3 text-slate-400 text-xs font-mono">
                          {wp.latitude?.toFixed(3)}, {wp.longitude?.toFixed(3)}
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-slate-700 rounded-full h-1.5">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${wp.riskPercentage || 0}%`,
                                  backgroundColor: riskInfo.color,
                                }}
                              />
                            </div>
                            <span className="font-semibold text-white min-w-12">
                              {wp.riskPercentage || 0}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              riskInfo.level === "CRITICAL"
                                ? "bg-red-900/40 text-red-300"
                                : riskInfo.level === "HIGH"
                                ? "bg-orange-900/40 text-orange-300"
                                : riskInfo.level === "MODERATE"
                                ? "bg-amber-900/40 text-amber-300"
                                : "bg-green-900/40 text-green-300"
                            }`}
                          >
                            {riskInfo.level}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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

  window.setRoute = (orig, dest) => {
    setOrigin(orig);
    setDestination(dest);
  };

  return <GlobeFlight origin={origin} destination={destination} />;
}