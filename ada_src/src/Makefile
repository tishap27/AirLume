# Ada Safety-Critical System Build
GNATMAKE = gnatmake
GNATCLEAN = gnatclean

# Source files
SOURCES = safety_types.ads \ arinc653_core.ads arinc653_core.adb \ physics_validator.ads physics_validator.adb \
          safety_monitor.ads safety_monitor.adb main.adb

# Output
TARGET = obj/main.exe

all: $(TARGET)

$(TARGET): $(SOURCES)
	mkdir -p obj
	$(GNATMAKE) -o $(TARGET) main.adb -D obj

clean:
	$(GNATCLEAN) -c main
	rm -rf obj

rebuild: clean all

.PHONY: all clean rebuild
