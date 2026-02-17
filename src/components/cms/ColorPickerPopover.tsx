import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Palette } from "lucide-react";

interface ColorPickerPopoverProps {
  onColorSelect: (color: string) => void;
}

const PRESET_COLORS = [
  { label: "Noir", value: "#000000" },
  { label: "Blanc", value: "#ffffff" },
  { label: "Gris", value: "#6b7280" },
  { label: "Primary", value: "#8b5cf6" },
  { label: "Bleu", value: "#3b82f6" },
  { label: "Cyan", value: "#06b6d4" },
  { label: "Vert", value: "#10b981" },
  { label: "Jaune", value: "#f59e0b" },
  { label: "Orange", value: "#f97316" },
  { label: "Rouge", value: "#ef4444" },
  { label: "Rose", value: "#ec4899" },
  { label: "Violet", value: "#a855f7" },
];

export const ColorPickerPopover: React.FC<ColorPickerPopoverProps> = ({ onColorSelect }) => {
  const [customColor, setCustomColor] = useState("#8b5cf6");
  const [open, setOpen] = useState(false);

  const handleSelect = (color: string) => {
    onColorSelect(color);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              onMouseDown={(e) => e.preventDefault()}
            >
              <Palette className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="right">Couleur</TooltipContent>
      </Tooltip>
      <PopoverContent side="right" align="start" className="w-52 p-3 rounded-xl">
        <p className="text-[10px] font-semibold uppercase text-muted-foreground/60 tracking-widest mb-2">Présets</p>
        <div className="grid grid-cols-6 gap-1.5 mb-3">
          {PRESET_COLORS.map((c) => (
            <button
              key={c.value}
              title={c.label}
              className="h-7 w-7 rounded-lg border border-border/50 hover:ring-2 hover:ring-primary/30 transition-all cursor-pointer"
              style={{ backgroundColor: c.value }}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(c.value);
              }}
            />
          ))}
        </div>
        <div className="h-px bg-border/30 mb-3" />
        <p className="text-[10px] font-semibold uppercase text-muted-foreground/60 tracking-widest mb-2">Personnalisée</p>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={customColor}
            onChange={(e) => setCustomColor(e.target.value)}
            className="h-8 w-8 rounded-lg cursor-pointer border-0 p-0"
          />
          <span className="text-xs text-muted-foreground font-mono">{customColor}</span>
          <button
            className="ml-auto text-xs text-primary hover:underline"
            onMouseDown={(e) => {
              e.preventDefault();
              handleSelect(customColor);
            }}
          >
            Appliquer
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
