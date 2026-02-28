/**
 * Browser Tool - Playwright Integration for MCP
 */

import { chromium, firefox, webkit, Browser, Page } from "playwright";

export type BrowserType = "chromium" | "firefox" | "webkit";

export interface BrowserToolConfig {
  headless?: boolean;
  timeout?: number;
  browser?: BrowserType;
  viewport?: { width: number; height: number };
}

export interface ElementInfo {
  exists: boolean;
  selector: string;
  text?: string;
  tagName?: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

export interface PageInfo {
  url: string;
  title: string;
  viewport?: { width: number; height: number };
}

export interface ScreenshotResult {
  success: boolean;
  buffer?: Buffer;
  error?: string;
}

export interface BrowserActionResult {
  success: boolean;
  url?: string;
  error?: string;
}

export class BrowserTool {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private config: Required<BrowserToolConfig>;

  constructor(config: BrowserToolConfig = {}) {
    this.config = {
      headless: config.headless ?? true,
      timeout: config.timeout ?? 30000,
      browser: config.browser ?? "chromium",
      viewport: config.viewport ?? { width: 1280, height: 720 },
    };
  }

  async initialize(): Promise<void> {
    const browserLauncher = this.getBrowserLauncher();
    this.browser = await browserLauncher.launch({
      headless: this.config.headless,
      timeout: this.config.timeout,
    });
    this.page = await this.browser.newPage();
    await this.page.setViewportSize(this.config.viewport);
  }

  private getBrowserLauncher() {
    switch (this.config.browser) {
      case "firefox": return firefox;
      case "webkit": return webkit;
      case "chromium": default: return chromium;
    }
  }

  async navigate(url: string): Promise<BrowserActionResult> {
    if (!this.page) return { success: false, error: "Browser not initialized" };
    try {
      await this.page.goto(url, { waitUntil: "networkidle" });
      return { success: true, url: this.page.url() };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async click(selector: string): Promise<BrowserActionResult> {
    if (!this.page) return { success: false, error: "Browser not initialized" };
    try {
      await this.page.locator(selector).click();
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async type(selector: string, text: string): Promise<BrowserActionResult> {
    if (!this.page) return { success: false, error: "Browser not initialized" };
    try {
      await this.page.locator(selector).fill(text);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async screenshot(options?: { fullPage?: boolean }): Promise<ScreenshotResult> {
    if (!this.page) return { success: false, error: "Browser not initialized" };
    try {
      const buffer = await this.page.screenshot({ type: "png", fullPage: options?.fullPage ?? false });
      return { success: true, buffer };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async screenshotElement(selector: string): Promise<ScreenshotResult> {
    if (!this.page) return { success: false, error: "Browser not initialized" };
    try {
      const buffer = await this.page.locator(selector).screenshot();
      return { success: true, buffer };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async getElement(selector: string): Promise<ElementInfo> {
    if (!this.page) return { exists: false, selector };
    try {
      const locator = this.page.locator(selector);
      const count = await locator.count();
      if (count === 0) return { exists: false, selector };
      const text = await locator.textContent().catch(() => undefined);
      const tagName = await locator.evaluate((el: Element) => el.tagName.toLowerCase()).catch(() => undefined);
      const boundingBox = await locator.boundingBox().catch(() => undefined);
      return { exists: true, selector, text: text ?? undefined, tagName, boundingBox: boundingBox ?? undefined };
    } catch (error) {
      return { exists: false, selector };
    }
  }

  async verifyElement(selector: string): Promise<boolean> {
    if (!this.page) return false;
    try {
      const locator = this.page.locator(selector);
      const count = await locator.count();
      return count > 0;
    } catch (error) {
      return false;
    }
  }

  async getPageInfo(): Promise<PageInfo> {
    if (!this.page) return { url: "", title: "" };
    const url = this.page.url();
    const title = await this.page.title();
    const viewport = this.page.viewportSize() ?? undefined;
    return { url, title, viewport };
  }

  async close(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  getName(): string { return "browser"; }

  getDescription(): string { return "Browser automation tool using Playwright for web testing and interaction"; }

  getInputSchema(): Record<string, any> {
    return {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["navigate", "click", "type", "screenshot", "getElement", "verifyElement", "getPageInfo"],
          description: "The browser action to perform",
        },
        url: { type: "string", description: "URL to navigate to" },
        selector: { type: "string", description: "Element selector" },
        text: { type: "string", description: "Text to type" },
      },
      required: ["action"],
    };
  }
}

export default BrowserTool;
