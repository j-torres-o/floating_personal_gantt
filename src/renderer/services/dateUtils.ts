import { TimeScale } from '../../types/config';

/**
 * Normaliza una fecha a formato ISO YYYY-MM-DD
 */
export function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parsea una fecha ISO YYYY-MM-DD en hora local
 */
export function parseDateISO(isoString: string): Date {
  const [year, month, day] = isoString.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Calcula la diferencia en días enteros entre dos fechas
 */
export function diffDays(dateA: Date, dateB: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const utcA = Date.UTC(dateA.getFullYear(), dateA.getMonth(), dateA.getDate());
  const utcB = Date.UTC(dateB.getFullYear(), dateB.getMonth(), dateB.getDate());
  return Math.round((utcB - utcA) / msPerDay);
}

/**
 * Añade N días a una fecha dada
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Retorna si una fecha es sábado o domingo
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Domingo, 6 = Sábado
}

/**
 * Formatea una fecha para mostrar en cabecera de columna según la escala
 */
export function formatColumnHeader(date: Date, scale: TimeScale): { primary: string; secondary: string } {
  const daysShort = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const monthsShort = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  if (scale === 'days') {
    return {
      primary: `${date.getDate()} ${monthsShort[date.getMonth()]}`,
      secondary: daysShort[date.getDay()]
    };
  }

  if (scale === 'weeks') {
    const weekNum = getWeekNumber(date);
    return {
      primary: `Sem ${weekNum}`,
      secondary: `${date.getDate()} ${monthsShort[date.getMonth()]}`
    };
  }

  // scale === 'months'
  return {
    primary: `${monthsShort[date.getMonth()]} ${date.getFullYear()}`,
    secondary: `M${date.getMonth() + 1}`
  };
}

/**
 * Obtiene el número de semana ISO de una fecha
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Genera el arreglo de fechas a mostrar en el eje horizontal según el rango y la escala
 */
export function generateTimelineColumns(startDate: Date, totalDays: number, scale: TimeScale): Date[] {
  const columns: Date[] = [];
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  if (scale === 'days') {
    for (let i = 0; i < totalDays; i++) {
      columns.push(addDays(start, i));
    }
  } else if (scale === 'weeks') {
    // Alinear al inicio de la semana (lunes)
    const dayOfWeek = start.getDay();
    const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(start.setDate(diff));
    const totalWeeks = Math.ceil(totalDays / 7) + 2;
    for (let i = 0; i < totalWeeks; i++) {
      columns.push(addDays(monday, i * 7));
    }
  } else {
    // scale === 'months'
    const current = new Date(start.getFullYear(), start.getMonth(), 1);
    const totalMonths = Math.ceil(totalDays / 30) + 3;
    for (let i = 0; i < totalMonths; i++) {
      columns.push(new Date(current.getFullYear(), current.getMonth() + i, 1));
    }
  }

  return columns;
}
