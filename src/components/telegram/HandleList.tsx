
import React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, User } from "lucide-react";

interface HandleListProps {
  handles: string[];
  onRemoveHandle: (handle: string) => void;
  onFetchMessages: () => void;
  isLoading: boolean;
}

const HandleList: React.FC<HandleListProps> = ({ 
  handles, 
  onRemoveHandle, 
  onFetchMessages,
  isLoading 
}) => {
  if (handles.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Label>Selected Handles</Label>
      <div className="flex flex-wrap gap-2">
        {handles.map((handle) => (
          <div 
            key={handle}
            className="flex items-center gap-1 bg-secondary text-secondary-foreground px-3 py-1 rounded-full"
          >
            <User className="h-4 w-4" />
            <span>@{handle}</span>
            <button
              className="ml-1 text-secondary-foreground/70 hover:text-secondary-foreground"
              onClick={() => onRemoveHandle(handle)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      
      <Button 
        className="mt-2"
        onClick={onFetchMessages}
        disabled={isLoading}
      >
        {isLoading ? "Loading..." : "Fetch Messages"}
        <Search className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
};

export default HandleList;
