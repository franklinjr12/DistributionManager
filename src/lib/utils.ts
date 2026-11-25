import clsx, { type ClassValue } from 'clsx'

/** className combiner (clsx). */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

/** Demo "now": sexta 2026-11-20 10:30 BRT (America/Belem, UTC-3). */
export const DEMO_NOW_ISO = '2026-11-20T10:30:00-03:00'
export const DEMO_NOW = new Date(DEMO_NOW_ISO)
export const PILOT_START_ISO = '2026-10-12T00:00:00-03:00'

/**
 * Returns the simulated current time. The demo clock starts at DEMO_NOW and
 * advances in real time since page load, so newly created items sort after seed data.
 */
const loadedAt = Date.now()
export function now(): Date {
  return new Date(DEMO_NOW.getTime() + (Date.now() - loadedAt))
}
export function nowISO(): string {
  return toBelemISO(now())
}

/** Formats a Date as ISO with fixed -03:00 offset. */
export function toBelemISO(d: Date): string {
  const t = new Date(d.getTime() - 3 * 3600_000)
  const p = (n: number, l = 2) => String(n).padStart(l, '0')
  return `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())}T${p(t.getUTCHours())}:${p(t.getUTCMinutes())}:${p(t.getUTCSeconds())}-03:00`
}

/** Build a Belém ISO string: belem('2026-11-20', '10:30') */
export function belem(date: string, time = '00:00', seconds = 0): string {
  return `${date}T${time}:${String(seconds).padStart(2, '0')}-03:00`
}

/** yyyy-MM-dd in Belém time for a date/ISO. */
export function belemDay(d: Date | string): string {
  const dt = typeof d === 'string' ? new Date(d) : d
  return toBelemISO(dt).slice(0, 10)
}

/** Weekday (0=dom) in Belém time. */
export function belemWeekday(d: Date | string): number {
  const day = belemDay(d)
  return new Date(`${day}T12:00:00Z`).getUTCDay()
}

export function addMinutes(iso: string, minutes: number): string {
  return toBelemISO(new Date(new Date(iso).getTime() + minutes * 60_000))
}
export function addSeconds(iso: string, seconds: number): string {
  return toBelemISO(new Date(new Date(iso).getTime() + seconds * 1000))
}
export function diffMinutes(a: string, b: string): number {
  return (new Date(a).getTime() - new Date(b).getTime()) / 60_000
}

/** Is the given moment inside tenant business hours (seg–sex 08–18 Belém)? */
export function isBusinessHours(d: Date | string = now(), days = [1, 2, 3, 4, 5], start = '08:00', end = '18:00'): boolean {
  const iso = typeof d === 'string' ? d : toBelemISO(d)
  const wd = belemWeekday(iso)
  const hm = iso.slice(11, 16)
  return days.includes(wd) && hm >= start && hm < end
}

let idCounter = 0
/** Short unique id with prefix: uid('lead') → 'lead_k3j9x1' */
export function uid(prefix = 'id'): string {
  idCounter += 1
  return `${prefix}_${Date.now().toString(36).slice(-4)}${idCounter.toString(36)}${Math.random().toString(36).slice(2, 5)}`
}

/** Deterministic PRNG (mulberry32) for seed data. */
export function seededRandom(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Fake SHA-256 hex (deterministic, for display of hashed match keys). */
export function fakeSha256(input: string): string {
  let out = ''
  let h = hashString(input)
  const rnd = seededRandom(h)
  while (out.length < 64) {
    h = Math.floor(rnd() * 0xffffffff)
    out += h.toString(16).padStart(8, '0')
  }
  return out.slice(0, 64)
}

export function median(values: number[]): number | null {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b)
  if (!v.length) return null
  const mid = Math.floor(v.length / 2)
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2
}

export function sum(values: number[]): number {
  return values.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0)
}

export function groupBy<T, K extends string>(items: T[], key: (t: T) => K): Record<K, T[]> {
  return items.reduce(
    (acc, it) => {
      const k = key(it)
      ;(acc[k] ||= []).push(it)
      return acc
    },
    {} as Record<K, T[]>,
  )
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

/** Initials for avatars: "Vinicius Goés" → "VG" */
export function initials(name: string): string {
  const parts = name.replace(/^@/, '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Random session code MQ-XXXX */
export function sessionCode(): string {
  return `MQ-${Math.floor(1000 + Math.random() * 9000)}`
}
