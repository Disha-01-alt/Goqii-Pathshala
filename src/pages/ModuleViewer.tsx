import { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ModuleRouter from "@/components/ModuleRouter";
import VideoGenerationProgress from "@/components/VideoGenerationProgress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2, Calendar, User, FileText, Presentation, BookOpen, Video, HelpCircle, Globe, Lock, Tag, Send, Clock, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { AppSidebar } from "@/components/AppSidebar";
import { useModuleApproval } from "@/hooks/useModuleApproval";
import { useAuth } from "@/hooks/useAuth";

interface RouteState {
  module?: any;
  moduleType?: string;
}

// Helper to check if a string is a valid UUID format
const isValidUUID = (str: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

const moduleTypeConfig: Record<string, { label: string; icon: typeof FileText }> = {
  document: { label: "Document", icon: FileText },
  presentation: { label: "Presentation", icon: Presentation },
  textbook: { label: "Textbook", icon: BookOpen },
  video: { label: "Video", icon: Video },
  explain_video: { label: "Explain Mode", icon: Video },
  quiz: { label: "Quiz", icon: HelpCircle },
};

const approvalStatusConfig: Record<string, { label: string; className: string; icon: typeof Clock }> = {
  draft: { label: "Draft", className: "border-muted-foreground/50 text-muted-foreground bg-muted/50", icon: FileText },
  pending_review: { label: "Pending Review", className: "border-amber-500 text-amber-600 bg-amber-50", icon: Clock },
  approved: { label: "Approved", className: "border-green-500 text-green-600 bg-green-50", icon: CheckCircle },
  rejected: { label: "Rejected", className: "border-destructive text-destructive bg-destructive/10", icon: XCircle },
};

export default function ModuleViewer() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as RouteState | null;
  const { user } = useAuth();
  const { submitForReview, isSubmitting } = useModuleApproval();
  const [liveVideoUrl, setLiveVideoUrl] = useState<string | null>(null);

  // Handle freshly generated modules (not yet saved)
  const isNewModule = moduleId === 'new' && routeState?.module;

  // Check if moduleId is valid for database query
  const isValidModuleId = moduleId && moduleId !== 'new' && isValidUUID(moduleId);

  const { data: module, isLoading } = useQuery({
    queryKey: ["module", moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select(`
          *,
          module_tags (
            tag_id,
            tags (
              id,
              name,
              color
            )
          ),
          profiles:user_id (
            id,
            full_name,
            email
          )
        `)
        .eq("id", moduleId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: isValidModuleId,
  });

  // Fetch the latest completed video output for this module
  const { data: videoOutput } = useQuery({
    queryKey: ["module-video-output", moduleId],
    queryFn: async () => {
      // First check module_outputs for a completed video
      const { data: output } = await supabase
        .from("module_outputs")
        .select("video_url, status")
        .eq("module_id", moduleId!)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1);

      if (output && output.length > 0 && output[0].video_url) {
        return output[0].video_url;
      }

      // Fallback: check video_generation_jobs
      const { data: job } = await supabase
        .from("video_generation_jobs" as any)
        .select("output_video_url, status")
        .eq("module_id", moduleId!)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1);

      if (job && job.length > 0 && (job[0] as any).output_video_url) {
        return (job[0] as any).output_video_url as string;
      }

      return null;
    },
    enabled: isValidModuleId,
  });

  // If moduleId is "new" but no route state, redirect to library
  if (moduleId === 'new' && !routeState?.module) {
    return (
      <AppSidebar>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center py-16">
            <h2 className="text-xl font-semibold mb-4 text-foreground">No module data available</h2>
            <p className="text-muted-foreground mb-4">Please generate a module first.</p>
            <Button onClick={() => navigate("/library")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Library
            </Button>
          </div>
        </div>
      </AppSidebar>
    );
  }

  // For new unsaved modules, use route state directly
  if (isNewModule) {
    return (
      <AppSidebar>
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-8">
            {/* Back button */}
            <div className="mb-4">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </div>

            {/* Module info header */}
            <div className="mb-6">
              <h1 className="text-xl font-semibold text-foreground">New Module</h1>
              <p className="text-sm text-muted-foreground">Unsaved - Preview mode</p>
            </div>

            {/* Module content */}
            <ModuleRouter
              module={routeState.module}
              moduleType={routeState.moduleType || "presentation"}
            />
          </div>
        </div>
      </AppSidebar>
    );
  }

  if (isLoading) {
    return (
      <AppSidebar>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppSidebar>
    );
  }

  if (!module) {
    return (
      <AppSidebar>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center py-16">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Module not found</h2>
            <Button onClick={() => navigate("/library")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Library
            </Button>
          </div>
        </div>
      </AppSidebar>
    );
  }

  // Handle different module types
  const slides = module.slides as any;
  const moduleType = module.module_type || "presentation";
  const TypeIcon = moduleTypeConfig[moduleType]?.icon || FileText;
  const typeLabel = moduleTypeConfig[moduleType]?.label || "Module";
  const creator = module.profiles as { id: string; full_name: string | null; email: string } | null;
  
  // Approval status
  const approvalStatus = module.approval_status || "draft";
  const statusConfig = approvalStatusConfig[approvalStatus] || approvalStatusConfig.draft;
  const StatusIcon = statusConfig.icon;
  const isOwner = user?.id === module.user_id;
  const canSubmitForReview = isOwner && approvalStatus === "draft";
  
  // Normalize module data - create a unified structure that ModuleRouter can detect
  // This handles both file-based uploads and AI-generated content
  const moduleData = {
    // Basic info
    title: module.title,
    description: module.description || "",
    type: slides?.type || moduleType,
    module_type: moduleType,
    
    // Pass through slides for content detection
    slides: slides,
    
    // File-based properties (uploaded files)
    fileUrl: slides?.fileUrl,
    fileName: slides?.fileName,
    
    // AI-generated presentation properties
    chapters: slides?.chapters,
    
    // AI-generated article properties
    heroImageUrl: slides?.heroImageUrl,
    heroImageSuggestion: slides?.heroImageSuggestion,
    
    // AI-generated document properties
    sections: slides?.sections,
    definitions: slides?.definitions,
    learning_objectives: slides?.learning_objectives,
    key_points: slides?.key_points,
    content_summary: slides?.content_summary,
    recap: slides?.recap,
    summary: slides?.summary,
    
    // Video script properties
    scenes: slides?.scenes,
    explain_scenes: slides?.explain_scenes,
    total_duration: slides?.total_duration,
    resolvedVideoUrl: liveVideoUrl || videoOutput || null,
    
    // Quiz data
    quiz: slides?.quiz,
  };

  const existingData = {
    description: module.description || undefined,
    isFavorite: module.is_favorite,
    tagIds: module.module_tags?.map((mt: any) => mt.tag_id) || [],
  };

  return (
    <AppSidebar>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          {/* Back button */}
          <div className="mb-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>

          {/* Module metadata header */}
          <div className="bg-card border rounded-lg p-4 mb-6 space-y-3">
            {/* Title */}
            <h1 className="text-xl font-semibold text-foreground">{module.title}</h1>

            {/* Module details row */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Approval Status Badge */}
              <Badge 
                variant="outline" 
                className={`flex items-center gap-1 ${statusConfig.className}`}
              >
                <StatusIcon className="h-3 w-3" />
                {statusConfig.label}
              </Badge>

              {/* Type */}
              <div className="flex items-center gap-1.5 text-sm">
                <TypeIcon className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">{typeLabel}</span>
              </div>

              {/* Visibility */}
              <div className="flex items-center gap-1.5 text-sm">
                {module.visibility === "public" ? (
                  <>
                    <Globe className="h-4 w-4 text-green-500" />
                    <span className="text-muted-foreground">Public</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Private</span>
                  </>
                )}
              </div>

              {/* Dates */}
              <div className="flex items-center gap-1.5 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Updated {format(new Date(module.updated_at), "MMM d, yyyy")}
                </span>
              </div>

              {/* Creator */}
              {creator && (
                <div className="flex items-center gap-1.5 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {creator.full_name || creator.email}
                  </span>
                </div>
              )}

              {/* Submit for Review Button */}
              {canSubmitForReview && (
                <Button
                  size="sm"
                  onClick={() => submitForReview(module.id)}
                  disabled={isSubmitting}
                  className="ml-auto"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {isSubmitting ? "Submitting..." : "Submit for Review"}
                </Button>
              )}
            </div>

            {/* Description */}
            {module.description && (
              <p className="text-sm text-muted-foreground">{module.description}</p>
            )}

            {/* Tags */}
            {module.module_tags && module.module_tags.length > 0 && (
              <>
                <Separator />
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-wrap gap-1.5">
                    {module.module_tags.map((mt: any) => (
                      <Badge
                        key={mt.tags.id}
                        variant="outline"
                        style={{ borderColor: mt.tags.color, color: mt.tags.color }}
                        className="text-xs"
                      >
                        {mt.tags.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Video Generation for AI video-script modules */}
          {moduleType === "video" && slides?.scenes && Array.isArray(slides.scenes) && slides.scenes.length > 0 && (
            <div className="mb-6">
              <VideoGenerationProgress
                moduleId={module.id}
                scenes={slides.scenes}
                onVideoReady={(url) => setLiveVideoUrl(url)}
              />
            </div>
          )}

          {/* Module content (uploaded PPTX renders as a narrated slideshow,
              which handles its own build trigger + progress + playback) */}
          <ModuleRouter
            module={moduleData}
            moduleType={moduleType}
            savedModuleId={module.id}
            existingData={existingData}
          />
        </div>
      </div>
    </AppSidebar>
  );
}
