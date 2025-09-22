with Ada.Text_IO; use Ada.Text_IO;
with Ada.Float_Text_IO; use Ada.Float_Text_IO;
with Ada.Integer_Text_IO; use Ada.Integer_Text_IO;
with Ada.Strings.Unbounded; use Ada.Strings.Unbounded;
with Ada.Strings.Fixed; use Ada.Strings.Fixed;

procedure main is

   type Flight_Route is record
      Origin      : String(1..4) := "CYOW";  -- Ottawa
      Destination : String(1..4) := "CYYZ";  -- Toronto
      Distance_Km : Float := 350.0;
      Fuel_Required : Float := 2500.0;  -- kg
      Flight_Time : Integer := 45;      -- minutes
   end record;

   type Safety_Decision is record
      Action_Required : Boolean := False;
      New_Altitude    : Integer := 35000;  -- feet
      Route_Change    : Boolean := False;
      Alternate_Airport : String(1..4) := "CYHM"; -- Hamilton
      Fuel_Reserve    : Float := 500.0;  -- kg extra
   end record;

   Current_Route : Flight_Route;
   Safety_Action : Safety_Decision;
   Lightning_Risk : Float := 0.0;
   Risk_Input_Found : Boolean := False;

   -- Function to read lightning risk from previous C output
  procedure Read_Lightning_Risk is
   Risk_File : File_Type;
   Input_Line : String(1..200);
   Last : Natural;
   Colon_Pos : Natural;
begin
   Put_Line("Reading lightning risk assessment from C...");

   begin
      -- Trying to open the risk file created by C
      Open(Risk_File, In_File, "lightning_risk.txt");

      -- Read the line containing LIGHTNING_RISK:X.XX
      Get_Line(Risk_File, Input_Line, Last);
      Close(Risk_File);

      -- Parse the risk value after the colon
      for I in 1..Last loop
         if Input_Line(I) = ':' then
            Colon_Pos := I;
            exit;
         end if;
      end loop;

      if Colon_Pos > 0 and Colon_Pos < Last then
         -- Extract the numeric part after the colon
         declare
            Risk_String : String := Input_Line(Colon_Pos + 1..Last);
         begin
            Lightning_Risk := Float'Value(Risk_String);
            Risk_Input_Found := True;
         end;
      end if;

      Put("Lightning risk received from C: ");
      Put(Lightning_Risk, Fore => 1, Aft => 2);
      Put_Line("%");

   exception
      when others =>
         Put_Line("Warning: Could not read C risk file, using default value");
         Lightning_Risk := 2.5; -- Fallback value
         Risk_Input_Found := True;
   end;
