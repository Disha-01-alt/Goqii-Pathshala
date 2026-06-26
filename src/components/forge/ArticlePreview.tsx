import { ScrollArea } from "@/components/ui/scroll-area";

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

interface ArticleSection {
  heading?: string;
  subheading?: string;
  content: string;
  imageUrl?: string;
}

interface ArticleContent {
  title?: string;
  introduction?: string;
  sections?: ArticleSection[];
  conclusion?: string;
  heroImageUrl?: string;
}

interface ArticlePreviewProps {
  content: ArticleContent | any;
}

export default function ArticlePreview({ content }: ArticlePreviewProps) {
  if (!content || (typeof content === 'object' && Object.keys(content).length === 0)) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No article content generated yet
      </div>
    );
  }

  // Handle string content
  if (typeof content === 'string') {
    return (
      <ScrollArea className="h-[400px] pr-4">
        <article className="prose prose-sm dark:prose-invert max-w-none">
          <div className="whitespace-pre-wrap">{content}</div>
        </article>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-[400px] pr-4">
      <article className="prose prose-sm dark:prose-invert max-w-none space-y-4">
        {/* Title */}
        {content.title && (
          <h1 className="text-2xl font-bold text-foreground mb-4">
            {content.title}
          </h1>
        )}

        {/* Hero Image */}
        {content.heroImageUrl && (
          <div className="rounded-lg overflow-hidden mb-6">
            <img 
              src={content.heroImageUrl} 
              alt="Article hero" 
              className="w-full h-48 object-cover"
            />
          </div>
        )}

        {/* Introduction */}
        {content.introduction && (
          <div className="bg-muted/50 p-4 rounded-lg border-l-4 border-primary">
            <p className="text-muted-foreground italic">{sanitizeText(content.introduction)}</p>
          </div>
        )}

        {/* Sections */}
        {content.sections?.map((section: ArticleSection, idx: number) => (
          <section key={idx} className="space-y-2">
            {section.heading && (
              <h2 className="text-lg font-semibold text-foreground mt-6">
                {section.heading}
              </h2>
            )}
            {section.subheading && (
              <h3 className="text-base font-medium text-muted-foreground">
                {section.subheading}
              </h3>
            )}
            {section.imageUrl && (
              <div className="rounded-lg overflow-hidden my-4">
                <img 
                  src={section.imageUrl} 
                  alt={section.heading || `Section ${idx + 1}`} 
                  className="w-full h-40 object-cover"
                />
              </div>
            )}
            <p className="text-foreground leading-relaxed">{sanitizeText(section.content)}</p>
          </section>
        ))}

        {/* Conclusion */}
        {content.conclusion && (
          <div className="bg-primary/5 p-4 rounded-lg mt-6">
            <h3 className="font-semibold mb-2">Conclusion</h3>
            <p className="text-foreground">{sanitizeText(content.conclusion)}</p>
          </div>
        )}
      </article>
    </ScrollArea>
  );
}
