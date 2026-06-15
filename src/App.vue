<template>
  <div class="app">
    <header class="header">
      <h1>AI 视觉对话助手</h1>
      <div class="controls">
        <button :class="['btn', cameraActive ? 'btn-danger' : 'btn-primary']" @click="toggleCamera">
          {{ cameraActive ? '关闭' : '开启摄像头' }}
        </button>
        <button class="btn btn-secondary" @click="showConfig = !showConfig">设置 API</button>
      </div>
    </header>

    <div v-if="showConfig" class="config-panel">
      <label>API Key <input v-model="cfg.apiKey" type="password" placeholder="sk-..." /></label>
      <label>Base URL <input v-model="cfg.baseURL" /></label>
      <label>Model <input v-model="cfg.model" /></label>
      <button class="btn btn-primary" @click="saveCfg">保存</button>
      <p class="hint">兼容 OpenAI / 通义千问 VL 等接口</p>
    </div>

    <div class="main">
      <div class="camera-panel">
        <video v-show="cameraActive" ref="videoRef" autoplay playsinline muted></video>
        <div v-if="!cameraActive" class="placeholder">点击「开启摄像头」开始</div>
        <div v-if="cameraError" class="error-msg">{{ cameraError }}</div>
      </div>

      <div class="chat-panel">
        <div class="messages" ref="msgBox">
          <div v-for="(m, i) in msgs" :key="i" :class="['msg', m.role]">
            <div class="role-tag">{{ m.role === 'user' ? '你' : 'AI' }}</div>
            <div class="msg-text">{{ m.content }}</div>
          </div>
          <div v-if="loading" class="msg assistant"><div class="role-tag">AI</div><div class="msg-text typing">思考中...</div></div>
        </div>
        <div class="input-bar">
          <button class="btn btn-mic" :class="{ active: listening }" @click="handleMic" :disabled="loading || !voiceSupported" :title="voiceSupported ? '点击录音' : '当前浏览器不支持语音识别'">
            {{ listening ? '● 录音中' : voiceSupported ? '🎤' : '🚫' }}
          </button>
          <input v-model="inputText" @keydown.enter="sendText" placeholder="输入问题，或按麦克风说话..." :disabled="loading" />
          <button class="btn btn-send" @click="sendText" :disabled="loading || !inputText.trim()">发送</button>
        </div>
      </div>
    </div>

    <!-- 首次使用引导 -->
    <div v-if="showOnboarding" class="onboarding-overlay">
      <div class="onboarding-card">
        <h2>欢迎使用 AI 视觉对话助手</h2>
        <p class="onboarding-subtitle">3 步快速上手</p>
        <div class="onboarding-steps">
          <div class="onboarding-step">
            <div class="step-icon">📷</div>
            <div class="step-text">
              <div class="step-title">开启摄像头</div>
              <div class="step-desc">点击「开启摄像头」授权设备访问</div>
            </div>
          </div>
          <div class="onboarding-step">
            <div class="step-icon">💬</div>
            <div class="step-text">
              <div class="step-title">提问或说话</div>
              <div class="step-desc">输入文字或点击麦克风语音提问</div>
            </div>
          </div>
          <div class="onboarding-step">
            <div class="step-icon">🤖</div>
            <div class="step-text">
              <div class="step-title">AI 实时回答</div>
              <div class="step-desc">AI 将分析画面内容并语音回复你</div>
            </div>
          </div>
        </div>
        <button class="btn btn-primary onboarding-btn" @click="closeOnboarding">开始体验</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick, onMounted, onUnmounted } from 'vue'
import { useCamera } from './composables/useCamera.js'
import { useVoice } from './composables/useVoice.js'
import { useVision } from './composables/useVision.js'

const {
  videoRef, error: cameraError,
  isActive: cameraActive, start: startCamera, stop: stopCamera, captureFrame
} = useCamera()
const { isListening: listening, isSupported: voiceSupported, startListen, stopListen, speak } = useVoice()
const { messages: msgs, isLoading: loading, config, saveConfig, chat } = useVision()

const showConfig = ref(false)
const inputText = ref('')
const msgBox = ref(null)

// 首次使用引导
const showOnboarding = ref(!localStorage.getItem('vision-chat-onboarded'))
function closeOnboarding() {
  localStorage.setItem('vision-chat-onboarded', '1')
  showOnboarding.value = false
  if (!cameraActive.value) toggleCamera()
}

const cfg = reactive({ ...config.value })
function saveCfg() {
  saveConfig({ ...cfg })
  showConfig.value = false
}

async function toggleCamera() {
  if (cameraActive.value) {
    stopCamera()
  } else {
    try {
      const s = await startCamera()
      await nextTick()
      if (videoRef.value) videoRef.value.srcObject = s
    } catch (e) {
      // cameraError 已在 useCamera 中设置，这里不再空 catch
    }
  }
}

// 抽取公共聊天方法
async function doChat(frame, text) {
  try {
    const reply = await chat(frame, text)
    await speak(reply)
  } catch (e) {
    if (e.message === '请先配置 API Key') {
      msgs.value.push({ role: 'assistant', content: '请先配置 API Key，点击右上角「设置 API」添加' })
      showConfig.value = true
    } else {
      msgs.value.push({ role: 'assistant', content: `错误: ${e.message}` })
    }
  }
  scrollDown()
}

