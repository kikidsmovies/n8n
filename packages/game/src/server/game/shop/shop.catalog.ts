export interface ShopItem {
  id: string
  type: 'weapon' | 'skin'
  name: string
  description: string
  cost: number
  isDefault?: boolean
  characterId?: string
  previewColor?: string
}

export const SHOP_CATALOG: ShopItem[] = [
  // Weapons
  {
    id: 'blaster',
    type: 'weapon',
    name: 'Blaster',
    description: 'Fast and reliable — default weapon for all players',
    cost: 0,
    isDefault: true,
    previewColor: '#00aaff',
  },
  {
    id: 'shotgun',
    type: 'weapon',
    name: 'Shotgun',
    description: '3-bullet spread, deadly at close range',
    cost: 100,
    previewColor: '#ff8800',
  },
  {
    id: 'rocket',
    type: 'weapon',
    name: 'Rocket Launcher',
    description: 'High damage with area explosion',
    cost: 200,
    previewColor: '#ff3300',
  },
  {
    id: 'frost_ray',
    type: 'weapon',
    name: 'Frost Ray',
    description: 'Rapid fire that slows enemies',
    cost: 300,
    previewColor: '#88ddff',
  },
  // Skins
  {
    id: 'skin_neon',
    type: 'skin',
    name: 'Neon Warrior',
    description: 'Glowing neon warrior skin',
    cost: 150,
    characterId: 'warrior',
    previewColor: '#00ff88',
  },
  {
    id: 'skin_shadow',
    type: 'skin',
    name: 'Shadow Mage',
    description: 'Dark mystical mage skin',
    cost: 250,
    characterId: 'mage',
    previewColor: '#8800ff',
  },
  {
    id: 'skin_gold',
    type: 'skin',
    name: 'Gold Rogue',
    description: 'Prestigious gold-plated rogue skin',
    cost: 400,
    characterId: 'rogue',
    previewColor: '#ffcc00',
  },
]

export function findShopItem(id: string): ShopItem | undefined {
  return SHOP_CATALOG.find((i) => i.id === id)
}
