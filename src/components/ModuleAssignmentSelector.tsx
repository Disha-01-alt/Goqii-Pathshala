import { useEffect } from "react";
import { useOrganizationAssignments } from "@/hooks/useOrganizationAssignments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Loader2 } from "lucide-react";

interface Assignment {
  title: string;
  description?: string;
  instructions?: string;
  dueInDays?: number;
}

interface ModuleAssignmentSelectorProps {
  moduleId: string;
  assignments: Assignment[];
}

export function ModuleAssignmentSelector({
  moduleId,
  assignments,
}: ModuleAssignmentSelectorProps) {
  const {
    settings,
    isLoading,
    userOrganization,
    toggleAssignment,
    isToggling,
    initializeSettings,
    isAssignmentEnabled,
  } = useOrganizationAssignments(moduleId);

  // Initialize settings when component mounts if none exist
  useEffect(() => {
    if (userOrganization && assignments.length > 0 && settings.length === 0 && !isLoading) {
      initializeSettings(assignments.length);
    }
  }, [userOrganization, assignments.length, settings.length, isLoading, initializeSettings]);

  if (!userOrganization) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-center text-muted-foreground">
            You need to be assigned to an organization to manage assignments.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (assignments.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Assignment Settings</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Enable or disable assignments for your organization's learners
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {assignments.map((assignment, index) => {
            const enabled = isAssignmentEnabled(index);
            
            return (
              <div
                key={index}
                className={`flex items-start justify-between gap-4 p-4 rounded-lg border ${
                  enabled ? "bg-card" : "bg-muted/50 opacity-75"
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{assignment.title}</h4>
                    <Badge variant={enabled ? "default" : "secondary"} className="text-xs">
                      {enabled ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                  {assignment.description && (
                    <p className="text-sm text-muted-foreground">{assignment.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`assignment-${index}`} className="sr-only">
                    Enable assignment
                  </Label>
                  <Switch
                    id={`assignment-${index}`}
                    checked={enabled}
                    onCheckedChange={(checked) =>
                      toggleAssignment({ assignmentIndex: index, isEnabled: checked })
                    }
                    disabled={isToggling}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
