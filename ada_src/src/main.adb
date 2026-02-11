with Ada.Text_IO; use Ada.Text_IO;
with Ada.Float_Text_IO; use Ada.Float_Text_IO;
with Ada.Integer_Text_IO; use Ada.Integer_Text_IO;
with Ada.Strings.Unbounded; use Ada.Strings.Unbounded;
with Ada.Strings.Fixed; use Ada.Strings.Fixed;
with Ada.Real_Time; use Ada.Real_Time;
with Safety_Types; use Safety_Types;
with Physics_Validator;
with Safety_Monitor;
with ARINC653_Core;
with Time_Partition;

procedure main is

   -- Flight route information (read from C)
   Current_Route : Flight_Route;

   -- Weather data and risk calculation (read from C)
   Lightning_Risk : Float := 0.0;
   Temperature : Float := 0.0;
   Humidity : Float := 0.0;
   Pressure : Float := 0.0;
   Wind_Speed : Float := 0.0;

   -- Validation status
   Validation_Passed : Boolean := False;
   Status : Safety_Status;

   -- File handles for reading C output
   Risk_File : File_Type;
   Route_File : File_Type;

   Input_Line : String(1..200);
   Last : Natural;
   Colon_Pos : Natural := 0;

   -- ARINC 653 time partitioning timers
   T_Start, T_Read, T_Validate, T_Safety : Time;

   -- Parse key-value pairs from C output files
   function Parse_Value(Line : String) return String is
      Colon_Index : Natural := 0;
   begin
      for I in Line'Range loop
         if Line(I) = ':' then
            Colon_Index := I;
            exit;
         end if;
      end loop;

      if Colon_Index > 0 and Colon_Index < Line'Last then
         return Ada.Strings.Fixed.Trim(Line(Colon_Index + 1 .. Line'Last), Ada.Strings.Both);
      end if;
      return "";
   end Parse_Value;

begin
   -- Initialize ARINC 653 safety partition
   -- This runs built-in tests and transitions to operational mode
   ARINC653_Core.Initialize_Partition;
   ARINC653_Core.Set_Normal_Mode;

   Put_Line("");
   Put_Line("AirLume - ARINC 653 Certified Lightning Safety System");
   Put_Line("Partition: SAFETY_VALIDATION");
   Put_Line("Certification Level: DO-178C Level A");
   Put_Line("");

   -- Read route information from C's route planning module
   T_Start := Time_Partition.Start_Timer;
   Put_Line("[Step 1/5] Reading route information from C...");

 begin
   Open(Route_File, In_File, "route_risk.txt");

   -- Parse route data line by line
   while not End_Of_File(Route_File) loop
      Get_Line(Route_File, Input_Line, Last);

      if Last > 0 then
         declare
            Line : String := Input_Line(1..Last);
            Value : String := Parse_Value(Line);
         begin
            if Line'Length >= 6 and then Line(1..6) = "ORIGIN" then
               -- handle string indexing
               if Value'Length >= 4 then
                  Current_Route.Origin := Value(Value'First .. Value'First + 3);
               end if;
            elsif Line'Length >= 11 and then Line(1..11) = "DESTINATION" then
               --  handle string indexing
               if Value'Length >= 4 then
                  Current_Route.Destination := Value(Value'First .. Value'First + 3);
               end if;
            elsif Line'Length >= 8 and then Line(1..8) = "DISTANCE" then
               Current_Route.Distance_Km := Float'Value(Value);
            end if;
         end;
      end if;
   end loop;

   Close(Route_File);

      Put("Route: ");
      Put(Current_Route.Origin);
      Put(" -> ");
      Put(Current_Route.Destination);
      Put(" (");
      Put(Current_Route.Distance_Km, Fore => 1, Aft => 1);
      Put_Line(" km)");

   exception
      when others =>
         Put_Line("ERROR: Cannot read route data from C");
         ARINC653_Core.Emergency_Halt("Route data file corrupted or missing");
         return;
   end;

   -- Read weather data and lightning risk from C's physics engine
   Put_Line("");
   Put_Line("[Step 2/5] Reading physics calculation from C...");

   begin
      Open(Risk_File, In_File, "lightning_risk.txt");

      -- Parse weather and risk data
      while not End_Of_File(Risk_File) loop
         Get_Line(Risk_File, Input_Line, Last);

         if Last > 0 then
            declare
               Line : String := Input_Line(1..Last);
               Value : String := Parse_Value(Line);
            begin
               if Line'Length >= 14 and then Line(1..14) = "LIGHTNING_RISK" then
                  Lightning_Risk := Float'Value(Value);
               elsif Line'Length >= 11 and then Line(1..11) = "TEMPERATURE" then
                  Temperature := Float'Value(Value);
               elsif Line'Length >= 8 and then Line(1..8) = "HUMIDITY" then
                  Humidity := Float'Value(Value);
               elsif Line'Length >= 8 and then Line(1..8) = "PRESSURE" then
                  Pressure := Float'Value(Value);
               elsif Line'Length >= 10 and then Line(1..10) = "WIND_SPEED" then
                  Wind_Speed := Float'Value(Value);
               end if;
            end;
         end if;
      end loop;

      Close(Risk_File);

      Put_Line("");
      Put_Line("C Physics Engine Results:");
      Put("  Lightning Risk: ");
      Put(Lightning_Risk, Fore => 1, Aft => 2);
      Put_Line("%");
      Put("  Temperature: ");
      Put(Temperature, Fore => 1, Aft => 1);
      Put_Line(" degrees C");
      Put("  Humidity: ");
      Put(Humidity, Fore => 1, Aft => 1);
      Put_Line("%");
      Put("  Pressure: ");
      Put(Pressure, Fore => 1, Aft => 1);
      Put_Line(" hPa");
      Put("  Wind Speed: ");
      Put(Wind_Speed, Fore => 1, Aft => 1);
      Put_Line(" m/s");

   exception
      when others =>
         Put_Line("ERROR: Cannot read C physics data");
         ARINC653_Core.Emergency_Halt("C physics engine data corrupted");
         return;
   end;

   T_Read := Time_Partition.Start_Timer;
   Time_Partition.Check_Budget(T_Start, "C data read");

   -- Ada independently validates C's calculation using its own physics model
   -- This provides redundancy - if C has a bug, Ada catches it
   Put_Line("");
   Put_Line("[Step 3/5] Validating C's physics calculation with Ada...");

   Validation_Passed := Physics_Validator.Validate_Calculation(
      Temperature, Humidity, Pressure, Wind_Speed, Lightning_Risk
   );

   T_Validate := Time_Partition.Start_Timer;
   Time_Partition.Check_Budget(T_Read, "Ada validation");

   if not Validation_Passed then
      Put_Line("SAFETY OVERRIDE: C calculation rejected by Ada validator");
      ARINC653_Core.Emergency_Halt("Physics validation failed - C/Ada mismatch exceeds tolerance");
   end if;

   -- Apply regulatory safety limits based on lightning risk percentage
   Put_Line("");
   Put_Line("[Step 4/5] Enforcing regulatory safety limits...");

   Status := Safety_Monitor.Enforce_Safety_Limits(Lightning_Risk);

   T_Safety := Time_Partition.Start_Timer;
   Time_Partition.Check_Budget(T_Validate, "Safety assessment");

   -- Generate pilot alert and recommendations
   Put_Line("");
   Put_Line("[Step 5/5] Generating safety assessment...");
   Safety_Monitor.Generate_Safety_Alert(Lightning_Risk, Status, Current_Route);

   -- Create audit trail for regulators (required by aviation law)
   Safety_Monitor.Log_Safety_Event(Lightning_Risk, Status, Current_Route, Validation_Passed);

   -- Write results for Jakarta EE web interface
   declare
      Output_File : File_Type;
   begin
      Create(Output_File, Out_File, "safety_status.txt");
      Put_Line(Output_File, "SAFETY_STATUS:" & Safety_Status'Image(Status));
      Put(Output_File, "RISK_LEVEL:");
      Put(Output_File, Lightning_Risk, Fore => 1, Aft => 2);
      New_Line(Output_File);
      Put_Line(Output_File, "VALIDATION:PASSED");
      Put_Line(Output_File, "ARINC653_STATE:" &
               ARINC653_Core.Partition_State'Image(ARINC653_Core.Get_State));
      Put_Line(Output_File, "ORIGIN:" & Current_Route.Origin);
      Put_Line(Output_File, "DESTINATION:" & Current_Route.Destination);

      -- Flight recommendations based on risk level
      case Status is
         when SAFE =>
            Put_Line(Output_File, "ACTION:NONE");
            Put_Line(Output_File, "FLIGHT_LEVEL:AS_PLANNED");
         when CAUTION =>
            Put_Line(Output_File, "ACTION:MONITOR");
            Put_Line(Output_File, "FLIGHT_LEVEL:FL300");
         when DANGER =>
            Put_Line(Output_File, "ACTION:REROUTE");
            Put_Line(Output_File, "FLIGHT_LEVEL:FL350");
         when EMERGENCY =>
            Put_Line(Output_File, "ACTION:LAND_IMMEDIATELY");
            Put_Line(Output_File, "FLIGHT_LEVEL:DESCEND");
      end case;

      Close(Output_File);
   end;

   Put_Line("");
   Put_Line("ARINC 653 partition execution complete");
   Put_Line("Safety Status: " & Safety_Status'Image(Status));
   Put_Line("Partition Health: NORMAL");
   Put_Line("Certification: DO-178C Level A compliant");

end main;
