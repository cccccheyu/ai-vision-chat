---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: 5246f3eb1d20968264c0b7a415250407_96a9c7a0688a11f1a99c5254007bceed
    ReservedCode1: ZcP7k9g8Ig4Wz8yHBC1jJoJXO/MYG7fzy58eh5OjWAu221t+3gRlWNxMoq4ofGWrpBVHWCTRgHwmFzFTCM1Kgef0d1mjASfgwrWyRLQh0OI93Tf4BI1uH+9dY5E9Ib8CPLyvpBA6SMdeqWxp+r51U9JGCRRWHPDxmGRTb9wjSPs0xlJAzhIS6RqHtNk=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: 5246f3eb1d20968264c0b7a415250407_96a9c7a0688a11f1a99c5254007bceed
    ReservedCode2: ZcP7k9g8Ig4Wz8yHBC1jJoJXO/MYG7fzy58eh5OjWAu221t+3gRlWNxMoq4ofGWrpBVHWCTRgHwmFzFTCM1Kgef0d1mjASfgwrWyRLQh0OI93Tf4BI1uH+9dY5E9Ib8CPLyvpBA6SMdeqWxp+r51U9JGCRRWHPDxmGRTb9wjSPs0xlJAzhIS6RqHtNk=
---

# AI 视觉对话助手 — 设计文档

## 一、产品概述

基于 WebRTC 的 AI 视觉对话助手，用户通过摄像头拍照 + 语音/文字提问，AI 分析画面内容并语音回复。

**技术栈：** Vue 3 + Vite、WebRTC (getUserMedia)、Web Speech API、智谱 GLM-4V-Flash

---

## 二、用户故事

| # | 用户故事 | 计划实现 | 最终实现 |
|---|---|---|---|
| 1 | 作为用户，我希望打开摄像头后 AI 能"看到"我的画面，并基于画面内容回答我的问题 | ✅ | ✅ 已实现（WebRTC getUserMedia + Canvas 截图 + 智谱多模态 API） |
| 2 | 作为用户，我希望用语音直接向 AI 提问，无需打字 | ✅ | ✅ 已实现（Web Speech API 语音识别，15s 超时保护） |
| 3 | 作为用户，我希望 AI 用语音回答我，而不只是文字 | ✅ | ✅ 已实现（Web Speech API TTS 合成） |
| 4 | 作为用户，我可以在拍照后输入文字补充说明 | ✅ | ✅ 已实现（图片 + 文字混合发送） |
| 5 | 作为用户，我第一次使用时希望有引导告诉我怎么操作 | ✅ | ✅ 已实现（onboarding 三步引导） |
| 6 | 作为用户，我希望知道 AI 正在思考，不会干等 | ✅ | ✅ 已实现（"思考中..." 加载态） |
| 7 | 作为用户，我希望能配置自己的 API Key 和模型 | ✅ | ✅ 已实现（设置面板，localStorage 持久化） |
| 8 | 作为用户，我希望能和 AI 进行多轮对话，AI 记住上下文 | ✅ | ❌ 未实现（当前每轮独立，messages 未传给 API 作为上下文） |
| 9 | 作为用户，我希望拍照后能预览确认再发送 | ✅ | ❌ 未实现（拍照直接发送，无预览环节） |
| 10 | 作为用户，我希望 AI 的回复支持格式化（代码块、列表等） | ✅ | ❌ 未实现（Markdown 渲染未集成） |

---

## 三、端云协同成本控制策略

| # | 技巧 | 是否采用 |
|---|---|---|
| 1 | **图片压缩** — Canvas JPEG quality 0.6，640×480 分辨率，大幅减少传输体积 | ✅ 已采用 |
| 2 | **API 请求低 detail 模式** — 请求 image_url 时 `detail: 'low'`，降低 token 消耗 | ✅ 已采用 |
| 3 | **限制 max_tokens** — 每次请求 `max_tokens=500`，避免超长回复 | ✅ 已采用 |
| 4 | **本地语音识别** — Web Speech API 完全在浏览器端执行，零云端成本 | ✅ 已采用 |
| 5 | **本地 TTS 合成** — Web Speech API speechSynthesis 浏览器原生能力，零云端成本 | ✅ 已采用 |
| 6 | **按需发送** — 仅在用户主动提问时发送请求，不做实时视频流分析，避免持续 token 消耗 | ✅ 已采用 |
| 7 | **选用低成本模型** — GLM-4V-Flash 是智谱最具性价比的多模态模型 | ✅ 已采用 |
| 8 | **请求去重与缓存** — 相同画面短时间内不重复请求 | ❌ 未采用（实现复杂度较高，Demo 阶段优先级低） |
| 9 | **流式输出** — 减少用户等待感知，但不降低实际成本 | ❌ 未采用（非成本控制核心，Demo 阶段暂不实现） |
| 10 | **边缘推理** — 使用 WebGPU/WebNN 在浏览器端做轻量预处理 | ❌ 未采用（浏览器兼容性差，Demo 阶段不适用） |

---

## 四、综合技术方案说明

### 端云分工

| 层级 | 职责 | 成本 |
|---|---|---|
| **端侧（浏览器）** | 摄像头采集、Canvas 截图压缩、语音识别与合成、UI 交互。全部依赖浏览器原生 API | 零服务器成本 |
| **云侧（智谱 API）** | 多模态视觉理解与文本生成。仅传输压缩后的 JPEG + 用户文本 | 每次请求 token 可控 |

### 端云协同核心策略

端侧尽可能预处理和降质，云侧仅做「不得不放云端」的多模态推理。

- **图片在端侧压缩**（JPEG quality 0.6、640×480），减少上行带宽和 API token 消耗
- **语音全链路端侧处理**，Web Speech API 识别 + TTS 合成均不经过云端
- **请求频率由用户控制**，不做实时视频流分析，避免持续计费
- **API 参数优化**：`detail: 'low'` 降低图片 token 消耗，`max_tokens=500` 限制回复长度
*（内容由AI生成，仅供参考）*
