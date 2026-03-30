import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { lazy, Suspense, useEffect, useState } from 'react'

import { AuthProvider, useAuth } from './lib/auth'
import { gameApi } from './lib/api'
import { I18nProvider } from './lib/i18n'
import { LocaleProvider } from './lib/locale'

/* ── Eagerly loaded shell components (always needed) ─────────────── */
import PublicLayout from './components/PublicLayout'
import AdminGameChatOverlay from './components/AdminGameChatOverlay'
import AccountLayout from './components/AccountLayout'

/* ── Lazy-loaded pages (route-based code splitting) ──────────────── */
// Public
const HomePage = lazy(() => import('./pages/HomePage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const FaqPage = lazy(() => import('./pages/FaqPage'))
const MonetisationPage = lazy(() => import('./pages/MonetisationPage'))
const GameInfoPage = lazy(() => import('./pages/GameInfoPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const TeamLoginPage = lazy(() => import('./pages/team/TeamLoginPage'))

// Account
const ProfilePage = lazy(() => import('./pages/account/ProfilePage'))
const AccountSubscriptionPage = lazy(() => import('./pages/account/AccountSubscriptionPage'))
const PaymentsPage = lazy(() => import('./pages/account/PaymentsPage'))

// Team
const TeamDashboardPage = lazy(() => import('./pages/team/TeamDashboardPage'))
const TeamEditPage = lazy(() => import('./pages/team/TeamEditPage'))
const TeamScanPage = lazy(() => import('./pages/team/TeamScanPage'))

// Admin – game management
const GamesPage = lazy(() => import('./pages/admin/GamesPage'))
const GamePage = lazy(() => import('./pages/admin/GamePage'))
const GameFormPage = lazy(() => import('./pages/admin/GameFormPage'))
const GameCardsPage = lazy(() => import('./pages/admin/GameCardsPage'))
const GameCardsPdfPage = lazy(() => import('./pages/admin/GameCardsPdfPage'))
const GameMemberFormPage = lazy(() => import('./pages/admin/GameMemberFormPage'))
const TeamFormPage = lazy(() => import('./pages/admin/TeamFormPage'))
const BulkToolsPage = lazy(() => import('./pages/admin/BulkToolsPage'))
const ModuleOverviewPage = lazy(() => import('./pages/admin/ModuleOverviewPage'))
const TeamModulePage = lazy(() => import('./pages/admin/TeamModulePage'))

// Admin – game-type pages
const BlindHikeConfigurePage = lazy(() => import('./pages/admin/BlindHikeConfigurePage'))
const GeoHunterAdminPage = lazy(() => import('./pages/admin/GeoHunterAdminPage'))
const GeoHunterSettingsPage = lazy(() => import('./pages/admin/GeoHunterSettingsPage'))
const GeoHunterPoiFormPage = lazy(() => import('./pages/admin/GeoHunterPoiFormPage'))
const ResourceRunAdminPage = lazy(() => import('./pages/admin/ResourceRunAdminPage'))
const ResourceRunNodeFormPage = lazy(() => import('./pages/admin/ResourceRunNodeFormPage'))
const TerritoryControlAdminPage = lazy(() => import('./pages/admin/TerritoryControlAdminPage'))
const TerritoryControlZoneFormPage = lazy(() => import('./pages/admin/TerritoryControlZoneFormPage'))
const EchoHuntAdminPage = lazy(() => import('./pages/admin/EchoHuntAdminPage'))
const EchoHuntBeaconFormPage = lazy(() => import('./pages/admin/EchoHuntBeaconFormPage'))
const CheckpointHeistAdminPage = lazy(() => import('./pages/admin/CheckpointHeistAdminPage'))
const CheckpointHeistCheckpointFormPage = lazy(() => import('./pages/admin/CheckpointHeistCheckpointFormPage'))
const CourierRushAdminPage = lazy(() => import('./pages/admin/CourierRushAdminPage'))
const CourierRushSettingsPage = lazy(() => import('./pages/admin/CourierRushSettingsPage'))
const CourierRushPickupFormPage = lazy(() => import('./pages/admin/CourierRushPickupFormPage'))
const CourierRushDropoffFormPage = lazy(() => import('./pages/admin/CourierRushDropoffFormPage'))
const PandemicResponseAdminPage = lazy(() => import('./pages/admin/PandemicResponseAdminPage'))
const PandemicResponseSettingsPage = lazy(() => import('./pages/admin/PandemicResponseSettingsPage'))
const MarketCrashAdminPage = lazy(() => import('./pages/admin/MarketCrashAdminPage'))
const MarketCrashResourcesPage = lazy(() => import('./pages/admin/MarketCrashResourcesPage'))
const MarketCrashResourceFormPage = lazy(() => import('./pages/admin/MarketCrashResourceFormPage'))
const MarketCrashPointFormPage = lazy(() => import('./pages/admin/MarketCrashPointFormPage'))
const BirdsOfPreyConfigurePage = lazy(() => import('./pages/admin/BirdsOfPreyConfigurePage'))
const CodeConspiracyConfigurePage = lazy(() => import('./pages/admin/CodeConspiracyConfigurePage'))
const Crazy88AdminPage = lazy(() => import('./pages/admin/Crazy88AdminPage'))
const Crazy88SettingsPage = lazy(() => import('./pages/admin/Crazy88SettingsPage'))
const Crazy88TaskFormPage = lazy(() => import('./pages/admin/Crazy88TaskFormPage'))



function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return children
}

function MonetisationRoute({ children, fallback = '/' }) {
  const [enabled, setEnabled] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function loadMonetisationStatus() {
      try {
        const status = await gameApi.getMonetisationStatus()
        if (!cancelled) setEnabled(Boolean(status?.enabled))
      } catch {
        if (!cancelled) setEnabled(true)
      }
    }
    loadMonetisationStatus()
    return () => { cancelled = true }
  }, [])

  if (enabled === null) {
    return null
  }

  if (!enabled) {
    return <Navigate to={fallback} replace />
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
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
        </div>
      }>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route
          path="/pricing"
          element={<MonetisationRoute fallback="/"><MonetisationPage /></MonetisationRoute>}
        />
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
          path="/team/crazy88/tasks/:taskId"
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
          path="/admin/games"
          element={renderProtected(<GamesPage />)}
        />
        {/* ── Account settings ─────────────────────────────────────── */}
        <Route
          path="/account"
          element={renderProtected(<AccountLayout />)}
        >
          <Route index element={<Navigate to="profile" replace />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route
            path="subscription"
            element={<MonetisationRoute fallback="/account/profile"><AccountSubscriptionPage /></MonetisationRoute>}
          />
          <Route
            path="payments"
            element={<MonetisationRoute fallback="/account/profile"><PaymentsPage /></MonetisationRoute>}
          />
        </Route>
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
          path="/admin/geohunter/:gameId/settings"
          element={renderProtectedAdminGame(<GeoHunterSettingsPage />)}
        />
        <Route
          path="/admin/geohunter/:gameId/pois/new"
          element={renderProtectedAdminGame(<GeoHunterPoiFormPage />)}
        />
        <Route
          path="/admin/geohunter/:gameId/pois/:poiId/edit"
          element={renderProtectedAdminGame(<GeoHunterPoiFormPage />)}
        />
        <Route
          path="/admin/resource-run/:gameId/nodes"
          element={renderProtectedAdminGame(<ResourceRunAdminPage />)}
        />
        <Route
          path="/admin/resource-run/:gameId/nodes/new"
          element={renderProtectedAdminGame(<ResourceRunNodeFormPage />)}
        />
        <Route
          path="/admin/resource-run/:gameId/nodes/:nodeId/edit"
          element={renderProtectedAdminGame(<ResourceRunNodeFormPage />)}
        />
        <Route
          path="/admin/territory-control/:gameId/zones"
          element={renderProtectedAdminGame(<TerritoryControlAdminPage />)}
        />
        <Route
          path="/admin/territory-control/:gameId/zones/new"
          element={renderProtectedAdminGame(<TerritoryControlZoneFormPage />)}
        />
        <Route
          path="/admin/territory-control/:gameId/zones/:zoneId/edit"
          element={renderProtectedAdminGame(<TerritoryControlZoneFormPage />)}
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
          path="/admin/echo-hunt/:gameId/beacons/new"
          element={renderProtectedAdminGame(<EchoHuntBeaconFormPage />)}
        />
        <Route
          path="/admin/echo-hunt/:gameId/beacons/:beaconId/edit"
          element={renderProtectedAdminGame(<EchoHuntBeaconFormPage />)}
        />
        <Route
          path="/admin/checkpoint-heist/:gameId/checkpoints"
          element={renderProtectedAdminGame(<CheckpointHeistAdminPage />)}
        />
        <Route
          path="/admin/checkpoint-heist/:gameId/checkpoints/new"
          element={renderProtectedAdminGame(<CheckpointHeistCheckpointFormPage />)}
        />
        <Route
          path="/admin/checkpoint-heist/:gameId/checkpoints/:checkpointId/edit"
          element={renderProtectedAdminGame(<CheckpointHeistCheckpointFormPage />)}
        />
        <Route
          path="/admin/courier-rush/:gameId/configure"
          element={renderProtectedAdminGame(<CourierRushAdminPage />)}
        />
        <Route
          path="/admin/courier-rush/:gameId/settings"
          element={renderProtectedAdminGame(<CourierRushSettingsPage />)}
        />
        <Route
          path="/admin/courier-rush/:gameId/pickups"
          element={renderProtectedAdminGame(<CourierRushAdminPage />)}
        />
        <Route
          path="/admin/courier-rush/:gameId/pickups/new"
          element={renderProtectedAdminGame(<CourierRushPickupFormPage />)}
        />
        <Route
          path="/admin/courier-rush/:gameId/pickups/:pickupId/edit"
          element={renderProtectedAdminGame(<CourierRushPickupFormPage />)}
        />
        <Route
          path="/admin/courier-rush/:gameId/dropoffs"
          element={renderProtectedAdminGame(<CourierRushAdminPage />)}
        />
        <Route
          path="/admin/courier-rush/:gameId/dropoffs/new"
          element={renderProtectedAdminGame(<CourierRushDropoffFormPage />)}
        />
        <Route
          path="/admin/courier-rush/:gameId/dropoffs/:dropoffId/edit"
          element={renderProtectedAdminGame(<CourierRushDropoffFormPage />)}
        />
        <Route
          path="/admin/pandemic-response/:gameId/hotspots"
          element={renderProtectedAdminGame(<PandemicResponseAdminPage />)}
        />
        <Route
          path="/admin/pandemic-response/:gameId/settings"
          element={renderProtectedAdminGame(<PandemicResponseSettingsPage />)}
        />
        <Route
          path="/admin/market-crash/:gameId/points"
          element={renderProtectedAdminGame(<MarketCrashAdminPage />)}
        />
        <Route
          path="/admin/market-crash/:gameId/resources"
          element={renderProtectedAdminGame(<MarketCrashResourcesPage />)}
        />
        <Route
          path="/admin/market-crash/:gameId/resources/new"
          element={renderProtectedAdminGame(<MarketCrashResourceFormPage />)}
        />
        <Route
          path="/admin/market-crash/:gameId/resources/:resourceId/edit"
          element={renderProtectedAdminGame(<MarketCrashResourceFormPage />)}
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
          path="/admin/crazy88/:gameId/settings"
          element={renderProtectedAdminGame(<Crazy88SettingsPage />)}
        />
        <Route
          path="/admin/crazy88/:gameId/tasks/new"
          element={renderProtectedAdminGame(<Crazy88TaskFormPage />)}
        />
        <Route
          path="/admin/crazy88/:gameId/tasks/:taskId/edit"
          element={renderProtectedAdminGame(<Crazy88TaskFormPage />)}
        />
        <Route
          path="/admin/games/:gameId/teams/:teamId/play"
          element={renderProtectedAdminGame(<TeamModulePage />)}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
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
