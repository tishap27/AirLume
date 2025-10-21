with Ada.Text_IO; use Ada.Text_IO;
with Ada.Float_Text_IO; use Ada.Float_Text_IO;
with Ada.Calendar; use Ada.Calendar;
with Ada.Calendar.Formatting;

package body Safety_Monitor is

   function Enforce_Safety_Limits(Risk : Float) return Safety_Status is
   begin
      if Risk >= EMERGENCY_THRESHOLD then
         Put_Line("*** EMERGENCY: IMMEDIATE LANDING REQUIRED ***");
         return EMERGENCY;
      elsif Risk >= DANGER_THRESHOLD then
         Put_Line("*** DANGER: IMMEDIATE REROUTE MANDATORY ***");
         return DANGER;
      elsif Risk >= CAUTION_THRESHOLD then
         Put_Line("*** CAUTION: Enhanced monitoring required ***");
         return CAUTION;
      else
         Put_Line("Status: SAFE - Normal operations authorized");
         return SAFE;
      end if;
   end Enforce_Safety_Limits;

   procedure Generate_Safety_Alert(
      Risk   : Float;
      Status : Safety_Status;
      Route  : Flight_Route
   ) is
   begin
      Put_Line("");
      Put_Line("============================================================");
      Put_Line("=        AIRLUME SAFETY ALERT - REGULATORY NOTICE          =");
      Put_Line("============================================================");
      Put_Line("");
      Put("Route: ");
      Put(Route.Origin);
      Put(" -> ");
      Put_Line(Route.Destination);
      Put("Lightning Risk: ");
      Put(Risk, Fore => 1, Aft => 2);
      Put_Line("%");
      Put("Safety Status: ");
      Put_Line(Safety_Status'Image(Status));
      Put_Line("");

      case Status is
         when EMERGENCY =>
            Put_Line("MANDATORY ACTION: LAND IMMEDIATELY");
            Put_Line("Authority: FAA 14 CFR Part 91.3 (Emergency Authority)");
            Put_Line("ATC Notification: REQUIRED IMMEDIATELY");
            Put_Line("Pilot Declaration: Emergency declared");

         when DANGER =>
            Put_Line("MANDATORY ACTION: Immediate route deviation");
            Put_Line("Pilot must request alternate routing from ATC");
            Put_Line("Maintain FL300+ if possible to avoid storm layer");

         when CAUTION =>
            Put_Line("ADVISORY: Enhanced weather monitoring required");
            Put_Line("Pilot should maintain visual/radar contact");
            Put_Line("Consider altitude change to FL300+");

         when SAFE =>
            Put_Line("No action required - proceed with flight plan");
      end case;

      Put_Line("");
      Put_Line("=====================================================");
   end Generate_Safety_Alert;

   procedure Log_Safety_Event(
      Risk   : Float;
      Status : Safety_Status;
      Route  : Flight_Route;
      Validated : Boolean
   ) is
      Log_File : File_Type;
      Now : Time := Clock;
   begin
      -- Create audit trail (required for aviation safety)
      Create(Log_File, Append_File, "safety_audit.log");

      Put_Line(Log_File, "=== AIRLUME SAFETY EVENT ===");
      Put(Log_File, "Timestamp: ");
      Put_Line(Log_File, Ada.Calendar.Formatting.Image(Now));
      Put(Log_File, "Route: ");
      Put(Log_File, Route.Origin);
      Put(Log_File, " -> ");
      Put_Line(Log_File, Route.Destination);
      Put(Log_File, "Lightning Risk: ");
      Put(Log_File, Risk, Fore => 1, Aft => 2);
      Put_Line(Log_File, "%");
      Put(Log_File, "Safety Status: ");
      Put_Line(Log_File, Safety_Status'Image(Status));
      Put(Log_File, "Validation: ");
      if Validated then
         Put_Line(Log_File, "PASSED");
      else
         Put_Line(Log_File, "FAILED - C calculation rejected");
      end if;
      Put_Line(Log_File, "Certified by: AirLume Safety System v1.0");
      Put_Line(Log_File, "---");

      Close(Log_File);
      Put_Line("Safety event logged");
   end Log_Safety_Event;

end Safety_Monitor;
