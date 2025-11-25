//workshop.js

const BACKEND_URL = 'http://127.0.0.1:8000'; // Adresse des gestarteten Python-Servers
let CURRENT_USER_ID = null;
let CURRENT_USER_NAME = null;
let timers = {};
let chartInstances = {};

// --- HILFSFUNKTIONEN ---

/**
 * Hilfsfunktion zum Formatieren der Millisekunden in MM:SS.S
 * @param {number} ms - Zeit in Millisekunden
 * @returns {string} Formatierte Zeit
 */
function formatTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const tenths = Math.floor((ms % 1000) / 100);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${tenths}`;
}

/**
 * Startet den Timer.
 */
function startTimer(displayId, timerKey) {
    if (timers[timerKey]) return;
    const display = document.getElementById(displayId);
    const startTime = Date.now();
    timers[timerKey] = setInterval(() => {
        const elapsedTime = Date.now() - startTime;
        display.textContent = formatTime(elapsedTime);
    }, 100);
}

/**
 * Stoppt den Timer und speichert das Ergebnis im Backend.
 */
async function stopTimer(displayId, timerKey, dataKey) {
    if (!timers[timerKey]) return;
    
    clearInterval(timers[timerKey]);
    timers[timerKey] = null;
    
    const display = document.getElementById(displayId);
    const finalTime = display.textContent;
    
    // Umrechnung des formatierten Strings in Millisekunden
    const parts = finalTime.split(/[:.]/);
    const ms = (+parts[0] * 60000) + (+parts[1] * 1000) + (+parts[2] * 100);
    
    if (CURRENT_USER_ID) {
        try {
            const response = await fetch(`${BACKEND_URL}/api/results`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: CURRENT_USER_ID,
                    metric_key: dataKey, 
                    value: ms // Speichert Zeit in Millisekunden
                })
            });
            if (!response.ok) throw new Error('Speichern der Zeit fehlgeschlagen.');
            console.log(`[OK] ${CURRENT_USER_NAME} - Ergebnis für ${dataKey} gespeichert: ${ms}ms.`);
        } catch (error) {
            console.error('API-Fehler beim Speichern:', error);
            alert('FEHLER: Zeit konnte nicht gespeichert werden. Server läuft und ist erreichbar?');
        }
    } else {
        alert("Bitte registrieren Sie sich zuerst.");
    }
}

/**
 * Speichert den Wert eines Input-Feldes (für Exp 3) im Backend.
 */
async function saveInput(inputId, dataKey) {
    const input = document.getElementById(inputId);
    const value = parseInt(input.value) || 0;
    
    if (CURRENT_USER_ID) {
        try {
            const response = await fetch(`${BACKEND_URL}/api/results`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: CURRENT_USER_ID,
                    metric_key: dataKey, 
                    value: value // Speichert Zählung als Zahl
                })
            });
            if (!response.ok) throw new Error('Speichern der Zählung fehlgeschlagen.');
            console.log(`[OK] ${CURRENT_USER_NAME} - Ergebnis für ${dataKey} gespeichert: ${value}.`);
        } catch (error) {
            console.error('API-Fehler beim Speichern:', error);
            alert('FEHLER: Zählung konnte nicht gespeichert werden. Server läuft?');
        }
    } else {
        // Obwohl das input-Feld bereits eine onChange-Funktion hat, sollte dies nur zur Konsistenz dienen.
    }
}

/**
 * Zeigt die Hauptseite an und aktualisiert die Navigation.
 */
function showPage(pageId) {
    // ... unveränderte Logik ...
    document.querySelectorAll('[data-page]').forEach(page => {
        page.style.display = 'none';
    });
    const pageElement = document.getElementById(pageId);
    if (pageElement) {
        pageElement.style.display = 'block';
    } else {
        console.error(`Seite ${pageId} nicht gefunden.`);
    }

    document.querySelectorAll('[data-nav-button]').forEach(btn => {
        btn.classList.remove('active', 'btn-primary');
        btn.classList.add('btn-secondary');
    });
    const activeBtn = document.querySelector(`[data-nav-button="${pageId}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active', 'btn-primary');
        activeBtn.classList.remove('btn-secondary');
    }
}

