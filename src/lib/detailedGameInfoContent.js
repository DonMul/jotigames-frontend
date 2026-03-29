function detailPrefixForGameType(gameType) {
  switch (gameType) {
    case 'blindhike':
      return 'blindhike.info'
    case 'checkpoint_heist':
      return 'checkpoint_heist.info'
    case 'code_conspiracy':
      return 'code_conspiracy.info'
    case 'courier_rush':
      return 'courier_rush.info'
    case 'crazy_88':
      return 'crazy88.info'
    case 'echo_hunt':
      return 'echo_hunt.info'
    case 'exploding_kittens':
      return 'exploding_kittens.info'
    case 'geohunter':
      return 'geohunter.info'
    case 'market_crash':
      return 'market_crash.info'
    case 'pandemic_response':
      return 'pandemic_response.info'
    case 'resource_run':
      return 'resource_run.info'
    case 'territory_control':
      return 'territory_control.info'
    default:
      return ''
  }
}

function buildTheme(gameType) {
  switch (gameType) {
    case 'blindhike':
      return {
        heroClass: 'from-slate-950 via-slate-900 to-indigo-950',
        heroGlowOneClass: 'bg-indigo-400/20',
        heroGlowTwoClass: 'bg-cyan-300/10',
        heroAccentClass: 'text-cyan-200',
        panelDotClass: 'bg-cyan-300',
        battleBadgeClass: 'bg-indigo-50 text-indigo-700',
        perfectBadgeClass: 'bg-indigo-100 text-indigo-700',
        perfectDotClass: 'bg-indigo-400',
        ctaPrimaryClass: 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/25',
        ctaSecondaryClass: 'border-indigo-200 hover:border-cyan-300 hover:text-indigo-600',
        howStepClass: 'bg-indigo-500 shadow-indigo-500/20',
      }
    case 'checkpoint_heist':
      return {
        heroClass: 'from-zinc-950 via-stone-900 to-amber-950',
        heroGlowOneClass: 'bg-amber-400/20',
        heroGlowTwoClass: 'bg-orange-300/10',
        heroAccentClass: 'text-amber-200',
        panelDotClass: 'bg-amber-300',
        battleBadgeClass: 'bg-amber-50 text-amber-700',
        perfectBadgeClass: 'bg-amber-100 text-amber-700',
        perfectDotClass: 'bg-amber-400',
        ctaPrimaryClass: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/25',
        ctaSecondaryClass: 'border-amber-200 hover:border-orange-300 hover:text-amber-700',
        howStepClass: 'bg-amber-500 shadow-amber-500/20',
      }
    case 'code_conspiracy':
      return {
        heroClass: 'from-slate-950 via-violet-950 to-slate-900',
        heroGlowOneClass: 'bg-violet-400/20',
        heroGlowTwoClass: 'bg-fuchsia-300/10',
        heroAccentClass: 'text-fuchsia-200',
        panelDotClass: 'bg-fuchsia-300',
        battleBadgeClass: 'bg-violet-50 text-violet-700',
        perfectBadgeClass: 'bg-violet-100 text-violet-700',
        perfectDotClass: 'bg-violet-400',
        ctaPrimaryClass: 'bg-violet-500 hover:bg-violet-600 shadow-violet-500/25',
        ctaSecondaryClass: 'border-violet-200 hover:border-fuchsia-300 hover:text-violet-700',
        howStepClass: 'bg-violet-500 shadow-violet-500/20',
      }
    case 'courier_rush':
      return {
        heroClass: 'from-slate-950 via-blue-950 to-sky-950',
        heroGlowOneClass: 'bg-sky-400/20',
        heroGlowTwoClass: 'bg-blue-300/10',
        heroAccentClass: 'text-sky-200',
        panelDotClass: 'bg-sky-300',
        battleBadgeClass: 'bg-sky-50 text-sky-700',
        perfectBadgeClass: 'bg-sky-100 text-sky-700',
        perfectDotClass: 'bg-sky-400',
        ctaPrimaryClass: 'bg-sky-500 hover:bg-sky-600 shadow-sky-500/25',
        ctaSecondaryClass: 'border-sky-200 hover:border-blue-300 hover:text-sky-700',
        howStepClass: 'bg-sky-500 shadow-sky-500/20',
      }
    case 'crazy_88':
      return {
        heroClass: 'from-pink-950 via-rose-950 to-orange-950',
        heroGlowOneClass: 'bg-pink-400/20',
        heroGlowTwoClass: 'bg-orange-300/10',
        heroAccentClass: 'text-pink-200',
        panelDotClass: 'bg-pink-300',
        battleBadgeClass: 'bg-pink-50 text-pink-700',
        perfectBadgeClass: 'bg-pink-100 text-pink-700',
        perfectDotClass: 'bg-pink-400',
        ctaPrimaryClass: 'bg-pink-500 hover:bg-pink-600 shadow-pink-500/25',
        ctaSecondaryClass: 'border-pink-200 hover:border-orange-300 hover:text-pink-700',
        howStepClass: 'bg-pink-500 shadow-pink-500/20',
      }
    case 'echo_hunt':
      return {
        heroClass: 'from-slate-950 via-emerald-950 to-teal-950',
        heroGlowOneClass: 'bg-emerald-400/20',
        heroGlowTwoClass: 'bg-teal-300/10',
        heroAccentClass: 'text-emerald-200',
        panelDotClass: 'bg-emerald-300',
        battleBadgeClass: 'bg-emerald-50 text-emerald-700',
        perfectBadgeClass: 'bg-emerald-100 text-emerald-700',
        perfectDotClass: 'bg-emerald-400',
        ctaPrimaryClass: 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/25',
        ctaSecondaryClass: 'border-emerald-200 hover:border-teal-300 hover:text-emerald-700',
        howStepClass: 'bg-emerald-500 shadow-emerald-500/20',
      }
    case 'exploding_kittens':
      return {
        heroClass: 'from-slate-950 via-red-950 to-orange-950',
        heroGlowOneClass: 'bg-red-400/20',
        heroGlowTwoClass: 'bg-yellow-300/10',
        heroAccentClass: 'text-red-200',
        panelDotClass: 'bg-red-300',
        battleBadgeClass: 'bg-red-50 text-red-700',
        perfectBadgeClass: 'bg-red-100 text-red-700',
        perfectDotClass: 'bg-red-400',
        ctaPrimaryClass: 'bg-red-500 hover:bg-red-600 shadow-red-500/25',
        ctaSecondaryClass: 'border-red-200 hover:border-yellow-300 hover:text-red-700',
        howStepClass: 'bg-red-500 shadow-red-500/20',
      }
    case 'geohunter':
      return {
        heroClass: 'from-slate-950 via-green-950 to-lime-950',
        heroGlowOneClass: 'bg-lime-400/20',
        heroGlowTwoClass: 'bg-green-300/10',
        heroAccentClass: 'text-lime-200',
        panelDotClass: 'bg-lime-300',
        battleBadgeClass: 'bg-lime-50 text-lime-700',
        perfectBadgeClass: 'bg-lime-100 text-lime-700',
        perfectDotClass: 'bg-lime-400',
        ctaPrimaryClass: 'bg-lime-500 hover:bg-lime-600 shadow-lime-500/25',
        ctaSecondaryClass: 'border-lime-200 hover:border-green-300 hover:text-lime-700',
        howStepClass: 'bg-lime-500 shadow-lime-500/20',
      }
    case 'market_crash':
      return {
        heroClass: 'from-slate-950 via-amber-950 to-yellow-950',
        heroGlowOneClass: 'bg-yellow-400/20',
        heroGlowTwoClass: 'bg-amber-300/10',
        heroAccentClass: 'text-yellow-200',
        panelDotClass: 'bg-yellow-300',
        battleBadgeClass: 'bg-yellow-50 text-yellow-700',
        perfectBadgeClass: 'bg-yellow-100 text-yellow-700',
        perfectDotClass: 'bg-yellow-400',
        ctaPrimaryClass: 'bg-yellow-500 hover:bg-yellow-600 shadow-yellow-500/25',
        ctaSecondaryClass: 'border-yellow-200 hover:border-amber-300 hover:text-yellow-700',
        howStepClass: 'bg-yellow-500 shadow-yellow-500/20',
      }
    case 'pandemic_response':
      return {
        heroClass: 'from-slate-950 via-cyan-950 to-blue-950',
        heroGlowOneClass: 'bg-cyan-400/20',
        heroGlowTwoClass: 'bg-blue-300/10',
        heroAccentClass: 'text-cyan-200',
        panelDotClass: 'bg-cyan-300',
        battleBadgeClass: 'bg-cyan-50 text-cyan-700',
        perfectBadgeClass: 'bg-cyan-100 text-cyan-700',
        perfectDotClass: 'bg-cyan-400',
        ctaPrimaryClass: 'bg-cyan-500 hover:bg-cyan-600 shadow-cyan-500/25',
        ctaSecondaryClass: 'border-cyan-200 hover:border-blue-300 hover:text-cyan-700',
        howStepClass: 'bg-cyan-500 shadow-cyan-500/20',
      }
    case 'resource_run':
      return {
        heroClass: 'from-slate-950 via-emerald-950 to-lime-950',
        heroGlowOneClass: 'bg-emerald-400/20',
        heroGlowTwoClass: 'bg-lime-300/10',
        heroAccentClass: 'text-emerald-200',
        panelDotClass: 'bg-emerald-300',
        battleBadgeClass: 'bg-emerald-50 text-emerald-700',
        perfectBadgeClass: 'bg-emerald-100 text-emerald-700',
        perfectDotClass: 'bg-emerald-400',
        ctaPrimaryClass: 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/25',
        ctaSecondaryClass: 'border-emerald-200 hover:border-lime-300 hover:text-emerald-700',
        howStepClass: 'bg-emerald-500 shadow-emerald-500/20',
      }
    case 'territory_control':
      return {
        heroClass: 'from-slate-950 via-orange-950 to-red-950',
        heroGlowOneClass: 'bg-orange-400/20',
        heroGlowTwoClass: 'bg-red-300/10',
        heroAccentClass: 'text-orange-200',
        panelDotClass: 'bg-orange-300',
        battleBadgeClass: 'bg-orange-50 text-orange-700',
        perfectBadgeClass: 'bg-orange-100 text-orange-700',
        perfectDotClass: 'bg-orange-400',
        ctaPrimaryClass: 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/25',
        ctaSecondaryClass: 'border-orange-200 hover:border-red-300 hover:text-orange-700',
        howStepClass: 'bg-orange-500 shadow-orange-500/20',
      }
    default:
      return undefined
  }
}

export function getDetailedGameInfoConfig(gameType) {
  const prefix = detailPrefixForGameType(gameType)
  if (!prefix) {
    return null
  }

  return {
    prefix,
    theme: buildTheme(gameType),
  }
}
