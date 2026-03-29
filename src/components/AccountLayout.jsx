import { NavLink, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'

import { gameApi } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'

const UserIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
  </svg>
)

const CreditCardIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25h-15a2.25 2.25 0 0 0-2.25 2.25v10.5a2.25 2.25 0 0 0 2.25 2.25Z" />
  </svg>
)

const ReceiptIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0c1.1.128 1.907 1.077 1.907 2.185ZM9.75 9h.008v.008H9.75V9Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 4.5h.008v.008h-.008V13.5Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
  </svg>
)

function sidebarLinkClass({ isActive }) {
  return [
    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
      : 'text-navy-600 hover:bg-warm-100 hover:text-navy-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200',
  ].join(' ')
}

export default function AccountLayout() {
  const { auth } = useAuth()
  const { t } = useI18n()
  const [monetisationEnabled, setMonetisationEnabled] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadMonetisationStatus() {
      try {
        const status = await gameApi.getMonetisationStatus()
        if (!cancelled) {
          setMonetisationEnabled(Boolean(status?.enabled))
        }
      } catch {
        if (!cancelled) {
          setMonetisationEnabled(false)
        }
      }
    }
    loadMonetisationStatus()
    return () => { cancelled = true }
  }, [])

  const navItems = monetisationEnabled
    ? [
        { to: '/account/profile', icon: UserIcon, label: t('account.profile') },
        { to: '/account/subscription', icon: CreditCardIcon, label: t('account.subscription') },
        { to: '/account/payments', icon: ReceiptIcon, label: t('account.payments') },
      ]
    : [{ to: '/account/profile', icon: UserIcon, label: t('account.profile') }]

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy-900 dark:text-white">
          {t('account.title')}
        </h1>
        {auth?.username && (
          <p className="mt-1 text-sm text-navy-500 dark:text-slate-400">
            {auth.username}
          </p>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <nav className="w-full md:w-56 shrink-0">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} className={sidebarLinkClass} end>
                  <item.icon />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Content area */}
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
