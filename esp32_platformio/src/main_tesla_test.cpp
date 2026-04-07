#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <TFT_eSPI.h>
#include "config.h"
#include <esp_wpa2.h>  

#define ESP32_BUILD

// Include C headers
extern "C" {
    #include "../../c_src/riskcalc.h"
    #include "../../c_src/route_planning.h"
    #include "../../c_src/riskcalc.c"
    #include "../../c_src/riskcalc_altitude.c"
    #include "../../c_src/route_planning.c"
    #include "../../c_src/csv_reader.c"
}

// WiFi credentials
//const char* ssid     = WIFI_SSID;
//const char* password = EAP_PASSWORD;
//const char* api_key  = WEATHER_API_KEY;

const char* ssid = WIFI_SSID;
const char* eap_identity = EAP_IDENTITY;
const char* eap_password = EAP_PASSWORD;
const char* api_key = WEATHER_API_KEY;
 
// LCD
TFT_eSPI tft = TFT_eSPI();

#define SMOOTH_SAMPLES 10
// Buttons
#define BTN_A     27
#define BTN_B     26
#define BTN_X     25
#define BTN_Y     14
 
// LDR sensor pin
#define LDR_PIN   33
 
// Simulated magnetometer data structure
struct MagnetometerData {
    float x, y, z;
    float magnitude;
    bool anomaly_detected;
};
 
MagnetometerData mag_data;
float baseline_magnetic_field = 350.0;
 
// Simulated Tesla coil state
bool tesla_coil_active = false;
float magnitude_history[SMOOTH_SAMPLES] = {0};
int history_index = 0;
float smoothed_magnitude = 0;
 
// Simulate magnetometer reading using LDR or simulation
void readSensor() {
    int total = 0;
    for (int i = 0; i < 5; i++) {
        total += analogRead(LDR_PIN);
        delay(10);
    }
    int ldr_value = total / 5;

    float raw_magnitude = map(ldr_value, 0, 4095, 200, 900);

    // Add to rolling history
    magnitude_history[history_index] = raw_magnitude;
    history_index = (history_index + 1) % SMOOTH_SAMPLES;

    // Compute rolling average
    float sum = 0;
    for (int i = 0; i < SMOOTH_SAMPLES; i++) sum += magnitude_history[i];
    smoothed_magnitude = sum / SMOOTH_SAMPLES;

    mag_data.x = smoothed_magnitude * 0.5;
    mag_data.y = smoothed_magnitude * 0.5;
    mag_data.z = smoothed_magnitude * 0.7;
    mag_data.magnitude = smoothed_magnitude;

    Serial.printf("LDR raw: %d, raw mag: %.1f, smoothed: %.1f\n", 
                   ldr_value, raw_magnitude, smoothed_magnitude);

    if (mag_data.magnitude > baseline_magnetic_field + 200) {
        mag_data.anomaly_detected = true;
        Serial.println("EM ANOMALY DETECTED");
    } else {
        mag_data.anomaly_detected = false;
    }
}
 
// Fallback simulate when no real sensor available
void simulateMagnetometer() {
    if (tesla_coil_active) {
        mag_data.x = random(200, 400);
        mag_data.y = random(200, 400);
        mag_data.z = random(300, 500);
        mag_data.magnitude = sqrt(mag_data.x * mag_data.x +
                                  mag_data.y * mag_data.y +
                                  mag_data.z * mag_data.z);
        if (mag_data.magnitude > baseline_magnetic_field + 50) {
            mag_data.anomaly_detected = true;
            Serial.println("EM ANOMALY DETECTED");
        }
    } else {
        mag_data.x = baseline_magnetic_field + random(-10, 10);
        mag_data.y = baseline_magnetic_field + random(-10, 10);
        mag_data.z = baseline_magnetic_field + random(-10, 10);
        mag_data.magnitude = sqrt(mag_data.x * mag_data.x +
                                  mag_data.y * mag_data.y +
                                  mag_data.z * mag_data.z);
        mag_data.anomaly_detected = false;
    }
}
/*
void simulateMagnetometer() {
    if (tesla_coil_active) {
        // HIGH field when coil is ON
        mag_data.x = random(400, 700);
        mag_data.y = random(400, 700);
        mag_data.z = random(500, 800);
    } else {
        // LOW field when coil is OFF - near baseline
        mag_data.x = baseline_magnetic_field + random(-10, 10);
        mag_data.y = baseline_magnetic_field + random(-10, 10);
        mag_data.z = baseline_magnetic_field + random(-10, 10);
    }
    mag_data.magnitude = sqrt(mag_data.x * mag_data.x +
                              mag_data.y * mag_data.y +
                              mag_data.z * mag_data.z);
    mag_data.anomaly_detected = (mag_data.magnitude > baseline_magnetic_field + 50);
}*/
 
