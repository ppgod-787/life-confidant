import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Icon({ size = 20, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const IconTimeline = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 4v16" />
    <circle cx="5" cy="8" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="5" cy="16" r="1.6" fill="currentColor" stroke="none" />
    <path d="M10 8h9M10 16h6" />
  </Icon>
)

export const IconCalendar = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </Icon>
)

export const IconChat = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 11.5c0 4-3.6 7-8 7-1 0-2-.15-2.9-.44L4 20l1.3-3.6C4.2 15.1 3.5 13.4 3.5 11.5c0-4 3.6-7 8.2-7s8.3 3 8.3 7Z" />
    <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" />
  </Icon>
)

export const IconSettings = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19.4 14.6a7.7 7.7 0 0 0 .1-2.6l2-1.5-2-3.5-2.4 1a7.7 7.7 0 0 0-2.2-1.3L14.5 4h-4l-.4 2.7a7.7 7.7 0 0 0-2.2 1.3l-2.4-1-2 3.5 2 1.5a7.7 7.7 0 0 0 0 2.6l-2 1.5 2 3.5 2.4-1a7.7 7.7 0 0 0 2.2 1.3l.4 2.7h4l.4-2.7a7.7 7.7 0 0 0 2.2-1.3l2.4 1 2-3.5-2.1-1.5Z" />
  </Icon>
)

export const IconPlus = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
)

export const IconPen = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 20h4.5L20 8.5a2.12 2.12 0 0 0-3-3L5.5 17 4 20Z" />
    <path d="M14.5 7.5l2 2" />
  </Icon>
)

export const IconMic = (p: IconProps) => (
  <Icon {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6" />
  </Icon>
)

export const IconStop = (p: IconProps) => (
  <Icon {...p}>
    <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" stroke="none" />
  </Icon>
)

export const IconTrash = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h16M9 7V4.5h6V7M6.5 7l.8 12.2A1.8 1.8 0 0 0 9.1 21h5.8a1.8 1.8 0 0 0 1.8-1.8L17.5 7" />
    <path d="M10 11v6M14 11v6" />
  </Icon>
)

export const IconClose = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
)

export const IconSearch = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4 4" />
  </Icon>
)

export const IconChevronLeft = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14.5 5.5 8 12l6.5 6.5" />
  </Icon>
)

export const IconChevronRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9.5 5.5 16 12l-6.5 6.5" />
  </Icon>
)

export const IconPlay = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 5.5v13l10-6.5-10-6.5Z" fill="currentColor" stroke="none" />
  </Icon>
)

export const IconPause = (p: IconProps) => (
  <Icon {...p}>
    <rect x="7" y="5" width="3.5" height="14" rx="1.2" fill="currentColor" stroke="none" />
    <rect x="13.5" y="5" width="3.5" height="14" rx="1.2" fill="currentColor" stroke="none" />
  </Icon>
)

export const IconSend = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 4 3.8 10.7c-.9.4-.8 1.6.1 1.9l6.3 2 2 6.3c.3.9 1.5 1 1.9.1L20 4Z" />
    <path d="M10.2 14.6 20 4" />
  </Icon>
)

export const IconDownload = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3v11M7.5 10 12 14.5 16.5 10M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17" />
  </Icon>
)

export const IconUpload = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 15V4M7.5 8 12 3.5 16.5 8M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17" />
  </Icon>
)

export const IconSparkles = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.5l1.7 4.8 4.8 1.7-4.8 1.7L12 16.5l-1.7-4.8L5.5 10l4.8-1.7L12 3.5Z" />
    <path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
  </Icon>
)

export const IconSun = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
  </Icon>
)

export const IconMoon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
  </Icon>
)

export const IconMonitor = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="4.5" width="18" height="12" rx="2.5" />
    <path d="M9 20.5h6M12 16.5v4" />
  </Icon>
)

export const IconCheck = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.5 12.5 9.5 17.5 20 6.5" />
  </Icon>
)

export const IconRefresh = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 11a8 8 0 1 0-1.8 6M20 4.5V11h-6" />
  </Icon>
)

export const IconEdit = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 20h4.5L20 8.5a2.12 2.12 0 0 0-3-3L5.5 17 4 20Z" />
  </Icon>
)

export const IconClock = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Icon>
)

export const IconQuote = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9.5 6.5C6.5 7.5 5 9.6 5 12v5h5v-5H7.5c0-2 .8-3.3 2.8-4L9.5 6.5ZM19 6.5c-3 1-4.5 3.1-4.5 5.5v5h5v-5H17c0-2 .8-3.3 2.8-4L19 6.5Z" />
  </Icon>
)

export const IconVolume = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 9.5v5h3l4 3.5V6L7 9.5H4Z" />
    <path d="M15 8.5a5 5 0 0 1 0 7M17.5 6a8.5 8.5 0 0 1 0 12" />
  </Icon>
)
