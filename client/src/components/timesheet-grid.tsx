import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, addDays, eachDayOfInterval, endOfWeek } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ShiftModal from "@/components/shift-modal";
import { stripSeconds } from "@/lib/timeUtils";
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
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Generate week days
  const weekDays = eachDayOfInterval({
    start: currentWeek,
    end: endOfWeek(currentWeek, { weekStartsOn: 1 }),
  });

  // Auto-select first day for mobile
  useEffect(() => {
    if (!selectedDay && weekDays.length > 0) {
      setSelectedDay(weekDays[0]);
    }
  }, [weekDays]);

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
      <Card className="border-blue-100 shadow-sm">
        <CardContent className="py-12 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-calendar-alt text-blue-600 text-2xl"></i>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Team</h3>
          <p className="text-sm text-gray-500">
            Choose a team to view and manage timesheets.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (staff.length === 0) {
    return (
      <Card className="border-blue-100 shadow-sm">
        <CardContent className="py-12 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-users text-blue-600 text-2xl"></i>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Staff Members</h3>
          <p className="text-sm text-gray-500">
            This team doesn't have any staff members assigned yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Mobile Card View Component
  const MobileCardView = () => (
    <div className="space-y-4">
      {/* Day Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {weekDays.map((day) => {
          const isSelected = selectedDay && format(day, "yyyy-MM-dd") === format(selectedDay, "yyyy-MM-dd");
          const dayShifts = shifts.filter(shift => shift.date === format(day, "yyyy-MM-dd"));
          
          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDay(day)}
              className={`flex-shrink-0 px-4 py-3 rounded-lg border-2 transition-all ${
                isSelected 
                  ? 'border-blue-500 bg-blue-50 shadow-md' 
                  : 'border-gray-200 bg-white hover:border-blue-300'
              }`}
            >
              <div className="text-center">
                <div className={`text-xs font-medium ${isSelected ? 'text-blue-600' : 'text-gray-500'}`}>
                  {format(day, "EEE")}
                </div>
                <div className={`text-lg font-bold ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                  {format(day, "d")}
                </div>
                {dayShifts.length > 0 && (
                  <div className="mt-1 w-2 h-2 bg-blue-500 rounded-full mx-auto"></div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Staff Cards for Selected Day */}
      {selectedDay && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {format(selectedDay, "EEEE, MMMM d")}
            </h3>
            <span className="text-sm text-gray-500">
              {staff.length} staff
            </span>
          </div>

          {staff.map((member) => {
            const shift = getShiftForCell(member.id, selectedDay);
            const shiftCode = shift ? getShiftCodeById(shift.shiftCodeId) : null;
            
            return (
              <div
                key={member.id}
                onClick={() => handleCellClick(member.id, selectedDay)}
                className="bg-white rounded-lg border-2 border-gray-200 hover:border-blue-400 transition-all cursor-pointer overflow-hidden"
              >
                <div className="flex items-center p-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                    {member.firstName && member.lastName 
                      ? `${member.firstName[0]}${member.lastName[0]}`
                      : member.email?.substring(0, 2).toUpperCase()}
                  </div>

                  {/* Name */}
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {member.firstName && member.lastName 
                        ? `${member.firstName} ${member.lastName}`
                        : member.email}
                    </div>
                    <div className="text-sm text-gray-500">
                      {shift ? 'Assigned' : 'No shift'}
                    </div>
                  </div>

                  {/* Shift Info */}
                  <div className="ml-3 flex-shrink-0">
                    {shiftCode ? (
                      <div 
                        className="px-3 py-2 rounded-lg border-l-4"
                        style={{
                          backgroundColor: shiftCode.color,
                          borderLeftColor: shiftCode.borderColor,
                        }}
                      >
                        <div className="text-sm font-bold text-gray-900">
                          {shiftCode.code}
                        </div>
                        <div className="text-xs text-gray-600">
                          {shiftCode.startTime && shiftCode.endTime 
                            ? `${stripSeconds(shiftCode.startTime)}-${stripSeconds(shiftCode.endTime)}`
                            : shiftCode.name}
                        </div>
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors">
                        <i className="fas fa-plus"></i>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // Desktop Table View Component
  const DesktopTableView = () => (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-blue-600 to-indigo-600">
            <tr>
              <th className="sticky left-0 z-20 bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-left text-sm font-semibold text-white shadow-sm">
                Staff Member
              </th>
              {weekDays.map((day, index) => (
                <th 
                  key={index} 
                  className="px-4 py-3 text-center text-sm font-semibold text-white whitespace-nowrap"
                >
                  <div className="flex flex-col">
                    <span>{format(day, "EEEE")}</span>
                    <span className="text-xs font-normal opacity-90">{format(day, "MMM d")}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {staff.map((member, staffIndex) => (
              <tr 
                key={member.id}
                className={staffIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
              >
                <td className="sticky left-0 z-10 bg-gradient-to-r from-gray-50 to-white px-4 py-3 text-sm font-medium text-gray-900 shadow-sm whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                      {member.firstName && member.lastName 
                        ? `${member.firstName[0]}${member.lastName[0]}`
                        : member.email?.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="truncate">
                      {member.firstName && member.lastName 
                        ? `${member.firstName} ${member.lastName}`
                        : member.email}
                    </span>
                  </div>
                </td>
                {weekDays.map((day, dayIndex) => {
                  const shift = getShiftForCell(member.id, day);
                  const shiftCode = shift ? getShiftCodeById(shift.shiftCodeId) : null;
                  
                  return (
                    <td
                      key={dayIndex}
                      className="relative px-3 py-2 text-center cursor-pointer hover:ring-2 hover:ring-blue-400 hover:ring-inset transition-all group"
                      style={shiftCode ? {
                        backgroundColor: shiftCode.color,
                      } : {}}
                      onClick={() => handleCellClick(member.id, day)}
                      data-testid={`cell-${member.id}-${format(day, "yyyy-MM-dd")}`}
                    >
                      <div 
                        className="min-h-[70px] flex flex-col justify-center items-center p-2 rounded-md transition-all"
                        style={shiftCode ? {
                          borderLeft: `4px solid ${shiftCode.borderColor}`,
                        } : {}}
                      >
                        {shiftCode ? (
                          <div className="space-y-1">
                            <div className="text-base font-bold text-gray-900">
                              {shiftCode.code}
                            </div>
                            <div className="text-xs text-gray-600 font-medium">
                              {shiftCode.startTime && shiftCode.endTime 
                                ? `${stripSeconds(shiftCode.startTime)}-${stripSeconds(shiftCode.endTime)}`
                                : shiftCode.name}
                            </div>
                            {shiftCode.hours && (
                              <div className="text-xs text-gray-500">
                                {shiftCode.hours}h
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-gray-400 group-hover:text-blue-500 transition-colors">
                            <i className="fas fa-plus text-xl"></i>
                            <div className="text-xs mt-1">Assign</div>
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <>
      <div className="space-y-4">
        {/* Shift Code Legend */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 sm:p-4 border border-blue-100">
          <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Shift Codes</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
            {shiftCodes.slice(0, 6).map((code) => (
              <div key={code.id} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 sm:w-4 sm:h-4 rounded border-l-4 flex-shrink-0"
                  style={{ 
                    backgroundColor: code.color,
                    borderLeftColor: code.borderColor,
                  }}
                ></div>
                <span className="text-xs sm:text-sm text-gray-700 truncate">
                  <span className="font-semibold">{code.code}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile: Card View, Desktop: Table View */}
        <div className="lg:hidden">
          <MobileCardView />
        </div>
        
        <div className="hidden lg:block">
          <DesktopTableView />
        </div>

        {/* Summary Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                <i className="fas fa-clock text-white"></i>
              </div>
              <h4 className="font-semibold text-gray-900">Weekly Summary</h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Hours:</span>
                <span className="text-xl font-bold text-blue-700" data-testid="summary-total-hours">
                  {shifts.reduce((sum, shift) => sum + (shift.hours || 0), 0)}h
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Staff Members:</span>
                <span className="text-xl font-bold text-blue-700" data-testid="summary-staff-count">
                  {staff.length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Shifts:</span>
                <span className="text-xl font-bold text-blue-700">
                  {shifts.length}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border border-indigo-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500 flex items-center justify-center">
                <i className="fas fa-chart-pie text-white"></i>
              </div>
              <h4 className="font-semibold text-gray-900">Shift Distribution</h4>
            </div>
            <div className="space-y-2">
              {shiftCodes.slice(0, 3).map((code) => {
                const count = shifts.filter(shift => shift.shiftCodeId === code.id).length;
                return (
                  <div key={code.id} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded border-l-2"
                        style={{ 
                          backgroundColor: code.color,
                          borderLeftColor: code.borderColor,
                        }}
                      ></div>
                      <span className="text-sm text-gray-700 truncate">{code.name}</span>
                    </div>
                    <span className="font-bold text-indigo-700">{count}</span>
                  </div>
                );
              })}
              {shiftCodes.length === 0 && (
                <p className="text-sm text-gray-500 italic">No shift codes available</p>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg p-4 border border-green-200 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
                <i className="fas fa-check-circle text-white"></i>
              </div>
              <h4 className="font-semibold text-gray-900">Status</h4>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-100 rounded-md px-3 py-2">
                <i className="fas fa-check-circle"></i>
                <span className="font-medium">Schedule Created</span>
              </div>
              {shifts.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-orange-700 bg-orange-100 rounded-md px-3 py-2">
                  <i className="fas fa-exclamation-triangle"></i>
                  <span className="font-medium">No shifts assigned</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-100 rounded-md px-3 py-2">
                  <i className="fas fa-calendar-check"></i>
                  <span className="font-medium">{shifts.length} shifts scheduled</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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