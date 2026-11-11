export interface ChatTurnInput {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export class AIError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'AIError'
    this.status = status
  }
}

export function normalizeEndpoint(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, '')
  if (!trimmed) throw new AIError('请先在设置里填写接口地址')
  if (/\/chat\/completions$/.test(trimmed)) return trimmed
  return `${trimmed}/chat/completions`
}

function extractErrorMessage(raw: string): string {
  if (!raw) return ''
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string } | string; message?: string }
    if (typeof parsed.error === 'string') return parsed.error
    if (parsed.error?.message) return parsed.error.message
    if (parsed.message) return parsed.message
  } catch {
    /* 不是 JSON，直接用原文 */
  }
  return raw.slice(0, 300)
}

function friendlyMessage(status: number, raw: string): string {
  const detail = extractErrorMessage(raw)
  if (status === 401 || status === 403) {
    return 'API Key 无效或没有权限，请到「设置」里检查。'
  }
  if (status === 404) {
    return '接口地址或模型名不对（404）。检查 Base URL 是否要带 /v1，以及模型名是否可用。'
  }
  if (status === 429) {
    return '请求太频繁或额度用完了，歇一会儿再试。'
  }
  if (status >= 500) {
    return '模型服务暂时不可用，稍后再试。'
  }
  return detail || `请求失败（HTTP ${status}）`
}

export interface StreamOptions {
  baseUrl: string
  apiKey: string
  model: string
  messages: ChatTurnInput[]
  signal?: AbortSignal
  onDelta?: (delta: string) => void
}

/**
 * 调用 OpenAI 兼容的 /chat/completions 流式接口。
 * 返回完整文本；网络错误、鉴权错误会抛出中文可读的 AIError。
 */
export async function streamChat(options: StreamOptions): Promise<string> {
  const endpoint = normalizeEndpoint(options.baseUrl)
  const model = options.model.trim()
  if (!model) throw new AIError('请先在设置里填写模型名')

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const key = options.apiKey.trim()
  if (key) headers.Authorization = `Bearer ${key}`

  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: options.messages,
        stream: true,
        temperature: 0.8,
      }),
      signal: options.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new AIError('连不上模型接口。检查网络、代理，或 Base URL 是否填写正确。')
  }

  if (!response.ok) {
    const raw = await response.text().catch(() => '')
    throw new AIError(friendlyMessage(response.status, raw), response.status)
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    const full = data.choices?.[0]?.message?.content ?? ''
    if (full) options.onDelta?.(full)
    if (!full) throw new AIError('模型返回了空内容，换个说法再试一次。')
    return full
  }

  if (!response.body) {
    throw new AIError('当前浏览器不支持流式读取，请换用较新的 Chrome / Edge。')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''

  const consumeLine = (line: string) => {
    const trimmed = line.trim()
    if (!trimmed || !trimmed.startsWith('data:')) return
    const data = trimmed.slice(5).trim()
    if (!data || data === '[DONE]') return
    try {
      const parsed = JSON.parse(data) as {
        choices?: { delta?: { content?: string | null }; message?: { content?: string } }[]
        error?: { message?: string }
      }
      if (parsed.error?.message) throw new AIError(parsed.error.message)
      const delta = parsed.choices?.[0]?.delta?.content ?? parsed.choices?.[0]?.message?.content ?? ''
      if (delta) {
        full += delta
        options.onDelta?.(delta)
      }
    } catch (error) {
      if (error instanceof AIError) throw error
      /* 跳过无法解析的保活行 */
    }
  }

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() ?? ''
      for (const line of lines) consumeLine(line)
    }
    buffer += decoder.decode()
    if (buffer) consumeLine(buffer)
  } finally {
    reader.releaseLock()
  }

  if (!full.trim()) throw new AIError('模型返回了空内容，换个说法再试一次。')
  return full
}

/** 设置页的「测试连接」：发一条极短的请求，确认地址 / Key / 模型都通 */
export async function testConnection(baseUrl: string, apiKey: string, model: string): Promise<string> {
  const reply = await streamChat({
    baseUrl,
    apiKey,
    model,
    messages: [
      { role: 'system', content: '你是一个连通性测试助手。' },
      { role: 'user', content: '只回复两个字：已连接' },
    ],
  })
  return reply.trim().slice(0, 40)
}
