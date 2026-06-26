import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface TextStyle {
  color?: string;
  fontSize?: "small" | "normal" | "large" | "xlarge";
  textAlign?: "left" | "center" | "right";
}

interface EditableTextProps {
  value: string;
  onChange: (newValue: string) => void;
  style?: TextStyle;
  as?: "h1" | "h2" | "h3" | "p" | "span" | "li";
  className?: string;
  placeholder?: string;
  multiline?: boolean;
}

const fontSizeClasses: Record<string, string> = {
  small: "text-sm",
  normal: "text-base",
  large: "text-lg",
  xlarge: "text-xl",
};

export default function EditableText({
  value,
  onChange,
  style,
  as = "p",
  className,
  placeholder = "Click to edit...",
  multiline = false,
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (localValue !== value) {
      onChange(localValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      handleBlur();
    }
    if (e.key === "Escape") {
      setLocalValue(value);
      setIsEditing(false);
    }
  };

  const sizeClass = style?.fontSize ? fontSizeClasses[style.fontSize] : "text-base";
  const alignClass = style?.textAlign ? `text-${style.textAlign}` : "text-left";
  const colorStyle = style?.color ? { color: style.color } : {};

  const baseClasses = cn(
    sizeClass,
    alignClass,
    "transition-all duration-150",
    "hover:bg-primary/5 rounded px-1 -mx-1",
    "cursor-text",
    className
  );

  if (isEditing) {
    const InputComponent = multiline ? "textarea" : "input";
    return (
      <InputComponent
        ref={inputRef as any}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn(
          baseClasses,
          "bg-background border border-primary rounded px-2 py-1 w-full outline-none focus:ring-2 focus:ring-primary/20",
          multiline && "min-h-[80px] resize-y"
        )}
        style={colorStyle}
        placeholder={placeholder}
      />
    );
  }

  const Component = as;
  return (
    <Component
      onClick={() => setIsEditing(true)}
      className={cn(
        baseClasses,
        !localValue && "text-muted-foreground italic"
      )}
      style={colorStyle}
    >
      {localValue || placeholder}
    </Component>
  );
}
