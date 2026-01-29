"""
AirLume ML Model Training Script
Trains ML model to enhance C physics predictions

Run this ONCE when you have collected training data
Place in: python_src/train_ml_model.py
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, roc_auc_score
import joblib
import os

def load_training_data(csv_file='training_data.csv'):
    """
    Load training data from CSV file
    
    CSV Format:
    physics_prediction,actual_lightning,temp,humidity,pressure,wind_speed,altitude,latitude,longitude
    16.5,1,-67.4,58,300,5.5,9144,44.63,-77.39
    11.5,0,-69.7,62,300,4.3,9144,44.87,-76.82
    
    Columns:
    - physics_prediction:  C code's prediction (%)
    - actual_lightning: 1 if lightning formed, 0 if not
    - temp: Temperature (°C)
    - humidity: Humidity (%)
    - pressure: Pressure (hPa)
    - wind_speed: Wind speed (m/s)
    - altitude: Altitude (meters)
    - latitude, longitude: Location
    """
    
    if not os.path.exists(csv_file):
        print(f"ERROR: Training data file '{csv_file}' not found!")
        print("\nCreate a CSV file with this format:")
        print("physics_prediction,actual_lightning,temp,humidity,pressure,wind_speed,altitude,latitude,longitude")
        print("16.5,1,-67.4,58,300,5.5,9144,44.63,-77.39")
        print("11.5,0,-69.7,62,300,4.3,9144,44.87,-76.82")
        print("\nWhere:")
        print("  physics_prediction =   C code's risk %")
        print("  actual_lightning = 1 (lightning occurred) or 0 (no lightning)")
        print("  temp, humidity, etc. = Atmospheric conditions")
        return None
    
    df = pd.read_csv(csv_file)
    print(f"  Loaded {len(df)} training samples from {csv_file}")
    print(f"  Lightning events: {df['actual_lightning'].sum()} ({df['actual_lightning'].mean()*100:.1f}%)")
    print(f"  No lightning: {(~df['actual_lightning'].astype(bool)).sum()}")
    
    return df

def prepare_features(df):
    """
    Prepare features for ML model
    
    Features include:
    - Physics prediction
    - Atmospheric conditions
    - Derived features (physics accuracy indicators)
    """
    
    # Create derived features
    df['temp_abs'] = df['temp'].abs()  # Absolute temperature
    df['humidity_normalized'] = df['humidity'] / 100.0
    df['pressure_normalized'] = df['pressure'] / 1013.0  # Sea level = 1.0
    
    # Physics model confidence indicators
    df['physics_risk_category'] = pd.cut(df['physics_prediction'], 
                                         bins=[0, 5, 15, 25, 100],
                                         labels=['low', 'moderate', 'high', 'severe'])
    
    # One-hot encode categorical
    df = pd.get_dummies(df, columns=['physics_risk_category'], drop_first=True)
    
    # Feature columns
    feature_columns = [
        'physics_prediction',
        'temp', 'temp_abs',
        'humidity', 'humidity_normalized',
        'pressure', 'pressure_normalized',
        'wind_speed',
        'altitude',
        'latitude', 'longitude'
    ] + [col for col in df.columns if 'physics_risk_category_' in col]
    
    X = df[feature_columns]
    y = df['actual_lightning']
    
    return X, y, feature_columns

def train_model(X, y):
    """Train the ML enhancement model"""
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print("\n" + "="*70)
    print("TRAINING ML ENHANCEMENT MODEL")
    print("="*70)
    print(f"Training samples: {len(X_train)}")
    print(f"Test samples: {len(X_test)}")
    
    # Train Gradient Boosting model
    model = GradientBoostingClassifier(
        n_estimators=200,
        learning_rate=0.05,
        max_depth=5,
        min_samples_split=20,
        min_samples_leaf=10,
        random_state=42
    )
    
    print("\nTraining model...")
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    
    accuracy = accuracy_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_pred_proba)
    
    # Compare to physics-only
    physics_only_pred = (X_test['physics_prediction'] > 50).astype(int)
    physics_accuracy = accuracy_score(y_test, physics_only_pred)
    
    print("\n" + "="*70)
    print("RESULTS")
    print("="*70)
    print(f"Physics Model Only: {physics_accuracy*100:.2f}% accuracy")
    print(f"ML Enhanced Model: {accuracy*100:.2f}% accuracy")
    print(f"Improvement: +{(accuracy - physics_accuracy)*100:.2f}%")
    print(f"AUC Score: {auc:.3f}")
    
    print("\nDetailed Performance:")
    print(classification_report(y_test, y_pred, 
                               target_names=['No Lightning', 'Lightning']))
    
    print("\nConfusion Matrix:")
    cm = confusion_matrix(y_test, y_pred)
    print(f"  True Negatives:  {cm[0,0]:4d}  |  False Positives: {cm[0,1]:4d}")
    print(f"  False Negatives: {cm[1,0]:4d}  |  True Positives:  {cm[1,1]:4d}")
    
    # Feature importance
    feature_importance = pd.DataFrame({
        'feature': X.columns,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("\n" + "="*70)
    print("TOP 10 MOST IMPORTANT FEATURES")
    print("="*70)
    for idx, row in feature_importance.head(10).iterrows():
        print(f"  {row['feature']:30s}: {row['importance']:.4f}")
    
    # Cross-validation
    print("\n" + "="*70)
    print("CROSS-VALIDATION (5-fold)")
    print("="*70)
    cv_scores = cross_val_score(model, X, y, cv=5, scoring='accuracy')
    print(f"  Mean Accuracy: {cv_scores.mean()*100:.2f}%")
    print(f"  Std Deviation: {cv_scores.std()*100:.2f}%")
    print(f"  Scores: {[f'{s*100:.1f}%' for s in cv_scores]}")
    
    return model, feature_importance

def save_model(model, feature_columns):
    """Save trained model and metadata"""
    
    # Save model
    model_path = 'build/airlume_ml_model.pkl'
    os.makedirs('build', exist_ok=True)
    joblib.dump(model, model_path)
    print(f"\n  Model saved to: {model_path}")
    
    # Save feature list
    with open('build/ml_features.txt', 'w') as f:
        f.write('\n'.join(feature_columns))
    print(f" Feature list saved to: build/ml_features.txt")
    
    # Save training info
    with open('build/ml_training_info.txt', 'w') as f:
        f.write("AirLume ML Enhancement Model\n")
        f.write("="*50 + "\n")
        f.write(f"Model Type: Gradient Boosting Classifier\n")
        f.write(f"Features: {len(feature_columns)}\n")
        f.write(f"Training Date: {pd.Timestamp.now()}\n")
    print(f"  Training info saved to: build/ml_training_info.txt")

def create_sample_training_data():
    """
    Create a sample training CSV for demonstration
    You'll replace this with REAL data from   pilot programs!
    """
    
    print("\n" + "="*70)
    print("CREATING SAMPLE TRAINING DATA")
    print("="*70)
    print("NOTE: This is synthetic data for testing!")
    print("Replace training_data.csv with REAL flight data for production!")
    
    np.random.seed(42)
    n_samples = 500
    
    data = []
    for _ in range(n_samples):
        # Simulate conditions
        temp = np.random.uniform(-75, -60)
        humidity = np.random.uniform(20, 90)
        pressure = 300  # FL300
        wind_speed = np.random.uniform(2, 15)
        altitude = 9144  # 30000 ft
        lat = np.random.uniform(43, 46)
        lon = np.random.uniform(-80, -75)
        
        # Simulate physics prediction
        physics_pred = (
            (humidity > 50) * 15 +
            (wind_speed > 8) * 10 +
            (temp > -70) * 5 +
            np.random.uniform(0, 10)
        )
        
        # Simulate actual outcome (physics + some error)
        actual_prob = physics_pred / 100 + np.random.normal(0, 0.1)
        actual_lightning = 1 if np.random.random() < actual_prob else 0
        
        data.append([
            round(physics_pred, 2),
            actual_lightning,
            round(temp, 1),
            round(humidity, 1),
            pressure,
            round(wind_speed, 1),
            altitude,
            round(lat, 4),
            round(lon, 4)
        ])
    
    df = pd.DataFrame(data, columns=[
        'physics_prediction', 'actual_lightning', 'temp', 'humidity',
        'pressure', 'wind_speed', 'altitude', 'latitude', 'longitude'
    ])
    
    df.to_csv('training_data.csv', index=False)
    print(f"  Created training_data.csv with {len(df)} samples")
    print(f"  Lightning events: {df['actual_lightning'].sum()}")
    
    return df

def main():
    print("="*70)
    print("AIRLUME ML MODEL TRAINING")
    print("="*70)
    
    # Try to load existing training data
    df = load_training_data('training_data.csv')
    
    # If no data exists, create sample data
    if df is None:
        print("\nNo training data found. Creating sample data for testing...")
        print(" Replace this with REAL flight data!!!")
        create_sample = input("\nCreate sample training data? (y/n): ")
        
        if create_sample.lower() == 'y':
            df = create_sample_training_data()
        else:
            print("\nExiting. Please create training_data.csv first.")
            return
    
    # Prepare features
    X, y, feature_columns = prepare_features(df)
    
    # Train model
    model, feature_importance = train_model(X, y)
    
    # Save model
    save_model(model, feature_columns)
    
    print("\n" + "="*70)
    print("TRAINING COMPLETE!")
    print("="*70)
    print("\n  ML model is now ready to use!")
    print("Run   AirLume system normally:")
    print("  build\\airlume CYOW CYYZ 30000")
    print("\nThe ML enhancer will automatically use the trained model.")
    
    print("\n" + "="*70)
    print("NEXT STEPS")
    print("="*70)
    print("1. Collect REAL training data from pilot programs")
    print("2. Update training_data.csv with actual flight outcomes")
    print("3. Re-run this script: python python_src/train_ml_model.py")
    print("4. Model will improve as you collect more real data!")

if __name__ == "__main__":
    main()