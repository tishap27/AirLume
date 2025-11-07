package Safety_Types is

   -- Safety status levels for flight operations
   type Safety_Status is (SAFE, CAUTION, DANGER, EMERGENCY);

   -- Flight route information
   type Flight_Route is record
      Origin      : String(1..4) := "    ";
      Destination : String(1..4) := "    ";
      Distance_Km : Float := 0.0;
   end record;

   -- Risk thresholds based on aviation lightning research:
   -- - Most aircraft struck 1-2x/year survive without critical damage
   -- - Strikes common at 5k-15k ft during climb/descent
   -- - Industry uses distance-based criteria (5nm from strikes)
   -- - Percentage thresholds calibrated to match historical strike conditions

   CAUTION_THRESHOLD   : constant Float := 25.0;   -- Monitor conditions
   DANGER_THRESHOLD    : constant Float := 45.0;   -- Reroute recommended
   EMERGENCY_THRESHOLD : constant Float := 65.0;   -- Immediate action required

   -- Validation tolerance for C/Ada comparison
   -- Set to 15% to account for floating-point rounding and model variations
   VALIDATION_TOLERANCE : constant Float := 15.0;

end Safety_Types;
