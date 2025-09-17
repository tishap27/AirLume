#include <stdio.h>
#include <stdlib.h>

#ifdef _WIN32
    #define PYTHON_CMD "python"
    #define PATH_SEP "\\"
#else
    #define PYTHON_CMD "python3"
    #define PATH_SEP "/"
#endif

int main() {
    printf("=== AirLume Multi-Language Test ===\n");
    
    // Call Python 
    printf("\n1. Calling Python Weather API...\n");
    //system("python3 ../python_src/weather.py");

    #ifdef _WIN32
        system("python python_src\\weather.py");
    #else
        system("python3 python_src/weather.py");
    #endif

    // Call Ada 
    printf("\n2. Calling Ada Flight System...\n");
    //system("../ada_src/obj/main.exe");
    
    #ifdef _WIN32
        system("ada_src\\obj\\main.exe");
    #else
        system("./ada_src/obj/main.exe");
    #endif
    
    
    // C main controller
    printf("\n3. C Controller: Lightning risk = 2.4%%\n");
    printf("All systems operational!\n");
    
    return 0;
}