// Route data
struct RoutePoint {
    double lat, lon;
    float temp, humidity, pressure;
    float risk;
    float em_factor;
    int distance;
    bool dataLoaded;
};
 
// Airport options
const char* origins[]      = {"CYOW", "CYUL", "CYVR"};
const char* destinations[] = {"CYYZ", "CYYC", "CYEG"};
int selectedOrigin = 0;
int selectedDest   = 0;
 
RoutePoint waypoints[8];
int currentWP      = 0;
int totalWP        = 0;
bool routeCalculated = false;
 
// UI states
enum UIState {
    SELECT_ORIGIN,
    SELECT_DEST,
    SHOW_ROUTE,
    DEMO_MODE
};
 
UIState currentState = SELECT_ORIGIN;
 
// Connect to WiFi
bool connect_wifi(unsigned long timeout_ms = 15000) {
    Serial.println("Starting WiFi");

    WiFi.disconnect(true);
    delay(100);

    WiFi.mode(WIFI_STA);
    delay(100);

    esp_wifi_sta_wpa2_ent_set_identity((uint8_t *)eap_identity, strlen(eap_identity));
    esp_wifi_sta_wpa2_ent_set_username((uint8_t *)eap_identity, strlen(eap_identity));
    esp_wifi_sta_wpa2_ent_set_password((uint8_t *)eap_password, strlen(eap_password));
    esp_wifi_sta_wpa2_ent_enable();

    

    // Connect
    WiFi.begin(ssid , eap_password);

    Serial.print("Connecting");
    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < timeout_ms) {
        Serial.print(".");
        delay(500);
    }
    Serial.println();

    if (WiFi.status() == WL_CONNECTED) {
        Serial.print("WiFi OK IP: ");
        Serial.println(WiFi.localIP());
        return true;
    }

    Serial.println("WiFi failed");
    return false;
}
 
// Fetch weather data from OpenWeatherMap
WeatherData fetch_weather(double lat, double lon) {
    WeatherData weather = {20.0, 60.0, 1013.0, 5.0, 0.0};
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("No WiFi - using defaults");
        return weather;
    }
    HTTPClient http;
    String url = String("http://api.openweathermap.org/data/2.5/weather?lat=") +
                 String(lat, 4) + "&lon=" + String(lon, 4) +
                 "&appid=" + String(api_key) + "&units=metric";
    http.begin(url);
    http.setTimeout(5000);
    int code = http.GET();
    if (code == HTTP_CODE_OK) {
        String json = http.getString();
        int t = json.indexOf("\"temp\":");
        int h = json.indexOf("\"humidity\":");
        int p = json.indexOf("\"pressure\":");
        if (t > 0) weather.temperature = json.substring(t + 7, json.indexOf(",", t)).toFloat();
        if (h > 0) weather.humidity    = json.substring(h + 11, json.indexOf(",", h)).toFloat();
        if (p > 0) weather.pressure    = json.substring(p + 11, json.indexOf(",", p)).toFloat();
        Serial.printf("Weather: %.1fC, %.0f%%, %.0fhPa\n",
                      weather.temperature, weather.humidity, weather.pressure);
    } else {
        Serial.printf("API Error: %d\n", code);
    }
    http.end();
    return weather;
}
 
