import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Facility, Team, User } from "@shared/schema";

export default function Staff() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [selectedFacility, setSelectedFacility] = useState<string>("");
  const [selectedTeam, setSelectedTeam] = useState<string>("");

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

  const { data: staff, error: staffError } = useQuery<User[]>({
    queryKey: ["/api/staff", selectedTeam],
    enabled: !!selectedTeam,
  });

  useEffect(() => {
    if ((facilitiesError && isUnauthorizedError(facilitiesError)) || 
        (staffError && isUnauthorizedError(staffError))) {
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
  }, [facilitiesError, staffError, toast]);

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

  const getInitials = (firstName?: string, lastName?: string, email?: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return "??";
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "manager":
        return "bg-blue-100 text-blue-800";
      case "staff":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Staff Management</h1>
            <p className="text-muted-foreground mt-2">
              Manage your healthcare staff and team assignments
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Select value={selectedFacility} onValueChange={setSelectedFacility}>
              <SelectTrigger className="w-64" data-testid="select-facility">
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
              <SelectTrigger className="w-64" data-testid="select-team">
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

            {user.role === 'admin' && (
              <Button data-testid="button-add-staff">
                <i className="fas fa-plus mr-2"></i>
                Add Staff
              </Button>
            )}
          </div>
        </div>

        {/* Team Information */}
        {selectedTeam && teams && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {teams.find(t => t.id === selectedTeam)?.name}
                </CardTitle>
                <Badge variant="outline">
                  {staff?.length || 0} Staff Members
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {teams.find(t => t.id === selectedTeam)?.description || "No description available"}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Staff Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {staff?.map((member) => (
            <Card key={member.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={member.profileImageUrl || ""} />
                    <AvatarFallback className="bg-medical-blue text-white">
                      {getInitials(member.firstName || undefined, member.lastName || undefined, member.email || undefined)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">
                      {member.firstName && member.lastName 
                        ? `${member.firstName} ${member.lastName}`
                        : member.email}
                    </h3>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                    <Badge className={`mt-2 ${getRoleBadgeColor(member.role)}`}>
                      {member.role}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Member since</span>
                    <span className="text-foreground">
                      {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : "Unknown"}
                    </span>
                  </div>
                </div>

                {user.role === 'admin' && (
                  <div className="mt-4 flex space-x-2">
                    <Button variant="outline" size="sm" className="flex-1" data-testid={`button-edit-${member.id}`}>
                      <i className="fas fa-edit mr-1"></i>
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" data-testid={`button-remove-${member.id}`}>
                      <i className="fas fa-user-minus mr-1"></i>
                      Remove
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {(!staff || staff.length === 0) && (
            <div className="col-span-full text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-users text-muted-foreground text-2xl"></i>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No staff members found</h3>
              <p className="text-muted-foreground">
                {selectedTeam 
                  ? "This team doesn't have any staff members yet."
                  : "Select a team to view staff members."
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
