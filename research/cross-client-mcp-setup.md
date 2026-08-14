# 跨客户端 MCP 接入与工作区定位（研究发现）

**日期**：2026-08-14　**范围**：调研五个主流 AI 编程客户端（Cursor、opencode、Trae/字节、OpenAI Codex CLI、Claude Code）如何配置与启动本地 stdio MCP 服务器，以及服务器进程工作目录（cwd）如何确定。资料来源以官方文档为主（见文末参考来源），个别事实标注为"未能验证"。

---

## 各客户端接入方式

### Cursor

**配置文件与位置**
- 项目级（可提交到 git、团队共享）：`.cursor/mcp.json`（注意：在 `.cursor/` 子目录下，**不是**项目根目录的 `.mcp.json`）
- 用户级（全局、所有项目）：`~/.cursor/mcp.json`
- 两级配置会合并；同名 server 出现时，**项目级优先**于全局级。配置改动后需重启 Cursor。
- 也支持通过 UI（Customize → MCPs）和扩展 API（`vscode.cursor.mcp.registerServer()`）注册。

**配置 snippet（stdio 本地服务器）**
```json
{
  "mcpServers": {
    "server-name": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "mcp-server"],
      "env": { "API_KEY": "value" }
    }
  }
}
```
- 参考文档的 STDIO 字段表：`type`（"stdio"）、`command`（必填，需在 PATH 中或绝对路径）、`args`、`env`、`envFile`（仅 stdio 支持，如 `${workspaceFolder}/.env`）。多数示例省略 `type`（有 `command` 时按 stdio 处理）。
- 远程（HTTP/SSE）用 `url` + `headers`（+ `auth` 静态 OAuth 字段）。支持 config interpolation：`${env:NAME}`、`${userHome}`、`${workspaceFolder}`（即包含 `.cursor/mcp.json` 的项目根）、`${workspaceFolderBasename}` 等，可用在 `command`/`args`/`env`/`url`/`headers` 中。

**.mcp.json 共享标准支持**：**不支持**项目根目录的共享 `.mcp.json`。官方文档只定义 `.cursor/mcp.json`。好消息是两者 schema 完全一致（`mcpServers` 键 + `command`/`args`/`env`），可以把标准 `.mcp.json` 的 JSON 内容**原样复制**到 `.cursor/mcp.json` 即可（社区有向官方请求支持根目录 `.mcp.json` 的讨论，但文档未收录）。

**cwd 行为**：文档**未说明** stdio 服务器进程的 cwd 如何确定，配置里也**没有 `cwd` 字段**。官方建议通过 `${workspaceFolder}` 插值把项目路径显式传给 `args`/`env`（如 `"args": ["${workspaceFolder}/tools/mcp_server.py"]`）。

**Gotchas**
- 审批：Cursor 3.6+ 默认 **Auto-review** 模式（允许列表中的 MCP 工具直接运行，其余走安全分类器）；**Allowlist** 模式保留旧的纯白名单行为。可在 Settings → Agents → Approvals & Execution 配置，或通过 `permissions.json` 预配置。
- Cursor CLI（`agent`）与编辑器共用同一套 MCP 配置，有 `agent mcp list / list-tools / enable / disable / login` 和 `agent --approve-mcps` 跳过审批。
- 传输支持 stdio / SSE / Streamable HTTP；支持 MCP Apps 扩展（工具返回交互式 UI）。
- 调试：Output 面板选 "MCP Logs"；环境变量需在 shell profile 中可用（重启 Cursor 生效）。
- 协议版本：文档未列出具体 protocolVersion 支持号。

### opencode

**配置文件与位置**
- 项目级：项目根目录 `opencode.json` / `opencode.jsonc`（也支持 `.opencode/opencode.json(c)` 形式）
- 用户级（全局）：`~/.config/opencode/opencode.json(c)`
- 启动时从当前目录向上到项目根搜索并**合并**配置，目录层级更近的覆盖更远的，全局配置优先级最低。
- MCP 服务器定义在配置的 `mcp` 键下（不是顶层 `mcpServers`）。

