import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import GeoLocationPicker from '../../components/GeoLocationPicker'
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

export default function GeoHunterPoiFormPage() {
  const { gameId, poiId } = useParams()
  const navigate = useNavigate()
  const { auth } = useAuth()
  const { t } = useI18n()

  const [game, setGame] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isEdit = Boolean(poiId)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const [gameRecord, poisPayload] = await Promise.all([
          gameApi.getGame(auth.token, gameId),
          moduleApi.getGeoHunterPois(auth.token, gameId),
        ])
        if (cancelled) return
        setGame(gameRecord)

        if (isEdit) {
          const pois = Array.isArray(poisPayload?.pois) ? poisPayload.pois : []
          const poi = pois.find((p) => String(p.id) === String(poiId))
          if (!poi) {
            throw new Error(t('geohunter.admin.poi_not_found', {}, 'POI not found'))
          }
          setForm({
            id: String(poi.id || ''),
            title: String(poi.title || ''),
            type: String(poi.type || 'text'),
            latitude: poi.latitude === null || poi.latitude === undefined ? '' : String(poi.latitude),
            longitude: poi.longitude === null || poi.longitude === undefined ? '' : String(poi.longitude),
            radius_meters: String(Number(poi.radius_meters || 20)),
            content: String(poi.content || ''),
            question: String(poi.question || ''),
            expected_answers: Array.isArray(poi.expected_answers) ? poi.expected_answers.join('\n') : '',
            choices: Array.isArray(poi.choices) && poi.choices.length > 0
              ? poi.choices.map((choice) => ({
                label: String(choice?.label || ''),
                correct: Boolean(choice?.correct),
              }))
              : [emptyChoice()],
          })
        }
      } catch (err) {
        if (!cancelled) setError(err.message || t('geohunter.admin.load_failed', {}, 'Failed to load data'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [auth.token, gameId, poiId, isEdit, t])

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

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

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
      setError(t('geohunter.admin.lat_lon_required', {}, 'Latitude and longitude are required'))
      return
    }

    setSaving(true)
    try {
      if (isEdit) {
        await moduleApi.updateGeoHunterPoi(auth.token, gameId, poiId, payload)
      } else {
        await moduleApi.createGeoHunterPoi(auth.token, gameId, payload)
      }
      navigate(`/admin/geohunter/${gameId}/pois`, {
        state: { flashSuccess: t('geohunter.admin.poi_saved', {}, 'POI saved') },
      })
    } catch (err) {
      setError(err.message || t('geohunter.admin.poi_save_failed', {}, 'Failed to save POI'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="page-shell">
      <div className="geo-header">
        <div>
          <p className="overview-kicker">{t('geohunter.admin.kicker', {}, 'GeoHunter')}</p>
          <h1>{isEdit ? t('geohunter.admin.poi_edit_heading', { title: form.title }, 'Edit POI') : t('geohunter.admin.poi_new_heading', { game: game?.name || '' }, 'New POI')}</h1>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to={`/admin/geohunter/${gameId}/pois`}>
            {t('geohunter.admin.back', {}, 'Back')}
          </Link>
        </div>
      </div>

      {error ? <div className="flash flash-error">{error}</div> : null}
      {loading ? <p>{t('gamesPage.loading', {}, 'Loading…')}</p> : null}

      {!loading ? (
        <section className="admin-block">
          <form onSubmit={handleSubmit}>
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
              <GeoLocationPicker
                latitude={form.latitude}
                longitude={form.longitude}
                onChange={(nextLat, nextLon) => setForm((current) => ({ ...current, latitude: nextLat, longitude: nextLon }))}
                ariaLabel={t('geohunter.admin.poi_field_title', {}, 'POI location')}
              />
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
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? t('gamesPage.loading', {}, 'Saving…') : t('button.save', {}, 'Save')}
              </button>
              <Link className="btn btn-ghost" to={`/admin/geohunter/${gameId}/pois`}>
                {t('button.cancel', {}, 'Cancel')}
              </Link>
            </div>
          </form>
        </section>
      ) : null}
    </main>
  )
}
