from flask import Flask, render_template, request, jsonify
import pandas as pd
import numpy as np
import joblib
import requests
import time
from datetime import datetime, timedelta

# ─── CONFIG ──────────────────────────────────────────
WAQI_TOKEN = 'ac9612551439ba68ee7f85d4b9359fc84e67b4c5'

CITY_WAQI_MAP = {
    'Bengaluru':     'bengaluru',
    'Chennai':       'chennai',
    'Delhi':         'delhi',
    'Gwalior':       'gwalior',
    'Hyderabad':     'hyderabad',
    'Jaipur':        'jaipur',
    'Kolkata':       'kolkata',
    'Lucknow':       'lucknow',
    'Mumbai':        'mumbai',
    'Visakhapatnam': 'visakhapatnam'
}

# Approximate lat/lng for India heatmap SVG positioning
CITY_COORDS = {
    'Bengaluru':     {'lat': 12.97, 'lng': 77.59},
    'Chennai':       {'lat': 13.08, 'lng': 80.27},
    'Delhi':         {'lat': 28.61, 'lng': 77.23},
    'Gwalior':       {'lat': 26.22, 'lng': 78.18},
    'Hyderabad':     {'lat': 17.38, 'lng': 78.49},
    'Jaipur':        {'lat': 26.91, 'lng': 75.79},
    'Kolkata':       {'lat': 22.57, 'lng': 88.36},
    'Lucknow':       {'lat': 26.85, 'lng': 80.95},
    'Mumbai':        {'lat': 19.08, 'lng': 72.88},
    'Visakhapatnam': {'lat': 17.69, 'lng': 83.22},
}

CITIES = [
    'Bengaluru', 'Chennai', 'Delhi', 'Gwalior', 'Hyderabad',
    'Jaipur', 'Kolkata', 'Lucknow', 'Mumbai', 'Visakhapatnam'
]

FEATURES = [
    'PM2.5', 'PM10', 'NO2', 'NH3', 'SO2', 'CO', 'O3',
    'AQI', 'AQI_lag1', 'AQI_lag3', 'AQI_lag7', 'AQI_roll7_mean',
    'city_encoded', 'month', 'day_of_week', 'quarter', 'year'
]

FEATURE_LABELS = {
    'PM2.5':         'PM2.5 (Fine Particles)',
    'PM10':          'PM10 (Coarse Particles)',
    'NO2':           'Nitrogen Dioxide',
    'NH3':           'Ammonia',
    'SO2':           'Sulphur Dioxide',
    'CO':            'Carbon Monoxide',
    'O3':            'Ozone',
    'AQI':           'Current AQI',
    'AQI_lag1':      'AQI Yesterday',
    'AQI_lag3':      'AQI 3 Days Ago',
    'AQI_lag7':      'AQI 7 Days Ago',
    'AQI_roll7_mean':'7-Day Average AQI',
    'city_encoded':  'City Factor',
    'month':         'Month',
    'day_of_week':   'Day of Week',
    'quarter':       'Quarter',
    'year':          'Year',
}

app = Flask(__name__)

# ─── LOAD MODEL & DATA ONCE AT STARTUP ───────────────
model   = joblib.load('model/xgb_model.pkl')
encoder = joblib.load('model/label_encoder.pkl')
CSV_DF  = pd.read_csv('data/combined_aqi.csv', parse_dates=['date'])
print('✅ Model, encoder and CSV loaded')

# Precompute global feature importances from model
GLOBAL_IMPORTANCES = []
try:
    imps = model.feature_importances_
    total = imps.sum()
    pairs = sorted(zip(FEATURES, imps), key=lambda x: x[1], reverse=True)
    GLOBAL_IMPORTANCES = [
        {'feature': FEATURE_LABELS.get(f, f), 'importance': round(float(v/total)*100, 1)}
        for f, v in pairs[:8]  # top 8
    ]
    print(f'✅ Feature importances computed: {GLOBAL_IMPORTANCES[:3]}')
except Exception as e:
    print(f'⚠️ Feature importance failed: {e}')

cache = {'cities': None, 'last_updated': 0}
CACHE_DURATION = 600

