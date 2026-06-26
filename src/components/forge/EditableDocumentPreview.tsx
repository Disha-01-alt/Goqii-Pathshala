import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, CheckCircle, Plus, Trash2 } from "lucide-react";
import EditableText, { TextStyle } from "./EditableText";
import EditableImage from "./EditableImage";
import FormatToolbar from "./FormatToolbar";

interface DocumentSection {
  sectionTitle?: string;
  definitions?: string[];
  content: string;
  recapBox?: string;
  imageUrl?: string;
  imageSuggestion?: string;
  hideImage?: boolean;
  titleStyle?: TextStyle;
  contentStyle?: TextStyle;
}

interface DocumentContent {
  title?: string;
  sections?: DocumentSection[];
  titleStyle?: TextStyle;
}

interface EditableDocumentPreviewProps {
  content: DocumentContent | any;
  onContentChange: (content: DocumentContent) => void;
}

export default function EditableDocumentPreview({ content, onContentChange }: EditableDocumentPreviewProps) {
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const [sectionStyle, setSectionStyle] = useState<TextStyle>({ fontSize: "normal", textAlign: "left" });

  if (!content || (typeof content === "object" && Object.keys(content).length === 0)) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No document content generated yet
      </div>
    );
  }

  if (typeof content === "string") {
    return (
      <ScrollArea className="h-[500px] pr-4">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <div className="whitespace-pre-wrap">{content}</div>
        </div>
      </ScrollArea>
    );
  }

  const sections = content.sections || [];

  const updateSection = (index: number, updates: Partial<DocumentSection>) => {
    const newSections = [...sections];
    newSections[index] = { ...newSections[index], ...updates };
    onContentChange({ ...content, sections: newSections });
  };

  const updateDefinition = (sectionIndex: number, defIndex: number, newValue: string) => {
    const newSections = [...sections];
    const newDefs = [...(newSections[sectionIndex].definitions || [])];
    newDefs[defIndex] = newValue;
    newSections[sectionIndex] = { ...newSections[sectionIndex], definitions: newDefs };
    onContentChange({ ...content, sections: newSections });
  };

  const addDefinition = (sectionIndex: number) => {
    const newSections = [...sections];
    const newDefs = [...(newSections[sectionIndex].definitions || []), "New definition"];
    newSections[sectionIndex] = { ...newSections[sectionIndex], definitions: newDefs };
    onContentChange({ ...content, sections: newSections });
  };

  const removeDefinition = (sectionIndex: number, defIndex: number) => {
    const newSections = [...sections];
    const newDefs = [...(newSections[sectionIndex].definitions || [])];
    newDefs.splice(defIndex, 1);
    newSections[sectionIndex] = { ...newSections[sectionIndex], definitions: newDefs };
    onContentChange({ ...content, sections: newSections });
  };

  const addSection = () => {
    const newSection: DocumentSection = {
      sectionTitle: "New Section",
      content: "Add your content here...",
      definitions: [],
    };
    onContentChange({ ...content, sections: [...sections, newSection] });
  };

  const removeSection = (index: number) => {
    const newSections = sections.filter((_: DocumentSection, i: number) => i !== index);
    onContentChange({ ...content, sections: newSections });
  };

  return (
    <ScrollArea className="h-[500px] pr-4">
      <div className="space-y-6">
        {/* Document Title */}
        <div className="flex items-center gap-3 border-b pb-4">
          <BookOpen className="h-6 w-6 text-primary" />
          <EditableText
            value={content.title || "Untitled Document"}
            onChange={(title) => onContentChange({ ...content, title })}
            as="h1"
            className="text-2xl font-bold flex-1"
            placeholder="Document Title"
            style={content.titleStyle}
          />
        </div>

        {/* Format Toolbar */}
        {selectedSection !== null && (
          <FormatToolbar
            style={sectionStyle}
            onStyleChange={setSectionStyle}
          />
        )}

        {/* Sections */}
        {sections.map((section: DocumentSection, idx: number) => (
          <Card
            key={idx}
            className={`border-l-4 border-l-primary transition-all cursor-pointer ${
              selectedSection === idx ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => setSelectedSection(idx)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <EditableText
                  value={section.sectionTitle || ""}
                  onChange={(title) => updateSection(idx, { sectionTitle: title })}
                  as="h2"
                  className="text-lg font-semibold"
                  placeholder="Section Title"
                  style={selectedSection === idx ? sectionStyle : section.titleStyle}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSection(idx);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Definitions */}
              {(section.definitions?.length || 0) > 0 && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="font-medium text-sm mb-2">Key Terms:</p>
                  <ul className="space-y-1">
                    {section.definitions?.map((def: string, defIdx: number) => (
                      <li key={defIdx} className="text-sm flex items-start gap-2 group">
                        <span className="text-primary mt-0.5">•</span>
                        <EditableText
                          value={def}
                          onChange={(newValue) => updateDefinition(idx, defIdx, newValue)}
                          as="span"
                          className="flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeDefinition(idx, defIdx);
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      addDefinition(idx);
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add definition
                  </Button>
                </div>
              )}

              {/* Section Image */}
              {!section.hideImage && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Section Image</p>
                  <EditableImage
                    imageUrl={section.imageUrl}
                    onImageChange={(url) => updateSection(idx, { imageUrl: url || undefined })}
                    alt={section.sectionTitle || `Section ${idx + 1}`}
                    aspectRatio="video"
                    imageSuggestion={section.imageSuggestion}
                    contextLabel={section.sectionTitle}
                    onRemoveSlot={() => updateSection(idx, { hideImage: true, imageUrl: undefined })}
                  />
                </div>
              )}

              {/* Content */}
              <EditableText
                value={section.content || ""}
                onChange={(content) => updateSection(idx, { content })}
                as="p"
                className="text-foreground leading-relaxed"
                placeholder="Section content..."
                style={selectedSection === idx ? sectionStyle : section.contentStyle}
                multiline
              />

              {/* Recap Box */}
              {section.recapBox !== undefined && (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-800 dark:text-green-300 text-sm">
                      Key Takeaway
                    </span>
                  </div>
                  <EditableText
                    value={section.recapBox || ""}
                    onChange={(recap) => updateSection(idx, { recapBox: recap })}
                    as="p"
                    className="text-sm text-green-700 dark:text-green-400"
                    placeholder="Add a key takeaway..."
                    multiline
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {/* Add Section Button */}
        <Button variant="outline" onClick={addSection} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Section
        </Button>
      </div>
    </ScrollArea>
  );
}
