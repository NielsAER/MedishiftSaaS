import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/sidebar";
import TimesheetGrid from "@/components/timesheet-grid";
import StatsCards from "@/components/stats-cards";
import { Button } from "@/components/ui/button";
import { format, startOfWeek, addWeeks, subWeeks } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Facility, Team, Timesheet, User, Shift, ShiftCode } from "@shared/schema";

export default function Timesheets() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [selectedFacility, setSelectedFacility] = useState<string>("");
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
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
  }, [user, isLoading, toast]);

  const { data: facilities, error: facilitiesError } = useQuery<Facility[]>({
    queryKey: ["/api/facilities"],
    enabled: !!user,
  });

  const { data: teams } = useQuery<Team[]>({
    queryKey: ["/api/teams", selectedFacility],
    enabled: !!selectedFacility,
  });

  const { data: timesheet } = useQuery<Timesheet>({
    queryKey: ["/api/timesheets", format(currentWeek, "yyyy-MM-dd"), selectedTeam],
    enabled: !!selectedTeam && !!currentWeek,
  });

  const { data: staff } = useQuery<User[]>({
    queryKey: ["/api/staff", selectedTeam],
    enabled: !!selectedTeam,
  });

  const { data: shiftCodes } = useQuery<ShiftCode[]>({
    queryKey: ["/api/shift-codes", selectedFacility],
    enabled: !!selectedFacility,
  });

  const { data: shifts } = useQuery<Shift[]>({
    queryKey: ["/api/shifts", timesheet?.id],
    enabled: !!timesheet?.id,
  });

  const { data: stats } = useQuery<{totalStaff: number; totalHours: number; overtimeHours: number; conflicts: number}>({
    queryKey: ["/api/stats", timesheet?.id],
    enabled: !!timesheet?.id,
  });

  useEffect(() => {
    if (facilitiesError && isUnauthorizedError(facilitiesError)) {
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
  }, [facilitiesError, toast]);

  // Auto-select first facility and team
  useEffect(() => {
    if (facilities && facilities.length > 0 && !selectedFacility) {
      setSelectedFacility(facilities[0].id);
    }
  }, [facilities, selectedFacility]);

  useEffect(() => {
    if (teams && teams.length > 0 && !selectedTeam) {
      setSelectedTeam(teams[0].id);
    }
  }, [teams, selectedTeam]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handlePreviousWeek = () => {
    setCurrentWeek(prev => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeek(prev => addWeeks(prev, 1));
  };

  const copyWeekMutation = useMutation({
    mutationFn: async () => {
      const sourceWeekStartDate = format(currentWeek, "yyyy-MM-dd");
      const targetWeekStartDate = format(addWeeks(currentWeek, 1), "yyyy-MM-dd");
      
      const response = await apiRequest(
        "POST",
        "/api/timesheets/copy-week",
        {
          sourceWeekStartDate,
          targetWeekStartDate,
          teamId: selectedTeam,
          facilityId: selectedFacility,
        }
      );
      
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Week Copied",
        description: `Successfully copied ${data.copiedCount} shifts to next week`,
      });
      
      // Move to next week and invalidate queries
      setCurrentWeek(prev => addWeeks(prev, 1));
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (error: any) => {
      toast({
        title: "Copy Failed",
        description: error.message || "Failed to copy week",
        variant: "destructive",
      });
    },
  });

  const handleCopyWeek = () => {
    if (!timesheet || !shifts || shifts.length === 0) {
      toast({
        title: "No Shifts to Copy",
        description: "The current week has no shifts to copy",
        variant: "destructive",
      });
      return;
    }
    
    copyWeekMutation.mutate();
  };

  const handleExport = () => {
    if (!timesheet || !shifts || shifts.length === 0 || !staff || !shiftCodes) {
      toast({
        title: "No Data to Export",
        description: "The current week has no data to export",
        variant: "destructive",
      });
      return;
    }

    // Prepare CSV data
    const csvRows: string[] = [];
    
    // Header
    csvRows.push("Staff Name,Date,Shift Code,Shift Name,Start Time,End Time,Hours,Notes");
    
    // Data rows
    shifts.forEach(shift => {
      const staffMember = staff.find(s => s.id === shift.userId);
      const shiftCode = shiftCodes.find(sc => sc.id === shift.shiftCodeId);
      
      const row = [
        `"${staffMember?.firstName || ''} ${staffMember?.lastName || ''}"`,
        shift.date,
        shiftCode?.code || '',
        `"${shiftCode?.name || ''}"`,
        shift.startTime || '',
        shift.endTime || '',
        shift.hours || 0,
        `"${shift.notes || ''}"`,
      ];
      
      csvRows.push(row.join(','));
    });
    
    // Create and download file
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const teamName = teams?.find(t => t.id === selectedTeam)?.name || 'Unknown';
    const weekStart = format(currentWeek, "yyyy-MM-dd");
    
    link.setAttribute('href', url);
    link.setAttribute('download', `timesheet_${teamName}_${weekStart}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export Successful",
      description: `Downloaded timesheet for week of ${format(currentWeek, "MMM d, yyyy")}`,
    });
  };

  const weekNumber = Math.ceil((currentWeek.getTime() - new Date(currentWeek.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        user={user}
        facilities={facilities || []}
        teams={teams || []}
        selectedFacility={selectedFacility}
        selectedTeam={selectedTeam}
        currentWeek={currentWeek}
        onFacilityChange={setSelectedFacility}
        onTeamChange={setSelectedTeam}
        onWeekChange={setCurrentWeek}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="bg-white border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Weekly Timesheet</h2>
              <p className="text-muted-foreground">
                {teams?.find(t => t.id === selectedTeam)?.name} • {format(currentWeek, "MMMM d")} - {format(addWeeks(currentWeek, 1), "d, yyyy")}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Week Navigation */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousWeek}
                  data-testid="button-previous-week"
                >
                  <i className="fas fa-chevron-left"></i>
                </Button>
                <span className="text-sm font-medium px-4">Week {weekNumber}, {currentWeek.getFullYear()}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextWeek}
                  data-testid="button-next-week"
                >
                  <i className="fas fa-chevron-right"></i>
                </Button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  data-testid="button-copy-week"
                  onClick={handleCopyWeek}
                  disabled={copyWeekMutation.isPending || !shifts || shifts.length === 0}
                >
                  {copyWeekMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2"></div>
                      Copying...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-copy mr-2"></i>Copy Week
                    </>
                  )}
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  data-testid="button-export"
                  onClick={handleExport}
                  disabled={!shifts || shifts.length === 0}
                >
                  <i className="fas fa-download mr-2"></i>Export
                </Button>
                <Button variant="default" size="sm" data-testid="button-add-shift-code">
                  <i className="fas fa-plus mr-2"></i>Add Shift Code
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Stats Cards */}
        <StatsCards stats={stats} />

        {/* Timesheet Grid */}
        <div className="flex-1 px-6 pb-6 overflow-auto">
          <TimesheetGrid
            timesheet={timesheet}
            staff={staff || []}
            shifts={shifts || []}
            shiftCodes={shiftCodes || []}
            currentWeek={currentWeek}
            selectedTeam={selectedTeam}
            selectedFacility={selectedFacility}
          />
        </div>
      </div>
    </div>
  );
}
