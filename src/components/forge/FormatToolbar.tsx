import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AlignLeft, AlignCenter, AlignRight, Type, Palette, ChevronDown } from "lucide-react";
import { TextStyle } from "./EditableText";

interface FormatToolbarProps {
  style: TextStyle;
  onStyleChange: (style: TextStyle) => void;
  compact?: boolean;
}

const fontSizes = [
  { value: "small", label: "Small" },
  { value: "normal", label: "Normal" },
  { value: "large", label: "Large" },
  { value: "xlarge", label: "X-Large" },
] as const;

const presetColors = [
  { value: "inherit", label: "Default", className: "bg-foreground" },
  { value: "#000000", label: "Black", className: "bg-black" },
  { value: "#374151", label: "Gray", className: "bg-gray-700" },
  { value: "#2563eb", label: "Blue", className: "bg-blue-600" },
  { value: "#16a34a", label: "Green", className: "bg-green-600" },
  { value: "#dc2626", label: "Red", className: "bg-red-600" },
  { value: "#9333ea", label: "Purple", className: "bg-purple-600" },
  { value: "#ea580c", label: "Orange", className: "bg-orange-600" },
];

export default function FormatToolbar({ style, onStyleChange, compact = false }: FormatToolbarProps) {
  const currentSize = fontSizes.find((s) => s.value === style.fontSize) || fontSizes[1];

  return (
    <div className="flex items-center gap-1 p-2 bg-muted/50 rounded-lg border">
      {/* Font Size */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-1">
            <Type className="h-4 w-4" />
            {!compact && <span className="text-xs">{currentSize.label}</span>}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="bg-popover z-50">
          {fontSizes.map((size) => (
            <DropdownMenuItem
              key={size.value}
              onClick={() => onStyleChange({ ...style, fontSize: size.value })}
              className={style.fontSize === size.value ? "bg-accent" : ""}
            >
              {size.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Color Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-1">
            <Palette className="h-4 w-4" />
            <div 
              className="h-3 w-3 rounded-full border"
              style={{ backgroundColor: style.color || "currentColor" }}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2 bg-popover z-50" align="start">
          <div className="grid grid-cols-4 gap-2">
            {presetColors.map((color) => (
              <button
                key={color.value}
                onClick={() => onStyleChange({ ...style, color: color.value === "inherit" ? undefined : color.value })}
                className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${color.className} ${
                  (style.color === color.value || (!style.color && color.value === "inherit"))
                    ? "ring-2 ring-primary ring-offset-2"
                    : ""
                }`}
                title={color.label}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Alignment */}
      <div className="flex items-center gap-0.5">
        <Button
          variant={style.textAlign === "left" || !style.textAlign ? "secondary" : "ghost"}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onStyleChange({ ...style, textAlign: "left" })}
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          variant={style.textAlign === "center" ? "secondary" : "ghost"}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onStyleChange({ ...style, textAlign: "center" })}
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          variant={style.textAlign === "right" ? "secondary" : "ghost"}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onStyleChange({ ...style, textAlign: "right" })}
        >
          <AlignRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
