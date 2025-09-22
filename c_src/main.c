#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "riskcalc.h"

#ifdef _WIN32
    #define PYTHON_CMD "python"
    #define PATH_SEP "\\"
#else
    #define PYTHON_CMD "python3"
    #define PATH_SEP "/"
#endif

int main() {
    printf("=== AirLume Lightning Strike Prediction System ===\n");
    
    // Call Python 
    printf("\n1. Calling Python Weather API...\n");
    //system("python3 ../python_src/weather.py");

    FILE* weather_pipe; 
    char weather_output[1024];
    char command[256];

    #ifdef _WIN32
        system("python python_src\\weather.py");
    #else
        system("python3 python_src/weather.py");
    #endif

    weather_pipe = popen(command, "r");
    if (!weather_pipe) {
        printf("Error: Cannot execute Python weather module\n");
        return 1;
    }
    WeatherData weather_data = {20.0, 60.0, 1013.0, 5.0}; // defaults
    
    // Read Python output and parse weather data
    while (fgets(weather_output, sizeof(weather_output), weather_pipe)) {
        printf("%s", weather_output); // Show Python output
        
        if (strstr(weather_output, "WEATHER_DATA:")) {
            weather_data = parse_weather_data(weather_output);
        }
    }
    pclose(weather_pipe);

    // Calculate lightning risk using physics
    printf("\n Analyzing Lightning Risk...\n");
    LightningRisk risk = calculate_lightning_risk(weather_data);
    print_risk_assessment(risk);


    //Writing risk to file for Ada
    write_risk_to_file(risk.lightning_probability);


    // Call Ada 
    printf("\n2. Calling Ada Flight System...\n");
    //system("../ada_src/obj/main.exe");
    
    #ifdef _WIN32
        system("ada_src\\obj\\main.exe");
    #else
        system("./ada_src/obj/main.exe");
    #endif
    
    
    // C main controller
    //printf("\n3. C Controller: Lightning risk = 2.4%%\n");
    printf("All systems operational!\n");
    
    return 0;
}