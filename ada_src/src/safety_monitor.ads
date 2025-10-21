with Safety_Types; use Safety_Types;

package Safety_Monitor is

   -- Enforce regulatory safety limits
   function Enforce_Safety_Limits(Risk : Float) return Safety_Status;

   -- Generate regulatory-compliant warning
   procedure Generate_Safety_Alert(
      Risk   : Float;
      Status : Safety_Status;
      Route  : Flight_Route
   );

   -- Create audit trail for regulators
   procedure Log_Safety_Event(
      Risk   : Float;
      Status : Safety_Status;
      Route  : Flight_Route;
      Validated : Boolean
   );

end Safety_Monitor;
