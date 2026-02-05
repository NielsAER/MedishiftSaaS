import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import StaffModal from "@/components/staff-modal";
import type { Facility, Team, User } from "@shared/schema";

export default function Staff() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [selectedFacility, setSelectedFacility] = useState<string>("");
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingStaff, setEditingStaff] = useState<User | undefined>(undefined);

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

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("DELETE", `/api/users/${userId}`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Staff Removed",
        description: "Staff member has been removed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove staff member",
        variant: "destructive",
      });
    },
  });

  const handleAddStaff = () => {
    setEditingStaff(undefined);
    setIsModalOpen(true);
  };

  const handleEditStaff = (staffMember: User) => {
    setEditingStaff(staffMember);
    setIsModalOpen(true);
  };

  const handleRemoveStaff = (userId: string) => {
    if (confirm("Are you sure you want to remove this staff member?")) {
      deleteMutation.mutate(userId);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header Section - Responsive */}
        <div className="mb-6 sm:mb-8">
          <div className="mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Staff Management</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
              Manage your healthcare staff and team assignments
            </p>
          </div>
          
          {/* Controls - Stack on mobile, row on desktop */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="w-full sm:w-64">
              <div className="text-sm font-medium text-foreground mb-1">Facility</div>
              <div className="text-sm sm:text-base text-foreground">
                {facilities?.find((f) => f.id === selectedFacility)?.name || "No facility"}
              </div>
            </div>

            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="w-full sm:w-64" data-testid="select-team">
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
              <Button 
                data-testid="button-add-staff" 
                onClick={handleAddStaff}
                className="w-full sm:w-auto"
              >
                <i className="fas fa-plus mr-2"></i>
                Add Staff
              </Button>
            )}
          </div>
        </div>

        {/* Team Information */}
        {selectedTeam && teams && (
          <Card className="mb-4 sm:mb-6">
            <CardHeader className="pb-3 sm:pb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="text-lg sm:text-xl">
                  {teams.find(t => t.id === selectedTeam)?.name}
                </CardTitle>
                <Badge variant="outline" className="w-fit">
                  {staff?.length || 0} Staff Members
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm sm:text-base text-muted-foreground">
                {teams.find(t => t.id === selectedTeam)?.description || "No description available"}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Staff Grid - Single column on mobile, responsive grid on larger screens */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {staff?.map((member) => (
            <Card key={member.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex items-start sm:items-center space-x-3 sm:space-x-4">
                  <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                    <AvatarImage src={member.profileImageUrl || ""} />
                    <AvatarFallback className="bg-medical-blue text-white text-sm sm:text-base">
                      {getInitials(member.firstName || undefined, member.lastName || undefined, member.email || undefined)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground text-sm sm:text-base truncate">
                      {member.firstName && member.lastName 
                        ? `${member.firstName} ${member.lastName}`
                        : member.email}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">{member.email}</p>
                    <Badge className={`mt-1.5 sm:mt-2 text-xs ${getRoleBadgeColor(member.role)}`}>
                      {member.role}
                    </Badge>
                  </div>
                </div>

                <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Member since</span>
                    <span className="text-foreground">
                      {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : "Unknown"}
                    </span>
                  </div>
                </div>

                {user.role === 'admin' && (
                  <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row gap-2 sm:space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 w-full sm:w-auto text-xs sm:text-sm" 
                      data-testid={`button-edit-${member.id}`}
                      onClick={() => handleEditStaff(member)}
                    >
                      <i className="fas fa-edit mr-1"></i>
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 w-full sm:w-auto text-xs sm:text-sm" 
                      data-testid={`button-remove-${member.id}`}
                      onClick={() => handleRemoveStaff(member.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <i className="fas fa-user-minus mr-1"></i>
                      Remove
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {(!staff || staff.length === 0) && (
            <div className="col-span-full text-center py-8 sm:py-12">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-muted rounded-lg flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <i className="fas fa-users text-muted-foreground text-xl sm:text-2xl"></i>
              </div>
              <h3 className="text-base sm:text-lg font-medium text-foreground mb-1 sm:mb-2">No staff members found</h3>
              <p className="text-sm sm:text-base text-muted-foreground px-4">
                {selectedTeam 
                  ? "This team doesn't have any staff members yet."
                  : "Select a team to view staff members."
                }
              </p>
            </div>
          )}
        </div>
      </div>

      <StaffModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        staff={editingStaff}
        facilities={facilities}
        selectedFacility={selectedFacility}
      />
    </div>
  );
}