// Calculate route waypoints
void calculateRoute() {
    Serial.println("Calculating route...");
    const char* origin = origins[selectedOrigin];
    const char* dest   = destinations[selectedDest];
    double lat1, lon1, lat2, lon2;
    if (!lookup_airport_coordinates(origin, &lat1, &lon1) ||
        !lookup_airport_coordinates(dest, &lat2, &lon2)) {
        Serial.println("Airport lookup failed");
        return;
    }
    totalWP = 8;
    double distance = haversine_distance(lat1, lon1, lat2, lon2);
    Serial.printf("Route: %s->%s = %.1f km\n", origin, dest, distance);
    for (int i = 0; i < totalWP; i++) {
        double fraction = (double)i / (totalWP - 1);
        waypoints[i].lat      = lat1 + (lat2 - lat1) * fraction;
        waypoints[i].lon      = lon1 + (lon2 - lon1) * fraction;
        waypoints[i].distance = (int)(distance * fraction);
        waypoints[i].em_factor  = 0.0;
        waypoints[i].dataLoaded = false;
    }
    routeCalculated = true;
}
 
// Load weather and risk data for a single waypoint
void loadWaypointData(int wp) {
    if (wp < 0 || wp >= totalWP) return;
    Serial.printf("Loading WP%d...\n", wp + 1);
    WeatherData w = fetch_weather(waypoints[wp].lat, waypoints[wp].lon);
    waypoints[wp].temp     = w.temperature;
    waypoints[wp].humidity = w.humidity;
    waypoints[wp].pressure = w.pressure;
    LightningRisk base_risk = calculate_lightning_risk(w);
    float em_contribution = 0.0;
    if (mag_data.anomaly_detected) {
        float deviation = mag_data.magnitude - baseline_magnetic_field;
        em_contribution = min(deviation / 5.0f, 40.0f);
        Serial.printf("  EM Anomaly: +%.1f mG -> +%.1f%% risk\n", deviation, em_contribution);
    }
    waypoints[wp].risk      = min((float)(base_risk.lightning_probability + em_contribution), 95.0f);
    waypoints[wp].em_factor = em_contribution;
    waypoints[wp].dataLoaded = true;
    Serial.printf("  Base: %.1f%% EM: +%.1f%% Total: %.1f%%\n",
                  base_risk.lightning_probability, em_contribution, waypoints[wp].risk);
}
 
// Initialize the TFT display
void setupDisplay() {
    Serial.println("Init display...");
    pinMode(15, OUTPUT);
    digitalWrite(15, HIGH);
    delay(50);
    tft.init();
    delay(50);
    tft.setRotation(2);
    tft.invertDisplay(true);
    delay(50);
    tft.fillScreen(TFT_BLACK);
    delay(50);
    Serial.println("Display ready");
}
 
// Draw airport origin selection screen
void drawOriginSelection() {
    tft.fillScreen(TFT_BLACK);
    tft.setTextSize(2);
    tft.setTextColor(TFT_CYAN);
    tft.setCursor(30, 20);
    tft.print("SELECT ORIGIN");
    tft.setTextSize(1);
    tft.setTextColor(TFT_WHITE);
    tft.setCursor(20, 50);
    tft.print("A: Next  X: Confirm");
    tft.setTextSize(2);
    for (int i = 0; i < 3; i++) {
        if (i == selectedOrigin) {
            tft.fillRect(10, 80 + i * 40, 220, 35, TFT_NAVY);
            tft.setTextColor(TFT_YELLOW);
        } else {
            tft.setTextColor(TFT_WHITE);
        }
        tft.setCursor(30, 90 + i * 40);
        tft.print(origins[i]);
    }
}
 
