import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Facility, Team, User } from "@shared/schema";

export default function Home() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();

  const { data: facilities, error } = useQuery<Facility[]>({
    queryKey: ["/api/facilities"],
    enabled: !!user,
  });

  const { data: allUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: !!user && user.role === 'admin',
  });

  const { data: allTeams } = useQuery<Team[]>({
    queryKey: ["/api/all-teams"],
    enabled: !!user && user.role === 'admin',
  });

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

  useEffect(() => {
    if (error && isUnauthorizedError(error)) {
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
  }, [error, toast]);

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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back, {user.firstName || user.email}
            </h1>
            <p className="text-muted-foreground mt-2">
              Ready to manage your healthcare timesheets?
            </p>
          </div>
          <Button 
            onClick={() => window.location.href = '/api/logout'}
            variant="outline"
            data-testid="button-logout"
          >
            Log Out
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Link href="/timesheets">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="w-12 h-12 bg-medical-blue/10 rounded-lg flex items-center justify-center mb-3">
                  <i className="fas fa-calendar-alt text-medical-blue text-xl"></i>
                </div>
                <CardTitle className="text-lg">Timesheets</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Create and manage weekly timesheets for your teams
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/codes">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="w-12 h-12 bg-medical-green/10 rounded-lg flex items-center justify-center mb-3">
                  <i className="fas fa-code text-medical-green text-xl"></i>
                </div>
                <CardTitle className="text-lg">Shift Codes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Define and manage shift codes for your facility
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/staff">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                  <i className="fas fa-users text-purple-600 text-xl"></i>
                </div>
                <CardTitle className="text-lg">Staff Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Manage your healthcare staff and team assignments
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {user.role === 'admin' && (
          <Card>
            <CardHeader>
              <CardTitle>Admin Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {facilities?.length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Facilities</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground" data-testid="stat-active-teams">
                    {allTeams?.length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Active Teams</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground" data-testid="stat-staff-members">
                    {allUsers?.filter(u => u.role === 'staff').length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Staff Members</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
