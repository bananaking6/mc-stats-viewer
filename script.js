let allStatsData = {};
let loadedFiles = 0;
let totalFiles = 0;
let playerNames = {};
let showCombinedPlayers = false;
let currentCharts = [];

document.getElementById('savesFolderInput').addEventListener('change', handleFileSelect);

function handleFileSelect(event) {
    let files = event.target.files;
    // check if it contains a 'saves' folder, if so move into it
    const savesFolder = Array.from(files).find(file => file.webkitRelativePath.startsWith('saves/'));
    if (savesFolder) {
        files = Array.from(files).filter(file => file.webkitRelativePath.startsWith('saves/') && file.webkitRelativePath.endsWith('.json'));
    }

    const statsContainer = document.getElementById('statsContainer');
    statsContainer.innerHTML = '<div class="loading">Loading stats...</div>';

    // Reset data
    allStatsData = {};
    loadedFiles = 0;
    playerNames = {};
    destroyAllCharts();

    // Get the files in /<world>/stats/
    const statsFiles = Array.from(files).filter(file => /\/stats\/.*\.json$/.test(file.webkitRelativePath));
    totalFiles = statsFiles.length;

    if (totalFiles === 0) {
        statsContainer.innerHTML = '<div class="error">No stats files found. Make sure you selected the saves folder.</div>';
        return;
    }

    statsFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const content = e.target.result;
            try {
                const data = JSON.parse(content);
                processStatsFile(data, file.webkitRelativePath);
                loadedFiles++;
                
                statsContainer.innerHTML = `<div class="loading">Loading stats... (${loadedFiles}/${totalFiles})</div>`;
                
                if (loadedFiles === totalFiles) {
                    fetchUsernamesAndDisplay();
                }
            } catch (err) {
                console.error('Error parsing JSON from file:', file.name, err);
                loadedFiles++;
                if (loadedFiles === totalFiles) {
                    fetchUsernamesAndDisplay();
                }
            }
        };
        reader.readAsText(file);
    });
}

function processStatsFile(data, filePath) {
    const pathParts = filePath.split('/');
    const worldName = pathParts[pathParts.length - 3];
    const fileName = pathParts[pathParts.length - 1];
    const playerUUID = fileName.replace('.json', '');

    if (!allStatsData[worldName]) {
        allStatsData[worldName] = {};
    }

    allStatsData[worldName][playerUUID] = {
        uuid: playerUUID,
        stats: data.stats || {},
        dataVersion: data.DataVersion || 'Unknown'
    };
}

async function fetchUsernamesAndDisplay() {
    const statsContainer = document.getElementById('statsContainer');
    statsContainer.innerHTML = '<div class="loading">Fetching usernames...</div>';

    const allUUIDs = new Set();
    for (const [worldName, players] of Object.entries(allStatsData)) {
        for (const playerUUID of Object.keys(players)) {
            allUUIDs.add(playerUUID);
        }
    }

    const fetchPromises = Array.from(allUUIDs).map(async (uuid) => {
        try {
            const response = await fetch(`https://api.ashcon.app/mojang/v2/user/${uuid}`);
            if (response.ok) {
                const data = await response.json();
                playerNames[uuid] = data.username || `Player_${uuid.substring(0, 8)}`;
            } else {
                playerNames[uuid] = `Player_${uuid.substring(0, 8)}`;
            }
        } catch (error) {
            console.error(`Error fetching username for ${uuid}:`, error);
            playerNames[uuid] = `Player_${uuid.substring(0, 8)}`;
        }
    });

    await Promise.all(fetchPromises);
    displayAllStats();
}

function combinedPlayerStats() {
    const combinedStats = {};
    
    for (const [worldName, players] of Object.entries(allStatsData)) {
        for (const [playerUUID, playerData] of Object.entries(players)) {
            if (!combinedStats[playerUUID]) {
                combinedStats[playerUUID] = {
                    uuid: playerUUID,
                    username: playerNames[playerUUID] || `Player_${playerUUID.substring(0, 8)}`,
                    stats: {},
                    worlds: []
                };
            }
            
            combinedStats[playerUUID].worlds.push(worldName);
            
            const stats = playerData.stats;
            for (const [category, categoryStats] of Object.entries(stats)) {
                if (!combinedStats[playerUUID].stats[category]) {
                    combinedStats[playerUUID].stats[category] = {};
                }
                
                for (const [statName, value] of Object.entries(categoryStats)) {
                    if (!combinedStats[playerUUID].stats[category][statName]) {
                        combinedStats[playerUUID].stats[category][statName] = 0;
                    }
                    combinedStats[playerUUID].stats[category][statName] += value;
                }
            }
        }
    }
    
    return combinedStats;
}

