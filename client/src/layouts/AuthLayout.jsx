import { useTheme } from '@/context/ThemeContext'
import { BRAND } from '@/lib/constants'

const LIGHT_BG = `linear-gradient(165deg, ${BRAND.soft} 0%, #ebe4f8 45%, #e8eefc 100%)`
const DARK_BG =
  'linear-gradient(165deg, hsl(230 18% 8%) 0%, hsl(260 22% 12%) 50%, hsl(230 18% 7%) 100%)'

export function AuthLayout({ children }) {
  const { isDark } = useTheme()

  return (
    <section
      className="flex min-h-dvh items-center justify-center px-3 py-6 sm:px-4 sm:py-10"
      style={{ background: isDark ? DARK_BG : LIGHT_BG }}
    >
      <div className="w-full max-w-[420px] rounded-2xl border border-white/80 bg-white p-4 shadow-[0_18px_50px_rgba(65,34,131,0.12)] sm:p-8 dark:border-border dark:bg-card dark:shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
        {children}
      </div>
    </section>
  )
}
