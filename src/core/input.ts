export interface KeyEvent {
  name: string;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
  sequence: string;
}

export interface MouseEvent {
  button: number;
  x: number;
  y: number;
  shift: boolean;
  meta: boolean;
  ctrl: boolean;
  release: boolean;
  motion: boolean;
  wheel?: "up" | "down";
  sequence: string;
}

export type KeyCallback = (input: string, key: KeyEvent) => void;
export type MouseCallback = (event: MouseEvent) => void;
export type PasteCallback = (text: string) => void;

class InputManager {
  private listeners = new Set<KeyCallback>();
  private mouseListeners = new Set<MouseCallback>();
  private pasteListeners = new Set<PasteCallback>();
  private isRawMode = false;
  private pasteMode = false;
  private pasteBuffer = "";

  addListener(callback: KeyCallback): void {
    this.listeners.add(callback);
    if (!this.isRawMode) this.start();
  }

  removeListener(callback: KeyCallback): void {
    this.listeners.delete(callback);
    this.maybeStop();
  }

  addMouseListener(callback: MouseCallback): void {
    this.mouseListeners.add(callback);
    if (!this.isRawMode) this.start();
  }

  removeMouseListener(callback: MouseCallback): void {
    this.mouseListeners.delete(callback);
    this.maybeStop();
  }

  addPasteListener(callback: PasteCallback): void {
    this.pasteListeners.add(callback);
    if (!this.isRawMode) this.start();
  }

  removePasteListener(callback: PasteCallback): void {
    this.pasteListeners.delete(callback);
    this.maybeStop();
  }

  private maybeStop(): void {
    if (
      this.listeners.size === 0 &&
      this.mouseListeners.size === 0 &&
      this.pasteListeners.size === 0 &&
      this.isRawMode
    ) {
      this.stop();
    }
  }

  private start(): void {
    const stdin = process.stdin;
    if (!stdin.isTTY) return;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf-8");
    stdin.on("data", this.handleData);
    this.isRawMode = true;
  }

  private stop(): void {
    const stdin = process.stdin;
    if (stdin.isTTY) {
      stdin.setRawMode(false);
      stdin.pause();
    }
    stdin.off("data", this.handleData);
    this.isRawMode = false;
  }

  private handleData = (chunk: string | Buffer): void => {
    let data = chunk.toString();
    while (data.length > 0) {
      if (this.pasteMode) {
        const endIdx = data.indexOf("\x1b[201~");
        if (endIdx !== -1) {
          this.pasteBuffer += data.slice(0, endIdx);
          this.finishPaste();
          data = data.slice(endIdx + 6);
          continue;
        } else {
          this.pasteBuffer += data;
          return;
        }
      }

      const startIdx = data.indexOf("\x1b[200~");
      if (startIdx !== -1) {
        if (startIdx > 0) {
          this.processNormalData(data.slice(0, startIdx));
        }
        this.pasteMode = true;
        this.pasteBuffer = "";
        data = data.slice(startIdx + 6);
        continue;
      }

      this.processNormalData(data);
      return;
    }
  };

  private processNormalData = (data: string): void => {
    let offset = 0;
    while (offset < data.length) {
      const mouseResult = this.tryDecodeMouse(data, offset);
      if (mouseResult) {
        const sequence = data.slice(offset, offset + mouseResult.length);
        for (const listener of this.mouseListeners) {
          listener({ ...mouseResult.event, sequence });
        }
        offset += mouseResult.length;
        continue;
      }

      const { key, length } = this.decodeKey(data, offset);
      if (length === 0) break;
      const sequence = data.slice(offset, offset + length);
      const isChar = key.name.length === 1 && !key.meta;
      const inputChar = isChar ? key.name : "";
      for (const listener of this.listeners) {
        listener(inputChar, { ...key, sequence });
      }
      offset += length;
    }
  };

  private finishPaste = (): void => {
    this.pasteMode = false;
    const text = this.pasteBuffer.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    this.pasteBuffer = "";
    for (const listener of this.pasteListeners) {
      listener(text);
    }
  };

