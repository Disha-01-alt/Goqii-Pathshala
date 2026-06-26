import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface PendingModule {
  id: string;
  title: string;
  description: string | null;
  module_type: string;
  visibility: string;
  approval_status: string;
  submitted_for_review_at: string | null;
  submitted_by: string | null;
  created_at: string;
  updated_at: string;
  formatted_output: any | null;
  quiz_data: any | null;
  assignment_data: any | null;
  creator?: {
    id: string;
    full_name: string | null;
    email: string;
  };
}

export interface ReviewedModule {
  id: string;
  title: string;
  description: string | null;
  module_type: string;
  approval_status: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  created_at: string;
  creator?: {
    id: string;
    full_name: string | null;
    email: string;
  };
  reviewer?: {
    id: string;
    full_name: string | null;
    email: string;
  };
}

export function useModuleApproval() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch modules pending review (for SME Expert)
  const { data: pendingModules = [], isLoading: isLoadingPending } = useQuery({
    queryKey: ["pending-modules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select(`
          id,
          title,
          description,
          module_type,
          visibility,
          approval_status,
          submitted_for_review_at,
          submitted_by,
          created_at,
          updated_at,
          formatted_output,
          quiz_data,
          assignment_data,
          profiles:user_id (
            id,
            full_name,
            email
          )
        `)
        .eq("approval_status", "pending_review")
        .order("submitted_for_review_at", { ascending: true });

      if (error) throw error;
      return (data || []).map(m => ({
        ...m,
        creator: m.profiles as { id: string; full_name: string | null; email: string } | undefined
      })) as PendingModule[];
    },
    enabled: !!user,
  });

  // Fetch review stats for SME Expert (approved/rejected counts)
  const { data: reviewStats } = useQuery({
    queryKey: ["review-stats", user?.id],
    queryFn: async () => {
      // Get modules reviewed by this user
      const { data: approvedData, error: approvedError } = await supabase
        .from("modules")
        .select("id, reviewed_at", { count: "exact" })
        .eq("reviewed_by", user!.id)
        .eq("approval_status", "approved");

      if (approvedError) throw approvedError;

      const { data: rejectedData, error: rejectedError } = await supabase
        .from("modules")
        .select("id, reviewed_at", { count: "exact" })
        .eq("reviewed_by", user!.id)
        .eq("approval_status", "rejected");

      if (rejectedError) throw rejectedError;

      // Calculate today's and this week's reviews
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const allReviewed = [...(approvedData || []), ...(rejectedData || [])];
      const reviewedToday = allReviewed.filter(m => 
        m.reviewed_at && new Date(m.reviewed_at) >= today
      ).length;
      const reviewedThisWeek = allReviewed.filter(m => 
        m.reviewed_at && new Date(m.reviewed_at) >= weekAgo
      ).length;

      return {
        approved: approvedData?.length || 0,
        rejected: rejectedData?.length || 0,
        total: (approvedData?.length || 0) + (rejectedData?.length || 0),
        reviewedToday,
        reviewedThisWeek,
      };
    },
    enabled: !!user,
  });

  // Fetch reviewed modules (approved) by this SME Expert
  const { data: approvedModules = [], isLoading: isLoadingApproved } = useQuery({
    queryKey: ["approved-modules", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select(`
          id,
          title,
          description,
          module_type,
          approval_status,
          reviewed_at,
          reviewed_by,
          review_notes,
          created_at,
          profiles:user_id (
            id,
            full_name,
            email
          )
        `)
        .eq("reviewed_by", user!.id)
        .eq("approval_status", "approved")
        .order("reviewed_at", { ascending: false });

      if (error) throw error;
      
      // Fetch reviewer info separately
      const reviewerIds = [...new Set((data || []).map(m => m.reviewed_by).filter(Boolean))];
      let reviewerMap: Record<string, { id: string; full_name: string | null; email: string }> = {};
      
      if (reviewerIds.length > 0) {
        const { data: reviewers } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", reviewerIds);
        
        reviewerMap = (reviewers || []).reduce((acc, r) => {
          acc[r.id] = r;
          return acc;
        }, {} as Record<string, { id: string; full_name: string | null; email: string }>);
      }
      
      return (data || []).map(m => ({
        ...m,
        creator: m.profiles as { id: string; full_name: string | null; email: string } | undefined,
        reviewer: m.reviewed_by ? reviewerMap[m.reviewed_by] : undefined
      })) as ReviewedModule[];
    },
    enabled: !!user,
  });

  // Fetch reviewed modules (rejected) by this SME Expert
  const { data: rejectedModules = [], isLoading: isLoadingRejected } = useQuery({
    queryKey: ["rejected-modules", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select(`
          id,
          title,
          description,
          module_type,
          approval_status,
          reviewed_at,
          reviewed_by,
          review_notes,
          created_at,
          profiles:user_id (
            id,
            full_name,
            email
          )
        `)
        .eq("reviewed_by", user!.id)
        .eq("approval_status", "rejected")
        .order("reviewed_at", { ascending: false });

      if (error) throw error;
      
      // Fetch reviewer info separately
      const reviewerIds = [...new Set((data || []).map(m => m.reviewed_by).filter(Boolean))];
      let reviewerMap: Record<string, { id: string; full_name: string | null; email: string }> = {};
      
      if (reviewerIds.length > 0) {
        const { data: reviewers } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", reviewerIds);
        
        reviewerMap = (reviewers || []).reduce((acc, r) => {
          acc[r.id] = r;
          return acc;
        }, {} as Record<string, { id: string; full_name: string | null; email: string }>);
      }
      
      return (data || []).map(m => ({
        ...m,
        creator: m.profiles as { id: string; full_name: string | null; email: string } | undefined,
        reviewer: m.reviewed_by ? reviewerMap[m.reviewed_by] : undefined
      })) as ReviewedModule[];
    },
    enabled: !!user,
  });

  // Fetch user's own modules with their approval status (for SME)
  const { data: myModulesStatus = [], isLoading: isLoadingMyModules } = useQuery({
    queryKey: ["my-modules-status"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select(`
          id,
          title,
          approval_status,
          submitted_for_review_at,
          review_notes,
          reviewed_at
        `)
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Submit module for review
  const submitForReview = useMutation({
    mutationFn: async (moduleId: string) => {
      const { error } = await supabase
        .from("modules")
        .update({
          approval_status: "pending_review",
          submitted_for_review_at: new Date().toISOString(),
          submitted_by: user!.id,
        })
        .eq("id", moduleId)
        .eq("user_id", user!.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-modules-status"] });
      queryClient.invalidateQueries({ queryKey: ["pending-modules"] });
      queryClient.invalidateQueries({ queryKey: ["modules"] });
      toast.success("Module submitted for review");
    },
    onError: (error) => {
      console.error("Error submitting for review:", error);
      toast.error("Failed to submit for review");
    },
  });

  // Approve module (SME Expert)
  const approveModule = useMutation({
    mutationFn: async ({ moduleId, notes }: { moduleId: string; notes?: string }) => {
      const { error } = await supabase
        .from("modules")
        .update({
          approval_status: "approved",
          is_published: true,
          reviewed_by: user!.id,
          reviewed_at: new Date().toISOString(),
          review_notes: notes || null,
        })
        .eq("id", moduleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-modules"] });
      queryClient.invalidateQueries({ queryKey: ["modules"] });
      queryClient.invalidateQueries({ queryKey: ["review-stats"] });
      queryClient.invalidateQueries({ queryKey: ["approved-modules"] });
      toast.success("Module approved and published");
    },
    onError: (error) => {
      console.error("Error approving module:", error);
      toast.error("Failed to approve module");
    },
  });

  // Reject module (SME Expert)
  const rejectModule = useMutation({
    mutationFn: async ({ moduleId, notes }: { moduleId: string; notes: string }) => {
      const { error } = await supabase
        .from("modules")
        .update({
          approval_status: "rejected",
          reviewed_by: user!.id,
          reviewed_at: new Date().toISOString(),
          review_notes: notes,
        })
        .eq("id", moduleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-modules"] });
      queryClient.invalidateQueries({ queryKey: ["modules"] });
      queryClient.invalidateQueries({ queryKey: ["review-stats"] });
      queryClient.invalidateQueries({ queryKey: ["rejected-modules"] });
      toast.success("Module rejected");
    },
    onError: (error) => {
      console.error("Error rejecting module:", error);
      toast.error("Failed to reject module");
    },
  });

  return {
    pendingModules,
    isLoadingPending,
    approvedModules,
    isLoadingApproved,
    rejectedModules,
    isLoadingRejected,
    myModulesStatus,
    isLoadingMyModules,
    reviewStats,
    submitForReview: submitForReview.mutate,
    isSubmitting: submitForReview.isPending,
    approveModule: approveModule.mutate,
    isApproving: approveModule.isPending,
    rejectModule: rejectModule.mutate,
    isRejecting: rejectModule.isPending,
  };
}