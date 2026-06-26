import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSaveModule } from "@/hooks/useSaveModule";
import { useModuleApproval } from "@/hooks/useModuleApproval";
import { TagSelector } from "./TagSelector";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Globe, Lock, Send } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";

interface Chapter {
  title: string;
  content: string;
  imageUrl?: string;
}

interface QuizQuestion {
  chapterIndex: number;
  type: string;
  question: string;
  options?: string[];
  correctAnswer: number | string | boolean;
  explanation: string;
}

interface ModuleSaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module: {
    id?: string;
    title: string;
    slides: any;
  };
  existingData?: {
    description?: string;
    isFavorite?: boolean;
    tagIds?: string[];
    visibility?: "public" | "private";
  };
  moduleType?: string;
}

export function ModuleSaveDialog({ open, onOpenChange, module, existingData, moduleType = "presentation" }: ModuleSaveDialogProps) {
  const [title, setTitle] = useState(module.title);
  const [description, setDescription] = useState(existingData?.description || "");
  const [isFavorite, setIsFavorite] = useState(existingData?.isFavorite || false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(existingData?.tagIds || []);
  const [visibility, setVisibility] = useState<"public" | "private">(existingData?.visibility || "private");
  const { saveModuleAsync, isSaving } = useSaveModule();
  const { submitForReview, isSubmitting } = useModuleApproval();
  const { isSME, isAdmin } = useUserRole();
  
  const isProcessing = isSaving || isSubmitting;

  useEffect(() => {
    setTitle(module.title);
    setDescription(existingData?.description || "");
    setIsFavorite(existingData?.isFavorite || false);
    setSelectedTagIds(existingData?.tagIds || []);
    setVisibility(existingData?.visibility || "private");
  }, [module, existingData]);

  const getThumbnailUrl = () => {
    // Handle new format with sections (document/textbook)
    if ('sections' in module.slides && Array.isArray(module.slides.sections)) {
      return module.slides.sections[0]?.imageUrl || null;
    }
    // Handle new format with chapters (presentation)
    if ('chapters' in module.slides && Array.isArray(module.slides.chapters)) {
      return module.slides.chapters[0]?.imageUrl || null;
    }
    // Handle legacy array format
    if (Array.isArray(module.slides)) {
      return module.slides[0]?.imageUrl || null;
    }
    return null;
  };

  const stripSpeakerNotes = (slides: any) => {
    // Handle new format with chapters (presentation)
    if (slides && 'chapters' in slides && Array.isArray(slides.chapters)) {
      return {
        ...slides,
        chapters: slides.chapters.map((ch: any) => {
          const { speakerNotes, ...rest } = ch;
          return rest;
        }),
      };
    }
    // Handle legacy array format
    if (Array.isArray(slides)) {
      return slides.map((slide: any) => {
        const { speakerNotes, ...rest } = slide;
        return rest;
      });
    }
    return slides;
  };

  const handleSubmitForReview = async () => {
    const thumbnailUrl = getThumbnailUrl();
    const strippedSlides = stripSpeakerNotes(module.slides);
    
    try {
      // First save the module
      const result = await saveModuleAsync({
        id: module.id,
        title,
        description,
        slides: strippedSlides as any,
        thumbnailUrl,
        isFavorite,
        tagIds: selectedTagIds,
        moduleType,
        visibility,
      });
      
      // Then submit for review
      if (result?.id) {
        submitForReview(result.id);
        toast.success("Module submitted for review!");
      }
      
      onOpenChange(false);
    } catch (error) {
      // Error already handled by useSaveModule
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{module.id ? "Update Module" : "Save Module"}</DialogTitle>
          <DialogDescription>
            Add details to organize your learning module
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Module title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this module"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Tags</Label>
            <TagSelector
              selectedTagIds={selectedTagIds}
              onTagsChange={setSelectedTagIds}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="favorite">Add to favorites</Label>
            <Switch
              id="favorite"
              checked={isFavorite}
              onCheckedChange={setIsFavorite}
            />
          </div>
          {(isSME || isAdmin) && (
            <div className="space-y-2">
              <Label>Visibility</Label>
              <RadioGroup value={visibility} onValueChange={(val) => setVisibility(val as "public" | "private")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="private" id="private" />
                  <Label htmlFor="private" className="flex items-center gap-2 cursor-pointer">
                    <Lock className="h-4 w-4" />
                    Private - Only you can see this module
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="public" id="public" />
                  <Label htmlFor="public" className="flex items-center gap-2 cursor-pointer">
                    <Globe className="h-4 w-4" />
                    Public - Managers with access can use this module
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitForReview} disabled={isProcessing || !title.trim()}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {module.id ? "Update & Resubmit" : "Submit for Review"}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
