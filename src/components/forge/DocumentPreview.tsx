import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, CheckCircle } from "lucide-react";

function sanitizeText(text: string): string {
  if (!text) return text;
  return text
    .replace(/\[Image:\s*[^\]]*\]\s*/gi, '')
    .replace(/\[Icon:\s*[^\]]*\]\s*/gi, '')
    .replace(/\[Visual:\s*[^\]]*\]\s*/gi, '')
    .replace(/^Prompt:\s*.*/gm, '')
    .replace(/^Style:\s*.*/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}


interface DocumentSection {
  sectionTitle?: string;
  definitions?: string[];
  content: string;
  recapBox?: string;
  imageUrl?: string;
}

interface DocumentContent {
  title?: string;
  sections?: DocumentSection[];
}

interface DocumentPreviewProps {
  content: DocumentContent | any;
}

export default function DocumentPreview({ content }: DocumentPreviewProps) {
  if (!content || (typeof content === 'object' && Object.keys(content).length === 0)) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No document content generated yet
      </div>
    );
  }

  // Handle string content
  if (typeof content === 'string') {
    return (
      <ScrollArea className="h-[400px] pr-4">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <div className="whitespace-pre-wrap">{content}</div>
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-6">
        {/* Document Title */}
        {content.title && (
          <div className="flex items-center gap-3 border-b pb-4">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">{content.title}</h1>
          </div>
        )}

        {/* Sections */}
        {content.sections?.map((section: DocumentSection, idx: number) => (
          <Card key={idx} className="border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              {section.sectionTitle && (
                <CardTitle className="text-lg">{section.sectionTitle}</CardTitle>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Definitions */}
              {section.definitions && section.definitions.length > 0 && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="font-medium text-sm mb-2">Key Terms:</p>
                  <ul className="space-y-1">
                    {section.definitions.map((def, defIdx) => (
                      <li key={defIdx} className="text-sm flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>{def}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Section Image */}
              {section.imageUrl && (
                <div className="rounded-lg overflow-hidden my-4">
                  <img 
                    src={section.imageUrl} 
                    alt={section.sectionTitle || `Section ${idx + 1}`} 
                    className="w-full h-40 object-cover"
                  />
                </div>
              )}

              {/* Content */}
              <p className="text-foreground leading-relaxed">{sanitizeText(section.content)}</p>

              {/* Recap Box */}
              {section.recapBox && (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-800 dark:text-green-300 text-sm">
                      Key Takeaway
                    </span>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    {sanitizeText(section.recapBox)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
