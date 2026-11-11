import { useCallback, useEffect, useRef, useState } from 'react'

export interface RecordingResult {
  blob: Blob
  duration: number
}

export interface UseRecorderResult {
  supported: boolean
  recording: boolean
  seconds: number
  error: string
  start: () => Promise<boolean>
  stop: () => Promise<RecordingResult | null>
  clearError: () => void
}

function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return ''
}

/** 录音：实在的音频文件，存在 IndexedDB 里，作为记录的“原声” */
export function useRecorder(): UseRecorderResult {
  const [supported] = useState(
    () => typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined',
  )
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState('')

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | null>(null)
  const startedAtRef = useRef(0)
  const resolverRef = useRef<((result: RecordingResult | null) => void) | null>(null)

  const cleanup = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    recorderRef.current = null
    setRecording(false)
  }, [])

  useEffect(() => cleanup, [cleanup])

  const start = useCallback(async (): Promise<boolean> => {
    if (!supported) {
      setError('这个浏览器不支持录音，可以改用语音听写或直接打字。')
      return false
    }
    if (recorderRef.current) return false
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = pickMimeType()
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onerror = () => {
        setError('录音出错了，请重试。')
        cleanup()
        resolverRef.current?.(null)
        resolverRef.current = null
      }
      recorder.onstop = () => {
        const duration = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000))
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        chunksRef.current = []
        cleanup()
        resolverRef.current?.(blob.size > 0 ? { blob, duration } : null)
        resolverRef.current = null
      }
      startedAtRef.current = Date.now()
      recorder.start(250)
      recorderRef.current = recorder
      setRecording(true)
      setSeconds(0)
      timerRef.current = window.setInterval(() => {
        setSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000))
      }, 500)
      return true
    } catch (err) {
      const name = (err as DOMException)?.name
      setError(
        name === 'NotAllowedError'
          ? '麦克风权限被拒绝了，请在浏览器权限设置里允许后重试。'
          : '打不开麦克风，检查一下设备是否被其它程序占用。',
      )
      cleanup()
      return false
    }
  }, [cleanup, supported])

  const stop = useCallback((): Promise<RecordingResult | null> => {
    const recorder = recorderRef.current
    if (!recorder) return Promise.resolve(null)
    return new Promise((resolve) => {
      resolverRef.current = resolve
      try {
        recorder.stop()
      } catch {
        cleanup()
        resolve(null)
      }
    })
  }, [cleanup])

  const clearError = useCallback(() => setError(''), [])

  return { supported, recording, seconds, error, start, stop, clearError }
}
