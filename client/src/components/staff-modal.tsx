import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import type { User, Facility } from "@shared/types/schema";

interface StaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff?: User;
  facilities?: Facility[];
  selectedFacility?: string;
}

export default function StaffModal({ isOpen, onClose, staff, facilities, selectedFacility }: StaffModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "staff" as "admin" | "manager" | "staff",
    facilityId: selectedFacility || "",
    // Optional shift configuration - use "none" instead of empty string
    shiftPercentage: "" as string,
    shiftPattern: "none" as "none" | "odd" | "even",
    shiftType: "none" as "none" | "morning" | "evening" | "night",
  });

  useEffect(() => {
    if (staff) {
      setFormData({
        email: staff.email || "",
        firstName: staff.firstName || "",
        lastName: staff.lastName || "",
        role: staff.role,
        facilityId: staff.facilityId || selectedFacility || "",
        shiftPercentage: staff.shiftPercentage?.toString() || "",
        shiftPattern: staff.shiftPattern || "none",
        shiftType: staff.shiftType || "none",
      });
    } else if (selectedFacility) {
      setFormData(prev => ({ ...prev, facilityId: selectedFacility }));
    }
  }, [staff, selectedFacility]);

  const createMutation = useMutation({
    mutationFn: async () => {
      // Convert form data to API format
      const apiData = {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
        facilityId: formData.facilityId,
        // Only include shift config if values are provided (convert "none" to null)
        shiftPercentage: formData.shiftPercentage ? parseInt(formData.shiftPercentage) : null,
        shiftPattern: formData.shiftPattern === "none" ? null : formData.shiftPattern,
        shiftType: formData.shiftType === "none" ? null : formData.shiftType,
      };
      
      const response = await apiRequest("POST", "/api/users", apiData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Staff Added",
        description: "New staff member has been added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      onClose();
      setFormData({
        email: "",
        firstName: "",
        lastName: "",
        role: "staff",
        facilityId: selectedFacility || "",
        shiftPercentage: "",
        shiftPattern: "none",
        shiftType: "none",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add staff member",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!staff) return;
      
      // Convert form data to API format
      const apiData = {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
        facilityId: formData.facilityId,
        // Only include shift config if values are provided (convert "none" to null)
        shiftPercentage: formData.shiftPercentage ? parseInt(formData.shiftPercentage) : null,
        shiftPattern: formData.shiftPattern === "none" ? null : formData.shiftPattern,
        shiftType: formData.shiftType === "none" ? null : formData.shiftType,
      };
      
      const response = await apiRequest("PUT", `/api/users/${staff.id}`, apiData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Staff Updated",
        description: "Staff member has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update staff member",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.firstName || !formData.lastName || !formData.facilityId) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate shift percentage if provided
    if (formData.shiftPercentage) {
      const percentage = parseInt(formData.shiftPercentage);
      if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        toast({
          title: "Validation Error",
          description: "Shift percentage must be between 0 and 100",
          variant: "destructive",
        });
        return;
      }
    }

    if (staff) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" data-testid="staff-modal">
        <DialogHeader>
          <DialogTitle>{staff ? "Edit Staff Member" : "Add New Staff Member"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Basic Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="staff@example.com"
                required
                data-testid="input-staff-email"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="John"
                  required
                  data-testid="input-staff-first-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Doe"
                  required
                  data-testid="input-staff-last-name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select value={formData.role} onValueChange={(value: any) => setFormData({ ...formData, role: value })}>
                <SelectTrigger data-testid="select-staff-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="facility">Facility *</Label>
              <Select value={formData.facilityId} onValueChange={(value) => setFormData({ ...formData, facilityId: value })}>
                <SelectTrigger data-testid="select-staff-facility">
                  <SelectValue placeholder="Select facility" />
                </SelectTrigger>
                <SelectContent>
                  {facilities?.map((facility) => (
                    <SelectItem key={facility.id} value={facility.id}>
                      {facility.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Shift Configuration (Optional) */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700">Shift Configuration</h3>
              <p className="text-xs text-gray-500 mt-1">Optional: Configure staff member's shift preferences</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shiftPercentage">
                Work Percentage
                <span className="text-xs text-gray-500 ml-2">(Optional)</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="shiftPercentage"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.shiftPercentage}
                  onChange={(e) => setFormData({ ...formData, shiftPercentage: e.target.value })}
                  placeholder="e.g., 50, 80, 100"
                  data-testid="input-shift-percentage"
                  className="flex-1"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
              <p className="text-xs text-gray-500">
                Indicates if staff works part-time (e.g., 50%) or full-time (100%)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shiftPattern">
                Weekend
                <span className="text-xs text-gray-500 ml-2">(Optional)</span>
              </Label>
              <Select 
                value={formData.shiftPattern} 
                onValueChange={(value: any) => setFormData({ ...formData, shiftPattern: value })}
              >
                <SelectTrigger data-testid="select-shift-pattern">
                  <SelectValue placeholder="Select work pattern (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No preference</SelectItem>
                  <SelectItem value="odd">Odd Weekends </SelectItem>
                  <SelectItem value="even">Even Weekends </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Useful for alternating work schedules
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shiftType">
                Preferred Shift Type
                <span className="text-xs text-gray-500 ml-2">(Optional)</span>
              </Label>
              <Select 
                value={formData.shiftType} 
                onValueChange={(value: any) => setFormData({ ...formData, shiftType: value })}
              >
                <SelectTrigger data-testid="select-shift-type">
                  <SelectValue placeholder="Select shift type (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No preference</SelectItem>
                  <SelectItem value="morning">Morning shift </SelectItem>
                  <SelectItem value="evening">Evening shift </SelectItem>
                  <SelectItem value="night">Night shift </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Indicates staff member's preferred working hours
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex justify-end space-x-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-cancel-staff"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-staff"
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Saving...
                </>
              ) : (
                staff ? "Update Staff" : "Add Staff"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}