// Draw airport destination selection screen
void drawDestSelection() {
    tft.fillScreen(TFT_BLACK);
    tft.setTextSize(2);
    tft.setTextColor(TFT_CYAN);
    tft.setCursor(15, 20);
    tft.print("SELECT DESTINATION");
    tft.setTextSize(1);
    tft.setTextColor(TFT_GREEN);
    tft.setCursor(20, 50);
    tft.print("From: ");
    tft.print(origins[selectedOrigin]);
    tft.setTextColor(TFT_WHITE);
    tft.setCursor(20, 65);
    tft.print("A: Next  X: Confirm");
    tft.setTextSize(2);
    for (int i = 0; i < 3; i++) {
        if (i == selectedDest) {
            tft.fillRect(10, 90 + i * 40, 220, 35, TFT_NAVY);
            tft.setTextColor(TFT_YELLOW);
        } else {
            tft.setTextColor(TFT_WHITE);
        }
        tft.setCursor(30, 100 + i * 40);
        tft.print(destinations[i]);
    }
}
 
// Draw the top header bar
void drawHeader() {
    tft.fillRect(0, 0, 240, 35, TFT_NAVY);
    tft.setTextSize(2);
    tft.setTextColor(TFT_CYAN, TFT_NAVY);
    tft.setCursor(30, 8);
    tft.print("AIRLUME");
}
 
// Draw the Tesla coil demo mode screen
void drawDemoMode() {
    tft.fillScreen(TFT_BLACK);
    drawHeader();
    tft.setTextSize(2);
    tft.setTextColor(TFT_CYAN, TFT_BLACK);
    tft.setCursor(20, 45);
    tft.print("DEMO MODE");
    tft.setTextSize(1);
    tft.setCursor(10, 75);
    tft.setTextColor(TFT_WHITE, TFT_BLACK);
    tft.print("Tesla Coil:");
    tft.setCursor(100, 75);
    if (tesla_coil_active) {
        tft.setTextColor(TFT_RED, TFT_BLACK);
        tft.print("ACTIVE");
    } else {
        tft.setTextColor(TFT_GREEN, TFT_BLACK);
        tft.print("OFF   ");
    }
    tft.setTextColor(TFT_CYAN, TFT_BLACK);
    tft.setCursor(10, 95);
    tft.printf("Field:    %.1f mG", mag_data.magnitude);
    tft.setCursor(10, 110);
    tft.printf("Baseline: %.1f mG", baseline_magnetic_field);
    tft.setCursor(10, 125);
    float deviation = mag_data.magnitude - baseline_magnetic_field;
    tft.printf("Deviation:%+.1f mG", deviation);
    tft.setTextSize(2);
    tft.setCursor(20, 150);
    if (mag_data.anomaly_detected) {
        tft.setTextColor(TFT_RED, TFT_BLACK);
        tft.print("ANOMALY!");
    } else {
        tft.setTextColor(TFT_GREEN, TFT_BLACK);
        tft.print("NORMAL  ");
    }
    tft.setTextSize(1);
    tft.setTextColor(TFT_DARKGREY, TFT_BLACK);
    tft.setCursor(10, 200);
    tft.print("A: Toggle Tesla Coil");
    tft.setCursor(10, 215);
    tft.print("Y: Exit Demo");
}
 
// Draw waypoint number and distance
void drawWaypointInfo() {
    RoutePoint &wp = waypoints[currentWP];
    tft.setTextSize(2);
    tft.setTextColor(TFT_WHITE, TFT_BLACK);
    tft.setCursor(10, 40);
    tft.printf("WP %d/%d       ", currentWP + 1, totalWP);
    tft.setTextSize(1);
    tft.setCursor(10, 60);
    tft.printf("Distance: %d km   ", wp.distance);
}
 