# ─── HELPERS ─────────────────────────────────────────
def get_aqi_info(aqi):
    if aqi <= 50:  return {'category': 'Good',         'color': '#22c55e'}
    if aqi <= 100: return {'category': 'Satisfactory', 'color': '#84cc16'}
    if aqi <= 200: return {'category': 'Moderate',     'color': '#f59e0b'}
    if aqi <= 300: return {'category': 'Poor',         'color': '#ef4444'}
    if aqi <= 400: return {'category': 'Very Poor',    'color': '#f97316'}
    return               {'category': 'Severe',        'color': '#7e0023'}

def calc_aqi_from_pm25(pm25):
    if pm25 <= 0:   return 0
    if pm25 <= 30:  return round(pm25 * 50 / 30)
    if pm25 <= 60:  return round(50  + (pm25 - 30)  * 50  / 30)
    if pm25 <= 90:  return round(100 + (pm25 - 60)  * 100 / 30)
    if pm25 <= 120: return round(200 + (pm25 - 90)  * 100 / 30)
    if pm25 <= 250: return round(300 + (pm25 - 120) * 100 / 130)
    return              round(400 + (pm25 - 250) * 100 / 130)

def fetch_weekly_history(city_name, live_aqi):
    try:
        waqi_city = CITY_WAQI_MAP.get(city_name, city_name.lower())
        today     = datetime.now()
        url       = f'https://api.waqi.info/feed/{waqi_city}/?token={WAQI_TOKEN}'
        response  = requests.get(url, timeout=10)
        data      = response.json()
        if data['status'] != 'ok':
            return None
        forecast  = data['data'].get('forecast', {}).get('daily', {})
        pm25_days = forecast.get('pm25', [])
        date_aqi  = {}
        for day in pm25_days:
            dt      = datetime.strptime(day['day'], '%Y-%m-%d')
            aqi_val = calc_aqi_from_pm25(day['avg'])
            date_aqi[day['day']] = aqi_val
        today_str = today.strftime('%Y-%m-%d')
        if live_aqi and live_aqi > 0:
            date_aqi[today_str] = live_aqi
        seven_days_ago = today - timedelta(days=6)
        history = []
        for day_str, aqi_val in sorted(date_aqi.items()):
            dt = datetime.strptime(day_str, '%Y-%m-%d')
            if seven_days_ago.date() <= dt.date() <= today.date():
                history.append({'date': dt.strftime('%d %b'), 'AQI': aqi_val})
        print(f'✅ Chart: {len(history)} days for {city_name}')
        return history if history else None
    except Exception as e:
        print(f'❌ History fetch failed for {city_name}: {e}')
        return None

