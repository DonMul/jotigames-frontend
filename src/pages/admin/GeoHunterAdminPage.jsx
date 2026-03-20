import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { gameApi, moduleApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

function emptyChoice() {
  return { label: '', correct: false }
}

function defaultForm() {
  return {
    id: '',
    title: '',
    type: 'text',
    latitude: '',
    longitude: '',
    radius_meters: '20',
    content: '',
    question: '',
    expected_answers: '',
    choices: [emptyChoice()],
  }
}

export default function GeoHunterAdminPage() {
  const { gameId } = useParams()
  const { auth } = useAuth()
  const { t } = useI18n()

  const [game, setGame] = useState(null)
  const [pois, setPois] = useState([])
  const [retryEnabled, setRetryEnabled] = useState(false)
  const [retryTimeoutSeconds, setRetryTimeoutSeconds] = useState('0')
  const [form, setForm] = useState(defaultForm)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isEdit = Boolean(form.id)

  const firstPoi = useMemo(() => {
    if (!Array.isArray(pois) || pois.length === 0) {
      return null
    }
    return pois[0]
  }, [pois])

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      const [gameRecord, poisPayload] = await Promise.all([
        gameApi.getGame(auth.token, gameId),
        moduleApi.getGeoHunterPois(auth.token, gameId),
      ])
      setGame(gameRecord)
      const nextPois = Array.isArray(poisPayload?.pois) ? poisPayload.pois : []
      setPois(nextPois)
      setRetryEnabled(Boolean(poisPayload?.retry_enabled))
      setRetryTimeoutSeconds(String(Number(poisPayload?.retry_timeout_seconds || 0)))
    } catch (err) {
      setError(err.message || t('moduleOverview.loadFailed', {}, 'Failed to load GeoHunter POIs'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [auth.token, gameId])

  function resetForm() {
    setForm(defaultForm())
  }

  function fillForm(poi) {
    setForm({
      id: String(poi?.id || ''),
      title: String(poi?.title || ''),
      type: String(poi?.type || 'text'),
      latitude: poi?.latitude === null || poi?.latitude === undefined ? '' : String(poi.latitude),
      longitude: poi?.longitude === null || poi?.longitude === undefined ? '' : String(poi.longitude),
      radius_meters: String(Number(poi?.radius_meters || 20)),
      content: String(poi?.content || ''),
      question: String(poi?.question || ''),
      expected_answers: Array.isArray(poi?.expected_answers) ? poi.expected_answers.join('\n') : '',
      choices: Array.isArray(poi?.choices) && poi.choices.length > 0
        ? poi.choices.map((choice) => ({
          label: String(choice?.label || ''),
          correct: Boolean(choice?.correct),
        }))
        : [emptyChoice()],
    })
  }

  async function handleSaveSettings(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    try {
      const payload = await moduleApi.updateGeoHunterRetrySettings(
        auth.token,
        gameId,
        retryEnabled,
        Number(retryTimeoutSeconds || 0),
      )
      const nextPois = Array.isArray(payload?.pois) ? payload.pois : []
      setPois(nextPois)
      setRetryEnabled(Boolean(payload?.retry_enabled))
      setRetryTimeoutSeconds(String(Number(payload?.retry_timeout_seconds || 0)))
      setSuccess(t('button.save', {}, 'Saved'))
    } catch (err) {
      setError(err.message || 'Failed to save retry settings')
    }
  }

  async function handleDeletePoi(poi) {
    if (!window.confirm(t('geohunter.admin.poi_delete_confirm', { title: poi?.title || '' }, `Delete ${poi?.title || 'POI'}?`))) {
      return
    }

    setError('')
    setSuccess('')
    try {
      await moduleApi.deleteGeoHunterPoi(auth.token, gameId, poi.id)
      await loadAll()
      if (String(form.id) === String(poi.id)) {
        resetForm()
      }
      setSuccess(t('moduleOverview.delete', {}, 'Deleted'))
    } catch (err) {
      setError(err.message || 'Failed to delete POI')
    }
  }

  async function handleSubmitPoi(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const payload = {
      title: form.title.trim(),
      type: form.type,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      radius_meters: Number(form.radius_meters || 20),
      content: form.content.trim(),
      question: form.question.trim(),
      expected_answers: form.expected_answers
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter(Boolean),
      choices: form.choices
        .map((choice) => ({ label: String(choice.label || '').trim(), correct: Boolean(choice.correct) }))
        .filter((choice) => choice.label.length > 0),
    }

    if (!Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) {
      setError('Latitude and longitude are required')
      return
    }

    try {
      if (isEdit) {
        await moduleApi.updateGeoHunterPoi(auth.token, gameId, form.id, payload)
      } else {
        await moduleApi.createGeoHunterPoi(auth.token, gameId, payload)
      }
      await loadAll()
      resetForm()
      setSuccess(t('button.save', {}, 'Saved'))
    } catch (err) {
      setError(err.message || 'Failed to save POI')
    }
  }

  function updateChoice(index, next) {
    setForm((current) => ({
      ...current,
      choices: current.choices.map((choice, choiceIndex) => (choiceIndex === index ? { ...choice, ...next } : choice)),
    }))
  }

  function addChoice() {
    setForm((current) => ({
      ...current,
      choices: [...current.choices, emptyChoice()],
    }))
  }

  function removeChoice(index) {
    setForm((current) => {
      const nextChoices = current.choices.filter((_, choiceIndex) => choiceIndex !== index)
      return {
        ...current,
        choices: nextChoices.length > 0 ? nextChoices : [emptyChoice()],
      }
    })
  }

  return (
    <main className="page-shell">
      <div className="geo-header">
        <div>
          <p className="overview-kicker">{t('geohunter.admin.kicker', {}, 'GeoHunter')}</p>
          <h1>{t('geohunter.admin.poi_heading', { game: game?.name || '' }, `POIs · ${game?.name || '-'}`)}</h1>
          <p className="overview-subtitle">{t('geohunter.admin.poi_subtitle', {}, 'Configure POIs and retry settings')}</p>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to={`/admin/games/${gameId}`}>
            {t('geohunter.admin.back', {}, 'Back')}
          </Link>
          <button className="btn btn-primary" type="button" onClick={resetForm}>
            {t('geohunter.admin.poi_add', {}, 'Add POI')}
          </button>
        </div>
      </div>

      {error ? <div className="flash flash-error">{error}</div> : null}
      {success ? <div className="flash flash-success">{success}</div> : null}
      {loading ? <p>{t('gamesPage.loading', {}, 'Loading…')}</p> : null}

      <div className="geo-layout">
        <section className="geo-panel">
          <h2>{t('geohunter.admin.retry_settings', {}, 'Answer retry settings')}</h2>
          <form onSubmit={handleSaveSettings} className="team-message">
            <label>
              <input
                type="checkbox"
                checked={retryEnabled}
                onChange={(event) => setRetryEnabled(event.target.checked)}
              />{' '}
              {t('geohunter.admin.retry_enabled', {}, 'Allow teams to retry incorrect answers')}
            </label>

            <label htmlFor="retry-timeout-seconds">{t('geohunter.admin.retry_timeout', {}, 'Retry timeout (seconds)')}</label>
            <input
              id="retry-timeout-seconds"
              type="number"
              min="0"
              max="86400"
              value={retryTimeoutSeconds}
              onChange={(event) => setRetryTimeoutSeconds(event.target.value)}
            />

            <button className="btn btn-primary btn-small" type="submit">
              {t('button.save', {}, 'Save')}
            </button>
          </form>
        </section>

        <section className="geo-panel">
          <h2>{t('common.map', {}, 'Map')}</h2>
          <div
            className="game-map"
            style={{ minHeight: 280 }}
            data-center-lat={firstPoi?.latitude ?? 52.370216}
            data-center-lon={firstPoi?.longitude ?? 4.895168}
          >
            <p className="muted" style={{ padding: '0.8rem' }}>
              {t('geohunter.admin.map_help', {}, 'Map preview uses POI coordinates.')} {firstPoi ? `${firstPoi.latitude}, ${firstPoi.longitude}` : ''}
            </p>
          </div>
        </section>

        <section className="geo-panel">
          <h2>{t('geohunter.admin.poi_list', {}, 'POI list')}</h2>
          {pois.length === 0 ? <p className="muted">{t('geohunter.admin.poi_empty', {}, 'No POIs yet')}</p> : null}
          {pois.length > 0 ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('geohunter.admin.poi_table_title', {}, 'Title')}</th>
                  <th>{t('geohunter.admin.poi_table_type', {}, 'Type')}</th>
                  <th>{t('geohunter.admin.poi_table_radius', {}, 'Radius')}</th>
                  <th className="text-right">{t('geohunter.admin.poi_table_actions', {}, 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {pois.map((poi) => (
                  <tr key={poi.id}>
                    <td>{poi.title}</td>
                    <td>{t(poi.type_label_key || '', {}, poi.type)}</td>
                    <td>{poi.radius_meters} m</td>
                    <td className="text-right table-actions-inline">
                      <button className="btn btn-edit btn-small" type="button" onClick={() => fillForm(poi)}>
                        {t('button.edit', {}, 'Edit')}
                      </button>
                      <button className="btn btn-remove btn-small" type="button" onClick={() => handleDeletePoi(poi)}>
                        {t('button.delete', {}, 'Delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </section>

        <section className="geo-panel">
          <h2>{isEdit ? t('geohunter.admin.poi_edit_heading', { title: form.title }, 'Edit POI') : t('geohunter.admin.poi_new_heading', { game: game?.name || '' }, 'New POI')}</h2>

          <form onSubmit={handleSubmitPoi}>
            <div className="form-row">
              <label htmlFor="poi-title">{t('geohunter.admin.poi_field_title', {}, 'Title')}</label>
              <input
                id="poi-title"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                required
              />
            </div>

            <div className="form-row">
              <label htmlFor="poi-type">{t('geohunter.admin.poi_field_type', {}, 'Type')}</label>
              <select
                id="poi-type"
                value={form.type}
                onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
                required
              >
                <option value="text">{t('geohunter.poi.type.text', {}, 'Text')}</option>
                <option value="multiple_choice">{t('geohunter.poi.type.multiple_choice', {}, 'Multiple choice')}</option>
                <option value="open_answer">{t('geohunter.poi.type.open_answer', {}, 'Open answer')}</option>
              </select>
            </div>

            <div className="form-row form-row-inline">
              <div>
                <label htmlFor="poi-lat">{t('geohunter.admin.poi_field_lat', {}, 'Latitude')}</label>
                <input
                  id="poi-lat"
                  type="number"
                  step="0.000001"
                  value={form.latitude}
                  onChange={(event) => setForm((current) => ({ ...current, latitude: event.target.value }))}
                  required
                />
              </div>
              <div>
                <label htmlFor="poi-lon">{t('geohunter.admin.poi_field_lon', {}, 'Longitude')}</label>
                <input
                  id="poi-lon"
                  type="number"
                  step="0.000001"
                  value={form.longitude}
                  onChange={(event) => setForm((current) => ({ ...current, longitude: event.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <label htmlFor="poi-radius">{t('geohunter.admin.poi_field_radius', {}, 'Radius')}</label>
              <input
                id="poi-radius"
                type="number"
                min="1"
                value={form.radius_meters}
                onChange={(event) => setForm((current) => ({ ...current, radius_meters: event.target.value }))}
                required
              />
            </div>

            {form.type === 'text' ? (
              <div className="form-row">
                <label htmlFor="poi-content">{t('geohunter.admin.poi_field_content', {}, 'Content')}</label>
                <textarea
                  id="poi-content"
                  rows={4}
                  value={form.content}
                  onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                />
              </div>
            ) : null}

            {form.type !== 'text' ? (
              <div className="form-row">
                <label htmlFor="poi-question">{t('geohunter.admin.poi_field_question', {}, 'Question')}</label>
                <textarea
                  id="poi-question"
                  rows={3}
                  value={form.question}
                  onChange={(event) => setForm((current) => ({ ...current, question: event.target.value }))}
                />
              </div>
            ) : null}

            {form.type === 'open_answer' ? (
              <div className="form-row">
                <label htmlFor="poi-expected">{t('geohunter.admin.poi_field_expected', {}, 'Expected answers')}</label>
                <textarea
                  id="poi-expected"
                  rows={3}
                  value={form.expected_answers}
                  onChange={(event) => setForm((current) => ({ ...current, expected_answers: event.target.value }))}
                />
              </div>
            ) : null}

            {form.type === 'multiple_choice' ? (
              <div className="form-row">
                <label>{t('geohunter.admin.poi_field_choices', {}, 'Choices')}</label>
                <div className="geo-choices">
                  {form.choices.map((choice, index) => (
                    <div className="geo-choice-row" key={`${index}-${choice.label}`}>
                      <input
                        type="text"
                        value={choice.label}
                        placeholder={t('geohunter.admin.poi_choice_label', {}, 'Choice label')}
                        onChange={(event) => updateChoice(index, { label: event.target.value })}
                        required
                      />
                      <label className="geo-choice-check">
                        <input
                          type="checkbox"
                          checked={choice.correct}
                          onChange={(event) => updateChoice(index, { correct: event.target.checked })}
                        />
                        {t('geohunter.admin.poi_choice_correct', {}, 'Correct')}
                      </label>
                      <button className="btn btn-ghost btn-small" type="button" onClick={() => removeChoice(index)}>
                        {t('button.delete', {}, 'Delete')}
                      </button>
                    </div>
                  ))}
                </div>
                <button className="btn btn-ghost btn-small" type="button" onClick={addChoice}>
                  {t('geohunter.admin.poi_choice_add', {}, 'Add choice')}
                </button>
              </div>
            ) : null}

            <div className="overview-actions" style={{ marginTop: '1rem' }}>
              <button className="btn btn-primary" type="submit">{t('button.save', {}, 'Save')}</button>
              {isEdit ? (
                <button className="btn btn-ghost" type="button" onClick={resetForm}>
                  {t('button.cancel', {}, 'Cancel')}
                </button>
              ) : null}
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}
