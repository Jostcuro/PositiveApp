import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})

type MediaListener = (event: MediaQueryListEvent) => void

let viewportWidth = 1024
const instances = new Set<MockMediaQueryList>()

function queryMatches(query: string, width: number): boolean {
  let media = query.trim()
  if (media.startsWith('@media')) {
    media = media.replace(/^@media\s*/, '')
  }
  const segments = media
    .split(') and (')
    .map((segment) => segment.replace(/^\(|\)$/g, '').trim())

  return segments.every((segment) => {
    const min = segment.match(/min-width:\s*([\d.]+)px/)
    if (min && width < parseFloat(min[1])) return false
    const max = segment.match(/max-width:\s*([\d.]+)px/)
    if (max && width > parseFloat(max[1])) return false
    return true
  })
}

class MockMediaQueryList {
  media: string
  matches: boolean
  onchange: MediaListener | null = null
  private listeners = new Set<MediaListener>()

  constructor(media: string) {
    this.media = media
    this.matches = queryMatches(media, viewportWidth)
  }

  addEventListener(_type: string, listener: MediaListener): void {
    this.listeners.add(listener)
  }

  removeEventListener(_type: string, listener: MediaListener): void {
    this.listeners.delete(listener)
  }

  addListener(listener: MediaListener): void {
    this.listeners.add(listener)
  }

  removeListener(listener: MediaListener): void {
    this.listeners.delete(listener)
  }

  dispatchEvent(): boolean {
    return false
  }

  notify(): void {
    const next = queryMatches(this.media, viewportWidth)
    if (next === this.matches) return
    this.matches = next
    const event = { matches: next, media: this.media } as MediaQueryListEvent
    this.onchange?.call(this, event)
    this.listeners.forEach((listener) => listener(event))
  }
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: (query: string) => {
    const mql = new MockMediaQueryList(query)
    instances.add(mql)
    return mql
  },
})

export function setViewportWidth(width: number): void {
  viewportWidth = width
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
  instances.forEach((instance) => instance.notify())
  window.dispatchEvent(new Event('resize'))
}