**配置 snippet（stdio 本地服务器）**
```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "my-local-mcp-server": {
      "type": "local",
      "command": ["npx", "-y", "my-mcp-command"],
      "enabled": true,
      "cwd": ".",
      "environment": { "MY_ENV_VAR": "value" }
    }
  }
}
```
- 字段：`type: "local"`、`command`（**数组**：命令+参数）、`cwd`、`environment`（注意字段名是 `environment` 不是 `env`）、`enabled`、`timeout`（默认 5000ms）。
- 远程：`type: "remote"` + `url` + `headers` + `oauth`；env 引用语法为 `{env:VAR}`（花括号）。OAuth 自动处理（支持动态客户端注册 DCR），token 存 `~/.local/share/opencode/mcp-auth.json`。

**.mcp.json 共享标准支持**：**不支持**。GitHub 上多次请求读取 Claude Code 的 `.mcp.json`（issue #1910、#14888），均未实现（后者被机器人按 60 天无活动自动关闭）。项目级 MCP 的官方做法就是在项目根放一份含 `mcp` 键的 `opencode.json`（issue #9931 由维护者确认：项目根的 opencode.json 会与全局配置合并）。社区有 `opencode-claude-code-bridge` 之类工具桥接 `.mcp.json`，但非官方。

**cwd 行为**：**显式支持 `cwd` 字段**——"Working directory for the MCP server process. Relative paths resolve from the workspace."（相对路径从 workspace 解析）。默认值文档未明说（推断为 opencode 启动时的目录，未验证）。

**Gotchas**
- 无每次调用的审批弹窗机制；工具启用/禁用通过 `tools` 配置（按 server 名前缀 glob，如 `"my-mcp*": false`）实现，也可按 agent 单独启用。
- CLI：`opencode mcp list / auth / logout / debug`；远程 OAuth 需要浏览器授权。
- MCP 工具会显著增加上下文 token 消耗，官方建议谨慎启用。
- 协议版本：未在文档中列出。

### trae（字节跳动 TraeCode IDE + TraeCode CLI）

**配置文件与位置**
- **IDE 项目级**：项目根目录 `.trae/mcp.json`（注意在 `.trae/` 目录下）。需要在 设置 → MCP 中打开 **"启用项目级 MCP"** 开关并确认弹窗后才会自动加载（有安全提示：确保项目文件可信）。
- **IDE 用户级**：通过设置中心 → MCP → 添加 → 手动添加，在输入框粘贴 JSON（存于用户设置目录，社区资料显示 Windows 为 `%APPDATA%\Trae\User\settings\mcp`；官方未明确列出该路径）。
- **TraeCode CLI**：全局配置 `trae_cli.yaml`，用 `traecli config edit` 编辑。路径：
  - macOS：`~/Library/Application Support/trae_cli/trae_cli.yaml`
  - Linux：`$XDG_CONFIG_HOME/trae_cli/trae_cli.yaml`（未设置时 `$HOME/.config/trae_cli/trae_cli.yaml`）
  - Windows：`%USERPROFILE%\AppData\Roaming\trae_cli\trae_cli.yaml`

**配置 snippet（IDE 项目级 `.trae/mcp.json`，schema 与 Claude Code 标准一致）**
```json
{
  "mcpServers": {
    "mcp_name": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "API_KEY": "value" }
    }
  }
}
```
- HTTP 类型：`{"mcpServers": {"mcp_name": {"url": "https://example.com/mcp", "headers": {...}}}}`
- 超时：stdio 通过 `env` 传 `START_MCP_TIMEOUT_MS` / `RUN_MCP_TIMEOUT_MS`（HTTP 则放 `headers`）。
- 变量引用：**仅支持 `${workspaceFolder}`**，在启动时替换为项目根路径。

