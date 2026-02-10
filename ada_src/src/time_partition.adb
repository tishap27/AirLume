with Ada.Text_IO; use Ada.Text_IO;
with Ada.Float_Text_IO; use Ada.Float_Text_IO;
with ARINC653_Core;

--If C physics engine hangs due to API timeoutor infinite loop, Ada time partition kills it after 100ms and forces
--emergency procedures instead of system freeze.
package body Time_Partition is

   function Start_Timer return Time is
   begin
      return Clock;
   end Start_Timer;

   procedure Check_Budget(Start : Time; Operation : String) is
      Now : Time := Clock;
      Elapsed : Time_Span := Now - Start;
      Elapsed_Ms : constant Float := Float(To_Duration(Elapsed)) * 1000.0;
   begin
      if Elapsed > MAX_EXECUTION_TIME then
         Put_Line("");

         Put_Line("TIME PARTITION VIOLATION");
         Put_Line("Operation: " & Operation);
         Put("Time Budget: 100.0ms | Actual: ");
         Put(Elapsed_Ms, Fore => 1, Aft => 1);
         Put_Line("ms");
         Put_Line("Impact: CPU starvation risk - halting partition");
         Put_Line("");

         ARINC653_Core.Emergency_Halt("Time partition budget exceeded");
      else
         Put("[Time Budget] " & Operation & ": ");
         Put(Elapsed_Ms, Fore => 1, Aft => 1);
         Put_Line("ms / 100.0ms");
      end if;
   end Check_Budget;

end Time_Partition;
