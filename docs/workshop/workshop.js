// workshop.js - Vollständige Version

// HIER HÖCHSTWAHRSCHEINLICH ANPASSEN FÜR NGROK (z.B. 'https://xxxx.ngrok-free.app')
const BACKEND_URL = 'https://2b728836c99b.ngrok-free.app'; 

let CURRENT_USER_ID = null;
let CURRENT_USER_NAME = null;
let timers = {};
let chartInstances = {};

// --- HILFSFUNKTIONEN ---

/**
 * Formatiert Millisekunden in MM:SS.S
 */
function formatTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const tenths = Math.floor((ms % 1000) / 100);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${tenths}`;
}

/**
 * Startet einen Timer
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
 * Stoppt Timer, speichert lokal UND sendet an Backend
 */
async function stopTimer(displayId, timerKey, dataKey) {
    if (!timers[timerKey]) return;
    
    clearInterval(timers[timerKey]);
    timers[timerKey] = null;
    
    const display = document.getElementById(displayId);
    const finalTime = display.textContent;
    
    // Zeit berechnen (ms)
    const parts = finalTime.split(/[:.]/);
    const ms = (+parts[0] * 60000) + (+parts[1] * 1000) + (+parts[2] * 100);
    
    // 1. LOKAL SPEICHERN (Wichtig für das eigene Diagramm!)
    localStorage.setItem(dataKey, ms);
    console.log(`Lokal gespeichert: ${dataKey} = ${ms}`);

    // 2. AN BACKEND SENDEN (Für Admin-Statistik)
    if (CURRENT_USER_ID) {
        try {
            await fetch(`${BACKEND_URL}/api/results`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: CURRENT_USER_ID,
                    metric_key: dataKey, 
                    value: ms 
                })
            });
        } catch (error) {
            console.error('Backend-Fehler (Daten sind aber lokal sicher):', error);
        }
    }
}

/**
 * Speichert Input-Wert lokal UND sendet an Backend
 */
async function saveInput(inputId, dataKey) {
    const input = document.getElementById(inputId);
    const value = parseInt(input.value) || 0;
    
    // 1. LOKAL SPEICHERN
    localStorage.setItem(dataKey, value);

    // 2. AN BACKEND SENDEN
    if (CURRENT_USER_ID) {
        try {
            await fetch(`${BACKEND_URL}/api/results`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: CURRENT_USER_ID,
                    metric_key: dataKey, 
                    value: value
                })
            });
        } catch (error) {
            console.error('Backend-Fehler:', error);
        }
    }
}

// --- NAVIGATION ---

function showPage(pageId) {
    document.querySelectorAll('[data-page]').forEach(page => page.style.display = 'none');
    const target = document.getElementById(pageId);
    if(target) target.style.display = 'block';

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

function showStep(expId, stepNum) {
    document.querySelectorAll(`#${expId} [data-step]`).forEach(step => step.style.display = 'none');
    document.getElementById(`${expId}-step${stepNum}`).style.display = 'block';
}

// --- USER MANAGEMENT ---

