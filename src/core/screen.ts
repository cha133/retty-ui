export class Screen {
  private isAlternate: boolean;
  private mouseEnabled = false;
  private onResizeCallback?: () => void;
  private clean = false;

  constructor(options: { alternate?: boolean } = {}) {
    this.isAlternate = options.alternate ?? false;
  }

  setup(): void {
    if (this.isAlternate) {
      process.stdout.write("\x1b[?1049h\x1b[H\x1b[?25l");
    } else {
      process.stdout.write("\x1b[?25l");
    }
    process.stdout.write("\x1b[?2004h");
    process.stdout.on("resize", this.handleResize);
    process.on("exit", this.cleanup);
    process.on("SIGINT", this.handleSigint);
    process.on("SIGTERM", this.handleSigterm);
  }

  cleanup = (): void => {
    if (this.clean) return;
    this.clean = true;
    this.disableMouse();
    process.stdout.write("\x1b[?25h\x1b[0m");
    process.stdout.write("\x1b[?2004l");
    if (this.isAlternate) {
      process.stdout.write("\x1b[?1049l");
    }
    process.stdout.off("resize", this.handleResize);
    process.off("exit", this.cleanup);
    process.off("SIGINT", this.handleSigint);
    process.off("SIGTERM", this.handleSigterm);
  };

  enableMouse(): void {
    if (this.mouseEnabled) return;
    process.stdout.write("\x1b[?1000h\x1b[?1006h");
    this.mouseEnabled = true;
  }

  disableMouse(): void {
    if (!this.mouseEnabled) return;
    process.stdout.write("\x1b[?1006l\x1b[?1000l");
    this.mouseEnabled = false;
  }

  setCursorPosition(x: number, y: number): void {
    process.stdout.write(`\x1b[${y + 1};${x + 1}H\x1b[?25h`);
  }

  hideCursor(): void {
    process.stdout.write("\x1b[?25l");
  }

  onResize(callback: () => void): void {
    this.onResizeCallback = callback;
  }

  get size(): { width: number; height: number } {
    return {
      width: process.stdout.columns || 80,
      height: process.stdout.rows || 24,
    };
  }

  write(data: string): void {
    process.stdout.write(data);
  }

  private handleResize = (): void => {
    this.onResizeCallback?.();
  };

  private handleSigint = (): void => {
    this.cleanup();
    process.exit(0);
  };

  private handleSigterm = (): void => {
    this.cleanup();
    process.exit(0);
  };
}
