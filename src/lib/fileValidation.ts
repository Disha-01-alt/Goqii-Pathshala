export type FileContext =
  | "assessment"
  | "module-video"
  | "module-ppt"
  | "module-pdf"
  | "module-document"
  | "image";

export const ALLOWED_MIME_TYPES: Record<FileContext, string[]> = {
  assessment: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
    "video/mp4",
    "video/webm",
    "video/quicktime",
  ],
  "module-video": ["video/mp4", "video/webm", "video/quicktime"],
  "module-ppt": [
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
  "module-pdf": ["application/pdf"],
  "module-document": [
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "application/rtf",
  ],
  image: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"],
};

export const MAX_FILE_SIZES: Record<FileContext, number> = {
  assessment: 50 * 1024 * 1024, // 50MB
  "module-video": 100 * 1024 * 1024, // 100MB
  "module-ppt": 100 * 1024 * 1024,
  "module-pdf": 100 * 1024 * 1024,
  "module-document": 100 * 1024 * 1024,
  image: 5 * 1024 * 1024, // 5MB
};

export const MAX_FILE_SIZE_LABELS: Record<FileContext, string> = {
  assessment: "50MB",
  "module-video": "100MB",
  "module-ppt": "100MB",
  "module-pdf": "100MB",
  "module-document": "100MB",
  image: "5MB",
};

export function validateFile(
  file: File,
  context: FileContext
): { valid: boolean; error?: string } {
  const allowedTypes = ALLOWED_MIME_TYPES[context];
  const maxSize = MAX_FILE_SIZES[context];
  const sizeLabel = MAX_FILE_SIZE_LABELS[context];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type "${file.type || "unknown"}" is not allowed. Accepted types: ${allowedTypes.join(", ")}`,
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the ${sizeLabel} limit`,
    };
  }

  return { valid: true };
}

const UPLOAD_TYPE_TO_CONTEXT: Record<string, FileContext> = {
  video: "module-video",
  ppt: "module-ppt",
  pdf: "module-pdf",
  uploaded_document: "module-document",
};

export function getModuleFileContext(uploadType: string): FileContext {
  return UPLOAD_TYPE_TO_CONTEXT[uploadType] || "module-document";
}
