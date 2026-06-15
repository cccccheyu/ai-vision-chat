# AI 视觉对话助手

基于 Vue 3 + Vite 构建的 Web 端 AI 视觉对话应用。通过摄像头或麦克风与 AI 进行实时多模态交互，支持语音输入、图像识别和自然语言对话。

## Demo 视频

> [点击观看 Demo 视频](https://www.bilibili.com/video/BV1WCJg6pEcJ/)

## 功能特性

- **摄像头接入**：调用设备摄像头实时采集画面，发送给 AI 进行视觉分析
- **语音交互**：Web Speech API 实现语音识别（Speech-to-Text）和语音合成（Text-to-Speech）
- **多模态对话**：结合图像和语音输入，与 AI 进行自然语言对话
- **GLM-4V-Flash**：使用智谱免费多模态模型，支持视觉理解与问答

## 技术栈

| 模块 | 技术 |
|------|------|
| 框架 | Vue 3 (Composition API) |
| 构建 | Vite |
| AI 模型 | GLM-4V-Flash（智谱 AI） |
| 摄像头 | WebRTC / MediaDevices API |
| 语音识别 | Web Speech API（推荐 Chrome/Edge） |
| 语音合成 | SpeechSynthesis API |

## 项目结构

```
src/
├── App.vue                    # 主界面
├── composables/
│   ├── useCamera.js           # 摄像头/麦克风管理
│   ├── useVision.js           # AI 视觉对话（OpenAI 兼容接口）
│   └── useVoice.js            # 语音识别 + 语音合成
└── components/
    └── ...
```

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 使用说明

1. 启动后打开浏览器（推荐 Chrome/Edge）
2. 允许摄像头和麦克风权限
3. 在设置中填入智谱 API Key（[申请地址](https://open.bigmodel.cn/)）
4. 点击「拍照」或「开始对话」，AI 将分析画面内容并回复

## API 配置

默认使用智谱 AI 的 OpenAI 兼容接口：

- **模型**：`glm-4v-flash`
- **接口地址**：`https://open.bigmodel.cn/api/paas/v4/`
- **认证**：Bearer Token（智谱 API Key）

也可在界面中切换为其他兼容 OpenAI 接口的服务（如 GPT-4o、通义千问 VL 等）。

## 注意事项

- 语音识别依赖 Web Speech API，仅 Chrome/Edge 完整支持
- API Key 存储在浏览器 localStorage，不会上传到服务器
