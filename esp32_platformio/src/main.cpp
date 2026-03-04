#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <TFT_eSPI.h>
#include "config.h"


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
const char* ssid     = WIFI_SSID;
const char* password = WIFI_PASSWORD;
const char* api_key  = WEATHER_API_KEY;

// LCD
TFT_eSPI tft = TFT_eSPI();

// Buttons (from your working code)
#define BTN_A     27
#define BTN_B     26
#define BTN_X     25
#define BTN_Y     14

// Route data
struct RoutePoint {
    double lat, lon;
    float temp, humidity, pressure;
    float risk;
    int distance;
    bool dataLoaded;
};
// Airport options
const char* origins[] = {"CYOW", "CYUL", "CYVR"};      // Ottawa, Montreal, Vancouver
const char* destinations[] = {"CYYZ", "CYYC", "CYEG"}; // Toronto, Calgary, Edmonton
int selectedOrigin = 0;
int selectedDest = 0;

RoutePoint waypoints[8];
int currentWP = 0;
int totalWP = 0;
bool routeCalculated = false;

// UI State
enum UIState {
    SELECT_ORIGIN,
    SELECT_DEST,
    SHOW_ROUTE
};

UIState currentState = SELECT_ORIGIN;

//WIFI FUNCTIONS 

bool connect_wifi(unsigned long timeout_ms = 15000) {
    Serial.println("Starting WiFi");
    
    WiFi.disconnect(true);
    delay(100);
    WiFi.mode(WIFI_STA);
    delay(100);

    WiFi.begin(ssid, password);

    Serial.print("Connecting");
    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < timeout_ms) {
        Serial.print(".");
        delay(500);
    }
    Serial.println();

    if (WiFi.status() == WL_CONNECTED) {
        Serial.print("WiFi OK! IP: ");
        Serial.println(WiFi.localIP());
        return true;
    }
    
    Serial.println("WiFi failed");
    return false;
}

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
    http.setTimeout(5000);  // 5 second timeout
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

//ROUTE CALCULATION

void calculateRoute() {
    Serial.println("Calculating route...");
    
    const char* origin = origins[selectedOrigin];
    const char* dest = destinations[selectedDest];
    
    double lat1, lon1, lat2, lon2;
    
    // Use YOUR C function to lookup coordinates
    if (!lookup_airport_coordinates(origin, &lat1, &lon1) ||
        !lookup_airport_coordinates(dest, &lat2, &lon2)) {
        Serial.println("Airport lookup failed!");
        return;
    }

    totalWP = 8;
    double distance = haversine_distance(lat1, lon1, lat2, lon2);
    Serial.printf("Route: %s->%s = %.1f km\n", origin, dest, distance);
   
    
    for (int i = 0; i < totalWP; i++) {
        double fraction = (double)i / (totalWP - 1);
        waypoints[i].lat = lat1 + (lat2 - lat1) * fraction;
        waypoints[i].lon = lon1 + (lon2 - lon1) * fraction;
        waypoints[i].distance = (int)(distance * fraction);
        waypoints[i].dataLoaded = false;
    }
    routeCalculated = true;
}

void loadWaypointData(int wp) {
    if (wp < 0 || wp >= totalWP) return;
    
    Serial.printf("Loading WP%d...\n", wp + 1);
    
    WeatherData w = fetch_weather(waypoints[wp].lat, waypoints[wp].lon);
    
    waypoints[wp].temp = w.temperature;
    waypoints[wp].humidity = w.humidity;
    waypoints[wp].pressure = w.pressure;
    
    LightningRisk risk = calculate_lightning_risk(w);
    waypoints[wp].risk = risk.lightning_probability;
    waypoints[wp].dataLoaded = true;
    
    Serial.printf("  Risk: %.1f%%\n", risk.lightning_probability);
}

//LCD FUNCTIONS

