// Calcula puntos de un partido jugado
export function calcPuntos(p) {
  const setsL = (p.s1l > p.s1v ? 1 : 0) + (p.s2l > p.s2v ? 1 : 0) + (p.stbl != null && p.stbl > p.stbv ? 1 : 0);
  const setsV = 2 - setsL + (p.stbl != null ? 1 : 0);
  if (setsL > setsV) return { ganador: p.local, ptsG: setsV === 0 ? 4 : 3, ptsP: setsV === 0 ? 1 : 2, setsG: setsL, setsP: setsV };
  return { ganador: p.visitante, ptsG: setsL === 0 ? 4 : 3, ptsP: setsL === 0 ? 1 : 2, setsG: setsV, setsP: setsL };
}

function ptsDirectos(jugadores, partidos, grupo) {
  const pts = {};
  jugadores.forEach(j => { pts[j] = {}; jugadores.forEach(k => pts[j][k] = 0); });
  partidos.filter(p => p.grupo === grupo && p.estado === "jugado").forEach(p => {
    if (!jugadores.includes(p.local) || !jugadores.includes(p.visitante)) return;
    const r = calcPuntos(p);
    const perdedor = r.ganador === p.local ? p.visitante : p.local;
    pts[r.ganador][perdedor] += r.ptsG;
    pts[perdedor][r.ganador] += r.ptsP;
  });
  return pts;
}

// Genera clasificación de un grupo a partir de los partidos
export function calcClasificacion(jugadores, partidos, grupo) {
  const stats = {};
  jugadores.forEach(j => {
    stats[j] = { jugador: j, pl: 0, w: 0, l: 0, pts: 0, gplus: 0, gminus: 0, splus: 0, sminus: 0 };
  });

  partidos.filter(p => p.grupo === grupo && p.estado === "jugado" && jugadores.includes(p.local) && jugadores.includes(p.visitante)).forEach(p => {
    const r = calcPuntos(p);
    const perdedor = r.ganador === p.local ? p.visitante : p.local;
    const gl = (p.s1l || 0) + (p.s2l || 0) + (p.stbl || 0);
    const gv = (p.s1v || 0) + (p.s2v || 0) + (p.stbv || 0);

    stats[p.local].pl++;
    stats[p.visitante].pl++;
    stats[r.ganador].w++;
    stats[r.ganador].pts += r.ptsG;
    stats[r.ganador].splus += r.setsG;
    stats[r.ganador].sminus += r.setsP;
    stats[perdedor].l++;
    stats[perdedor].pts += r.ptsP;
    stats[perdedor].splus += r.setsP;
    stats[perdedor].sminus += r.setsG;
    stats[p.local].gplus += gl;
    stats[p.local].gminus += gv;
    stats[p.visitante].gplus += gv;
    stats[p.visitante].gminus += gl;
  });

  const arr = Object.values(stats);
  const directos = ptsDirectos(jugadores, partidos, grupo);

  arr.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    const dDir = (directos[b.jugador]?.[a.jugador] || 0) - (directos[a.jugador]?.[b.jugador] || 0);
    if (dDir !== 0) return dDir;
    const difA = a.splus - a.sminus, difB = b.splus - b.sminus;
    if (difB !== difA) return difB - difA;
    const difGA = a.gplus - a.gminus, difGB = b.gplus - b.gminus;
    if (difGB !== difGA) return difGB - difGA;
    if (b.gplus !== a.gplus) return b.gplus - a.gplus;
    return a.jugador.localeCompare(b.jugador);
  });

  return arr;
}

// NirbunScore 0-100: 70% win rate + 30% set efficiency
export function calcNirbunScore({ pj, g, sG, sP }) {
  if (pj === 0) return 0;
  const winPct = g / pj;
  const totalSets = sG + sP;
  const setPct = totalSets > 0 ? sG / totalSets : 0;
  return Math.round(winPct * 70 + setPct * 30);
}

export function formatScore(p) {
  if (p.estado !== "jugado") return null;
  const sets = [`${p.s1l}-${p.s1v}`, `${p.s2l}-${p.s2v}`];
  if (p.stbl != null) sets.push(`(${p.stbl}-${p.stbv})`);
  return sets.join(", ");
}

export function getGanador(p) {
  if (p.estado !== "jugado") return null;
  return calcPuntos(p).ganador;
}

export function calcRivalidades(jugadorNombre, todosPartidos) {
  const rivales = {};
  todosPartidos
    .filter(p => p.estado === "jugado" && (p.local === jugadorNombre || p.visitante === jugadorNombre))
    .forEach(p => {
      const esLocal = p.local === jugadorNombre;
      const rival = esLocal ? p.visitante : p.local;
      if (!rival) return;
      if (!rivales[rival]) rivales[rival] = { rival, victorias: 0, derrotas: 0 };
      const { ganador } = calcPuntos(p);
      if (ganador === jugadorNombre) rivales[rival].victorias++;
      else rivales[rival].derrotas++;
    });
  const lista = Object.values(rivales);
  const nemesis = lista.length ? lista.reduce((b, r) => r.derrotas > b.derrotas ? r : b) : null;
  const victima = lista.length ? lista.reduce((b, r) => r.victorias > b.victorias ? r : b) : null;
  return {
    nemesis: nemesis?.derrotas > 0 ? nemesis : null,
    victima: victima?.victorias > 0 ? victima : null,
  };
}

