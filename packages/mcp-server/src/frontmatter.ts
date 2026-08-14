/**
 * 极简 YAML frontmatter 解析（只需 title / summary / tags 三个字段，决议 #15）。
 */
export interface Frontmatter {
  data: Record<string, string>;
  content: string;
}

export function parseFrontmatter(md: string): Frontmatter {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(md);
  const fmBody = m?.[1];
  if (!fmBody) return { data: {}, content: md };

  const data: Record<string, string> = {};
  for (const raw of fmBody.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (kv && kv[1] !== undefined && kv[2] !== undefined) {
      data[kv[1]] = kv[2].replace(/^["']|["']$/g, "").trim();
    }
  }
  return { data, content: md.slice(m[0].length) };
}

export function renderFrontmatter(data: Record<string, string>): string {
  const lines = Object.entries(data).map(([k, v]) => `${k}: ${v}`);
  return ["---", ...lines, "---"].join("\n");
}
