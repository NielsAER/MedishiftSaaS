import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, addDays, eachDayOfInterval, endOfWeek } from "date-fns";
import ShiftModal from "@/components/shift-modal";
import type { User, ShiftCode, Timesheet, Shift } from "@shared/schema";

interface TimesheetGridProps {
  timesheet?: Timesheet;
  staff: User[];
  shifts: Shift[];
  shiftCodes: ShiftCode[];
  currentWeek: Date;
  selectedTeam: string;
  selectedFacility: string;
}

export default function TimesheetGrid({
  timesheet,
  staff,
  shifts,
  shiftCodes,
  currentWeek,
  selectedTeam,
  selectedFacility,
}: TimesheetGridProps) {
  const { toast } = useToast();
  const [selectedCell, setSelectedCell] = useState<{
    userId: string;
    date: string;
    existingShift?: Shift;
  } | null>(null);

  // Generate week days
  const weekDays = eachDayOfInterval({
    start: currentWeek,
    end: endOfWeek(currentWeek, { weekStartsOn: 1 }),
  });

  // Create timesheet if it doesn't exist
  const createTimesheetMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/timesheets", {
        weekStartDate: format(currentWeek, "yyyy-MM-dd"),
        teamId: selectedTeam,
        facilityId: selectedFacility,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
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
        description: "Failed to create timesheet",
        variant: "destructive",
      });
    },
  });

  // Auto-create timesheet if needed
  useEffect(() => {
    if (!timesheet && selectedTeam && selectedFacility && staff.length > 0) {
      createTimesheetMutation.mutate();
    }
  }, [timesheet, selectedTeam, selectedFacility, staff.length]);

  const getShiftForCell = (userId: string, date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return shifts.find(shift => 
      shift.userId === userId && 
      shift.date === dateStr
    );
  };

  const getShiftCodeById = (shiftCodeId: string) => {
    return shiftCodes.find(code => code.id === shiftCodeId);
  };

  const handleCellClick = (userId: string, date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const existingShift = getShiftForCell(userId, date);
    
    setSelectedCell({
      userId,
      date: dateStr,
      existingShift,
    });
  };

  const handleShiftUpdate = () => {
    // Refresh data after shift update
    if (timesheet?.id) {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts", timesheet.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats", timesheet.id] });
    }
    setSelectedCell(null);
  };

  if (!selectedTeam) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-calendar-alt text-muted-foreground text-2xl"></i>
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">Select a Team</h3>
          <p className="text-muted-foreground">
            Choose a team from the sidebar to view and manage timesheets.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (staff.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-users text-muted-foreground text-2xl"></i>
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">No Staff Members</h3>
          <p className="text-muted-foreground">
            This team doesn't have any staff members assigned yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Weekly Schedule Grid</CardTitle>
            <div className="flex items-center space-x-4 text-xs">
              {/* Shift Code Legend */}
              {shiftCodes.slice(0, 4).map((code) => (
                <div key={code.id} className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded border-l-2"
                    style={{ 
                      backgroundColor: code.color,
                      borderLeftColor: code.borderColor,
                    }}
                  ></div>
                  <span>{code.code} - {code.name}</span>
                </div>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Timesheet Table */}
          <div className="grid grid-cols-8 gap-1 bg-gray-200">
            {/* Header Row */}
            <div className="bg-gray-50 font-semibold p-3 border border-gray-300">
              Staff Member
            </div>
            {weekDays.map((day, index) => (
              <div key={index} className="bg-gray-50 font-semibold p-3 border border-gray-300 text-center">
                {format(day, "EEE d")}
              </div>
            ))}

            {/* Staff Rows */}
            {staff.map((member) => (
              <div key={member.id} className="contents">
                <div className="bg-gray-100 font-medium p-3 border border-gray-300 sticky left-0 z-10">
                  {member.firstName && member.lastName 
                    ? `${member.firstName} ${member.lastName}`
                    : member.email}
                </div>
                {weekDays.map((day, dayIndex) => {
                  const shift = getShiftForCell(member.id, day);
                  const shiftCode = shift ? getShiftCodeById(shift.shiftCodeId) : null;
                  
                  return (
                    <div
                      key={dayIndex}
                      className="bg-white border border-gray-300 min-h-[60px] p-1 flex flex-col justify-center cursor-pointer hover:shadow-md transition-shadow"
                      style={shiftCode ? {
                        backgroundColor: shiftCode.color,
                        borderLeftWidth: '4px',
                        borderLeftColor: shiftCode.borderColor,
                      } : {}}
                      onClick={() => handleCellClick(member.id, day)}
                      data-testid={`cell-${member.id}-${format(day, "yyyy-MM-dd")}`}
                    >
                      {shiftCode ? (
                        <>
                          <div className="text-xs font-medium">{shiftCode.code}</div>
                          <div className="text-xs text-gray-600">
                            {shiftCode.startTime && shiftCode.endTime 
                              ? `${shiftCode.startTime}-${shiftCode.endTime}`
                              : shiftCode.name}
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-gray-400">Click to assign</div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Summary Section */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">Weekly Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Total Scheduled Hours:</span>
                  <span className="font-medium" data-testid="summary-total-hours">
                    {shifts.reduce((sum, shift) => sum + (shift.hours || 0), 0)}h
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Staff Members:</span>
                  <span className="font-medium" data-testid="summary-staff-count">
                    {staff.length}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">Shift Distribution</h4>
              <div className="space-y-1 text-sm">
                {shiftCodes.slice(0, 3).map((code) => {
                  const count = shifts.filter(shift => shift.shiftCodeId === code.id).length;
                  return (
                    <div key={code.id} className="flex justify-between">
                      <span>{code.name}:</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">Status</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm text-green-600">
                  <i className="fas fa-check-circle text-xs"></i>
                  <span>Schedule created</span>
                </div>
                {shifts.length === 0 && (
                  <div className="flex items-center space-x-2 text-sm text-orange-600">
                    <i className="fas fa-exclamation-triangle text-xs"></i>
                    <span>No shifts assigned</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ShiftModal
        isOpen={!!selectedCell}
        onClose={() => setSelectedCell(null)}
        onSave={handleShiftUpdate}
        selectedCell={selectedCell}
        shiftCodes={shiftCodes}
        timesheetId={timesheet?.id}
      />
    </>
  );
}
