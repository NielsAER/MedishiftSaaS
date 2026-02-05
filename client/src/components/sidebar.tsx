import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link, useLocation } from "wouter";
import { format, startOfISOWeek, parseISO } from "date-fns";
import type { User, Facility, Team } from "@shared/schema";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  user: User;
  facilities: Facility[];
  teams: Team[];
  selectedFacility: string;
  selectedTeam: string;
  currentWeek: Date;
  onFacilityChange: (facilityId: string) => void;
  onTeamChange: (teamId: string) => void;
  onWeekChange: (week: Date) => void;
}

export default function Sidebar({
  collapsed,
  onToggle,
  user,
  facilities,
  teams,
  selectedFacility,
  selectedTeam,
  currentWeek,
  onFacilityChange,
  onTeamChange,
  onWeekChange,
}: SidebarProps) {
  const [location] = useLocation();

  const getInitials = (
    firstName?: string,
    lastName?: string,
    email?: string,
  ) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return "??";
  };

  const navItems = [
    { href: "/timesheets", icon: "fas fa-calendar-alt", label: "Timesheets" },
    { href: "/codes", icon: "fas fa-code", label: "Shift Codes" },
    { href: "/staff", icon: "fas fa-users", label: "Staff Management" },
    { href: "/reports", icon: "fas fa-chart-bar", label: "Reports" },
  ];

  return (
    <div
      className={`${collapsed ? "w-16" : "w-80"} bg-white border-r border-border transition-all duration-300 flex flex-col`}
    >
      {/* Sidebar Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div
            className={`flex items-center space-x-3 ${collapsed ? "justify-center" : ""}`}
          >
            <div className="w-8 h-8 bg-medical-blue rounded-lg flex items-center justify-center">
              <i className="fas fa-hospital-symbol text-white text-sm"></i>
            </div>
            {!collapsed && (
              <div>
                <h1 className="text-xl font-bold text-foreground">Medishift</h1>
                <p className="text-xs text-muted-foreground">
                  Timesheets. Simplified.
                </p>
              </div>
            )}
          </div>
          <button
            onClick={onToggle}
            className="text-muted-foreground hover:text-foreground"
            data-testid="button-sidebar-toggle"
          >
            <i className="fas fa-bars"></i>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <a
                className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                  location === item.href
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                } ${collapsed ? "justify-center" : ""}`}
                data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
              >
                <i className={`${item.icon} w-5`}></i>
                {!collapsed && <span>{item.label}</span>}
              </a>
            </Link>
          ))}
        </div>

        {/* Filters Section */}
        {!collapsed && (
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Filters
            </h3>
            <div className="space-y-4">
              {/* Facility Filter (read-only) */}
              <div>
                <Label className="text-sm font-medium text-foreground block mb-2">
                  Facility
                </Label>
                <div className="w-full text-sm sm:text-base text-foreground">
                  {selectedFacility === "all"
                    ? "All Facilities"
                    : facilities.find((f) => f.id === selectedFacility)?.name || "No facility"}
                </div>
              </div>

              {/* Team Filter */}
              <div>
                <Label className="text-sm font-medium text-foreground block mb-2">
                  Team
                </Label>
                <Select value={selectedTeam} onValueChange={onTeamChange}>
                  <SelectTrigger className="w-full" data-testid="select-team">
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Week Filter */}
              <div>
                <Label className="text-sm font-medium text-foreground block mb-2">
                  Week
                </Label>
                <Input
                  type="week"
                  value={format(currentWeek, "yyyy-'W'II")}
                  onChange={(e) => {
                    const value = e.target.value; // "2025-W06"
                    if (!value) return;

                    // Convert "2025-W06" → "2025-W06-1" (Monday)
                    const isoWeekDate = `${value}-1`;

                    const parsed = parseISO(isoWeekDate);
                    if (!isNaN(parsed.getTime())) {
                      onWeekChange(startOfISOWeek(parsed));
                    }
                  }}
                  className="w-full"
                  data-testid="input-week"
                />
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* User Profile */}
      {!collapsed && (
        <div className="p-4 border-t border-border">
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.profileImageUrl || ""} />
              <AvatarFallback className="bg-medical-green text-white text-sm">
                {getInitials(
                  user.firstName || undefined,
                  user.lastName || undefined,
                  user.email || undefined,
                )}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-foreground">
                {user.firstName && user.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user.email}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {user.role}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
