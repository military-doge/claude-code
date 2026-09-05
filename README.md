# Claude Code · cc-haha 个人版

本仓库是 [NanmiCoder/cc-haha](https://github.com/NanmiCoder/cc-haha)（Claude Code Haha）的**个人 fork**。cc-haha 是依据 2026-03-31 从 Anthropic npm registry 泄露的 Claude Code 源码修复而成的项目；本仓库在它的基础上做了一些针对个人使用的改动。

> ⚠️ 原始源码版权归 [Anthropic](https://www.anthropic.com) 所有。本仓库仅用于学习与研究，**禁止商用**，详见 [LICENSE](LICENSE)。

## 相对上游的改动

以下为本仓库相对 [cc-haha 上游](https://github.com/NanmiCoder/cc-haha) 的差异，其余功能与上游保持一致。

### 1. `/model` 每个槽位可独立配置服务商

`MODEL_SLOT_N_*` 每个槽位可带自己的 `_BASE_URL` / `_API_KEY`。选中某槽后，其接口地址与 Bearer 凭据写入进程环境并作用于整个会话（含子代理 / teammate）；所选槽序号持久化到 `settings.modelSlot`，重启后精确恢复到原槽，同名引擎的不同槽互不混淆。

### 2. `.env` 服务商分组，模型槽不再重复写 URL / Key

声明一次 `MODEL_PROVIDER_N_BASE_URL` / `MODEL_PROVIDER_N_API_KEY`，其下穿插该服务商的模型槽；模型槽跨服务商全局顺序编号（1, 2, 3 …），按 `.env` 文件行序就近归属到前面的服务商块。纯加载器改动，选择器、环境应用与默认值逻辑不受影响：

```
MODEL_PROVIDER_1_BASE_URL=https://api.example-a.com/anthropic
MODEL_PROVIDER_1_API_KEY=sk-xxxx
MODEL_SLOT_1_MODEL=provider-a-pro
MODEL_SLOT_2_MODEL=provider-a-flash

MODEL_PROVIDER_2_BASE_URL=https://api.example-b.com/anthropic
MODEL_PROVIDER_2_API_KEY=sk-yyyy
MODEL_SLOT_3_MODEL=provider-b-turbo
```

### 3. 移除提交 / PR 的 Claude attribution

删除 attribution 相关机制，`git commit` 与 PR 描述不再自动追加 `Co-Authored-By: Claude …` / `Generated with Claude Code …` 尾注，同时移除了对应的 `attribution` / `includeCoAuthoredBy` 设置项。

## 本地运行

```bash
bun install
cp .env.example .env   # 按需编辑模型服务商与槽位
./bin/claude-haha
```

环境变量说明见 [docs/guide/env-vars.md](docs/guide/env-vars.md)。

## 上游功能

桌面端工作台、Pets、H5 远程访问、IM 接入、Computer Use、定时任务等完整功能均来自上游 cc-haha。介绍、截图与使用文档请查看上游项目：[NanmiCoder/cc-haha](https://github.com/NanmiCoder/cc-haha)。

## 贡献

本仓库为个人 fork，Bug 报告与新功能请前往上游 [NanmiCoder/cc-haha](https://github.com/NanmiCoder/cc-haha)，详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可

沿用上游 [LICENSE](LICENSE)：仅限学习与研究用途，禁止商用，原始源码版权归 Anthropic。
