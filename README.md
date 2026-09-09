# Claude Code · 个人版

本仓库是 [NanmiCoder/cc-haha](https://github.com/NanmiCoder/cc-haha)（Claude Code Haha）的**个人 fork**。cc-haha 是依据 2026-03-31 从 Anthropic npm registry 泄露的 Claude Code 源码修复而成的项目；本仓库在它的基础上做了一些针对个人使用的改动。

> 本仓库仅**测试与维护 Windows 与 WSL** 环境下的 CLI 功能，其他条件下不保证可用。

## 相对上游的改动

以下为本仓库相对 [cc-haha 上游](https://github.com/NanmiCoder/cc-haha) 的差异，其余功能与上游保持一致。

### 1. `/model` 每个槽位可独立配置服务商

`MODEL_SLOT_N_*` 每个槽位可带自己的 `_BASE_URL` / `_API_KEY`。选中某槽后，其接口地址与 Bearer 凭据写入进程环境并作用于整个会话（含子代理 / teammate）；所选槽序号持久化到 `settings.modelSlot`，重启后精确恢复到原槽，同名引擎的不同槽互不混淆。

### 2. `.env` 服务商分组，模型槽不再重复写 URL / Key

声明一次 `MODEL_PROVIDER_N_BASE_URL` / `MODEL_PROVIDER_N_API_KEY`，其下穿插该服务商的模型槽；模型槽跨服务商全局顺序编号（1, 2, 3 …），按 `.env` 文件行序就近归属到前面的服务商块。纯加载器改动，选择器、环境应用与默认值逻辑不受影响：

```dotenv
MODEL_PROVIDER_1_BASE_URL=https://api.example-a.com/anthropic
MODEL_PROVIDER_1_API_KEY=sk-xxxx
MODEL_SLOT_1_MODEL=provider-a-pro
MODEL_SLOT_2_MODEL=provider-a-flash

MODEL_PROVIDER_2_BASE_URL=https://api.example-b.com/anthropic
MODEL_PROVIDER_2_API_KEY=sk-yyyy
MODEL_SLOT_3_MODEL=provider-b-turbo
```

### 3. 移除 git 提交与 GitHub PR 里的 Claude 署名

默认在 `git commit` 的提交说明和 GitHub PR 描述里，会自动附带一段 Claude 署名尾注（`Co-Authored-By: Claude …` / `Generated with Claude Code …`）。本改动删除该水印，提交历史与 PR 描述不再追加该尾注；同步移除了对应的 `attribution` / `includeCoAuthoredBy` 设置项。

### 4. 跨平台 `claude` 快捷启动

上游默认在仓库内启动，命令 / 入口叫 `claude-haha`；本仓库统一改名 `claude`（入口 `./bin/claude`），支持 Windows（cmd / PowerShell）与 WSL / Linux，在任意目录敲 `claude`，将会在该目录打开使用 `.env` 中配置的模型的会话。

配套改动：启动脚本增加 `readlink -f` 符号链接解析，保证经快捷命令 / bun 全局链接启动时能正确定位项目根与 `.env`（否则报 `Module not found "./src/entrypoints/cli.tsx"`）。各系统详细配置见[「命令行 `claude` 快捷启动配置」](#命令行-claude-快捷启动配置)。

## 本地部署与运行

为便于非程序员用户使用及新手练习命令，本节自仓库克隆开始，按步骤说明至最终启动。以下命令均可在对应终端中直接复制执行。

**步骤一：将仓库克隆或下载到本地**

- 方式一（下载压缩包）：打开本仓库的 GitHub 页面，点击 **Code → Download ZIP**，解压至本地，得到项目文件夹（下文称 `<仓库路径>`）。
- 方式二（Git 克隆）：执行

  ```bash
  git clone https://github.com/military-doge/claude-code.git
  ```

  仓库路径请自行选择。执行后生成的 `claude-code` 文件夹即为 `<仓库路径>`。

**步骤二：安装 bun 运行时**

- Windows（在 PowerShell 中执行，安装完成后重新打开终端）：

  ```powershell
  powershell -c "irm bun.sh/install.ps1 | iex"
  ```

- WSL / Linux（在终端中执行，安装完成后重新打开终端）：

  ```bash
  curl -fsSL https://bun.sh/install | bash
  ```

- 验证安装：新开终端输入 `bun --version`，能够显示版本号即为成功。

**步骤三：进入项目目录**

在终端中切换至 `<仓库路径>`，例如：

- WSL / Linux：`cd ~/claude-code`
- Windows：`cd D:\claude-code`

**步骤四：安装依赖并生成配置文件**

```bash
bun install
cp .env.example .env
```

Windows 中请以 `copy .env.example .env` 代替 `cp`。

**步骤五：编辑 `.env`，填写模型服务商**

使用记事本或 VS Code 打开 `.env`，参照文件内注释填写服务商接口地址与密钥（各服务商的密钥请前往对应官网申请）。

**步骤六：启动**

- WSL / Linux：

  ```bash
  ./bin/claude
  ```

- Windows（cmd / PowerShell）：

  ```powershell
  bun --feature=TRANSCRIPT_CLASSIFIER .\src\entrypoints\cli.tsx
  ```

出现交互界面即部署成功。

## 命令行 `claude` 快捷启动配置

本仓库启动入口是 `./bin/claude`（bash 包装脚本，加载仓库根 `.env` 的模型槽位后运行 Ink TUI）。想在任意目录敲 `claude` 启动，各系统做法如下。

> **提示**：完成首次启动后，亦可要求 Claude Code 阅读本文档，由其协助完成后续的快捷启动配置。

### Windows（原生 cmd / PowerShell）

Windows 上没有 bash，`./bin/claude` 无法运行，改用一个 `claude.bat` 文件达到同样效果。按下面三步操作：

1. 新建一个文本文件，粘贴下面的脚本内容，保存为 `claude.bat`。把其中 `D:\claude-code`（仓库默认目录）**替换成你解压/克隆后的实际路径**。
2. 把 `claude.bat` 移动到 `C:\Users\<用户名>\.bun\bin\` 目录下（`<用户名>` 替换为你的 Windows 用户名；该目录由安装 bun 时创建，并已自动加入 PATH）。
3. **重新打开**一个终端（cmd 或 PowerShell），在任意目录直接输入 `claude` 并回车，即可启动会话。

```bat
@echo off
setlocal
set CALLER_DIR=%CD%
set CLAUDE_ROOT=D:\claude-code
cd /d "%CLAUDE_ROOT%"
bun --feature=TRANSCRIPT_CLASSIFIER "%CLAUDE_ROOT%/src/entrypoints/cli.tsx" %*
```

### Linux（以 WSL 实测）

Linux 上有 bash，可直接复用仓库自带的 `./bin/claude` 脚本，只需两条命令让它全局可用：

1. 打开终端，运行下面三行命令（`/home/user/claude-code` 是仓库默认目录，若你的仓库放在别处请**替换成你解压/克隆后的实际路径**）。`bun link` 把本仓库注册为全局包，`bun install -g claude-code-local` 会在 `~/.bun/bin` 目录下生成一个名为 `claude` 的链接指向本仓库；该目录由安装 bun 时创建，并已自动加入 PATH。
2. **重新打开**一个终端，在任意目录直接输入 `claude` 并回车，即可启动会话。

```bash
cd /home/user/claude-code
bun link
bun install -g claude-code-local
```

## 上游功能

桌面端工作台、Pets、H5 远程访问、IM 接入、Computer Use、定时任务等完整功能均来自上游 cc-haha。介绍、截图与使用文档请查看上游项目：[NanmiCoder/cc-haha](https://github.com/NanmiCoder/cc-haha)。

## 贡献

本仓库为个人 fork，非魔改引发的 Bug 报告与新功能请前往上游 [NanmiCoder/cc-haha](https://github.com/NanmiCoder/cc-haha)，详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可

沿用上游 [LICENSE](LICENSE)：仅限学习与研究用途，禁止商用，原始源码版权归 Anthropic。