// Draw the color coded risk progress bar
void drawRiskGauge(float risk) {
    tft.fillRect(20, 80, 200, 25, TFT_DARKGREY);
    int barWidth = constrain((int)(risk * 2), 0, 200);
    uint16_t color = TFT_GREEN;
    if (risk > 50)      color = TFT_RED;
    else if (risk > 25) color = TFT_YELLOW;
    tft.fillRect(20, 80, barWidth, 25, color);
    tft.setTextSize(2);
    tft.setTextColor(TFT_BLACK, color);
    tft.setCursor(70, 85);
    tft.printf("%.1f%%", risk);
}
 
// Draw SAFE / CAUTION / DANGER label
void drawRiskLabel(float risk) {
    tft.setTextSize(2);
    tft.setCursor(20, 115);
    if (risk > 50) {
        tft.setTextColor(TFT_RED, TFT_BLACK);
        tft.print("DANGER  ");
    } else if (risk > 25) {
        tft.setTextColor(TFT_YELLOW, TFT_BLACK);
        tft.print("CAUTION ");
    } else {
        tft.setTextColor(TFT_GREEN, TFT_BLACK);
        tft.print("SAFE    ");
    }
}
 
// Draw temperature humidity pressure and EM factor
void drawWeatherData() {
    RoutePoint &wp = waypoints[currentWP];
    tft.setTextSize(1);
    tft.setTextColor(TFT_CYAN, TFT_BLACK);
    tft.setCursor(10, 145);
    tft.printf("Temp:     %6.1f C  ", wp.temp);
    tft.setCursor(10, 160);
    tft.printf("Humidity: %6.0f %%  ", wp.humidity);
    tft.setCursor(10, 175);
    tft.printf("Pressure: %6.0f hPa", wp.pressure);
    if (wp.em_factor > 0) {
        tft.setCursor(10, 190);
        tft.setTextColor(TFT_ORANGE, TFT_BLACK);
        tft.printf("EM Factor: +%.1f%%  ", wp.em_factor);
    }
}
 
// Draw button hint controls
void drawControls() {
    tft.setTextSize(1);
    tft.setTextColor(TFT_DARKGREY, TFT_BLACK);
    tft.setCursor(10, 210);
    tft.print("A:Next B:Prev");
    tft.setCursor(10, 223);
    tft.print("X:Demo Y:Menu");
}
 
// Refresh the display based on current UI state
void updateDisplay() {
    if (currentState == SELECT_ORIGIN) {
        drawOriginSelection();
    } else if (currentState == SELECT_DEST) {
        drawDestSelection();
    } else if (currentState == DEMO_MODE) {
        drawDemoMode();
    } else if (currentState == SHOW_ROUTE) {
        RoutePoint &wp = waypoints[currentWP];
        if (!wp.dataLoaded) {
            tft.fillScreen(TFT_BLACK);
            tft.setCursor(50, 100);
            tft.setTextColor(TFT_WHITE);
            tft.setTextSize(2);
            tft.print("Loading...");
            loadWaypointData(currentWP);
        }
        tft.fillScreen(TFT_BLACK);
        drawHeader();
        drawWaypointInfo();
        drawRiskGauge(wp.risk);
        drawRiskLabel(wp.risk);
        drawWeatherData();
        drawControls();
    }
}
 
// Configure button pins
void setupButtons() {
    pinMode(BTN_A, INPUT_PULLUP);
    pinMode(BTN_B, INPUT_PULLUP);
    pinMode(BTN_X, INPUT_PULLUP);
    pinMode(BTN_Y, INPUT_PULLUP);
}
 
