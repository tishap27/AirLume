with Ada.Text_IO; use Ada.Text_IO;
with Ada.Float_Text_IO; use Ada.Float_Text_IO;
with Ada.Integer_Text_IO; use Ada.Integer_Text_IO;
with Ada.Strings.Unbounded; use Ada.Strings.Unbounded;
with Ada.Strings.Fixed; use Ada.Strings.Fixed;
with Safety_Types; use Safety_Types;
with Physics_Validator;
with Safety_Monitor;

procedure main is

  Current_Route : Flight_Route := (
      Origin => "CYOW",
      Destination => "CYYZ",
      Distance_Km => 350.0
   );

   Lightning_Risk : Float := 0.0;
   Temperature : Float := 20.0;
   Humidity : Float := 60.0;
   Pressure : Float := 1013.0;
   Wind_Speed : Float := 5.0;

   Validation_Passed : Boolean := False;
   Status : Safety_Status;
   Risk_File : File_Type;
   Input_Line : String(1..200);
   Last : Natural;
   Colon_Pos : Natural := 0;

begin
   Put_Line("===========================================================");
   Put_Line("    AIRLUME SAFETY-CRITICAL SYSTEM (Ada ARINC 653)");
   Put_Line("===========================================================");
   Put_Line("");

   -- Step 1: Read C's calculation
   Put_Line("[1/4] Reading physics calculation from C...");
   begin
      Open(Risk_File, In_File, "lightning_risk.txt");
      Get_Line(Risk_File, Input_Line, Last);
      Close(Risk_File);

      -- Parse LIGHTNING_RISK:XX.XX
      for I in 1..Last loop
         if Input_Line(I) = ':' then
            Colon_Pos := I;
            exit;
         end if;
      end loop;

      if Colon_Pos > 0 and Colon_Pos < Last then
         declare
            Risk_String : String := Input_Line(Colon_Pos + 1..Last);
         begin
            Lightning_Risk := Float'Value(Risk_String);
         end;
      end if;

      Put("C reported risk: ");
      Put(Lightning_Risk, Fore => 1, Aft => 2);
      Put_Line("%");
   exception
      when others =>
         Put_Line("ERROR: Cannot read C risk data");
         Put_Line("FAILSAFE: System entering emergency mode");
         Status := EMERGENCY;
         Safety_Monitor.Generate_Safety_Alert(99.9, Status, Current_Route);
         return;
   end;

   -- Step 2: Validate C's calculation with independent Ada model
   Put_Line("");
   Put_Line("[2/4] Validating physics calculation...");
   Validation_Passed := Physics_Validator.Validate_Calculation(
      Temperature, Humidity, Pressure, Wind_Speed, Lightning_Risk
   );

   if not Validation_Passed then
      Put_Line("*** SAFETY OVERRIDE: C calculation REJECTED ***");
      Status := EMERGENCY;
   else
      -- Step 3: Enforce safety limits
      Put_Line("");
      Put_Line("[3/4] Enforcing regulatory safety limits...");
      Status := Safety_Monitor.Enforce_Safety_Limits(Lightning_Risk);
   end if;

   -- Step 4: Generate regulatory alert
   Put_Line("");
   Put_Line("[4/4] Generating safety assessment...");
   Safety_Monitor.Generate_Safety_Alert(Lightning_Risk, Status, Current_Route);

   -- Log to audit trail
   Safety_Monitor.Log_Safety_Event(Lightning_Risk, Status, Current_Route, Validation_Passed);

   -- Output for Jakarta EE web layer
   declare
      Output_File : File_Type;
   begin
      Create(Output_File, Out_File, "safety_status.txt");
      Put_Line(Output_File, "SAFETY_STATUS:" & Safety_Status'Image(Status));
      Put(Output_File, "RISK_LEVEL:");
      Put(Output_File, Lightning_Risk, Fore => 1, Aft => 2);
      New_Line(Output_File);
      if Validation_Passed then
         Put_Line(Output_File, "VALIDATION:PASSED");
      else
         Put_Line(Output_File, "VALIDATION:FAILED");
      end if;

      -- Action recommendations
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
   Put_Line("===========================================================");
   Put_Line("Safety assessment complete. Status: " & Safety_Status'Image(Status));
   Put_Line("============================================================");

end main;
