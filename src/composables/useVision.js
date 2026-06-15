import { ref } from 'vue'

const MAX_MESSAGES = 100

export function useVision() {
  const messages = ref([])
  const isLoading = ref(false)
  const config = ref({ apiKey: '', baseURL: 'https://open.bigmodel.cn/api/paas/v4/', model: 'glm-4v-flash' })
  let abortController = null

  function loadConfig() {
    const saved = localStorage.getItem('vision-chat-config')
    if (saved) config.value = { ...config.value, ...JSON.parse(saved) }
  }

  function saveConfig(cfg) {
    config.value = { ...config.value, ...cfg }
    localStorage.setItem('vision-chat-config', JSON.stringify(config.value))
  }

  function abortChat() {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
  }

  async function chat(imageBase64, userText = '') {
    if (!config.value.apiKey) throw new Error('请先配置 API Key')

    const content = []
    if (imageBase64) {
      content.push({
        type: 'image_url',
        image_url: { url: imageBase64, detail: 'low' }
      })
    }
    content.push({
      type: 'text',
      text: userText || '请描述你在这张图片中看到了什么，用中文简短回复'
    })

    messages.value.push({ role: 'user', content: userText || '（语音输入）' })

    // 消息数量上限，超出自动移除旧消息
    while (messages.value.length > MAX_MESSAGES) {
      messages.value.shift()
    }

    isLoading.value = true
    abortController = new AbortController()

    // 30 秒超时
    const timeoutId = setTimeout(() => abortController.abort(), 30000)

    try {
      const res = await fetch(`${config.value.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.value.apiKey}`
        },
        body: JSON.stringify({
          model: config.value.model,
          messages: [{ role: 'user', content }],
          max_tokens: 500
        }),
        signal: abortController.signal
      })

      clearTimeout(timeoutId)

      if (!res.ok) {
        // 区分不同状态码给出中文提示
        switch (res.status) {
          case 401:
            throw new Error('API Key 无效，请检查后重新配置')
          case 429:
            throw new Error('请求过于频繁，请稍后再试')
          default:
            if (res.status >= 500) {
              throw new Error('服务端异常，请稍后重试')
            }
            const errText = await res.text()
            throw new Error(`API 错误 (${res.status}): ${errText}`)
        }
      }

      const data = await res.json()
      const reply = data.choices[0].message.content
      messages.value.push({ role: 'assistant', content: reply })
      return reply
    } catch (e) {
      clearTimeout(timeoutId)

      // abort 产生的错误
      if (e.name === 'AbortError') {
        throw new Error('请求超时，请检查网络后重试')
      }

      // 网络断开或 fetch 失败
      if (e instanceof TypeError && (e.message.includes('fetch') || e.message.includes('NetworkError'))) {
        throw new Error('网络连接失败，请检查网络设置')
      }

      throw e
    } finally {
      clearTimeout(timeoutId)
      isLoading.value = false
      abortController = null
    }
  }

  loadConfig()

  return { messages, isLoading, config, saveConfig, chat, abortChat }
}
