export const DEMO_AIRPORTS = {
  CYVR: { lat: 49.1947, lon: -123.1792 },
  CYYC: { lat: 51.1215, lon: -114.0076 },
  CYEG: { lat: 53.3097, lon: -113.5797 },
  CYWG: { lat: 49.9100, lon: -97.2398  },
  CYQM: { lat: 46.1122, lon: -64.6786  },
};

export const DEMO_ROUTES = [
  {
    label: "🔴 High Risk — CYOW → CYYZ",
    origin: "CYOW",
    destination: "CYYZ",
    data: {
      riskLevel: "HIGH",
      lightningProbability: "72.4",
      safetyStatus: "Exercise Caution",
      temperature: "-8.3",
      humidity: "89.2",
      pressure: "987",
      windSpeed: "24.6",
      averageRisk: "68.1",
      totalDistance: 364,
      waypointCount: 5,
      newFlightLevel: "FL280",
      alternateAirport: "CYKF",
      recommendation: "Significant convective activity and icing conditions detected along the route. Recommend climbing to FL280 and deviating 40nm north of track near waypoint 3. Monitor SIGMET CA12 closely.",
      waypoints: [
        { name: "CYOW",  number: 1, distanceKm: 0,   riskPercent: "45.2", riskLevel: "MODERATE", latitude: 45.3225, longitude: -75.6692 },
        { name: "WP002", number: 2, distanceKm: 89,  riskPercent: "71.8", riskLevel: "HIGH",     latitude: 44.9,    longitude: -77.1    },
        { name: "WP003", number: 3, distanceKm: 178, riskPercent: "88.3", riskLevel: "CRITICAL", latitude: 44.4,    longitude: -78.2    },
        { name: "WP004", number: 4, distanceKm: 267, riskPercent: "61.4", riskLevel: "HIGH",     latitude: 44.0,    longitude: -79.0    },
        { name: "CYYZ",  number: 5, distanceKm: 364, riskPercent: "38.7", riskLevel: "MODERATE", latitude: 43.6777, longitude: -79.6248 },
      ]
    }
  },
  {
    label: "🟢 Low Risk — CYVR → CYYC",
    origin: "CYVR",
    destination: "CYYC",
    data: {
      riskLevel: "LOW",
      lightningProbability: "8.1",
      safetyStatus: "Clear to Proceed",
      temperature: "2.1",
      humidity: "41.0",
      pressure: "1021",
      windSpeed: "6.3",
      averageRisk: "11.2",
      totalDistance: 675,
      waypointCount: 5,
      newFlightLevel: null,
      alternateAirport: null,
      recommendation: "Excellent flying conditions across the entire route. Clear skies with light westerly winds at cruise altitude. No significant weather systems detected. Proceed as filed.",
      waypoints: [
        { name: "CYVR",  number: 1, distanceKm: 0,   riskPercent: "6.2",  riskLevel: "LOW", latitude: 49.1947, longitude: -123.1792 },
        { name: "WP002", number: 2, distanceKm: 168, riskPercent: "9.4",  riskLevel: "LOW", latitude: 49.8,    longitude: -119.5    },
        { name: "WP003", number: 3, distanceKm: 337, riskPercent: "12.1", riskLevel: "LOW", latitude: 50.2,    longitude: -116.0    },
        { name: "WP004", number: 4, distanceKm: 506, riskPercent: "8.8",  riskLevel: "LOW", latitude: 50.8,    longitude: -112.8    },
        { name: "CYYC",  number: 5, distanceKm: 675, riskPercent: "7.3",  riskLevel: "LOW", latitude: 51.1215, longitude: -114.0076 },
      ]
    }
  },
  {
    label: "🟡 Mixed — CYEG → CYQM",
    origin: "CYEG",
    destination: "CYQM",
    data: {
      riskLevel: "MODERATE",
      lightningProbability: "38.5",
      safetyStatus: "Proceed with Awareness",
      temperature: "-14.7",
      humidity: "67.3",
      pressure: "1004",
      windSpeed: "14.2",
      averageRisk: "34.8",
      totalDistance: 2900,
      waypointCount: 5,
      newFlightLevel: "FL320",
      alternateAirport: null,
      recommendation: "Moderate turbulence expected between waypoints 2 and 3 due to jet stream interaction. Light icing possible at FL240, recommend FL320 to stay above cloud tops. Overall route is manageable.",
      waypoints: [
        { name: "CYEG",  number: 1, distanceKm: 0,    riskPercent: "18.4", riskLevel: "LOW",      latitude: 53.3097, longitude: -113.5797 },
        { name: "WP002", number: 2, distanceKm: 295,  riskPercent: "42.7", riskLevel: "MODERATE", latitude: 52.8,    longitude: -108.5    },
        { name: "WP003", number: 3, distanceKm: 590,  riskPercent: "61.2", riskLevel: "HIGH",     latitude: 52.1,    longitude: -103.2    },
        { name: "WP004", number: 4, distanceKm: 885,  riskPercent: "33.6", riskLevel: "MODERATE", latitude: 51.6,    longitude: -98.4     },
        { name: "CYQM",  number: 5, distanceKm: 2900, riskPercent: "14.9", riskLevel: "LOW", latitude: 46.1122, longitude: -64.6786  },
        //{ name: "CYWG",  number: 5, distanceKm: 1180, riskPercent: "14.9", riskLevel: "LOW",      latitude: 49.9100, longitude: -97.2398  },
      ]
    }
  }
];