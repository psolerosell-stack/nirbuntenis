/**
 * Valida los valores de sets y supertiebreak de un partido.
 * Fuente única de verdad — usada en Resultado, Historial y Playoffs.
 *
 * @param {number|null} s1l  Set 1 local
 * @param {number|null} s1v  Set 1 visitante
 * @param {number|null} s2l  Set 2 local
 * @param {number|null} s2v  Set 2 visitante
 * @param {number|null} stbl STB local  (null si no aplica)
 * @param {number|null} stbv STB visitante (null si no aplica)
 * @returns {string[]} Array de mensajes de error. Vacío = válido.
 */
export function validarSets(s1l, s1v, s2l, s2v, stbl, stbv) {
  const errors = [];

  function validSet(a, b, label) {
    if (a == null || b == null || isNaN(a) || isNaN(b)) {
      errors.push(`${label}: introduce ambos valores`); return;
    }
    if (a < 0 || b < 0) { errors.push(`${label}: valores negativos`); return; }
    const max = Math.max(a, b);
    const min = Math.min(a, b);
    if (max < 6)                              { errors.push(`${label}: el ganador necesita al menos 6 juegos`); return; }
    if (max === 6 && min > 4)                 { errors.push(`${label}: si gana 6 el otro no puede tener más de 4`); return; }
    if (max === 7 && min !== 5 && min !== 6)  { errors.push(`${label}: 7-x solo válido con x=5 o x=6`); return; }
    if (max > 7)                              { errors.push(`${label}: máximo 7 juegos en un set normal`); return; }
    if (a === b)                              { errors.push(`${label}: no puede haber empate en un set`); return; }
  }

  validSet(s1l, s1v, "Set 1");
  validSet(s2l, s2v, "Set 2");
  if (errors.length > 0) return errors;

  const w1 = s1l > s1v ? "l" : "v";
  const w2 = s2l > s2v ? "l" : "v";
  if (w1 !== w2) {
    if (stbl == null || stbv == null || isNaN(stbl) || isNaN(stbv)) {
      errors.push("STB requerido: los sets están 1-1");
    } else if (stbl === stbv) {
      errors.push("STB: no puede haber empate");
    } else if (Math.max(stbl, stbv) < 10) {
      errors.push("STB: el ganador necesita al menos 10 puntos");
    } else if (Math.abs(stbl - stbv) < 2) {
      errors.push("STB: diferencia mínima de 2 puntos");
    }
  }

  return errors;
}