function getAllPlayersCombinedStats() {
    const allPlayerStats = {};
    
    for (const [worldName, players] of Object.entries(allStatsData)) {
        for (const [playerUUID, playerData] of Object.entries(players)) {
            const stats = playerData.stats;
            for (const [category, categoryStats] of Object.entries(stats)) {
                if (!allPlayerStats[category]) {
                    allPlayerStats[category] = {};
                }
                
                for (const [statName, value] of Object.entries(categoryStats)) {
                    if (!allPlayerStats[category][statName]) {
                        allPlayerStats[category][statName] = 0;
                    }
                    allPlayerStats[category][statName] += value;
                }
            }
        }
    }
    
    return allPlayerStats;
}

function destroyAllCharts() {
    currentCharts.forEach(chart => {
        if (chart) {
            chart.destroy();
        }
    });
    currentCharts = [];
}

function displayAllStats() {
    const statsContainer = document.getElementById('statsContainer');
    
    if (Object.keys(allStatsData).length === 0) {
        statsContainer.innerHTML = '<div class="error">No valid stats data found.</div>';
        return;
    }

    destroyAllCharts();
    const combinedStats = combinedPlayerStats();
    
    let html = '<div class="stats-overview">';
    
    // Enhanced summary with charts
    const worldCount = Object.keys(allStatsData).length;
    let totalPlayers = Object.keys(combinedStats).length;
    
    html += `
        <div class="summary-section">
            <div class="summary-cards">
                <div class="summary-card">
                    <h3><i class="fas fa-globe"></i> Worlds Loaded</h3>
                    <div class="stat-value">${worldCount}</div>
                </div>
                <div class="summary-card">
                    <h3><i class="fas fa-users"></i> Unique Players</h3>
                    <div class="stat-value">${totalPlayers}</div>
                </div>
            </div>
            <div class="charts-container">
                <div class="chart-card">
                    <h3><i class="fas fa-chart-pie"></i> Players by World</h3>
                    <canvas id="playersPerWorldChart"></canvas>
                </div>
                <div class="chart-card">
                    <h3><i class="fas fa-chart-bar"></i> Play Time Distribution</h3>
                    <canvas id="playTimeChart"></canvas>
                </div>
            </div>
        </div>
    `;

    // Navigation tabs
    html += `
        <div class="nav-tabs">
            <button class="tab-button active" onclick="showSection('combined')">
                <i class="fas fa-chart-line"></i> Combined Stats
            </button>
            <button class="tab-button" onclick="showSection('worlds')">
                <i class="fas fa-globe"></i> By World
            </button>
            <button class="tab-button" onclick="showSection('analytics')">
                <i class="fas fa-chart-area"></i> Analytics
            </button>
        </div>
    `;

    // Combined Stats Section
    html += `<div id="combined-section" class="section-content">`;
    html += `<h2 class="section-title"><i class="fas fa-chart-line"></i> Combined Player Stats</h2>`;
    
    html += `
        <div class="player-toggle">
            <label class="toggle-label">
                <input type="checkbox" id="combinePlayersToggle" onchange="toggleCombinePlayers()" ${showCombinedPlayers ? 'checked' : ''}>
                <span class="toggle-text"><i class="fas fa-users"></i> Combine all players</span>
            </label>
        </div>
    `;

    if (showCombinedPlayers) {
        const allPlayersStats = getAllPlayersCombinedStats();
        html += `
            <div class="player-card all-players-combined">
                <h3 class="player-title"><i class="fas fa-users"></i> All Players Combined</h3>
                <div class="worlds-played">
                    <i class="fas fa-globe"></i> <strong>Total worlds:</strong> ${Object.keys(allStatsData).join(', ')}
                </div>
                <div class="player-stats">
                    ${formatPlayerStats(allPlayersStats)}
                </div>
            </div>
        `;
    } else {
        html += `<div class="players-grid">`;
        for (const [playerUUID, playerData] of Object.entries(combinedStats)) {
            html += `
                <div class="player-card combined-player">
                    <h3 class="player-title">${playerData.username}</h3>
                    <div class="worlds-played">
                        <strong>Worlds:</strong> ${playerData.worlds.join(', ')}
                    </div>
                    <div class="player-stats">
                        ${formatPlayerStats(playerData.stats)}
                    </div>
                </div>
            `;
        }
        html += `</div>`;
    }
    html += `</div>`;

    // Worlds Section with filters
    html += `<div id="worlds-section" class="section-content" style="display: none;">`;
    html += `<h2 class="section-title"><i class="fas fa-globe"></i> Stats by World</h2>`;
    
    html += `
        <div class="filters-container">
            <div class="filter-group">
                <label><i class="fas fa-filter"></i> Filter by Player:</label>
                <select id="playerFilter" onchange="applyFilters()">
                    <option value="">All Players</option>
                    ${Object.values(playerNames).map(name => `<option value="${name}">${name}</option>`).join('')}
                </select>
            </div>
            <div class="filter-group">
                <label><i class="fas fa-sort"></i> Sort by:</label>
                <select id="sortFilter" onchange="applyFilters()">
                    <option value="name">World Name (A-Z)</option>
                    <option value="playtime">Total Play Time</option>
                    <option value="players">Player Count</option>
                </select>
            </div>
        </div>
    `;

    html += `<div id="worldsContainer"></div>`;
    html += `</div>`;

    // Analytics Section
    html += `<div id="analytics-section" class="section-content" style="display: none;">`;
    html += `<h2 class="section-title"><i class="fas fa-chart-area"></i> Advanced Analytics</h2>`;
    html += `
        <div class="analytics-grid">
            <div class="chart-card large hidden">
                <h3><i class="fas fa-chart-bar"></i> Top Activities</h3>
                <canvas id="activitiesChart"></canvas>
            </div>
            <div class="chart-card large hidden">
                <h3><i class="fas fa-chart-line"></i> Distance Traveled</h3>
                <canvas id="distanceChart"></canvas>
            </div>
            <div class="chart-card large">
                <h3><i class="fas fa-chart-pie"></i> Deaths Distribution</h3>
                <canvas id="deathsChart"></canvas>
            </div>
            <div class="chart-card large">
                <h3><i class="fas fa-chart-doughnut"></i> Block Mining</h3>
                <canvas id="miningChart"></canvas>
            </div>
        </div>
    `;
    html += `</div>`;

    html += '</div>';
    statsContainer.innerHTML = html;

    // Initialize charts
    setTimeout(() => {
        createPlayersPerWorldChart(combinedStats);
        createPlayTimeChart(combinedStats);
        updateWorldsDisplay();
    }, 100);
}

