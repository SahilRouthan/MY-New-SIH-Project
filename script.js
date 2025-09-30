// Smart Railway Traffic Management System - Main JavaScript
class RailwayTMS {
    constructor() {
        this.currentView = 'dashboard';
        this.map = null;
        this.trains = [];
        this.stations = [];
        this.tracks = [];
        this.charts = {};
        this.simulationRunning = false;
        this.realTimeInterval = null;
        
        // Schedule Planning state
        this.schedules = [];
        this.scheduleState = {
            loaded: false,
            raw: [],
            filtered: [],
            page: 1,
            pageSize: 25,
            origin: '',
            destination: '',
            status: '',
            date: '',
            search: ''
        };
        
        // Alerts state
        this.alerts = [];
        this.alertFilters = { search: '', severity: '', type: '', status: '' };
        
        // Performance Analytics state
        this.analytics = {
            period: 'yearly', // default to Year-over-Year trends
            corridor: 'all',
            type: 'all',
            data: null,
            lastSim: null
        };
        
        // Collision simulation state
        this.collisionSim = {
            initialized: false,
            rafId: null,
            canvas: null,
            ctx: null,
            width: 0,
            height: 0,
            dpi: (typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1),
            intersection: { x: 0, y: 0, half: 40 }, // intersection square half-size
            trains: [],
            started: false,
            lastTs: 0,
            safeWindow: 3.0 // seconds: min time separation
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateDateTime();
        this.initializeData();
        this.setupCharts();
        this.startRealTimeUpdates();
        this.setupMap();
        this.initAlertsDemo();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.switchView(view);
            });
            // Keyboard support
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const view = e.currentTarget.dataset.view;
                    this.switchView(view);
                }
            });
        });

        // Simulation controls
        const runSimBtn = document.getElementById('runSimulation');
        const resetSimBtn = document.getElementById('resetSimulation');
        
        if (runSimBtn) {
            runSimBtn.addEventListener('click', () => this.runSimulation());
        }
        
        if (resetSimBtn) {
            resetSimBtn.addEventListener('click', () => this.resetSimulation());
        }

        // Duration slider
        const durationSlider = document.getElementById('disruptionDuration');
        if (durationSlider) {
            durationSlider.addEventListener('input', (e) => {
                document.getElementById('durationValue').textContent = e.target.value + ' hours';
            });
        }

        // Map controls
        const toggleButtons = ['toggleTrains', 'toggleStations', 'toggleSignals'];
        toggleButtons.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => this.toggleMapLayer(id));
            }
        });

        // Train search
        const trainSearch = document.getElementById('trainSearch');
        if (trainSearch) {
            trainSearch.addEventListener('input', (e) => this.filterTrains(e.target.value));
        }

        // Recommendation actions
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-success') && e.target.textContent === 'Accept') {
                this.acceptRecommendation(e.target);
            }
            if (e.target.classList.contains('btn-outline') && e.target.textContent === 'Dismiss') {
                this.dismissRecommendation(e.target);
            }
        });

        // Mobile sidebar toggle
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.querySelector('.sidebar');
        if (menuToggle && sidebar) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('open');
            });
        }

        // Schedule Planning events
        const scheduleSearch = document.getElementById('scheduleSearch');
        if (scheduleSearch) {
            scheduleSearch.addEventListener('input', (e) => {
                this.scheduleState.search = e.target.value.trim();
                this.scheduleState.page = 1;
                this.renderScheduleTable();
            });
        }

        const applyFiltersBtn = document.getElementById('applyScheduleFilters');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => this.applyScheduleFilters());
        }

        const resetFiltersBtn = document.getElementById('resetScheduleFilters');
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', () => this.resetScheduleFilters());
        }

        const originSel = document.getElementById('scheduleOrigin');
        const destSel = document.getElementById('scheduleDestination');
        const statusSel = document.getElementById('scheduleStatus');
        const dateInput = document.getElementById('scheduleDate');
        const pageSizeSel = document.getElementById('schedulePageSize');
        const prevBtn = document.getElementById('schedulePrev');
        const nextBtn = document.getElementById('scheduleNext');
        const exportBtn = document.getElementById('exportSchedule');

        if (originSel) originSel.addEventListener('change', () => this.applyScheduleFilters(true));
        if (destSel) destSel.addEventListener('change', () => this.applyScheduleFilters(true));
        if (statusSel) statusSel.addEventListener('change', () => this.applyScheduleFilters(true));
        if (dateInput) dateInput.addEventListener('change', () => this.applyScheduleFilters(true));

        if (pageSizeSel) {
            pageSizeSel.addEventListener('change', (e) => {
                this.scheduleState.pageSize = parseInt(e.target.value, 10) || 25;
                this.scheduleState.page = 1;
                this.renderScheduleTable();
            });
        }

        if (prevBtn) prevBtn.addEventListener('click', () => {
            if (this.scheduleState.page > 1) {
                this.scheduleState.page--;
                this.renderScheduleTable();
            }
        });
        if (nextBtn) nextBtn.addEventListener('click', () => {
            const totalPages = Math.max(1, Math.ceil(this.scheduleState.filtered.length / this.scheduleState.pageSize));
            if (this.scheduleState.page < totalPages) {
                this.scheduleState.page++;
                this.renderScheduleTable();
            }
        });

        if (exportBtn) exportBtn.addEventListener('click', () => this.exportSchedule());

        // Dashboard: Export report
        const exportDashboardBtn = document.getElementById('exportDashboard');
        if (exportDashboardBtn) {
            exportDashboardBtn.addEventListener('click', () => this.exportDashboard());
        }
        // New explicit export buttons
        const exportDashboardPdfBtn = document.getElementById('exportDashboardPdf');
        if (exportDashboardPdfBtn) {
            exportDashboardPdfBtn.addEventListener('click', () => this.exportDashboardPDF());
        }
        const exportDashboardCsvBtn = document.getElementById('exportDashboardCsv');
        if (exportDashboardCsvBtn) {
            exportDashboardCsvBtn.addEventListener('click', () => this.exportDashboardCSV());
        }

        // Alerts: filters and bulk actions
        const alertSearch = document.getElementById('alertSearch');
        const alertSeverity = document.getElementById('alertSeverity');
        const alertType = document.getElementById('alertType');
        const alertStatus = document.getElementById('alertStatus');
        const resetAlertFilters = document.getElementById('resetAlertFilters');
        const ackAllAlerts = document.getElementById('ackAllAlerts');
        const resolveAllAlerts = document.getElementById('resolveAllAlerts');

        if (alertSearch) alertSearch.addEventListener('input', (e) => { this.alertFilters.search = e.target.value.trim(); this.renderAlerts(); });
        if (alertSeverity) alertSeverity.addEventListener('change', (e) => { this.alertFilters.severity = e.target.value; this.renderAlerts(); });
        if (alertType) alertType.addEventListener('change', (e) => { this.alertFilters.type = e.target.value; this.renderAlerts(); });
        if (alertStatus) alertStatus.addEventListener('change', (e) => { this.alertFilters.status = e.target.value; this.renderAlerts(); });
        if (resetAlertFilters) resetAlertFilters.addEventListener('click', () => this.resetAlertFilters());
        if (ackAllAlerts) ackAllAlerts.addEventListener('click', () => this.bulkAcknowledgeAlerts());
        if (resolveAllAlerts) resolveAllAlerts.addEventListener('click', () => this.bulkResolveAlerts());

        // Alerts: action buttons via event delegation
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-alert-action]');
            if (btn) {
                const action = btn.getAttribute('data-alert-action');
                const id = btn.getAttribute('data-alert-id');
                this.handleAlertAction(action, id);
            }
        });

        // Analytics filters
        const analyticsPeriod = document.getElementById('analyticsPeriod');
        const analyticsCorridor = document.getElementById('analyticsCorridor');
        const analyticsType = document.getElementById('analyticsType');
        const applyAnalytics = document.getElementById('applyAnalyticsFilters');
        const resetAnalytics = document.getElementById('resetAnalyticsFilters');

        if (applyAnalytics) {
            applyAnalytics.addEventListener('click', () => {
                if (analyticsPeriod) this.analytics.period = analyticsPeriod.value || '7d';
                if (analyticsCorridor) this.analytics.corridor = analyticsCorridor.value || 'all';
                if (analyticsType) this.analytics.type = analyticsType.value || 'all';
                this.renderAnalytics();
            });
        }
        if (resetAnalytics) {
            resetAnalytics.addEventListener('click', () => {
                if (analyticsPeriod) analyticsPeriod.value = 'yearly';
                if (analyticsCorridor) analyticsCorridor.value = 'all';
                if (analyticsType) analyticsType.value = 'all';
                this.analytics.period = 'yearly';
                this.analytics.corridor = 'all';
                this.analytics.type = 'all';
                this.renderAnalytics();
            });
        }
        // Apply last simulation to analytics Scenario Impact chart
        const applyLastSimBtn = document.getElementById('applyLastSimToAnalytics');
        if (applyLastSimBtn) {
            applyLastSimBtn.addEventListener('click', () => this.applyLastSimToAnalytics());
        }
    }

    switchView(viewName) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-view="${viewName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        document.getElementById(viewName).classList.add('active');

        this.currentView = viewName;

        // Initialize view-specific content
        switch(viewName) {
            case 'network':
                this.initializeMap();
                break;
            case 'trains':
                this.loadTrainsData();
                break;
            case 'simulation':
                this.setupSimulation();
                break;
            case 'analytics':
                this.updateAnalytics();
                break;
            case 'schedule':
                this.loadSchedules();
                break;
            case 'alerts':
                this.renderAlerts();
                break;
        }
    }

    // Prepare simulation view when opened
    setupSimulation() {
        this.initCollisionSim();
    }
    
    updateDateTime() {
        const now = new Date();
        const timeElement = document.getElementById('currentTime');
        const dateElement = document.getElementById('currentDate');

        if (timeElement) {
            timeElement.textContent = now.toLocaleTimeString('en-IN', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }

        if (dateElement) {
            dateElement.textContent = now.toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }

        // Update every second
        setTimeout(() => this.updateDateTime(), 1000);
    }

    initializeData() {
        // Sample train data
        this.trains = [
            {
                id: '12001',
                name: 'Shatabdi Express',
                route: 'Delhi-Mumbai',
                status: 'On Time',
                delay: 0,
                priority: 'Express',
                currentLocation: 'Gurgaon',
                speed: 110,
                coordinates: [28.4595, 77.0266],
                nextStation: 'Jaipur Junction',
                eta: '14:30'
            },
            {
                id: '12002',
                name: 'Rajdhani Express',
                route: 'Delhi-Mumbai',
                status: 'Delayed',
                delay: 15,
                priority: 'Express',
                currentLocation: 'Delhi Junction',
                speed: 95,
                coordinates: [28.6139, 77.2090],
                nextStation: 'Gurgaon',
                eta: '12:45'
            },
            {
                id: '12003',
                name: 'Passenger Local',
                route: 'Delhi-Jaipur',
                status: 'On Time',
                delay: 0,
                priority: 'Passenger',
                currentLocation: 'Rewari',
                speed: 65,
                coordinates: [28.1987, 76.6062],
                nextStation: 'Alwar',
                eta: '15:15'
            },
            {
                id: '12004',
                name: 'Freight Express',
                route: 'Mumbai-Delhi',
                status: 'On Time',
                delay: 0,
                priority: 'Freight',
                currentLocation: 'Kota Junction',
                speed: 80,
                coordinates: [25.2138, 75.8648],
                nextStation: 'Sawai Madhopur',
                eta: '16:20'
            },
            {
                id: '12005',
                name: 'Garib Rath',
                route: 'Delhi-Mumbai',
                status: 'Delayed',
                delay: 8,
                priority: 'Express',
                currentLocation: 'Jaipur Junction',
                speed: 105,
                coordinates: [26.9124, 75.7873],
                nextStation: 'Ajmer',
                eta: '17:45'
            }
        ];

        // Sample station data
        this.stations = [
            { id: 'DEL', name: 'Delhi Junction', coordinates: [28.6139, 77.2090], platforms: 16, status: 'Active' },
            { id: 'GGN', name: 'Gurgaon', coordinates: [28.4595, 77.0266], platforms: 4, status: 'Active' },
            { id: 'JP', name: 'Jaipur Junction', coordinates: [26.9124, 75.7873], platforms: 8, status: 'Congested' },
            { id: 'KOTA', name: 'Kota Junction', coordinates: [25.2138, 75.8648], platforms: 6, status: 'Active' },
            { id: 'RTM', name: 'Ratlam Junction', coordinates: [23.3315, 75.0367], platforms: 5, status: 'Maintenance' }
        ];

        this.loadTrainsData();
    }

    loadTrainsData() {
        const tableBody = document.getElementById('trainsTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        this.trains.forEach(train => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${train.id}</strong></td>
                <td>${train.name}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-map-marker-alt" style="color: var(--primary-color);"></i>
                        ${train.currentLocation}
                    </div>
                </td>
                <td>
                    <span class="status-badge ${train.status.toLowerCase().replace(' ', '-')}">
                        ${train.status}
                    </span>
                </td>
                <td>
                    ${train.delay > 0 ? 
                        `<span style="color: var(--danger-color); font-weight: 600;">+${train.delay} min</span>` : 
                        '<span style="color: var(--success-color); font-weight: 600;">On Time</span>'
                    }
                </td>
                <td>
                    <span class="priority-badge ${train.priority.toLowerCase()}">
                        ${train.priority}
                    </span>
                </td>
                <td>
                    <div style="display: flex; gap: 4px;">
                        <button class="btn-icon" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon" title="Track Train">
                            <i class="fas fa-route"></i>
                        </button>
                        <button class="btn-icon" title="Modify Schedule">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    filterTrains(searchTerm) {
        const rows = document.querySelectorAll('#trainsTableBody tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            const match = text.includes(searchTerm.toLowerCase());
            row.style.display = match ? '' : 'none';
        });
    }

    setupMap() {
        // Initialize map when network view is first accessed
        if (this.currentView === 'network') {
            this.initializeMap();
        }
    }

    initializeMap() {
        if (this.map) return; // Map already initialized

        const mapElement = document.getElementById('railwayMap');
        if (!mapElement) return;

        // Initialize Leaflet map
        this.map = L.map('railwayMap').setView([26.0, 76.0], 6);

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Add railway-specific styling
        const customStyle = `
            <style>
                .leaflet-container { 
                    background: #f8f9fa; 
                    font-family: var(--font-family);
                }
                .train-marker {
                    background: linear-gradient(45deg, #e74c3c, #c0392b);
                    border: 2px solid white;
                    border-radius: 50%;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                }
                .station-marker {
                    background: linear-gradient(45deg, #3498db, #2980b9);
                    border: 2px solid white;
                    border-radius: 4px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                }
            </style>
        `;
        document.head.insertAdjacentHTML('beforeend', customStyle);

        this.addStationsToMap();
        this.addTrainsToMap();
        this.addTracksToMap();
        this.startTrainAnimation();
    }

    addStationsToMap() {
        this.stations.forEach(station => {
            const statusColor = {
                'Active': '#28a745',
                'Congested': '#ffc107',
                'Maintenance': '#dc3545'
            }[station.status] || '#6c757d';

            const stationIcon = L.divIcon({
                html: `<div style="
                    width: 20px; 
                    height: 20px; 
                    background: ${statusColor}; 
                    border: 2px solid white; 
                    border-radius: 4px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                "></div>`,
                iconSize: [20, 20],
                className: 'station-marker'
            });

            const marker = L.marker(station.coordinates, { icon: stationIcon })
                .addTo(this.map)
                .bindPopup(`
                    <div style="font-family: var(--font-family); min-width: 200px;">
                        <h4 style="margin: 0 0 8px 0; color: var(--primary-color);">${station.name}</h4>
                        <p style="margin: 4px 0;"><strong>Platforms:</strong> ${station.platforms}</p>
                        <p style="margin: 4px 0;"><strong>Status:</strong> 
                            <span style="color: ${statusColor}; font-weight: 600;">${station.status}</span>
                        </p>
                        <p style="margin: 4px 0;"><strong>Station Code:</strong> ${station.id}</p>
                    </div>
                `);
        });
    }

    addTrainsToMap() {
        this.trains.forEach(train => {
            const trainColor = {
                'Express': '#e74c3c',
                'Passenger': '#3498db',
                'Freight': '#f39c12'
            }[train.priority] || '#6c757d';

            const trainIcon = L.divIcon({
                html: `<div style="
                    width: 16px; 
                    height: 16px; 
                    background: ${trainColor}; 
                    border: 2px solid white; 
                    border-radius: 50%;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    animation: pulse 2s infinite;
                "></div>`,
                iconSize: [16, 16],
                className: 'train-marker'
            });

            const marker = L.marker(train.coordinates, { icon: trainIcon })
                .addTo(this.map)
                .bindPopup(`
                    <div style="font-family: var(--font-family); min-width: 250px;">
                        <h4 style="margin: 0 0 8px 0; color: var(--primary-color);">${train.name}</h4>
                        <p style="margin: 4px 0;"><strong>Train No:</strong> ${train.id}</p>
                        <p style="margin: 4px 0;"><strong>Current Location:</strong> ${train.currentLocation}</p>
                        <p style="margin: 4px 0;"><strong>Speed:</strong> ${train.speed} km/h</p>
                        <p style="margin: 4px 0;"><strong>Status:</strong> 
                            <span style="color: ${train.status === 'On Time' ? '#28a745' : '#ffc107'}; font-weight: 600;">${train.status}</span>
                        </p>
                        <p style="margin: 4px 0;"><strong>Next Station:</strong> ${train.nextStation}</p>
                        <p style="margin: 4px 0;"><strong>ETA:</strong> ${train.eta}</p>
                    </div>
                `);

            // Store marker reference for animation
            train.marker = marker;
        });
    }

    addTracksToMap() {
        // Add track lines between major stations
        const trackRoutes = [
            { from: [28.6139, 77.2090], to: [28.4595, 77.0266], color: '#4a4a4a' }, // Delhi-Gurgaon
            { from: [28.4595, 77.0266], to: [26.9124, 75.7873], color: '#4a4a4a' }, // Gurgaon-Jaipur
            { from: [26.9124, 75.7873], to: [25.2138, 75.8648], color: '#4a4a4a' }, // Jaipur-Kota
            { from: [25.2138, 75.8648], to: [23.3315, 75.0367], color: '#4a4a4a' }  // Kota-Ratlam
        ];

        trackRoutes.forEach(route => {
            L.polyline([route.from, route.to], {
                color: route.color,
                weight: 4,
                opacity: 0.7,
                dashArray: '5, 10'
            }).addTo(this.map);
        });
    }

    startTrainAnimation() {
        setInterval(() => {
            this.trains.forEach(train => {
                if (train.marker) {
                    // Simulate train movement
                    const currentPos = train.marker.getLatLng();
                    const newLat = currentPos.lat + (Math.random() - 0.5) * 0.01;
                    const newLng = currentPos.lng + (Math.random() - 0.5) * 0.01;
                    
                    train.marker.setLatLng([newLat, newLng]);
                    train.coordinates = [newLat, newLng];
                }
            });
        }, 5000); // Update every 5 seconds
    }

    toggleMapLayer(layerType) {
        // Toggle visibility of different map layers
        console.log(`Toggling ${layerType} layer`);
        // Implementation would depend on specific layer management
    }

    setupCharts() {
        this.setupPerformanceChart();
        this.setupSimulationChart();
        // Analytics charts will be created on-demand when analytics view opens
    }

    setupPerformanceChart() {
        const ctx = document.getElementById('performanceChart');
        if (!ctx) return;

        const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(26, 115, 232, 0.4)');
        gradient.addColorStop(1, 'rgba(26, 115, 232, 0.0)');

        this.charts.performance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
                datasets: [{
                    label: 'On-Time Performance',
                    data: [95, 92, 88, 85, 90, 94, 96],
                    borderColor: '#1a73e8',
                    backgroundColor: gradient,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#1a73e8',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6
                }, {
                    label: 'Network Throughput',
                    data: [80, 85, 90, 95, 88, 82, 78],
                    borderColor: '#ff6b35',
                    backgroundColor: 'rgba(255, 107, 53, 0.1)',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.4,
                    pointBackgroundColor: '#ff6b35',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true, 
                            padding: 20,
                            font: {
                                family: 'Inter',
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#202124',
                        bodyColor: '#5f6368',
                        borderColor: '#dadce0',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: true,
                        intersect: false,
                        mode: 'index'
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        border: {
                            display: false
                        },
                        ticks: {
                            font: {
                                family: 'Inter',
                                size: 11
                            },
                            color: '#5f6368'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            color: 'rgba(218, 220, 224, 0.5)'
                        },
                        border: {
                            display: false
                        },
                        ticks: {
                            font: {
                                family: 'Inter',
                                size: 11
                            },
                            color: '#5f6368',
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }

    setupSimulationChart() {
        const ctx = document.getElementById('simulationChart');
        if (!ctx) return;

        this.charts.simulation = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Normal', 'Scenario'],
                datasets: [{
                    label: 'Average Delay (minutes)',
                    data: [5, 0],
                    backgroundColor: ['rgba(40, 167, 69, 0.8)', 'rgba(220, 53, 69, 0.8)'],
                    borderColor: ['#28a745', '#dc3545'],
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        border: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(218, 220, 224, 0.5)'
                        },
                        border: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    runSimulation() {
        if (this.simulationRunning) return;

        // Start collision avoidance visualization immediately
        this.startCollisionSim();

        this.simulationRunning = true;
        const runBtn = document.getElementById('runSimulation');
        runBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Running...';
        runBtn.disabled = true;

        // Simulate processing time
        setTimeout(() => {
            const scenarioType = document.getElementById('scenarioType').value;
            const duration = document.getElementById('disruptionDuration').value;
            
            // Calculate simulation results
            const results = this.calculateSimulationResults(scenarioType, duration);

            // Store last simulation for analytics integration
            this.analytics.lastSim = results;
            
            // Update metrics
            document.getElementById('affectedTrains').textContent = results.affectedTrains;
            document.getElementById('averageDelay').textContent = results.averageDelay + ' min';
            document.getElementById('throughputImpact').textContent = '-' + results.throughputImpact + '%';
            document.getElementById('recoveryTime').textContent = results.recoveryTime + ' hrs';

            // Update simulation chart
            this.charts.simulation.data.datasets[0].data = [5, results.averageDelay];
            this.charts.simulation.update();

            // Update Scenario Impact chart in analytics if present
            if (this.charts.scenarioImpact) {
                const baselineDelay = this.analytics?.data?.kpi?.avgDelay ?? 5;
                const baselineTph = this.analytics?.data?.kpi?.throughput ?? 68;
                const scenarioDelay = results.averageDelay;
                const scenarioTph = Math.max(0, Math.round(baselineTph * (1 - (results.throughputImpact || 0) / 100)));
                this.charts.scenarioImpact.data.datasets[0].data = [baselineDelay, baselineTph];
                this.charts.scenarioImpact.data.datasets[1].data = [scenarioDelay, scenarioTph];
                this.charts.scenarioImpact.update();
            }

            // Reset button
            runBtn.innerHTML = '<i class="fas fa-play"></i> Run Simulation';
            runBtn.disabled = false;
            this.simulationRunning = false;
        }, 3000);
    }

    calculateSimulationResults(scenario, duration) {
        // Simplified simulation logic
        const baseDelay = parseInt(duration) * 2;
        const affectedCount = Math.min(Math.floor(parseInt(duration) * 1.5), this.trains.length);
        
        return {
            affectedTrains: affectedCount,
            averageDelay: baseDelay + Math.floor(Math.random() * 10),
            throughputImpact: Math.min(parseInt(duration) * 3, 50),
            recoveryTime: Math.ceil(parseInt(duration) * 0.8)
        };
    }

    resetSimulation() {
        // Reset all simulation values
        document.getElementById('affectedTrains').textContent = '--';
        document.getElementById('averageDelay').textContent = '--';
        document.getElementById('throughputImpact').textContent = '--';
        document.getElementById('recoveryTime').textContent = '--';

        // Reset chart
        if (this.charts.simulation) {
            this.charts.simulation.data.datasets[0].data = [5, 0];
            this.charts.simulation.update();
        }

        // Reset controls
        document.getElementById('scenarioType').selectedIndex = 0;
        document.getElementById('affectedSection').selectedIndex = 0;
        document.getElementById('disruptionDuration').value = 4;
        document.getElementById('durationValue').textContent = '4 hours';

        // Reset collision visualization
        this.resetCollisionSim();
    }

    acceptRecommendation(button) {
        const recItem = button.closest('.recommendation-item');
        recItem.style.background = 'rgba(40, 167, 69, 0.1)';
        recItem.style.borderLeftColor = '#28a745';
        
        // Disable buttons
        const actions = recItem.querySelector('.rec-actions');
        actions.innerHTML = '<span style="color: #28a745; font-weight: 600;"><i class="fas fa-check"></i> Accepted</span>';
        
        // Add to audit log
        this.addToAuditLog('Recommendation accepted', recItem.querySelector('.rec-title').textContent);
    }

    dismissRecommendation(button) {
        const recItem = button.closest('.recommendation-item');
        recItem.style.opacity = '0.5';
        
        // Disable buttons
        const actions = recItem.querySelector('.rec-actions');
        actions.innerHTML = '<span style="color: #6c757d; font-weight: 600;"><i class="fas fa-times"></i> Dismissed</span>';
        
        // Add to audit log
        this.addToAuditLog('Recommendation dismissed', recItem.querySelector('.rec-title').textContent);
    }

    addToAuditLog(action, description) {
        // Add to audit trail (in a real application, this would be sent to server)
        console.log(`Audit Log: ${new Date().toISOString()} - ${action}: ${description}`);
    }

    startRealTimeUpdates() {
        this.realTimeInterval = setInterval(() => {
            this.updateRealTimeData();
        }, 30000); // Update every 30 seconds
    }

    updateRealTimeData() {
        // Simulate real-time data updates
        this.trains.forEach(train => {
            // Randomly update train positions and status
            if (Math.random() < 0.1) { // 10% chance of status change
                const statuses = ['On Time', 'Delayed'];
                train.status = statuses[Math.floor(Math.random() * statuses.length)];
                if (train.status === 'Delayed') {
                    train.delay = Math.floor(Math.random() * 30) + 1;
                } else {
                    train.delay = 0;
                }
            }

            // Update speed
            train.speed = train.speed + (Math.random() - 0.5) * 10;
            train.speed = Math.max(50, Math.min(120, train.speed)); // Keep speed between 50-120
        });

        // Update KPI values
        this.updateKPIs();
        
        // Refresh train table if visible
        if (this.currentView === 'trains') {
            this.loadTrainsData();
        }

        // Occasionally generate a random alert
        if (Math.random() < 0.08) {
            this.addRandomAlert();
        }

        // Refresh alerts view indicators
        this.updateAlertIndicators();
        if (this.currentView === 'alerts') this.renderAlerts();
    }

    updateKPIs() {
        const onTimeTrains = this.trains.filter(t => t.status === 'On Time').length;
        const onTimePercentage = ((onTimeTrains / this.trains.length) * 100).toFixed(1);
        
        // Update KPI cards
        const kpiCards = document.querySelectorAll('.kpi-card');
        if (kpiCards.length >= 2) {
            kpiCards[1].querySelector('.kpi-value').textContent = onTimePercentage + '%';
        }
    }

    updateAnalytics() {
        // Update analytics charts and data
        if (this.charts.performance) {
            // Simulate new dashboard performance data (Network Performance on dashboard)
            const newData = Array.from({length: 7}, () => Math.floor(Math.random() * 20) + 80);
            this.charts.performance.data.datasets[0].data = newData;
            this.charts.performance.update();
        }
        // Render analytics view if present
        this.renderAnalytics();
    }

    // =========================
    // Performance Analytics Methods
    // =========================
    setupAnalyticsCharts() {
        const otpCtx = document.getElementById('otpChart');
        const delayDistCtx = document.getElementById('delayDistChart');
        const throughputCtx = document.getElementById('throughputChart');
        const delayCauseCtx = document.getElementById('delayCauseChart');
        // New optional chart canvas
        const scenarioImpactCtx = document.getElementById('scenarioImpactChart');
        if (!otpCtx || !delayDistCtx || !throughputCtx || !delayCauseCtx) return;

        // On-Time Performance trend (line)
        const g = otpCtx.getContext('2d').createLinearGradient(0, 0, 0, 300);
        g.addColorStop(0, 'rgba(26, 115, 232, 0.35)');
        g.addColorStop(1, 'rgba(26, 115, 232, 0.0)');
        this.charts.otp = new Chart(otpCtx, {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'On-Time %', data: [], borderColor: '#1a73e8', backgroundColor: g, fill: true, borderWidth: 3, tension: 0.35, pointRadius: 3 }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } } }, plugins: { legend: { display: false } }, interaction: { intersect: false, mode: 'index' } }
        });

        // Delay Distribution (stacked bar per year)
        this.charts.delayDist = new Chart(delayDistCtx, {
            type: 'bar',
            data: { labels: [], datasets: [] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: { x: { stacked: true }, y: { beginAtZero: true, stacked: true } }
            }
        });

        // Throughput Over Time (line)
        const g2 = throughputCtx.getContext('2d').createLinearGradient(0, 0, 0, 300);
        g2.addColorStop(0, 'rgba(40, 167, 69, 0.35)');
        g2.addColorStop(1, 'rgba(40, 167, 69, 0.0)');
        this.charts.throughput = new Chart(throughputCtx, {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Throughput (tph)', data: [], borderColor: '#28a745', backgroundColor: g2, fill: true, borderWidth: 3, tension: 0.35, pointRadius: 3 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } }, interaction: { intersect: false, mode: 'index' } }
        });

        // Delay Causes Breakdown (doughnut)
        this.charts.delayCause = new Chart(delayCauseCtx, {
            type: 'doughnut',
            data: { labels: [], datasets: [{ data: [], backgroundColor: ['#dc3545','#ff9800','#1a73e8','#6f42c1','#9e9e9e'], borderWidth: 1 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, cutout: '55%' }
        });

        if (scenarioImpactCtx) {
            this.charts.scenarioImpact = new Chart(scenarioImpactCtx, {
                type: 'bar',
                data: {
                    labels: ['Avg Delay (min)', 'Throughput (tph)'],
                    datasets: [
                        { label: 'Baseline', data: [0, 0], backgroundColor: 'rgba(26,115,232,0.7)', borderColor: '#1a73e8', borderWidth: 2, borderRadius: 6 },
                        { label: 'Simulation', data: [0, 0], backgroundColor: 'rgba(220,53,69,0.7)', borderColor: '#dc3545', borderWidth: 2, borderRadius: 6 }
                    ]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }
            });
        }

        // Populate charts with yearly mock data
        const data = this.generateAnalyticsData();
        this.analytics.data = data;

        // OTP: YoY
        this.charts.otp.data.labels = data.period === 'yearly' ? data.years : data.labels;
        this.charts.otp.data.datasets[0].data = data.period === 'yearly' ? data.onTimeYoY : data.onTimeSeries;
        this.charts.otp.update();

        // Delay Distribution: stacked per year if yearly, else single distribution
        if (data.period === 'yearly') {
            const colors = ['#4caf50', '#ffc107', '#ff6b35', '#fd7e14', '#dc3545'];
            this.charts.delayDist.data.labels = data.years;
            this.charts.delayDist.data.datasets = data.delayBins.map((bin, idx) => ({
                label: bin,
                data: data.delayDistYoY.map(row => row.counts[idx]),
                backgroundColor: colors[idx] || '#777',
                borderColor: colors[idx] || '#777',
                borderWidth: 1,
                stack: 'dist'
            }));
        } else {
            this.charts.delayDist.data.labels = data.delayBins;
            this.charts.delayDist.data.datasets = [{ label: 'Trains', data: data.delayCounts, backgroundColor: '#ff6b35', borderColor: '#ff6b35', borderWidth: 2, borderRadius: 8 }];
        }
        this.charts.delayDist.update();

        // Throughput: YoY
        this.charts.throughput.data.labels = data.period === 'yearly' ? data.years : data.labels;
        this.charts.throughput.data.datasets[0].data = data.period === 'yearly' ? data.throughputYoY : data.throughputSeries;
        this.charts.throughput.update();

        // Delay Causes: use latest year snapshot if yearly
        this.charts.delayCause.data.labels = data.causesLabels;
        if (data.period === 'yearly') {
            const latestYear = data.years[data.years.length - 1];
            this.charts.delayCause.data.datasets[0].data = data.causesYoY[latestYear] || [];
        } else {
            this.charts.delayCause.data.datasets[0].data = data.causesData;
        }
        this.charts.delayCause.update();

        // Scenario Impact
        if (this.charts.scenarioImpact) {
            const baselineDelay = data.kpi.avgDelay;
            const baselineTph = data.kpi.throughput;
            const simDelay = this.analytics?.lastSim?.averageDelay || 0;
            const simTph = this.analytics?.lastSim ? Math.max(0, Math.round(baselineTph * (1 - (this.analytics.lastSim.throughputImpact || 0) / 100))) : 0;
            this.charts.scenarioImpact.data.datasets[0].data = [baselineDelay, baselineTph];
            this.charts.scenarioImpact.data.datasets[1].data = [simDelay, simTph];
            this.charts.scenarioImpact.update();
        }
    }

    generateAnalyticsData() {
        // Build mock analytics data; if period is 'yearly', return YoY trends
        const period = this.analytics.period || 'yearly';
        const corridor = this.analytics.corridor || 'all';
        const trainType = this.analytics.type || 'all';
        const rand = (min, max) => Math.random() * (max - min) + min;
        const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

        if (period === 'yearly') {
            const nowYear = new Date().getFullYear();
            const years = Array.from({ length: 8 }, (_, i) => nowYear - 7 + i);

            // Base hypothetical trends (pre-jitter), reflecting events like 2020 dip
            const baseOnTime = { 2018: 88, 2019: 89, 2020: 83, 2021: 86, 2022: 90, 2023: 92, 2024: 93, 2025: 94 };
            const baseTph = { 2018: 62, 2019: 65, 2020: 52, 2021: 58, 2022: 66, 2023: 70, 2024: 73, 2025: 75 };
            const baseAvgDelay = { 2018: 9.2, 2019: 8.7, 2020: 11.5, 2021: 10.1, 2022: 7.6, 2023: 6.3, 2024: 5.9, 2025: 5.4 };

            // Corridor/type modifiers
            let onTimeDelta = 0, delayDelta = 0, tphDelta = 0;
            if (corridor === 'JP-KOTA') { onTimeDelta -= 1.5; delayDelta += 0.6; }
            if (corridor === 'KOTA-RTM') { onTimeDelta -= 1.0; delayDelta += 0.4; tphDelta -= 3; }
            if (trainType === 'Freight') { onTimeDelta += 1.0; delayDelta -= 0.5; tphDelta -= 8; }
            if (trainType === 'Express') { onTimeDelta += 0.5; delayDelta -= 0.3; }

            const onTimeYoY = years.map(y => clamp((baseOnTime[y] ?? 90) + onTimeDelta + rand(-0.6, 0.6), 72, 99));
            const throughputYoY = years.map(y => Math.round(clamp((baseTph[y] ?? 65) + tphDelta + rand(-1.5, 1.5), 35, 95)));
            const avgDelayYoY = years.map(y => Math.round(clamp((baseAvgDelay[y] ?? 8.5) + delayDelta + rand(-0.4, 0.4), 3.5, 15.0) * 10) / 10);

            // Delay distribution per year across bins (0–5,6–10,11–20,21–30,31+)
            const delayBins = ['0–5', '6–10', '11–20', '21–30', '31+'];
            const delayDistYoY = years.map((y, idx) => {
                const avg = avgDelayYoY[idx];
                // weights influenced by avg delay
                let w = [0.5, 0.27, 0.15, 0.06, 0.02];
                const factor = clamp((avg - 6) / 6, -0.6, 1.2); // >6 pushes to higher bins
                w = [
                    w[0] - 0.18 * factor,
                    w[1] - 0.06 * factor,
                    w[2] + 0.16 * factor,
                    w[3] + 0.06 * factor,
                    w[4] + 0.02 * factor
                ].map(v => Math.max(0.01, v));
                const sum = w.reduce((a,b)=>a+b,0);
                w = w.map(v => v / sum);
                const total = 1000; // hypothetical trains sampled per year for distribution
                const counts = w.map(v => Math.round(v * total));
                return { year: y, counts };
            });

            // Delay causes per year (numbers summing to ~100)
            const causesLabels = ['Signal','Maintenance','Congestion','Weather','Other'];
            const causesYoY = {};
            years.forEach((y, i) => {
                const base = [24, 18, 32, 16, 10];
                // Adjust congestion higher in 2020-2021? actually could be lower; keep simple: maintenance higher in 2020-2021
                if (y === 2020 || y === 2021) { base[1] += 6; base[2] -= 4; }
                // Weather spikes some years
                if (y === 2019 || y === 2023) { base[3] += 4; }
                const jittered = base.map(v => Math.max(6, Math.round(v + rand(-3, 3))));
                const total = jittered.reduce((a,b)=>a+b,0);
                // normalize to 100
                const norm = jittered.map((v, idx) => idx < jittered.length - 1 ? Math.round(v * 100 / total) : 100 - Math.round(jittered.slice(0,-1).reduce((a,b)=>a+b,0) * 100 / total));
                causesYoY[y] = norm;
            });

            // KPIs from latest year
            const latestIdx = years.length - 1;
            const kpi = {
                onTime: onTimeYoY[latestIdx],
                onTimeChange: Math.round((onTimeYoY[latestIdx] - onTimeYoY[Math.max(0, latestIdx - 1)]) * 10) / 10,
                avgDelay: avgDelayYoY[latestIdx],
                avgDelayChange: Math.round((avgDelayYoY[latestIdx] - avgDelayYoY[Math.max(0, latestIdx - 1)]) * 10) / 10,
                throughput: throughputYoY[latestIdx],
                throughputChange: throughputYoY[latestIdx] - throughputYoY[Math.max(0, latestIdx - 1)],
                cancelled: Math.max(0, Math.round((100 - onTimeYoY[latestIdx]) * 0.25)),
                cancelledChange: Math.round((onTimeYoY[Math.max(0, latestIdx - 1)] - onTimeYoY[latestIdx]) * 0.25)
            };

            return {
                period: 'yearly',
                years,
                onTimeYoY,
                throughputYoY,
                avgDelayYoY,
                delayBins,
                delayDistYoY,
                causesLabels,
                causesYoY,
                kpi
            };
        }

        // Fallback to existing non-yearly mock generation (daily/weekly/monthly)
        // ...existing code from previous implementation generating labels, onTimeSeries, delayCounts, throughputSeries, causesData, kpi...
        const now = new Date();
        let labels = [];
        if (period === '24h') {
            labels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2,'0')}:00`);
        } else if (period === '7d') {
            const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
            labels = Array.from({ length: 7 }, (_, i) => days[(now.getDay() - (6 - i) + 7) % 7]);
        } else {
            labels = Array.from({ length: 30 }, (_, i) => `${i + 1}`);
        }

        let baseOnTime = 92, baseDelay = 7.2, baseTph = 68;
        if (corridor === 'JP-KOTA') { baseOnTime -= 3; baseDelay += 1.5; }
        if (corridor === 'KOTA-RTM') { baseOnTime -= 2; baseDelay += 1.0; baseTph -= 5; }
        if (trainType === 'Freight') { baseOnTime += 2; baseDelay -= 1.2; baseTph -= 10; }
        if (trainType === 'Express') { baseOnTime += 1; baseDelay -= 0.8; }

        const onTimeSeries = labels.map((_, i) => Math.round(clamp(baseOnTime + Math.sin(i/2)*2 + rand(-2.5, 2.5), 70, 99)*10)/10);
        const delaySeries = labels.map((_, i) => Math.round(clamp(baseDelay + Math.cos(i/3)*1.2 + rand(-1.5, 1.5), 2, 15)*10)/10);
        const throughputSeries = labels.map((_, i) => Math.round(clamp(baseTph + Math.sin(i/1.5)*6 + rand(-8, 8), 20, 100)));

        const delayBins = ['0–5', '6–10', '11–20', '21–30', '31+'];
        const totalTrains = 300;
        const weights = [0.46, 0.28, 0.16, 0.07, 0.03];
        const adj = baseDelay / 10;
        let w = [weights[0]-0.05*adj, weights[1]-0.02*adj, weights[2]+0.04*adj, weights[3]+0.02*adj, weights[4]+0.01*adj];
        const norm = w.reduce((a,b)=>a+b,0);
        const delayCounts = w.map(x => Math.max(0, Math.round((x/norm) * totalTrains)));

        const causesLabels = ['Signal','Maintenance','Congestion','Weather','Other'];
        const causeBase = [22, 18, 34, 16, 10];
        const causesData = causeBase.map(v => Math.max(5, Math.round(v + rand(-5, 5))));

        const avgOnTime = Math.round(onTimeSeries.reduce((a,b)=>a+b,0)/onTimeSeries.length*10)/10;
        const avgDelay = Math.round(delaySeries.reduce((a,b)=>a+b,0)/delaySeries.length*10)/10;
        const avgTph = Math.round(throughputSeries.reduce((a,b)=>a+b,0)/throughputSeries.length);
        const cancelled = Math.max(0, Math.round((100 - avgOnTime) * 0.3));

        const half = Math.floor(labels.length/2) || 1;
        const pctChange = (arr) => {
            const a = arr.slice(0, half).reduce((x,y)=>x+y,0) / half;
            const b = arr.slice(-half).reduce((x,y)=>x+y,0) / half;
            return Math.round((b - a) * 10) / 10;
        };
        const onTimeChange = pctChange(onTimeSeries);
        const delayChange = pctChange(delaySeries);
        const tphChange = pctChange(throughputSeries);
        const cancelledChange = Math.round(-onTimeChange * 0.3);

        return {
            period,
            labels,
            onTimeSeries,
            delaySeries,
            throughputSeries,
            delayBins,
            delayCounts,
            causesLabels,
            causesData,
            kpi: {
                onTime: avgOnTime,
                onTimeChange,
                avgDelay,
                avgDelayChange: delayChange,
                throughput: avgTph,
                throughputChange: tphChange,
                cancelled,
                cancelledChange
            }
        };
    }

    renderAnalytics() {
        const container = document.getElementById('analytics');
        if (!container) return; // view not present in DOM

        // Ensure charts exist
        if (!this.charts.otp || !this.charts.delayDist || !this.charts.throughput || !this.charts.delayCause) {
            this.setupAnalyticsCharts();
        }
        if (!this.charts.otp) return; // canvas may not be visible yet

        // Generate data
        const data = this.generateAnalyticsData();
        this.analytics.data = data;

        // Update KPIs
        const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        setText('analyticsKpiOnTime', (data.kpi.onTime).toFixed ? data.kpi.onTime.toFixed(1) + '%' : (data.kpi.onTime + '%'));
        setText('analyticsOnTimeChange', `${data.kpi.onTimeChange >= 0 ? '+' : ''}${data.kpi.onTimeChange}% vs prev.`);
        setText('analyticsKpiAvgDelay', (data.kpi.avgDelay).toFixed ? data.kpi.avgDelay.toFixed(1) + ' min' : (data.kpi.avgDelay + ' min'));
        setText('analyticsAvgDelayChange', `${data.kpi.avgDelayChange >= 0 ? '+' : ''}${data.kpi.avgDelayChange} min vs prev.`);
        setText('analyticsKpiThroughput', data.kpi.throughput + ' tph');
        setText('analyticsThroughputChange', `${data.kpi.throughputChange >= 0 ? '+' : ''}${data.kpi.throughputChange} vs prev.`);
        setText('analyticsKpiCancelled', String(data.kpi.cancelled));
        setText('analyticsCancelledChange', `${data.kpi.cancelledChange >= 0 ? '+' : ''}${data.kpi.cancelledChange} vs prev.`);

        // OTP
        this.charts.otp.data.labels = data.period === 'yearly' ? data.years : data.labels;
        this.charts.otp.data.datasets[0].data = data.period === 'yearly' ? data.onTimeYoY : data.onTimeSeries;
        this.charts.otp.update();

        // Delay Distribution
        if (data.period === 'yearly') {
            const colors = ['#4caf50', '#ffc107', '#ff6b35', '#fd7e14', '#dc3545'];
            this.charts.delayDist.data.labels = data.years;
            this.charts.delayDist.data.datasets = data.delayBins.map((bin, idx) => ({
                label: bin,
                data: data.delayDistYoY.map(row => row.counts[idx]),
                backgroundColor: colors[idx] || '#777',
                borderColor: colors[idx] || '#777',
                borderWidth: 1,
                stack: 'dist'
            }));
        } else {
            this.charts.delayDist.data.labels = data.delayBins;
            this.charts.delayDist.data.datasets = [{ label: 'Trains', data: data.delayCounts, backgroundColor: '#ff6b35', borderColor: '#ff6b35', borderWidth: 2, borderRadius: 8 }];
        }
        this.charts.delayDist.update();

        // Throughput
        this.charts.throughput.data.labels = data.period === 'yearly' ? data.years : data.labels;
        this.charts.throughput.data.datasets[0].data = data.period === 'yearly' ? data.throughputYoY : data.throughputSeries;
        this.charts.throughput.update();

        // Causes
        this.charts.delayCause.data.labels = data.causesLabels;
        if (data.period === 'yearly') {
            const latestYear = data.years[data.years.length - 1];
            this.charts.delayCause.data.datasets[0].data = data.causesYoY[latestYear] || [];
        } else {
            this.charts.delayCause.data.datasets[0].data = data.causesData;
        }
        this.charts.delayCause.update();

        // Scenario Impact
        if (this.charts.scenarioImpact) {
            const baselineDelay = data.kpi.avgDelay;
            const baselineTph = data.kpi.throughput;
            let simDelay = 0, simTph = 0;
            if (this.analytics.lastSim) {
                simDelay = this.analytics.lastSim.averageDelay;
                simTph = Math.max(0, Math.round(baselineTph * (1 - (this.analytics.lastSim.throughputImpact || 0) / 100)));
            }
            this.charts.scenarioImpact.data.datasets[0].data = [baselineDelay, baselineTph];
            this.charts.scenarioImpact.data.datasets[1].data = [simDelay, simTph];
            this.charts.scenarioImpact.update();
        }
    }

    applyLastSimToAnalytics() {
        if (!this.analytics.lastSim) {
            alert('Run a simulation first to generate results.');
            return;
        }
        // Ensure analytics charts/data are available
        if (!this.analytics.data) {
            this.renderAnalytics();
        }
        const baselineDelay = this.analytics?.data?.kpi?.avgDelay ?? 5;
        const baselineTph = this.analytics?.data?.kpi?.throughput ?? 68;
        const sim = this.analytics.lastSim;
        const scenarioDelay = sim.averageDelay;
        const scenarioTph = Math.max(0, Math.round(baselineTph * (1 - (sim.throughputImpact || 0) / 100)));
        if (this.charts.scenarioImpact) {
            this.charts.scenarioImpact.data.datasets[0].data = [baselineDelay, baselineTph];
            this.charts.scenarioImpact.data.datasets[1].data = [scenarioDelay, scenarioTph];
            this.charts.scenarioImpact.update();
        }
    }

    // =========================
    // Schedule Planning Methods
    // =========================
    generateMockSchedules(count = 250) {
        // Produce realistic mock schedule data for UI-only usage
        const pad = (n) => String(n).padStart(2, '0');
        const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
        const pick = (arr) => arr[rand(0, arr.length - 1)];
        const uniqNums = new Set();

        const stationNames = (this.stations && this.stations.length)
            ? this.stations.map(s => s.name)
            : ['Delhi Junction', 'Gurgaon', 'Jaipur Junction', 'Kota Junction', 'Ratlam Junction', 'Ajmer', 'Alwar', 'Sawai Madhopur'];

        const namePartsA = ['Shatabdi', 'Rajdhani', 'Intercity', 'Jan Shatabdi', 'Garib Rath', 'Duronto', 'Humsafar', 'Tejas', 'Superfast', 'Passenger'];
        const namePartsB = ['Express', 'Special', 'SF', 'Mail', 'Local'];
        const statusPool = [
            ...Array(70).fill('Scheduled'),
            ...Array(18).fill('On Time'),
            ...Array(10).fill('Delayed'),
            ...Array(2).fill('Cancelled')
        ];

        const daysTemplates = [
            'Daily',
            'Mon, Tue, Wed, Thu, Fri',
            'Sat, Sun',
            'Mon, Wed, Fri',
            'Tue, Thu, Sat'
        ];

        const items = [];
        for (let i = 0; i < count; i++) {
            // Unique-ish train numbers in demo range
            let no;
            do { no = String(12000 + rand(1, 7999)); } while (uniqNums.has(no));
            uniqNums.add(no);

            // Route
            let origin, destination;
            do {
                origin = pick(stationNames);
                destination = pick(stationNames);
            } while (destination === origin);

            // Times
            const depH = rand(4, 23);
            const depM = rand(0, 59);
            const travelMin = rand(60, 8 * 60); // 1–8 hours
            const depMinTotal = depH * 60 + depM;
            const arrMinTotal = depMinTotal + travelMin;
            const arrH = Math.floor((arrMinTotal % (24 * 60)) / 60);
            const arrM = arrMinTotal % 60;
            const departure = `${pad(depH)}:${pad(depM)}`;
            const arrival = `${pad(arrH)}:${pad(arrM)}`;

            // Name
            const name = `${pick(namePartsA)} ${pick(namePartsB)}`;

            // Status
            const status = pick(statusPool);

            // Platform 1–12
            const platform = String(rand(1, 12));

            // Days or specific date (20% use an explicit date within next 2 weeks)
            let days = '';
            let date = '';
            if (Math.random() < 0.2) {
                const d = new Date();
                d.setDate(d.getDate() + rand(0, 14));
                date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
            } else {
                days = pick(daysTemplates);
            }

            items.push({
                trainNo: no,
                name,
                origin,
                destination,
                departure,
                arrival,
                days,
                date,
                status,
                platform
            });
        }
        return items;
    }

    async loadSchedules() {
        try {
            if (this.scheduleState.loaded && this.scheduleState.raw.length) {
                this.renderScheduleTable(true);
                return;
            }

            // Show loading state in UI
            const tbody = document.getElementById('scheduleTableBody');
            const emptyState = document.getElementById('scheduleEmptyState');
            const countEl = document.getElementById('scheduleCount');
            if (tbody) tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:16px; color: var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Loading schedules...</td></tr>`;
            if (emptyState) emptyState.style.display = 'none';
            if (countEl) countEl.textContent = 'Loading...';

            // Try to fetch schedules.json (preferred)
            let normalized = [];
            try {
                const res = await fetch(`schedules.json?v=${Date.now()}`, { cache: 'no-store' });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                // If the file is huge, this may take a moment. Parse JSON.
                const raw = await res.json();
                let items = Array.isArray(raw)
                    ? raw
                    : (raw?.schedules || raw?.data || raw?.items || raw?.records || []);
                if (!Array.isArray(items)) items = [];

                normalized = items.map(it => this.normalizeSchedule(it)).filter(Boolean);
            } catch (fetchErr) {
                console.error('Failed to fetch schedules.json:', fetchErr);
                // Do not generate mock data here since user asked to load from schedules.json.
                // We will show an error state below.
            }

            if (!normalized.length) {
                // Show error and empty state
                if (tbody) tbody.innerHTML = '';
                if (emptyState) emptyState.style.display = 'block';
                if (countEl) countEl.textContent = 'Failed to load schedules';
                return;
            }

            this.schedules = normalized;
            this.scheduleState.raw = normalized;
            this.scheduleState.loaded = true;

            // Initialize filters
            this.populateScheduleFilters();

            // Initialize page size from UI
            const pageSizeSel = document.getElementById('schedulePageSize');
            if (pageSizeSel) this.scheduleState.pageSize = parseInt(pageSizeSel.value, 10) || 25;

            // First render
            this.applyScheduleFilters();
        } catch (err) {
            console.error('Failed to load schedules:', err);
            const tbody = document.getElementById('scheduleTableBody');
            const emptyState = document.getElementById('scheduleEmptyState');
            const countEl = document.getElementById('scheduleCount');
            if (tbody) tbody.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            if (countEl) countEl.textContent = 'Failed to load schedules';
        }
    }

    normalizeSchedule(item) {
        try {
            const trainNo = item.trainNo || item.train_no || item.trainNumber || item.train_number || item.id || item.number || '';
            const name = item.name || item.trainName || item.train_name || '';

            const origin = item.origin || item.from || item.source || item.start || item.startStation || item.start_station || item.originStation || item.from_station || item.route?.origin || '';
            const originName = typeof origin === 'object' ? (origin.name || origin.code || origin.id || '') : origin;

            const destination = item.destination || item.to || item.dest || item.end || item.endStation || item.end_station || item.destinationStation || item.to_station || item.route?.destination || '';
            const destName = typeof destination === 'object' ? (destination.name || destination.code || destination.id || '') : destination;

            const dep = item.departure || item.departureTime || item.departure_time || item.dep_time || item.start_time || item.departsAt || '';
            const arr = item.arrival || item.arrivalTime || item.arrival_time || item.arrivalAt || '';

            let days = item.days || item.run_days || item.runDays || item.serviceDays || item.runningDays || item.date || item.serviceDate || '';
            // Convert to readable string
            let daysStr = '';
            if (Array.isArray(days)) {
                daysStr = days.join(', ');
            } else if (typeof days === 'string') {
                daysStr = days;
            } else if (days && typeof days === 'object') {
                // e.g., {Mon:true, Tue:false,...}
                daysStr = Object.keys(days).filter(k => days[k]).join(', ');
            }

            const status = item.status || 'Scheduled';
            const platform = item.platform || item.platformNo || item.platform_no || item.plat || '-';

            return {
                trainNo: String(trainNo),
                name: String(name),
                origin: String(originName),
                destination: String(destName),
                departure: String(dep),
                arrival: String(arr),
                days: daysStr,
                date: (typeof item.date === 'string') ? item.date : (typeof item.serviceDate === 'string' ? item.serviceDate : ''),
                status: String(status),
                platform: String(platform)
            };
        } catch (e) {
            return null;
        }
    }

    populateScheduleFilters() {
        const originSel = document.getElementById('scheduleOrigin');
        const destSel = document.getElementById('scheduleDestination');
        if (!originSel || !destSel) return;

        const origins = this.uniqueSorted(this.schedules.map(s => s.origin).filter(Boolean));
        const dests = this.uniqueSorted(this.schedules.map(s => s.destination).filter(Boolean));

        // Clear then add options
        originSel.innerHTML = '<option value="">All</option>' + origins.map(o => `<option value="${this.escapeHtml(o)}">${this.escapeHtml(o)}</option>`).join('');
        destSel.innerHTML = '<option value="">All</option>' + dests.map(d => `<option value="${this.escapeHtml(d)}">${this.escapeHtml(d)}</option>`).join('');
    }

    applyScheduleFilters(fromChangeEvent = false) {
        const originSel = document.getElementById('scheduleOrigin');
        const destSel = document.getElementById('scheduleDestination');
        const statusSel = document.getElementById('scheduleStatus');
        const dateInput = document.getElementById('scheduleDate');

        if (originSel) this.scheduleState.origin = originSel.value || '';
        if (destSel) this.scheduleState.destination = destSel.value || '';
        if (statusSel) this.scheduleState.status = statusSel.value || '';
        if (dateInput) this.scheduleState.date = dateInput.value || '';

        if (!fromChangeEvent) this.scheduleState.page = 1;

        // Filter
        const filtered = this.scheduleState.raw.filter(item => {
            // Search
            const hay = `${item.trainNo} ${item.name} ${item.origin} ${item.destination}`.toLowerCase();
            const needle = (this.scheduleState.search || '').toLowerCase();
            if (needle && !hay.includes(needle)) return false;

            // Origin
            if (this.scheduleState.origin && item.origin !== this.scheduleState.origin) return false;

            // Destination
            if (this.scheduleState.destination && item.destination !== this.scheduleState.destination) return false;

            // Status
            if (this.scheduleState.status && item.status !== this.scheduleState.status) return false;

            // Date/Days: if a specific date selected, match by item.date equal or day-of-week contained in item.days
            if (this.scheduleState.date) {
                const selected = new Date(this.scheduleState.date + 'T00:00:00');
                if (isFinite(selected)) {
                    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
                    const dow = days[selected.getDay()];
                    const hasDate = (item.date && item.date.startsWith(this.scheduleState.date));
                    const daysStr = (item.days || '').toLowerCase();
                    if (!hasDate && daysStr) {
                        const short = dow.slice(0,3).toLowerCase();
                        if (!daysStr.includes(dow.toLowerCase()) && !daysStr.includes(short)) {
                            return false;
                        }
                    } else if (!hasDate && !daysStr) {
                        return false;
                    }
                }
            }

            return true;
        });

        this.scheduleState.filtered = filtered;
        this.renderScheduleTable();
    }

    resetScheduleFilters() {
        const scheduleSearch = document.getElementById('scheduleSearch');
        const originSel = document.getElementById('scheduleOrigin');
        const destSel = document.getElementById('scheduleDestination');
        const statusSel = document.getElementById('scheduleStatus');
        const dateInput = document.getElementById('scheduleDate');

        if (scheduleSearch) scheduleSearch.value = '';
        if (originSel) originSel.value = '';
        if (destSel) destSel.value = '';
        if (statusSel) statusSel.value = '';
        if (dateInput) dateInput.value = '';

        this.scheduleState.search = '';
        this.scheduleState.origin = '';
        this.scheduleState.destination = '';
        this.scheduleState.status = '';
        this.scheduleState.date = '';
        this.scheduleState.page = 1;

        this.applyScheduleFilters();
    }

    renderScheduleTable(forceRecalc = false) {
        // Recalculate filtered if needed
        if (forceRecalc && (!this.scheduleState.filtered || !this.scheduleState.filtered.length)) {
            this.scheduleState.filtered = this.scheduleState.raw.slice();
        }

        const tbody = document.getElementById('scheduleTableBody');
        const emptyState = document.getElementById('scheduleEmptyState');
        const pageLabel = document.getElementById('schedulePageLabel');
        const countEl = document.getElementById('scheduleCount');
        const prevBtn = document.getElementById('schedulePrev');
        const nextBtn = document.getElementById('scheduleNext');

        if (!tbody) return;

        const total = this.scheduleState.filtered.length;
        const totalPages = Math.max(1, Math.ceil(total / this.scheduleState.pageSize));
        this.scheduleState.page = Math.min(this.scheduleState.page, totalPages);
        const startIdx = (this.scheduleState.page - 1) * this.scheduleState.pageSize;
        const endIdx = Math.min(total, startIdx + this.scheduleState.pageSize);
        const pageItems = this.scheduleState.filtered.slice(startIdx, endIdx);

        // Update labels and buttons
        if (pageLabel) pageLabel.textContent = `Page ${total ? this.scheduleState.page : 0}/${totalPages}`;
        if (countEl) countEl.textContent = total ? `Showing ${startIdx + 1}–${endIdx} of ${total}` : 'No schedules';
        if (prevBtn) prevBtn.disabled = this.scheduleState.page <= 1 || total === 0;
        if (nextBtn) nextBtn.disabled = this.scheduleState.page >= totalPages || total === 0;

        if (total === 0) {
            tbody.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }
        if (emptyState) emptyState.style.display = 'none';

        const rowsHtml = pageItems.map(item => {
            const statusClass = (item.status || '').toLowerCase().replace(/\s+/g, '-');
            return `
                <tr>
                    <td><strong>${this.escapeHtml(item.trainNo)}</strong></td>
                    <td>${this.escapeHtml(item.name)}</td>
                    <td>${this.escapeHtml(item.origin)}</td>
                    <td>${this.escapeHtml(item.departure)}</td>
                    <td>${this.escapeHtml(item.destination)}</td>
                    <td>${this.escapeHtml(item.arrival)}</td>
                    <td>${this.escapeHtml(item.date || item.days || '')}</td>
                    <td><span class="status-badge ${statusClass}">${this.escapeHtml(item.status)}</span></td>
                    <td>${this.escapeHtml(item.platform)}</td>
                </tr>
            `;
        }).join('');

        tbody.innerHTML = rowsHtml;
    }

    exportSchedule() {
        // Export current filtered page (or all filtered?) Let's export all filtered
        const items = this.scheduleState.filtered.length ? this.scheduleState.filtered : this.scheduleState.raw;
        if (!items.length) return;
        const headers = ['Train No.','Name','Origin','Departure','Destination','Arrival','Days/Date','Status','Platform'];
        const escapeCsv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const rows = items.map(i => [i.trainNo, i.name, i.origin, i.departure, i.destination, i.arrival, (i.date || i.days || ''), i.status, i.platform].map(escapeCsv).join(','));
        const csv = [headers.map(escapeCsv).join(','), ...rows].join('\r\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `schedule_export_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    // Dashboard export chooser
    exportDashboard() {
        try {
            // Simple chooser: OK = PDF, Cancel = CSV
            const asPdf = window.confirm('Export dashboard as PDF?\nClick Cancel to export as CSV.');
            if (asPdf) {
                this.exportDashboardPDF();
            } else {
                this.exportDashboardCSV();
            }
        } catch (e) {
            console.error('Dashboard export failed:', e);
            alert('Failed to export dashboard. Please try again.');
        }
    }

    // Collect dashboard data from DOM and charts
    _collectDashboardData() {
        const scope = document.getElementById('dashboard');
        if (!scope) return null;

        // KPIs
        const kpis = Array.from(scope.querySelectorAll('.kpi-card')).map(card => ({
            label: (card.querySelector('.kpi-label')?.textContent || '').trim(),
            value: (card.querySelector('.kpi-value')?.textContent || '').trim(),
            change: (card.querySelector('.kpi-change')?.textContent || '').trim()
        }));

        // Network overview
        const network = Array.from(scope.querySelectorAll('.network-overview .network-item')).map(item => {
            const name = (item.querySelector('span:nth-child(2)')?.textContent || '').trim();
            const count = (item.querySelector('.network-count')?.textContent || '').trim();
            const statusEl = item.querySelector('.network-status');
            let status = 'Unknown';
            if (statusEl?.classList.contains('green')) status = 'Normal';
            else if (statusEl?.classList.contains('yellow')) status = 'Reduced';
            else if (statusEl?.classList.contains('red')) status = 'Issue';
            return { name, count, status };
        });

        // AI recommendations
        const recommendations = Array.from(scope.querySelectorAll('.recommendation-list .recommendation-item')).map(item => ({
            title: (item.querySelector('.rec-title')?.textContent || '').trim(),
            desc: (item.querySelector('.rec-desc')?.textContent || '').trim(),
            time: (item.querySelector('.rec-time')?.textContent || '').trim()
        }));

        // Performance chart data and image
        let chart = this.charts?.performance || null;
        const chartData = chart ? {
            labels: (chart.data?.labels || []).slice(),
            datasets: (chart.data?.datasets || []).map(ds => ({ label: ds.label, data: (ds.data || []).slice() }))
        } : null;
        const chartImage = chart && typeof chart.toBase64Image === 'function' ? chart.toBase64Image() : null;

        return { kpis, network, recommendations, chartData, chartImage };
    }

    exportDashboardCSV() {
        const data = this._collectDashboardData();
        if (!data) { alert('Dashboard is not available.'); return; }
        const lines = [];
        const esc = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';

        // Header
        lines.push('"Operations Dashboard Report"');
        lines.push(`"Generated","${new Date().toLocaleString('en-IN')}"`);
        lines.push('');

        // KPIs
        lines.push('"KPIs"');
        lines.push(['Label','Value','Change'].map(esc).join(','));
        data.kpis.forEach(k => lines.push([k.label, k.value, k.change].map(esc).join(',')));
        lines.push('');

        // Network Overview
        lines.push('"Network Overview"');
        lines.push(['Location','Status','Trains'].map(esc).join(','));
        data.network.forEach(n => lines.push([n.name, n.status, n.count].map(esc).join(',')));
        lines.push('');

        // AI Recommendations
        lines.push('"AI Recommendations"');
        lines.push(['Title','Description','When'].map(esc).join(','));
        data.recommendations.forEach(r => lines.push([r.title, r.desc, r.time].map(esc).join(',')));
        lines.push('');

        // Performance Chart dataset
        if (data.chartData) {
            lines.push('"Network Performance (Chart)"');
            // labels row
            lines.push(['Labels', ...data.chartData.labels].map(esc).join(','));
            data.chartData.datasets.forEach(ds => {
                lines.push([ds.label, ...ds.data].map(esc).join(','));
            });
            lines.push('');
        }

        const csv = lines.join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dashboard_report_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    async exportDashboardPDF() {
        const data = this._collectDashboardData();
        if (!data) { alert('Dashboard is not available.'); return; }
        try {
            const { jsPDF } = window.jspdf || {};
            if (!jsPDF) { alert('PDF library not loaded.'); return; }
            const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
            const pageW = doc.internal.pageSize.getWidth();
            const pageH = doc.internal.pageSize.getHeight();
            const margin = 40;
            let y = margin;

            // Title
            doc.setFont('helvetica','bold');
            doc.setFontSize(16);
            doc.text('Operations Control Dashboard Report', margin, y);
            y += 20;
            doc.setFont('helvetica','normal');
            doc.setFontSize(10);
            doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, margin, y);
            y += 16;

            const addSectionTitle = (title) => {
                if (y > pageH - margin - 20) { doc.addPage(); y = margin; }
                doc.setFont('helvetica','bold');
                doc.setFontSize(12);
                doc.text(title, margin, y);
                y += 12;
                doc.setFont('helvetica','normal');
                doc.setFontSize(10);
            };

            // KPIs
            addSectionTitle('KPIs');
            data.kpis.forEach(k => {
                if (y > pageH - margin - 14) { doc.addPage(); y = margin; }
                doc.text(`${k.label}: ${k.value}${k.change ? ' ('+k.change+')' : ''}`, margin, y);
                y += 14;
            });
            y += 6;

            // Network Overview
            addSectionTitle('Network Overview');
            data.network.forEach(n => {
                if (y > pageH - margin - 14) { doc.addPage(); y = margin; }
                doc.text(`${n.name}: ${n.status} - ${n.count}`, margin, y);
                y += 14;
            });
            y += 6;

            // AI Recommendations
            addSectionTitle('AI Recommendations');
            data.recommendations.forEach(r => {
                if (y > pageH - margin - 28) { doc.addPage(); y = margin; }
                doc.text(`• ${r.title} – ${r.desc} (${r.time})`, margin, y, { maxWidth: pageW - margin*2 });
                y += 28;
            });

            // Performance chart image
            if (data.chartImage) {
                addSectionTitle('Network Performance');
                // Scale to fit width
                const imgProps = doc.getImageProperties(data.chartImage);
                const maxW = pageW - margin*2;
                const scale = maxW / imgProps.width;
                const imgW = maxW;
                const imgH = imgProps.height * scale;
                if (y + imgH > pageH - margin) { doc.addPage(); y = margin; }
                doc.addImage(data.chartImage, 'PNG', margin, y, imgW, imgH);
                y += imgH + 8;
            }

            doc.save(`dashboard_report_${new Date().toISOString().slice(0,10)}.pdf`);
        } catch (e) {
            console.error('PDF export error:', e);
            alert('Failed to generate PDF.');
        }
    }

    // =========================
    // Alerts: Demo, Render, Actions
    // =========================
    initAlertsDemo() {
        try {
            const base = (window.DEMO_CONFIG && window.DEMO_CONFIG.environment && Array.isArray(window.DEMO_CONFIG.environment.alerts))
                ? window.DEMO_CONFIG.environment.alerts : [];

            const baseAlerts = base.map((a, idx) => ({
                id: a.id || `ALERT_BASE_${idx}`,
                type: a.type || 'General',
                severity: a.severity || 'Medium',
                message: a.message || 'System notification',
                location: (Array.isArray(a.affectedRoutes) ? a.affectedRoutes.join(', ') : (a.location || 'Network')),
                timestamp: a.timestamp || new Date().toISOString(),
                status: 'Active'
            }));

            const now = Date.now();
            const extraAlerts = [
                { id: 'ALR-C-001', type: 'Signal', severity: 'Critical', message: 'Signal failure at KOTA Junction (SIG003)', location: 'Kota Yard', timestamp: new Date(now - 2*60*1000).toISOString(), status: 'Active' },
                { id: 'ALR-H-002', type: 'Maintenance', severity: 'High', message: 'Track temperature high on section JP-KOTA', location: 'Jaipur-Kota', timestamp: new Date(now - 5*60*1000).toISOString(), status: 'Active' },
                { id: 'ALR-M-003', type: 'Weather', severity: 'Medium', message: 'Dust storm advisory in RTM section', location: 'Ratlam', timestamp: new Date(now - 12*60*1000).toISOString(), status: 'Active' },
                { id: 'ALR-L-004', type: 'Safety', severity: 'Low', message: 'Trespass detected near level crossing LC-17', location: 'Rewari Suburban', timestamp: new Date(now - 18*60*1000).toISOString(), status: 'Acknowledged' }
            ];

            this.alerts = [...extraAlerts, ...baseAlerts]
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        } catch (e) {
            this.alerts = [];
        }

        this.updateAlertIndicators();
        if (this.currentView === 'alerts') this.renderAlerts();
    }

    renderAlerts() {
        const list = document.getElementById('alertsList');
        const empty = document.getElementById('alertsEmptyState');
        if (!list) return;

        // Apply filters
        const f = this.alertFilters;
        const filtered = this.alerts.filter(a => {
            if (f.search) {
                const hay = `${a.id} ${a.type} ${a.severity} ${a.message} ${a.location}`.toLowerCase();
                if (!hay.includes(f.search.toLowerCase())) return false;
            }
            if (f.severity && a.severity !== f.severity) return false;
            if (f.type && a.type !== f.type) return false;
            if (f.status && a.status !== f.status) return false;
            return true;
        });

        // Update severity counters (Active + Acknowledged considered active impact)
        const countBy = (sev) => this.alerts.filter(a => (a.status === 'Active' || a.status === 'Acknowledged') && a.severity === sev).length;
        const el = (id) => document.getElementById(id);
        if (el('countCritical')) el('countCritical').textContent = String(countBy('Critical'));
        if (el('countHigh')) el('countHigh').textContent = String(countBy('High'));
        if (el('countMedium')) el('countMedium').textContent = String(countBy('Medium'));
        if (el('countLow')) el('countLow').textContent = String(countBy('Low'));

        if (!filtered.length) {
            list.innerHTML = '';
            if (empty) empty.style.display = 'block';
            return;
        }
        if (empty) empty.style.display = 'none';

        const typeIcon = (type) => ({
            'Signal': 'fa-traffic-light',
            'Maintenance': 'fa-tools',
            'Weather': 'fa-cloud-sun-rain',
            'Safety': 'fa-shield-halved'
        }[type] || 'fa-bell');

        const sevClass = (sev) => ({
            'Critical': 'sev-critical',
            'High': 'sev-high',
            'Medium': 'sev-medium',
            'Low': 'sev-low'
        }[sev] || 'sev-low');

        const timeAgo = (ts) => {
            const diff = Math.max(1, Math.floor((Date.now() - new Date(ts).getTime()) / 1000));
            if (diff < 60) return `${diff}s ago`;
            if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
            if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
            return `${Math.floor(diff/86400)}d ago`;
        };

        list.innerHTML = filtered.map(a => `
            <div class="alert-card ${sevClass(a.severity)}" data-id="${this.escapeHtml(a.id)}">
                <div class="alert-icon"><i class="fas ${typeIcon(a.type)}"></i></div>
                <div class="alert-content">
                    <div class="alert-title">${this.escapeHtml(a.message)}</div>
                    <div class="alert-meta">
                        <span class="alert-chip type">${this.escapeHtml(a.type)}</span>
                        <span class="alert-chip location"><i class="fas fa-location-dot"></i> ${this.escapeHtml(a.location || 'Network')}</span>
                        <span class="alert-chip time"><i class="fas fa-clock"></i> ${this.escapeHtml(timeAgo(a.timestamp))}</span>
                        <span class="alert-chip status status-${a.status.toLowerCase()}">${this.escapeHtml(a.status)}</span>
                    </div>
                </div>
                <div class="alert-actions">
                    ${a.status === 'Active' ? `<button class="btn btn-sm" data-alert-action="ack" data-alert-id="${this.escapeHtml(a.id)}"><i class="fas fa-check"></i> Acknowledge</button>` : ''}
                    ${a.status !== 'Resolved' ? `<button class="btn btn-sm btn-success" data-alert-action="resolve" data-alert-id="${this.escapeHtml(a.id)}"><i class="fas fa-check-circle"></i> Resolve</button>` : ''}
                    <button class="btn btn-sm btn-outline" data-alert-action="mute" data-alert-id="${this.escapeHtml(a.id)}"><i class="fas fa-bell-slash"></i> Mute</button>
                </div>
            </div>
        `).join('');
    }

    resetAlertFilters() {
        const alertSearch = document.getElementById('alertSearch');
        const alertSeverity = document.getElementById('alertSeverity');
        const alertType = document.getElementById('alertType');
        const alertStatus = document.getElementById('alertStatus');
        if (alertSearch) alertSearch.value = '';
        if (alertSeverity) alertSeverity.value = '';
        if (alertType) alertType.value = '';
        if (alertStatus) alertStatus.value = '';
        this.alertFilters = { search: '', severity: '', type: '', status: '' };
        this.renderAlerts();
    }

    bulkAcknowledgeAlerts() {
        this.alerts.forEach(a => { if (a.status === 'Active') a.status = 'Acknowledged'; });
        this.addToAuditLog('Bulk acknowledge', 'All active alerts acknowledged');
        this.updateAlertIndicators();
        this.renderAlerts();
    }

    bulkResolveAlerts() {
        this.alerts.forEach(a => { if (a.status !== 'Resolved') a.status = 'Resolved'; });
        this.addToAuditLog('Bulk resolve', 'All alerts resolved');
        this.updateAlertIndicators();
        this.renderAlerts();
    }

    handleAlertAction(action, id) {
        const a = this.alerts.find(x => x.id === id);
        if (!a) return;
        if (action === 'ack') a.status = 'Acknowledged';
        if (action === 'resolve') a.status = 'Resolved';
        if (action === 'mute') a.status = 'Muted';
        this.addToAuditLog(`Alert ${action}`, `${a.id} - ${a.message}`);
        this.updateAlertIndicators();
        this.renderAlerts();
    }

    updateAlertIndicators() {
        const activeCount = this.alerts.filter(a => a.status === 'Active').length;
        const badge = document.querySelector('.nav-item.alert-nav .alert-badge');
        if (badge) badge.textContent = String(activeCount);
        const headerAlerts = document.querySelector('.status-item.alerts .status-label');
        if (headerAlerts) headerAlerts.textContent = `${activeCount} Active Alerts`;
        // Update KPI card for Active Alerts if present (4th card in current layout)
        const kpiCards = document.querySelectorAll('.kpi-card');
        if (kpiCards && kpiCards.length >= 4) {
            const kpi = kpiCards[3].querySelector('.kpi-value');
            if (kpi) kpi.textContent = String(activeCount);
        }
    }

    addRandomAlert() {
        const sevPool = ['Low','Medium','High','Critical'];
        const typePool = ['Signal','Maintenance','Weather','Safety'];
        const rand = (arr) => arr[Math.floor(Math.random()*arr.length)];
        const id = `ALR-${Date.now().toString().slice(-6)}`;
        const type = rand(typePool);
        const severity = rand(sevPool);
        const messagesByType = {
            'Signal': ['Interlocking fault detected','Aspect mismatch reported','Signal lamp failure reported'],
            'Maintenance': ['Temperature spike at ballast section','Vibration threshold exceeded','Points machine overheating'],
            'Weather': ['Heavy rainfall advisory','High wind speed detected','Low visibility due to fog'],
            'Safety': ['Unauthorized track crossing','Obstacle detected on track','Door malfunction reported']
        };
        const msg = rand(messagesByType[type]);
        const locs = ['Delhi Yard','Gurgaon Outer','Jaipur Jn. P4','Kota Cabin','Ratlam Section'];
        const alert = { id, type, severity, message: msg, location: rand(locs), timestamp: new Date().toISOString(), status: 'Active' };
        this.alerts.unshift(alert);
        // Keep list reasonable
        if (this.alerts.length > 200) this.alerts.length = 200;
    }

    // Utility helpers used across the app
    escapeHtml(v) {
        try {
            return String(v)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        } catch { return ''; }
    }

    uniqueSorted(arr) {
        try {
            return Array.from(new Set(arr.filter(v => v != null))).sort((a, b) => String(a).localeCompare(String(b)));
        } catch { return []; }
    }

    // =========================
    // Collision Avoidance Visualization
    // =========================
    initCollisionSim() {
        if (this.collisionSim.initialized) return;
        const canvas = document.getElementById('collisionSimCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        this.collisionSim.canvas = canvas;
        this.collisionSim.ctx = ctx;
        this.layoutCollisionCanvas();
        this.createCollisionScenario();
        this.drawCollisionScene(0); // draw static frame
        // Handle resize
        this._onCollisionResize = () => {
            this.layoutCollisionCanvas();
            // keep trains aligned relative to center
            this.createCollisionScenario(true);
            this.drawCollisionScene(0);
        };
        window.addEventListener('resize', this._onCollisionResize);
        this.collisionSim.initialized = true;
    }

    layoutCollisionCanvas() {
        const sim = this.collisionSim;
        if (!sim.canvas) return;
        const rect = sim.canvas.getBoundingClientRect();
        const dpi = (window.devicePixelRatio || 1);
        sim.dpi = dpi;
        sim.width = Math.max(320, Math.floor(rect.width * dpi));
        sim.height = Math.max(240, Math.floor(rect.height * dpi));
        sim.canvas.width = sim.width;
        sim.canvas.height = sim.height;
        sim.intersection.x = Math.floor(sim.width / 2);
        sim.intersection.y = Math.floor(sim.height / 2);
        sim.intersection.half = Math.max(32, Math.min(sim.width, sim.height) / 10);
    }

    createCollisionScenario(keepProgress = false) {
        const sim = this.collisionSim;
        const cx = sim.intersection.x;
        const cy = sim.intersection.y;
        const lane = Math.max(30 * sim.dpi, sim.intersection.half);
        const margin = 50 * sim.dpi;
        const trainLen = 60 * sim.dpi;
        const trainWid = 18 * sim.dpi;

        // If keeping progress, reuse current positions
        if (keepProgress && sim.trains && sim.trains.length === 2) {
            // just update geometry references
            sim.trains[0].lane = { y: cy }; // horizontal lane y
            sim.trains[1].lane = { x: cx }; // vertical lane x
            sim.trains[0].geom = { len: trainLen, wid: trainWid };
            sim.trains[1].geom = { len: trainLen, wid: trainWid };
            return;
        }

        // Two trains crossing at center: A horizontal (left->right), B vertical (bottom->top)
        sim.trains = [
            {
                id: 'A', dir: 'h', color: '#e74c3c',
                x: (cx - sim.intersection.half) - (margin + trainLen), // front x
                y: cy, v: 180 * sim.dpi, v0: 180 * sim.dpi, a: 220 * sim.dpi, braking: false, waiting: false,
                lane: { y: cy },
                geom: { len: trainLen, wid: trainWid }
            },
            {
                id: 'B', dir: 'v', color: '#3498db',
                x: cx, y: (cy + sim.intersection.half) + (margin + trainLen), // front y
                v: 170 * sim.dpi, v0: 170 * sim.dpi, a: 220 * sim.dpi, braking: false, waiting: false,
                lane: { x: cx },
                geom: { len: trainLen, wid: trainWid }
            }
        ];
    }

    startCollisionSim() {
        this.initCollisionSim();
        const sim = this.collisionSim;
        if (!sim.initialized) return;
        if (sim.started && sim.rafId) {
            cancelAnimationFrame(sim.rafId);
        }
        sim.started = true;
        sim.lastTs = 0;
        const loop = (ts) => {
            if (!sim.started) return;
            if (!sim.lastTs) sim.lastTs = ts;
            const dt = Math.min(0.05, (ts - sim.lastTs) / 1000); // clamp dt
            sim.lastTs = ts;
            this.stepCollisionSim(dt);
            this.drawCollisionScene(dt);
            sim.rafId = requestAnimationFrame(loop);
        };
        sim.rafId = requestAnimationFrame(loop);
    }

    stopCollisionSim() {
        const sim = this.collisionSim;
        if (sim.rafId) cancelAnimationFrame(sim.rafId);
        sim.rafId = null;
        sim.started = false;
    }

    resetCollisionSim() {
        this.stopCollisionSim();
        if (this.collisionSim.initialized) {
            this.createCollisionScenario();
            this.drawCollisionScene(0);
        }
    }

    stepCollisionSim(dt) {
        const sim = this.collisionSim;
        const boxHalf = sim.intersection.half;
        const A = sim.trains[0];
        const B = sim.trains[1];

        // Determine intersection entry/exit boundaries
        const enterAx = sim.intersection.x - boxHalf - 6 * sim.dpi; // horizontal entry
        const exitAx = sim.intersection.x + boxHalf + 6 * sim.dpi;
        const enterBy = sim.intersection.y + boxHalf + 6 * sim.dpi; // vertical entry from bottom
        const exitBy = sim.intersection.y - boxHalf - 6 * sim.dpi;

        // Predict time to reach entry boundaries (front positions)
        const tAEnter = A.v > 0 ? (enterAx - A.x) / A.v : Infinity;
        const tBEnter = B.v > 0 ? (B.y - enterBy) / B.v : Infinity; // B.y decreasing towards exitBy, but entering from bottom so time to enter is (B.y - enterBy)/v

        // Conflict prediction: if both will be near the intersection at the same time window
        const willConflict = (tAEnter > 0 && tBEnter > 0 && Math.abs(tAEnter - tBEnter) < sim.safeWindow);

        // Brake yielding train (B) if conflict predicted and B not already past entry
        if (willConflict && !B.braking && B.y > enterBy) {
            B.braking = true;
            // Target stop just before entering the box
            B.stopY = enterBy + 10 * sim.dpi;
        }

        // Update velocities (simple kinematics)
        // Train A maintains speed through intersection
        A.x += A.v * dt;

        // Train B may brake/accelerate
        if (B.braking) {
            // Decelerate
            B.v = Math.max(0, B.v - B.a * dt);
            // Move but clamp before stop line
            const nextY = B.y - B.v * dt;
            B.y = Math.max(B.stopY, nextY);
            // If stopped, wait until A clears the intersection
            const Acleared = (A.x - A.geom.len) > exitAx; // A rear passed exit
            if (B.v === 0 || B.y <= B.stopY) {
                B.waiting = true;
                if (Acleared) {
                    // Release B
                    B.braking = false;
                    B.waiting = false;
                }
            }
        } else {
            // Accelerate gently back to v0 if below
            if (B.v < B.v0) {
                B.v = Math.min(B.v0, B.v + (0.6 * B.a) * dt);
            }
            B.y -= B.v * dt;
        }

        // Loop trains back after leaving screen for continuous demo
        const offRight = A.x - A.geom.len > sim.width + 40 * sim.dpi;
        const offTop = B.y + B.geom.len < -40 * sim.dpi;
        if (offRight) {
            // reset A before left
            A.x = - (80 * sim.dpi);
        }
        if (offTop) {
            // reset B below
            B.y = sim.height + (80 * sim.dpi);
        }
    }

    drawCollisionScene() {
        const sim = this.collisionSim;
        if (!sim.ctx) return;
        const ctx = sim.ctx;
        const w = sim.width, h = sim.height;
        ctx.clearRect(0, 0, w, h);

        // Draw tracks
        const trackW = 12 * sim.dpi;
        ctx.save();
        ctx.lineCap = 'round';
        // Horizontal track
        ctx.strokeStyle = '#6c757d';
        ctx.lineWidth = trackW;
        ctx.beginPath();
        ctx.moveTo(20 * sim.dpi, sim.intersection.y);
        ctx.lineTo(w - 20 * sim.dpi, sim.intersection.y);
        ctx.stroke();
        // Vertical track
        ctx.beginPath();
        ctx.moveTo(sim.intersection.x, 20 * sim.dpi);
        ctx.lineTo(sim.intersection.x, h - 20 * sim.dpi);
        ctx.stroke();
        ctx.restore();

        // Intersection highlight
        ctx.save();
        ctx.fillStyle = 'rgba(255, 193, 7, 0.1)';
        ctx.strokeStyle = 'rgba(255, 193, 7, 0.7)';
        ctx.lineWidth = 2 * sim.dpi;
        ctx.beginPath();
        ctx.rect(sim.intersection.x - sim.intersection.half, sim.intersection.y - sim.intersection.half, sim.intersection.half * 2, sim.intersection.half * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Signals near entry
        const sigR = 6 * sim.dpi;
        // Bottom signal for vertical train
        ctx.save();
        ctx.beginPath();
        ctx.arc(sim.intersection.x + 20 * sim.dpi, sim.intersection.y + sim.intersection.half + 18 * sim.dpi, sigR, 0, Math.PI * 2);
        const B = sim.trains[1];
        ctx.fillStyle = (B.braking || B.waiting) ? '#dc3545' : '#28a745';
        ctx.fill();
        ctx.restore();

        // Left signal for horizontal train (always green in this demo)
        ctx.save();
        ctx.beginPath();
        ctx.arc(sim.intersection.x - sim.intersection.half - 18 * sim.dpi, sim.intersection.y - 20 * sim.dpi, sigR, 0, Math.PI * 2);
        ctx.fillStyle = '#28a745';
        ctx.fill();
        ctx.restore();

        // Draw trains
        const A = sim.trains[0];
        this.drawTrain(ctx, A, sim);
        this.drawTrain(ctx, B, sim);

        // Overlay text when braking
        if (B.braking || B.waiting) {
            ctx.save();
            ctx.font = `${14 * sim.dpi}px Inter, Arial`;
            ctx.fillStyle = '#dc3545';
            ctx.strokeStyle = 'rgba(255,255,255,0.8)';
            ctx.lineWidth = 3 * sim.dpi;
            const msg = 'Braking to avoid collision';
            const tx = 16 * sim.dpi, ty = 24 * sim.dpi;
            ctx.strokeText(msg, tx, ty);
            ctx.fillText(msg, tx, ty);
            ctx.restore();
        }
    }

    drawTrain(ctx, t, sim) {
        ctx.save();
        ctx.fillStyle = t.color;
        const len = t.geom.len;
        const wid = t.geom.wid;
        const r = 6 * sim.dpi;
        if (t.dir === 'h') {
            // draw rectangle with rounded corners, front at x, centered at lane y
            const x = t.x - len; // back
            const y = t.y - wid / 2;
            this._roundRect(ctx, x, y, len, wid, r);
            ctx.fill();
            // front arrow
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(t.x - 10 * sim.dpi, t.y - 6 * sim.dpi);
            ctx.lineTo(t.x, t.y);
            ctx.lineTo(t.x - 10 * sim.dpi, t.y + 6 * sim.dpi);
            ctx.closePath();
            ctx.fill();
        } else {
            // vertical train, front at y
            const x = t.x - wid / 2;
            const y = t.y; // front
            // body extends downward (towards bottom)
            this._roundRect(ctx, x, y, wid, t.geom.len, r);
            ctx.fill();
            // front arrow
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(t.x - 6 * sim.dpi, t.y + 10 * sim.dpi);
            ctx.lineTo(t.x, t.y);
            ctx.lineTo(t.x + 6 * sim.dpi, t.y + 10 * sim.dpi);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }

    _roundRect(ctx, x, y, w, h, r) {
        const rr = Math.min(r, w/2, h/2);
        ctx.beginPath();
        ctx.moveTo(x + rr, y);
        ctx.lineTo(x + w - rr, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
        ctx.lineTo(x + w, y + h - rr);
        ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
        ctx.lineTo(x + rr, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
        ctx.lineTo(x, y + rr);
        ctx.quadraticCurveTo(x, y, x + rr, y);
        ctx.closePath();
    }

    // Cleanup method
    destroy() {
        if (this.realTimeInterval) {
            clearInterval(this.realTimeInterval);
        }
        
        if (this.map) {
            this.map.remove();
        }
        
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.railwayTMS = new RailwayTMS();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Pause real-time updates when tab is not visible
        if (window.railwayTMS && window.railwayTMS.realTimeInterval) {
            clearInterval(window.railwayTMS.realTimeInterval);
        }
    } else {
        // Resume real-time updates when tab becomes visible
        if (window.railwayTMS) {
            window.railwayTMS.startRealTimeUpdates();
        }
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    if (window.railwayTMS && window.railwayTMS.charts) {
        Object.values(window.railwayTMS.charts).forEach(chart => {
            if (chart && typeof chart.resize === 'function') {
                chart.resize();
            }
        });
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RailwayTMS;
}