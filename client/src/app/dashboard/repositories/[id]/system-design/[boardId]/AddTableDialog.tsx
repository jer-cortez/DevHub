"use client";

import { useState, type FormEvent } from "react";
import { createPortal } from "react-dom";

export interface TableStyle {
  label: string;
  bgColor: string;
  textColor: string;
  fontFamily: string;
  fontSize: string;
}

const BG_COLORS = ["#ffffff", "#fef3c7", "#dbeafe", "#dcfce7", "#fce7f3", "#e9d5ff"];
const TEXT_COLORS = ["#171717", "#ffffff", "#1d4ed8", "#b91c1c", "#15803d", "#7e22ce"];

const FONTS = [
  { label: "Sans", value: "ui-sans-serif, system-ui, sans-serif" },
  { label: "Serif", value: "ui-serif, Georgia, serif" },
  { label: "Mono", value: "ui-monospace, SFMono-Regular, monospace" },
  { label: "Rounded", value: "'Comic Sans MS', 'Comic Sans', cursive" },
];

const SIZES = [
  { label: "Small", value: "12px" },
  { label: "Medium", value: "14px" },
  { label: "Large", value: "18px" },
];

function Swatch({
  color,
  selected,
  onSelect,
}: {
  color: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{ backgroundColor: color }}
      className={`h-6 w-6 rounded-full border-2 ${
        selected ? "border-orange-500" : "border-neutral-300 dark:border-neutral-700"
      }`}
      aria-label={color}
    />
  );
}

/**
 * Used both to create a new table (no `initial`, defaults apply) and to
 * edit an existing one's colors/font/size/name (`initial` prefills the
 * form). `submitLabel` distinguishes "Create" vs "Save" on the button.
 */
export default function AddTableDialog({
  initial,
  submitLabel = "Create",
  onSubmit,
  onClose,
}: {
  initial?: Partial<TableStyle>;
  submitLabel?: string;
  onSubmit: (style: TableStyle) => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? "NewTable");
  const [bgColor, setBgColor] = useState(initial?.bgColor ?? BG_COLORS[0]);
  const [textColor, setTextColor] = useState(initial?.textColor ?? TEXT_COLORS[0]);
  const [fontFamily, setFontFamily] = useState(initial?.fontFamily ?? FONTS[0].value);
  const [fontSize, setFontSize] = useState(initial?.fontSize ?? SIZES[1].value);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    onSubmit({ label: label.trim(), bgColor, textColor, fontFamily, fontSize });
  };

  // Rendered via a portal directly into document.body, rather than in
  // place — this dialog is opened from inside the React Flow canvas tree,
  // and React Flow's own container establishes a positioning/stacking
  // context that broke this modal's `fixed` centering and let clicks fall
  // through to the canvas underneath instead of hitting the swatches.
  // Escaping to the document root sidesteps that entirely.
  return createPortal(
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-5 w-80 space-y-4"
      >
        <h2 className="text-sm font-semibold">{initial ? "Edit table" : "New table"}</h2>

        <div className="space-y-1">
          <label className="text-xs text-neutral-500 dark:text-neutral-400">Table name</label>
          <input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1.5"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-neutral-500 dark:text-neutral-400">Background color</label>
          <div className="flex gap-2">
            {BG_COLORS.map((color) => (
              <Swatch key={color} color={color} selected={bgColor === color} onSelect={() => setBgColor(color)} />
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-neutral-500 dark:text-neutral-400">Text color</label>
          <div className="flex gap-2">
            {TEXT_COLORS.map((color) => (
              <Swatch key={color} color={color} selected={textColor === color} onSelect={() => setTextColor(color)} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-neutral-500 dark:text-neutral-400">Font</label>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="w-full text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1.5"
            >
              {FONTS.map((font) => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-neutral-500 dark:text-neutral-400">Size</label>
            <select
              value={fontSize}
              onChange={(e) => setFontSize(e.target.value)}
              className="w-full text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1.5"
            >
              {SIZES.map((size) => (
                <option key={size.value} value={size.value}>
                  {size.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="text-sm px-3 py-1.5 rounded-md text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="text-sm px-3 py-1.5 rounded-md bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
