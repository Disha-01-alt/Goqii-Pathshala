import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, BookOpen, ClipboardList, Eye, Save, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { useOrganizationCourseSettings } from "@/hooks/useOrganizationCourseSettings";
import { AddToCourseGroupButton } from "@/components/AddToCourseGroupButton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ModuleWithAssignments {
  id: string;
  title: string;
  description: string | null;
  module_type: string;
}

interface CourseModule {
  id: string;
  module_id: string;
  order_index: number;
  module: ModuleWithAssignments;
}

interface CourseData {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  passing_score: number;
  course_modules: CourseModule[];
}

export default function ManagerCourseViewer() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ["manager-course-detail", courseId],
    queryFn: async () => {
      if (!courseId) return null;

      const { data, error } = await supabase
        .from("courses")
        .select(`
          id,
          title,
          description,
          thumbnail_url,
          passing_score,
          course_modules (
            id,
            module_id,
            order_index,
            module:modules (
              id,
              title,
              description,
              module_type
            )
          )
        `)
        .eq("id", courseId)
        .single();

      if (error) throw error;
      return data as unknown as CourseData;
    },
    enabled: !!courseId,
  });

  // Get module IDs for fetching assignments
  const moduleIds = course?.course_modules?.map(cm => cm.module.id) || [];

  // Fetch assignments from the new module_assignments table
  const { data: moduleAssignmentsData, isLoading: assignmentsLoading } = useQuery({
    queryKey: ["manager-course-assignments", courseId, moduleIds],
    queryFn: async () => {
      if (moduleIds.length === 0) return [];
      const { data, error } = await supabase
        .from("module_assignments" as any)
        .select("*")
        .in("module_id", moduleIds)
        .order("order_index");
      if (error) throw error;
      return (data || []) as unknown as Array<{
        id: string;
        module_id: string;
        module_name: string;
        title: string;
        goal: string | null;
        instructions: string | null;
        order_index: number;
      }>;
    },
    enabled: moduleIds.length > 0,
  });

  const {
    isLoading: settingsLoading,
    hasChanges,
    initializeLocalSettings,
    toggleModule,
    toggleAssignment,
    isModuleEnabled,
    isAssignmentEnabled,
    saveSettings,
    isSaving,
  } = useOrganizationCourseSettings(courseId || "");

  // Initialize settings when course data loads
  useEffect(() => {
    if (course?.course_modules) {
      const moduleIds = course.course_modules.map(cm => cm.module.id);
      initializeLocalSettings(moduleIds);
    }
  }, [course, initializeLocalSettings]);

  // Sorted modules by order
  const sortedModules = useMemo(() => {
    if (!course?.course_modules) return [];
    return [...course.course_modules].sort((a, b) => a.order_index - b.order_index);
  }, [course]);

  // Calculate cumulative assignments from new table data
  const cumulativeAssignments = useMemo(() => {
    const assignments: { 
      moduleId: string; 
      moduleTitle: string; 
      assignmentIndex: number; 
      title: string; 
      description?: string;
    }[] = [];

    // Use assignments from the module_assignments table
    if (moduleAssignmentsData) {
      // Group by module to get proper indices
      const moduleAssignmentMap = new Map<string, typeof moduleAssignmentsData>();
      moduleAssignmentsData.forEach(assignment => {
        const existing = moduleAssignmentMap.get(assignment.module_id) || [];
        existing.push(assignment);
        moduleAssignmentMap.set(assignment.module_id, existing);
      });

      sortedModules.forEach((cm) => {
        const moduleAssigns = moduleAssignmentMap.get(cm.module.id) || [];
        moduleAssigns.forEach((assignment, index) => {
          assignments.push({
            moduleId: cm.module.id,
            moduleTitle: cm.module.title,
            assignmentIndex: index,
            title: assignment.title || `Assignment ${index + 1}`,
            description: assignment.goal || undefined,
          });
        });
      });
    }

    return assignments;
  }, [sortedModules, moduleAssignmentsData]);

  // Count stats
  const totalModules = sortedModules.length;
  const enabledModulesCount = sortedModules.filter(cm => isModuleEnabled(cm.module.id)).length;
  const totalAssignments = cumulativeAssignments.length;
  const enabledAssignmentsCount = cumulativeAssignments.filter(
    a => isModuleEnabled(a.moduleId) && isAssignmentEnabled(a.moduleId, a.assignmentIndex)
  ).length;

  // Track which module sections are expanded
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  const toggleModuleExpanded = (moduleId: string) => {
    setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  if (courseLoading || settingsLoading || assignmentsLoading) {
    return (
      <AppSidebar>
        <div className="p-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppSidebar>
    );
  }

  if (!course) {
    return (
      <AppSidebar>
        <div className="p-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Course not found</p>
            <Button variant="outline" onClick={() => navigate("/courses")} className="mt-4">
              Back to Courses
            </Button>
          </div>
        </div>
      </AppSidebar>
    );
  }

  return (
    <AppSidebar>
      <div className="p-6 overflow-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/courses")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Button>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-2">{course.title}</h1>
              {course.description && (
                <p className="text-muted-foreground">{course.description}</p>
              )}
            </div>
            {course.thumbnail_url && (
              <img
                src={course.thumbnail_url}
                alt={course.title}
                className="w-32 h-20 object-cover rounded-lg"
              />
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <Badge variant="outline">
              {enabledModulesCount}/{totalModules} modules selected
            </Badge>
            <Badge variant="outline">
              {enabledAssignmentsCount}/{totalAssignments} assignments selected
            </Badge>
            <Badge variant="secondary">Pass: {course.passing_score}%</Badge>
          </div>
        </div>

        {/* Modules Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Modules in this Course ({totalModules} total)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sortedModules.length === 0 ? (
              <p className="text-muted-foreground text-sm">No modules in this course</p>
            ) : (
              sortedModules.map((cm) => {
                const enabled = isModuleEnabled(cm.module.id);
                // Get assignment count from the new table
                const assignmentCount = moduleAssignmentsData?.filter(a => a.module_id === cm.module.id).length || 0;

                return (
                  <div
                    key={cm.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      enabled ? "bg-card" : "bg-muted/50 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={enabled}
                        onCheckedChange={(checked) =>
                          toggleModule(cm.module.id, checked as boolean)
                        }
                      />
                      <div>
                        <p className="font-medium">{cm.module.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {assignmentCount} assignment{assignmentCount !== 1 ? "s" : ""}
                          {!enabled && " (disabled)"}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/manager/modules/${cm.module.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Assignments Section */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Recommended Assignments ({totalAssignments} total)
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Select which assignments your learners will receive
                </p>
              </div>
              {totalAssignments > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Select all assignments from enabled modules
                      cumulativeAssignments.forEach(a => {
                        if (isModuleEnabled(a.moduleId) && !isAssignmentEnabled(a.moduleId, a.assignmentIndex)) {
                          toggleAssignment(a.moduleId, a.assignmentIndex, true);
                        }
                      });
                    }}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Deselect all assignments
                      cumulativeAssignments.forEach(a => {
                        if (isAssignmentEnabled(a.moduleId, a.assignmentIndex)) {
                          toggleAssignment(a.moduleId, a.assignmentIndex, false);
                        }
                      });
                    }}
                  >
                    Deselect All
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {cumulativeAssignments.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No assignments in selected modules
              </p>
            ) : (
              <div className="space-y-2">
                {/* Group by module with collapsible sections */}
                {sortedModules.map((cm) => {
                  const moduleAssignments = cumulativeAssignments.filter(
                    a => a.moduleId === cm.module.id
                  );
                  if (moduleAssignments.length === 0) return null;

                  const moduleEnabled = isModuleEnabled(cm.module.id);
                  const isExpanded = expandedModules[cm.module.id] !== false; // Default to expanded
                  const enabledCount = moduleAssignments.filter(
                    a => isAssignmentEnabled(a.moduleId, a.assignmentIndex)
                  ).length;

                  return (
                    <Collapsible
                      key={cm.module.id}
                      open={isExpanded}
                      onOpenChange={() => toggleModuleExpanded(cm.module.id)}
                      className="border rounded-lg"
                    >
                      <CollapsibleTrigger asChild>
                        <button
                          className={`w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors rounded-t-lg ${
                            !moduleEnabled ? "opacity-60" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className={`text-sm font-medium ${!moduleEnabled ? "text-muted-foreground" : ""}`}>
                              {cm.module.title}
                            </span>
                            {!moduleEnabled && (
                              <Badge variant="secondary" className="text-xs">disabled</Badge>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {enabledCount}/{moduleAssignments.length} selected
                          </Badge>
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="space-y-2 p-3 pt-0 border-t">
                          {moduleAssignments.map((assignment) => {
                            const enabled = isAssignmentEnabled(
                              assignment.moduleId,
                              assignment.assignmentIndex
                            );

                            return (
                              <div
                                key={`${assignment.moduleId}-${assignment.assignmentIndex}`}
                                className={`flex items-start gap-3 p-2 rounded-md ${
                                  moduleEnabled ? "hover:bg-muted/30" : "opacity-40"
                                }`}
                              >
                                <Checkbox
                                  checked={enabled}
                                  disabled={!moduleEnabled}
                                  onCheckedChange={(checked) =>
                                    toggleAssignment(
                                      assignment.moduleId,
                                      assignment.assignmentIndex,
                                      checked as boolean
                                    )
                                  }
                                />
                                <div className="flex-1">
                                  <p className={`text-sm ${enabled ? "" : "text-muted-foreground"}`}>
                                    {assignment.title}
                                  </p>
                                  {assignment.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                      {assignment.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => saveSettings()}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Preferences
          </Button>
          <AddToCourseGroupButton courseId={course.id} />
        </div>
      </div>
    </AppSidebar>
  );
}
