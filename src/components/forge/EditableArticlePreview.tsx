import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import EditableText, { TextStyle } from "./EditableText";
import EditableImage from "./EditableImage";
import FormatToolbar from "./FormatToolbar";

interface ArticleSection {
  heading?: string;
  subheading?: string;
  content: string;
  imageUrl?: string;
  imageSuggestion?: string;
  hideImage?: boolean;
  headingStyle?: TextStyle;
  contentStyle?: TextStyle;
}

interface ArticleContent {
  title?: string;
  introduction?: string;
  sections?: ArticleSection[];
  conclusion?: string;
  heroImageUrl?: string;
  heroImageSuggestion?: string;
  hideHeroImage?: boolean;
  titleStyle?: TextStyle;
}

interface EditableArticlePreviewProps {
  content: ArticleContent | any;
  onContentChange: (content: ArticleContent) => void;
}

export default function EditableArticlePreview({ content, onContentChange }: EditableArticlePreviewProps) {
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const [sectionStyle, setSectionStyle] = useState<TextStyle>({ fontSize: "normal", textAlign: "left" });

  if (!content || (typeof content === "object" && Object.keys(content).length === 0)) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No article content generated yet
      </div>
    );
  }

  if (typeof content === "string") {
    return (
      <ScrollArea className="h-[500px] pr-4">
        <article className="prose prose-sm dark:prose-invert max-w-none">
          <div className="whitespace-pre-wrap">{content}</div>
        </article>
      </ScrollArea>
    );
  }

  const sections = content.sections || [];

  const updateSection = (index: number, updates: Partial<ArticleSection>) => {
    const newSections = [...sections];
    newSections[index] = { ...newSections[index], ...updates };
    onContentChange({ ...content, sections: newSections });
  };

  const addSection = () => {
    const newSection: ArticleSection = {
      heading: "New Section",
      content: "Add your content here...",
    };
    onContentChange({ ...content, sections: [...sections, newSection] });
  };

  const removeSection = (index: number) => {
    const newSections = sections.filter((_: ArticleSection, i: number) => i !== index);
    onContentChange({ ...content, sections: newSections });
  };

  return (
    <ScrollArea className="h-[500px] pr-4">
      <article className="prose prose-sm dark:prose-invert max-w-none space-y-6">
        {/* Title */}
        <EditableText
          value={content.title || "Untitled Article"}
          onChange={(title) => onContentChange({ ...content, title })}
          as="h1"
          className="text-2xl font-bold text-foreground mb-4 not-prose"
          placeholder="Article Title"
          style={content.titleStyle}
        />

        {/* Hero Image */}
        {!content.hideHeroImage && (
          <div className="not-prose">
            <p className="text-xs font-medium text-muted-foreground mb-2">Hero Image</p>
            <EditableImage
              imageUrl={content.heroImageUrl}
              onImageChange={(url) => onContentChange({ ...content, heroImageUrl: url || undefined })}
              alt="Article hero"
              aspectRatio="wide"
              imageSuggestion={content.heroImageSuggestion}
              contextLabel={content.title}
              onRemoveSlot={() => onContentChange({ ...content, hideHeroImage: true, heroImageUrl: undefined })}
            />
          </div>
        )}

        {/* Introduction */}
        <div className="bg-muted/50 p-4 rounded-lg border-l-4 border-primary not-prose">
          <p className="text-xs font-medium text-muted-foreground mb-2">Introduction</p>
          <EditableText
            value={content.introduction || ""}
            onChange={(intro) => onContentChange({ ...content, introduction: intro })}
            as="p"
            className="text-muted-foreground italic"
            placeholder="Write your introduction..."
            multiline
          />
        </div>

        {/* Format Toolbar */}
        {selectedSection !== null && (
          <div className="not-prose">
            <FormatToolbar
              style={sectionStyle}
              onStyleChange={setSectionStyle}
            />
          </div>
        )}

        {/* Sections */}
        {sections.map((section: ArticleSection, idx: number) => (
          <section
            key={idx}
            className={`space-y-3 not-prose p-4 rounded-lg border transition-all cursor-pointer ${
              selectedSection === idx ? "ring-2 ring-primary bg-muted/30" : "hover:bg-muted/20"
            }`}
            onClick={() => setSelectedSection(idx)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <EditableText
                  value={section.heading || ""}
                  onChange={(heading) => updateSection(idx, { heading })}
                  as="h2"
                  className="text-lg font-semibold text-foreground"
                  placeholder="Section Heading"
                  style={selectedSection === idx ? sectionStyle : section.headingStyle}
                />
                {section.subheading !== undefined && (
                  <EditableText
                    value={section.subheading || ""}
                    onChange={(subheading) => updateSection(idx, { subheading })}
                    as="h3"
                    className="text-base font-medium text-muted-foreground"
                    placeholder="Subheading (optional)"
                  />
                )}
              </div>
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

            {/* Section Image */}
            {!section.hideImage && (
              <EditableImage
                imageUrl={section.imageUrl}
                onImageChange={(url) => updateSection(idx, { imageUrl: url || undefined })}
                alt={section.heading || `Section ${idx + 1}`}
                aspectRatio="video"
                imageSuggestion={section.imageSuggestion}
                contextLabel={section.heading}
                onRemoveSlot={() => updateSection(idx, { hideImage: true, imageUrl: undefined })}
              />
            )}

            {/* Section Content */}
            <EditableText
              value={section.content || ""}
              onChange={(content) => updateSection(idx, { content })}
              as="p"
              className="text-foreground leading-relaxed"
              placeholder="Section content..."
              style={selectedSection === idx ? sectionStyle : section.contentStyle}
              multiline
            />
          </section>
        ))}

        {/* Add Section Button */}
        <div className="not-prose">
          <Button variant="outline" onClick={addSection} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Section
          </Button>
        </div>

        {/* Conclusion */}
        <div className="bg-primary/5 p-4 rounded-lg not-prose">
          <p className="text-xs font-medium text-muted-foreground mb-2">Conclusion</p>
          <EditableText
            value={content.conclusion || ""}
            onChange={(conclusion) => onContentChange({ ...content, conclusion })}
            as="p"
            className="text-foreground"
            placeholder="Write your conclusion..."
            multiline
          />
        </div>
      </article>
    </ScrollArea>
  );
}
