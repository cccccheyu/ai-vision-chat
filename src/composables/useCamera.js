import { ref, onUnmounted } from 'vue'

export function useCamera() {
  const stream = ref(null)
  const videoRef = ref(null)
  const error = ref('')
  const isActive = ref(false)

  async function start() {
    try {
      stream.value = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: true
      })
      isActive.value = true
      return stream.value
    } catch (e) {
      error.value = '摄像头或麦克风访问被拒绝，请检查权限设置'
      throw e
    }
  }

  function stop() {
    if (stream.value) {
      stream.value.getTracks().forEach(t => t.stop())
      stream.value = null
    }
    isActive.value = false
  }

  function captureFrame() {
    if (!videoRef.value) return null
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.value.videoWidth
    canvas.height = videoRef.value.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(videoRef.value, 0, 0)
    return canvas.toDataURL('image/jpeg', 0.6)
  }

  onUnmounted(stop)

  return { stream, videoRef, error, isActive, start, stop, captureFrame }
}
