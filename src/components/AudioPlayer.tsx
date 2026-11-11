import { useEffect, useRef, useState } from 'react'
import { useApp } from '../store/AppStore'
import { IconPause, IconPlay, IconTrash } from './Icons'

interface AudioPlayerProps {
  audioId?: string
  blob?: Blob | null
  duration?: number
  onRemove?: () => void
  label?: string
}

function formatSeconds(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '0:00'
  const total = Math.floor(value)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

const BAR_HEIGHTS = [7, 12, 18, 10, 22, 14, 8, 16, 24, 12, 19, 9, 14, 21, 11, 17, 7, 13, 20, 10, 16, 22, 12, 8, 18, 14, 9, 21, 13, 7]

export function AudioPlayer({ audioId, blob, duration, onRemove, label = '原声记录' }: AudioPlayerProps) {
  const { getAudio } = useApp()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [total, setTotal] = useState(duration ?? 0)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    let objectUrl: string | null = null
    setFailed(false)
    setUrl(null)
    setPlaying(false)
    setProgress(0)
    setCurrentTime(0)

    const attach = (data: Blob | null) => {
      if (!active) return
      if (!data) {
        setFailed(true)
        return
      }
      objectUrl = URL.createObjectURL(data)
      setUrl(objectUrl)
    }

    if (blob) {
      attach(blob)
    } else if (audioId) {
      getAudio(audioId)
        .then(attach)
        .catch(() => {
          if (active) setFailed(true)
        })
    } else {
      setFailed(true)
    }

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [audioId, blob, getAudio])

  useEffect(() => {
    if (duration) setTotal(duration)
  }, [duration])

  const toggle = async () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      try {
        await audio.play()
      } catch {
        setFailed(true)
      }
    } else {
      audio.pause()
    }
  }

  if (failed) {
    return (
      <div className="audio-player audio-failed">
        <span>这段录音读取不到了（可能已被清理）</span>
        {onRemove && (
          <button type="button" className="icon-btn" onClick={onRemove} aria-label="移除录音">
            <IconTrash size={16} />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="audio-player">
      <button type="button" className="audio-play" onClick={toggle} disabled={!url} aria-label={playing ? '暂停' : '播放'}>
        {playing ? <IconPause size={16} /> : <IconPlay size={16} />}
      </button>
      <div className="audio-main">
        <div className="audio-meta">
          <span className="audio-label">{label}</span>
          <span className="audio-time">
            {formatSeconds(currentTime)} / {formatSeconds(total)}
          </span>
        </div>
        <div className="audio-bars" aria-hidden="true">
          {BAR_HEIGHTS.map((height, index) => {
            const active = index / BAR_HEIGHTS.length <= progress
            return (
              <span
                key={index}
                className={`audio-bar ${active ? 'is-active' : ''}`}
                style={{ height: `${height}px` }}
              />
            )
          })}
        </div>
        <input
          className="audio-range"
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={progress}
          aria-label="播放进度"
          onChange={(event) => {
            const next = Number(event.target.value)
            const audio = audioRef.current
            setProgress(next)
            if (audio && Number.isFinite(audio.duration)) {
              audio.currentTime = next * audio.duration
              setCurrentTime(audio.currentTime)
            }
          }}
        />
      </div>
      {onRemove && (
        <button type="button" className="icon-btn audio-remove" onClick={onRemove} aria-label="移除录音">
          <IconTrash size={16} />
        </button>
      )}
      {url && (
        <audio
          ref={audioRef}
          src={url}
          preload="metadata"
          onLoadedMetadata={(event) => {
            const value = event.currentTarget.duration
            if (Number.isFinite(value)) setTotal(value)
          }}
          onTimeUpdate={(event) => {
            const audio = event.currentTarget
            setCurrentTime(audio.currentTime)
            if (Number.isFinite(audio.duration) && audio.duration > 0) setProgress(audio.currentTime / audio.duration)
          }}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false)
            setProgress(0)
            setCurrentTime(0)
          }}
        />
      )}
    </div>
  )
}