**TraeCode CLI 配置 snippet（YAML）**
```yaml
mcp_servers:
  - name: "my-local-tool"
    type: stdio          # stdio | sse | http
    command: "/path/to/your/tool"   # 必须是绝对路径
    args: ["--arg1"]
    env: { ENV_VAR_NAME: "some_value" }
    timeout: 100s
    disabled_tools: ["*pattern*"]
```
- CLI 字段：`name`、`type`（stdio/sse/http）、`command`（绝对路径）、`args`、`env`、`timeout`、`disabled_tools`；SSE/HTTP 另有 `url`、`headers`。

**.mcp.json 共享标准支持**：**部分支持**——不是根目录 `.mcp.json`，而是 `.trae/mcp.json`，但 **schema 与标准完全兼容**：官方文档明确说"若你已在其他 IDE 中配置了 MCP Server，可点击『原始配置（JSON）』把 JSON 粘贴到 TraeCode 的 mcp.json 中复用"。

**cwd 行为**：IDE 的 stdio 配置**没有 `cwd` 字段**；官方提供的取项目路径的方式就是 `${workspaceFolder}` 插值（如 `"args": ["${workspaceFolder}/plugins/mcp.js"]`）。CLI 也没有 cwd 字段，且要求 `command` 为绝对路径。

**Gotchas**
- IDE 文档警告：`command` **不能包含空格**，否则解析错误。
- 本地 server 需要本机安装 npx 或 uvx。
- 项目级 MCP 默认关闭，需手动打开开关；打开时有确认弹窗（防恶意配置）。
- 第三方 MCP server 不被审查，官方有免责声明；部分 server 可能因网络/法规无法访问。
- 工具调用受 IDE/CLI 的权限模式（权限模式、工具使用权限）管控。
- 支持 stdio、SSE、Streamable HTTP；文档列出的协议能力包含 tools/list 分页、listChanged 通知、结构化输出（outputSchema，属 2025-06-18 修订特性），但未明确标注 protocolVersion 号。

### OpenAI Codex CLI（codex）

**配置文件与位置**
- 用户级：`~/.codex/config.toml`
- 项目级：项目根目录 `.codex/config.toml`
- 合并顺序（后者覆盖前者）：内置默认 → 全局 `~/.codex/config.toml` → 项目 `.codex/config.toml` → profile 覆盖 → CLI flags → 环境变量。
- 也有 `codex mcp add` 等命令直接写入配置。

**配置 snippet（TOML，stdio 本地服务器）**
```toml
[mcp_servers.my-server]
command = "npx"
args = ["-y", "@my-org/my-mcp-server"]
enabled = true

[mcp_servers.my-server.env]
DEBUG = "mcp:*"
```
- 字段（来自官方 `codex-rs/core/config.schema.json`）：`command`、`args`、`url`、`enabled`、`required`（连不上则启动失败）、`env`、`env_vars`（从父进程继承的变量名列表）、**`cwd`**、`bearer_token_env_var`、`http_headers`、`env_http_headers`、`startup_timeout_sec`/`startup_timeout_ms`、`tool_timeout_sec`、`enabled_tools`/`disabled_tools`（白/黑名单）、`scopes`、`oauth_resource`、`oauth`、`environment_id`、`default_tools_approval_mode`、`supports_parallel_tool_calls` 等。
- 远程（Streamable HTTP）：`[mcp_servers.remote-server] url = "https://mcp.example.com"` + `bearer_token_env_var`/`http_headers`。

**CLI 管理命令**
```bash
codex mcp list [--json]
codex mcp add my-server -- npx -y @my-org/my-mcp-server      # 注意 -- 分隔
codex mcp add remote-server --url https://mcp.example.com --bearer-token-env-var MCP_TOKEN
codex mcp get my-server [--json]
codex mcp remove my-server
```

**.mcp.json 共享标准支持**：**不支持**（仅 `config.toml`）。