void setupDisplay() {
    Serial.println("Init display...");
    
    pinMode(15, OUTPUT);
    digitalWrite(15, HIGH);  // Backlight ON
    delay(50);
    
    tft.init();
    delay(50);
    
    tft.setRotation(2);  
    tft.invertDisplay(true);  
    delay(50);
    
    tft.fillScreen(TFT_BLACK);
    delay(50);
    
    Serial.println("Display ready!");
}

void drawOriginSelection() {
    tft.fillScreen(TFT_BLACK);
    
    // Title
    tft.setTextSize(2);
    tft.setTextColor(TFT_CYAN);
    tft.setCursor(30, 20);
    tft.print("SELECT ORIGIN");
    
    // Instructions
    tft.setTextSize(1);
    tft.setTextColor(TFT_WHITE);
    tft.setCursor(20, 50);
    tft.print("A: Next  X: Confirm");
    
    // Airport options
    tft.setTextSize(2);
    for (int i = 0; i < 3; i++) {
        if (i == selectedOrigin) {
            // Highlight selected
            tft.fillRect(10, 80 + i*40, 220, 35, TFT_NAVY);
            tft.setTextColor(TFT_YELLOW);
        } else {
            tft.setTextColor(TFT_WHITE);
        }
        tft.setCursor(30, 90 + i*40);
        tft.print(origins[i]);
    }
}

void drawDestSelection() {
    tft.fillScreen(TFT_BLACK);
    
    // Title
    tft.setTextSize(2);
    tft.setTextColor(TFT_CYAN);
    tft.setCursor(15, 20);
    tft.print("SELECT DESTINATION");
    
    // Show selected origin
    tft.setTextSize(1);
    tft.setTextColor(TFT_GREEN);
    tft.setCursor(20, 50);
    tft.print("From: ");
    tft.print(origins[selectedOrigin]);
    
    // Instructions
    tft.setTextColor(TFT_WHITE);
    tft.setCursor(20, 65);
    tft.print("A: Next  X: Confirm");
    
    // Airport options
    tft.setTextSize(2);
    for (int i = 0; i < 3; i++) {
        if (i == selectedDest) {
            tft.fillRect(10, 90 + i*40, 220, 35, TFT_NAVY);
            tft.setTextColor(TFT_YELLOW);
        } else {
            tft.setTextColor(TFT_WHITE);
        }
        tft.setCursor(30, 100 + i*40);
        tft.print(destinations[i]);
    }
}

void drawHeader() {
    tft.fillRect(0, 0, 240, 35, TFT_NAVY);
    tft.setTextSize(2);
    tft.setTextColor(TFT_CYAN, TFT_NAVY);
    tft.setCursor(30, 8);
    tft.print("AIRLUME");
}

void drawWaypointInfo() {
    RoutePoint &wp = waypoints[currentWP];
    
    tft.setTextSize(2);
    tft.setTextColor(TFT_WHITE, TFT_BLACK);
     tft.setCursor(10, 60);
    tft.printf("WP %d/%d       ", currentWP + 1, totalWP);
    
    tft.setTextSize(1);
    tft.setCursor(10, 85);
    tft.printf("Distance: %d km   ", wp.distance);
}

void drawRiskGauge(float risk) {
    tft.fillRect(20, 90, 200, 25, TFT_DARKGREY);
    
    int barWidth = constrain((int)(risk * 2), 0, 200);
    uint16_t color = TFT_GREEN;
    
    if (risk > 50) color = TFT_RED;
    else if (risk > 25) color = TFT_YELLOW;
    
    tft.fillRect(20, 90, barWidth, 25, color);
    
    tft.setTextSize(2);
    tft.setTextColor(TFT_BLACK, color);
    tft.setCursor(70, 95);
    tft.printf("%.1f%%", risk);
}

