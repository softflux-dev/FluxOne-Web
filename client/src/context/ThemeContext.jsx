import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const ThemeContext = createContext(null)
const THEME_KEY = 'fluxone.theme'

function normalizeTheme(value) {
  return value === 'dark' ? 'dark' : 'light'
}

function readStoredTheme() {
  try {
    return normalizeTheme(localStorage.getItem(THEME_KEY))
  } catch {
    return 'light'
  }
}

function applyThemeClass(theme) {
  const root = document.documentElement
  const next = normalizeTheme(theme)
  root.classList.toggle('dark', next === 'dark')
  root.style.colorScheme = next
  try {
    localStorage.setItem(THEME_KEY, next)
  } catch {
    // Ignore private-mode / quota failures — class still applies for this session
  }
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStoredTheme)

  useEffect(() => {
    applyThemeClass(theme)
  }, [theme])

  const setTheme = useCallback((next) => {
    setThemeState((current) =>
      normalizeTheme(typeof next === 'function' ? next(current) : next),
    )
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === 'dark',
      setTheme,
      toggleTheme,
    }),
    [theme, setTheme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
