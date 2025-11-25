// admin.js
const BACKEND_URL = 'http://127.0.0.1:8000'; // Adresse des FastAPI Servers

/**
 * Konvertiert einen metrischen Schlüssel in einen lesbaren Namen.
 * @param {string} key - Der Schlüssel aus der Datenbank (z.B. exp1_time1)
 * @returns {string} Ein lesbarer Name.
 */
function getReadableName(key) {
    let name = key.replace(/exp(\d)_/, 'Experiment $1: ');
    name = name.replace(/time(\d)/, 'Runde $1 (Zeit)');
    name = name.replace(/r(\d)_(done|fail)/, 'Runde $1 ($2)');
    name = name.replace('done', 'Fertig');
    name = name.replace('fail', 'Fehler');
    name = name.replace('time1a', 'R1 (Erste Münze)');
    name = name.replace('time1b', 'R1 (Alle Münzen)');
    name = name.replace('time2a', 'R2 (Erste Münze)');
    name = name.replace('time2b', 'R2 (Alle Münzen)');
    return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Ruft die aggregierten Durchschnittswerte vom Server ab und rendert die Tabelle.
 */
async function fetchAndRenderStats() {
    const tableBody = document.getElementById('stats-table-body');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const statsContainer = document.getElementById('stats-container');
    
    tableBody.innerHTML = '';
    loading.classList.remove('hidden');
    error.classList.add('hidden');
    
    try {
        // 1. Durchschnittswerte abrufen
        const response = await fetch(`${BACKEND_URL}/api/stats/averages`);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        
        const averages = await response.json();

        // 2. Tabelle rendern
        for (const key in averages) {
            const item = averages[key];
            const row = tableBody.insertRow();
            row.className = 'hover:bg-gray-50';
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${getReadableName(key)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-semibold">${item.avg} ${item.unit}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.count}</td>
            `;
        }
        
        // 3. Teilnehmerliste abrufen und rendern
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
 * Ruft die registrierten Benutzer ab und zeigt sie an.
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