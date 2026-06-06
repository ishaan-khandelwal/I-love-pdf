import { useState, useEffect } from 'react'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import HomePage from './pages/HomePage.jsx'
import ToolPage from './pages/ToolPage.jsx'
import EditPdfPage from './pages/EditPdfPage.jsx'
import './App.css'
import LoginPage from './pages/LoginPage.jsx'
import SignupPage from './pages/SignupPage.jsx'


function getRouteFromHash() {
  const path = window.location.pathname
  if (path === '/login') {
    return { page: 'login', toolId: null }
  }
  if (path === '/signup') {
    return { page: 'signup', toolId: null }
  }

  const hash = window.location.hash
  if (hash === '#/edit-pdf') {
    return { page: 'edit', toolId: 'edit-pdf' }
  }
  if (hash.startsWith('#/tool/')) {
    const toolId = hash.replace('#/tool/', '')
    if (toolId === 'edit-pdf') {
      return { page: 'edit', toolId }
    }
    return { page: 'tool', toolId }
  }
  return { page: 'home', toolId: null }
}

export default function App() {
  const [route, setRoute] = useState(getRouteFromHash)

  useEffect(() => {
    const onHashChange = () => setRoute(getRouteFromHash())
    window.addEventListener('hashchange', onHashChange)
    window.addEventListener('popstate', onHashChange)
    return () => {
      window.removeEventListener('hashchange', onHashChange)
      window.removeEventListener('popstate', onHashChange)
    }
  }, [])

  const navigate = (toolId) => {
    if (toolId) {
      if (window.location.pathname !== '/') {
        window.history.pushState({}, '', '/')
      }
      window.location.hash = toolId === 'edit-pdf' ? '#/edit-pdf' : `#/tool/${toolId}`
    } else {
      window.history.pushState({}, '', '/')
      // Manually set route since empty hash doesn't always fire hashchange
      setRoute({ page: 'home', toolId: null })
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const navigateAuth = (page) => {
    const path = page === 'signup' ? '/signup' : '/login'
    window.history.pushState({}, '', path)
    setRoute({ page, toolId: null })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (route.page === 'login') {
    return <LoginPage onNavigateAuth={navigateAuth} onNavigateHome={() => navigate(null)} />
  }

  if (route.page === 'signup') {
    return <SignupPage onNavigateAuth={navigateAuth} onNavigateHome={() => navigate(null)} />
  }

  return (
    <>
      <Header onNavigate={navigate} onNavigateAuth={navigateAuth} />
      {route.page === 'tool' && route.toolId ? (
        <ToolPage toolId={route.toolId} onNavigate={navigate} />
      ) : route.page === 'edit' && route.toolId === 'edit-pdf' ? (
        <EditPdfPage onNavigate={navigate} />
      ) : (
        <HomePage onNavigate={navigate} />
      )}
      <Footer />
    </>
  )
}
