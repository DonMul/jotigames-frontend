import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { moduleApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

export default function GameCardsPdfPage() {
  const { gameId } = useParams()
  const { auth } = useAuth()
  const { t } = useI18n()

  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [pdfPerRow, setPdfPerRow] = useState('3')
  const [pdfRowsPerPage, setPdfRowsPerPage] = useState('8')
  const [pdfIncludeFinalUrl, setPdfIncludeFinalUrl] = useState(false)
  const [pdfCenterLogo, setPdfCenterLogo] = useState(null)

  async function handleExportPdf(event) {
    event.preventDefault()

    setExporting(true)
    setError('')
    setSuccess('')

    try {
      const { blob, filename } = await moduleApi.exportExplodingCardsPdf(auth.token, gameId, {
        per_row: Number(pdfPerRow || 3),
        rows_per_page: Number(pdfRowsPerPage || 8),
        include_final_url: pdfIncludeFinalUrl,
        center_logo: pdfCenterLogo,
      })

      const objectUrl = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      window.URL.revokeObjectURL(objectUrl)
      setSuccess(t('gameCardsPage.exportSuccess'))
    } catch (err) {
      setError(err.message || t('gameCardsPage.exportFailed'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <main className="page-shell">
      <section className="overview-header">
        <div>
          <h1>{t('gameCardsPage.exportPageTitle')}</h1>
          <p className="overview-subtitle">{t('gameCardsPage.exportPageSubtitle')}</p>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to={`/admin/games/${gameId}/cards`}>
            {t('gameCardsPage.title')}
          </Link>
          <Link className="btn btn-ghost" to={`/admin/games/${gameId}`}>
            {t('gameCardsPage.back')}
          </Link>
        </div>
      </section>

      {error ? <div className="flash flash-error">{error}</div> : null}
      {success ? <div className="flash flash-success">{success}</div> : null}

      <form className="admin-inline-form" onSubmit={handleExportPdf}>
        <label htmlFor="pdf-per-row">{t('gameCardsPage.pdfPerRow')}</label>
        <input
          id="pdf-per-row"
          type="number"
          min="1"
          max="8"
          value={pdfPerRow}
          onChange={(event) => setPdfPerRow(event.target.value)}
        />
        <label htmlFor="pdf-rows-per-page">{t('gameCardsPage.pdfRowsPerPage')}</label>
        <input
          id="pdf-rows-per-page"
          type="number"
          min="1"
          max="20"
          value={pdfRowsPerPage}
          onChange={(event) => setPdfRowsPerPage(event.target.value)}
        />
        <label htmlFor="pdf-include-final-url">{t('gameCardsPage.pdfIncludeFinalUrl')}</label>
        <input
          id="pdf-include-final-url"
          type="checkbox"
          checked={pdfIncludeFinalUrl}
          onChange={(event) => setPdfIncludeFinalUrl(event.target.checked)}
        />
        <label htmlFor="pdf-center-logo">{t('gameCardsPage.pdfCenterLogo')}</label>
        <input
          id="pdf-center-logo"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={(event) => setPdfCenterLogo(event.target.files?.[0] || null)}
        />
        <button className="btn btn-primary btn-small" type="submit" disabled={exporting}>
          {exporting ? t('gameCardsPage.exporting') : t('gameCardsPage.exportPdf')}
        </button>
      </form>
    </main>
  )
}