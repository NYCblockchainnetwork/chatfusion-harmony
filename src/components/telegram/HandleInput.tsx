
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

interface HandleInputProps {
  onAddHandle: (handle: string) => void;
}

const HandleInput: React.FC<HandleInputProps> = ({ onAddHandle }) => {
  const [handleInput, setHandleInput] = useState('');

  const handleSubmit = () => {
    if (!handleInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid Telegram handle",
        variant: "destructive"
      });
      return;
    }
    
    const cleanHandle = handleInput.trim().startsWith('@') 
      ? handleInput.trim().substring(1) 
      : handleInput.trim();
    
    onAddHandle(cleanHandle);
    setHandleInput('');
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="handle-input">Add Telegram Handle</Label>
      <div className="flex gap-2">
        <Input 
          id="handle-input" 
          placeholder="Enter a Telegram handle (e.g. @username)" 
          value={handleInput}
          onChange={(e) => setHandleInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        <Button onClick={handleSubmit}>Add</Button>
      </div>
    </div>
  );
};

export default HandleInput;
