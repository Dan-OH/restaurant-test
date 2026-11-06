import { useEffect, useState } from 'react'

/**
 * useState that remembers its value in this browser (localStorage), for view preferences
 * like sort order. Falls back to `initial` if storage is unavailable or the saved value
 * isn't one of `allowed` (when given).
 */
export function usePersistentState(key, initial, allowed) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key)
      if (saved === null) return initial
      const parsed = JSON.parse(saved)
      return !allowed || allowed.includes(parsed) ? parsed : initial
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Storage blocked (private mode etc.); the preference just won't be remembered.
    }
  }, [key, value])

  return [value, setValue]
}
