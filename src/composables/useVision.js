import { ref } from 'vue'

export function useVision() {
  const messages = ref([])
  const isLoading = ref(false)
  const config = ref({ apiKey: '', baseURL: 'https://api.openai.com/v1', model: 'gpt-4o' })

  function loadConfig() {
    const saved = localStorage.getItem('vision-chat-config')
    if (saved) config.value = { ...config.value, ...JSON.parse(saved) }
  }

  function saveConfig(cfg) {
    config.value = { ...config.value, ...cfg }
    localStorage.setItem('vision-chat-config', JSON.stringify(config.value))
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
    isLoading.value = true

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
        })
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(`API 错误 ${res.status}: ${err}`)
      }

      const data = await res.json()
      const reply = data.choices[0].message.content
      messages.value.push({ role: 'assistant', content: reply })
      return reply
    } finally {
      isLoading.value = false
    }
  }

  loadConfig()

  return { messages, isLoading, config, saveConfig, chat }
}
