import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { validateFile } from "@/lib/fileValidation";
import {
  SubmittedFile,
  useSubmitModuleAssignment,
  ModuleAssignmentStatus,
} from "@/hooks/useModuleAssignmentSubmissions";

interface ModuleAssignmentSubmitterProps {
  moduleAssignmentId: string;
  moduleId: string;
  courseId: string;
  status: ModuleAssignmentStatus;
  existingResponseText?: string | null;
  existingFiles?: SubmittedFile[];
  managerComments?: string | null;
  score?: number | null;
  maxScore?: number;
  onSubmitted?: () => void;
}

export function ModuleAssignmentSubmitter({
  moduleAssignmentId,
  moduleId,
  courseId,
  status,
  existingResponseText,
  existingFiles,
  managerComments,
  score,
  maxScore = 100,
  onSubmitted,
}: ModuleAssignmentSubmitterProps) {
  const [responseText, setResponseText] = useState(existingResponseText || "");
  const [files, setFiles] = useState<SubmittedFile[]>(existingFiles || []);
  const [uploading, setUploading] = useState(false);
  const submit = useSubmitModuleAssignment();
  const { toast } = useToast();

  const isLocked = status === "graded";

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected?.length) return;
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");
      const uploaded: SubmittedFile[] = [];
      for (const file of Array.from(selected)) {
        const validation = validateFile(file, "assessment");
        if (!validation.valid) {
          toast({ title: "File rejected", description: validation.error, variant: "destructive" });
          continue;
        }
        const ext = file.name.split(".").pop();
        const path = `${userData.user.id}/module-assignments/${moduleAssignmentId}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("module-files").upload(path, file);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from("module-files").getPublicUrl(path);
        uploaded.push({ name: file.name, url: urlData.publicUrl });
      }
      setFiles((prev) => [...prev, ...uploaded]);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!responseText.trim() && files.length === 0) {
      toast({
        title: "Please add a response",
        description: "Add text or upload a file to submit",
        variant: "destructive",
      });
      return;
    }
    await submit.mutateAsync({
      moduleAssignmentId,
      moduleId,
      courseId,
      responseText: responseText || undefined,
      files: files.length > 0 ? files : undefined,
    });
    onSubmitted?.();
  };

  return (
    <div className="space-y-4 mt-4 border-t pt-4">
      {status === "graded" && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-[hsl(var(--success))]/10 text-sm">
          <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
          <span className="font-medium">Graded</span>
          <Badge variant="default">{score ?? 0}/{maxScore}</Badge>
        </div>
      )}
      {status === "needs_revision" && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-sm">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="font-medium">Needs revision</span>
        </div>
      )}
      {status === "submitted" && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-blue-500/10 text-sm">
          <CheckCircle2 className="h-4 w-4 text-blue-500" />
          <span className="font-medium">Submitted — awaiting review</span>
        </div>
      )}
      {managerComments && (
        <div className="p-3 rounded-md bg-muted/50">
          <Label className="text-xs">Manager feedback</Label>
          <p className="text-sm mt-1 whitespace-pre-wrap">{managerComments}</p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor={`resp-${moduleAssignmentId}`}>Your response</Label>
        <Textarea
          id={`resp-${moduleAssignmentId}`}
          value={responseText}
          onChange={(e) => setResponseText(e.target.value)}
          placeholder="Write your response..."
          rows={4}
          disabled={isLocked}
        />
      </div>

      <div className="space-y-2">
        <Label>Attach files</Label>
        <div className="border-2 border-dashed rounded-lg p-4 text-center">
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,image/*,audio/*,video/*"
            onChange={handleFileUpload}
            className="hidden"
            id={`file-${moduleAssignmentId}`}
            disabled={uploading || isLocked}
          />
          <label htmlFor={`file-${moduleAssignmentId}`} className="cursor-pointer flex flex-col items-center gap-1 text-muted-foreground">
            {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
            <span className="text-xs">{uploading ? "Uploading..." : "Click to upload"}</span>
          </label>
        </div>
        {files.length > 0 && (
          <div className="space-y-1">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm">
                <FileText className="h-4 w-4 shrink-0" />
                <a href={f.url} target="_blank" rel="noopener noreferrer" className="flex-1 truncate text-primary hover:underline">{f.name}</a>
                {!isLocked && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {!isLocked && (
        <Button onClick={handleSubmit} disabled={submit.isPending} className="w-full">
          {submit.isPending ? "Submitting..." : status === "submitted" || status === "needs_revision" ? "Resubmit" : "Submit Assignment"}
        </Button>
      )}
    </div>
  );
}