def fetch_live_aqi(city_name):
    try:
        waqi_city = CITY_WAQI_MAP.get(city_name, city_name.lower())
        url       = f'https://api.waqi.info/feed/{waqi_city}/?token={WAQI_TOKEN}'
        response  = requests.get(url, timeout=5)
        data      = response.json()
        if data['status'] != 'ok':
            return None
        d        = data['data']
        iaqi     = d.get('iaqi', {})
        forecast = d.get('forecast', {}).get('daily', {})
        station_time         = d.get('time', {})
        last_updated         = station_time.get('s', None)
        station_tz           = station_time.get('tz', '+05:30')
        last_updated_display = 'Unknown'
        if last_updated:
            try:
                dt                   = datetime.strptime(last_updated, '%Y-%m-%d %H:%M:%S')
                last_updated_display = dt.strftime('%d %b %Y, %I:%M %p') + f' ({station_tz})'
            except:
                last_updated_display = last_updated

        def get_forecast(key):
            days  = forecast.get(key, [])
            today = datetime.now().strftime('%Y-%m-%d')
            for day in days:
                if day['day'] == today:
                    return day['avg']
            return days[0]['avg'] if days else None

        def get_val(key):
            live_val = iaqi.get(key, {}).get('v', None)
            if live_val is not None: return live_val
            fv = get_forecast(key)
            return fv if fv is not None else 0

        raw_aqi  = d.get('aqi', 0)
        aqi_val  = int(raw_aqi) if str(raw_aqi).lstrip('-').isdigit() else 0
        pm25_val = get_val('pm25')
        if aqi_val == 0 and pm25_val > 0:
            aqi_val = calc_aqi_from_pm25(pm25_val)

        is_stale  = False
        hours_old = 0
        if last_updated:
            try:
                dt        = datetime.strptime(last_updated, '%Y-%m-%d %H:%M:%S')
                hours_old = (datetime.now() - dt).total_seconds() / 3600
                is_stale  = hours_old > 48
                status    = f'⚠️ {city_name}: AQI={aqi_val}, {hours_old:.0f}h old' if is_stale else f'✅ {city_name}: AQI={aqi_val}, PM2.5={pm25_val}'
                print(status)
            except:
                print(f'✅ {city_name}: AQI={aqi_val}')

        return {
            'aqi': aqi_val, 'pm25': pm25_val, 'pm10': get_val('pm10'),
            'no2': get_val('no2'), 'so2': get_val('so2'), 'co': get_val('co'),
            'o3': get_val('o3'), 'nh3': get_val('nh3'),
            'temp': iaqi.get('t', {}).get('v', None),
            'humidity': iaqi.get('h', {}).get('v', None),
            'last_updated': last_updated_display,
            'station_name': d.get('city', {}).get('name', city_name),
            'is_stale': is_stale,
            'forecast_raw': forecast,  # keep raw forecast for 7-day prediction
        }
    except Exception as e:
        print(f'❌ WAQI fetch failed for {city_name}: {e}')
        return None

def get_all_cities_cached():
    now = time.time()
    if cache['cities'] and (now - cache['last_updated']) < CACHE_DURATION:
        return cache['cities']
    print('🔄 Refreshing city cache...')
    cities_data = []
    for city in CITIES:
        live = fetch_live_aqi(city)
        c_df = CSV_DF[CSV_DF['city'] == city]
        last = c_df.sort_values('date').iloc[-1] if not c_df.empty else None
        cities_data.append({
            'name':     city,
            'aqi':      live['aqi']  if live else (round(float(last['AQI']),   0) if last is not None else 0),
            'pm25':     live['pm25'] if live else (round(float(last['PM2.5']), 1) if last is not None else 0),
            'pm10':     live['pm10'] if live else (round(float(last['PM10']),  1) if last is not None else 0),
            'temp':     live.get('temp')     if live else None,
            'humidity': live.get('humidity') if live else None,
            'coords':   CITY_COORDS.get(city, {}),
        })
    cache['cities']       = cities_data
    cache['last_updated'] = now
    print('✅ City cache updated!')
    return cities_data

def generate_7day_forecast(city_name, live_data, city_df):
    """
    Generate 7-day AQI forecast using the XGBoost model.
    Uses rolling predictions — each day feeds into the next.
    """
    try:
        city_encoded = encoder.transform([city_name])[0]
        latest       = city_df.iloc[-1]
        today        = datetime.now()

        # Seed values from live data or CSV
        cur_pm25   = live_data['pm25'] if live_data else float(latest['PM2.5'])
        cur_pm10   = live_data['pm10'] if live_data else float(latest['PM10'])
        cur_no2    = live_data['no2']  if live_data else float(latest['NO2'])
        cur_nh3    = float(latest['NH3'])
        cur_so2    = live_data['so2']  if live_data else float(latest['SO2'])
        cur_co     = live_data['co']   if live_data else float(latest['CO'])
        cur_o3     = live_data['o3']   if live_data else float(latest['O3'])
        cur_aqi    = live_data['aqi']  if live_data else float(latest['AQI'])

        # Get recent AQI history for lags
        recent = city_df.tail(10)['AQI'].tolist()
        aqi_history = recent + [cur_aqi]

        forecast = []
        rolling_aqi = aqi_history[:]

        for i in range(1, 8):
            future_date = today + timedelta(days=i)
            month       = future_date.month
            dow         = future_date.weekday()
            quarter     = (month - 1) // 3 + 1
            year        = future_date.year

            lag1 = rolling_aqi[-1]
            lag3 = rolling_aqi[-3] if len(rolling_aqi) >= 3 else rolling_aqi[0]
            lag7 = rolling_aqi[-7] if len(rolling_aqi) >= 7 else rolling_aqi[0]
            roll7 = np.mean(rolling_aqi[-7:]) if len(rolling_aqi) >= 7 else np.mean(rolling_aqi)

            features = pd.DataFrame([[
                cur_pm25, cur_pm10, cur_no2, cur_nh3, cur_so2, cur_co, cur_o3,
                rolling_aqi[-1], lag1, lag3, lag7, roll7,
                city_encoded, month, dow, quarter, year
            ]], columns=FEATURES)

            predicted = max(0, round(float(model.predict(features)[0]), 0))
            info      = get_aqi_info(predicted)

            forecast.append({
                'date':     future_date.strftime('%d %b'),
                'day':      future_date.strftime('%a'),
                'AQI':      predicted,
                'category': info['category'],
                'color':    info['color'],
            })

            rolling_aqi.append(predicted)

        print(f'✅ 7-day forecast for {city_name}: {[f["AQI"] for f in forecast]}')
        return forecast

    except Exception as e:
        print(f'❌ Forecast generation failed for {city_name}: {e}')
        return []