function createPlayersPerWorldChart(combinedStats) {
    const worldPlayerCounts = {};
    for (const [worldName] of Object.entries(allStatsData)) {
        worldPlayerCounts[worldName] = 0;
    }
    
    for (const playerData of Object.values(combinedStats)) {
        playerData.worlds.forEach(world => {
            worldPlayerCounts[world]++;
        });
    }

    const ctx = document.getElementById('playersPerWorldChart');
    if (ctx) {
        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(worldPlayerCounts),
                datasets: [{
                    data: Object.values(worldPlayerCounts),
                    backgroundColor: [
                        '#00d4aa', '#7c3aed', '#10b981', '#f59e0b', '#ef4444',
                        '#06b6d4', '#8b5cf6', '#84cc16', '#f97316', '#ec4899'
                    ],
                    borderWidth: 2,
                    borderColor: '#1a1a2e'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: { color: '#e2e8f0' }
                    }
                }
            }
        });
        currentCharts.push(chart);
    }
}

function createPlayTimeChart(combinedStats) {
    const playTimeData = Object.values(combinedStats).map(player => ({
        name: player.username,
        time: player.stats['minecraft:custom']?.["minecraft:play_time"] || 0
    })).sort((a, b) => b.time - a.time).slice(0, 10);

    const ctx = document.getElementById('playTimeChart');
    if (ctx) {
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: playTimeData.map(p => p.name),
                datasets: [{
                    label: 'Play Time (hours)',
                    data: playTimeData.map(p => Math.round(p.time / 72000 * 100) / 100),
                    backgroundColor: 'rgba(0, 212, 170, 0.8)',
                    borderColor: '#00d4aa',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        ticks: { color: '#94a3b8' },
                        grid: { color: '#334155' }
                    },
                    x: {
                        ticks: { color: '#94a3b8' },
                        grid: { color: '#334155' }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: '#e2e8f0' }
                    }
                }
            }
        });
        currentCharts.push(chart);
    }
}

