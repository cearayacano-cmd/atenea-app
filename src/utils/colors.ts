/**
 * ATENEA — Sistema de Colores Oficial LATAM
 * Paleta unificada para STATUS, PRIORIDAD y COMPLEJIDAD.
 * Todos los componentes deben importar desde aquí.
 *
 * PALETA LATAM:
 * Índigos:   #0F004F  #1B0088  #4257E8
 * Corales:   #B20F3B  #ED1650  #FC4A78
 * Turquesas: #00B5AD  #00D6CC  #54FFD6
 * Grises:    #4D4D4D  #858585  #B8B8B8
 * Verdes:    #7DA81A  #99CC33  #D4F061
 * Púrpuras:  #45057D  #7000AB  #9452FF
 * Amarillos: #FFC700  #FFE017  #FFFA4D
 */

// ─────────────────────────────────────────────
// STATUS DE EJECUCIÓN
// ─────────────────────────────────────────────
export interface StatusColorConfig {
  badge: string;       // chip badge (bg + text)
  badgeBorder: string; // borde del chip
  accent: string;      // barra lateral de la tarjeta (bg)
  cardBg: string;      // fondo de la tarjeta
  cardBorder: string;  // borde de la tarjeta
  label: string;       // texto mostrado
  hex: string;         // color hex principal
}

export const STATUS_COLORS: Record<string, StatusColorConfig> = {
  // NUEVO → Amarillo LATAM
  'nuevo': {
    badge: 'bg-[#FFE017] text-[#5C4200]',
    badgeBorder: 'border-[#FFC700]',
    accent: 'bg-[#FFE017]',
    cardBg: 'bg-white',
    cardBorder: 'border-[#FFE017]/30',
    label: 'NUEVO',
    hex: '#FFE017',
  },
  // ABIERTO → Coral LATAM (rojo medio)
  'abierto': {
    badge: 'bg-[#ED1650] text-white',
    badgeBorder: 'border-[#B20F3B]',
    accent: 'bg-[#ED1650]',
    cardBg: 'bg-white',
    cardBorder: 'border-[#ED1650]/20',
    label: 'ABIERTO',
    hex: '#ED1650',
  },
  // PENDIENTE → Turquesa LATAM (celeste)
  'pendiente': {
    badge: 'bg-[#00D6CC] text-white',
    badgeBorder: 'border-[#00B5AD]',
    accent: 'bg-[#00D6CC]',
    cardBg: 'bg-[#00D6CC]/5',
    cardBorder: 'border-[#00D6CC]/25',
    label: 'SIN ASIGNAR',
    hex: '#00D6CC',
  },
  // EN ESPERA → Negro
  'en espera': {
    badge: 'bg-[#1B1B1B] text-white',
    badgeBorder: 'border-[#000000]',
    accent: 'bg-[#1B1B1B]',
    cardBg: 'bg-slate-50/60',
    cardBorder: 'border-slate-200',
    label: 'EN ESPERA',
    hex: '#1B1B1B',
  },
  // RESUELTO → Plomo LATAM
  'resuelto': {
    badge: 'bg-[#858585] text-white',
    badgeBorder: 'border-[#4D4D4D]',
    accent: 'bg-[#858585]',
    cardBg: 'bg-[#858585]/5',
    cardBorder: 'border-[#B8B8B8]',
    label: 'RESUELTO',
    hex: '#858585',
  },
  // TERMINADA → alias de resuelto
  'terminada': {
    badge: 'bg-[#858585] text-white',
    badgeBorder: 'border-[#4D4D4D]',
    accent: 'bg-[#858585]',
    cardBg: 'bg-[#858585]/5',
    cardBorder: 'border-[#B8B8B8]',
    label: 'RESUELTO',
    hex: '#858585',
  },
  // DESPRIORIZADO → Plomo claro
  'despriorizado': {
    badge: 'bg-[#B8B8B8] text-[#4D4D4D]',
    badgeBorder: 'border-[#858585]',
    accent: 'bg-[#B8B8B8]',
    cardBg: 'bg-slate-50',
    cardBorder: 'border-slate-200',
    label: 'DESPRIORIZADO',
    hex: '#B8B8B8',
  },
  'despriorizada': {
    badge: 'bg-[#B8B8B8] text-[#4D4D4D]',
    badgeBorder: 'border-[#858585]',
    accent: 'bg-[#B8B8B8]',
    cardBg: 'bg-slate-50',
    cardBorder: 'border-slate-200',
    label: 'DESPRIORIZADO',
    hex: '#B8B8B8',
  },
  // FALLO → Coral oscuro LATAM (rojo intenso)
  'fallo': {
    badge: 'bg-[#B20F3B] text-white',
    badgeBorder: 'border-[#7A0828]',
    accent: 'bg-[#B20F3B]',
    cardBg: 'bg-[#B20F3B]/5',
    cardBorder: 'border-[#B20F3B]/20',
    label: 'FALLO',
    hex: '#B20F3B',
  },
  'fallido': {
    badge: 'bg-[#B20F3B] text-white',
    badgeBorder: 'border-[#7A0828]',
    accent: 'bg-[#B20F3B]',
    cardBg: 'bg-[#B20F3B]/5',
    cardBorder: 'border-[#B20F3B]/20',
    label: 'FALLO',
    hex: '#B20F3B',
  },
};

