# server.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Union
from uuid import uuid4
import statistics
import uvicorn

# --- IN-MEMORY DATENBANK ---

# user_id -> Name
USER_DB: Dict[str, str] = {}

# user_id -> { metric_key -> [werte] }
RESULTS_DB: Dict[str, Dict[str, List[int]]] = {}

# --- FASTAPI APP ---

app = FastAPI(title="Kanban Statistik Backend")

# --- CORS für ngrok & lokale HTML-Dateien erlauben ---

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # für Entwicklung ok; später einschränken
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- SCHEMAS ---

class RegisterRequest(BaseModel):
    name: str

class RegisterResponse(BaseModel):
    user_id: str
    name: str

class ResultPayload(BaseModel):
    user_id: str
    metric_key: str
    value: int  # Millisekunden oder Zählwert


# --- HILFSFUNKTIONEN ---

def calculate_averages() -> Dict[str, Dict[str, Union[str, float, int]]]:
    """
    Berechnet Durchschnittswerte aller Metriken über alle Nutzer.
    Format passt zu admin.js.
    """
    all_raw_data: Dict[str, List[int]] = {}

    # Alle Werte über alle Nutzer sammeln
    for user_id, metrics in RESULTS_DB.items():
        for metric_key, values in metrics.items():
            if metric_key not in all_raw_data:
                all_raw_data[metric_key] = []
            all_raw_data[metric_key].extend(values)

    averages: Dict[str, Dict[str, Union[str, float, int]]] = {}

    for key, values in all_raw_data.items():
        if not values:
            continue

        avg_value = statistics.mean(values)

        # Standard: Zählwerte
        unit = "Stück"
        display_value = round(avg_value, 2)

        # Zeitwerte: in ms lassen, admin.js rechnet in Sekunden um
        if key.startswith("exp") and "time" in key:
            unit = "Millisekunden"
            display_value = round(avg_value, 2)

        averages[key] = {
            "avg": display_value,
            "unit": unit,
            "count": len(values),
        }

    return averages


# --- API-ENDPOINTS, DIE ZU DEINEM JS PASSEN ---

@app.post("/api/register", response_model=RegisterResponse)
def register_user(payload: RegisterRequest):
    """
    Wird von workshop.js aufgerufen:
    POST /api/register mit { "name": "..." }
    """
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name darf nicht leer sein.")

    user_id = str(uuid4())
    USER_DB[user_id] = name
    RESULTS_DB[user_id] = {}

    return RegisterResponse(user_id=user_id, name=name)


@app.post("/api/results")
def save_result(payload: ResultPayload):
    """
    Wird von workshop.js bei jedem Stop/Save aufgerufen:
    POST /api/results mit { user_id, metric_key, value }
    """
    if payload.user_id not in USER_DB:
        raise HTTPException(status_code=404, detail="User nicht gefunden.")

    user_results = RESULTS_DB.setdefault(payload.user_id, {})
    metric_values = user_results.setdefault(payload.metric_key, [])
    metric_values.append(int(payload.value))

    return {"status": "ok"}


@app.get("/api/stats/users")
def get_user_list():
    """Wird von admin.js genutzt, um die Teilnehmerliste zu laden."""
    return [
        {"user_id": uid, "name": name}
        for uid, name in USER_DB.items()
    ]


@app.get("/api/stats/averages")
def get_aggregated_averages():
    """Wird von admin.js genutzt, um die Diagramme zu füllen."""
    return calculate_averages()


@app.get("/")
def read_root():
    return {"message": "Kanban Backend läuft. Admin UI unter /admin-ui/admin.html aufrufen."}


# --- SERVER STARTEN ---

if __name__ == "__main__":
    print("Starte Kanban Backend. Drücken Sie STRG+C zum Beenden.")
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
