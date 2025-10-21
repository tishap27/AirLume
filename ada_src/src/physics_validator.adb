with Ada.Text_IO; use Ada.Text_IO;
with Ada.Float_Text_IO; use Ada.Float_Text_IO;

package body Physics_Validator is

   function Calculate_Ada_Risk(
      Temperature : Float;
      Humidity    : Float;
      Pressure    : Float;
      Wind_Speed  : Float
   ) return Float is
      E_Field : Float := 120.0;  -- Fair weather baseline
      Field_Risk : Float;
   begin
      -- Humidity contribution
      if Humidity > 70.0 then
         E_Field := E_Field + (Humidity - 70.0) * 25.0;
      end if;

      -- Pressure contribution
      if Pressure < 1000.0 then
         E_Field := E_Field + (1013.25 - Pressure) * 40.0;
      end if;

      -- Temperature contribution
      if Temperature > 20.0 then
         E_Field := E_Field + (Temperature - 20.0) * 15.0;
      end if;

      -- Wind contribution
      if Wind_Speed > 5.0 then
         E_Field := E_Field + (Wind_Speed - 5.0) * 40.0;
      end if;

      -- Convert E-field to risk percentage
      if E_Field < 400.0 then
         Field_Risk := 10.0;
      elsif E_Field < 700.0 then
         Field_Risk := 35.0;
      elsif E_Field < 1000.0 then
         Field_Risk := 50.0;
      elsif E_Field < 1500.0 then
         Field_Risk := 65.0;
      else
         Field_Risk := 80.0;
      end if;

      return Field_Risk;
   end Calculate_Ada_Risk;

   function Validate_Calculation(
      Temperature : Float;
      Humidity    : Float;
      Pressure    : Float;
      Wind_Speed  : Float;
      C_Risk      : Float
   ) return Boolean is
      Ada_Risk : Float;
      Difference : Float;
   begin
      Ada_Risk := Calculate_Ada_Risk(Temperature, Humidity, Pressure, Wind_Speed);
      Difference := abs(Ada_Risk - C_Risk);

      Put("Ada validation: C=");
      Put(C_Risk, Fore => 1, Aft => 2);
      Put("%, Ada=");
      Put(Ada_Risk, Fore => 1, Aft => 2);
      Put("%");

      if Difference > VALIDATION_TOLERANCE then
         Put_Line(" -> MISMATCH");
         Put_Line("*** SAFETY ALERT: Physics validation failed ***");
         return False;
      else
         Put_Line(" -> VALIDATED");
         return True;
      end if;
   end Validate_Calculation;

end Physics_Validator;