void drawRiskLabel(float risk) {
    tft.setTextSize(2);
    tft.setCursor(20, 125);
    
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

void drawWeatherData() {
    RoutePoint &wp = waypoints[currentWP];
    
    tft.setTextSize(1);
    tft.setTextColor(TFT_CYAN, TFT_BLACK);
    
    tft.setCursor(10, 155);
    tft.printf("Temp:     %6.1f C  ", wp.temp);
    
    tft.setCursor(10, 170);
    tft.printf("Humidity: %6.0f %%  ", wp.humidity);
    
    tft.setCursor(10, 185);
    tft.printf("Pressure: %6.0f hPa", wp.pressure);
}

void drawControls() {
    tft.setTextSize(1);
    tft.setTextColor(TFT_DARKGREY, TFT_BLACK);
    tft.setCursor(10, 220);
    tft.print("A:Next B:Prev Y: Menu X:Refresh");
}

void updateDisplay() {
   if (currentState == SELECT_ORIGIN) {
        drawOriginSelection();
    } else if (currentState == SELECT_DEST) {
        drawDestSelection();
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

//BUTTON HANDLING

void setupButtons() {
    pinMode(BTN_A, INPUT_PULLUP);
    pinMode(BTN_B, INPUT_PULLUP);
    pinMode(BTN_X, INPUT_PULLUP);
    pinMode(BTN_Y, INPUT_PULLUP);
}

void handleButtons() {
   if (digitalRead(BTN_A) == LOW) {
        if (currentState == SELECT_ORIGIN) {
            selectedOrigin = (selectedOrigin + 1) % 3;
            updateDisplay();
        } else if (currentState == SELECT_DEST) {
            selectedDest = (selectedDest + 1) % 3;
            updateDisplay();
        } else if (currentState == SHOW_ROUTE && totalWP > 0) {  // ← CHECK totalWP!
            currentWP = (currentWP + 1) % totalWP;
            updateDisplay();
        }
        while (digitalRead(BTN_A) == LOW) delay(10);
        delay(200);
    }
    
    // Button B - Previous
    if (digitalRead(BTN_B) == LOW && currentState == SHOW_ROUTE && totalWP > 0) {  // ← CHECK totalWP!
        currentWP = (currentWP - 1 + totalWP) % totalWP;
        updateDisplay();
        while (digitalRead(BTN_B) == LOW) delay(10);
        delay(200);
    }
    
    // Button X - Confirm/Select
    if (digitalRead(BTN_X) == LOW) {
        if (currentState == SELECT_ORIGIN) {
            currentState = SELECT_DEST;
            updateDisplay();
        } else if (currentState == SELECT_DEST) {
            // Calculate route and switch to route view
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
        } else if (currentState == SHOW_ROUTE && totalWP > 0) {  // ← Refresh
            // Mark all waypoints as not loaded
            for (int i = 0; i < totalWP; i++) {
                waypoints[i].dataLoaded = false;
            }
            loadWaypointData(currentWP);
            updateDisplay();
        }
        while (digitalRead(BTN_X) == LOW) delay(10);
        delay(200);
    }
    
    // Button Y - Back to menu
    if (digitalRead(BTN_Y) == LOW && currentState == SHOW_ROUTE) {
        currentState = SELECT_ORIGIN;
        selectedOrigin = 0;
        selectedDest = 0;
        routeCalculated = false;
        totalWP = 0;  // ← RESET totalWP!
        currentWP = 0;
        updateDisplay();
        while (digitalRead(BTN_Y) == LOW) delay(10);
        delay(200);
    }
}
//SETUP & LOOP

void setup() {
    Serial.begin(115200);
    delay(1000);
    Serial.println("\n=== AirLume ESP32 Starting ===\n");

    setupDisplay();
    setupButtons();
    
    tft.setCursor(40, 100);
    tft.setTextColor(TFT_WHITE);
    tft.setTextSize(2);
    tft.print("Connecting...");
    
    connect_wifi();
    updateDisplay();

    
    
    Serial.println("=== Setup Complete ===\n");
}

void loop() {
    handleButtons();
    delay(50);
}