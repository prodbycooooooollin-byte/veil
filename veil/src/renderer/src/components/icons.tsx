// Every icon in the app comes from this file. UI icons are Phosphor, all drawn with one weight (WEIGHT);
// change it, or swap the library behind these names, and the whole app follows. Navigation uses VEIL's
// own drawn set below (NavIcon).
import type { CSSProperties } from 'react'
import * as P from '@phosphor-icons/react'

export type IconWeight = 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone'
export const WEIGHT: IconWeight = 'duotone'

type Props = { size?: number; className?: string; style?: CSSProperties; strokeWidth?: number; 'aria-label'?: string }
const wrap = (C: P.Icon, weight: IconWeight = WEIGHT) => {
  const I = ({ size = 16, className, style, ...rest }: Props) => <C size={size} weight={weight} className={className} style={style} aria-label={rest['aria-label']} aria-hidden={rest['aria-label'] ? undefined : true} />
  return I
}

export const AlertTriangle = wrap(P.Warning)
export const ArrowRight = wrap(P.ArrowRight, 'bold')
export const AudioLines = wrap(P.Waveform)
export const Box = wrap(P.Cube)
export const Check = wrap(P.Check, 'bold')
export const ChevronDown = wrap(P.CaretDown, 'bold')
export const ChevronsLeftRight = wrap(P.ArrowsHorizontal, 'bold')
export const ClipboardPaste = wrap(P.ClipboardText)
export const Copy = wrap(P.Copy)
export const Crosshair = wrap(P.Crosshair)
export const Download = wrap(P.DownloadSimple)
export const ExternalLink = wrap(P.ArrowSquareOut)
export const FileInput = wrap(P.FileArrowDown)
export const FileUp = wrap(P.FileArrowUp)
export const FolderOpen = wrap(P.FolderOpen)
export const HardDriveDownload = wrap(P.HardDrives)
export const HelpCircle = wrap(P.Question)
export const Layers = wrap(P.Stack)
export const LayoutGrid = wrap(P.SquaresFour)
export const LayoutPanelTop = wrap(P.Layout)
export const Lock = wrap(P.LockSimple)
export const Map = wrap(P.MapTrifold)
export const Minus = wrap(P.Minus, 'light')
export const Play = wrap(P.Play, 'fill')
export const Plus = wrap(P.Plus, 'bold')
export const RotateCcw = wrap(P.ArrowCounterClockwise)
export const RotateCw = wrap(P.ArrowClockwise)
export const Shirt = wrap(P.TShirt)
export const Sparkles = wrap(P.Sparkle)
export const Square = wrap(P.Square, 'light')
export const TerminalSquare = wrap(P.TerminalWindow)
export const Trash2 = wrap(P.Trash)
export const Undo2 = wrap(P.ArrowUUpLeft)
export const Upload = wrap(P.UploadSimple)
export const Volume2 = wrap(P.SpeakerHigh)
export const Wand2 = wrap(P.MagicWand)
export const X = wrap(P.X, 'light')
export const ZoomIn = wrap(P.MagnifyingGlassPlus)
export const Gear = wrap(P.GearSix)
export const Keyboard = wrap(P.Keyboard)
export const Info = wrap(P.Info)

/* ---------- VEIL navigation set: 24px grid, 1.6 stroke, a brass accent shape in each ---------- */
export type NavName = 'home' | 'mods' | 'console' | 'forge' | 'crosshair' | 'sound' | 'game' | 'settings'

export function NavIcon({ name, size = 20, active }: { name: NavName; size?: number; active?: boolean }) {
  const acc = { fill: 'var(--brass)', opacity: active ? 1 : 0.55, stroke: 'none' }
  const body = {
    home: <><path d="M5 20.5V10.5a7 7 0 0 1 14 0v10" /><path d="M3 20.5h18" /><path d="M12 6.8l2 2.7-2 2.7-2-2.7z" style={acc} /></>,
    mods: <><path d="M12 3.5l8 4-8 4-8-4z" /><path d="M4 12l8 4 8-4" /><path d="M4 16.5l8 4 8-4" /><path d="M12 5.6l3.8 1.9L12 9.4 8.2 7.5z" style={acc} /></>,
    console: <><rect x="3" y="4.5" width="18" height="15" rx="2.5" /><path d="M7 10l3 2.5L7 15" /><rect x="12.5" y="14" width="5" height="1.8" rx=".9" style={acc} /></>,
    forge: <><path d="M3.5 8.5h13a4 4 0 0 1-4 4h-1.5v3h3l1.5 3.5H6.5L8 15.5h3v-3H8a4.5 4.5 0 0 1-4.5-4z" /><path d="M16.5 8.5l4-1.5" /><circle cx="19.6" cy="5" r="1.4" style={acc} /></>,
    crosshair: <><circle cx="12" cy="12" r="7.5" /><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4" /><path d="M12 9.6l2.4 2.4-2.4 2.4-2.4-2.4z" style={acc} /></>,
    sound: <><path d="M4 9.5v5M8 6.5v11M12 4v16M16 7.5v9M20 10.5v3" /><rect x="10.9" y="9" width="2.2" height="6" rx="1.1" style={acc} /></>,
    game: <><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" /><path d="M4 7.5l8 4.5 8-4.5M12 12v9" /><path d="M12 12l4-2.25v4.5L12 16.5z" style={acc} /></>,
    settings: <><path d="M12 2.8l2 1.9 2.7-.3.7 2.6 2.4 1.3-.8 2.6.8 2.6-2.4 1.3-.7 2.6-2.7-.3-2 1.9-2-1.9-2.7.3-.7-2.6-2.4-1.3.8-2.6-.8-2.6 2.4-1.3.7-2.6 2.7.3z" /><circle cx="12" cy="12" r="3" style={acc} /></>,
  }[name]
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {body}
    </svg>
  )
}