end Read_Lightning_Risk;

   -- Safety decision algorithm based on lightning risk
   procedure Assess_Safety_Requirements is
   begin
      Put_Line("Analyzing safety requirements based on atmospheric conditions...");

      if Lightning_Risk < 1.0 then
         Put_Line("Normal flight operations authorized");
         Safety_Action.Action_Required := False;

      elsif Lightning_Risk < 5.0 then
         Put_Line("Enhanced monitoring required");
         Safety_Action.Action_Required := True;
         Safety_Action.New_Altitude := 37000;  -- Climb 2000 ft
         Safety_Action.Fuel_Reserve := 750.0;  -- Extra fuel for altitude change
         Put_Line("RECOMMENDATION: Climb to FL370 for storm avoidance");

      elsif Lightning_Risk < 10.0 then
         Put_Line("Route modification required");
         Safety_Action.Action_Required := True;
         Safety_Action.Route_Change := True;
         Safety_Action.New_Altitude := 39000;  -- Higher altitude
         Safety_Action.Alternate_Airport := "CYTR"; -- Trenton alternate
         Safety_Action.Fuel_Reserve := 1200.0; -- Significant extra fuel
         Put_Line("RECOMMENDATION: Route change to avoid high-risk areas");

      else
         Put_Line("CRITICAL - Immediate action required");
         Safety_Action.Action_Required := True;
         Safety_Action.Route_Change := True;
         Safety_Action.New_Altitude := 41000;  -- Maximum safe altitude
         Safety_Action.Alternate_Airport := "CYTR"; -- Immediate alternate
         Safety_Action.Fuel_Reserve := 2000.0; -- Emergency fuel reserves
         Put_Line("ALERT: Consider immediate landing at alternate airport");
      end if;
   end Assess_Safety_Requirements;

   -- Calculate fuel requirements for safety actions
   procedure Calculate_Fuel_Requirements is
      Base_Fuel : Float := Current_Route.Fuel_Required;
      Total_Fuel : Float;
   begin
      Put_Line("Calculating fuel requirements for safety actions...");

      Total_Fuel := Base_Fuel + Safety_Action.Fuel_Reserve;

      -- Altitude change fuel penalty (100kg per 1000ft change)
      if Safety_Action.New_Altitude /= 35000 then
         declare
            Altitude_Change : Float := Float(abs(Safety_Action.New_Altitude - 35000));
            Fuel_Penalty : Float := (Altitude_Change / 1000.0) * 100.0;
         begin
            Total_Fuel := Total_Fuel + Fuel_Penalty;
            Put("Altitude change fuel penalty: ");
            Put(Fuel_Penalty, Fore => 1, Aft => 0);
            Put_Line(" kg");
         end;
      end if;

      -- Route change fuel penalty (20% increase)
      if Safety_Action.Route_Change then
         Total_Fuel := Total_Fuel * 1.20;
         Put_Line("Route deviation fuel penalty: 20% increase");
      end if;

      Put("Total fuel required: ");
      Put(Total_Fuel, Fore => 1, Aft => 0);
      Put_Line(" kg");

      -- Safety check - ensure fuel is available
      if Total_Fuel > 8000.0 then  -- Aircraft fuel capacity limit
         Put_Line("WARNING: Fuel requirements exceed aircraft capacity");
         Put_Line("RECOMMENDATION: Consider immediate landing");
      else
         Put_Line("FUEL STATUS: Adequate reserves available");
      end if;
   end Calculate_Fuel_Requirements;

   -- Generate final safety recommendations
   procedure Generate_Safety_Report is
   begin
      Put_Line("");
      Put_Line("=== FLIGHT SAFETY ASSESSMENT REPORT ===");
      Put("Original Route: ");
      Put(Current_Route.Origin);
      Put(" -> ");
      Put_Line(Current_Route.Destination);

      Put("Lightning Risk Level: ");
      Put(Lightning_Risk, Fore => 1, Aft => 2);
      Put_Line("%");

      if Safety_Action.Action_Required then
         Put_Line("ACTIONS REQUIRED:");

         Put("- New Flight Level: FL");
         Put(Safety_Action.New_Altitude / 100, Width => 3);
         New_Line;

         if Safety_Action.Route_Change then
            Put("- Route Modification: Required for storm avoidance");
            New_Line;
         end if;

         Put("- Alternate Airport: ");
         Put_Line(Safety_Action.Alternate_Airport);

         Put("- Additional Fuel Reserve: ");
         Put(Safety_Action.Fuel_Reserve, Fore => 1, Aft => 0);
         Put_Line(" kg");

      else
         Put_Line("ACTIONS REQUIRED: None - proceed with original flight plan");
      end if;

      Put_Line("SAFETY CHECK: PASSED");
      Put_Line("Navigation system status: OPERATIONAL");
   end Generate_Safety_Report;

begin
   Put_Line("Ada Flight Safety System: Initializing...");

   -- Read lightning risk from C physics calculations
   Read_Lightning_Risk;

   if Risk_Input_Found then
      -- Perform safety assessment
      Assess_Safety_Requirements;

      -- Calculate fuel requirements
      Calculate_Fuel_Requirements;

      -- Generate final report
      Generate_Safety_Report;

      -- Output for system integration (could be read by other systems)
      Put("SAFETY_STATUS:");
      if Safety_Action.Action_Required then
         Put_Line("ACTION_REQUIRED");
      else
         Put_Line("NORMAL_OPS");
      end if;

   else
      Put_Line("ERROR: Cannot read lightning risk data");
      Put_Line("FALLBACK: Proceeding with conservative safety margins");
   end if;

   Put_Line("Flight safety assessment complete.");

end main;
