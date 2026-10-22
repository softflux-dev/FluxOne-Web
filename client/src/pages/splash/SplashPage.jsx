import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrandLogo } from '@/components/shared/BrandLogo'
import { BRAND } from '@/lib/constants'
import { PATHS } from '@/router/paths'

// Keeps the animations separate so the component code stays clean
const styles = `
  @keyframes splashLogoIn {
    0% { transform: scale(0.85); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }

  @keyframes splashTextIn {
    0% { transform: translateY(15px); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
  }

  .animate-splash-logo {
    animation: splashLogoIn 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }

  .animate-splash-text {
    opacity: 0;
    animation: splashTextIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    animation-delay: 1.1s;
  }

  /* Ensure consistent sizing across all devices using viewport-relative units */
  .splash-logo-container {
    width: clamp(160px, 50vw, 320px);
    aspect-ratio: 1 / 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .splash-text-container {
    margin-top: clamp(15px, 5vh, 40px);
    padding: 0 20px;
  }

  .splash-text {
    font-size: clamp(10px, 2.5vw, 16px);
    letter-spacing: clamp(0.15em, 0.3vw, 0.4em);
    color: rgba(255, 255, 255, 0.9);
    font-weight: 500;
    text-transform: uppercase;
    margin: 0;
  }
`

export function SplashPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate(PATHS.login, { replace: true })
    }, 2600)
    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <section
      className="flex min-h-dvh flex-col items-center justify-center overflow-hidden"
      style={{
        background: `linear-gradient(160deg, ${BRAND.deep} 0%, ${BRAND.purple} 55%, #2A1658 100%)`,
      }}
    >
      <style>{styles}</style>

      {/* Centered container holding both logo and text in flow */}
      <div className="flex flex-col items-center justify-center w-full max-w-2xl">

        {/* Logo Container - Uses viewport-relative sizing for consistency */}
        <div className="animate-splash-logo splash-logo-container">
          <BrandLogo size="xl" withGlow className="w-full h-full object-contain" />
        </div>

        {/* Text Line - Maintains proportional spacing on all devices */}
        <div className="animate-splash-text splash-text-container text-center">
          <p className="splash-text">
            FluxOne Web-Panel
          </p>
        </div>
      </div>
    </section>
  )
}