function applyFilters() {
    updateWorldsDisplay();
}

function updateWorldsDisplay() {
    const playerFilter = document.getElementById('playerFilter')?.value || '';
    const sortFilter = document.getElementById('sortFilter')?.value || 'name';
    
    let worldsData = Object.entries(allStatsData).map(([worldName, players]) => {
        const totalPlayTime = Object.values(players).reduce((sum, player) => {
            return sum + (player.stats['minecraft:custom']?.["minecraft:play_time"] || 0);
        }, 0);
        
        const filteredPlayers = playerFilter ? 
            Object.entries(players).filter(([uuid]) => playerNames[uuid] === playerFilter) :
            Object.entries(players);
        
        return {
            name: worldName,
            players: filteredPlayers,
            playerCount: Object.keys(players).length,
            totalPlayTime
        };
    });

    // Apply sorting
    switch (sortFilter) {
        case 'playtime':
            worldsData.sort((a, b) => b.totalPlayTime - a.totalPlayTime);
            break;
        case 'players':
            worldsData.sort((a, b) => b.playerCount - a.playerCount);
            break;
        default:
            worldsData.sort((a, b) => a.name.localeCompare(b.name));
    }

    let html = '';
    for (const worldData of worldsData) {
        if (playerFilter && worldData.players.length === 0) continue;
        
        html += `
            <div class="world-section">
                <h3 class="world-title">
                    ${worldData.name}
                    <span class="world-stats">
                        <i class="fas fa-users"></i> ${worldData.playerCount} players
                        <i class="fas fa-clock"></i> ${formatTime(worldData.totalPlayTime)}
                    </span>
                </h3>
                <div class="players-grid">
        `;

        for (const [playerUUID, playerData] of worldData.players) {
            const username = playerNames[playerUUID] || `Player_${playerUUID.substring(0, 8)}`;
            html += `
                <div class="player-card">
                    <h4 class="player-title">${username}</h4>
                    <div class="player-stats">
                        ${formatPlayerStats(playerData.stats)}
                    </div>
                </div>
            `;
        }

        html += `</div></div>`;
    }

    const container = document.getElementById('worldsContainer');
    if (container) {
        container.innerHTML = html;
    }
}

function toggleCombinePlayers() {
    showCombinedPlayers = document.getElementById('combinePlayersToggle').checked;
    displayAllStats();
}

function showSection(sectionName) {
    const sections = document.querySelectorAll('.section-content');
    sections.forEach(section => section.style.display = 'none');
    
    const tabs = document.querySelectorAll('.tab-button');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    document.getElementById(sectionName + '-section').style.display = 'block';
    event.target.classList.add('active');

    // Create analytics charts when analytics section is shown
    if (sectionName === 'analytics') {
        setTimeout(() => {
            createAnalyticsCharts();
        }, 100);
    }
}

function createAnalyticsCharts() {
    const combinedStats = combinedPlayerStats();
    
    // Activities Chart
    const activitiesData = aggregateActivities(combinedStats);
    createActivitiesChart(activitiesData);
    
    // Distance Chart
    const distanceData = aggregateDistances(combinedStats);
    createDistanceChart(distanceData);
    
    // Deaths Chart
    const deathsData = aggregateDeaths(combinedStats);
    createDeathsChart(deathsData);
    
    // Mining Chart
    const miningData = aggregateMining(combinedStats);
    createMiningChart(miningData);
}

function aggregateActivities(combinedStats) {
    const activities = {};
    const activityKeys = ['mob_kills', 'open_chest', 'jump', 'fish_caught', 'animals_bred'];
    
    for (const player of Object.values(combinedStats)) {
        const customStats = player.stats['minecraft:custom'] || {};
        activityKeys.forEach(key => {
            if (customStats[key]) {
                activities[key] = (activities[key] || 0) + customStats[key];
            }
        });
    }
    
    return activities;
}

