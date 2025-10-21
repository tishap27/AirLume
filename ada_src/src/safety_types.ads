-- Safety data types and constants
package Safety_Types is

   type Safety_Status is (SAFE, CAUTION, DANGER, EMERGENCY);

   type Flight_Route is record
      Origin      : String(1..4);
      Destination : String(1..4);
      Distance_Km : Float;
   end record;

   -- Regulatory thresholds (FAA/ICAO compliant)
   EMERGENCY_THRESHOLD : constant Float := 50.0;  -- %
   DANGER_THRESHOLD    : constant Float := 30.0;
   CAUTION_THRESHOLD   : constant Float := 15.0;

   -- System health constants
   MAX_DATA_AGE_SECONDS : constant Duration := 300.0;  -- 5 minutes
   VALIDATION_TOLERANCE : constant Float := 5.0;       -- 5% difference

end Safety_Types;
