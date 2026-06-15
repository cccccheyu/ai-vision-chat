import { ref, onUnmounted } from 'vue'

export function useVoice() {
  const isListening = ref(false)
  const transcript = ref('')
  const isSpeaking = ref(false)
  let recognition = null
  let synth = window.speechSynthesis

  // 检查 SpeechRecognition 是否可用
  const isSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition)

  function initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return false
    recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'zh-CN'
    return true
  }

  function startListen() {
    return new Promise((resolve, reject) => {
      if (!initRecognition()) {
        reject(new Error('浏览器不支持语音识别'))
        return
      }

      let settled = false
      let timeoutId

      // 15 秒超时自动停止
      timeoutId = setTimeout(() => {
        if (!settled) {
          settled = true
          stopListen()
          reject(new Error('语音识别超时，请重试'))
        }
      }, 15000)

      isListening.value = true
      recognition.start()

      recognition.onresult = (e) => {
        if (settled) return
        settled = true
        clearTimeout(timeoutId)
        transcript.value = e.results[0][0].transcript
        resolve(transcript.value)
      }

      recognition.onerror = (e) => {
        if (settled) return
        settled = true
        clearTimeout(timeoutId)
        isListening.value = false
        // 转换为中文错误消息
        const errorMap = {
          'not-allowed': '麦克风权限被拒绝',
          'no-speech': '未检测到语音输入',
          'audio-capture': '未检测到麦克风设备',
          'network': '语音识别网络连接失败',
          'aborted': '语音识别已中止',
          'language-not-supported': '当前语言不支持语音识别',
          'service-not-allowed': '语音识别服务不可用',
          'bad-grammar': '语音识别语法错误'
        }
        const msg = errorMap[e.error] || `语音识别错误: ${e.error}`
        reject(new Error(msg))
      }

      recognition.onend = () => {
        clearTimeout(timeoutId)
        isListening.value = false
      }
    })
  }

  function stopListen() {
    if (recognition) recognition.stop()
    isListening.value = false
  }

  function speak(text) {
    // speechSynthesis 不可用时静默跳过
    if (!synth) {
      return Promise.resolve(false)
    }
    return new Promise((resolve) => {
      synth.cancel()
      const utt = new SpeechSynthesisUtterance(text)
      utt.lang = 'zh-CN'
      utt.rate = 1.1
      isSpeaking.value = true
      utt.onend = () => { isSpeaking.value = false; resolve(true) }
      utt.onerror = () => { isSpeaking.value = false; resolve(false) }
      synth.speak(utt)
    })
  }

  onUnmounted(() => {
    stopListen()
    if (synth) {
      synth.cancel()
    }
  })

  return { isListening, transcript, isSpeaking, isSupported, startListen, stopListen, speak }
}
