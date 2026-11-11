import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { LifeEvent, Mood } from '../types'
import { MOODS, MOOD_LIST } from '../types'
import { useApp } from '../store/AppStore'
import { useRecorder, type RecordingResult } from '../hooks/useRecorder'
import { useSpeech } from '../hooks/useSpeech'
import { todayISO } from '../lib/date'
import { AudioPlayer } from './AudioPlayer'
import { ConfirmDialog } from './ConfirmDialog'
import { IconClock, IconMic, IconPlus, IconStop, IconTrash, IconVolume } from './Icons'
import { Modal } from './Modal'

interface EventEditorProps {
  initial: LifeEvent | null
  defaultDate?: string
  onClose: () => void
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function EventEditor({ initial, defaultDate, onClose }: EventEditorProps) {
  const { addEvent, updateEvent, attachAudio, detachAudio, deleteEvent, notify } = useApp()
  const [date, setDate] = useState(initial?.date ?? defaultDate ?? todayISO())
  const [time, setTime] = useState(initial?.time ?? '')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [content, setContent] = useState(initial?.content ?? '')
  const [mood, setMood] = useState<Mood>(initial?.mood ?? 4)
  const [tags, setTags] = useState<string[]>(initial?.tags ?? [])
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pendingAudio, setPendingAudio] = useState<RecordingResult | null>(null)
  const [removeExistingAudio, setRemoveExistingAudio] = useState(false)
  const titleRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  const appendSpeech = useCallback((text: string) => {
    setContent((prev) => {
      if (!prev.trim()) return text
      return `${prev.replace(/\s+$/, '')} ${text}`
    })
  }, [])

  const speech = useSpeech(appendSpeech)
  const recorder = useRecorder()

  const existingAudioId = useMemo(
    () => (!pendingAudio && !removeExistingAudio ? initial?.audioId : undefined),
    [initial?.audioId, pendingAudio, removeExistingAudio],
  )

  const addTag = useCallback(() => {
    const value = tagInput.trim().replace(/^#/, '')
    if (!value) return
    setTags((prev) => {
      if (prev.includes(value) || prev.length >= 8) return prev
      return [...prev, value]
    })
    setTagInput('')
  }, [tagInput])

  const toggleRecording = async () => {
    if (recorder.recording) {
      const result = await recorder.stop()
      if (result) {
        setPendingAudio(result)
        setRemoveExistingAudio(false)
      }
      return
    }
    if (speech.listening) speech.stop()
    await recorder.start()
  }

  const toggleSpeech = () => {
    if (speech.listening) {
      speech.stop()
      return
    }
    if (recorder.recording) return
    speech.start()
  }

  const handleSave = async () => {
    if (saving) return
    if (!title.trim() && !content.trim()) {
      notify('写点什么再保存吧，哪怕只有一句话。', 'error')
      return
    }
    if (recorder.recording) {
      notify('先停止录音，再保存这条记录。', 'error')
      return
    }
    if (speech.listening) speech.stop()

    setSaving(true)
    try {
      const input = {
        title,
        content,
        date: date || todayISO(),
        time,
        mood,
        tags,
        audioId: existingAudioId ?? undefined,
        audioDuration: initial?.audioId === existingAudioId ? initial?.audioDuration : undefined,
      }
      let eventId = initial?.id
      if (initial) {
        updateEvent(initial.id, input)
      } else {
        eventId = addEvent(input).id
      }
      if (eventId && initial?.audioId && removeExistingAudio && !pendingAudio) {
        await detachAudio(eventId)
      }
      if (eventId && pendingAudio) {
        await attachAudio(eventId, pendingAudio.blob, pendingAudio.duration)
      }
      notify(initial ? '记录已更新' : '记录已保存', 'success')
      onClose()
    } catch {
      notify('保存时出了点问题，请再试一次。', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!initial) return
    await deleteEvent(initial.id)
    notify('这条记录已删除')
    setConfirmDelete(false)
    onClose()
  }

  return (
    <>
      <Modal
        onClose={onClose}
        size="lg"
        labelledBy="editor-title"
        title={initial ? '编辑这条记录' : '记下一件事'}
        subtitle={initial ? '改一改措辞，或者补上当时没说的话。' : '不必写得漂亮，真实就够了。'}
        footer={
          <>
            {initial ? (
              <button type="button" className="btn btn-danger-quiet" onClick={() => setConfirmDelete(true)}>
                <IconTrash size={16} /> 删除
              </button>
            ) : (
              <span className="modal-hint">Ctrl / ⌘ + Enter 保存</span>
            )}
            <div className="modal-foot-right">
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
                取消
              </button>
              <button type="submit" form="event-form" className="btn btn-primary" disabled={saving}>
                {saving ? '保存中…' : initial ? '保存修改' : '保存记录'}
              </button>
            </div>
          </>
        }
      >
        <form
          id="event-form"
          className="editor-form"
          onSubmit={(event) => {
            event.preventDefault()
            void handleSave()
          }}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
              event.preventDefault()
              void handleSave()
            }
          }}
        >
          <div className="field-row">
            <label className="field">
              <span className="field-label">日期</span>
              <input className="input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">时间（可选）</span>
              <div className="input-with-icon">
                <IconClock size={16} />
                <input className="input" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
              </div>
            </label>
          </div>

