// admin.js
const BACKEND_URL = 'https://clinton-lender-casinos-balloon.trycloudflare.com'; // Adresse des FastAPI Servers

let chartInstances = {}; // Speichert die Chart-Instanzen

/**
 * Konvertiert Millisekunden in ein lesbares Format für die Diagrammbeschriftung.
 * @param {number} ms - Zeit in Millisekunden
 * @returns {string} Formatierte Zeit (z.B. "15.5 Sek")
 */
function formatMsToSeconds(ms) {
    if (typeof ms !== 'number' || isNaN(ms)) return '0';
    return (ms / 1000).toFixed(1) + ' Sek';
}

/**
 * Ruft die aggregierten Durchschnittswerte vom Server ab, initialisiert die Charts
 * und rendert die Daten.
 */
async function fetchAndRenderStats() {
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const statsContainer = document.getElementById('stats-container');
    
    loading.classList.remove('hidden');
    error.classList.add('hidden');
    
    try {
        // 1. Durchschnittswerte abrufen
        const response = await fetch(`${BACKEND_URL}/api/stats/averages`);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        
        const averages = await response.json();

        // 2. Charts initialisieren (falls noch nicht geschehen)
        if (Object.keys(chartInstances).length === 0) {
            initCharts();
        }

        // 3. Charts mit Durchschnittswerten aktualisieren
        updateCharts(averages);
        
        // 4. Teilnehmerliste abrufen und rendern
        await fetchAndRenderUsers();

        loading.classList.add('hidden');
        statsContainer.classList.remove('hidden');

    } catch (err) {
        console.error('Fehler beim Abrufen der Statistiken:', err);
        loading.classList.add('hidden');
        error.classList.remove('hidden');
    }
}

/**
 * Initialisiert alle Chart.js Diagramme.
 */
function initCharts() {
    // Shared Chart Options
    const sharedOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: true, position: 'top' },
            tooltip: { callbacks: { label: (context) => {
                const value = context.parsed.y;
                return context.dataset.label + ': ' + formatMsToSeconds(value);
            }}}
        },
        scales: {
            y: { beginAtZero: true, title: { display: true, text: 'Zeit (ms)' }, ticks: { callback: formatMsToSeconds } }
        }
    };

    // --- Exp 1 Chart ---
    chartInstances.exp1 = new Chart(document.getElementById('adminExp1Chart').getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Runde 1 (Zeilenweise)', 'Runde 2 (Spaltenweise / Fokus)'],
            datasets: [{
                label: 'Durchschnittliche Zeit',
                data: [0, 0],
                backgroundColor: ['#fca5a5', '#86efac'], // Rot für Batch/Chaos, Grün für Flow/Fokus
                borderColor: ['#ef4444', '#22c55e'],
                borderWidth: 1
            }]
        },
        options: { ...sharedOptions, plugins: { legend: { display: false } } }
    });

    // --- Exp 2 Chart 1 (Erste Münze) ---
    chartInstances.exp2a = new Chart(document.getElementById('adminExp2Chart1').getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Runde 1 (Batch 20)', 'Runde 2 (Batch 1 / Flow)'],
            datasets: [{
                label: 'Durchschnittliche Zeit bis zur 1. Münze',
                data: [0, 0],
                backgroundColor: ['#f87171', '#34d399'],
                borderColor: ['#b91c1c', '#059669'],
                borderWidth: 1
            }]
        },
        options: { ...sharedOptions, plugins: { legend: { display: false } } }
    });

    // --- Exp 2 Chart 2 (Gesamtzeit) ---
    chartInstances.exp2b = new Chart(document.getElementById('adminExp2Chart2').getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Runde 1 (Batch 20)', 'Runde 2 (Batch 1 / Flow)'],
            datasets: [{
                label: 'Durchschnittliche Gesamtzeit',
                data: [0, 0],
                backgroundColor: ['#6366f1', '#a78bfa'], // Andere Farben für Unterscheidung
                borderColor: ['#4f46e5', '#8b5cf6'],
                borderWidth: 1
            }]
        },
        options: { ...sharedOptions, plugins: { legend: { display: false } } }
    });

    // --- Exp 3 Chart (Stacked Bar) ---
    const exp3Options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true, position: 'top' } },
        scales: {
            x: { stacked: true },
            y: { stacked: true, beginAtZero: true, title: { display: true, text: 'Anzahl Bälle' } }
        }
    };

    chartInstances.exp3 = new Chart(document.getElementById('adminExp3Chart').getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Runde 1 (Push)', 'Runde 2 (Pull)'],
            datasets: [
                {
                    label: 'Wert (im Eimer - Avg.)',
                    data: [0, 0],
                    backgroundColor: '#22c55e',
                },
                {
                    label: 'Müll (am Boden - Avg.)',
                    data: [0, 0],
                    backgroundColor: '#ef4444',
                }
            ]
        },
        options: exp3Options
    });
}

