# 客户端接入配置

> 依据：[跨客户端接入与工作区定位](#13) 的研究发现（`research/cross-client-mcp-setup` 分支）
> 前置：已构建 MCP 服务 `pnpm --filter @cool-teach/mcp-server build`；假设仓库绝对路径为 `<REPO>`（如 `/Users/you/cool-teach-mcp`）。

**工作区定位**：服务按 `CLAUDE_PROJECT_DIR` > `--project-root` 参数 > `cwd` 的顺序解析项目根（决议 #18）。各客户端按下面的方式传入项目根。

## Claude Code（项目级 `.mcp.json`，自动发现）

在**用户的项目根**放 `.mcp.json`（Claude Code 自动发现，首次使用需批准）：

```json
{
  "mcpServers": {
    "cool-teach-mcp": {
      "command": "node",
      "args": ["<REPO>/packages/mcp-server/dist/index.js"]
    }
  }
}
```

Claude Code 会注入 `CLAUDE_PROJECT_DIR`，服务自动定位到该项目。也可用 `claude mcp add cool-teach-mcp -- node <REPO>/packages/mcp-server/dist/index.js`。

## Cursor（`.cursor/mcp.json`）

在项目根 `.cursor/` 下（与 Claude Code 同一份 `mcpServers` schema，`${workspaceFolder}` 会被 Cursor 插值）：

```json
{
  "mcpServers": {
    "cool-teach-mcp": {
      "command": "node",
      "args": ["<REPO>/packages/mcp-server/dist/index.js", "--project-root", "${workspaceFolder}"]
    }
  }
}
```

> Cursor 3.6+ 默认 Auto-review；可在 `permissions.json` 白名单放行。

## Trae（`.trae/mcp.json`）

与 Cursor 相同的 schema（需在设置中开启“项目 MCP”）：

```json
{
  "mcpServers": {
    "cool-teach-mcp": {
      "command": "node",
      "args": ["<REPO>/packages/mcp-server/dist/index.js", "--project-root", "${workspaceFolder}"]
    }
  }
}
```

## opencode（`opencode.json` 的 `mcp` 块）

```json
{
  "mcp": {
    "cool-teach-mcp": {
      "type": "stdio",
      "command": ["node", "<REPO>/packages/mcp-server/dist/index.js", "--project-root", "."],
      "environment": {}
    }
  }
}
```

> opencode 的 `command` 是数组、环境变量用 `environment`（非 `env`）；`cwd` 可用 `{workspaceFolder}` 变量（未核实则用 `.` 相对项目目录）。

## Codex CLI（`.codex/config.toml` 或 `~/.codex/config.toml`）

```toml
[mcp_servers.cool-teach-mcp]
command = "node"
args = ["<REPO>/packages/mcp-server/dist/index.js", "--project-root", "."]
```

> 项目级 `.codex/config.toml` 覆盖全局；`cwd` 未设置时按启动目录推断。

## 说明

- 服务名统一 `cool-teach-mcp`，工具前缀 `cool_teach_*`；在任意客户端中说 **“Use Cool Teach MCP”** 即可唤起这些工具。
- 协议基线 `2024-11-05`（SDK 自动协商）。
- 预览功能需要先构建 `packages/preview`（`pnpm --filter @cool-teach/preview build`），`cool_teach_open_preview` 会拉起本地服务并打开浏览器（端口默认 4737）。
