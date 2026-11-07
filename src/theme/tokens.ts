import type { CreatureType, Rarity } from '@/types';

/** Paleta base. Fondo casi negro cálido, sin morados. */
export const colors = {
  bg: '#0A0A0C',
  surface: '#141418',
  surfaceRaised: '#1C1C22',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.16)',
  text: '#F5F3F0',
  muted: '#9E9CA6',
  lime: '#C6FF3D',
  limeDim: 'rgba(198,255,61,0.14)',
  onLime: '#0A0A0C',
  blue: '#2F6BFF',
  blueDim: 'rgba(47,107,255,0.16)',
  danger: '#FF5A4F',
  dangerDim: 'rgba(255,90,79,0.14)',
  scrim: 'rgba(10,10,12,0.72)',
} as const;

export const rarityColors: Record<Rarity, { solid: string; gradient: [string, string]; glow: string }> = {
  Común: { solid: '#9AA0A6', gradient: ['#9AA0A6', '#6F757B'], glow: 'rgba(154,160,166,0.28)' },
  Rara: { solid: '#2F6BFF', gradient: ['#4C82FF', '#2F6BFF'], glow: 'rgba(47,107,255,0.38)' },
  Épica: { solid: '#FFB020', gradient: ['#FFC452', '#FFB020'], glow: 'rgba(255,176,32,0.38)' },
  Legendaria: { solid: '#FF5A1F', gradient: ['#FF5A1F', '#E5383B'], glow: 'rgba(255,90,31,0.45)' },
};

export const RARITIES: Rarity[] = ['Común', 'Rara', 'Épica', 'Legendaria'];
export const TYPES: CreatureType[] = ['Fuego', 'Agua', 'Tierra', 'Aire', 'Metal', 'Tecno', 'Naturaleza'];

export const typeColors: Record<CreatureType, string> = {
  Fuego: '#FF6B3D',
  Agua: '#3DB8FF',
  Tierra: '#C99A5B',
  Aire: '#BFEFFF',
  Metal: '#B8C2CC',
  Tecno: '#3DFFD8',
  Naturaleza: '#7BE05F',
};

/** Espaciado en múltiplos de 8 (con medio paso 4 para ajustes finos). */
export const space = { xxs: 4, xs: 8, sm: 16, md: 24, lg: 32, xl: 40, xxl: 48, xxxl: 64 } as const;
export const radii = { sm: 12, md: 20, lg: 28, pill: 999 } as const;
export const sizes = { button: 52, touch: 44, tabBar: 68 } as const;

export const fonts = {
  display: 'BricolageGrotesque_800ExtraBold',
  title: 'BricolageGrotesque_700Bold',
  heading: 'BricolageGrotesque_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
  mono: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
} as const;

export const springs = {
  snappy: { damping: 18, stiffness: 260, mass: 0.8 },
  soft: { damping: 20, stiffness: 140 },
  bouncy: { damping: 11, stiffness: 180 },
} as const;