**cwd 行为**：**显式支持 `cwd` 字段**（"Working directory for the server process"，仅 stdio）。默认值文档未明说（推断为 codex 进程的启动目录，未验证）。

**Gotchas**
- 审批由 `approval_policy`、`sandbox_mode` 控制；每服务器还有 `default_tools_approval_mode`。
- OAuth 支持：`codex mcp login/logout`、`scopes`、`oauth_resource`、回调端口配置。
- `required = true` 时服务器连不上会导致 codex 启动失败。
- 协议版本：文档未列出。

### Claude Code（`.mcp.json` 标准的发起者）

**配置文件与位置（三种作用域）**
| 作用域 | 加载范围 | 团队共享 | 存储位置 |
| --- | --- | --- | --- |
| local（默认） | 仅当前项目 | 否 | `~/.claude.json`（该项目路径的 key 下） |
| project | 仅当前项目 | 是（提交版本库） | 项目根目录 **`.mcp.json`** |
| user | 所有项目 | 否 | `~/.claude.json` |
- 企业级：managed configuration（管理员下发）。
- 作用域优先级：local > project > user > 插件提供 > claude.ai connectors；按名称去重，**整个条目替换，不做字段合并**。

**安装命令**
```bash
# stdio（-- 后是服务器命令，原样传给服务器）
claude mcp add --env AIRTABLE_API_KEY=YOUR_KEY --transport stdio airtable -- npx -y airtable-mcp-server
# HTTP / SSE
claude mcp add --transport http notion https://mcp.notion.com/mcp
claude mcp add --transport sse asana https://mcp.asana.com/sse
# 指定作用域
claude mcp add --transport http stripe --scope user https://mcp.stripe.com
# 从 JSON 添加
claude mcp add-json local-weather '{"type":"stdio","command":"/path/to/weather-cli","args":["--api-key","abc123"],"env":{"CACHE_DIR":"/tmp"}}'
claude mcp list / claude mcp get <name> / claude mcp remove <name> / /mcp 面板
```

**`.mcp.json`（project 作用域）schema**
```json
{
  "mcpServers": {
    "shared-server": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "my-mcp-server"],
      "env": { "API_KEY": "${API_KEY}" }
    }
  }
}
```
- 远程：`{"type": "http"|"sse"|"ws", "url": "..."}`；`streamable-http` 是 `http` 的别名。**有 `url` 但没有 `type` 是配置错误**（Claude Code 会把无 `type` 的条目当 stdio 读，然后跳过并报错）。
- 环境变量展开：`${VAR}` 与 `${VAR:-default}`，支持位置：`command`、`args`、`env`、`url`、`headers`。变量缺失时给出 warning 并保留原样。

**cwd 行为（文档明确，与其他客户端差异最大）**：
> Claude Code sets `CLAUDE_PROJECT_DIR` in the spawned server's environment to the project root, so your server can resolve project-relative paths **without depending on the working directory**.

- 即：**不保证 stdio 服务器进程的 cwd 是项目根**；官方推荐服务器读取环境变量 `CLAUDE_PROJECT_DIR`（Node: `process.env.CLAUDE_PROJECT_DIR`；Python: `os.environ["CLAUDE_PROJECT_DIR"]`），它是稳定的项目根。
- 在 `.mcp.json` 的 `command`/`args` 里引用 `${CLAUDE_PROJECT_DIR}` 需要带默认值：`${CLAUDE_PROJECT_DIR:-.}`（该变量只注入到服务器进程环境，不在 Claude Code 自身环境）。
- `roots/list`：Claude Code 返回会话启动目录 + 所有附加工作目录（`--add-dir`、`/add-dir`、`additionalDirectories` 设置），并发送 `notifications/roots/list_changed`。

