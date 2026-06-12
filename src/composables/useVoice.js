import { ref, onUnmounted } from 'vue'

export function useVoice() {
  const isListening = ref(false)
  const transcript = ref('')
  const isSpeaking = ref(false)
  let recognition = null
  let synth = window.speechSynthesis

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
      isListening.value = true
      recognition.start()

      recognition.onresult = (e) => {
        transcript.value = e.results[0][0].transcript
        resolve(transcript.value)
      }
      recognition.onerror = (e) => {
        isListening.value = false
        reject(e)
      }
      recognition.onend = () => {
        isListening.value = false
      }
    })
  }

  function stopListen() {
    if (recognition) recognition.stop()
    isListening.value = false
  }

  function speak(text) {
    return new Promise((resolve) => {
      synth.cancel()
      const utt = new SpeechSynthesisUtterance(text)
      utt.lang = 'zh-CN'
      utt.rate = 1.1
      isSpeaking.value = true
      utt.onend = () => { isSpeaking.value = false; resolve() }
      utt.onerror = () => { isSpeaking.value = false; resolve() }
      synth.speak(utt)
    })
  }

  onUnmounted(() => {
    stopListen()
    synth.cancel()
  })

  return { isListening, transcript, isSpeaking, startListen, stopListen, speak }
}
