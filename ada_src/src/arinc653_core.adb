with Ada.Text_IO; use Ada.Text_IO;

package body ARINC653_Core is
   Current_State : Partition_State := COLD_START;

   procedure Initialize_Partition is
   begin

      Put_Line(" ARINC 653 PARTITION INITIALIZATION  ");
      Put_Line("[ARINC 653] State: COLD_START");
      Put_Line("[ARINC 653] Running Built-In Tests (BIT)...");

      -- Simulate built-in test execution
      delay 0.05;

      Current_State := WARM_START;
      Put_Line("[ARINC 653] BIT PASSED = State: WARM_START");
   end Initialize_Partition;

   procedure Set_Normal_Mode is
   begin
      if Current_State = WARM_START then
         Current_State := NORMAL;
         Put_Line("[ARINC 653]Partition entered NORMAL mode");
         Put_Line("[ARINC 653]Safety-critical operations AUTHORIZED");
      else
         Emergency_Halt("Invalid state transition attempted");
      end if;
   end Set_Normal_Mode;

   function Get_State return Partition_State is
   begin
      return Current_State;
   end Get_State;

   procedure Emergency_Halt(Reason : String) is
   begin
      Put_Line("");

      Put_Line("ARINC 653 EMERGENCY HALT");

      Put_Line("Reason: " & Reason);
      Current_State := HALT;
      Put_Line("Partition State: HALT");
      Put_Line("Action Required: Manual system reset");
      Put_Line("");
      raise Program_Error with "ARINC 653 fault containment activated";
   end Emergency_Halt;

end ARINC653_Core;
