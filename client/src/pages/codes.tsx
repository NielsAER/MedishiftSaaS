import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertShiftCodeSchema, type Facility, type ShiftCode } from "@shared/schema";
import { z } from "zod";

const shiftCodeFormSchema = insertShiftCodeSchema.extend({
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  hours: z.coerce.number().optional(),
});

export default function Codes() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [selectedFacility, setSelectedFacility] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);

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

  const { data: shiftCodes, error: shiftCodesError } = useQuery<ShiftCode[]>({
    queryKey: ["/api/shift-codes", selectedFacility],
    enabled: !!selectedFacility,
  });

  useEffect(() => {
    if ((facilitiesError && isUnauthorizedError(facilitiesError)) || 
        (shiftCodesError && isUnauthorizedError(shiftCodesError))) {
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
  }, [facilitiesError, shiftCodesError, toast]);

  // Auto-select first facility
  useEffect(() => {
    if (facilities && facilities.length > 0 && !selectedFacility) {
      setSelectedFacility(facilities[0].id);
    }
  }, [facilities, selectedFacility]);

  const form = useForm<z.infer<typeof shiftCodeFormSchema>>({
    resolver: zodResolver(shiftCodeFormSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      category: "shift",
      startTime: "",
      endTime: "",
      hours: 8,
      color: "#FEF3C7",
      borderColor: "#F59E0B",
      facilityId: selectedFacility,
    },
  });

  const createShiftCodeMutation = useMutation({
    mutationFn: async (data: z.infer<typeof shiftCodeFormSchema>) => {
      return await apiRequest("POST", "/api/shift-codes", {
        ...data,
        facilityId: selectedFacility,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-codes", selectedFacility] });
      toast({
        title: "Success",
        description: "Shift code created successfully",
      });
      setDialogOpen(false);
      form.reset();
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
        description: "Failed to create shift code",
        variant: "destructive",
      });
    },
  });

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

  const onSubmit = (data: z.infer<typeof shiftCodeFormSchema>) => {
    createShiftCodeMutation.mutate(data);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "shift":
        return "bg-blue-100 text-blue-800";
      case "vacation":
        return "bg-green-100 text-green-800";
      case "training":
        return "bg-purple-100 text-purple-800";
      case "sick_leave":
        return "bg-red-100 text-red-800";
      case "special_duty":
        return "bg-pink-100 text-pink-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Shift Codes</h1>
            <p className="text-muted-foreground mt-2">
              Manage shift codes for your healthcare facility
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

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-shift-code">
                  <i className="fas fa-plus mr-2"></i>
                  Add Shift Code
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create New Shift Code</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Code</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., M22, N11" {...field} data-testid="input-code" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Morning Shift" {...field} data-testid="input-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-category">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="shift">Shift</SelectItem>
                              <SelectItem value="vacation">Vacation</SelectItem>
                              <SelectItem value="training">Training</SelectItem>
                              <SelectItem value="sick_leave">Sick Leave</SelectItem>
                              <SelectItem value="special_duty">Special Duty</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Time</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} data-testid="input-start-time" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="endTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Time</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} data-testid="input-end-time" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Optional description" 
                              {...field}
                              value={field.value || ""}
                              data-testid="textarea-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDialogOpen(false)}
                        data-testid="button-cancel"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createShiftCodeMutation.isPending}
                        data-testid="button-create"
                      >
                        {createShiftCodeMutation.isPending ? "Creating..." : "Create"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Shift Codes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shiftCodes?.map((shiftCode) => (
            <Card key={shiftCode.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded border-l-4"
                      style={{ 
                        backgroundColor: shiftCode.color,
                        borderLeftColor: shiftCode.borderColor,
                      }}
                    ></div>
                    <CardTitle className="text-lg">{shiftCode.code}</CardTitle>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(shiftCode.category)}`}>
                    {shiftCode.category.replace('_', ' ')}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="font-medium text-foreground mb-2">{shiftCode.name}</h3>
                {shiftCode.description && (
                  <p className="text-muted-foreground text-sm mb-3">{shiftCode.description}</p>
                )}
                {shiftCode.startTime && shiftCode.endTime && (
                  <div className="text-sm text-muted-foreground">
                    <i className="fas fa-clock mr-1"></i>
                    {shiftCode.startTime} - {shiftCode.endTime}
                    {shiftCode.hours && ` (${shiftCode.hours}h)`}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {(!shiftCodes || shiftCodes.length === 0) && (
            <div className="col-span-full text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-code text-muted-foreground text-2xl"></i>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No shift codes yet</h3>
              <p className="text-muted-foreground">
                Create your first shift code to get started with timesheet management.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
