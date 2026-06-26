import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, FileText, ExternalLink, AlertCircle, CheckCircle } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

interface UploadedDocumentDisplayProps {
  module: {
    title: string;
    fileUrl: string;
    fileName?: string;
  };
  savedModuleId?: string;
  onModuleComplete?: () => void;
}

export default function UploadedDocumentDisplay({ module, onModuleComplete }: UploadedDocumentDisplayProps) {
  const [loadError, setLoadError] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const { isAdmin } = useUserRole();

  const handleMarkComplete = () => {
    setIsCompleted(true);
    onModuleComplete?.();
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = module.fileUrl;
    link.download = module.fileName || "document";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInNewTab = () => {
    window.open(module.fileUrl, "_blank");
  };

  const getFileExtension = () => {
    if (module.fileName) {
      return module.fileName.split(".").pop()?.toLowerCase() || "doc";
    }
    return "doc";
  };

  // Use Google Docs Viewer for inline display
  const getViewerUrl = () => {
    const encodedUrl = encodeURIComponent(module.fileUrl);
    return `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`;
  };

  const extension = getFileExtension();
  const canDisplayInline = ["doc", "docx", "txt", "rtf", "pdf"].includes(extension);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-lg font-bold text-foreground">{module.title}</h1>
          {module.fileName && (
            <p className="text-xs text-muted-foreground">{module.fileName}</p>
          )}
        </div>
        
        {/* Controls - Admin only */}
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleOpenInNewTab}>
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Open
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Download
            </Button>
          </div>
        )}
      </div>

      {/* Document Viewer - Inline Display */}
      {canDisplayInline ? (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div 
              className="relative bg-muted"
              style={{ height: "calc(100vh - 250px)", minHeight: "500px" }}
            >
              <iframe
                src={getViewerUrl()}
                className="w-full h-full border-0"
                title={module.title}
                onError={() => setLoadError(true)}
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Fallback for unsupported formats */
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center text-center">
              <div className="h-24 w-24 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <FileText className="h-12 w-12 text-primary" />
              </div>
              <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground mb-6">
                {extension.toUpperCase()} File
              </span>
              <p className="text-muted-foreground mb-8 max-w-md">
                This document format cannot be displayed inline. Please download to view.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error/Fallback Message */}
      {loadError && (
        <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-600">
              {isAdmin 
                ? "Having trouble viewing? Use the buttons above to open or download the file."
                : "Having trouble viewing? Please contact an administrator."}
            </p>
          </div>
        </div>
      )}

      {/* Fallback Info */}
      <div className="mt-3 p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            {isAdmin 
              ? "If the document doesn't load, download it to view locally."
              : "If the document doesn't load, please contact an administrator."}
          </p>
        </div>
      </div>

      {/* Mark Complete Button */}
      {onModuleComplete && (
        <div className="mt-4 flex justify-center">
          <Button
            onClick={handleMarkComplete}
            disabled={isCompleted}
            variant={isCompleted ? "outline" : "default"}
            className="gap-2"
          >
            <CheckCircle className="h-5 w-5" />
            {isCompleted ? "Document Completed" : "I've Finished Reading"}
          </Button>
        </div>
      )}
    </div>
  );
}
