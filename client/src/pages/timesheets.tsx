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
import { format, startOfWeek, addWeeks, subWeeks, isValid } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { stripSeconds } from "@/lib/timeUtils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { Facility, Team, Timesheet, User, Shift, ShiftCode } from "@shared/schema";

export default function Timesheets() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [selectedFacility, setSelectedFacility] = useState<string>("");
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'grid' | 'stats'>('grid');
  const isValidWeek = isValid(currentWeek);
  
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your timesheet...</p>
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

    const csvRows: string[] = [];
    csvRows.push("Staff Name,Date,Shift Code,Shift Name,Start Time,End Time,Hours,Notes");
    
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
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
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
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden pb-16 lg:pb-0">
        {/* Top Header - Mobile Optimized */}
        <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 shadow-sm sticky top-0 z-30">
          <div className="px-4 py-3 sm:px-6 sm:py-4">
            {/* Title Row */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Mobile Menu Button */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="lg:hidden flex-shrink-0">
                      <i className="fas fa-bars text-blue-600"></i>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 p-0">
                    <SheetHeader className="p-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600">
                      <SheetTitle className="text-white">Navigation</SheetTitle>
                    </SheetHeader>
                    <div className="overflow-y-auto h-[calc(100vh-80px)]">
                      <Sidebar
                        collapsed={false}
                        onToggle={() => {}}
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
                    </div>
                  </SheetContent>
                </Sheet>

                <div className="min-w-0 flex-1">
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                    Weekly Timesheet
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500 truncate">
                    {teams?.find(t => t.id === selectedTeam)?.name || 'Select a team'}
                  </p>
                </div>
              </div>
            </div>

            {/* Filters Row - Mobile Optimized */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
              <Select value={selectedFacility} onValueChange={setSelectedFacility}>
                <SelectTrigger className="bg-white">
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

              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams?.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Week Navigation - Centered */}
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousWeek}
                className="flex-shrink-0"
                data-testid="button-previous-week"
              >
                <i className="fas fa-chevron-left"></i>
              </Button>
              
              <div className="text-center flex-1 px-2">
                <div className="text-sm sm:text-base font-semibold text-gray-900">
                  Week {weekNumber}, {currentWeek.getFullYear()}
                </div>
                <div className="text-xs text-gray-500">
                  {format(currentWeek, "MMM d")} - {format(addWeeks(currentWeek, 1), "MMM d, yyyy")}
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextWeek}
                className="flex-shrink-0"
                data-testid="button-next-week"
              >
                <i className="fas fa-chevron-right"></i>
              </Button>
            </div>
          </div>

          {/* Mobile Tabs */}
          <div className="lg:hidden flex border-t border-gray-200 bg-white">
            <button
              onClick={() => setActiveTab('grid')}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'grid'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500'
              }`}
            >
              <i className="fas fa-table mr-2"></i>
              Timesheet
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'stats'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500'
              }`}
            >
              <i className="fas fa-chart-bar mr-2"></i>
              Stats
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {/* Desktop: Always show stats then grid */}
          <div className="hidden lg:block">
            <div className="px-6 pt-6">
              <StatsCards stats={stats} />
            </div>
            <div className="px-6 py-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
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

          {/* Mobile: Tab-based content */}
          <div className="lg:hidden">
            {activeTab === 'grid' ? (
              <div className="p-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
                  <div className="min-w-[640px]">
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
            ) : (
              <div className="p-4">
                <StatsCards stats={stats} />
              </div>
            )}
          </div>
        </div>

        {/* Floating Action Buttons - Mobile Only */}
        <div className="lg:hidden fixed bottom-20 right-4 flex flex-col gap-3 z-20">
          <Button
            size="lg"
            onClick={handleCopyWeek}
            disabled={copyWeekMutation.isPending || !shifts || shifts.length === 0}
            className="rounded-full w-14 h-14 shadow-lg bg-blue-600 hover:bg-blue-700"
            data-testid="button-copy-week"
          >
            {copyWeekMutation.isPending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <i className="fas fa-copy text-lg"></i>
            )}
          </Button>
          
          <Button
            size="lg"
            onClick={handleExport}
            disabled={!shifts || shifts.length === 0}
            className="rounded-full w-14 h-14 shadow-lg bg-indigo-600 hover:bg-indigo-700"
            data-testid="button-export"
          >
            <i className="fas fa-download text-lg"></i>
          </Button>
        </div>

        {/* Bottom Navigation - Mobile Only */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-30">
          <div className="grid grid-cols-3 h-16">
            <Button
              variant="ghost"
              onClick={handleCopyWeek}
              disabled={copyWeekMutation.isPending || !shifts || shifts.length === 0}
              className="flex flex-col items-center justify-center gap-1 rounded-none h-full"
            >
              {copyWeekMutation.isPending ? (
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <i className="fas fa-copy text-blue-600"></i>
              )}
              <span className="text-xs text-gray-600">Copy</span>
            </Button>
            
            <Button
              variant="ghost"
              onClick={handleExport}
              disabled={!shifts || shifts.length === 0}
              className="flex flex-col items-center justify-center gap-1 rounded-none h-full border-x border-gray-200"
            >
              <i className="fas fa-download text-blue-600"></i>
              <span className="text-xs text-gray-600">Export</span>
            </Button>
            
            <Button
              variant="ghost"
              className="flex flex-col items-center justify-center gap-1 rounded-none h-full"
              data-testid="button-add-shift-code"
            >
              <i className="fas fa-plus text-blue-600"></i>
              <span className="text-xs text-gray-600">Add Shift</span>
            </Button>
          </div>
        </nav>

        {/* Desktop Action Bar */}
        <div className="hidden lg:flex items-center justify-end gap-2 px-6 py-4 bg-white border-t border-gray-200">
          <Button
            variant="outline"
            onClick={handleCopyWeek}
            disabled={copyWeekMutation.isPending || !shifts || shifts.length === 0}
            data-testid="button-copy-week"
          >
            {copyWeekMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                Copying...
              </>
            ) : (
              <>
                <i className="fas fa-copy mr-2"></i>
                Copy Week
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={!shifts || shifts.length === 0}
            data-testid="button-export"
          >
            <i className="fas fa-download mr-2"></i>
            Export
          </Button>
          
          <Button className="bg-blue-600 hover:bg-blue-700" data-testid="button-add-shift-code">
            <i className="fas fa-plus mr-2"></i>
            Add Shift Code
          </Button>
        </div>
      </div>
    </div>
  );
}