// Every icon in the app comes from this file. UI icons are Phosphor, all drawn with one weight (WEIGHT);
// change it, or swap the library behind these names, and the whole app follows. Navigation uses VEIL's
// own drawn set below (NavIcon).
import type { CSSProperties } from 'react'
import * as P from '@phosphor-icons/react'
import deadlockMark from '../assets/deadlock-mark.png'

export type IconWeight = 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone'
export const WEIGHT: IconWeight = 'duotone'

type Props = { size?: number; className?: string; style?: CSSProperties; strokeWidth?: number; 'aria-label'?: string }
const wrap = (C: P.Icon, weight: IconWeight = WEIGHT) => {
  const I = ({ size = 16, className, style, ...rest }: Props) => <C size={size} weight={weight} className={className} style={style} aria-label={rest['aria-label']} aria-hidden={rest['aria-label'] ? undefined : true} />
  return I
}

export const AlertTriangle = wrap(P.Warning)
export const ArrowRight = wrap(P.ArrowRight, 'bold')
export const ArrowUpRight = wrap(P.ArrowUpRight, 'bold')
export const Star = wrap(P.Star, 'fill')
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

/* ---------- navigation: plain, recognisable symbols; the game tab uses Deadlock's own mark ---------- */
export type NavName = 'home' | 'mods' | 'console' | 'forge' | 'crosshair' | 'sound' | 'game' | 'settings'

const NAV_ICONS: Record<Exclude<NavName, 'game'>, P.Icon> = {
  home: P.House,
  mods: P.SlidersHorizontal,
  console: P.TerminalWindow,
  forge: P.Heartbeat,
  crosshair: P.Crosshair,
  sound: P.SpeakerHigh,
  settings: P.GearSix,
}

export function NavIcon({ name, size = 20, active }: { name: NavName; size?: number; active?: boolean }) {
  if (name === 'game') {
    // Deadlock's emblem as a mask, so it takes the button's colour like the other icons
    return <span aria-hidden style={{ width: size + 2, height: size + 2, display: 'block', background: 'currentColor', WebkitMaskImage: `url(${deadlockMark})`, maskImage: `url(${deadlockMark})`, WebkitMaskSize: 'contain', maskSize: 'contain', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskPosition: 'center' }} />
  }
  const I = NAV_ICONS[name]
  return <I size={size} weight={active ? 'bold' : 'regular'} aria-hidden />
}
