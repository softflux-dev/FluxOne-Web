import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { AppRouter } from '@/router/index'
import { useTheme } from '@/context/ThemeContext'
import { BRAND } from '@/lib/constants'

function ThemedToastContainer() {
  const { theme } = useTheme()
  return (
    <ToastContainer
      position="top-right"
      autoClose={2800}
      newestOnTop
      closeOnClick
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme={theme === 'dark' ? 'dark' : 'light'}
      style={{ zIndex: 99999, top: '4.35rem' }}
      toastStyle={{
        fontFamily: 'inherit',
        borderRadius: '12px',
        boxShadow:
          theme === 'dark'
            ? '0 8px 24px rgba(0, 0, 0, 0.45)'
            : '0 8px 24px rgba(65, 34, 131, 0.14)',
      }}
      progressStyle={{ background: BRAND.purple }}
    />
  )
}

function App() {
  return (
    <>
      <AppRouter />
      <ThemedToastContainer />
    </>
  )
}

export default App