function createActivitiesChart(data) {
    const ctx = document.getElementById('activitiesChart');
    if (ctx && Object.keys(data).length > 0) {
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(data).map(key => key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())),
                datasets: [{
                    label: 'Total Count',
                    data: Object.values(data),
                    backgroundColor: 'rgba(124, 58, 237, 0.8)',
                    borderColor: '#7c3aed',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
                    x: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } }
                },
                plugins: { legend: { labels: { color: '#e2e8f0' } } }
            }
        });
        currentCharts.push(chart);
    }
}

function aggregateDistances(combinedStats) {
    const distances = {};
    const distanceKeys = ['walk_one_cm', 'sprint_one_cm', 'fly_one_cm', 'swim_one_cm', 'boat_one_cm'];
    
    for (const player of Object.values(combinedStats)) {
        const customStats = player.stats['minecraft:custom'] || {};
        distanceKeys.forEach(key => {
            if (customStats[key]) {
                distances[key] = (distances[key] || 0) + customStats[key];
            }
        });
    }
    
    return distances;
}

function createDistanceChart(data) {
    const ctx = document.getElementById('distanceChart');
    if (ctx && Object.keys(data).length > 0) {
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Object.keys(data).map(key => key.replace('_one_cm', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())),
                datasets: [{
                    label: 'Distance (meters)',
                    data: Object.values(data).map(v => Math.round(v / 100)),
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    borderColor: '#10b981',
                    borderWidth: 3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
                    x: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } }
                },
                plugins: { legend: { labels: { color: '#e2e8f0' } } }
            }
        });
        currentCharts.push(chart);
    }
}

function aggregateDeaths(combinedStats) {
    const deaths = {};
    
    for (const player of Object.values(combinedStats)) {
        const killedByStats = player.stats['minecraft:killed_by'] || {};
        for (const [cause, count] of Object.entries(killedByStats)) {
            const cleanCause = cause.replace('minecraft:', '').replace(/_/g, ' ');
            deaths[cleanCause] = (deaths[cleanCause] || 0) + count;
        }
    }
    
    return deaths;
}

function createDeathsChart(data) {
    const ctx = document.getElementById('deathsChart');
    if (ctx && Object.keys(data).length > 0) {
        const sortedData = Object.entries(data)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 8);
        
        const chart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: sortedData.map(([cause]) => cause.replace(/\b\w/g, l => l.toUpperCase())),
                datasets: [{
                    data: sortedData.map(([,count]) => count),
                    backgroundColor: [
                        '#ef4444', '#f59e0b', '#10b981', '#06b6d4',
                        '#8b5cf6', '#ec4899', '#84cc16', '#f97316'
                    ],
                    borderWidth: 2,
                    borderColor: '#1a1a2e'
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { labels: { color: '#e2e8f0' } } }
            }
        });
        currentCharts.push(chart);
    }
}

function aggregateMining(combinedStats) {
    const mining = {};
    
    for (const player of Object.values(combinedStats)) {
        const minedStats = player.stats['minecraft:mined'] || {};
        for (const [block, count] of Object.entries(minedStats)) {
            const cleanBlock = block.replace('minecraft:', '').replace(/_/g, ' ');
            mining[cleanBlock] = (mining[cleanBlock] || 0) + count;
        }
    }
    
    return mining;
}

function createMiningChart(data) {
    const ctx = document.getElementById('miningChart');
    if (ctx && Object.keys(data).length > 0) {
        const sortedData = Object.entries(data)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);
        
        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: sortedData.map(([block]) => block.replace(/\b\w/g, l => l.toUpperCase())),
                datasets: [{
                    data: sortedData.map(([,count]) => count),
                    backgroundColor: [
                        '#00d4aa', '#7c3aed', '#10b981', '#f59e0b', '#ef4444',
                        '#06b6d4', '#8b5cf6', '#84cc16', '#f97316', '#ec4899'
                    ],
                    borderWidth: 2,
                    borderColor: '#1a1a2e'
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { labels: { color: '#e2e8f0' } } }
            }
        });
        currentCharts.push(chart);
    }
}