async function registerUser(name) {
    try {
        const response = await fetch(`${BACKEND_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name })
        });
        if (!response.ok) throw new Error('Fehler');
        const data = await response.json();
        
        CURRENT_USER_ID = data.user_id;
        CURRENT_USER_NAME = data.name;
        localStorage.setItem('kanban_user_id', CURRENT_USER_ID);
        localStorage.setItem('kanban_user_name', CURRENT_USER_NAME);

        initUser(); // UI aktualisieren

    } catch (error) {
        alert('Registrierung fehlgeschlagen. Server läuft?');
    }
}

function initUser() {
    CURRENT_USER_ID = localStorage.getItem('kanban_user_id');
    CURRENT_USER_NAME = localStorage.getItem('kanban_user_name');

    if (CURRENT_USER_ID && CURRENT_USER_NAME) {
        const welcome = document.getElementById('welcome-name');
        if(welcome) welcome.textContent = `Willkommen, ${CURRENT_USER_NAME}!`;
        
        const regCard = document.getElementById('registration-card');
        if(regCard) regCard.style.display = 'none';
        
        const content = document.getElementById('home-content');
        if(content) content.style.display = 'block';
        
        showPage('home');
    } else {
        const regCard = document.getElementById('registration-card');
        if(regCard) regCard.style.display = 'block';
        
        const content = document.getElementById('home-content');
        if(content) content.style.display = 'none';
        
        showPage('home');
    }
}

// --- CHART FUNKTIONEN (NUR LOKALE DATEN) ---

function updateExp1Chart() {
    // Daten aus localStorage holen
    const t1 = localStorage.getItem('exp1_time1') || 0;
    const t2 = localStorage.getItem('exp1_time2') || 0;

    const chart = chartInstances.exp1;
    if (chart) {
        chart.data.datasets[0].data = [t1, t2];
        chart.update();
    }
}

function updateExp2Charts() {
    // Chart 1: Erste Münze
    const t1a = localStorage.getItem('exp2_time1a') || 0;
    const t2a = localStorage.getItem('exp2_time2a') || 0;
    
    // Chart 2: Alle Münzen
    const t1b = localStorage.getItem('exp2_time1b') || 0;
    const t2b = localStorage.getItem('exp2_time2b') || 0;

    if (chartInstances.exp2a) {
        chartInstances.exp2a.data.datasets[0].data = [t1a, t2a];
        chartInstances.exp2a.update();
    }
    if (chartInstances.exp2b) {
        chartInstances.exp2b.data.datasets[0].data = [t1b, t2b];
        chartInstances.exp2b.update();
    }
}

function updateExp3Chart() {
    const r1_done = localStorage.getItem('exp3_r1_done') || 0;
    const r1_fail = localStorage.getItem('exp3_r1_fail') || 0;
    const r2_done = localStorage.getItem('exp3_r2_done') || 0;
    const r2_fail = localStorage.getItem('exp3_r2_fail') || 0;

    const chart = chartInstances.exp3;
    if (chart) {
        chart.data.datasets[0].data = [r1_done, r2_done]; // Wert
        chart.data.datasets[1].data = [r1_fail, r2_fail]; // Müll
        chart.update();
    }
}

// --- INIT CHARTS ---

function initCharts() {
    Chart.defaults.font.size = 14;
    Chart.defaults.font.family = "'Inter', sans-serif";
    
    // Helper für Sekunden-Anzeige
    const timeScaleOptions = {
        beginAtZero: true, 
        title: { display: true, text: 'Zeit (Sekunden)' },
        ticks: { callback: (val) => (val / 1000).toFixed(1) } // MS -> Sek
    };
    
    const tooltipTime = {
        callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${(ctx.parsed.y / 1000).toFixed(1)} s`
        }
    };

    // --- EXP 1 ---
    const ctx1 = document.getElementById('exp1Chart').getContext('2d');
    chartInstances.exp1 = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: ['Runde 1 (Chaos)', 'Runde 2 (Fokus)'],
            datasets: [{
                label: 'Ihre Zeit',
                data: [0, 0],
                backgroundColor: ['#fca5a5', '#86efac'],
                borderColor: ['#ef4444', '#22c55e'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: tooltipTime },
            scales: { y: timeScaleOptions }
        }
    });

    // --- EXP 2 ---
    const ctx2a = document.getElementById('exp2Chart1').getContext('2d');
    chartInstances.exp2a = new Chart(ctx2a, {
        type: 'bar',
        data: {
            labels: ['Batch 20', 'Batch 1'],
            datasets: [{
                label: 'Zeit bis 1. Münze',
                data: [0, 0],
                backgroundColor: ['#fca5a5', '#86efac'],
                borderColor: ['#ef4444', '#22c55e'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: tooltipTime },
            scales: { y: timeScaleOptions }
        }
    });

    const ctx2b = document.getElementById('exp2Chart2').getContext('2d');
    chartInstances.exp2b = new Chart(ctx2b, {
        type: 'bar',
        data: {
            labels: ['Batch 20', 'Batch 1'],
            datasets: [{
                label: 'Gesamtzeit',
                data: [0, 0],
                backgroundColor: ['#fca5a5', '#86efac'],
                borderColor: ['#ef4444', '#22c55e'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: tooltipTime },
            scales: { y: timeScaleOptions }
        }
    });

    // --- EXP 3 ---
    const ctx3 = document.getElementById('exp3Chart').getContext('2d');
    chartInstances.exp3 = new Chart(ctx3, {
        type: 'bar',
        data: {
            labels: ['Push', 'Pull'],
            datasets: [
                { label: 'Wert (Fertig)', data: [0, 0], backgroundColor: '#22c55e' },
                { label: 'Müll (Fehler)', data: [0, 0], backgroundColor: '#ef4444' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true },
                y: { stacked: true, beginAtZero: true, title: { display: true, text: 'Anzahl' } }
            }
        }
    });
}


// --- MAIN EVENT LISTENER ---

document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    initUser();
    
    showStep('exp1', 1);
    showStep('exp2', 1);
    showStep('exp3', 1);

    // Navigation
    document.querySelectorAll('[data-nav-button]').forEach(btn => {
        btn.addEventListener('click', () => showPage(btn.dataset.navButton));
    });

    // Registrierung
    const regBtn = document.getElementById('register-button');
    if(regBtn) {
        regBtn.addEventListener('click', () => {
            const name = document.getElementById('user-name-input').value;
            if (name) registerUser(name);
            else alert('Bitte Namen eingeben.');
        });
    }

    // Exp 1 Buttons
    document.getElementById('exp1-timer1-start').addEventListener('click', () => startTimer('exp1-timer1-display', 'exp1_1'));
    document.getElementById('exp1-timer1-stop').addEventListener('click', () => stopTimer('exp1-timer1-display', 'exp1_1', 'exp1_time1'));
    document.getElementById('exp1-timer2-start').addEventListener('click', () => startTimer('exp1-timer2-display', 'exp1_2'));
    document.getElementById('exp1-timer2-stop').addEventListener('click', () => stopTimer('exp1-timer2-display', 'exp1_2', 'exp1_time2'));

    // Exp 2 Buttons
    document.getElementById('exp2-timer1a-start').addEventListener('click', () => startTimer('exp2-timer1a-display', 'exp2_1a'));
    document.getElementById('exp2-timer1a-start').addEventListener('click', () => startTimer('exp2-timer1b-display', 'exp2_1b')); //beide timer sollen gleichzeitig starten
    document.getElementById('exp2-timer1a-stop').addEventListener('click', () => stopTimer('exp2-timer1a-display', 'exp2_1a', 'exp2_time1a'));
    //document.getElementById('exp2-timer1b-start').addEventListener('click', () => startTimer('exp2-timer1b-display', 'exp2_1b'));
    document.getElementById('exp2-timer1b-stop').addEventListener('click', () => stopTimer('exp2-timer1b-display', 'exp2_1b', 'exp2_time1b'));
    
    document.getElementById('exp2-timer2a-start').addEventListener('click', () => startTimer('exp2-timer2a-display', 'exp2_2a'));
    document.getElementById('exp2-timer2a-start').addEventListener('click', () => startTimer('exp2-timer2b-display', 'exp2_2b')); // beide timer sollen gleichzeitig starten
    document.getElementById('exp2-timer2a-stop').addEventListener('click', () => stopTimer('exp2-timer2a-display', 'exp2_2a', 'exp2_time2a'));
    //document.getElementById('exp2-timer2b-start').addEventListener('click', () => startTimer('exp2-timer2b-display', 'exp2_2b'));
    document.getElementById('exp2-timer2b-stop').addEventListener('click', () => stopTimer('exp2-timer2b-display', 'exp2_2b', 'exp2_time2b'));
});

// Global verfügbar machen für HTML onclick
window.showStep = showStep;
window.updateExp1Chart = updateExp1Chart;
window.updateExp2Charts = updateExp2Charts;
window.updateExp3Chart = updateExp3Chart;
window.saveInput = saveInput;