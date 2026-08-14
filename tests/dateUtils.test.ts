import { describe, it, expect } from 'vitest';
import {
  formatDateISO,
  parseDateISO,
  diffDays,
  addDays,
  isWeekend,
  getWeekNumber,
  formatColumnHeader,
  generateTimelineColumns
} from '../src/renderer/services/dateUtils';

describe('dateUtils', () => {
  it('formatea y parsea fechas ISO correctamente', () => {
    const date = new Date(2026, 7, 14); // Agosto = mes 7 (0-indexed)
    const iso = formatDateISO(date);
    expect(iso).toBe('2026-08-14');

    const parsed = parseDateISO(iso);
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(7);
    expect(parsed.getDate()).toBe(14);
  });

  it('calcula diferencia en días entre dos fechas', () => {
    const d1 = new Date(2026, 7, 10);
    const d2 = new Date(2026, 7, 18);
    expect(diffDays(d1, d2)).toBe(8);
  });

  it('añade días a una fecha correctamente', () => {
    const d1 = new Date(2026, 7, 10);
    const added = addDays(d1, 5);
    expect(added.getDate()).toBe(15);
  });

  it('identifica correctamente fines de semana', () => {
    const sabado = new Date(2026, 7, 15); // 15 de agosto 2026 es sábado
    const domingo = new Date(2026, 7, 16); // 16 de agosto 2026 es domingo
    const lunes = new Date(2026, 7, 17); // 17 de agosto 2026 es lunes

    expect(isWeekend(sabado)).toBe(true);
    expect(isWeekend(domingo)).toBe(true);
    expect(isWeekend(lunes)).toBe(false);
  });

  it('calcula números de semana y cabeceras de columnas', () => {
    const date = new Date(2026, 7, 14);
    const headerDays = formatColumnHeader(date, 'days');
    expect(headerDays.primary).toContain('14 Ago');

    const weekNum = getWeekNumber(date);
    expect(typeof weekNum).toBe('number');
    expect(weekNum).toBeGreaterThan(0);
  });

  it('genera columnas de escala temporal para días', () => {
    const start = new Date(2026, 7, 1);
    const cols = generateTimelineColumns(start, 7, 'days');
    expect(cols.length).toBe(7);
    expect(cols[0].getDate()).toBe(1);
    expect(cols[6].getDate()).toBe(7);
  });
});