function scrollDown() {
  nextTick(() => {
    if (msgBox.value) {
      msgBox.value.scrollTo({ top: msgBox.value.scrollHeight, behavior: 'smooth' })
    }
  })
}

async function sendText() {
  const text = inputText.value.trim()
  if (!text || loading.value) return
  inputText.value = ''
  const frame = cameraActive.value ? captureFrame() : null
  await doChat(frame, text)
}

async function handleMic() {
  if (listening.value) { stopListen(); return }
  if (!voiceSupported) {
    msgs.value.push({ role: 'assistant', content: '当前浏览器不支持语音识别，请使用 Chrome 或 Edge，或直接输入文字提问' })
    scrollDown()
    return
  }
  try {
    const text = await startListen()
    const frame = cameraActive.value ? captureFrame() : null
    await doChat(frame, text)
  } catch (e) {
    if (e?.message !== 'aborted') {
      msgs.value.push({ role: 'assistant', content: `语音错误: ${e.message || e}` })
      scrollDown()
    }
  }
}

// beforeunload 提示：摄像头正在使用时页面关闭前提醒
function onBeforeUnload(e) {
  if (cameraActive.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}
onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
onUnmounted(() => window.removeEventListener('beforeunload', onBeforeUnload))
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f0f0f; color: #eee; height: 100vh; overflow: hidden; }
#app { height: 100%; }
.app { display: flex; flex-direction: column; height: 100%; }
.header { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; background: #1a1a1a; border-bottom: 1px solid #333; }
.header h1 { font-size: 18px; font-weight: 600; color: #eee; }
.controls { display: flex; gap: 8px; }
.btn { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; transition: .2s; }
.btn-primary { background: #6366f1; color: #fff; }
.btn-primary:hover { background: #4f46e5; }
.btn-danger { background: #ef4444; color: #fff; }
.btn-secondary { background: #374151; color: #ddd; }
.btn-secondary:hover { background: #4b5563; }
.btn-mic { width: 44px; height: 44px; border-radius: 50%; background: #374151; color: #ddd; font-size: 18px; display: flex; align-items: center; justify-content: center; }
.btn-mic.active { background: #ef4444; color: #fff; }
.btn-send { background: #6366f1; color: #fff; }
.config-panel { padding: 16px 20px; background: #1e1e1e; border-bottom: 1px solid #333; display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
.config-panel label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #999; }
.config-panel input { padding: 6px 10px; border: 1px solid #444; border-radius: 4px; background: #2a2a2a; color: #eee; font-size: 13px; width: 200px; }
.config-panel .hint { font-size: 12px; color: #666; width: 100%; }
.main { display: flex; flex: 1; overflow: hidden; }
.camera-panel { width: 50%; position: relative; background: #000; display: flex; align-items: center; justify-content: center; }
.camera-panel video { width: 100%; height: 100%; object-fit: cover; }
.placeholder { color: #555; font-size: 16px; }
.error-msg { position: absolute; bottom: 12px; background: rgba(239,68,68,0.9); padding: 6px 14px; border-radius: 6px; font-size: 13px; }
.chat-panel { width: 50%; display: flex; flex-direction: column; background: #1a1a1a; border-left: 1px solid #333; }
.messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.msg { max-width: 85%; padding: 10px 14px; border-radius: 10px; font-size: 14px; line-height: 1.5; }
.msg.user { align-self: flex-end; background: #6366f1; }
.msg.assistant { align-self: flex-start; background: #2a2a2a; }
.role-tag { font-size: 11px; opacity: 0.6; margin-bottom: 4px; }
.typing { animation: blink 1s infinite; }
@keyframes blink { 50% { opacity: 0.3; } }
.input-bar { display: flex; gap: 8px; padding: 12px; border-top: 1px solid #333; }
.input-bar input { flex: 1; padding: 10px 14px; border: 1px solid #444; border-radius: 8px; background: #2a2a2a; color: #eee; font-size: 14px; outline: none; }
.input-bar input:focus { border-color: #6366f1; }

/* 首次使用引导 */
.onboarding-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0, 0, 0, 0.75);
  display: flex; align-items: center; justify-content: center;
  animation: onboardFadeIn 0.3s ease;
}
@keyframes onboardFadeIn { from { opacity: 0; } to { opacity: 1; } }
.onboarding-card {
  background: #1e1e1e; border: 1px solid #333; border-radius: 12px;
  padding: 32px 28px; max-width: 420px; width: 90%;
  text-align: center;
}
.onboarding-card h2 { font-size: 20px; font-weight: 600; margin-bottom: 6px; color: #eee; }
.onboarding-subtitle { font-size: 13px; color: #888; margin-bottom: 24px; }
.onboarding-steps { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; text-align: left; }
.onboarding-step { display: flex; align-items: flex-start; gap: 12px; }
.step-icon { font-size: 28px; line-height: 1; flex-shrink: 0; }
.step-title { font-size: 14px; font-weight: 600; margin-bottom: 2px; color: #eee; }
.step-desc { font-size: 12px; color: #999; }
.onboarding-btn { width: 100%; padding: 12px; font-size: 15px; }
</style>
