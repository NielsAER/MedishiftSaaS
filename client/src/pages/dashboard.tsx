import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Clock, TrendingUp, Download } from "lucide-react";
import type { Facility, Team, User, Timesheet, Shift } from "@shared/schema";
import { startOfWeek, endOfWeek, format, addWeeks, subWeeks } from "date-fns";

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  // Non-admins default to their facility
  const [selectedFacility, setSelectedFacility] = useState<string>(
    user?.role === 'admin' ? "all" : (user?.facilityId || "all")
  );
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });

  const { data: facilities } = useQuery<Facility[]>({
    queryKey: ["/api/facilities"],
    enabled: !!user,
  });

  const { data: allTeams } = useQuery<Team[]>({
    queryKey: ["/api/all-teams"],
    enabled: !!user,
  });

  const { data: allUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: !!user,
  });

  const { data: timesheets } = useQuery<Timesheet[]>({
    queryKey: ["/api/timesheets"],
    enabled: !!user,
  });

  const { data: allShifts } = useQuery<Shift[]>({
    queryKey: ["/api/shifts"],
    enabled: !!user,
  });

  // Filter data based on selections
  const filteredTeams = useMemo(() => {
    if (!allTeams) return [];
    if (selectedFacility === "all") return allTeams;
    return allTeams.filter(team => team.facilityId === selectedFacility);
  }, [allTeams, selectedFacility]);

  const filteredEmployees = useMemo(() => {
    if (!allUsers || !allTeams) return [];
    let filtered = allUsers.filter(u => u.role === 'staff');
    
    // Filter by facility first
    if (selectedFacility !== "all") {
      const teamIdsInFacility = allTeams.filter(t => t.facilityId === selectedFacility).map(t => t.id);
      const timesheetsInScope = timesheets?.filter(ts => teamIdsInFacility.includes(ts.teamId)) || [];
      const userIdsInScope = new Set(timesheetsInScope.map(ts => ts.userId));
      filtered = filtered.filter(u => userIdsInScope.has(u.id));
    }
    
    // Then filter by team
    if (selectedTeam !== "all") {
      const timesheetsInTeam = timesheets?.filter(ts => ts.teamId === selectedTeam) || [];
      const userIdsInTeam = new Set(timesheetsInTeam.map(ts => ts.userId));
      filtered = filtered.filter(u => userIdsInTeam.has(u.id));
    }
    
    return filtered;
  }, [allUsers, allTeams, timesheets, selectedFacility, selectedTeam]);

  const filteredTimesheets = useMemo(() => {
    if (!timesheets || !allShifts) return [];
    
    let filtered = timesheets.filter(ts => {
      const tsDate = new Date(ts.weekStarting);
      return tsDate >= weekStart && tsDate <= weekEnd;
    });

    if (selectedFacility !== "all") {
      filtered = filtered.filter(ts => ts.facilityId === selectedFacility);
    }
    if (selectedTeam !== "all") {
      filtered = filtered.filter(ts => ts.teamId === selectedTeam);
    }
    if (selectedEmployee !== "all") {
      filtered = filtered.filter(ts => ts.userId === selectedEmployee);
    }

    return filtered;
  }, [timesheets, allShifts, weekStart, weekEnd, selectedFacility, selectedTeam, selectedEmployee]);

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!allShifts || !filteredTimesheets) {
      return {
        totalHours: 0,
        activeShifts: 0,
        staffCount: 0,
        coverageRate: 0,
      };
    }

    const relevantShiftIds = filteredTimesheets.map(ts => ts.id);
    const relevantShifts = allShifts.filter(shift => 
      relevantShiftIds.includes(shift.timesheetId)
    );

    const totalHours = relevantShifts.reduce((sum, shift) => {
      return sum + (shift.hours || 0);
    }, 0);

    const staffCount = new Set(filteredTimesheets.map(ts => ts.userId)).size;
    
    // Calculate coverage rate (percentage of scheduled vs planned)
    const totalDays = filteredTimesheets.length * 7;
    const scheduledDays = relevantShifts.filter(s => s.shiftCode).length;
    const coverageRate = totalDays > 0 ? (scheduledDays / totalDays) * 100 : 0;

    return {
      totalHours: Math.round(totalHours * 10) / 10,
      activeShifts: relevantShifts.length,
      staffCount,
      coverageRate: Math.round(coverageRate),
    };
  }, [allShifts, filteredTimesheets]);

  // Calculate shift distribution by day
  const shiftDistribution = useMemo(() => {
    if (!allShifts || !filteredTimesheets) return [];

    const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const distribution = daysOfWeek.map((day, index) => {
      const relevantShiftIds = filteredTimesheets.map(ts => ts.id);
      const dayShifts = allShifts.filter(shift => {
        if (!relevantShiftIds.includes(shift.timesheetId)) return false;
        const shiftDate = new Date(shift.date);
        return shiftDate.getDay() === (index + 1) % 7;
      });

      const hours = dayShifts.reduce((sum, shift) => sum + (shift.hours || 0), 0);
      return { day, hours: Math.round(hours * 10) / 10, count: dayShifts.length };
    });

    return distribution;
  }, [allShifts, filteredTimesheets]);

  const handlePreviousWeek = () => {
    setCurrentWeek(prev => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeek(prev => addWeeks(prev, 1));
  };

  const handleThisWeek = () => {
    setCurrentWeek(new Date());
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Facility-wide overview of timesheets and scheduling
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Week Navigation */}
              <div className="lg:col-span-2">
                <label className="text-sm font-medium mb-2 block">Week Range</label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousWeek}
                    data-testid="button-previous-week"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleThisWeek}
                    data-testid="button-this-week"
                  >
                    This Week
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextWeek}
                    data-testid="button-next-week"
                  >
                    Next
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
                </p>
              </div>

              {/* Facility Filter */}
              {user.role === 'admin' && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Facility</label>
                  <Select value={selectedFacility} onValueChange={setSelectedFacility}>
                    <SelectTrigger data-testid="select-facility">
                      <SelectValue placeholder="All Facilities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Facilities</SelectItem>
                      {facilities?.map(facility => (
                        <SelectItem key={facility.id} value={facility.id}>
                          {facility.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Team Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Team</label>
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger data-testid="select-team">
                    <SelectValue placeholder="All Teams" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teams</SelectItem>
                    {filteredTeams?.map(team => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Employee Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Employee</label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger data-testid="select-employee">
                    <SelectValue placeholder="All Employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {filteredEmployees?.map(employee => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.firstName} {employee.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Hours
                </CardTitle>
                <div className="w-10 h-10 bg-medical-blue/10 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-medical-blue" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="metric-total-hours">
                {metrics.totalHours}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Scheduled this week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Shifts
                </CardTitle>
                <div className="w-10 h-10 bg-medical-green/10 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-medical-green" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="metric-active-shifts">
                {metrics.activeShifts}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total shift entries
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Staff Count
                </CardTitle>
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="metric-staff-count">
                {metrics.staffCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Unique employees
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Coverage Rate
                </CardTitle>
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-amber-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="metric-coverage-rate">
                {metrics.coverageRate}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Scheduled vs planned
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Shift Distribution Chart */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Weekly Shift Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {shiftDistribution.map(({ day, hours, count }) => (
                <div key={day} className="flex items-center gap-4">
                  <div className="w-24 text-sm font-medium">{day}</div>
                  <div className="flex-1">
                    <div className="h-8 bg-muted rounded-lg overflow-hidden">
                      <div
                        className="h-full bg-medical-blue transition-all"
                        style={{ width: `${Math.min((hours / (metrics.totalHours || 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-20 text-right">
                    <div className="text-sm font-bold">{hours}h</div>
                    <div className="text-xs text-muted-foreground">{count} shifts</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Timesheets Summary Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Timesheets Summary</CardTitle>
              <Button variant="outline" size="sm" data-testid="button-export-dashboard">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {filteredTimesheets.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No timesheets found for selected filters</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try adjusting your filters or creating a new timesheet
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 text-sm font-semibold">Employee</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold">Team</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold">Week Starting</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold">Total Hours</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold">Shifts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTimesheets.map(timesheet => {
                      const employee = allUsers?.find(u => u.id === timesheet.userId);
                      const team = allTeams?.find(t => t.id === timesheet.teamId);
                      const shifts = allShifts?.filter(s => s.timesheetId === timesheet.id) || [];
                      const totalHours = shifts.reduce((sum, s) => sum + (s.hours || 0), 0);

                      return (
                        <tr key={timesheet.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4 text-sm" data-testid={`row-employee-${timesheet.id}`}>
                            {employee?.firstName} {employee?.lastName}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {team?.name || 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {format(new Date(timesheet.weekStarting), "MMM d, yyyy")}
                          </td>
                          <td className="py-3 px-4 text-sm text-right font-medium">
                            {Math.round(totalHours * 10) / 10}h
                          </td>
                          <td className="py-3 px-4 text-sm text-right">
                            {shifts.length}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
