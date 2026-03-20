import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { gameApi, moduleApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

function defaultForm() {
  return {
    code_length: '6',
    character_set: 'alphanumeric',
    submission_cooldown_seconds: '0',
    correct_points: '10',
    penalty_enabled: false,
    penalty_value: '0',
    first_bonus_enabled: false,
    first_bonus_points: '0',
    win_condition_mode: 'first_to_complete',
  }
}

export default function CodeConspiracyConfigurePage() {
  const { gameId } = useParams()
  const { auth } = useAuth()
  const { t } = useI18n()

  const [game, setGame] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      const [gameRecord, configPayload] = await Promise.all([
        gameApi.getGame(auth.token, gameId),
        moduleApi.getCodeConspiracyConfig(auth.token, gameId),
      ])

      const config = configPayload?.config || {}
      setGame(gameRecord)
      setForm({
        code_length: String(Number(config?.code_length || 6)),
        character_set: String(config?.character_set || 'alphanumeric'),
        submission_cooldown_seconds: String(Number(config?.submission_cooldown_seconds || 0)),
        correct_points: String(Number(config?.correct_points || 10)),
        penalty_enabled: Boolean(config?.penalty_enabled),
        penalty_value: String(Number(config?.penalty_value || 0)),
        first_bonus_enabled: Boolean(config?.first_bonus_enabled),
        first_bonus_points: String(Number(config?.first_bonus_points || 0)),
        win_condition_mode: String(config?.win_condition_mode || 'first_to_complete'),
      })
    } catch (err) {
      setError(err.message || 'Failed to load Code Conspiracy settings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [auth.token, gameId])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const payload = {
      code_length: Number(form.code_length || 6),
      character_set: form.character_set,
      submission_cooldown_seconds: Number(form.submission_cooldown_seconds || 0),
      correct_points: Number(form.correct_points || 10),
      penalty_enabled: Boolean(form.penalty_enabled),
      penalty_value: Number(form.penalty_value || 0),
      first_bonus_enabled: Boolean(form.first_bonus_enabled),
      first_bonus_points: Number(form.first_bonus_points || 0),
      win_condition_mode: form.win_condition_mode,
    }

    try {
      await moduleApi.updateCodeConspiracyConfig(auth.token, gameId, payload)
      await loadAll()
      setSuccess(t('button.save', {}, 'Saved'))
    } catch (err) {
      setError(err.message || 'Failed to save settings')
    }
  }

  async function handleEndGame() {
    if (!window.confirm(t('code_conspiracy.admin.end_confirm', {}, 'End this game now?'))) {
      return
    }

    setError('')
    setSuccess('')
    try {
      await moduleApi.endCodeConspiracyGame(auth.token, gameId)
      await loadAll()
      setSuccess(t('code_conspiracy.admin.game_ended', {}, 'Game ended'))
    } catch (err) {
      setError(err.message || 'Failed to end game')
    }
  }

  return (
    <main className="page-shell">
      <section className="overview-header">
        <div>
          <p className="overview-kicker">{t('game.type.code_conspiracy', {}, 'Code Conspiracy')}</p>
          <h1>{game?.name || '-'}</h1>
          <p className="overview-subtitle">{t('code_conspiracy.admin.config', {}, 'Configuration')}</p>
        </div>
        <div className="overview-actions">
            <Link className="btn btn-ghost" to={`/admin/games/${gameId}`}>
            {t('games.show.back', {}, 'Back')}
          </Link>
          <button className="btn btn-remove" type="button" onClick={handleEndGame}>
            {t('code_conspiracy.admin.end_game', {}, 'End game')}
          </button>
        </div>
      </section>

      {error ? <div className="flash flash-error">{error}</div> : null}
      {success ? <div className="flash flash-success">{success}</div> : null}
      {loading ? <p>{t('gamesPage.loading', {}, 'Loading…')}</p> : null}

      <section className="admin-block">
        <form onSubmit={handleSubmit} className="stack">
          <div className="form-row">
            <label htmlFor="cc-code-length">{t('code_conspiracy.admin.code_length', {}, 'Code length')}</label>
            <input
              id="cc-code-length"
              type="number"
              min="4"
              max="10"
              value={form.code_length}
              onChange={(event) => setForm((current) => ({ ...current, code_length: event.target.value }))}
              required
            />
          </div>

          <div className="form-row">
            <label htmlFor="cc-character-set">{t('code_conspiracy.admin.character_set', {}, 'Character set')}</label>
            <select
              id="cc-character-set"
              value={form.character_set}
              onChange={(event) => setForm((current) => ({ ...current, character_set: event.target.value }))}
            >
              <option value="alphanumeric">{t('code_conspiracy.admin.character_set_alphanumeric', {}, 'Alphanumeric')}</option>
              <option value="letters">{t('code_conspiracy.admin.character_set_letters', {}, 'Letters')}</option>
              <option value="numbers">{t('code_conspiracy.admin.character_set_numbers', {}, 'Numbers')}</option>
            </select>
          </div>

          <div className="form-row">
            <label htmlFor="cc-cooldown">{t('code_conspiracy.admin.cooldown_seconds', {}, 'Cooldown seconds')}</label>
            <input
              id="cc-cooldown"
              type="number"
              min="0"
              max="300"
              value={form.submission_cooldown_seconds}
              onChange={(event) => setForm((current) => ({ ...current, submission_cooldown_seconds: event.target.value }))}
              required
            />
          </div>

          <div className="form-row">
            <label htmlFor="cc-correct-points">{t('code_conspiracy.admin.correct_points', {}, 'Correct points')}</label>
            <input
              id="cc-correct-points"
              type="number"
              min="1"
              max="1000"
              value={form.correct_points}
              onChange={(event) => setForm((current) => ({ ...current, correct_points: event.target.value }))}
              required
            />
          </div>

          <div className="form-row">
            <label>
              <input
                type="checkbox"
                checked={form.penalty_enabled}
                onChange={(event) => setForm((current) => ({ ...current, penalty_enabled: event.target.checked }))}
              />{' '}
              {t('code_conspiracy.admin.penalty_enabled', {}, 'Enable penalty')}
            </label>
          </div>

          <div className="form-row">
            <label htmlFor="cc-penalty-value">{t('code_conspiracy.admin.penalty_value', {}, 'Penalty value')}</label>
            <input
              id="cc-penalty-value"
              type="number"
              min="0"
              max="1000"
              value={form.penalty_value}
              onChange={(event) => setForm((current) => ({ ...current, penalty_value: event.target.value }))}
              required
            />
          </div>

          <div className="form-row">
            <label>
              <input
                type="checkbox"
                checked={form.first_bonus_enabled}
                onChange={(event) => setForm((current) => ({ ...current, first_bonus_enabled: event.target.checked }))}
              />{' '}
              {t('code_conspiracy.admin.first_bonus_enabled', {}, 'Enable first correct bonus')}
            </label>
          </div>

          <div className="form-row">
            <label htmlFor="cc-first-bonus-points">{t('code_conspiracy.admin.first_bonus_points', {}, 'First bonus points')}</label>
            <input
              id="cc-first-bonus-points"
              type="number"
              min="0"
              max="1000"
              value={form.first_bonus_points}
              onChange={(event) => setForm((current) => ({ ...current, first_bonus_points: event.target.value }))}
              required
            />
          </div>

          <div className="form-row">
            <label htmlFor="cc-win-condition">{t('code_conspiracy.admin.win_condition', {}, 'Win condition')}</label>
            <select
              id="cc-win-condition"
              value={form.win_condition_mode}
              onChange={(event) => setForm((current) => ({ ...current, win_condition_mode: event.target.value }))}
            >
              <option value="first_to_complete">{t('code_conspiracy.admin.win_condition_first', {}, 'First to complete')}</option>
              <option value="highest_score_time_limit">{t('code_conspiracy.admin.win_condition_score', {}, 'Highest score at time limit')}</option>
            </select>
          </div>

          <button className="btn btn-primary" type="submit">{t('button.save', {}, 'Save')}</button>
        </form>
      </section>
    </main>
  )
}
