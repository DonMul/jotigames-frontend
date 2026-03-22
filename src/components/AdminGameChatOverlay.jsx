import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'

import { gameApi } from '../lib/api'
import { toAssetUrl } from '../lib/assetUrl'
import { useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'

const MAX_MESSAGE_LENGTH = 512

function formatTime(value) {
  if (!value) {
    return ''
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }

  return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function messageKey(message) {
  const id = String(message?.id || '').trim()
  if (id) {
    return id
  }

  return `${String(message?.sent_at || '')}:${String(message?.author_session_id || '')}:${String(message?.message || '')}`
}

export default function AdminGameChatOverlay() {
  const { gameId } = useParams()
  const { auth } = useAuth()
  const { t } = useI18n()

  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [messageInput, setMessageInput] = useState('')
  const [error, setError] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)

  const knownMessageKeysRef = useRef(new Set())
  const listRef = useRef(null)

  const canChat = Boolean(auth?.token && gameId)
  const ownSessionId = useMemo(() => `api:${auth?.principalType}:${auth?.principalId}`, [auth?.principalId, auth?.principalType])

  useEffect(() => {
    setIsOpen(false)
    setMessages([])
    setMessageInput('')
    setError('')
    setUnreadCount(0)
    knownMessageKeysRef.current = new Set()
  }, [gameId])

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !(listRef.current instanceof HTMLElement)) {
      return
    }

    listRef.current.scrollTop = listRef.current.scrollHeight
  }, [isOpen, messages])

  useEffect(() => {
    if (!canChat) {
      return
    }

    let cancelled = false

    async function loadMessagesOnce() {
      try {
        const nextMessages = await gameApi.getChat(auth.token, gameId)
        if (cancelled) {
          return
        }

        const nextMessageArray = Array.isArray(nextMessages) ? nextMessages : []
        const incomingKnown = knownMessageKeysRef.current
        const nextKnown = new Set()
        let unreadIncrement = 0

        for (const message of nextMessageArray) {
          const key = messageKey(message)
          nextKnown.add(key)

          if (incomingKnown.has(key)) {
            continue
          }

          if (String(message?.author_session_id || '') !== ownSessionId && !isOpen) {
            unreadIncrement += 1
          }
        }

        knownMessageKeysRef.current = nextKnown
        setMessages(nextMessageArray)
        if (unreadIncrement > 0) {
          setUnreadCount((current) => current + unreadIncrement)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || t('gamePage.loadFailed'))
        }
      }
    }

    loadMessagesOnce()

    return () => {
      cancelled = true
    }
  }, [auth.token, canChat, gameId, isOpen, ownSessionId, t])

  useEffect(() => {
    if (!canChat || typeof window === 'undefined' || !window.JotiWs || typeof window.JotiWs.connect !== 'function') {
      return
    }

    const ws = window.JotiWs.connect({ reconnectMs: 3000 })
    const channel = `channel:${gameId}:admin`

    const subscribe = () => {
      ws.send('core.subscribe', {
        gameId,
        authToken: auth.token,
        channel,
      })
    }

    ws.onOpen(() => {
      subscribe()
    })

    return () => {
      ws.close()
    }
  }, [auth.token, canChat, gameId])

  async function submitMessage(event) {
    event.preventDefault()

    const trimmed = messageInput.trim()
    if (!trimmed || !canChat) {
      return
    }

    try {
      await gameApi.sendChat(auth.token, gameId, trimmed)
      const nextMessages = await gameApi.getChat(auth.token, gameId)
      const nextMessageArray = Array.isArray(nextMessages) ? nextMessages : []
      const nextKnown = new Set(nextMessageArray.map((message) => messageKey(message)))
      knownMessageKeysRef.current = nextKnown
      setMessages(nextMessageArray)
      setMessageInput('')
      setError('')
    } catch (err) {
      setError(err.message || t('gamePage.sendFailed'))
    }
  }

  if (!canChat) {
    return null
  }

  return (
    <div className="game-chat-root">
      <button
        type="button"
        className="btn btn-primary game-chat-launcher"
        aria-expanded={isOpen ? 'true' : 'false'}
        aria-label={isOpen ? t('gamePage.closeChat') : t('gamePage.chat')}
        onClick={() => setIsOpen((current) => !current)}
      >
        {t('gamePage.chat')}
        {unreadCount > 0 ? <span className="game-chat-unread">{unreadCount > 99 ? '99+' : String(unreadCount)}</span> : null}
      </button>

      <aside className={`game-chat-panel${isOpen ? ' is-open' : ''}`} aria-hidden={isOpen ? 'false' : 'true'}>
        <div className="game-chat-head">
          <h2>{t('gamePage.chat')}</h2>
          <button type="button" className="btn btn-ghost btn-small" onClick={() => setIsOpen(false)}>
            {t('gamePage.closeChat')}
          </button>
        </div>

        {error ? <div className="flash flash-error">{error}</div> : null}

        <ul className="game-chat-list" ref={listRef}>
          {messages.map((message) => {
            const authorRole = String(message.author_role || '')
            const isAdmin = authorRole === 'admin'
            const isSelf = String(message.author_session_id || '') === ownSessionId
            const authorLabel = String(message.author_label || '').trim() || t('gamePage.unknownAuthor')
            const avatarUrl = toAssetUrl(message.author_logo_path)

            return (
              <li
                key={messageKey(message)}
                className={`game-chat-message ${isSelf ? 'is-self' : 'is-other'}${isAdmin ? ' is-admin' : ''}`}
              >
                {!isSelf ? (
                  <div className="game-chat-avatar">
                    {avatarUrl ? <img src={avatarUrl} alt={authorLabel} /> : authorLabel.charAt(0).toUpperCase()}
                  </div>
                ) : null}

                <div className="game-chat-bubble-wrap">
                  <div className="game-chat-name-row">
                    <p className="game-chat-name">{authorLabel}</p>
                    {isAdmin ? <span className="game-chat-admin-badge">{t('gamePage.adminLabel')}</span> : null}
                  </div>
                  <div className="game-chat-bubble">{String(message.message || '')}</div>
                  <p className="game-chat-meta">{formatTime(message.sent_at)}</p>
                </div>

                {isSelf ? (
                  <div className="game-chat-avatar">
                    {avatarUrl ? <img src={avatarUrl} alt={authorLabel} /> : authorLabel.charAt(0).toUpperCase()}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>

        <form onSubmit={submitMessage} className="game-chat-composer">
          <textarea
            value={messageInput}
            onChange={(event) => setMessageInput(event.target.value)}
            rows={2}
            placeholder={t('gamePage.messagePlaceholder')}
            maxLength={MAX_MESSAGE_LENGTH}
          />
          <button className="btn btn-primary btn-small" type="submit">
            {t('gamePage.send')}
          </button>
        </form>
      </aside>
    </div>
  )
}