  private tryDecodeMouse(
    str: string,
    offset: number,
  ): { event: MouseEvent; length: number } | null {
    if (str[offset] !== "\x1b" || str[offset + 1] !== "[" || str[offset + 2] !== "<") {
      return null;
    }
    // biome-ignore lint/suspicious/noControlCharactersInRegex: parsing ANSI mouse SGR escape sequence (ESC + `[<...M/m`)
    const match = str.slice(offset).match(/^\x1b\[<(\d+);(\d+);(\d+)([Mm])/);
    if (!match) return null;

    const button = parseInt(match[1]!, 10);
    const x = parseInt(match[2]!, 10) - 1;
    const y = parseInt(match[3]!, 10) - 1;
    const release = match[4] === "m";
    const shift = (button & 4) !== 0;
    const meta = (button & 8) !== 0;
    const ctrl = (button & 16) !== 0;
    const motion = (button & 32) !== 0;
    let wheel: "up" | "down" | undefined;
    if (button === 64) wheel = "up";
    else if (button === 65) wheel = "down";
    const lowButton = button & 3;

    return {
      event: { button: lowButton, x, y, shift, meta, ctrl, release, motion, wheel, sequence: "" },
      length: match[0].length,
    };
  }

  private decodeKey(str: string, offset: number): { key: KeyEvent; length: number } {
    const char = str[offset]!;
    const code = char.charCodeAt(0);

    if (code >= 1 && code <= 26 && code !== 9 && code !== 10 && code !== 13) {
      return {
        key: {
          name: String.fromCharCode(code + 96),
          ctrl: true,
          meta: false,
          shift: false,
          sequence: "",
        },
        length: 1,
      };
    }

    if (char === "\x1b") {
      if (offset + 1 >= str.length) {
        return {
          key: { name: "escape", ctrl: false, meta: false, shift: false, sequence: "" },
          length: 1,
        };
      }
      const next = str[offset + 1]!;
      if (next === "\r" || next === "\n") {
        return {
          key: { name: "return", ctrl: false, meta: true, shift: false, sequence: "" },
          length: 2,
        };
      }
      if (next !== "[" && next !== "O") {
        return {
          key: {
            name: next.toLowerCase(),
            ctrl: false,
            meta: true,
            shift: next === next.toUpperCase() && next.toLowerCase() !== next.toUpperCase(),
            sequence: "",
          },
          length: 2,
        };
      }
      if (offset + 2 >= str.length) {
        return {
          key: { name: "escape", ctrl: false, meta: false, shift: false, sequence: "" },
          length: 1,
        };
      }
      const third = str[offset + 2]!;
      if (next === "[") {
        // biome-ignore lint/suspicious/noControlCharactersInRegex: parsing ANSI modifyOtherKeys escape (ESC + `[27;...~`)
        const modifyMatch = str.slice(offset).match(/^\x1b\[27;(\d+);(\d+)~/);
        if (modifyMatch?.[1] && modifyMatch[2]) {
          const mod = parseInt(modifyMatch[1], 10);
          const keyCode = parseInt(modifyMatch[2], 10);
          const shift = ((mod - 1) & 1) !== 0;
          const meta = ((mod - 1) & 2) !== 0;
          const ctrl = ((mod - 1) & 4) !== 0;
          if (keyCode === 13) {
            return {
              key: { name: "return", ctrl, meta, shift, sequence: "" },
              length: modifyMatch[0].length,
            };
          }
        }

        if (third === "A")
          return {
            key: { name: "up", ctrl: false, meta: false, shift: false, sequence: "" },
            length: 3,
          };
        if (third === "B")
          return {
            key: { name: "down", ctrl: false, meta: false, shift: false, sequence: "" },
            length: 3,
          };
        if (third === "C")
          return {
            key: { name: "right", ctrl: false, meta: false, shift: false, sequence: "" },
            length: 3,
          };
        if (third === "D")
          return {
            key: { name: "left", ctrl: false, meta: false, shift: false, sequence: "" },
            length: 3,
          };

        // biome-ignore lint/suspicious/noControlCharactersInRegex: parsing ANSI arrow-key modifier escape (ESC + `[1;<mod><letter>`)
        const modMatch = str.slice(offset).match(/^\x1b\[1;([2345678])([ABCDEFGH])/);
        if (modMatch?.[1] && modMatch[2]) {
          const mod = parseInt(modMatch[1], 10);
          const letter = modMatch[2];
          const shift = ((mod - 1) & 1) !== 0;
          const meta = ((mod - 1) & 2) !== 0;
          const ctrl = ((mod - 1) & 4) !== 0;
          const names: Record<string, string> = {
            A: "up",
            B: "down",
            C: "right",
            D: "left",
            H: "home",
            F: "end",
          };
          return {
            key: { name: names[letter] ?? "escape", ctrl, meta, shift, sequence: "" },
            length: modMatch[0].length,
          };
        }

        if (third === "3" && str[offset + 3] === "~")
          return {
            key: { name: "delete", ctrl: false, meta: false, shift: false, sequence: "" },
            length: 4,
          };
        if (third === "5" && str[offset + 3] === "~")
          return {
            key: { name: "pageup", ctrl: false, meta: false, shift: false, sequence: "" },
            length: 4,
          };
        if (third === "6" && str[offset + 3] === "~")
          return {
            key: { name: "pagedown", ctrl: false, meta: false, shift: false, sequence: "" },
            length: 4,
          };
        if (third === "H" || (third === "1" && str[offset + 3] === "~"))
          return {
            key: { name: "home", ctrl: false, meta: false, shift: false, sequence: "" },
            length: third === "H" ? 3 : 4,
          };
        if (third === "F" || (third === "4" && str[offset + 3] === "~"))
          return {
            key: { name: "end", ctrl: false, meta: false, shift: false, sequence: "" },
            length: third === "F" ? 3 : 4,
          };

        // biome-ignore lint/suspicious/noControlCharactersInRegex: parsing ANSI F1-F20 function-key escape (ESC + `[15~`..`[24~`)
        const fnMatch = str.slice(offset).match(/^\x1b\[(1[5-9]|2[0-4])~/);
        if (fnMatch?.[1]) {
          const fnMap: Record<string, number> = {
            "15": 5,
            "17": 6,
            "18": 7,
            "19": 8,
            "20": 9,
            "21": 10,
            "23": 11,
            "24": 12,
          };
          return {
            key: {
              name: `f${fnMap[fnMatch[1]] ?? parseInt(fnMatch[1], 10)}`,
              ctrl: false,
              meta: false,
              shift: false,
              sequence: "",
            },
            length: fnMatch[0].length,
          };
        }
      }
      return {
        key: { name: "escape", ctrl: false, meta: false, shift: false, sequence: "" },
        length: 1,
      };
    }

    if (char === "\r")
      return {
        key: { name: "return", ctrl: false, meta: false, shift: false, sequence: "" },
        length: 1,
      };
    if (char === "\n")
      return {
        key: { name: "return", ctrl: true, meta: false, shift: false, sequence: "" },
        length: 1,
      };
    if (char === "\t")
      return {
        key: { name: "tab", ctrl: false, meta: false, shift: false, sequence: "" },
        length: 1,
      };
    if (char === "\x7f" || char === "\x08")
      return {
        key: { name: "backspace", ctrl: false, meta: false, shift: false, sequence: "" },
        length: 1,
      };

    return {
      key: {
        name: char,
        ctrl: false,
        meta: false,
        shift: char === char.toUpperCase() && char.toLowerCase() !== char.toUpperCase(),
        sequence: "",
      },
      length: 1,
    };
  }
}

export const inputManager = new InputManager();

export function _testDecodeKey(str: string, offset = 0): { key: KeyEvent; length: number } {
  return (
    inputManager as unknown as {
      decodeKey: (s: string, o: number) => { key: KeyEvent; length: number };
    }
  ).decodeKey(str, offset);
}

export function _testDecodeMouse(
  str: string,
  offset = 0,
): { event: MouseEvent; length: number } | null {
  return (
    inputManager as unknown as {
      tryDecodeMouse: (s: string, o: number) => { event: MouseEvent; length: number } | null;
    }
  ).tryDecodeMouse(str, offset);
}

export function _testFeedPaste(text: string): void {
  (inputManager as unknown as { pasteBuffer: string; finishPaste: () => void }).pasteBuffer = text;
  (inputManager as unknown as { finishPaste: () => void }).finishPaste();
}

export function _testHandleData(data: string): void {
  (inputManager as unknown as { handleData: (d: string | Buffer) => void }).handleData(data);
}

export function _testResetPasteState(): void {
  (inputManager as unknown as { pasteMode: boolean; pasteBuffer: string }).pasteMode = false;
  (inputManager as unknown as { pasteBuffer: string }).pasteBuffer = "";
}