          <label className="field">
            <span className="field-label">标题</span>
            <input
              ref={titleRef}
              className="input input-title"
              value={title}
              maxLength={60}
              placeholder="给这件事起个名字，比如：第一次一个人旅行"
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">发生了什么</span>
            <textarea
              className="textarea"
              rows={6}
              value={content}
              placeholder="当时在哪里、和谁、心里在想什么……想到哪儿写到哪儿。"
              onChange={(event) => setContent(event.target.value)}
            />
          </label>

          <div className={`voice-card ${speech.listening || recorder.recording ? 'is-active' : ''}`}>
            <div className="voice-actions">
              <button
                type="button"
                className={`voice-btn ${speech.listening ? 'is-live' : ''}`}
                onClick={toggleSpeech}
                disabled={recorder.recording || !speech.supported}
                title={speech.supported ? '把说的话变成文字' : '当前浏览器不支持语音识别'}
              >
                <IconMic size={17} />
                {speech.listening ? '正在听，说完点一下停' : '语音听写'}
                {speech.listening && <span className="live-dot" />}
              </button>
              <button
                type="button"
                className={`voice-btn ${recorder.recording ? 'is-recording' : ''}`}
                onClick={() => void toggleRecording()}
                disabled={!recorder.supported}
              >
                {recorder.recording ? <IconStop size={16} /> : <IconVolume size={17} />}
                {recorder.recording ? `录音中 ${formatDuration(recorder.seconds)}` : '录一段原声'}
              </button>
              <span className="voice-hint">说的话会变成文字；原声只存在这台设备上</span>
            </div>

            {speech.listening && <p className="voice-interim">{speech.interim || '听着呢，慢慢说……'}</p>}
            {!speech.supported && (
              <p className="voice-note">这个浏览器不支持语音识别，用 Chrome / Edge 可以，也可以直接打字。</p>
            )}
            {speech.error && <p className="voice-error">{speech.error}</p>}
            {recorder.error && <p className="voice-error">{recorder.error}</p>}

            {pendingAudio && (
              <AudioPlayer blob={pendingAudio.blob} duration={pendingAudio.duration} label="刚录的原声" onRemove={() => setPendingAudio(null)} />
            )}
            {existingAudioId && (
              <AudioPlayer
                audioId={existingAudioId}
                duration={initial?.audioDuration}
                label="这条记录的原声"
                onRemove={() => setRemoveExistingAudio(true)}
              />
            )}
          </div>

          <fieldset className="field mood-field">
            <legend className="field-label">此刻的心情</legend>
            <div className="mood-row">
              {MOOD_LIST.map((value) => {
                const item = MOODS[value]
                const active = mood === value
                return (
                  <button
                    key={value}
                    type="button"
                    className={`mood-btn ${active ? 'is-active' : ''}`}
                    style={{ '--mood-color': item.color } as CSSProperties}
                    onClick={() => setMood(value)}
                    aria-pressed={active}
                  >
                    <span className="mood-emoji" aria-hidden="true">
                      {item.emoji}
                    </span>
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          </fieldset>

          <div className="field">
            <span className="field-label">标签（可选，回车添加）</span>
            <div className="tag-editor">
              {tags.map((tag) => (
                <span className="tag-chip" key={tag}>
                  {tag}
                  <button
                    type="button"
                    className="tag-remove"
                    aria-label={`移除标签 ${tag}`}
                    onClick={() => setTags((prev) => prev.filter((item) => item !== tag))}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                className="tag-input"
                value={tagInput}
                placeholder={tags.length === 0 ? '家人、工作、旅行…' : '再加一个'}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ',' || event.key === '，') {
                    event.preventDefault()
                    addTag()
                  } else if (event.key === 'Backspace' && !tagInput && tags.length > 0) {
                    setTags((prev) => prev.slice(0, -1))
                  }
                }}
                onBlur={addTag}
              />
              {tagInput.trim() && (
                <button type="button" className="tag-add" onClick={addTag}>
                  <IconPlus size={14} /> 添加
                </button>
              )}
            </div>
          </div>
        </form>
      </Modal>

      {confirmDelete && (
        <ConfirmDialog
          title="删掉这条记录？"
          description="记录和原声都会从这台设备上删除，没法恢复。"
          confirmLabel="删除"
          danger
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => void handleDelete()}
        />
      )}
    </>
  )
}