**Gotchas**
- **项目级服务器需要审批**：交互式会话中首次使用 `.mcp.json` 里的服务器会弹审批（workspace trust）；`claude -p`、Agent SDK、云会话**不会**弹审批、直接加载。可用 `claude mcp reset-project-choices` 重置选择。
- 审批相关设置（settings.json）：`enableAllProjectMcpServers`、`enabledMcpjsonServers`、`disabledMcpjsonServers`。注意：提交到仓库的 `.claude/settings.json` 里的审批在**未信任的目录会被忽略**；`~/.claude/settings.json`、managed settings 仍生效。
- 工具级强制审批：服务器可在 `tools/list` 的条目中设置 `"_meta": {"anthropic/requiresUserInteraction": true}`（v2.1.199+），该工具每次调用都弹审批。
- 其他：`MCP_DISCOVERY_CACHE=0` 关闭发现缓存（v2.1.221+）；`--mcp-config` 跳过项会出现在 `system/init` 的 `mcp_server_errors`；OAuth 支持（`claude mcp login/logout`、回调端口）。
- 协议版本：官方文档未列出版本号；社区资料显示 Claude Code 协商支持 2024-11-05 与 2025-03-26（服务器应兼容较老版本做回退）。**未能验证其是否接受 2025-06-18/2025-11-25 作为协商版本。**

---

## .mcp.json 共享标准

| 客户端 | 支持根目录共享 `.mcp.json`？ | 自动发现 | 自己的等价文件（schema 是否兼容） |
| --- | --- | --- | --- |
| **Claude Code** | ✅ 是（标准发起者） | 是（项目作用域，需首次审批） | `.mcp.json`（标准本身） |
| **Cursor** | ❌ 否 | 否 | `.cursor/mcp.json`（**schema 相同**，JSON 可原样复用） |
| **opencode** | ❌ 否 | 否 | `opencode.json` 的 `mcp` 键（`command` 数组、`environment`，需改写） |
| **Trae IDE** | ⚠️ 半支持（`.trae/mcp.json` 而非根目录） | 是（需打开"启用项目级 MCP"开关） | `.trae/mcp.json`（**schema 相同**，JSON 可原样复用） |
| **Codex CLI** | ❌ 否 | 否 | `~/.codex/config.toml` / `.codex/config.toml` 的 `[mcp_servers.*]`（需改写为 TOML） |

**结论**：五个客户端中只有 Claude Code 会自动发现项目根目录的标准 `.mcp.json`。但 `mcpServers` JSON schema 是事实上的共享格式——Cursor 与 Trae 的文件虽然路径不同，内容 schema 完全一致，一份 JSON 可以原样拷进三家（Claude Code / Cursor / Trae）；opencode 与 Codex 需要各自转换格式。

---

## 工作区（cwd）解析对比

| 客户端 | cwd 如何传给 stdio 服务器 | 备注 |
| --- | --- | --- |
| **Claude Code** | 不保证 = 项目根；注入环境变量 `CLAUDE_PROJECT_DIR`（稳定项目根）；`roots/list` 返回启动目录 + 附加目录 | 文档明确，服务器应读 `CLAUDE_PROJECT_DIR`，不要依赖 cwd |
| **Cursor** | 无 `cwd` 字段，文档未说明；用 `${workspaceFolder}` 插值显式传路径 | 另有 `envFile`（stdio only，可引用 `${workspaceFolder}/.env`） |
| **opencode** | 有 `cwd` 字段，相对路径从 workspace 解析 | 默认值文档未明说（推断为启动目录，未验证） |
| **Trae IDE / CLI** | IDE 无 `cwd` 字段，用 `${workspaceFolder}` 插值；CLI 无 `cwd` 字段，`command` 必须绝对路径 | IDE 警告 `command` 不能含空格 |
| **Codex CLI** | 有 `cwd` 字段（stdio only） | 默认值文档未明说（推断为启动目录，未验证） |

**通用建议**：不要依赖 cwd。要么用客户端提供的项目路径机制（Claude Code 的 `CLAUDE_PROJECT_DIR`、Cursor/Trae 的 `${workspaceFolder}` 插值、opencode/Codex 的 `cwd` 字段），要么在配置里显式传 `--project-root <path>` 之类的参数，服务器内部把项目根解析成绝对路径。