/**
 * Aktualisiert die Daten in den Chart-Instanzen.
 * @param {object} averages - Die vom Server abgerufenen Durchschnittswerte.
 */
function updateCharts(averages) {
    // EXP 1
    const exp1_time1 = averages.exp1_time1 ? averages.exp1_time1.avg : 0;
    const exp1_time2 = averages.exp1_time2 ? averages.exp1_time2.avg : 0;
    chartInstances.exp1.data.datasets[0].data = [exp1_time1, exp1_time2];
    chartInstances.exp1.update();

    // EXP 2
    const exp2_time1a = averages.exp2_time1a ? averages.exp2_time1a.avg : 0;
    const exp2_time2a = averages.exp2_time2a ? averages.exp2_time2a.avg : 0;
    chartInstances.exp2a.data.datasets[0].data = [exp2_time1a, exp2_time2a];
    chartInstances.exp2a.update();

    const exp2_time1b = averages.exp2_time1b ? averages.exp2_time1b.avg : 0;
    const exp2_time2b = averages.exp2_time2b ? averages.exp2_time2b.avg : 0;
    chartInstances.exp2b.data.datasets[0].data = [exp2_time1b, exp2_time2b];
    chartInstances.exp2b.update();

    // EXP 3 (Gezählt in ganzen Zahlen, nicht Millisekunden)
    const exp3_r1_done = averages.exp3_r1_done ? averages.exp3_r1_done.avg : 0;
    const exp3_r1_fail = averages.exp3_r1_fail ? averages.exp3_r1_fail.avg : 0;
    const exp3_r2_done = averages.exp3_r2_done ? averages.exp3_r2_done.avg : 0;
    const exp3_r2_fail = averages.exp3_r2_fail ? averages.exp3_r2_fail.avg : 0;

    chartInstances.exp3.data.datasets[0].data = [exp3_r1_done, exp3_r2_done]; // Wert
    chartInstances.exp3.data.datasets[1].data = [exp3_r1_fail, exp3_r2_fail]; // Müll
    chartInstances.exp3.options.plugins.tooltip.callbacks.label = (context) => {
        return context.dataset.label + ': ' + context.parsed.y.toFixed(2);
    };
    chartInstances.exp3.options.scales.y.ticks.callback = (value) => value.toFixed(0);
    chartInstances.exp3.update();
}


/**
 * Ruft die registrierten Benutzer ab und zeigt sie an. (Unverändert)
 */
async function fetchAndRenderUsers() {
    const userList = document.getElementById('user-list');
    const noUsers = document.getElementById('no-users');
    userList.innerHTML = '';
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/stats/users`);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        
        const users = await response.json();
        
        if (users.length === 0) {
            noUsers.classList.remove('hidden');
        } else {
            noUsers.classList.add('hidden');
            users.forEach(user => {
                const li = document.createElement('li');
                li.textContent = `${user.name} (ID: ${user.user_id.substring(0, 8)}...)`;
                userList.appendChild(li);
            });
        }
    } catch (err) {
        console.error('Fehler beim Abrufen der Benutzerliste:', err);
        const li = document.createElement('li');
        li.textContent = 'Fehler beim Laden der Benutzerliste.';
        userList.appendChild(li);
    }
}

// Initialer Aufruf und Auto-Refresh
window.onload = () => {
    fetchAndRenderStats();
    // Optional: Auto-Refresh alle 10 Sekunden
    // setInterval(fetchAndRenderStats, 10000); 
};