import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChatMessage } from '../types'
import { useApp } from '../store/AppStore'
import { streamChat } from '../lib/ai'
import { buildEventContext, buildSystemPrompt, computeStats, moodTrend } from '../lib/context'
import { formatClock } from '../lib/date'
import { newId } from '../lib/id'
import { ConfirmDialog } from './ConfirmDialog'
import { IconQuote, IconRefresh, IconSend, IconSparkles, IconStop, IconTrash } from './Icons'
import { Markdown } from './Markdown'

interface ChatViewProps {
  onNavigate: (tab: 'settings') => void
}

const SUGGESTIONS = [
  { title: '回顾最近', prompt: '帮我回顾一下最近这段时间的记录，我过得怎么样？' },
  { title: '说出心事', prompt: '我最近有点累，想找个人说说话。' },
  { title: '看看模式', prompt: '从我的记录里，你看到了哪些我自己没注意到的模式？' },
  { title: '要点建议', prompt: '结合我最近的状态，给我三个下周可以尝试的小建议。' },
]

export function ChatView({ onNavigate }: ChatViewProps) {
  const { events, settings, chat, appendChat, clearChat, notify } = useApp()
  const [input, setInput] = useState('')
  const [streamText, setStreamText] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [showJump, setShowJump] = useState(false)

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const bufferRef = useRef('')
  const mountedRef = useRef(true)

  const context = useMemo(() => buildEventContext(events), [events])
  const stats = useMemo(() => computeStats(events), [events])
  const trend = useMemo(() => moodTrend(events), [events])
  const isLocalEndpoint = /localhost|127\.0\.0\.1/.test(settings.baseUrl)
  const missingKey = !settings.apiKey.trim() && !isLocalEndpoint

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      abortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    const node = scrollRef.current
    if (!node) return
    if (!showJump) node.scrollTop = node.scrollHeight
  }, [chat, streamText, showJump])

  const updateTextarea = () => {
    const node = textareaRef.current
    if (!node) return
    node.style.height = 'auto'
    node.style.height = `${Math.min(node.scrollHeight, 168)}px`
  }

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim()
    if (!text || streaming) return
    setInput('')
    window.setTimeout(updateTextarea, 0)

    const history = chat
      .filter((message) => !message.error)
      .slice(-12)
      .map((message) => ({
        role: message.role,
        content: message.content.slice(0, 1600),
      }))

    const system = buildSystemPrompt({
      nickname: settings.nickname,
      context: context.text,
      contextCount: context.count,
      stats,
      trend,
    })

    const userMessage: ChatMessage = {
      id: newId('msg_'),
      role: 'user',
      content: text,
      createdAt: Date.now(),
      contextCount: context.count,
    }
    appendChat(userMessage)

    const controller = new AbortController()
    abortRef.current = controller
    bufferRef.current = ''
    setStreamText('')
    setStreaming(true)

    try {
      const full = await streamChat({
        baseUrl: settings.baseUrl,
        apiKey: settings.apiKey,
        model: settings.model,
        signal: controller.signal,
        messages: [{ role: 'system', content: system }, ...history, { role: 'user', content: text }],
        onDelta: (delta) => {
          bufferRef.current += delta
          if (mountedRef.current) setStreamText(bufferRef.current)
        },
      })
      if (!mountedRef.current) return
      appendChat({
        id: newId('msg_'),
        role: 'assistant',
        content: full,
        createdAt: Date.now(),
        contextCount: context.count,
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        const partial = bufferRef.current.trim()
        if (partial) {
          appendChat({
            id: newId('msg_'),
            role: 'assistant',
            content: `${partial}\n\n（已停止生成）`,
            createdAt: Date.now(),
            contextCount: context.count,
          })
        }
        notify('已停止生成')
      } else {
        const message = error instanceof Error ? error.message : '未知错误'
        appendChat({
          id: newId('msg_'),
          role: 'assistant',
          content: `抱歉，这次没能接上话。\n\n> ${message}`,
          createdAt: Date.now(),
          error: true,
          contextCount: context.count,
        })
      }
    } finally {
      if (mountedRef.current) {
        setStreaming(false)
        setStreamText('')
      }
      abortRef.current = null
      bufferRef.current = ''
    }
  }

  const stop = () => {
    abortRef.current?.abort()
    setStreaming(false)
  }

  const lastUserQuestion = [...chat].reverse().find((message) => message.role === 'user')?.content

  return (
    <section className="view chat-view">
      <header className="page-head chat-page-head">
        <div>
          <p className="eyebrow">AI 知己 · 倾诉</p>
          <h1 className="page-title">倾诉</h1>
          <p className="page-sub">它读过你的记录，也愿意听你把话说完。</p>
        </div>
      </header>

      <div className="chat-shell card">
        <div className="chat-top">
          <div className="chat-identity">
            <span className="chat-avatar" aria-hidden="true">
              <IconSparkles size={18} />
            </span>
            <div>
              <strong>AI 知己</strong>
              <span>
                {settings.model || '未配置模型'} · 记得 {context.count} 条人生记录
                {context.count < events.length ? `（共 ${events.length} 条）` : ''}
              </span>
            </div>
          </div>
          {chat.length > 0 && (
            <button className="icon-btn" onClick={() => setConfirmClear(true)} aria-label="清空对话" title="清空对话">
              <IconTrash size={17} />
            </button>
          )}
        </div>

        {missingKey && (
          <div className="notice">
            <span>还没有配置 AI 接口，先去填一个 API Key 吧（只存在你的浏览器里）。</span>
            <button className="link-btn" onClick={() => onNavigate('settings')}>
              去设置
            </button>
          </div>
        )}

        <div
          className="chat-scroll"
          ref={scrollRef}
          onScroll={(event) => {
            const node = event.currentTarget
            setShowJump(node.scrollHeight - node.scrollTop - node.clientHeight > 120)
          }}
        >
          {chat.length === 0 && !streaming ? (
            <div className="chat-empty">
              <span className="chat-empty-mark" aria-hidden="true">
                <IconQuote size={34} />
              </span>
              <h2>有些话，说出来就轻了</h2>
              <p>
                {events.length > 0
                  ? `我会记得你写下的 ${events.length} 件事，陪你一起看看来时的路。`
                  : '还没有记录也没关系，从今天开始说给我听。'}
              </p>
              <div className="suggestion-grid">
                {SUGGESTIONS.map((item) => (
                  <button key={item.title} className="suggestion" onClick={() => void send(item.prompt)}>
                    <strong>{item.title}</strong>
                    <span>{item.prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="messages">
              {chat.map((message) => (
                <MessageRow key={message.id} message={message} />
              ))}
              {streaming && (
                <div className="message message-assistant">
                  <span className="assistant-avatar" aria-hidden="true">
                    <IconSparkles size={15} />
                  </span>
                  <div className="message-main">
                    <div className="message-bubble">
                      {streamText ? (
                        <>
                          <Markdown text={streamText} />
                          <span className="caret" />
                        </>
                      ) : (
                        <span className="thinking">
                          正在想
                          <i />
                          <i />
                          <i />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <div className="chat-anchor" />
            </div>
          )}
        </div>

        {showJump && (
          <button className="jump-bottom" onClick={() => setShowJump(false)} aria-label="回到最新">
            ↓
          </button>
        )}

        {lastUserQuestion && !streaming && chat.some((message) => message.error) && (
          <button className="retry-btn" onClick={() => void send(lastUserQuestion)}>
            <IconRefresh size={15} /> 重新问一次
          </button>
        )}

        <div className="composer">
          <textarea
            ref={textareaRef}
            className="composer-input"
            rows={1}
            value={input}
            placeholder="想说什么都可以，我在听……"
            onChange={(event) => {
              setInput(event.target.value)
              updateTextarea()
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                void send()
              }
            }}
          />
          {streaming ? (
            <button className="send-btn is-stop" onClick={stop} aria-label="停止生成">
              <IconStop size={18} />
            </button>
          ) : (
            <button className="send-btn" onClick={() => void send()} disabled={!input.trim()} aria-label="发送">
              <IconSend size={18} />
            </button>
          )}
        </div>
        <p className="composer-hint">Enter 发送 · Shift + Enter 换行 · AI 的话仅供参考，重要决定请交给自己</p>
      </div>

      {confirmClear && (
        <ConfirmDialog
          title="清空这段对话？"
          description="对话记录会从这台设备上移除，你的人生记录不受影响。"
          confirmLabel="清空"
          danger
          onCancel={() => setConfirmClear(false)}
          onConfirm={() => {
            clearChat()
            setConfirmClear(false)
            notify('对话已清空')
          }}
        />
      )}
    </section>
  )
}

function MessageRow({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="message message-user">
        <div className="message-bubble user-bubble">
          <p>{message.content}</p>
        </div>
        <div className="message-foot">
          <span>{formatClock(message.createdAt)}</span>
          {typeof message.contextCount === 'number' && message.contextCount > 0 && (
            <span>带上了 {message.contextCount} 条记录</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`message message-assistant ${message.error ? 'is-error' : ''}`}>
      <span className="assistant-avatar" aria-hidden="true">
        <IconSparkles size={15} />
      </span>
      <div className="message-main">
        <div className="message-bubble">
          <Markdown text={message.content} />
        </div>
        <div className="message-foot">
          <span>{formatClock(message.createdAt)}</span>
          {message.error && <span>接口出错</span>}
        </div>
      </div>
    </div>
  )
}
