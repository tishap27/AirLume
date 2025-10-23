CC = gcc
CFLAGS = -lm
SRC = c_src/main.c c_src/riskcalc.c c_src/csv_reader.c c_src/route_planning.c c_src/route_risk.c
OBJ = $(SRC:.c=.o)
TARGET = build/airlume

all: $(TARGET)

$(TARGET): $(OBJ)
	$(CC) -o $@ $^ $(CFLAGS)

%.o: %.c
	$(CC) -c $< -o $@

clean:
	rm -f $(OBJ) $(TARGET)
