import { Fragment, type ReactNode } from 'react'

function inline(text: string, prefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const pattern = /(\*\*[^*\n]+\*\*|`[^`\n]+`|\*[^*\n]+\*)/g
  let last = 0
  let match: RegExpExecArray | null
  let index = 0
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index))
    const token = match[0]
    const key = `${prefix}-i${index}`
    if (token.startsWith('**')) nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>)
    else if (token.startsWith('`')) nodes.push(<code key={key}>{token.slice(1, -1)}</code>)
    else nodes.push(<em key={key}>{token.slice(1, -1)}</em>)
    last = pattern.lastIndex
    index += 1
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

const isBlockStart = (line: string): boolean =>
  /^```/.test(line) || /^#{1,6}\s/.test(line) || /^\s*[-*+]\s+/.test(line) || /^\s*\d+\.\s+/.test(line) || /^>\s?/.test(line)

/** 极简 Markdown 渲染：只支持标题、列表、引用、代码块、粗体、斜体、行内代码，全部走 React 节点，不注入 HTML */
export function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i += 1
      continue
    }

    if (line.trim().startsWith('```')) {
      const codeLines: string[] = []
      i += 1
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i += 1
      }
      i += 1
      blocks.push(
        <pre className="md-pre" key={`b${key++}`}>
          <code>{codeLines.join('\n')}</code>
        </pre>,
      )
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/)
    if (heading) {
      const level = heading[1].length
      blocks.push(
        <p className={`md-heading md-heading-${Math.min(level, 3)}`} key={`b${key++}`}>
          {inline(heading[2], `h${key}`)}
        </p>,
      )
      i += 1
      continue
    }

    if (/^>\s?/.test(line)) {
      const quote: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ''))
        i += 1
      }
      blocks.push(
        <blockquote className="md-quote" key={`b${key++}`}>
          {inline(quote.join(' '), `q${key}`)}
        </blockquote>,
      )
      continue
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ''))
        i += 1
      }
      blocks.push(
        <ul className="md-list" key={`b${key++}`}>
          {items.map((item, index) => (
            <li key={`li${index}`}>{inline(item, `u${key}-${index}`)}</li>
          ))}
        </ul>,
      )
      continue
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''))
        i += 1
      }
      blocks.push(
        <ol className="md-list md-ordered" key={`b${key++}`}>
          {items.map((item, index) => (
            <li key={`li${index}`}>{inline(item, `o${key}-${index}`)}</li>
          ))}
        </ol>,
      )
      continue
    }

    const paragraph: string[] = [line]
    i += 1
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) {
      paragraph.push(lines[i])
      i += 1
    }
    blocks.push(
      <p className="md-p" key={`b${key++}`}>
        {paragraph.map((part, index) => (
          <Fragment key={`p${key}-${index}`}>
            {index > 0 && <br />}
            {inline(part, `t${key}-${index}`)}
          </Fragment>
        ))}
      </p>,
    )
  }

  return <div className="md">{blocks}</div>
}