def get_feature_importance_for_prediction(input_vals):
    """
    Compute per-prediction feature contribution using model feature importances
    weighted by input value magnitude (normalized). Returns top 6 contributors.
    """
    try:
        imps       = model.feature_importances_
        input_arr  = np.array(input_vals, dtype=float)
        input_norm = np.abs(input_arr) / (np.abs(input_arr).max() + 1e-9)
        contributions = imps * input_norm
        total = float(contributions.sum())
        if total <= 0:
            return GLOBAL_IMPORTANCES[:6]
        pairs = sorted(zip(FEATURES, contributions), key=lambda x: x[1], reverse=True)
        result = []
        for f, v in pairs[:6]:
            pct = round(float(v) / total * 100, 1)
            result.append({
                'feature':    FEATURE_LABELS.get(f, f),
                'importance': pct          # key must be 'importance' to match frontend
            })
        print(f'✅ Importance breakdown: {result[:3]}')
        return result
    except Exception as e:
        print(f'⚠️  importance error: {e}')
        return GLOBAL_IMPORTANCES[:6]

# ─── ROUTES ──────────────────────────────────────────
@app.route('/')
def index():
    return render_template('index.html', cities=CITIES)

@app.route('/city-data/<city_name>')
def city_data(city_name):
    try:
        live    = fetch_live_aqi(city_name)
        city_df = CSV_DF[CSV_DF['city'] == city_name].sort_values('date')
        if city_df.empty:
            return jsonify({'success': False, 'error': 'City not found'})

        live_aqi_val = live['aqi'] if live and live['aqi'] > 0 else None

        history_list = fetch_weekly_history(city_name, live_aqi_val)
        if not history_list or len(history_list) < 3:
            print(f'⚠️ Using CSV history for {city_name}')
            csv_hist         = city_df.tail(7)[['date', 'AQI']].copy()
            csv_hist['date'] = csv_hist['date'].dt.strftime('%d %b')
            csv_list         = csv_hist.to_dict('records')
            if history_list and live_aqi_val:
                live_dates = {d['date'] for d in history_list}
                csv_list   = [d for d in csv_list if d['date'] not in live_dates]
                csv_list  += history_list
            history_list = csv_list[-7:]

        # Generate 7-day forecast
        forecast_list = generate_7day_forecast(city_name, live, city_df)

        all_cities = get_all_cities_cached()
        latest     = city_df.iloc[-1]

        def live_or_csv(live_key, csv_col, decimals=1):
            if live and live.get(live_key, 0) != 0:
                return round(float(live[live_key]), decimals)
            return round(float(latest[csv_col]), decimals)

        return jsonify({
            'success':      True,
            'city':         city_name,
            'aqi':          live['aqi'] if live and live['aqi'] > 0 else round(float(latest['AQI']), 0),
            'pm25':         live_or_csv('pm25', 'PM2.5'),
            'pm10':         live_or_csv('pm10', 'PM10'),
            'no2':          live_or_csv('no2',  'NO2'),
            'so2':          live_or_csv('so2',  'SO2'),
            'co':           live_or_csv('co',   'CO', 2),
            'o3':           live_or_csv('o3',   'O3'),
            'nh3':          live_or_csv('nh3',  'NH3'),
            'temp':         live.get('temp')         if live else None,
            'humidity':     live.get('humidity')     if live else None,
            'last_updated': live.get('last_updated') if live else 'Unknown',
            'station_name': live.get('station_name') if live else city_name,
            'is_stale':     live.get('is_stale')     if live else False,
            'history':      history_list,
            'forecast':     forecast_list,
            'all_cities':   all_cities,
            'is_live':      live is not None,
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data         = request.json
        city_name    = data['city']
        city_encoded = encoder.transform([city_name])[0]
        month        = int(data['month'])
        dow          = int(data['day_of_week'])
        quarter      = (month - 1) // 3 + 1
        year         = int(data['year'])

        input_vals = [
            float(data['PM2.5']), float(data['PM10']),
            float(data['NO2']),   float(data['NH3']),
            float(data['SO2']),   float(data['CO']),
            float(data['O3']),    float(data['AQI']),
            float(data['AQI_lag1']), float(data['AQI_lag3']),
            float(data['AQI_lag7']), float(data['AQI_roll7_mean']),
            city_encoded, month, dow, quarter, year
        ]

        features      = pd.DataFrame([input_vals], columns=FEATURES)
        predicted_aqi = round(float(model.predict(features)[0]), 1)
        predicted_aqi = max(0, predicted_aqi)
        aqi_info      = get_aqi_info(predicted_aqi)
        importance    = get_feature_importance_for_prediction(input_vals)

        return jsonify({
            'success':    True,
            'aqi':        predicted_aqi,
            'category':   aqi_info['category'],
            'color':      aqi_info['color'],
            'city':       city_name,
            'importance': importance,
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/compare')
def compare():
    """Return AQI + 7-day history for two cities — fetched in parallel."""
    from concurrent.futures import ThreadPoolExecutor, as_completed
    try:
        city_a = request.args.get('a', 'Delhi')
        city_b = request.args.get('b', 'Mumbai')

        def fetch_city(city):
            live     = fetch_live_aqi(city)
            city_df  = CSV_DF[CSV_DF['city'] == city].sort_values('date')
            live_aqi = live['aqi'] if live and live['aqi'] > 0 else None
            history  = fetch_weekly_history(city, live_aqi)
            if not history or len(history) < 3:
                csv_h         = city_df.tail(7)[['date', 'AQI']].copy()
                csv_h['date'] = csv_h['date'].dt.strftime('%d %b')
                history       = csv_h.to_dict('records')[-7:]
            info = get_aqi_info(live_aqi or 0)
            return city, {
                'aqi':      live_aqi or 0,
                'category': info['category'],
                'color':    info['color'],
                'pm25':     live['pm25'] if live else 0,
                'history':  history,
            }

        result = {}
        with ThreadPoolExecutor(max_workers=2) as executor:
            futures = {executor.submit(fetch_city, c): c for c in [city_a, city_b]}
            for future in as_completed(futures):
                city, data = future.result()
                result[city] = data

        return jsonify({'success': True, 'data': result, 'city_a': city_a, 'city_b': city_b})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/heatmap-data')
def heatmap_data():
    """Return all city AQI + coords for India heatmap."""
    try:
        cities = get_all_cities_cached()
        result = []
        for c in cities:
            info = get_aqi_info(c['aqi'])
            result.append({
                'name':     c['name'],
                'aqi':      c['aqi'],
                'color':    info['color'],
                'category': info['category'],
                'coords':   CITY_COORDS.get(c['name'], {}),
            })
        return jsonify({'success': True, 'cities': result})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/feature-importance')
def feature_importance():
    """Return global model feature importances."""
    return jsonify({'success': True, 'importances': GLOBAL_IMPORTANCES})

if __name__ == '__main__':
    app.run(debug=True, port=5000)