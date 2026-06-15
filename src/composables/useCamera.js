import { ref, onUnmounted } from 'vue'

export function useCamera() {
  const stream = ref(null)
  const videoRef = ref(null)
  const error = ref('')
  const isActive = ref(false)

  // 检查浏览器是否支持摄像头 API
  const isSupported = !!(navigator.mediaDevices?.getUserMedia)
  if (!isSupported) {
    error.value = '当前浏览器不支持摄像头或麦克风访问'
  }

  async function start() {
    if (!isSupported) {
      error.value = '当前浏览器不支持摄像头或麦克风访问'
      throw new Error(error.value)
    }

    try {
      stream.value = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: true
      })
      isActive.value = true
      return stream.value
    } catch (e) {
      // 区分不同错误类型给出中文提示
      if (e.name === 'NotAllowedError') {
        error.value = '摄像头或麦克风访问被拒绝'
      } else if (e.name === 'NotFoundError') {
        error.value = '未检测到摄像头或麦克风设备'
      } else if (e.name === 'NotReadableError') {
        error.value = '摄像头或麦克风可能被其他应用占用'
      } else if (e.name === 'OverconstrainedError') {
        error.value = '摄像头不支持请求的分辨率，已尝试降级'
        // 降级：使用默认分辨率重试一次
        try {
          stream.value = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
          })
          isActive.value = true
          return stream.value
        } catch (retryErr) {
          error.value = '摄像头降级重试失败: ' + (retryErr.message || retryErr.name)
          throw retryErr
        }
      } else {
        error.value = e.message || '摄像头打开失败'
      }
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
    try {
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.value.videoWidth
      canvas.height = videoRef.value.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(videoRef.value, 0, 0)
      return canvas.toDataURL('image/jpeg', 0.6)
    } catch (e) {
      error.value = '截图失败: ' + (e.message || '未知错误')
      return null
    }
  }

  onUnmounted(stop)

  return { stream, videoRef, error, isActive, isSupported, start, stop, captureFrame }
}
