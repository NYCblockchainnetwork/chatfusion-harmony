
import React from "react";
import { Phone } from "lucide-react";
import { Input } from "@/components/ui/input";

interface PhoneNumberInputProps {
  phone: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled: boolean;
}

const PhoneNumberInput: React.FC<PhoneNumberInputProps> = ({ 
  phone, 
  onChange, 
  disabled 
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Phone className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Phone Number</span>
      </div>
      <Input
        type="tel"
        placeholder="+1234567890"
        value={phone}
        onChange={onChange}
        className="w-full"
        disabled={disabled}
      />
      <p className="text-xs text-muted-foreground">
        Enter your phone number including country code (e.g., +1 for US).
      </p>
    </div>
  );
};

export default PhoneNumberInput;
