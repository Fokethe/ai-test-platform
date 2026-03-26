import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const mockupRoot = path.join(repoRoot, "PPT", "mockups");
const host = process.env.MOCKUP_HOST || "127.0.0.1";
const port = Number(process.env.PORT || process.env.MOCKUP_PORT || "8123");

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".svg", "image/svg+xml"],
  [".ico", "image/x-icon"],
  [".txt", "text/plain; charset=utf-8"],
]);

function resolveRequestPath(rawPathname) {
  const pathname = decodeURIComponent(rawPathname || "/");
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const resolvedPath = path.resolve(mockupRoot, `.${requestedPath}`);

  if (!resolvedPath.startsWith(mockupRoot)) {
    return null;
  }

  return resolvedPath;
}

function getContentType(filePath) {
  return contentTypes.get(path.extname(filePath).toLowerCase()) || "application/octet-stream";
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${host}:${port}`);
    const resolvedPath = resolveRequestPath(url.pathname);

    if (!resolvedPath) {
      response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Forbidden");
      return;
    }

    const fileInfo = await stat(resolvedPath);

    if (!fileInfo.isFile()) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    const fileBuffer = await readFile(resolvedPath);

    response.writeHead(200, {
      "Content-Type": getContentType(resolvedPath),
      "Cache-Control": "no-store",
    });
    response.end(fileBuffer);
  } catch (error) {
    const statusCode = error && typeof error === "object" && "code" in error && error.code === "ENOENT" ? 404 : 500;
    const message = statusCode === 404 ? "Not found" : "Server error";

    response.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(message);
  }
});

server.listen(port, host, () => {
  const baseUrl = `http://${host}:${port}/`;

  console.log("Mockup preview server is running.");
  console.log(`Index: ${baseUrl}`);
  console.log(`V2 HTML: ${baseUrl}software-testing-service-mockup-v2.html`);
  console.log(`V2 PNG: ${baseUrl}software-testing-service-mockup-v2.png`);
});
