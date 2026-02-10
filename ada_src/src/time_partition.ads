with Ada.Real_Time; use Ada.Real_Time;

package Time_Partition is
   -- ARINC 653 §6: Time partitioning window
   -- 100ms budget ensures deterministic real-time behavior
   MAX_EXECUTION_TIME : constant Time_Span := Milliseconds(100);

   -- Start timing measurement for partition window
   function Start_Timer return Time;

   -- Verify execution completed within time budget
   -- Raises fault if budget exceeded (prevents CPU starvation)
   procedure Check_Budget(Start : Time; Operation : String);

end Time_Partition;