function formatPlayerStats(stats) {
    if (!stats || Object.keys(stats).length === 0) {
        return '<p>No stats available for this player.</p>';
    }

    let html = '';
    
    const categories = {
        'minecraft:custom': {
            name: '📊 Game Statistics',
            formatters: {
                'play_time': (value) => `Play Time: ${formatTime(value)}`,
                'total_world_time': (value) => `Total World Time: ${formatTime(value)}`,
                'time_since_rest': (value) => `Time Since Rest: ${formatTime(value)}`,
                'time_since_death': (value) => `Time Since Death: ${formatTime(value)}`,
                'sneak_time': (value) => `Sneak Time: ${formatTime(value)}`,
                'deaths': (value) => `Deaths: ${value.toLocaleString()}`,
                'mob_kills': (value) => `Mob Kills: ${value.toLocaleString()}`,
                'player_kills': (value) => `Player Kills: ${value.toLocaleString()}`,
                'damage_dealt': (value) => `Damage Dealt: ${(value / 10).toFixed(1)} hearts`,
                'damage_taken': (value) => `Damage Taken: ${(value / 10).toFixed(1)} hearts`,
                'walk_one_cm': (value) => `Distance Walked: ${(value / 100).toFixed(1)}m`,
                'sprint_one_cm': (value) => `Distance Sprinted: ${(value / 100).toFixed(1)}m`,
                'fly_one_cm': (value) => `Distance Flown: ${(value / 100).toFixed(1)}m`,
                'swim_one_cm': (value) => `Distance Swum: ${(value / 100).toFixed(1)}m`,
                'crouch_one_cm': (value) => `Distance Crouched: ${(value / 100).toFixed(1)}m`,
                'walk_under_water_one_cm': (value) => `Distance Walked Underwater: ${(value / 100).toFixed(1)}m`,
                'walk_on_water_one_cm': (value) => `Distance Walked on Water: ${(value / 100).toFixed(1)}m`,
                'fall_one_cm': (value) => `Distance Fallen: ${(value / 100).toFixed(1)}m`,
                'minecart_one_cm': (value) => `Distance by Minecart: ${(value / 100).toFixed(1)}m`,
                'boat_one_cm': (value) => `Distance by Boat: ${(value / 100).toFixed(1)}m`,
                'horse_one_cm': (value) => `Distance by Horse: ${(value / 100).toFixed(1)}m`,
                'pig_one_cm': (value) => `Distance by Pig: ${(value / 100).toFixed(1)}m`,
                'climb_one_cm': (value) => `Distance Climbed: ${(value / 100).toFixed(1)}m`,
                'jump': (value) => `Jumps: ${value.toLocaleString()}`,
                'leave_game': (value) => `Times Left Game: ${value.toLocaleString()}`,
                'open_chest': (value) => `Chests Opened: ${value.toLocaleString()}`,
                'interact_with_anvil': (value) => `Anvil Interactions: ${value.toLocaleString()}`,
                'interact_with_beacon': (value) => `Beacon Interactions: ${value.toLocaleString()}`,
                'interact_with_brewingstand': (value) => `Brewing Stand Interactions: ${value.toLocaleString()}`,
                'interact_with_campfire': (value) => `Campfire Interactions: ${value.toLocaleString()}`,
                'interact_with_cartography_table': (value) => `Cartography Table Interactions: ${value.toLocaleString()}`,
                'interact_with_crafting_table': (value) => `Crafting Table Interactions: ${value.toLocaleString()}`,
                'interact_with_furnace': (value) => `Furnace Interactions: ${value.toLocaleString()}`,
                'interact_with_grindstone': (value) => `Grindstone Interactions: ${value.toLocaleString()}`,
                'interact_with_lectern': (value) => `Lectern Interactions: ${value.toLocaleString()}`,
                'interact_with_loom': (value) => `Loom Interactions: ${value.toLocaleString()}`,
                'interact_with_smithing_table': (value) => `Smithing Table Interactions: ${value.toLocaleString()}`,
                'interact_with_smoker': (value) => `Smoker Interactions: ${value.toLocaleString()}`,
                'interact_with_stonecutter': (value) => `Stonecutter Interactions: ${value.toLocaleString()}`,
                'open_barrel': (value) => `Barrels Opened: ${value.toLocaleString()}`,
                'open_enderchest': (value) => `Ender Chests Opened: ${value.toLocaleString()}`,
                'open_shulker_box': (value) => `Shulker Boxes Opened: ${value.toLocaleString()}`,
                'sleep_in_bed': (value) => `Times Slept in Bed: ${value.toLocaleString()}`,
                'use_cauldron': (value) => `Cauldron Uses: ${value.toLocaleString()}`,
                'fill_cauldron': (value) => `Cauldrons Filled: ${value.toLocaleString()}`,
                'inspect_dispenser': (value) => `Dispensers Inspected: ${value.toLocaleString()}`,
                'inspect_dropper': (value) => `Droppers Inspected: ${value.toLocaleString()}`,
                'inspect_hopper': (value) => `Hoppers Inspected: ${value.toLocaleString()}`,
                'trigger_trapped_chest': (value) => `Trapped Chests Triggered: ${value.toLocaleString()}`,
                'play_noteblock': (value) => `Note Blocks Played: ${value.toLocaleString()}`,
                'tune_noteblock': (value) => `Note Blocks Tuned: ${value.toLocaleString()}`,
                'pot_flower': (value) => `Flowers Potted: ${value.toLocaleString()}`,
                'drop': (value) => `Items Dropped: ${value.toLocaleString()}`,
                'eat_cake_slice': (value) => `Cake Slices Eaten: ${value.toLocaleString()}`,
                'fish_caught': (value) => `Fish Caught: ${value.toLocaleString()}`,
                'talked_to_villager': (value) => `Times Talked to Villager: ${value.toLocaleString()}`,
                'traded_with_villager': (value) => `Times Traded with Villager: ${value.toLocaleString()}`,
                'clean_armor': (value) => `Armor Cleaned: ${value.toLocaleString()}`,
                'clean_banner': (value) => `Banners Cleaned: ${value.toLocaleString()}`,
                'clean_shulker_box': (value) => `Shulker Boxes Cleaned: ${value.toLocaleString()}`,
                'enchant_item': (value) => `Items Enchanted: ${value.toLocaleString()}`,
                'play_record': (value) => `Records Played: ${value.toLocaleString()}`,
                'animals_bred': (value) => `Animals Bred: ${value.toLocaleString()}`,
                'bell_ring': (value) => `Bells Rung: ${value.toLocaleString()}`,
                'raid_trigger': (value) => `Raids Triggered: ${value.toLocaleString()}`,
                'raid_win': (value) => `Raids Won: ${value.toLocaleString()}`,
                'target_hit': (value) => `Targets Hit: ${value.toLocaleString()}`,
                'strider_one_cm': (value) => `Distance by Strider: ${(value / 100).toFixed(1)}m`
            }
        },
        'minecraft:mined': {
            name: '⛏️ Blocks Mined',
            formatters: {}
        },
        'minecraft:crafted': {
            name: '🔨 Items Crafted',
            formatters: {}
        },
        'minecraft:used': {
            name: '🎯 Items Used',
            formatters: {}
        },
        'minecraft:broken': {
            name: '💔 Tools Broken',
            formatters: {}
        },
        'minecraft:picked_up': {
            name: '📦 Items Picked Up',
            formatters: {}
        },
        'minecraft:dropped': {
            name: '📤 Items Dropped',
            formatters: {}
        },
        'minecraft:killed': {
            name: '⚔️ Mobs Killed',
            formatters: {}
        },
        'minecraft:killed_by': {
            name: '💀 Deaths By',
            formatters: {}
        }
    };

    for (const [category, categoryInfo] of Object.entries(categories)) {
        if (stats[category]) {
            html += `<div class="stat-category">`;
            html += `<h4 class="category-title">${categoryInfo.name}</h4>`;
            html += `<div class="stat-grid">`;
            
            const categoryStats = stats[category];
            const sortedStats = Object.entries(categoryStats)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 15);
            
            for (const [statName, value] of sortedStats) {
                let formatter = categoryInfo.formatters[statName] || categoryInfo.formatters[statName.replace('minecraft:', '')];
                let displayText;
                
                if (formatter) {
                    displayText = formatter(value);
                } else {
                    const cleanName = statName.replace('minecraft:', '').replace(/_/g, ' ');
                    const capitalizedName = cleanName.split(' ').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ');
                    displayText = `${capitalizedName}: ${value.toLocaleString()}`;
                }
                
                html += `<div class="stat-item">${displayText}</div>`;
            }
            
            html += `</div></div>`;
        }
    }

    return html || '<p>No recognizable stats found.</p>';
}

function formatTime(ticks) {
    const seconds = Math.floor(ticks / 20);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
        return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${remainingSeconds}s`;
    } else {
        return `${remainingSeconds}s`;
    }
}