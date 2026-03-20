export const GAME_CATALOG = [
  {
    slug: 'exploding-kittens',
    type: 'exploding_kittens',
    name: 'Exploding Kittens',
    logo: '/image/games/Exploding Kittens.avif',
    shortDescription: 'A tense, strategic card battle with instant twists and risky scans.',
    subtitle: 'Defuse danger, outsmart rivals, and survive the deck.',
  },
  {
    slug: 'geohunter',
    type: 'geohunter',
    name: 'GeoHunter',
    logo: '/image/games/GeoHunter.avif',
    shortDescription: 'Explore map locations and solve place-based challenges.',
    subtitle: 'Navigation and knowledge combine for smart field play.',
  },
  {
    slug: 'blind-hike',
    type: 'blindhike',
    name: 'Blind Hike',
    logo: '/image/games/Blind Hike.avif',
    shortDescription: 'Follow clues with limited information and make tactical route choices.',
    subtitle: 'Communication and trust matter as much as speed.',
  },
  {
    slug: 'resource-run',
    type: 'resource_run',
    name: 'Resource Run',
    logo: '/image/games/Resource Run.avif',
    shortDescription: 'Capture strategic resources and optimize team movement.',
    subtitle: 'Collect, protect, and race to the top of the board.',
  },
  {
    slug: 'territory-control',
    type: 'territory_control',
    name: 'Territory Control',
    logo: '/image/games/Territory Control.avif',
    shortDescription: 'Claim zones and defend map control under pressure.',
    subtitle: 'Map awareness and timing decide the winners.',
  },
  {
    slug: 'market-crash',
    type: 'market_crash',
    name: 'Market Crash',
    logo: '/image/games/Market Crash.avif',
    shortDescription: 'Trade smartly while values shift and opportunities disappear fast.',
    subtitle: 'Risk management and bold calls power your score.',
  },
  {
    slug: 'crazy-88',
    type: 'crazy_88',
    name: 'Crazy 88',
    logo: '/image/games/Crazy 88.avif',
    shortDescription: 'Creative task-based gameplay with fast submissions and reviews.',
    subtitle: 'Energy, creativity, and teamwork in one challenge loop.',
  },
  {
    slug: 'courier-rush',
    type: 'courier_rush',
    name: 'Courier Rush',
    logo: '/image/games/Courrier Rush.avif',
    shortDescription: 'Coordinate pickups and dropoffs in a dynamic delivery race.',
    subtitle: 'Plan routes, avoid delays, and keep points flowing.',
  },
  {
    slug: 'echo-hunt',
    type: 'echo_hunt',
    name: 'Echo Hunt',
    logo: '/image/games/Echo Hunt.avif',
    shortDescription: 'Find and claim hidden beacons in a tactical scavenger setup.',
    subtitle: 'Observation and timing are your strongest tools.',
  },
  {
    slug: 'checkpoint-heist',
    type: 'checkpoint_heist',
    name: 'Checkpoint Heist',
    logo: '/image/games/Checkpoint Heist.avif',
    shortDescription: 'Capture high-value checkpoints while opponents contest territory.',
    subtitle: 'Offense and defense must stay perfectly balanced.',
  },
  {
    slug: 'pandemic-response',
    type: 'pandemic_response',
    name: 'Pandemic Response',
    logo: '/image/games/Pandemic Response.avif',
    shortDescription: 'Coordinate hotspot response and supply pickups under time pressure.',
    subtitle: 'Team coordination keeps your operations effective.',
  },
  {
    slug: 'birds-of-prey',
    type: 'birds_of_prey',
    name: 'Birds of Prey',
    logo: '/image/games/Birds of Prey.avif',
    shortDescription: 'Compete over eggs and territory in a high-action map game.',
    subtitle: 'Aggression, defense, and timing shape every round.',
  },
  {
    slug: 'code-conspiracy',
    type: 'code_conspiracy',
    name: 'Code Conspiracy',
    logo: '/image/games/Code Conspiracy.avif',
    shortDescription: 'Solve cryptic puzzles and submit codes before rival teams do.',
    subtitle: 'Logic and collaboration unlock decisive points.',
  },
]

export const GAME_BY_SLUG = GAME_CATALOG.reduce((acc, game) => {
  acc[game.slug] = game
  return acc
}, {})

export const GAME_BY_TYPE = GAME_CATALOG.reduce((acc, game) => {
  acc[game.type] = game
  return acc
}, {})
