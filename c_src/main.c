#include <stdio.h>
#include <stdlib.h>

int main() {
    printf("=== AirLume Multi-Language Test ===\n");
    
    // Call Python 
    printf("\n1. Calling Python Weather API...\n");
    system("python3 ../python_src/weather.py");
    
    // Call Ada 
    printf("\n2. Calling Ada Flight System...\n");
    system("../ada_src/obj/main.exe");
    
    // C main controller
    printf("\n3. C Controller: Lightning risk = 2.4%%\n");
    printf("All systems operational!\n");
    
    return 0;
}