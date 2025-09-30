// Demo Data and Configuration for Railway TMS
const DEMO_CONFIG = {
    // System Configuration
    system: {
        name: "Smart Railway Traffic Management System",
        version: "2.0.0",
        region: "Northern Railway - Delhi Division",
        updateInterval: 30000, // 30 seconds
        simulationSpeed: 1.5,
        maxTrains: 500,
        realTimeEnabled: true
    },

    // Route Configuration
    routes: [
        {
            id: "DEL-BPL",
            name: "Delhi-Bhopal Route",
            distance: 707,
            stations: ["DEL", "GGN", "JP", "KOTA", "RTM", "BPL"],
            trackSections: 45,
            signalSections: 156,
            maxSpeed: 130,
            electrified: true
        },
        {
            id: "DEL-MUM",
            name: "Delhi-Mumbai Route", 
            distance: 1384,
            stations: ["DEL", "GGN", "JP", "KOTA", "RTM", "BRC", "ST", "CSTM"],
            trackSections: 78,
            signalSections: 245,
            maxSpeed: 160,
            electrified: true
        }
    ],

    // Extended Station Data
    stations: [
        {
            id: "DEL",
            name: "New Delhi Railway Station",
            code: "NDLS",
            coordinates: [28.6139, 77.2090],
            platforms: 16,
            status: "Active",
            type: "Terminal",
            facilities: ["WiFi", "Food Court", "Waiting Room", "AC Waiting", "Parking"],
            capacity: 850,
            currentOccupancy: 420,
            averageDelay: 2.3,
            zone: "Northern Railway"
        },
        {
            id: "GGN",
            name: "Gurgaon Railway Station",
            code: "GGN",
            coordinates: [28.4595, 77.0266],
            platforms: 4,
            status: "Active",
            type: "Junction",
            facilities: ["WiFi", "Food Stall", "Waiting Room"],
            capacity: 200,
            currentOccupancy: 125,
            averageDelay: 1.8,
            zone: "Northern Railway"
        },
        {
            id: "JP",
            name: "Jaipur Junction",
            code: "JP",
            coordinates: [26.9124, 75.7873],
            platforms: 8,
            status: "Congested",
            type: "Junction",
            facilities: ["WiFi", "Food Court", "Waiting Room", "AC Waiting", "Hotel"],
            capacity: 450,
            currentOccupancy: 380,
            averageDelay: 8.5,
            zone: "North Western Railway"
        },
        {
            id: "KOTA",
            name: "Kota Junction",
            code: "KOTA",
            coordinates: [25.2138, 75.8648],
            platforms: 6,
            status: "Active",
            type: "Junction",
            facilities: ["WiFi", "Food Court", "Waiting Room", "AC Waiting"],
            capacity: 320,
            currentOccupancy: 180,
            averageDelay: 3.2,
            zone: "West Central Railway"
        },
        {
            id: "RTM",
            name: "Ratlam Junction",
            code: "RTM",
            coordinates: [23.3315, 75.0367],
            platforms: 5,
            status: "Maintenance",
            type: "Junction",
            facilities: ["Food Stall", "Waiting Room"],
            capacity: 250,
            currentOccupancy: 95,
            averageDelay: 15.2,
            zone: "West Central Railway"
        }
    ],

    // Extended Train Data
    trains: [
        {
            id: "12001",
            name: "Shatabdi Express",
            type: "Express",
            route: "DEL-BPL",
            priority: "High",
            status: "On Time",
            delay: 0,
            currentLocation: {
                station: "GGN",
                coordinates: [28.4595, 77.0266],
                platform: 2
            },
            speed: 110,
            maxSpeed: 130,
            nextStation: "JP",
            eta: "14:30",
            scheduledArrival: "14:30",
            coach_count: 18,
            passenger_count: 1250,
            crew: {
                driver: "R. Kumar",
                guard: "S. Singh"
            },
            fuel_level: 85,
            last_maintenance: "2024-01-15",
            route_progress: 0.35
        },
        {
            id: "12002",
            name: "Rajdhani Express",
            type: "Premium Express",
            route: "DEL-MUM",
            priority: "High",
            status: "Delayed",
            delay: 15,
            currentLocation: {
                station: "DEL",
                coordinates: [28.6139, 77.2090],
                platform: 12
            },
            speed: 0,
            maxSpeed: 160,
            nextStation: "GGN",
            eta: "12:45",
            scheduledArrival: "12:30",
            coach_count: 22,
            passenger_count: 1580,
            crew: {
                driver: "A. Sharma",
                guard: "M. Patel"
            },
            fuel_level: 92,
            last_maintenance: "2024-01-10",
            route_progress: 0.02
        },
        {
            id: "12003",
            name: "Passenger Local",
            type: "Passenger",
            route: "DEL-JP",
            priority: "Medium",
            status: "On Time",
            delay: 0,
            currentLocation: {
                station: "Between GGN-JP",
                coordinates: [28.1987, 76.6062],
                platform: null
            },
            speed: 65,
            maxSpeed: 100,
            nextStation: "JP",
            eta: "15:15",
            scheduledArrival: "15:15",
            coach_count: 12,
            passenger_count: 850,
            crew: {
                driver: "V. Gupta",
                guard: "P. Yadav"
            },
            fuel_level: 67,
            last_maintenance: "2024-01-08",
            route_progress: 0.72
        },
        {
            id: "12004",
            name: "Freight Express",
            type: "Freight",
            route: "MUM-DEL",
            priority: "Low",
            status: "On Time",
            delay: 0,
            currentLocation: {
                station: "KOTA",
                coordinates: [25.2138, 75.8648],
                platform: 5
            },
            speed: 80,
            maxSpeed: 100,
            nextStation: "JP",
            eta: "16:20",
            scheduledArrival: "16:20",
            coach_count: 45,
            cargo_weight: 2850,
            crew: {
                driver: "D. Singh",
                guard: "R. Joshi"
            },
            fuel_level: 74,
            last_maintenance: "2024-01-12",
            route_progress: 0.58
        },
        {
            id: "12005",
            name: "Garib Rath Express",
            type: "AC Express",
            route: "DEL-MUM",
            priority: "High",
            status: "Delayed",
            delay: 8,
            currentLocation: {
                station: "JP",
                coordinates: [26.9124, 75.7873],
                platform: 6
            },
            speed: 105,
            maxSpeed: 130,
            nextStation: "KOTA",
            eta: "17:45",
            scheduledArrival: "17:37",
            coach_count: 20,
            passenger_count: 1420,
            crew: {
                driver: "S. Malik",
                guard: "A. Khan"
            },
            fuel_level: 88,
            last_maintenance: "2024-01-14",
            route_progress: 0.41
        }
    ],

    // Signal System Data
    signals: [
        {
            id: "SIG001",
            location: [28.5500, 77.1000],
            type: "Automatic",
            status: "Green",
            controlledBy: "Delhi Control",
            lastMaintenance: "2024-01-20"
        },
        {
            id: "SIG002", 
            location: [27.5000, 76.5000],
            type: "Semi-Automatic",
            status: "Yellow",
            controlledBy: "Jaipur Control",
            lastMaintenance: "2024-01-18"
        },
        {
            id: "SIG003",
            location: [26.2000, 75.9000],
            type: "Manual",
            status: "Red",
            controlledBy: "Kota Control", 
            lastMaintenance: "2024-01-22"
        }
    ],

    // Weather and Environmental Data
    environment: {
        weather: {
            temperature: 28,
            humidity: 65,
            windSpeed: 12,
            visibility: "Good",
            conditions: "Partly Cloudy",
            forecast: "Clear for next 6 hours"
        },
        alerts: [
            {
                id: "ALERT001",
                type: "Weather",
                severity: "Medium",
                message: "Fog expected between 2:00-6:00 AM",
                affectedRoutes: ["DEL-JP"],
                timestamp: "2024-01-25T08:30:00Z"
            },
            {
                id: "ALERT002",
                type: "Maintenance",
                severity: "High",
                message: "Track maintenance scheduled at RTM",
                affectedRoutes: ["DEL-BPL", "RTM-BRC"],
                timestamp: "2024-01-25T10:15:00Z"
            }
        ]
    },

    // Performance Metrics
    kpis: {
        onTimePerformance: {
            current: 92.3,
            target: 95.0,
            trend: "+2.1%",
            history: [88, 89, 91, 90, 92, 93, 92.3]
        },
        networkUtilization: {
            current: 78.5,
            target: 85.0,
            trend: "+3.2%",
            history: [75, 76, 77, 78, 79, 78, 78.5]
        },
        averageDelay: {
            current: 4.2,
            target: 3.0,
            trend: "-0.8min",
            history: [5.8, 5.2, 4.8, 4.5, 4.3, 4.1, 4.2]
        },
        passengerSatisfaction: {
            current: 4.2,
            target: 4.5,
            trend: "+0.1",
            history: [3.8, 3.9, 4.0, 4.1, 4.1, 4.2, 4.2]
        }
    },

    // AI Recommendations Engine
    recommendations: [
        {
            id: "REC001",
            type: "Route Optimization",
            priority: "High",
            title: "Reroute Train 12001 via Alternate Track",
            description: "Avoid congestion at Jaipur Junction platform 3-4",
            impact: "Saves 12 minutes, reduces platform crowding",
            confidence: 0.89,
            timestamp: "2024-01-25T09:02:00Z",
            status: "Pending"
        },
        {
            id: "REC002",
            type: "Schedule Adjustment",
            priority: "Medium", 
            title: "Delay Train 12049 by 5 minutes",
            description: "Allow priority passage for Express 12005",
            impact: "Improves overall network flow efficiency",
            confidence: 0.76,
            timestamp: "2024-01-25T09:05:00Z",
            status: "Pending"
        },
        {
            id: "REC003",
            type: "Resource Allocation",
            priority: "Low",
            title: "Reallocate Platform 8 at Delhi Junction",
            description: "Move freight train to alternate platform",
            impact: "Frees premium platform for passenger services",
            confidence: 0.92,
            timestamp: "2024-01-25T09:08:00Z",
            status: "Accepted"
        }
    ],

    // Simulation Scenarios
    scenarios: [
        {
            id: "SCENARIO001",
            name: "Track Blockage at Jaipur",
            type: "Infrastructure Failure",
            parameters: {
                location: "JP",
                duration: 4,
                affectedTracks: [1, 2],
                alternateRoutes: ["Via Rewari-Alwar"]
            },
            expectedImpact: {
                delayedTrains: 15,
                averageDelay: 25,
                throughputReduction: 30,
                recoveryTime: 3.5
            }
        },
        {
            id: "SCENARIO002",
            name: "Signal Failure at Kota Junction",
            type: "Signal System Failure",
            parameters: {
                location: "KOTA",
                duration: 2,
                affectedSignals: ["SIG002", "SIG003"],
                backupSystems: "Manual Control"
            },
            expectedImpact: {
                delayedTrains: 8,
                averageDelay: 15,
                throughputReduction: 20,
                recoveryTime: 2.0
            }
        }
    ],

    // System Thresholds and Limits
    thresholds: {
        maxDelayBeforeAlert: 10, // minutes
        maxPlatformOccupancy: 0.9, // 90%
        maxTrainSpeed: 160, // km/h
        minFollowingDistance: 2.5, // km
        criticalFuelLevel: 20, // %
        maintenanceDueThreshold: 30 // days
    },

    // User Interface Configuration
    ui: {
        theme: "light", // light, dark, auto
        language: "en-IN",
        dateFormat: "DD/MM/YYYY",
        timeFormat: "24h",
        currency: "INR",
        units: {
            distance: "km",
            speed: "km/h",
            weight: "tonnes",
            temperature: "°C"
        },
        refreshIntervals: {
            dashboard: 5000,
            map: 2000,
            trains: 10000,
            analytics: 30000
        },
        animations: {
            enabled: true,
            duration: "normal", // fast, normal, slow
            reducedMotion: false
        }
    }
};

// Export configuration for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DEMO_CONFIG;
} else if (typeof window !== 'undefined') {
    window.DEMO_CONFIG = DEMO_CONFIG;
}