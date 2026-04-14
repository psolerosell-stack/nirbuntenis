export const temporadaActual = "2026-Primavera";

export const grupos = {
  "Platino-A": ["V. Messa","P. Heredia","J. Cirera","I. Vidaurreta","F. Jiménez"],
  "Platino-B": ["J. Pugés","M. Alís","C. Esteban","L. Carrasco","G. Forniés"],
  "Oro-A": ["C. Ferrer","P. Muñoz","G. Roca","D. Menéndez","V. Cacho"],
  "Oro-B": ["L. Sales","A. Bosch","N. Dito","G. Romaní","M. García","P. Solé"],
  "Plata-A": ["D. Thompson","G. Puig","J. Servat","J. Chavez","N. Pintado"],
  "Plata-B": ["M. Peiró","J. M-Pujalte","A. Vallés","J. Ubieto","V. Marín"],
  "Bronce-A": ["V. Espuña","M. Llargués","A. M-Pujalte","A. Recasens","G. Gil"],
  "Bronce-B": ["M. Puigserver","G. Torrens","Jo. M-Pujalte","A. Busquí","C. Guinot"],
};

// Palmarés estático por jugador (rellenar según histórico real)
export const palmares = {
  // "Nombre": { titulos: 0, ascensos: 0, mejorScore: 0, temporadas: ["2026-Primavera"] }
};

export let partidos = [
  {id:1,grupo:"Platino-A",local:"V. Messa",visitante:"J. Cirera",s1l:6,s1v:2,s2l:6,s2v:3,stbl:null,stbv:null,fecha:"2026-03-12",estado:"jugado"},
  {id:2,grupo:"Platino-A",local:"V. Messa",visitante:"P. Heredia",s1l:6,s1v:3,s2l:6,s2v:2,stbl:null,stbv:null,fecha:"2026-03-15",estado:"jugado"},
  {id:3,grupo:"Platino-A",local:"V. Messa",visitante:"I. Vidaurreta",s1l:6,s1v:2,s2l:7,s2v:6,stbl:null,stbv:null,fecha:"2026-03-20",estado:"jugado"},
  {id:4,grupo:"Platino-A",local:"P. Heredia",visitante:"J. Cirera",fecha:"2026-04-26",estado:"pendiente"},
  {id:5,grupo:"Platino-B",local:"J. Pugés",visitante:"M. Alís",s1l:6,s1v:4,s2l:7,s2v:5,stbl:null,stbv:null,fecha:"2026-03-10",estado:"jugado"},
  {id:6,grupo:"Platino-B",local:"J. Pugés",visitante:"C. Esteban",s1l:6,s1v:3,s2l:6,s2v:3,stbl:null,stbv:null,fecha:"2026-03-18",estado:"jugado"},
  {id:7,grupo:"Oro-B",local:"L. Sales",visitante:"G. Romaní",s1l:6,s1v:2,s2l:7,s2v:5,stbl:null,stbv:null,fecha:"2026-03-14",estado:"jugado"},
  {id:8,grupo:"Oro-B",local:"L. Sales",visitante:"A. Bosch",s1l:6,s1v:4,s2l:6,s2v:3,stbl:null,stbv:null,fecha:"2026-03-19",estado:"jugado"},
];

let nextId = 9;

export function addPartido(partido) {
  const nuevo = { ...partido, id: nextId++ };
  partidos.push(nuevo);
  return nuevo;
}