// Poll buttons and handle state transitions
void handleButtons() {
    if (digitalRead(BTN_A) == LOW) {
        if (currentState == SELECT_ORIGIN) {
            selectedOrigin = (selectedOrigin + 1) % 3;
            updateDisplay();
        } else if (currentState == SELECT_DEST) {
            selectedDest = (selectedDest + 1) % 3;
            updateDisplay();
        } else if (currentState == DEMO_MODE) {
            tesla_coil_active = !tesla_coil_active;
            Serial.println(tesla_coil_active ? "Tesla Coil ACTIVATED" : "Tesla Coil OFF");
            updateDisplay();
        } else if (currentState == SHOW_ROUTE && totalWP > 0) {
            currentWP = (currentWP + 1) % totalWP;
            updateDisplay();
        }
        while (digitalRead(BTN_A) == LOW) delay(10);
        delay(200);
    }
 
    if (digitalRead(BTN_B) == LOW && currentState == SHOW_ROUTE && totalWP > 0) {
        currentWP = (currentWP - 1 + totalWP) % totalWP;
        updateDisplay();
        while (digitalRead(BTN_B) == LOW) delay(10);
        delay(200);
    }
 
    if (digitalRead(BTN_X) == LOW) {
        if (currentState == SELECT_ORIGIN) {
            currentState = SELECT_DEST;
            updateDisplay();
        } else if (currentState == SELECT_DEST) {
            tft.fillScreen(TFT_BLACK);
            tft.setCursor(30, 100);
            tft.setTextColor(TFT_WHITE);
            tft.setTextSize(2);
            tft.print("Calculating");
            tft.setCursor(40, 120);
            tft.print("Route...");
            calculateRoute();
            loadWaypointData(0);
            currentState = SHOW_ROUTE;
            currentWP = 0;
            updateDisplay();
        } else if (currentState == SHOW_ROUTE) {
            Serial.println("ENTERING DEMO MODE");
            currentState = DEMO_MODE;
            tesla_coil_active = false;
            updateDisplay();
        }
        while (digitalRead(BTN_X) == LOW) delay(10);
        delay(200);
    }
 
    if (digitalRead(BTN_Y) == LOW) {
        if (currentState == DEMO_MODE) {
            Serial.println("EXITING DEMO MODE");
            tesla_coil_active = false;
            currentState = SHOW_ROUTE;
            for (int i = 0; i < totalWP; i++) {
                waypoints[i].dataLoaded = false;
            }
            loadWaypointData(currentWP);
            updateDisplay();
        } else if (currentState == SHOW_ROUTE) {
            currentState = SELECT_ORIGIN;
            selectedOrigin   = 0;
            selectedDest     = 0;
            routeCalculated  = false;
            totalWP          = 0;
            currentWP        = 0;
            tesla_coil_active = false;
            updateDisplay();
        }
        while (digitalRead(BTN_Y) == LOW) delay(10);
        delay(200);
    }
}
 
void setup() {
    Serial.begin(115200);
    delay(1000);
    Serial.println("AirLume ESP32 Starting");
    Serial.println("Simulated sensors active");
 
    setupDisplay();
    setupButtons();
    pinMode(LDR_PIN, INPUT);
 
    tft.setCursor(40, 100);
    tft.setTextColor(TFT_WHITE);
    tft.setTextSize(2);
    tft.print("Connecting...");
 
    connect_wifi();
 
    mag_data.anomaly_detected = false;
    simulateMagnetometer();
 
    Serial.println("Demo flow:");
    Serial.println("1. Select airports");
    Serial.println("2. View route");
    Serial.println("3. Press X for demo mode");
    Serial.println("4. Press A to toggle Tesla coil");
    Serial.println("5. Press Y to exit demo");
 
    updateDisplay();
    Serial.println("Setup complete");
}
 
void loop() {
    // Use real LDR if available, otherwise simulate
    int ldr_raw = analogRead(LDR_PIN);
    
    if (ldr_raw > 500) {
        // LDR is connected and reading something
        readSensor();
    } else {
        // Fall back to button-driven simulation
        simulateMagnetometer();
    }
 
    handleButtons();
 
    // Refresh demo mode display every 500ms
    if (currentState == DEMO_MODE) {
        static unsigned long lastUpdate = 0;
        if (millis() - lastUpdate > 500) {
            drawDemoMode();
            lastUpdate = millis();
        }
    }
 
    delay(50);
}