export function calcScoreDetalle(jugadorNombre, todosPartidos, categoria) {
  const CAT_SCORE = { Platino: 100, Oro: 75, Plata: 50, Bronce: 25 };
  const mis = todosPartidos.filter(p =>
    p.estado === "jugado" && (p.local === jugadorNombre || p.visitante === jugadorNombre)
  );
  const pj = mis.length;
  let g = 0, sG = 0, sP = 0, jG = 0, jP = 0;
  mis.forEach(p => {
    const esLocal = p.local === jugadorNombre;
    if (calcPuntos(p).ganador === jugadorNombre) g++;
    const sl = (p.s1l > p.s1v ? 1 : 0) + (p.s2l > p.s2v ? 1 : 0) + (p.stbl != null && p.stbl > p.stbv ? 1 : 0);
    const sv = (p.s1v > p.s1l ? 1 : 0) + (p.s2v > p.s2l ? 1 : 0) + (p.stbl != null && p.stbv > p.stbl ? 1 : 0);
    sG += esLocal ? sl : sv;  sP += esLocal ? sv : sl;
    const jl = (p.s1l || 0) + (p.s2l || 0) + (p.stbl || 0);
    const jv = (p.s1v || 0) + (p.s2v || 0) + (p.stbv || 0);
    jG += esLocal ? jl : jv;  jP += esLocal ? jv : jl;
  });
  const cv  = CAT_SCORE[categoria] ?? 25;
  const wv  = pj > 0 ? Math.round((g / pj) * 100) : 0;
  const sv2 = (sG + sP) > 0 ? Math.round((sG / (sG + sP)) * 100) : 0;
  const jv2 = (jG + jP) > 0 ? Math.round((jG / (jG + jP)) * 100) : 0;
  const kv  = pj > 0 ? Math.min(100, Math.round((Math.min(pj, 5) / 5) * 100)) : 0;
  return {
    total: Math.round(cv * 0.30 + wv * 0.25 + sv2 * 0.20 + jv2 * 0.15 + kv * 0.10),
    factores: {
      categoria:    { valor: cv,  contribucion: Math.round(cv  * 0.30), max: 30 },
      winrate:      { valor: wv,  contribucion: Math.round(wv  * 0.25), max: 25 },
      sets:         { valor: sv2, contribucion: Math.round(sv2 * 0.20), max: 20 },
      juegos:       { valor: jv2, contribucion: Math.round(jv2 * 0.15), max: 15 },
      consistencia: { valor: kv,  contribucion: Math.round(kv  * 0.10), max: 10 },
    },
  };
}

export function calcPlayoffs(grupos, partidos) {
  const CATS = ["Platino", "Oro", "Plata", "Bronce"];
  return CATS.map(cat => {
    const gA = `${cat}-A`, gB = `${cat}-B`;
    const jugA = grupos[gA] || [], jugB = grupos[gB] || [];
    const expA = (jugA.length * (jugA.length - 1)) / 2;
    const expB = (jugB.length * (jugB.length - 1)) / 2;
    const jugadosA = partidos.filter(p => p.grupo === gA && p.estado === "jugado").length;
    const jugadosB = partidos.filter(p => p.grupo === gB && p.estado === "jugado").length;
    const completo = expA > 0 && expB > 0 && jugadosA >= expA && jugadosB >= expB;
    const clasiA = calcClasificacion(jugA, partidos, gA);
    const clasiB = calcClasificacion(jugB, partidos, gB);
    const nA = clasiA.length, nB = clasiB.length;

    const promovidos = [clasiA[0], clasiB[0]].filter(Boolean).map(r => r.jugador);
    const descendidos = [clasiA[nA - 1], clasiB[nB - 1]].filter(Boolean).map(r => r.jugador).filter(j => !promovidos.includes(j));

    const matches = [];
    if (nA >= 2 && nB >= 2) {
      const grupoKey = `${cat}-PO-Asc`;
      const j1 = clasiA[1].jugador, j2 = clasiB[1].jugador;
      const partido = partidos.find(p => p.grupo === grupoKey && ((p.local === j1 && p.visitante === j2) || (p.local === j2 && p.visitante === j1))) || null;
      matches.push({ tipo: "ascenso", j1, gJ1: gA, j2, gJ2: gB, grupoKey, grupoPartido: "PO-Asc", partido });
    }
    if (nA > 3 && nB > 3) {
      const grupoKey = `${cat}-PO-Des`;
      const j1 = clasiA[nA - 2].jugador, j2 = clasiB[nB - 2].jugador;
      const partido = partidos.find(p => p.grupo === grupoKey && ((p.local === j1 && p.visitante === j2) || (p.local === j2 && p.visitante === j1))) || null;
      matches.push({ tipo: "descenso", j1, gJ1: gA, j2, gJ2: gB, grupoKey, grupoPartido: "PO-Des", partido });
    }

    return { cat, gA, gB, jugA, jugB, expA, expB, jugadosA, jugadosB, completo, clasiA, clasiB, matches, promovidos, descendidos };
  });
}
