// API Configuration
const API_ENDPOINT = 'API_GATEWAY_URL'; // Will be replaced by deploy script

// Load dashboard data from API
async function loadDashboard() {
    try {
        const response = await fetch(`${API_ENDPOINT}/metrics/dashboard`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch metrics data');
        }
        
        const data = await response.json();
        
        // Update stats and remove loading spinners
        const totalSecretsEl = document.getElementById('totalSecrets');
        const secretsTodayEl = document.getElementById('secretsToday');
        const secretsViewedEl = document.getElementById('secretsViewed');
        const activeSecretsEl = document.getElementById('activeSecrets');
        
        totalSecretsEl.textContent = data.totalSecrets.toLocaleString();
        totalSecretsEl.classList.remove('loading');
        
        secretsTodayEl.textContent = data.secretsToday.toLocaleString();
        secretsTodayEl.classList.remove('loading');
        
        secretsViewedEl.textContent = data.secretsViewed.toLocaleString();
        secretsViewedEl.classList.remove('loading');
        
        activeSecretsEl.textContent = (data.totalSecrets - data.secretsViewed).toLocaleString();
        activeSecretsEl.classList.remove('loading');
        
        // Draw chart with real data
        drawChart(data.dailyStats);
        
        // Load activity table
        loadActivityTable(data);
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showError('Failed to load metrics data');
    }
}

function showError(message) {
    const statsCards = document.querySelectorAll('.stat-value');
    statsCards.forEach(card => {
        card.classList.remove('loading');
        card.textContent = 'Error';
        card.style.color = '#c53030';
    });
}

// Simple chart drawing
function drawChart(dailyStats) {
    // Hide loading spinner
    const chartLoading = document.getElementById('chartLoading');
    if (chartLoading) {
        chartLoading.classList.add('hidden');
    }
    
    const canvas = document.getElementById('timeChart');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = 300;
    
    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    
    // Find max value
    const maxValue = Math.max(...dailyStats.map(d => d.created), 1);
    const stepX = chartWidth / (dailyStats.length - 1);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(canvas.width - padding, y);
        ctx.stroke();
    }
    
    // Draw line
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    dailyStats.forEach((point, index) => {
        const x = padding + stepX * index;
        const y = padding + chartHeight - (point.created / maxValue) * chartHeight;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.stroke();
    
    // Draw points
    ctx.fillStyle = '#667eea';
    dailyStats.forEach((point, index) => {
        const x = padding + stepX * index;
        const y = padding + chartHeight - (point.created / maxValue) * chartHeight;
        
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Draw labels
    ctx.fillStyle = '#555';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    
    dailyStats.forEach((point, index) => {
        const x = padding + stepX * index;
        const date = new Date(point.date);
        const label = (date.getMonth() + 1) + '/' + date.getDate();
        ctx.fillText(label, x, canvas.height - 15);
    });
    
    // Draw y-axis labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
        const value = Math.round((maxValue / 5) * (5 - i));
        const y = padding + (chartHeight / 5) * i;
        ctx.fillText(value.toString(), padding - 10, y + 4);
    }
}

// Load activity table
function loadActivityTable(data) {
    const tbody = document.getElementById('activityBody');
    tbody.innerHTML = '';
    
    const metrics = [
        { name: 'Total Secrets', value: data.totalSecrets.toLocaleString(), desc: 'All-time secrets created' },
        { name: 'Secrets Today', value: data.secretsToday.toLocaleString(), desc: 'Created in last 24 hours' },
        { name: 'View Rate', value: `${data.viewRate}%`, desc: 'Percentage of secrets viewed' },
        { name: 'Avg Time to View', value: `${data.avgTimeToView} min`, desc: 'Average time before viewing' },
        { name: 'Error Count', value: data.errorCount.toLocaleString(), desc: 'Total errors logged' }
    ];
    
    metrics.forEach(metric => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${metric.name}</strong></td>
            <td>${metric.value}</td>
            <td>${metric.desc}</td>
        `;
        tbody.appendChild(row);
    });
}

// Redraw chart on window resize
window.addEventListener('resize', () => {
    loadDashboard();
});

// Load dashboard on page load
loadDashboard();
