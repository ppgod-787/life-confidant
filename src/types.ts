export type Mood = 1 | 2 | 3 | 4 | 5

export interface LifeEvent {
  id: string
  title: string
  content: string
  /** YYYY-MM-DD，本地时区 */
  date: string
  /** HH:mm，可为空 */
  time: string
  mood: Mood
  tags: string[]
  audioId?: string
  audioDuration?: number
  createdAt: number
  updatedAt: number
}

export type ThemeMode = 'auto' | 'light' | 'dark'

export interface Settings {
  /** OpenAI 兼容接口的基础地址，例如 https://api.deepseek.com/v1 */
  baseUrl: string
  apiKey: string
  model: string
  theme: ThemeMode
  nickname: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
  /** 这条提问带上了多少条人生记录作为上下文 */
  contextCount?: number
  error?: boolean
}

export const MOODS: Record<Mood, { label: string; emoji: string; color: string }> = {
  1: { label: '低落', emoji: '🌧️', color: '#6E86A0' },
  2: { label: '平静', emoji: '🌿', color: '#8C9E8F' },
  3: { label: '还行', emoji: '🌤️', color: '#C2A25E' },
  4: { label: '开心', emoji: '☀️', color: '#D98A4E' },
  5: { label: '幸福', emoji: '✨', color: '#C25B47' },
}

export const MOOD_LIST: Mood[] = [1, 2, 3, 4, 5]

export const DEFAULT_SETTINGS: Settings = {
  baseUrl: 'https://api.deepseek.com/v1',
  apiKey: '',
  model: 'deepseek-chat',
  theme: 'auto',
  nickname: '',
}

export interface ProviderPreset {
  id: string
  name: string
  baseUrl: string
  model: string
  hint: string
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    hint: '国内直连，性价比高，中文表达自然',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    hint: '需要海外网络环境',
  },
  {
    id: 'moonshot',
    name: 'Moonshot',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-8k',
    hint: 'Kimi 开放平台',
  },
  {
    id: 'zhipu',
    name: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4-flash',
    hint: 'GLM 系列，有免费额度',
  },
  {
    id: 'ollama',
    name: '本地 Ollama',
    baseUrl: 'http://localhost:11434/v1',
    model: 'qwen2.5:7b',
    hint: '完全离线，需要本地已启动 Ollama',
  },
]
