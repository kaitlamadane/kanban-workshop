# server.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Union
from uuid import uuid4
import statistics
import uvicorn
import json

# --- SETUP UND DATENSTRUKTUR ---

app = FastAPI(title="Kanban Statistik Backend")

# Für die Entwicklung: alles erlauben (auch file:// und ngrok)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # oder hier gezielt deine URLs eintragen
    allow_credentials=False,   # bei "*" unbedingt False lassen
    allow_methods=["*"],
    allow_headers=["*"],
)


# In-Memory-Datenbank
# users: { "user_id": "Name des Teilnehmers" }
# results: { "user_id": { "metric_key": [wert1, wert2, ...] } }
USER_DB: Dict[str, str] = {}
RESULTS_DB: Dict[str, Dict[str, List[int]]] = {}

# Pydantic Schemas für die API-Validierung
class UserRegistration(BaseModel):
    name: str

class UserResult(BaseModel):
    user_id: str
    metric_key: str
    value: int # Zeit in Millisekunden oder Zählung

# Erlaubt CORS, damit das Admin-Frontend von einem anderen Port/Server zugreifen kann
origins = ["*"] # In einer Produktionsumgebung sollte dies eingeschränkt werden
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- HILFSFUNKTIONEN ---

def calculate_averages() -> Dict[str, Dict[str, Union[str, float, int]]]:
    """Berechnet die Durchschnittswerte über ALLE Benutzer."""
    
    all_raw_data: Dict[str, List[int]] = {}
    
    # 1. Alle Rohdaten aus allen Benutzern in einer flachen Struktur sammeln
    for user_id in RESULTS_DB:
        for metric_key, values in RESULTS_DB[user_id].items():
            if metric_key not in all_raw_data:
                all_raw_data[metric_key] = []
            all_raw_data[metric_key].extend(values)

    # 2. Durchschnittswerte berechnen
    averages: Dict[str, Dict[str, Union[str, float, int]]] = {}

    for key, values in all_raw_data.items():
        if not values:
            continue

        average_value = statistics.mean(values)

        # Standard: Zählwerte
        unit = "Stück"
        display_value = round(average_value, 2)

        # Zeit-Werte lieber in ms lassen (Admin rechnet schon in Sekunden um!)
        if key.startswith("exp") and "time" in key:
            unit = "Millisekunden"
            display_value = round(average_value, 2)

        averages[key] = {
            "avg": display_value,
            "unit": unit,
            "count": len(values),
        }

    return averages


# --- API-ENDPUNKTE ---

@app.post("/api/register")
def register_user(user: UserRegistration):
    """Registriert einen neuen Benutzer und gibt eine User ID zurück."""
    user_id = str(uuid4())
    USER_DB[user_id] = user.name
    RESULTS_DB[user_id] = {} # Initialisiert das Ergebnis-Dictionary für den User
    return {"user_id": user_id, "name": user.name}

@app.post("/api/results")
def submit_user_result(result: UserResult):
    """Speichert ein Messergebnis für einen bestimmten Benutzer."""
    if result.user_id not in USER_DB:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden.")
    
    user_results = RESULTS_DB[result.user_id]
    
    # Fügt den Wert zur Metrik-Liste des Benutzers hinzu
    if result.metric_key not in user_results:
        user_results[result.metric_key] = []
        
    user_results[result.metric_key].append(result.value)
    
    return {"message": "Ergebnis erfolgreich gespeichert", "user": USER_DB[result.user_id]}

@app.get("/api/stats/users")
def get_user_list():
    """Gibt eine Liste aller registrierten Benutzer zurück."""
    users = [{"user_id": uid, "name": name} for uid, name in USER_DB.items()]
    return users

@app.get("/api/stats/averages")
def get_aggregated_averages():
    """Gibt die aggregierten Durchschnittswerte aller Metriken zurück."""
    return calculate_averages()

@app.get("/")
def read_root():
    return {"message": "Kanban Backend läuft. Admin UI unter /admin-ui/admin.html aufrufen."}

# --- SERVER START ---
if __name__ == "__main__":
    print("Starte Kanban Backend. Drücken Sie STRG+C zum Beenden.")
    # Setzen Sie reload=True für die Entwicklung
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)