import path from "node:path";

/**
 * 解析项目根目录。
 * 优先级（决议 #13 / #18）：CLAUDE_PROJECT_DIR 环境变量 > 显式 --project-root 参数 > process.cwd() 兜底。
 * 绝不默认依赖 cwd——Claude Code 不保证服务器 cwd 是项目根。
 */
export function resolveProjectRoot(argv: string[] = process.argv.slice(2)): string {
  const env = process.env.CLAUDE_PROJECT_DIR;
  if (env && env.trim()) return path.resolve(env.trim());

  const i = argv.indexOf("--project-root");
  const rootArg = argv[i + 1];
  if (i !== -1 && rootArg) return path.resolve(rootArg);

  return process.cwd();
}

/** `.coolteach/` 目录位置 */
export function coolteachDir(projectRoot: string): string {
  return path.join(projectRoot, ".coolteach");
}
