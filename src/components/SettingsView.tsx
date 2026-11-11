import { useRef, useState } from 'react'
import type { ThemeMode } from '../types'
import { PROVIDER_PRESETS } from '../types'
import { useApp } from '../store/AppStore'
import { testConnection } from '../lib/ai'
import { APP_VERSION, REPO_URL } from '../config'
import { ConfirmDialog } from './ConfirmDialog'
import {
  IconCheck,
  IconDownload,
  IconMonitor,
  IconMoon,
  IconRefresh,
  IconSun,
  IconTrash,
  IconUpload,
} from './Icons'

type TestState = { state: 'idle' | 'loading' | 'ok' | 'error'; message: string }

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: typeof IconSun }[] = [
  { value: 'auto', label: '跟随系统', icon: IconMonitor },
  { value: 'light', label: '浅色', icon: IconSun },
  { value: 'dark', label: '深色', icon: IconMoon },
]

export function SettingsView() {
  const { events, settings, updateSettings, exportData, importData, clearAll, notify } = useApp()
  const [showKey, setShowKey] = useState(false)
  const [test, setTest] = useState<TestState>({ state: 'idle', message: '' })
  const [confirmClear, setConfirmClear] = useState(false)
  const [pendingReplace, setPendingReplace] = useState<{ name: string; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const importModeRef = useRef<'merge' | 'replace'>('merge')

  const audioCount = events.filter((event) => event.audioId).length

  const runTest = async () => {
    setTest({ state: 'loading', message: '正在连接…' })
    try {
      const reply = await testConnection(settings.baseUrl, settings.apiKey, settings.model)
      setTest({ state: 'ok', message: `连接成功：${reply || '已连接'}` })
    } catch (error) {
      setTest({ state: 'error', message: error instanceof Error ? error.message : '连接失败' })
    }
  }

  const pickImport = (mode: 'merge' | 'replace') => {
    importModeRef.current = mode
    fileInputRef.current?.click()
  }

  const handleFile = async (file: File) => {
    const text = await file.text()
    if (importModeRef.current === 'replace') {
      setPendingReplace({ name: file.name, text })
      return
    }
    try {
      const result = importData(text, 'merge')
      notify(`导入完成：新增 ${result.added} 条，跳过 ${result.skipped} 条`, 'success')
    } catch (error) {
      notify(error instanceof Error ? error.message : '导入失败', 'error')
    }
  }

  const applyReplace = () => {
    if (!pendingReplace) return
    try {
      const result = importData(pendingReplace.text, 'replace')
      notify(`已用备份替换：${result.added} 条记录`, 'success')
    } catch (error) {
      notify(error instanceof Error ? error.message : '导入失败', 'error')
    }
    setPendingReplace(null)
  }

  return (
    <section className="view">
      <header className="page-head">
        <div>
          <p className="eyebrow">偏好 · 设置</p>
          <h1 className="page-title">设置</h1>
          <p className="page-sub">数据留在你手里，AI 用什么也由你决定。</p>
        </div>
      </header>

      <div className="settings-stack">
        <section className="card settings-card">
          <div className="settings-head">
            <div>
              <h2>AI 配置</h2>
              <p>支持任何 OpenAI 兼容接口。Key 只保存在这台设备上，请求直接发往你填的地址。</p>
            </div>
            <span className={`status-pill ${settings.apiKey ? 'is-ok' : ''}`}>
              {settings.apiKey ? '已配置' : '未配置'}
            </span>
          </div>

          <div className="preset-grid">
            {PROVIDER_PRESETS.map((preset) => {
              const active =
                settings.baseUrl.replace(/\/+$/, '') === preset.baseUrl.replace(/\/+$/, '') &&
                settings.model === preset.model
              return (
                <button
                  key={preset.id}
                  className={`preset ${active ? 'is-active' : ''}`}
                  onClick={() => {
                    updateSettings({ baseUrl: preset.baseUrl, model: preset.model })
                    setTest({ state: 'idle', message: '' })
                    notify(`已切换到 ${preset.name}，记得填 API Key`)
                  }}
                >
                  <strong>{preset.name}</strong>
                  <span>{preset.hint}</span>
                </button>
              )
            })}
          </div>

          <div className="field">
            <span className="field-label">接口地址（Base URL）</span>
            <input
              className="input"
              value={settings.baseUrl}
              spellCheck={false}
              placeholder="https://api.deepseek.com/v1"
              onChange={(event) => {
                updateSettings({ baseUrl: event.target.value })
                setTest({ state: 'idle', message: '' })
              }}
            />
            <span className="field-hint">一般以 /v1 结尾，程序会自动补上 /chat/completions</span>
          </div>

          <div className="field-row">
            <label className="field">
              <span className="field-label">模型</span>
              <input
                className="input"
                value={settings.model}
                spellCheck={false}
                placeholder="deepseek-chat"
                onChange={(event) => updateSettings({ model: event.target.value })}
              />
            </label>
            <label className="field">
              <span className="field-label">API Key</span>
              <div className="input-wrap">
                <input
                  className="input"
                  type={showKey ? 'text' : 'password'}
                  value={settings.apiKey}
                  spellCheck={false}
                  autoComplete="off"
                  placeholder="sk-..."
                  onChange={(event) => updateSettings({ apiKey: event.target.value })}
                />
                <button type="button" className="input-action" onClick={() => setShowKey((prev) => !prev)}>
                  {showKey ? '隐藏' : '显示'}
                </button>
              </div>
            </label>
          </div>

          <div className="settings-actions">
            <button className="btn btn-ghost" onClick={() => void runTest()} disabled={test.state === 'loading'}>
              <IconRefresh size={16} />
              {test.state === 'loading' ? '测试中…' : '测试连接'}
            </button>
            {test.state !== 'idle' && (
              <span className={`test-result test-${test.state}`}>
                {test.state === 'ok' && <IconCheck size={15} />}
                {test.message}
              </span>
            )}
          </div>
        </section>

        <section className="card settings-card">
          <div className="settings-head">
            <div>
              <h2>关于你</h2>
              <p>留个称呼，AI 会更像在和你说话；主题跟着你的心情走。</p>
            </div>
          </div>

          <label className="field">
            <span className="field-label">AI 怎么称呼你</span>
            <input
              className="input"
              value={settings.nickname}
              maxLength={20}
              placeholder="比如：小林 / 阿光（不填也行）"
              onChange={(event) => updateSettings({ nickname: event.target.value })}
            />
          </label>

          <div className="field">
            <span className="field-label">主题</span>
            <div className="segmented">
              {THEME_OPTIONS.map((option) => {
                const Icon = option.icon
                return (
                  <button
                    key={option.value}
                    className={`segment ${settings.theme === option.value ? 'is-active' : ''}`}
                    onClick={() => updateSettings({ theme: option.value })}
                  >
                    <Icon size={16} /> {option.label}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        <section className="card settings-card">
          <div className="settings-head">
            <div>
              <h2>数据</h2>
              <p>
                这里记着 {events.length} 条人生记录、{audioCount} 段原声，全部存在当前浏览器里。换设备或清理浏览器前，记得导出备份。
              </p>
            </div>
          </div>

          <div className="data-actions">
            <button className="btn btn-ghost" onClick={exportData} disabled={events.length === 0}>
              <IconDownload size={17} /> 导出备份
            </button>
            <button className="btn btn-ghost" onClick={() => pickImport('merge')}>
              <IconUpload size={17} /> 合并导入
            </button>
            <button className="btn btn-ghost" onClick={() => pickImport('replace')}>
              <IconUpload size={17} /> 覆盖导入
            </button>
            <button className="btn btn-danger-quiet" onClick={() => setConfirmClear(true)} disabled={events.length === 0}>
              <IconTrash size={17} /> 清空全部
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden-input"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) void handleFile(file)
            }}
          />
          <p className="field-hint">
            备份文件包含全部文字与标签，不包含 API Key；原声存放在浏览器的 IndexedDB 中，暂不随备份导出。
          </p>
        </section>

        <section className="card settings-card about-card">
          <div className="settings-head">
            <div>
              <h2>关于人生倾诉器</h2>
              <p>一个不催促你、也不评判你的地方。</p>
            </div>
            <span className="version-tag">v{APP_VERSION}</span>
          </div>
          <div className="about-links">
            <a href={REPO_URL} target="_blank" rel="noreferrer">
              GitHub 仓库
            </a>
            <a href={`${REPO_URL}/issues`} target="_blank" rel="noreferrer">
              反馈问题
            </a>
          </div>
          <p className="about-note">
            AI 的建议不能替代专业的心理或医疗帮助。如果你正处在很难的时刻，请告诉身边信任的人，或拨打心理援助热线
            <strong> 12356</strong>（中国大陆）。你值得被认真对待。
          </p>
        </section>
      </div>

      {confirmClear && (
        <ConfirmDialog
          title="清空所有记录？"
          description={`${events.length} 条记录和 ${audioCount} 段原声都会从这台设备上删除，无法恢复。建议先导出备份。`}
          confirmLabel="全部清空"
          danger
          onCancel={() => setConfirmClear(false)}
          onConfirm={async () => {
            await clearAll()
            setConfirmClear(false)
            notify('所有记录已清空')
          }}
        />
      )}

      {pendingReplace && (
        <ConfirmDialog
          title="用备份覆盖当前数据？"
          description={`将用「${pendingReplace.name}」替换现在的 ${events.length} 条记录，当前数据会被清空。`}
          confirmLabel="覆盖"
          danger
          onCancel={() => setPendingReplace(null)}
          onConfirm={applyReplace}
        />
      )}
    </section>
  )
}
