/**
 * Construye el mapa de grupos { "Platino-A": ["J1", "J2", ...], ... }
 * a partir de los partidos de una temporada concreta.
 *
 * Se usa para temporadas históricas, donde la pestaña Jugadores ya
 * refleja los grupos de la temporada actual (con ascensos/descensos),
 * no los de temporadas pasadas.
 *
 * Solo se incluyen jugadores que aparecen en al menos un partido
 * jugado o pendiente de esa temporada — suficiente para reconstruir
 * la clasificación histórica.
 *
 * @param {Array} partidos - partidos normalizados (con campos grupo, local, visitante)
 * @returns {Object} mapa grupoKey → array de nombres de jugadores
 */
export function gruposFromPartidos(partidos) {
  const mapa = {};
  partidos.forEach(p => {
    if (!p.grupo) return;
    if (!mapa[p.grupo]) mapa[p.grupo] = new Set();
    if (p.local)     mapa[p.grupo].add(p.local);
    if (p.visitante) mapa[p.grupo].add(p.visitante);
  });
  const result = {};
  Object.entries(mapa).forEach(([k, v]) => { result[k] = Array.from(v); });
  return result;
}