---

## 兼容性建议（一个服务器覆盖五个客户端的最小方案）

目标：一个本地 stdio MCP 服务器（TypeScript，`node`/`npx` 启动），项目根为 `/path/to/project`。

**1. 服务器侧（一次编写，处处运行）**
- 只依赖 stdin/stdout（stdio 传输），不绑定任何客户端专属能力。
- **不要依赖 cwd**：启动时依次检查环境变量 `CLAUDE_PROJECT_DIR`、`INIT_CWD` 等，或接受 `--project-root`/`--cwd` 参数，把项目根解析为绝对路径后使用。
- 保持最低协议版本基线为 **2024-11-05**（所有客户端都兼容）；若要使用 2025-06-18 新特性（结构化输出 `outputSchema` 等），注意各客户端支持不一（Trae 文档提及 outputSchema，其余未明确），建议降级兼容。
- 用 `npx -y` 或 `node dist/index.js` 启动，避免依赖全局安装；env 里不放密钥，密钥通过各客户端自己的 env 注入。

**2. 配置侧（每个客户端一份，但内容高度复用）**
- **Claude Code**：项目根放标准 `.mcp.json`（`mcpServers` + `type:"stdio"` + command/args/env）。✅ 自动发现（首次使用需审批）。
- **Cursor**：把同一份 JSON **原样复制**到 `.cursor/mcp.json`（schema 相同，无需改写）。✅ 自动发现，项目级优先。
- **Trae IDE**：把同一份 JSON **原样复制**到 `.trae/mcp.json`，并在设置里打开"启用项目级 MCP"。⚠️ 需一次性开关。
- **opencode**：在项目根 `opencode.json` 的 `mcp` 键下写一份（改写为 `command` 数组 + `environment` 字段）：
  ```jsonc
  {
    "mcp": {
      "my-server": {
        "type": "local",
        "command": ["npx", "-y", "my-mcp-server"],
        "cwd": "."
      }
    }
  }
  ```
- **Codex CLI**：写入 `~/.codex/config.toml`（用户级）或 `.codex/config.toml`（项目级）：
  ```toml
  [mcp_servers.my-server]
  command = "npx"
  args = ["-y", "my-mcp-server"]
  cwd = "."
  ```
- 维护技巧：以标准 `.mcp.json` 为单一事实来源，Cursor/Trae 用符号链接或复制脚本同步（`.cursor/mcp.json`、`.trae/mcp.json` 与 `.mcp.json` 内容一致）。

**3. 各客户端审批/信任注意**
- Claude Code 首次使用项目级服务器要交互审批（`claude -p` 不会）；可用 `enabledMcpjsonServers`/`enableAllProjectMcpServers` 预批。
- Cursor 3.6+ 默认 Auto-review（允许列表工具免审批，其余走分类器）；CLI 用 `--approve-mcps`。
- Trae 需打开项目级 MCP 开关；工具调用受权限模式控制。
- opencode / Codex 默认无逐工具审批弹窗（opencode 通过 `tools`/`permissions` 配置；Codex 通过 `approval_policy` 与 `default_tools_approval_mode`）。

---

## 参考来源

**Cursor**
- Cursor MCP 集成文档（配置位置、schema、审批）：https://cursor.com/help/customization/mcp.md
- Cursor MCP 参考（STDIO 字段表、插值、OAuth、allowlist）：https://cursor.com/docs/mcp.md
- Cursor CLI MCP（agent mcp 命令、--approve-mcps）：https://cursor.com/docs/cli/mcp.md

