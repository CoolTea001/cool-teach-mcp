import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

let current: ChildProcess | null = null;

/** packages/preview 的构建产物入口（决议 #12/#17） */
function previewServerPath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url)); // packages/mcp-server/dist
  const candidates = [
    path.resolve(here, "../../preview/.output/server/index.mjs"),
    path.resolve(here, "../preview/.output/server/index.mjs"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error("预览应用未构建：请先运行 pnpm --filter @cool-teach/preview build");
}

/** 杀掉同路径的残留预览实例（旧构建可能占用端口，避免新实例连到旧构建） */
function killStalePreview(serverPath: string): void {
  try {
    spawn("pkill", ["-f", serverPath], { stdio: "ignore" }).unref();
  } catch {
    // pkill 不存在则忽略（由端口占用报错兜底）
  }
}

async function waitForServer(url: string, timeoutMs = 15000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // 未就绪，重试
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

function openBrowser(url: string): void {
  const platform = process.platform;
  const cmd = platform === "darwin" ? "open" : platform === "win32" ? "start" : "xdg-open";
  if (platform === "win32") {
    spawn(cmd, [url], { shell: true, stdio: "ignore", detached: true }).unref();
  } else {
    spawn(cmd, [url], { stdio: "ignore", detached: true }).unref();
  }
}

/**
 * 拉起预览服务（决议 #17 契约）：
 * - 环境变量 PREVIEW_WORKSPACE=项目根、PORT=端口（默认 4737）、HOST=127.0.0.1
 * - 先停旧实例再启新实例；就绪后打开浏览器
 */
export async function startPreview(projectRoot: string, port = 4737): Promise<{ url: string; port: number }> {
  if (current && !current.killed) {
    current.kill("SIGTERM");
    current = null;
  }
  const serverPath = previewServerPath();
  killStalePreview(serverPath);
  const child = spawn(process.execPath, [serverPath], {
    env: { ...process.env, PREVIEW_WORKSPACE: projectRoot, PORT: String(port), HOST: "127.0.0.1" },
    stdio: "ignore",
    detached: true,
  });
  child.on("error", (e) => {
    throw new Error(`预览服务启动失败：${e.message}`);
  });
  child.unref();
  current = child;

  const url = `http://127.0.0.1:${port}`;
  const ready = await waitForServer(url);
  if (!ready) {
    throw new Error(`预览服务在 ${port} 端口 15 秒内未就绪，请检查 packages/preview 是否构建成功`);
  }
  openBrowser(url);
  return { url, port };
}

/** 供测试/清理用 */
export function stopPreview(): void {
  if (current && !current.killed) {
    current.kill("SIGTERM");
    current = null;
  }
}
