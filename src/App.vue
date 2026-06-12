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
        <video v-show="cameraActive" ref="videoEl" autoplay playsinline muted></video>
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
          <button class="btn btn-mic" :class="{ active: listening }" @click="handleMic" :disabled="loading">
            {{ listening ? '● 录音中' : '🎤' }}
          </button>
          <input v-model="inputText" @keydown.enter="sendText" placeholder="输入问题，或按麦克风说话..." :disabled="loading" />
          <button class="btn btn-send" @click="sendText" :disabled="loading || !inputText.trim()">发送</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick, onMounted } from 'vue'
import { useCamera } from './composables/useCamera.js'
import { useVoice } from './composables/useVoice.js'
import { useVision } from './composables/useVision.js'

const {
  videoRef: videoEl, error: cameraError,
  isActive: cameraActive, start: startCamera, stop: stopCamera, captureFrame
} = useCamera()
const { isListening: listening, startListen, stopListen, speak } = useVoice()
const { messages: msgs, isLoading: loading, config, saveConfig, chat } = useVision()

onMounted(() => {
  videoEl.value = document.querySelector('video')
})

const showConfig = ref(false)
const inputText = ref('')
const msgBox = ref(null)

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
      if (videoEl.value) videoEl.value.srcObject = s
    } catch {}
  }
}

function scrollDown() {
  nextTick(() => {
    if (msgBox.value) msgBox.value.scrollTop = msgBox.value.scrollHeight
  })
}

async function sendText() {
  const text = inputText.value.trim()
  if (!text || loading.value) return
  inputText.value = ''
  const frame = cameraActive.value ? captureFrame() : null
  try {
    const reply = await chat(frame, text)
    await speak(reply)
  } catch (e) {
    msgs.value.push({ role: 'assistant', content: `错误: ${e.message}` })
  }
  scrollDown()
}

async function handleMic() {
  if (listening.value) { stopListen(); return }
  try {
    const text = await startListen()
    const frame = cameraActive.value ? captureFrame() : null
    const reply = await chat(frame, text)
    await speak(reply)
  } catch (e) {
    if (e?.message !== 'aborted') msgs.value.push({ role: 'assistant', content: `语音错误: ${e.message || e}` })
  }
  scrollDown()
}
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f0f0f; color: #eee; height: 100vh; overflow: hidden; }
#app { height: 100%; }
.app { display: flex; flex-direction: column; height: 100%; }
.header { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; background: #1a1a1a; border-bottom: 1px solid #333; }
.header h1 { font-size: 18px; font-weight: 600; }
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
</style>