**opencode**
- opencode MCP 服务器文档（mcp 键、local/remote、cwd、OAuth）：https://opencode.ai/v2/docs/mcp-servers （源码：https://github.com/anomalyco/opencode/blob/main/packages/web/src/content/docs/mcp-servers.mdx）
- opencode 配置文档（全局/项目配置文件位置与合并优先级）：https://opencode.ai/v2/docs/config
- GitHub issue #1910（是否支持 .mcp.json → 未实现）：https://github.com/anomalyco/opencode/issues/1910
- GitHub issue #14888（读取 .mcp.json 的 feature request → 未实现）：https://github.com/anomalyco/opencode/issues/14888
- GitHub issue #9931（项目级 MCP，维护者确认用项目根 opencode.json）：https://github.com/anomalyco/opencode/issues/9931
- 桥接工具（非官方）：https://github.com/EmilioEsposito/opencode-claude-code-bridge

**Trae**
- TraeCode（IDE）MCP 概览（传输类型、协议能力）：https://docs.trae.cn/ide_model-context-protocol
- TraeCode（IDE）添加 MCP Server（`.trae/mcp.json`、schema、${workspaceFolder}、超时）：https://docs.trae.cn/ide_add-mcp-servers
- TraeCode CLI MCP（trae_cli.yaml、mcp_servers 字段）：https://docs.trae.cn/cli_model-context-protocol
- TraeCode CLI 全局设置（trae_cli.yaml 路径）：https://docs.trae.cn/cli_global-settings
- 社区：Trae 用户级 mcp 存储位置（Windows `%APPDATA%\Trae\User\settings\mcp`）：https://socket.dev/npm/package/@xzxzzx/bilibili-mcp/overview/1.4.5#2

**Codex CLI**
- Codex MCP 服务器文档（config.toml 位置、字段、CLI 命令）：https://mintlify.wiki/openai/codex/configuration/mcp-servers
- Codex 配置总览（全局/项目 config.toml、合并顺序）：https://mintlify.wiki/openai/codex/configuration/overview
- Codex 配置 schema（mcp_servers 全字段）：https://github.com/openai/codex/blob/main/codex-rs/core/config.schema.json
- 官方入口（本环境无法访问，供参考）：https://developers.openai.com/codex/mcp

**Claude Code**
- Claude Code MCP 文档（安装、作用域、CLAUDE_PROJECT_DIR、.mcp.json schema、审批）：https://code.claude.com/docs/en/mcp
- Claude Code 设置文档（enableAllProjectMcpServers / enabledMcpjsonServers / disabledMcpjsonServers）：https://code.claude.com/docs/en/settings
- 相关 issue（项目级配置合并行为）：https://github.com/anthropics/claude-code/issues/62594

**MCP 规范**
- MCP 规范 2025-06-18 关键变更（相对 2025-03-26）：https://modelcontextprotocol.io/specification/2025-06-18/changelog
- 官方客户端列表（Claude、Cursor 等均支持 MCP）：https://modelcontextprotocol.io/clients
- 最新修订 2025-11-25 存在的社区佐证：https://github.com/basicmachines-co/basic-memory/issues/500

---

### 未能验证 / 存疑的事实
1. **各客户端具体支持的 protocolVersion**：官方文档均未列出。Claude Code 历史上协商 2024-11-05 与 2025-03-26；Trae 文档暗示支持 2025-06-18 特性（outputSchema）；Cursor / opencode / Codex 无公开说明。是否接受 2025-06-18/2025-11-25 作为协商版本未验证。
2. **Cursor stdio 服务器进程的默认 cwd**：文档未说明，社区无一致结论；仅确认可用 `${workspaceFolder}` 插值。
3. **opencode / Codex 的 `cwd` 默认值**：文档只说明字段存在，未说明省略时的默认目录（推断为启动目录）。
4. **Trae IDE 用户级 mcp.json 的精确路径**：官方未列出，仅有社区来源（Windows `%APPDATA%\Trae\User\settings\mcp`），macOS/Linux 路径未验证。
5. **TraeCode CLI 是否有项目级配置文件**：官方文档只描述了全局 `trae_cli.yaml`。
