import { useEffect, useMemo, useState } from 'react'

import { gameApi } from '../../lib/api'
import { toAssetUrl } from '../../lib/assetUrl'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

export default function TeamLogoPicker({ value, onChange, disabled = false }) {
  const { auth } = useAuth()
  const { t } = useI18n()

  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [categories, setCategories] = useState([])
  const [options, setOptions] = useState([])
  const [activeCategory, setActiveCategory] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadLogoOptions() {
      setLoading(true)
      setLoadError('')

      try {
        const payload = await gameApi.getTeamLogoOptions(auth.token)
        if (cancelled) {
          return
        }

        const nextCategories = Array.isArray(payload?.categories) ? payload.categories : []
        const nextOptions = Array.isArray(payload?.options) ? payload.options : []

        setCategories(nextCategories)
        setOptions(nextOptions)

        const selectedOption = nextOptions.find((option) => String(option?.value || '') === String(value || ''))
        if (selectedOption?.category) {
          setActiveCategory(String(selectedOption.category))
        } else if (nextCategories.length > 0) {
          setActiveCategory(String(nextCategories[0].key || ''))
        } else {
          setActiveCategory('')
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err.message || t('teamForm.logoLoadFailed'))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    if (auth?.token) {
      loadLogoOptions()
    }

    return () => {
      cancelled = true
    }
  }, [auth?.token, t, value])

  const selectedOption = useMemo(
    () => options.find((option) => String(option?.value || '') === String(value || '')) || null,
    [options, value],
  )

  const visibleOptions = useMemo(() => {
    if (!activeCategory) {
      return options
    }
    return options.filter((option) => String(option?.category || '') === activeCategory)
  }, [activeCategory, options])

  const groupedCategories = useMemo(() => {
    const teamLogoCategories = categories.filter((category) => String(category?.key || '').startsWith('lib_'))
    const explodingKittensCategories = categories.filter((category) => String(category?.key || '').startsWith('ek_'))
    return {
      teamLogoCategories,
      explodingKittensCategories,
    }
  }, [categories])

  const selectedLabel = selectedOption?.label || t('teamForm.logoNone')
  const selectedUrl = toAssetUrl(selectedOption?.value || value || '')

  function selectLogo(nextValue) {
    onChange(nextValue)
    setIsOpen(false)
  }

  return (
    <div className="team-logo-field">
      <label>{t('teamForm.logo')}</label>

      <div className="team-logo-current" data-logo-current>
        <img
          className={`team-logo-current-image${selectedUrl ? '' : ' is-hidden'}`}
          src={selectedUrl || undefined}
          alt={selectedLabel}
          data-logo-current-image
        />
        <span className="team-logo-current-text" data-logo-current-text>
          {selectedLabel}
        </span>
        <button
          type="button"
          className="btn btn-ghost btn-small"
          onClick={() => setIsOpen(true)}
          disabled={disabled}
        >
          {t('teamForm.pickLogo')}
        </button>
      </div>

      {loadError ? <div className="flash flash-error" style={{ marginTop: '0.7rem' }}>{loadError}</div> : null}

      <div className={`modal team-logo-modal${isOpen ? ' is-open' : ''}`} aria-hidden={isOpen ? 'false' : 'true'} role="dialog" aria-modal="true">
        <div className="modal-backdrop" onClick={() => setIsOpen(false)} />
        <div className="modal-card modal-card-wide team-logo-modal-card">
          <div className="team-logo-modal-header">
            <h2>{t('teamForm.logo')}</h2>
          </div>

          <div className="team-logo-toolbar">
            <select
              className="team-logo-category-select"
              value={activeCategory}
              onChange={(event) => setActiveCategory(event.target.value)}
              aria-label={t('teamForm.logoCategory')}
            >
              {groupedCategories.teamLogoCategories.length > 0 ? (
                <optgroup label={t('teamForm.logoGroupTeamLogos')}>
                  {groupedCategories.teamLogoCategories.map((category) => (
                    <option key={category.key} value={category.key}>
                      {category.label}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {groupedCategories.explodingKittensCategories.length > 0 ? (
                <optgroup label={t('teamForm.logoGroupExplodingKittens')}>
                  {groupedCategories.explodingKittensCategories.map((category) => (
                    <option key={category.key} value={category.key}>
                      {category.label}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
            <button
              type="button"
              className="team-logo-clear"
              onClick={() => {
                onChange('')
                setIsOpen(false)
              }}
            >
              {t('teamForm.logoNone')}
            </button>
          </div>

          {loading ? <p>{t('gamesPage.loading')}</p> : null}
          {!loading && visibleOptions.length === 0 ? <p>{t('teamForm.noLogos')}</p> : null}

          {!loading ? (
            <div className="team-logo-grid">
              {visibleOptions.map((option) => {
                const optionValue = String(option?.value || '')
                const optionLabel = String(option?.label || '')
                const optionUrl = toAssetUrl(optionValue)
                const isSelected = optionValue === String(value || '')

                return (
                  <div
                    key={`${option.category}:${optionValue}`}
                    className={`team-logo-option${isSelected ? ' is-selected' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => selectLogo(optionValue)}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' && event.key !== ' ') {
                        return
                      }
                      event.preventDefault()
                      selectLogo(optionValue)
                    }}
                  >
                    <img className="team-logo-option-image" alt={optionLabel} src={optionUrl} loading="lazy" decoding="async" />
                    <span className="team-logo-option-label">{optionLabel}</span>
                  </div>
                )
              })}
            </div>
          ) : null}

          <div className="modal-actions">
            <button className="btn btn-ghost" type="button" onClick={() => setIsOpen(false)}>
              {t('teamForm.closePicker')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
