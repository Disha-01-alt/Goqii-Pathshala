import JSZip from "jszip";

export interface SlideNote {
  slideNumber: number;
  text: string;
}

/**
 * Extract speaker notes from a .pptx file (client-side).
 * Returns one entry per slide that has non-empty notes.
 */
export async function extractPptxSpeakerNotes(file: File): Promise<SlideNote[]> {
  const name = file.name.toLowerCase();
  if (!name.endsWith(".pptx")) {
    // Legacy .ppt is a binary OLE format — not parseable in-browser.
    return [];
  }

  const zip = await JSZip.loadAsync(file);

  // Read presentation.xml.rels to map slideId -> slide file -> notesSlide file
  // Simpler: iterate notesSlide{N}.xml and parse rId mapping via notesSlide _rels.
  // We rely on the convention that notesSlideN.xml corresponds to slideN.xml.
  const notes: SlideNote[] = [];

  // Collect all notesSlide files in order
  const noteFiles = Object.keys(zip.files)
    .filter((p) => /^ppt\/notesSlides\/notesSlide(\d+)\.xml$/i.test(p))
    .sort((a, b) => {
      const ai = parseInt(a.match(/notesSlide(\d+)\.xml$/i)![1], 10);
      const bi = parseInt(b.match(/notesSlide(\d+)\.xml$/i)![1], 10);
      return ai - bi;
    });

  for (const path of noteFiles) {
    const match = path.match(/notesSlide(\d+)\.xml$/i)!;
    const slideNumber = parseInt(match[1], 10);
    const xml = await zip.files[path].async("text");
    const text = extractNotesText(xml);
    if (text.trim().length > 0) {
      notes.push({ slideNumber, text: text.trim() });
    }
  }

  return notes;
}

/**
 * Get slide count from a .pptx file.
 */
export async function getPptxSlideCount(file: File): Promise<number> {
  const name = file.name.toLowerCase();
  if (!name.endsWith(".pptx")) return 0;
  const zip = await JSZip.loadAsync(file);
  const slides = Object.keys(zip.files).filter((p) =>
    /^ppt\/slides\/slide\d+\.xml$/i.test(p)
  );
  return slides.length;
}

/**
 * Pull every <a:t>...</a:t> text run from notes XML, but skip placeholders
 * with type="sldNum" (the slide-number footer).
 */
function extractNotesText(xml: string): string {
  // Drop <p:sp> blocks whose nvSpPr/nvPr/ph has type="sldNum"
  const cleaned = xml.replace(
    /<p:sp\b[\s\S]*?<\/p:sp>/g,
    (sp) => (/type="sldNum"/.test(sp) ? "" : sp)
  );

  const parts: string[] = [];
  const re = /<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned)) !== null) {
    parts.push(decodeXmlEntities(m[1]));
  }
  // Preserve paragraph breaks roughly via <a:p> boundaries:
  // We split by paragraph too:
  const byPara: string[] = [];
  const paraRe = /<a:p\b[\s\S]*?<\/a:p>/g;
  let p: RegExpExecArray | null;
  while ((p = paraRe.exec(cleaned)) !== null) {
    const inner = p[0];
    const tParts: string[] = [];
    const tRe = /<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g;
    let t: RegExpExecArray | null;
    while ((t = tRe.exec(inner)) !== null) tParts.push(decodeXmlEntities(t[1]));
    const line = tParts.join("").trim();
    if (line) byPara.push(line);
  }
  return byPara.length ? byPara.join("\n") : parts.join(" ");
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}
