import { Renderable, type RenderableOptions, type PasteEvent } from "../core/renderable.ts";
import { Canvas, StyleFlags, COLOR_DEFAULT, parseColor } from "../core/canvas.ts";
import { layoutText } from "../core/text-layout.ts";
import { MeasureMode } from "../core/yoga.ts";
import { charWidth } from "../core/width.ts";
import type { KeyEvent } from "../core/input.ts";

export interface TextareaOptions extends RenderableOptions {
  value?: string;
  placeholder?: string;
  placeholderColor?: string | number;
  color?: string | number;
  backgroundColor?: string | number;
  onSubmit?: (value: string) => void;
  onChange?: (value: string) => void;
}

export class Textarea extends Renderable {
  private _value: string;
  private _composingText = "";
  private _cursorIdx = 0;
  private _placeholder: string;
  private _placeholderColor: number;
  private _color: number;
  private _bgColor: number;
  private _onSubmit?: (value: string) => void;
  private _onChange?: (value: string) => void;

  physicalCursorX = -1;
  physicalCursorY = -1;

  constructor(opts: TextareaOptions = {}) {
    const { value, placeholder, placeholderColor, color, backgroundColor, onSubmit, onChange, ...rest } = opts;
    super({ ...rest, focusable: true });
    this._value = value ?? "";
    this._placeholder = placeholder ?? "";
    this._placeholderColor = parseColor(placeholderColor ?? "#666666");
    this._color = parseColor(color);
    this._bgColor = parseColor(backgroundColor);
    this._onSubmit = onSubmit;
    this._onChange = onChange;

    this.yogaNode.setMeasureFunc((width, widthMode) => {
      const display = this._value + this._composingText;
      const measureVal = display || this._placeholder || "";
      const maxW = widthMode === MeasureMode.Undefined ? Infinity : width;
      const { width: mw, height } = layoutText(measureVal, maxW, true);
      return { width: mw, height: Math.max(height, 1) };
    });

    this.handleKeyPress = (key: KeyEvent): boolean => this.onKeyPress(key);
    this.handlePaste = (event: PasteEvent): void => this.insertText(event.text);
  }

  get value(): string {
    return this._value;
  }

  set value(v: string) {
    if (this._value === v) return;
    this._value = v;
    if (this._cursorIdx > v.length) this._cursorIdx = v.length;
    this.yogaNode.markDirty();
    this.requestRender();
  }

  get cursorIdx(): number {
    return this._cursorIdx;
  }

  setComposingText(text: string): void {
    this._composingText = text;
    this.yogaNode.markDirty();
    this.requestRender();
  }

  insertText(text: string): void {
    if (!text) return;
    this._value = this._value.slice(0, this._cursorIdx) + text + this._value.slice(this._cursorIdx);
    this._cursorIdx += text.length;
    this.yogaNode.markDirty();
    this._onChange?.(this._value);
    this.requestRender();
  }

  private onKeyPress(key: KeyEvent): boolean {
    switch (key.name) {
      case "left":
        if (this._cursorIdx > 0) this._cursorIdx--;
        this.requestRender();
        return true;
      case "right":
        if (this._cursorIdx < this._value.length) this._cursorIdx++;
        this.requestRender();
        return true;
      case "backspace":
        if (this._cursorIdx > 0) {
          this._value = this._value.slice(0, this._cursorIdx - 1) + this._value.slice(this._cursorIdx);
          this._cursorIdx--;
          this.yogaNode.markDirty();
          this._onChange?.(this._value);
          this.requestRender();
        }
        return true;
      case "delete":
        if (this._cursorIdx < this._value.length) {
          this._value = this._value.slice(0, this._cursorIdx) + this._value.slice(this._cursorIdx + 1);
          this.yogaNode.markDirty();
          this._onChange?.(this._value);
          this.requestRender();
        }
        return true;
      case "return":
        if (key.ctrl || key.meta) {
          this._value = this._value.slice(0, this._cursorIdx) + "\n" + this._value.slice(this._cursorIdx);
          this._cursorIdx++;
          this.yogaNode.markDirty();
          this._onChange?.(this._value);
          this.requestRender();
        } else {
          this._onSubmit?.(this._value);
        }
        return true;
      default:
        if (key.name.length === 1 && !key.ctrl && !key.meta) {
          this._value = this._value.slice(0, this._cursorIdx) + key.name + this._value.slice(this._cursorIdx);
          this._cursorIdx += key.name.length;
          this.yogaNode.markDirty();
          this._onChange?.(this._value);
          this.requestRender();
          return true;
        }
        return false;
    }
  }

  override render(canvas: Canvas, x: number, y: number, w: number, h: number): void {
    if (w <= 0 || h <= 0) return;

    if (this._bgColor !== COLOR_DEFAULT) {
      for (let cy = y; cy < y + h; cy++) {
        for (let cx = x; cx < x + w; cx++) {
          canvas.setCell(cx, cy, " ", 0, COLOR_DEFAULT, this._bgColor);
        }
      }
    }

    this.physicalCursorX = -1;
    this.physicalCursorY = -1;

    const display = this._value.slice(0, this._cursorIdx) + this._composingText + this._value.slice(this._cursorIdx);
    const cursorOffset = this._cursorIdx + this._composingText.length;

    if (!this.focused && display.length === 0 && this._placeholder) {
      const { lines } = layoutText(this._placeholder, w, true);
      for (let row = 0; row < lines.length && row < h; row++) {
        let cx = x;
        for (const ch of lines[row]!) {
          if (cx + charWidth(ch) > x + w) break;
          canvas.setCell(cx, y + row, ch, StyleFlags.Dim, this._placeholderColor, this._bgColor);
          cx += charWidth(ch);
        }
      }
      return;
    }

    const { lines } = layoutText(display, w, true);
    let charIdx = 0;

    for (let row = 0; row < lines.length && row < h; row++) {
      const line = lines[row]!;
      let cx = x;
      for (const ch of line) {
        const cw = charWidth(ch);
        if (cx + cw > x + w) break;

        if (this.focused && charIdx === cursorOffset) {
          this.physicalCursorX = cx;
          this.physicalCursorY = y + row;
        }

        const isComposing = charIdx >= this._cursorIdx && charIdx < this._cursorIdx + this._composingText.length;
        const style = isComposing ? StyleFlags.Underline | StyleFlags.Dim : 0;

        canvas.setCell(cx, y + row, ch, style, this._color, this._bgColor);
        cx += cw;
        charIdx++;
      }
    }

    if (this.focused && this.physicalCursorX === -1) {
      const lastRow = Math.min(lines.length - 1, h - 1);
      const lastLine = lines[lastRow] ?? "";
      let lastW = 0;
      for (const ch of lastLine) lastW += charWidth(ch);
      this.physicalCursorX = x + lastW;
      this.physicalCursorY = y + lastRow;
    }
  }
}
