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
import { insertShiftCodeSchema, type Facility, type ShiftCode } from "@shared/types/schema";
import { z } from "zod";
import { stripSeconds } from "@/lib/timeUtils";

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

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingShiftCode, setEditingShiftCode] = useState<ShiftCode | null>(null);

  const editForm = useForm<z.infer<typeof shiftCodeFormSchema>>({
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

  const updateShiftCodeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: z.infer<typeof shiftCodeFormSchema> }) => {
      return await apiRequest("PATCH", `/api/shift-codes/${id}`, {
        ...data,
        facilityId: selectedFacility,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-codes", selectedFacility] });
      toast({
        title: "Success",
        description: "Shift code updated successfully",
      });
      setEditDialogOpen(false);
      setEditingShiftCode(null);
      editForm.reset();
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
        description: "Failed to update shift code",
        variant: "destructive",
      });
    },
  });

  const handleEditClick = (shiftCode: ShiftCode) => {
    setEditingShiftCode(shiftCode);
    editForm.reset({
      code: shiftCode.code,
      name: shiftCode.name,
      description: shiftCode.description || "",
      category: shiftCode.category,
      startTime: shiftCode.startTime || "",
      endTime: shiftCode.endTime || "",
      hours: shiftCode.hours || 8,
      color: shiftCode.color,
      borderColor: shiftCode.borderColor,
      facilityId: shiftCode.facilityId,
    });
    setEditDialogOpen(true);
  };

  const onEditSubmit = (data: z.infer<typeof shiftCodeFormSchema>) => {
    if (!editingShiftCode) return;
    updateShiftCodeMutation.mutate({ id: editingShiftCode.id, data });
  };

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header Section - Responsive */}
        <div className="mb-6 sm:mb-8">
          <div className="mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Shift Codes</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
              Manage shift codes for your healthcare facility
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

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  data-testid="button-add-shift-code"
                  className="w-full sm:w-auto"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Add Shift Code
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-[425px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl">Create New Shift Code</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
                    <FormField
                      control={form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Code</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., M22, N11" 
                              {...field} 
                              data-testid="input-code"
                              className="text-sm sm:text-base"
                            />
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
                          <FormLabel className="text-sm">Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., Morning Shift" 
                              {...field} 
                              data-testid="input-name"
                              className="text-sm sm:text-base"
                            />
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
                          <FormLabel className="text-sm">Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-category" className="text-sm sm:text-base">
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <FormField
                        control={form.control}
                        name="startTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">Start Time</FormLabel>
                            <FormControl>
                              <Input 
                                type="time" 
                                {...field} 
                                data-testid="input-start-time"
                                className="text-sm sm:text-base"
                              />
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
                            <FormLabel className="text-sm">End Time</FormLabel>
                            <FormControl>
                              <Input 
                                type="time" 
                                {...field} 
                                data-testid="input-end-time"
                                className="text-sm sm:text-base"
                              />
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
                          <FormLabel className="text-sm">Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Optional description" 
                              {...field}
                              value={field.value || ""}
                              data-testid="textarea-description"
                              className="text-sm sm:text-base min-h-[80px]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:space-x-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDialogOpen(false)}
                        data-testid="button-cancel"
                        className="w-full sm:w-auto"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createShiftCodeMutation.isPending}
                        data-testid="button-create"
                        className="w-full sm:w-auto"
                      >
                        {createShiftCodeMutation.isPending ? "Creating..." : "Create"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          
            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogContent className="w-[95vw] max-w-[425px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl">Edit Shift Code</DialogTitle>
                </DialogHeader>
                <Form {...editForm}>
                  <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-3 sm:space-y-4">
                    <FormField
                      control={editForm.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Code</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., M22, N11" 
                              {...field} 
                              data-testid="input-edit-code"
                              className="text-sm sm:text-base"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., Morning Shift" 
                              {...field} 
                              data-testid="input-edit-name"
                              className="text-sm sm:text-base"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Category</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-edit-category" className="text-sm sm:text-base">
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <FormField
                        control={editForm.control}
                        name="startTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">Start Time</FormLabel>
                            <FormControl>
                              <Input 
                                type="time" 
                                {...field} 
                                data-testid="input-edit-start-time"
                                className="text-sm sm:text-base"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={editForm.control}
                        name="endTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">End Time</FormLabel>
                            <FormControl>
                              <Input 
                                type="time" 
                                {...field} 
                                data-testid="input-edit-end-time"
                                className="text-sm sm:text-base"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={editForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Optional description" 
                              {...field}
                              value={field.value || ""}
                              data-testid="textarea-edit-description"
                              className="text-sm sm:text-base min-h-[80px]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:space-x-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditDialogOpen(false);
                          setEditingShiftCode(null);
                        }}
                        data-testid="button-edit-cancel"
                        className="w-full sm:w-auto"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={updateShiftCodeMutation.isPending}
                        data-testid="button-update"
                        className="w-full sm:w-auto"
                      >
                        {updateShiftCodeMutation.isPending ? "Updating..." : "Update"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Shift Codes Grid - Single column on mobile, responsive grid on larger screens */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {shiftCodes?.map((shiftCode) => (
            <Card key={shiftCode.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 sm:pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                    <div 
                      className="w-3 h-3 sm:w-4 sm:h-4 rounded border-l-4 flex-shrink-0"
                      style={{ 
                        backgroundColor: shiftCode.color,
                        borderLeftColor: shiftCode.borderColor,
                      }}
                    ></div>
                    <CardTitle className="text-base sm:text-lg truncate">{shiftCode.code}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded-full whitespace-nowrap ${getCategoryColor(shiftCode.category)}`}>
                      {shiftCode.category.replace('_', ' ')}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleEditClick(shiftCode)}
                      data-testid={`button-edit-${shiftCode.id}`}
                      className="h-8 w-8 p-0 text-white"
                    >
                      <i className="fas fa-edit text-sm"></i>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <h3 className="font-medium text-foreground text-sm sm:text-base">{shiftCode.name}</h3>
                {shiftCode.description && (
                  <p className="text-muted-foreground text-xs sm:text-sm line-clamp-2">{shiftCode.description}</p>
                )}
                {shiftCode.startTime && shiftCode.endTime && (
                  <div className="text-xs sm:text-sm text-muted-foreground flex items-center">
                    <i className="fas fa-clock mr-1 flex-shrink-0"></i>
                    <span className="truncate">
                      {stripSeconds(shiftCode.startTime)} - {stripSeconds(shiftCode.endTime)}
                      {shiftCode.hours && ` (${shiftCode.hours}h)`}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {(!shiftCodes || shiftCodes.length === 0) && (
            <div className="col-span-full text-center py-8 sm:py-12 px-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-muted rounded-lg flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <i className="fas fa-code text-muted-foreground text-xl sm:text-2xl"></i>
              </div>
              <h3 className="text-base sm:text-lg font-medium text-foreground mb-1 sm:mb-2">No shift codes yet</h3>
              <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
                Create your first shift code to get started with timesheet management.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}