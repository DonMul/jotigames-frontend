import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'

import { AuthProvider, useAuth } from './lib/auth'
import { I18nProvider } from './lib/i18n'
import { LocaleProvider } from './lib/locale'
import AdminGameChatOverlay from './components/AdminGameChatOverlay'
import PublicLayout from './components/PublicLayout'
import AboutPage from './pages/AboutPage'
import BulkToolsPage from './pages/admin/BulkToolsPage'
import BlindHikeConfigurePage from './pages/admin/BlindHikeConfigurePage'
import GameFormPage from './pages/admin/GameFormPage'
import GameCardsPage from './pages/admin/GameCardsPage'
import GameCardsPdfPage from './pages/admin/GameCardsPdfPage'
import GameMemberFormPage from './pages/admin/GameMemberFormPage'
import GamePage from './pages/admin/GamePage'
import GameInfoPage from './pages/GameInfoPage'
import GamesPage from './pages/admin/GamesPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import ModuleOverviewPage from './pages/admin/ModuleOverviewPage'
import FaqPage from './pages/FaqPage'
import RegisterPage from './pages/RegisterPage'
import GeoHunterAdminPage from './pages/admin/GeoHunterAdminPage'
import ResourceRunAdminPage from './pages/admin/ResourceRunAdminPage'
import TerritoryControlAdminPage from './pages/admin/TerritoryControlAdminPage'
import EchoHuntAdminPage from './pages/admin/EchoHuntAdminPage'
import CheckpointHeistAdminPage from './pages/admin/CheckpointHeistAdminPage'
import CourierRushAdminPage from './pages/admin/CourierRushAdminPage'
import PandemicResponseAdminPage from './pages/admin/PandemicResponseAdminPage'
import MarketCrashAdminPage from './pages/admin/MarketCrashAdminPage'
import MarketCrashPointFormPage from './pages/admin/MarketCrashPointFormPage'
import BirdsOfPreyConfigurePage from './pages/admin/BirdsOfPreyConfigurePage'
import CodeConspiracyConfigurePage from './pages/admin/CodeConspiracyConfigurePage'
import Crazy88AdminPage from './pages/admin/Crazy88AdminPage'
import SuperAdminGameTypesPage from './pages/super-admin/SuperAdminGameTypesPage'
import TeamEntryPage from './pages/team/TeamEntryPage'
import TeamDashboardPage from './pages/team/TeamDashboardPage'
import TeamEditPage from './pages/team/TeamEditPage'
import TeamFormPage from './pages/admin/TeamFormPage'
import TeamLoginPage from './pages/team/TeamLoginPage'
import TeamModulePage from './pages/admin/TeamModulePage'
import TeamPlayPage from './pages/team/TeamPlayPage'
import TeamScanPage from './pages/team/TeamScanPage'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return children
}

