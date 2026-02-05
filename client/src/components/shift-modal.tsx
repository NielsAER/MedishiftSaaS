import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { stripSeconds } from "@/lib/timeUtils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ShiftCode, Shift } from "@shared/types/schema";

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  selectedCell: {
    userId: string;
    date: string;
    existingShift?: Shift;
  } | null;
  shiftCodes: ShiftCode[];
  timesheetId?: string;
}

export default function ShiftModal({
  isOpen,
  onClose,
  onSave,
  selectedCell,
  shiftCodes,
  timesheetId,
}: ShiftModalProps) {
  const { toast } = useToast();

  const createShiftMutation = useMutation({
    mutationFn: async (shiftCodeId: string) => {
      if (!selectedCell || !timesheetId) return;
      
      const shiftCode = shiftCodes.find(code => code.id === shiftCodeId);
      
      return await apiRequest("POST", "/api/shifts", {
        timesheetId,
        userId: selectedCell.userId,
        shiftCodeId,
        date: selectedCell.date,
        startTime: stripSeconds(shiftCode?.startTime) || undefined,
        endTime: stripSeconds(shiftCode?.endTime) || undefined,
        hours: shiftCode?.hours,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Shift assigned successfully",
      });
      onSave();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to assign shift",
        variant: "destructive",
      });
    },
  });

  const updateShiftMutation = useMutation({
    mutationFn: async (shiftCodeId: string) => {
      if (!selectedCell?.existingShift) return;
      
      const shiftCode = shiftCodes.find(code => code.id === shiftCodeId);
      
      return await apiRequest("PUT", `/api/shifts/${selectedCell.existingShift.id}`, {
        shiftCodeId,
        startTime: stripSeconds(shiftCode?.startTime) || undefined,
        endTime: stripSeconds(shiftCode?.endTime) || undefined,
        hours: shiftCode?.hours,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Shift updated successfully",
      });
      onSave();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update shift",
        variant: "destructive",
      });
    },
  });

  const deleteShiftMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCell?.existingShift) return;
      
      return await apiRequest("DELETE", `/api/shifts/${selectedCell.existingShift.id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Shift removed successfully",
      });
      onSave();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to remove shift",
        variant: "destructive",
      });
    },
  });

  const handleShiftCodeSelect = (shiftCodeId: string) => {
    if (selectedCell?.existingShift) {
      updateShiftMutation.mutate(shiftCodeId);
    } else {
      createShiftMutation.mutate(shiftCodeId);
    }
  };

  const handleClearShift = () => {
    deleteShiftMutation.mutate();
  };

  if (!selectedCell) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Select Shift Code</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {shiftCodes.map((code) => (
            <div
              key={code.id}
              className="border border-input rounded-lg p-3 cursor-pointer hover:bg-accent transition-colors"
              onClick={() => handleShiftCodeSelect(code.id)}
              data-testid={`shift-option-${code.code}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">
                    {code.code} - {code.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {code.startTime && code.endTime 
                      ? `${stripSeconds(code.startTime)} - ${stripSeconds(code.endTime)} (${code.hours || 0} hours)`
                      : code.description || code.category.replace('_', ' ')}
                  </div>
                </div>
                <div 
                  className="w-4 h-4 rounded border-l-2"
                  style={{ 
                    backgroundColor: code.color,
                    borderLeftColor: code.borderColor,
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex space-x-3">
          {selectedCell.existingShift && (
            <Button
              variant="destructive"
              onClick={handleClearShift}
              disabled={deleteShiftMutation.isPending}
              data-testid="button-clear-shift"
            >
              {deleteShiftMutation.isPending ? "Removing..." : "Clear"}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            data-testid="button-cancel"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
