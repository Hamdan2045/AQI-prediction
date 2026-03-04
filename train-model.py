import pandas as pd
import numpy as np
import joblib
import os
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

def load_and_prepare():
    # Load data
    df = pd.read_csv('data/combined_aqi.csv', parse_dates=['date'])
    print(f"✅ Loaded {df.shape[0]} rows, {df.shape[1]} columns")
    
    # Encode city names to numbers
    le = LabelEncoder()
    df['city_encoded'] = le.fit_transform(df['city'])
    
    # Save the encoder for later use in app.py
    os.makedirs('model', exist_ok=True)
    joblib.dump(le, 'model/label_encoder.pkl')
    print(f"✅ Cities encoded: {dict(zip(le.classes_, le.transform(le.classes_)))}")
    
    # Define features and target
    FEATURES = [
        'PM2.5', 'PM10', 'NO2', 'NH3', 'SO2', 'CO', 'O3',
        'AQI', 'AQI_lag1', 'AQI_lag3', 'AQI_lag7', 'AQI_roll7_mean',
        'city_encoded', 'month', 'day_of_week', 'quarter', 'year'
    ]
    TARGET = 'AQI'
    
    # Drop rows with nulls in features
    df_model = df.dropna(subset=FEATURES)
    print(f"✅ Model dataset: {len(df_model)} rows after dropping nulls")
    
    return df_model, FEATURES, TARGET, le

def split_data(df_model, FEATURES, TARGET):
    # Create tomorrow's AQI as the real target
    df_model = df_model.copy()
    df_model['AQI_tomorrow'] = df_model.groupby('city')[TARGET].shift(-1)
    
    # Drop rows where tomorrow's AQI is NaN
    # (last row of each city has no tomorrow)
    df_model = df_model.dropna(subset=['AQI_tomorrow'])
    
    # Now X is features, y is tomorrow's AQI
    X = df_model[FEATURES]
    y = df_model['AQI_tomorrow']
    
    # Time based split — last 6 months as test
    split_date = pd.Timestamp('2024-07-01')
    train_mask = df_model['date'] < split_date
    test_mask  = df_model['date'] >= split_date
    
    X_train = X[train_mask]
    X_test  = X[test_mask]
    y_train = y[train_mask]
    y_test  = y[test_mask]
    
    print(f"✅ Train set: {len(X_train)} rows")
    print(f"✅ Test set:  {len(X_test)} rows")
    print(f"✅ Train period: {df_model[train_mask]['date'].min().date()} → {df_model[train_mask]['date'].max().date()}")
    print(f"✅ Test period:  {df_model[test_mask]['date'].min().date()} → {df_model[test_mask]['date'].max().date()}")
    
    return X_train, X_test, y_train, y_test

def train_model(X_train, y_train):
    print("⏳ Training Random Forest model...")
    
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=20,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    
    model.fit(X_train, y_train)
    
    os.makedirs('model', exist_ok=True)
    joblib.dump(model, 'model/rf_model.pkl')
    
    print(f"✅ Model trained & saved to model/rf_model.pkl")
    return model
def evaluate_model(model, X_train, X_test, y_train, y_test, FEATURES):
    # Make predictions
    y_pred_train = model.predict(X_train)
    y_pred_test  = model.predict(X_test)
    
    # Calculate metrics
    train_mae = mean_absolute_error(y_train, y_pred_train)
    test_mae  = mean_absolute_error(y_test,  y_pred_test)
    
    train_rmse = mean_squared_error(y_train, y_pred_train) ** 0.5
    test_rmse  = mean_squared_error(y_test,  y_pred_test)  ** 0.5
    
    train_r2 = r2_score(y_train, y_pred_train)
    test_r2  = r2_score(y_test,  y_pred_test)
    
    print("\n📊 Model Performance:")
    print(f"{'Metric':<10} {'Train':>10} {'Test':>10}")
    print(f"{'─'*30}")
    print(f"{'MAE':<10} {train_mae:>10.2f} {test_mae:>10.2f}")
    print(f"{'RMSE':<10} {train_rmse:>10.2f} {test_rmse:>10.2f}")
    print(f"{'R²':<10} {train_r2:>10.4f} {test_r2:>10.4f}")
    
    # Feature importance
    importance = pd.DataFrame({
        'feature':   FEATURES,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print(f"\n🔍 Top 10 Most Important Features:")
    print(importance.head(10).to_string(index=False))
    
    return y_pred_test
def train_xgboost(X_train, y_train):
    print("⏳ Training XGBoost model...")
    
    xgb_model = XGBRegressor(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        n_jobs=-1
    )
    
    xgb_model.fit(X_train, y_train)
    
    joblib.dump(xgb_model, 'model/xgb_model.pkl')
    print(f"✅ XGBoost trained & saved to model/xgb_model.pkl")
    return xgb_model

if __name__ == '__main__':
    df_model, FEATURES, TARGET, le = load_and_prepare()
    X_train, X_test, y_train, y_test = split_data(df_model, FEATURES, TARGET)
    
    # Random Forest
    print("\n🌲 RANDOM FOREST")
    print("─" * 40)
    rf_model = train_model(X_train, y_train)
    y_pred_rf = evaluate_model(rf_model, X_train, X_test, y_train, y_test, FEATURES)
    
    # XGBoost
    print("\n⚡ XGBOOST")
    print("─" * 40)
    xgb_model = train_xgboost(X_train, y_train)
    y_pred_xgb = evaluate_model(xgb_model, X_train, X_test, y_train, y_test, FEATURES)