# AQI India — Air Quality Prediction Dashboard

> Real-time air quality monitoring, 7-day ML forecasting, and health risk intelligence for India's major cities.

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-2.x-000000?style=flat&logo=flask&logoColor=white)
![XGBoost](https://img.shields.io/badge/XGBoost-ML%20Model-189AB4?style=flat)
![WAQI](https://img.shields.io/badge/WAQI-Live%20API-22c55e?style=flat)
![License](https://img.shields.io/badge/License-MIT-f59e0b?style=flat)

---

## Overview

AQI India is a full-stack air quality intelligence platform that combines live sensor data from the World Air Quality Index (WAQI) API with a trained XGBoost regression model to deliver real-time monitoring and predictive analytics across 10 major Indian cities.

The dashboard surfaces actionable health guidance, pollutant breakdowns, city comparisons, and model explainability — all in a single dark-themed, mobile-responsive interface.

---

## Features

### Live Monitoring
- Real-time AQI fetch from WAQI API with 10-minute server-side caching
- PM2.5, PM10, NO₂, SO₂, CO, O₃, NH₃ pollutant cards with colour-coded severity
- Cigarette-equivalent exposure metric (PM2.5 ÷ 22)
- Stale data detection — flags stations not updated in 48+ hours
- Animated AQI character (6 distinct poses matching Good → Severe levels)
- City landmark skyline with dynamic background wash per AQI level

### 7-Day ML Forecast
- XGBoost model generates a rolling 7-day AQI forecast
- Each day's prediction seeds the next (lag features updated iteratively)
- Forecast cards show day, AQI value, category, bar chart, and trend arrow (↑↓→)

### City Comparison
- Side-by-side comparison of any two cities
- Overlaid 7-day line chart with per-city colour coding
- Parallel backend fetching — both cities fetched simultaneously via `ThreadPoolExecutor`
- 250ms frontend debounce prevents redundant requests on rapid dropdown changes

### India AQI Heatmap
- SVG map of India with glowing colour-coded city dots
- Click any dot to switch the dashboard to that city
- Ranked city list sorted by AQI (worst → best) with category chips

### Model Explainability
- Animated SVG node graph — feature nodes connected to central "Predicted AQI" node
- Node size and line brightness proportional to feature importance
- Global feature importance bars (loaded once at startup from `model.feature_importances_`)
- Per-prediction breakdown — after each prediction, shows which input features drove that specific result

### Predict Tomorrow's AQI
- Floating-label form for all 17 model features
- Animated loading sequence: pulse rings + scan sweep line + cycling status messages
- Minimum 1.8s loading delay so animation plays fully regardless of server speed
- SVG speedometer gauge — needle sweeps to predicted AQI with count-up number animation
- Result card colour, border, and category chip all match the predicted AQI level

### Health Intelligence
- 7-tab health risk section (Headaches, Eyes, Pregnancy, Asthma, Heart, Allergies, Sinus)
- Each condition has its own signature colour, glow, and risk meter needle
- Common signs displayed as interactive hover-glow pill tags
- Do's and Don'ts in styled columns with green/red left borders
- Health recommendations panel (Air Purifier / Car Filter / N95 Mask / Stay Indoor)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.10+, Flask 2.x |
| ML Model | XGBoost (scikit-learn wrapper), joblib |
| Live Data | WAQI API (World Air Quality Index) |
| Historical Data | CPCB India CSV (`combined_aqi.csv`) |
| Frontend | Vanilla JS, Chart.js, inline SVG |
| Styling | Custom CSS (dark theme, CSS variables, animations) |
| Concurrency | `ThreadPoolExecutor` for parallel city fetches |

---

## Project Structure

```
aqi-india/
├── app.py                  # Flask application, routes, ML inference
├── templates/
│   └── index.html          # Single-page dashboard template
├── static/
│   ├── style.css           # All styles (dark theme + animations)
│   ├── script.js           # All client-side logic
│   └── icons/              # City landmark PNG icons
│       ├── delhi.png
│       ├── mumbai.png
│       ├── bangalore.png
│       └── ...
├── model/
│   ├── xgb_model.pkl       # Trained XGBoost regressor
│   └── label_encoder.pkl   # City name label encoder
├── data/
│   └── combined_aqi.csv    # Historical CPCB AQI data
└── README.md
```

---

## Installation

### Prerequisites
- Python 3.10 or higher
- pip

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/your-username/aqi-india.git
cd aqi-india

# 2. Create a virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install flask pandas numpy xgboost scikit-learn joblib requests

# 4. Run the app
python app.py
```

Open `http://127.0.0.1:5000` in your browser.

---

## Configuration

### WAQI API Token
The app uses the [World Air Quality Index API](https://aqicn.org/api/). The token is set in `app.py`:

```python
WAQI_TOKEN = 'your_token_here'
```

Get a free token at [aqicn.org/data-platform/token](https://aqicn.org/data-platform/token/).

### Supported Cities

| City | WAQI Station |
|---|---|
| Delhi | `delhi` |
| Mumbai | `mumbai` |
| Bengaluru | `bengaluru` |
| Chennai | `chennai` |
| Kolkata | `kolkata` |
| Hyderabad | `hyderabad` |
| Jaipur | `jaipur` |
| Lucknow | `lucknow` |
| Gwalior | `gwalior` |
| Visakhapatnam | `visakhapatnam` |

---

## ML Model

### Features (17 total)

| Feature | Description |
|---|---|
| `PM2.5` | Fine particulate matter (μg/m³) |
| `PM10` | Coarse particulate matter (μg/m³) |
| `NO2` | Nitrogen dioxide (μg/m³) |
| `NH3` | Ammonia (μg/m³) |
| `SO2` | Sulphur dioxide (μg/m³) |
| `CO` | Carbon monoxide (mg/m³) |
| `O3` | Ozone (μg/m³) |
| `AQI` | Current day AQI |
| `AQI_lag1` | AQI from 1 day ago |
| `AQI_lag3` | AQI from 3 days ago |
| `AQI_lag7` | AQI from 7 days ago |
| `AQI_roll7_mean` | 7-day rolling average AQI |
| `city_encoded` | Label-encoded city identifier |
| `month` | Month of year (1–12) |
| `day_of_week` | Day of week (0–6) |
| `quarter` | Quarter (1–4) |
| `year` | Calendar year |

### Performance
- **Algorithm:** XGBoost Regressor
- **R² Score:** 0.84
- **Target:** Next-day AQI

### 7-Day Rolling Forecast
Each day's forecast is generated sequentially — the predicted AQI becomes the lag input for the following day. Pollutant values are held constant from the live reading (reasonable over a short horizon). Temporal features (month, day of week) increment correctly per future date.

---

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/` | GET | Renders the dashboard |
| `/city-data/<city>` | GET | Live AQI, pollutants, history, forecast for a city |
| `/predict` | POST | Run XGBoost inference, returns AQI + feature importance |
| `/compare?a=Delhi&b=Mumbai` | GET | Side-by-side data for two cities (parallel fetch) |
| `/heatmap-data` | GET | All cities AQI + coordinates for the map |
| `/feature-importance` | GET | Global model feature importances |

### Example: `/city-data/Delhi`
```json
{
  "success": true,
  "city": "Delhi",
  "aqi": 187,
  "pm25": 74.2,
  "pm10": 142.0,
  "no2": 38.5,
  "history": [{ "date": "26 Feb", "AQI": 165 }, ...],
  "forecast": [{ "date": "05 Mar", "day": "Thu", "AQI": 192, "category": "Moderate" }, ...],
  "is_stale": false,
  "is_live": true
}
```

### Example: `/predict` (POST)
```json
// Request
{
  "city": "Delhi",
  "PM2.5": 74.2, "PM10": 142.0, "NO2": 38.5,
  "NH3": 12.1, "SO2": 8.3, "CO": 1.1, "O3": 28.0,
  "AQI": 187, "AQI_lag1": 175, "AQI_lag3": 160,
  "AQI_lag7": 155, "AQI_roll7_mean": 168,
  "month": 3, "day_of_week": 3, "year": 2026
}

// Response
{
  "success": true,
  "aqi": 194.3,
  "category": "Moderate",
  "color": "#f59e0b",
  "importance": [
    { "feature": "Current AQI", "importance": 57.7 },
    { "feature": "Year",        "importance": 18.6 },
    ...
  ]
}
```

---

## AQI Scale Reference

| Range | Category | Colour |
|---|---|---|
| 0 – 50 | Good | 🟢 `#22c55e` |
| 51 – 100 | Satisfactory | 🟡 `#84cc16` |
| 101 – 200 | Moderate | 🟠 `#f59e0b` |
| 201 – 300 | Poor | 🔴 `#ef4444` |
| 301 – 400 | Very Poor | 🟣 `#a855f7` |
| 401+ | Severe | ⚫ `#7e0023` |

*Based on India's National Air Quality Index (NAQI) standard.*

---

## Caching Strategy

| Data | Cache Duration | Method |
|---|---|---|
| All-cities overview | 10 minutes | In-memory dict |
| Individual city data | Per request | No cache (live) |
| Comparison endpoint | Per request | Parallel fetch |
| Feature importances | App lifetime | Computed once at startup |

---

## Roadmap

- [ ] SQLite/PostgreSQL for 30-day historical storage
- [ ] User alerts — email/push when AQI crosses a threshold
- [ ] SHAP values for true per-prediction explainability
- [ ] Progressive Web App (PWA) with offline support
- [ ] Export to PDF / shareable image cards
- [ ] Hourly AQI breakdown chart

---

## Data Sources

- **Live AQI:** [World Air Quality Index (WAQI)](https://waqi.info/) — aggregates data from CPCB monitoring stations
- **Historical data:** Central Pollution Control Board (CPCB), India
- **Health guidelines:** Based on India NAQI standard and WHO air quality guidelines

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Acknowledgements

- [WAQI](https://waqi.info/) for the free real-time air quality API
- [CPCB India](https://cpcb.nic.in/) for historical pollutant datasets
- [XGBoost](https://xgboost.readthedocs.io/) for the gradient boosting framework
- [Chart.js](https://www.chartjs.org/) for the interactive charts