function useAutoScrollSuccessFlash() {
  useEffect(() => {
    const scrolledFlashes = new WeakSet()

    const scrollToLatestSuccessFlash = () => {
      const successFlashes = Array.from(document.querySelectorAll('.flash.flash-success'))
      const target = successFlashes[successFlashes.length - 1]
      if (!target || scrolledFlashes.has(target)) {
        return
      }

      scrolledFlashes.add(target)
      target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
    }

    const observer = new MutationObserver((mutations) => {
      const hasRelevantChange = mutations.some((mutation) => {
        if (mutation.type === 'childList') {
          const addedNodes = Array.from(mutation.addedNodes)
          return addedNodes.some((node) => {
            if (!(node instanceof Element)) {
              return false
            }
            return node.matches('.flash.flash-success') || node.querySelector('.flash.flash-success')
          })
        }

        if (mutation.type === 'attributes' && mutation.target instanceof Element) {
          const element = mutation.target
          return element.matches('.flash.flash-success') || element.querySelector('.flash.flash-success')
        }

        return false
      })

      if (hasRelevantChange) {
        window.requestAnimationFrame(scrollToLatestSuccessFlash)
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    })

    return () => {
      observer.disconnect()
    }
  }, [])
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function AppRoutes() {
  useAutoScrollSuccessFlash()

  const renderProtected = (element) => <ProtectedRoute>{element}</ProtectedRoute>
  const renderProtectedAdminGame = (element) => (
    <ProtectedRoute>{element}</ProtectedRoute>
  )
  const renderProtectedLiveOverview = (element) => (
    <ProtectedRoute>
      <>
        {element}
        <AdminGameChatOverlay />
      </>
    </ProtectedRoute>
  )

  return (
    <PublicLayout>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/team-login" element={<TeamLoginPage />} />
        <Route path="/info/games/:slug" element={<GameInfoPage />} />
        <Route
          path="/team"
          element={renderProtected(<TeamDashboardPage />)}
        />
        <Route
          path="/team/edit"
          element={renderProtected(<TeamEditPage />)}
        />
        <Route
          path="/team/scan/:qrToken"
          element={<TeamScanPage />}
        />
        <Route
          path="/team/enter"
          element={renderProtected(<TeamEntryPage />)}
        />
        <Route
          path="/admin/games"
          element={renderProtected(<GamesPage />)}
        />
        <Route
          path="/admin/game-types"
          element={renderProtected(<SuperAdminGameTypesPage />)}
        />
        <Route
          path="/admin/games/new"
          element={renderProtected(<GameFormPage />)}
        />
        <Route
          path="/admin/games/:gameId"
          element={renderProtectedAdminGame(<GamePage />)}
        />
        <Route
          path="/admin/games/:gameId/edit"
          element={renderProtectedAdminGame(<GameFormPage />)}
        />
        <Route
          path="/admin/games/:gameId/cards"
          element={renderProtectedAdminGame(<GameCardsPage />)}
        />
        <Route
          path="/admin/games/:gameId/cards/pdf"
          element={renderProtectedAdminGame(<GameCardsPdfPage />)}
        />
        <Route
          path="/admin/games/:gameId/bulk-tools"
          element={renderProtectedAdminGame(<BulkToolsPage />)}
        />
        <Route
          path="/admin/games/:gameId/teams/new"
          element={renderProtectedAdminGame(<TeamFormPage />)}
        />
        <Route
          path="/admin/games/:gameId/members/new"
          element={renderProtectedAdminGame(<GameMemberFormPage />)}
        />
        <Route
          path="/admin/games/:gameId/members/:userId/edit"
          element={renderProtectedAdminGame(<GameMemberFormPage />)}
        />
        <Route
          path="/admin/games/:gameId/teams/:teamId/edit"
          element={renderProtectedAdminGame(<TeamFormPage />)}
        />
        <Route
          path="/admin/games/:gameId/overview"
          element={renderProtectedLiveOverview(<ModuleOverviewPage />)}
        />
        <Route
          path="/admin/games/:gameId/live-overview"
          element={renderProtectedLiveOverview(<ModuleOverviewPage />)}
        />
        <Route
          path="/admin/geohunter/:gameId/pois"
          element={renderProtectedAdminGame(<GeoHunterAdminPage />)}
        />
        <Route
          path="/admin/resource-run/:gameId/nodes"
          element={renderProtectedAdminGame(<ResourceRunAdminPage />)}
        />
        <Route
          path="/admin/territory-control/:gameId/zones"
          element={renderProtectedAdminGame(<TerritoryControlAdminPage />)}
        />
        <Route
          path="/admin/blindhike/:gameId/configure"
          element={renderProtectedAdminGame(<BlindHikeConfigurePage />)}
        />
        <Route
          path="/admin/echo-hunt/:gameId/beacons"
          element={renderProtectedAdminGame(<EchoHuntAdminPage />)}
        />
        <Route
          path="/admin/checkpoint-heist/:gameId/checkpoints"
          element={renderProtectedAdminGame(<CheckpointHeistAdminPage />)}
        />
        <Route
          path="/admin/courier-rush/:gameId/configure"
          element={renderProtectedAdminGame(<CourierRushAdminPage />)}
        />
        <Route
          path="/admin/pandemic-response/:gameId/hotspots"
          element={renderProtectedAdminGame(<PandemicResponseAdminPage />)}
        />
        <Route
          path="/admin/market-crash/:gameId/points"
          element={renderProtectedAdminGame(<MarketCrashAdminPage />)}
        />
        <Route
          path="/admin/market-crash/:gameId/points/new"
          element={renderProtectedAdminGame(<MarketCrashPointFormPage />)}
        />
        <Route
          path="/admin/market-crash/:gameId/points/:pointId/edit"
          element={renderProtectedAdminGame(<MarketCrashPointFormPage />)}
        />
        <Route
          path="/admin/birds-of-prey/:gameId/configure"
          element={renderProtectedAdminGame(<BirdsOfPreyConfigurePage />)}
        />
        <Route
          path="/admin/code-conspiracy/:gameId/configure"
          element={renderProtectedAdminGame(<CodeConspiracyConfigurePage />)}
        />
        <Route
          path="/admin/crazy88/:gameId/tasks"
          element={renderProtectedAdminGame(<Crazy88AdminPage />)}
        />
        <Route
          path="/admin/games/:gameId/teams/:teamId/play"
          element={renderProtectedAdminGame(<TeamModulePage />)}
        />
        <Route
          path="/team/games/:gameId/play"
          element={renderProtected(<TeamPlayPage />)}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </PublicLayout>
  )
}

export default function App() {
  return (
    <LocaleProvider>
      <I18nProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </I18nProvider>
    </LocaleProvider>
  )
}