/**
 * Zeigt einen spezifischen Schritt innerhalb eines Experiments an.
 */
function showStep(expId, stepNum) {
    // ... unveränderte Logik ...
    document.querySelectorAll(`#${expId} [data-step]`).forEach(step => {
        step.style.display = 'none';
    });
    document.getElementById(`${expId}-step${stepNum}`).style.display = 'block';
}

// --- USER MANAGEMENT ---

/**
 * Registriert den Benutzer beim Server und speichert die ID.
 */
async function registerUser(name) {
    try {
        const response = await fetch(`${BACKEND_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name })
        });

        if (!response.ok) throw new Error('Registrierung fehlgeschlagen.');

        const data = await response.json();
        
        CURRENT_USER_ID = data.user_id;
        CURRENT_USER_NAME = data.name;

        // Speichere ID und Name persistent im Browser
        localStorage.setItem('kanban_user_id', CURRENT_USER_ID);
        localStorage.setItem('kanban_user_name', CURRENT_USER_NAME);

        document.getElementById('welcome-name').textContent = `Willkommen, ${CURRENT_USER_NAME}!`;
        showPage('home');
        document.getElementById('registration-card').style.display = 'none';
        document.getElementById('home-content').style.display = 'block';


    } catch (error) {
        console.error('API-Fehler bei Registrierung:', error);
        alert('Fehler bei der Registrierung. Überprüfen Sie, ob der Python-Server läuft.');
    }
}

/**
 * Initialisiert den Benutzer beim Laden der Seite.
 */
async function initUser() {
    CURRENT_USER_ID = localStorage.getItem('kanban_user_id');
    CURRENT_USER_NAME = localStorage.getItem('kanban_user_name');

    // Wenn User-Daten vorhanden, die UI anpassen und zur Home-Seite springen
    if (CURRENT_USER_ID && CURRENT_USER_NAME) {
        document.getElementById('welcome-name').textContent = `Willkommen, ${CURRENT_USER_NAME}!`;
        document.getElementById('registration-card').style.display = 'none';
        document.getElementById('home-content').style.display = 'block';
        showPage('home');
    } else {
        // Ansonsten das Registrierungsformular anzeigen
        document.getElementById('registration-card').style.display = 'block';
        document.getElementById('home-content').style.display = 'none';
        showPage('home');
    }
}


// --- CHART LOGIC (Aggregiert) ---

/**
 * Holt die aggregierten Durchschnittswerte vom Server.
 * Da das Backend keine user-spezifischen Abfragen unterstützt, zeigen wir nur die globalen Durchschnitte.
 */
async function fetchAndPlotAverages(chartName, dataKeys, labels) {
    try {
        const response = await fetch(`${BACKEND_URL}/api/stats/averages`);
        if (!response.ok) throw new Error('Statistiken konnten nicht geladen werden.');
        
        const averages = await response.json();
        
        let avgData = [];
        dataKeys.forEach(key => {
            // Die Werte kommen bereits als Sekunden (float) oder Zählungen vom Server
            const item = averages[key];
            let value = item ? item.avg : 0;
            avgData.push(value); 
        });

        const chart = chartInstances[chartName];
        if (chart) {
            chart.data.datasets[0].data = avgData;
            chart.data.datasets[0].label = 'Durchschnittszeit (Sekunden)';
            chart.options.scales.y.title.text = labels.y_axis; // Aktualisiere die Achsenbeschriftung
            chart.update();
        }

    } catch (error) {
        console.error('Fehler beim Laden der aggregierten Daten:', error);
        // Fallback-Hinweis im Chart-Canvas (funktioniert nur, wenn das Chart noch nicht initialisiert wurde)
        const ctx = document.getElementById(chartName).getContext('2d');
        ctx.font = '14px Inter';
        ctx.fillStyle = '#ef4444';
        ctx.textAlign = 'center';
        ctx.fillText('Daten konnten nicht vom Server geladen werden.', 300, 150); 
    }
}


function updateExp1Chart() {
    fetchAndPlotAverages('exp1Chart', ['exp1_time1', 'exp1_time2'], { y_axis: 'Zeit (Sekunden)' });
}

function updateExp2Charts() {
    fetchAndPlotAverages('exp2a', ['exp2_time1a', 'exp2_time2a'], { y_axis: 'Zeit (Sekunden)' });
    fetchAndPlotAverages('exp2b', ['exp2_time1b', 'exp2_time2b'], { y_axis: 'Zeit (Sekunden)' });
}

async function updateExp3Chart() {
     try {
        const response = await fetch(`${BACKEND_URL}/api/stats/averages`);
        if (!response.ok) throw new Error('Statistiken konnten nicht geladen werden.');
        
        const averages = await response.json();
        
        // Die Werte sind bereits gerundete Durchschnitte der Zählungen
        const doneData = [averages['exp3_r1_done']?.avg || 0, averages['exp3_r2_done']?.avg || 0];
        const failData = [averages['exp3_r1_fail']?.avg || 0, averages['exp3_r2_fail']?.avg || 0];

        const chart = chartInstances.exp3;
        if (chart) {
            chart.data.datasets[0].data = doneData; // Wert (im Eimer)
            chart.data.datasets[1].data = failData; // Müll (am Boden)
            chart.update();
        }

    } catch (error) {
        console.error('Fehler beim Laden der aggregierten Exp 3 Daten:', error);
    }
}

/**
 * Initialisiert alle Chart.js-Diagramme (Struktur bleibt gleich).
 */
function initCharts() {
    Chart.defaults.font.size = 14;
    Chart.defaults.font.family = "'Inter', sans-serif";
    
    // ... (Chart-Initialisierungscode aus der Originaldatei bleibt hier unverändert) ...
    // Ich kürze den Code hier ab, da er in der Originaldatei vorhanden war.

    // Exp 1 Chart
    const ctx1 = document.getElementById('exp1Chart').getContext('2d');
    chartInstances.exp1 = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: ['Runde 1 (Chaos)', 'Runde 2 (Fokus)'],
            datasets: [{
                label: 'Durchschnittszeit',
                data: [0, 0],
                backgroundColor: ['#fca5a5', '#86efac'],
                borderColor: ['#ef4444', '#22c55e'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, title: { display: true, text: 'Zeit (Sekunden)' } } }
        }
    });

    // Exp 2 Chart 1: Zeit bis zur 1. fertigen Münze
    const ctx2a = document.getElementById('exp2Chart1').getContext('2d');
    chartInstances.exp2a = new Chart(ctx2a, {
        type: 'bar',
        data: {
            labels: ['Runde 1 (Batch 20)', 'Runde 2 (Batch 1)'],
            datasets: [{
                label: 'Durchschnittszeit',
                data: [0, 0],
                backgroundColor: ['#fca5a5', '#86efac'],
                borderColor: ['#ef4444', '#22c55e'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, title: { display: true, text: 'Zeit (Sekunden)' } } }
        }
    });

    // Exp 2 Chart 2: Gesamtzeit
    const ctx2b = document.getElementById('exp2Chart2').getContext('2d');
    chartInstances.exp2b = new Chart(ctx2b, {
        type: 'bar',
        data: {
            labels: ['Runde 1 (Batch 20)', 'Runde 2 (Batch 1)'],
            datasets: [{
                label: 'Durchschnittszeit',
                data: [0, 0],
                backgroundColor: ['#fca5a5', '#86efac'],
                borderColor: ['#ef4444', '#22c55e'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, title: { display: true, text: 'Zeit (Sekunden)' } } }
        }
    });

    // Exp 3 Chart: Stacked Bar
    const ctx3 = document.getElementById('exp3Chart').getContext('2d');
    chartInstances.exp3 = new Chart(ctx3, {
        type: 'bar',
        data: {
            labels: ['Runde 1 (Push)', 'Runde 2 (Pull)'],
            datasets: [
                {
                    label: 'Wert (im Eimer)',
                    data: [0, 0],
                    backgroundColor: '#22c55e',
                },
                {
                    label: 'Müll (am Boden)',
                    data: [0, 0],
                    backgroundColor: '#ef4444',
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true },
                y: { stacked: true, beginAtZero: true, title: { display: true, text: 'Anzahl Bälle' } }
            }
        }
    });
}

// --- INITIALISIERUNG ---

document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    
    // Initialisiere den Benutzer (fragt nach Registrierung, falls nötig)
    initUser(); 

    // Die showStep-Aufrufe können bleiben, um die Standardansichten zu setzen
    showStep('exp1', 1);
    showStep('exp2', 1);
    showStep('exp3', 1);

    // Navigation-Buttons
    document.querySelectorAll('[data-nav-button]').forEach(btn => {
        btn.addEventListener('click', () => showPage(btn.dataset.navButton));
    });
    
    // Registrierungs-Button
    document.getElementById('register-button').addEventListener('click', () => {
        const nameInput = document.getElementById('user-name-input');
        if (nameInput.value) {
            registerUser(nameInput.value);
        } else {
            alert('Bitte geben Sie einen Namen ein.');
        }
    });

    // Timer-Events
    document.getElementById('exp1-timer1-start').addEventListener('click', () => startTimer('exp1-timer1-display', 'exp1_1'));
    document.getElementById('exp1-timer1-stop').addEventListener('click', () => stopTimer('exp1-timer1-display', 'exp1_1', 'exp1_time1'));
    document.getElementById('exp1-timer2-start').addEventListener('click', () => startTimer('exp1-timer2-display', 'exp1_2'));
    document.getElementById('exp1-timer2-stop').addEventListener('click', () => stopTimer('exp1-timer2-display', 'exp1_2', 'exp1_time2'));

    document.getElementById('exp2-timer1a-start').addEventListener('click', () => startTimer('exp2-timer1a-display', 'exp2_1a'));
    document.getElementById('exp2-timer1a-stop').addEventListener('click', () => stopTimer('exp2-timer1a-display', 'exp2_1a', 'exp2_time1a'));
    document.getElementById('exp2-timer1b-start').addEventListener('click', () => startTimer('exp2-timer1b-display', 'exp2_1b'));
    document.getElementById('exp2-timer1b-stop').addEventListener('click', () => stopTimer('exp2-timer1b-display', 'exp2_1b', 'exp2_time1b'));
    document.getElementById('exp2-timer2a-start').addEventListener('click', () => startTimer('exp2-timer2a-display', 'exp2_2a'));
    document.getElementById('exp2-timer2a-stop').addEventListener('click', () => stopTimer('exp2-timer2a-display', 'exp2_2a', 'exp2_time2a'));
    document.getElementById('exp2-timer2b-start').addEventListener('click', () => startTimer('exp2-timer2b-display', 'exp2_2b'));
    document.getElementById('exp2-timer2b-stop').addEventListener('click', () => stopTimer('exp2-timer2b-display', 'exp2_2b', 'exp2_time2b'));
});

// Export der Funktionen für onclick-Attribute im HTML
window.showStep = showStep;
window.updateExp1Chart = updateExp1Chart;
window.updateExp2Charts = updateExp2Charts;
window.updateExp3Chart = updateExp3Chart;
window.saveInput = saveInput; // saveInput muss jetzt ASYNC sein