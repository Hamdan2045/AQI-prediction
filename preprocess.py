import pandas as pd
import numpy as np
import os
from sklearn.preprocessing import LabelEncoder

def load_and_merge():
    data_folder = 'data'
    cities = ['bengaluru','chennai','delhi','gwalior','hyderabad',
              'jaipur','kolkata','lucknow','mumbai','visakhapatnam']
    
    frames = []
    for city in cities:
        path = os.path.join(data_folder, f'{city}_combined.csv')
        df = pd.read_csv(path)
        df['city'] = city.capitalize()
        frames.append(df)
    
    data = pd.concat(frames, ignore_index=True)
    print(f"✅ Merged: {data.shape[0]} rows, {data.shape[1]} columns")
    return data

def calc_subindex_pm25(x):
    if pd.isna(x): return np.nan
    if x <= 30:    return x * 50 / 30
    if x <= 60:    return 50 + (x-30) * 50 / 30
    if x <= 90:    return 100 + (x-60) * 100 / 30
    if x <= 120:   return 200 + (x-90) * 100 / 30
    if x <= 250:   return 300 + (x-120) * 100 / 130
    return         400 + (x-250) * 100 / 130

def calc_subindex_pm10(x):
    if pd.isna(x): return np.nan
    if x <= 100:   return x
    if x <= 250:   return 100 + (x-100) * 100 / 150
    if x <= 350:   return 200 + (x-250)
    if x <= 430:   return 300 + (x-350) * 100 / 80
    return         400 + (x-430) * 100 / 80

def calc_subindex_no2(x):
    if pd.isna(x): return np.nan
    if x <= 40:    return x * 50 / 40
    if x <= 80:    return 50 + (x-40) * 50 / 40
    if x <= 180:   return 100 + (x-80) * 100 / 100
    if x <= 280:   return 200 + (x-180) * 100 / 100
    if x <= 400:   return 300 + (x-280) * 100 / 120
    return         400 + (x-400) * 100 / 120

def calc_subindex_so2(x):
    if pd.isna(x): return np.nan
    if x <= 40:    return x * 50 / 40
    if x <= 80:    return 50 + (x-40) * 50 / 40
    if x <= 380:   return 100 + (x-80) * 100 / 300
    if x <= 800:   return 200 + (x-380) * 100 / 420
    if x <= 1600:  return 300 + (x-800) * 100 / 800
    return         400 + (x-1600) * 100 / 800

def calc_subindex_co(x):
    if pd.isna(x): return np.nan
    if x <= 1:     return x * 50
    if x <= 2:     return 50 + (x-1) * 50
    if x <= 10:    return 100 + (x-2) * 100 / 8
    if x <= 17:    return 200 + (x-10) * 100 / 7
    if x <= 34:    return 300 + (x-17) * 100 / 17
    return         400 + (x-34) * 100 / 17

def calc_subindex_o3(x):
    if pd.isna(x): return np.nan
    if x <= 50:    return x
    if x <= 100:   return x
    if x <= 168:   return 100 + (x-100) * 100 / 68
    if x <= 208:   return 200 + (x-168) * 100 / 40
    if x <= 748:   return 300 + (x-208) * 100 / 539
    return 400

def compute_aqi(row):
    subindices = [
        calc_subindex_pm25(row['PM2.5']),
        calc_subindex_pm10(row['PM10']),
        calc_subindex_no2(row['NO2']),
        calc_subindex_so2(row['SO2']),
        calc_subindex_co(row['CO']),
        calc_subindex_o3(row['O3']),
    ]
    valid = [s for s in subindices if not np.isnan(s)]
    return round(max(valid), 1) if len(valid) >= 3 else np.nan

def fix_missing_values(data):
    pollutants = ['PM2.5','PM10','NO2','NH3','SO2','CO','O3']
    
    for city in data['city'].unique():
        mask = data['city'] == city
        for col in pollutants:
            city_median = data.loc[mask, col].median()
            rolling = data.loc[mask, col].rolling(7, min_periods=1, center=True).median()
            data.loc[mask, col] = data.loc[mask, col].fillna(rolling)
            data.loc[mask, col] = data.loc[mask, col].fillna(city_median)
    
    print(f"✅ Missing values fixed. Remaining nulls: {data.isnull().sum().sum()}")
    return data

def calculate_aqi(data):
    print("⏳ Calculating AQI for all rows...")
    data['AQI'] = data.apply(compute_aqi, axis=1)
    
    def aqi_category(aqi):
        if pd.isna(aqi):  return np.nan
        if aqi <= 50:     return 'Good'
        if aqi <= 100:    return 'Satisfactory'
        if aqi <= 200:    return 'Moderate'
        if aqi <= 300:    return 'Poor'
        if aqi <= 400:    return 'Very Poor'
        return 'Severe'
    
    data['AQI_Category'] = data['AQI'].apply(aqi_category)
    print(f"✅ AQI calculated. Null AQI rows: {data['AQI'].isna().sum()}")
    print(f"\n📊 Category breakdown:\n{data['AQI_Category'].value_counts()}")
    return data

def engineer_features(data):
    # Parse dates
    data['date'] = pd.to_datetime(data['Timestamp'], dayfirst=True)
    data = data.drop(columns=['Timestamp', 'Location'])
    data = data.sort_values(['city', 'date']).reset_index(drop=True)
    
    # Time features
    data['year']         = data['date'].dt.year
    data['month']        = data['date'].dt.month
    data['day']          = data['date'].dt.day
    data['day_of_week']  = data['date'].dt.dayofweek
    data['quarter']      = data['date'].dt.quarter
    
    # Season
    def get_season(month):
        if month in [12, 1, 2]:    return 'Winter'
        if month in [3, 4, 5]:     return 'Summer'
        if month in [6, 7, 8, 9]:  return 'Monsoon'
        return 'Post-Monsoon'
    
    data['season'] = data['month'].apply(get_season)
    
    # Lag features
    data = data.sort_values(['city', 'date'])
    data['AQI_lag1']        = data.groupby('city')['AQI'].shift(1)
    data['AQI_lag3']        = data.groupby('city')['AQI'].shift(3)
    data['AQI_lag7']        = data.groupby('city')['AQI'].shift(7)
    data['AQI_roll7_mean']  = data.groupby('city')['AQI'].transform(
                                lambda x: x.shift(1).rolling(7, min_periods=1).mean()
                              )
    
    print(f"✅ Features engineered. Final shape: {data.shape}")
    print(f"✅ Columns: {data.columns.tolist()}")
    return data

def save_data(data):
    os.makedirs('data', exist_ok=True)
    data.to_csv('data/combined_aqi.csv', index=False)
    print(f"✅ Saved to data/combined_aqi.csv")
    print(f"✅ Final shape: {data.shape}")
    print(f"\n📊 AQI by city:")
    summary = data.groupby('city')['AQI'].agg(['mean','min','max']).round(1)
    summary.columns = ['Avg AQI', 'Min AQI', 'Max AQI']
    print(summary)

if __name__ == '__main__':
    # Step 1 - Load & merge
    data = load_and_merge()
    
    # Step 2 - Fix missing values
    data = fix_missing_values(data)
    
    # Step 3 - Calculate AQI
    data = calculate_aqi(data)
    
    # Step 4 - Engineer features
    data = engineer_features(data)
    
    # Step 5 - Save
    save_data(data)