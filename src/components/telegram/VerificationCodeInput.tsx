
import React from "react";
import { Key } from "lucide-react";
import { Input } from "@/components/ui/input";

interface VerificationCodeInputProps {
  code: string;
  phone: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled: boolean;
}

const VerificationCodeInput: React.FC<VerificationCodeInputProps> = ({ 
  code, 
  phone, 
  onChange, 
  disabled 
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Key className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Verification Code</span>
      </div>
      <Input
        type="text"
        placeholder="12345"
        value={code}
        onChange={onChange}
        className="w-full"
        disabled={disabled}
        maxLength={7}
      />
      <p className="text-xs text-muted-foreground">
        Enter the verification code sent to {phone}
      </p>
    </div>
  );
};

export default VerificationCodeInput;
