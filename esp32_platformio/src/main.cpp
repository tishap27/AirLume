#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include "config.h"

// Include C headers
extern "C" {
    #include "../../c_src/riskcalc.h"
    #include "../../c_src/route_planning.h"

    // Include C implementations
    #include "../../c_src/riskcalc.c"
    #include "../../c_src/riskcalc_altitude.c"
    #include "../../c_src/route_planning.c"
    #include "../../c_src/csv_reader.c"
}


// Now using correct wifi and password
const char* ssid     = WIFI_SSID;
const char* password = WIFI_PASSWORD;
const char* api_key  = WEATHER_API_KEY;

// Forward declaration
WeatherData fetch_weather(double lat, double lon);

bool connect_wifi(unsigned long timeout_ms = 15000) {
    Serial.println("Starting WiFi");

    WiFi.disconnect(true);
    delay(500);
    WiFi.mode(WIFI_STA);
    delay(500);

    WiFi.begin(ssid, password);

    Serial.print("WiFi connecting");
    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < timeout_ms) {
        Serial.print(".");
        delay(500);
    }
    Serial.println();

    if (WiFi.status() == WL_CONNECTED) {
        Serial.print("WiFi connected, IP: ");
        Serial.println(WiFi.localIP());
        return true;
    } else {
        Serial.println("WiFi connection failed (timeout).");
        return false;
    }
}

WeatherData fetch_weather(double lat, double lon) {
    // Default values if no network or API error
    WeatherData weather = {20.0, 60.0, 1013.0, 5.0, 0.0};

    if (WiFi.status() == WL_CONNECTED) {
        HTTPClient http;

        String url = String("http://api.openweathermap.org/data/2.5/weather?lat=") +
                     String(lat, 4) +
                     "&lon=" + String(lon, 4) +
                     "&appid=" + String(api_key) +
                     "&units=metric";

        Serial.print("Requesting Weather from api: ");
        //Serial.println(url);

        http.begin(url);
        int code = http.GET();

        if (code == HTTP_CODE_OK) {
            String json = http.getString();
            Serial.println("Weather response received");

            int t = json.indexOf("\"temp\":");
            int h = json.indexOf("\"humidity\":");
            int p = json.indexOf("\"pressure\":");
            int w = json.indexOf("\"speed\":");

            if (t > 0) weather.temperature = json.substring(t + 7, json.indexOf(",", t)).toFloat();
            if (h > 0) weather.humidity    = json.substring(h + 11, json.indexOf(",", h)).toFloat();
            if (p > 0) weather.pressure    = json.substring(p + 11, json.indexOf(",", p)).toFloat();
            if (w > 0) weather.wind_speed  = json.substring(w + 8,  json.indexOf("}", w)).toFloat();

            Serial.println("Weather fetched");
        } else {
            Serial.print("HTTP GET failed, code: ");
            Serial.println(code);
        }

        http.end();
    } else {
        Serial.println("No WiFi, using default weather values");
    }

    return weather;
}

void setup() {
    Serial.begin(115200);
    delay(2000);

    Serial.println();
    Serial.println("AirLume ESP32 Demo System");
    Serial.println();

    bool wifi_ok = connect_wifi();
    if (!wifi_ok) {
        Serial.println("Continuing without WiFi; using default weather");
    }

    // Test 1: Single point
    Serial.println("=== Test 1: Ottawa Weather ===");
    WeatherData w = fetch_weather(45.3202, -75.6656);

    char buf[128];

    snprintf(buf, sizeof(buf),
             "Temp: %.1f C | Hum: %.0f%% | Press: %.0f hPa\n",
             w.temperature, w.humidity, w.pressure);
    Serial.print(buf);

    LightningRisk risk = calculate_lightning_risk(w);

    snprintf(buf, sizeof(buf), "Lightning Risk: %.2f%%\n", risk.lightning_probability);
    Serial.print(buf);

    snprintf(buf, sizeof(buf), "E-Field: %.1f V/m\n", risk.electric_field);
    Serial.print(buf);

    if (risk.lightning_probability < 15) {
        Serial.println("SAFE");
    } else if (risk.lightning_probability < 30) {
        Serial.println("CAUTION");
    } else {
        Serial.println("HIGH RISK");
    }

    // Test 2: Route distance
    Serial.println();
    Serial.println("=== Test 2: Route Planning ===");

    double lat1, lon1, lat2, lon2;

    if (lookup_airport_coordinates("CYOW", &lat1, &lon1) &&
        lookup_airport_coordinates("CYYZ", &lat2, &lon2)) {

        double dist = haversine_distance(lat1, lon1, lat2, lon2);
        snprintf(buf, sizeof(buf), "CYOW -> CYYZ: %.1f km\n", dist);
        Serial.print(buf);
    } else {
        Serial.println("Airport lookup failed");
    }

    Serial.println();
    Serial.println("It's a starttt.");
}

void loop() {
    // Nothing periodic for now
    delay(60000);
}
