import { useCallback, useEffect, useRef, useState } from 'react'

interface SpeechAlternative {
  transcript: string
}
interface SpeechResult {
  isFinal: boolean
  length: number
  [index: number]: SpeechAlternative
}
interface SpeechResultList {
  length: number
  [index: number]: SpeechResult
}
interface SpeechEvent extends Event {
  resultIndex: number
  results: SpeechResultList
}
interface SpeechErrorEvent extends Event {
  error: string
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechEvent) => void) | null
  onerror: ((event: SpeechErrorEvent) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

const ERROR_TEXT: Record<string, string> = {
  'not-allowed': '麦克风权限被拒绝了，请在浏览器地址栏的权限设置里允许麦克风。',
  'service-not-allowed': '浏览器不允许使用语音识别，换个浏览器（推荐 Chrome / Edge）试试。',
  'audio-capture': '没有检测到麦克风，检查一下设备。',
  network: '语音识别需要联网，网络好像断开了。',
  'no-speech': '没有听到声音，再说一次？',
  aborted: '',
}

export interface UseSpeechResult {
  supported: boolean
  listening: boolean
  interim: string
  error: string
  start: () => void
  stop: () => void
  clearError: () => void
}

/** Web Speech API 听写：把说的话实时变成文字，交给调用方追加到记录里 */
export function useSpeech(onFinal: (text: string) => void): UseSpeechResult {
  const [supported] = useState(() => getRecognitionCtor() !== null)
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState('')
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const finalCallback = useRef(onFinal)
  finalCallback.current = onFinal

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort()
      recognitionRef.current = null
    }
  }, [])

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor()
    if (!Ctor) {
      setError('这个浏览器不支持语音识别，推荐用 Chrome 或 Edge，也可以直接打字。')
      return
    }
    if (recognitionRef.current) return
    setError('')
    setInterim('')
    const recognition = new Ctor()
    recognition.lang = 'zh-CN'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onstart = () => setListening(true)

    recognition.onresult = (event) => {
      let finalText = ''
      let interimText = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        const transcript = result?.[0]?.transcript ?? ''
        if (result.isFinal) finalText += transcript
        else interimText += transcript
      }
      setInterim(interimText)
      if (finalText.trim()) finalCallback.current(finalText.trim())
    }

    recognition.onerror = (event) => {
      const message = ERROR_TEXT[event.error] ?? `语音识别出错：${event.error}`
      if (message) setError(message)
      setListening(false)
    }

    recognition.onend = () => {
      setListening(false)
      setInterim('')
      recognitionRef.current = null
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch {
      recognitionRef.current = null
      setError('语音识别启动失败，稍后再试。')
    }
  }, [])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const clearError = useCallback(() => setError(''), [])

  return { supported, listening, interim, error, start, stop, clearError }
}
