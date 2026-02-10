package ARINC653_Core is
   -- ARINC 653 partition states (§3.2.1)
   type Partition_State is (COLD_START, WARM_START, NORMAL, HALT);

   -- Initialize partition with built-in tests
   procedure Initialize_Partition;

   -- Transition to operational mode
   procedure Set_Normal_Mode;

   -- Query current partition state
   function Get_State return Partition_State;

   -- Emergency fault handler
   procedure Emergency_Halt(Reason : String);

end ARINC653_Core;