export const getStatusColor = (estado: string | undefined): StatusColorConfig =>
  STATUS_COLORS[estado ?? 'nuevo'] ?? STATUS_COLORS['nuevo'];

// ─────────────────────────────────────────────
// PRIORIDAD
// ─────────────────────────────────────────────
export interface PriorityColorConfig {
  badge: string;  // bg + text para el chip
  label: string;
  hex: string;
}

export const PRIORITY_COLORS: Record<number, PriorityColorConfig> = {
  10: { badge: 'bg-[#B20F3B] text-white', label: 'CRÍTICA', hex: '#B20F3B' }, // Rojo LATAM oscuro
  7:  { badge: 'bg-[#FF7A00] text-white', label: 'ALTA',    hex: '#FF7A00' }, // Naranja
  4:  { badge: 'bg-[#FFE017] text-[#5C4200]', label: 'MEDIA', hex: '#FFE017' }, // Amarillo LATAM
  2:  { badge: 'bg-[#99CC33] text-white', label: 'BAJA',    hex: '#99CC33' }, // Verde LATAM
};

export const getPriorityColor = (prioridad: number): PriorityColorConfig =>
  PRIORITY_COLORS[prioridad] ?? PRIORITY_COLORS[4];

// ─────────────────────────────────────────────
// COMPLEJIDAD (semáforo)
// ─────────────────────────────────────────────
export interface ComplexityColorConfig {
  badge: string;
  label: string;
  hex: string;
}

export const COMPLEXITY_COLORS: Record<string, ComplexityColorConfig> = {
  'alta':  { badge: 'bg-[#B20F3B] text-white',       label: 'ALTA',  hex: '#B20F3B' }, // Rojo
  'media': { badge: 'bg-[#FFE017] text-[#5C4200]',   label: 'MEDIA', hex: '#FFE017' }, // Amarillo
  'baja':  { badge: 'bg-[#99CC33] text-white',        label: 'BAJA',  hex: '#99CC33' }, // Verde
};

export const getComplexityColor = (complejidad: string | undefined): ComplexityColorConfig =>
  COMPLEXITY_COLORS[complejidad?.toLowerCase() ?? 'media'] ?? COMPLEXITY_COLORS['media'];

// ─────────────────────────────────────────────
// COLORES LATAM EXTRAS (para otros usos)
// ─────────────────────────────────────────────
export const LATAM = {
  indigo:    { dark: '#0F004F', main: '#1B0088', light: '#4257E8' },
  coral:     { dark: '#B20F3B', main: '#ED1650', light: '#FC4A78' },
  turquoise: { dark: '#00B5AD', main: '#00D6CC', light: '#54FFD6' },
  gray:      { dark: '#4D4D4D', main: '#858585', light: '#B8B8B8' },
  green:     { dark: '#7DA81A', main: '#99CC33', light: '#D4F061' },
  purple:    { dark: '#45057D', main: '#7000AB', light: '#9452FF' },
  yellow:    { dark: '#FFC700', main: '#FFE017', light: '#FFFA4D' },
};
