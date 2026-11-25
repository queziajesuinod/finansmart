// @ts-nocheck
// Monta o texto de UMA página a partir dos fragmentos do pdf.js
// (page.getTextContent().items), no formato que o parseFatura espera:
// uma linha por "banda" de mesma altura, de cima para baixo.
// Ver docs/importacao/itau.md (como cada banco desenha a fatura).

const TOL_Y = 2.5;          // pt: fragmentos com y até essa distância são a mesma linha
// pt: abaixo desse espaço horizontal os fragmentos estão ENCOSTADOS (mesma palavra).
// O Itaú desenha as letras acentuadas com outra fonte; o pdf.js devolve "VE" + "Í" +
// "CULOS" lado a lado. Um espaço real entre palavras mede ~2 pt ou mais.
const GAP_COLADO = 0.6;
const GAP_SOBREPOSTO = -2;  // pt: sobreposição maior que isso não é a mesma palavra
const MIN_DATAS_DIREITA = 3; // datas dd/mm na metade direita para considerar 2 colunas

function paraFragmentos(itens) {
  return itens
    .filter((it) => it.str && it.str.trim())
    .map((it) => ({ x: it.transform[4], y: it.transform[5], w: Number(it.width) || 0, raw: it.str, s: it.str.trim() }));
}

// Junta os fragmentos de uma linha da esquerda para a direita. Só põe espaço
// entre dois fragmentos quando há distância real entre eles.
function montarLinha(frags) {
  const ordenados = frags.slice().sort((a, b) => a.x - b.x);
  let linha = "";
  ordenados.forEach((f, i) => {
    if (i === 0) { linha = f.raw; return; }
    const ant = ordenados[i - 1];
    const gap = f.x - (ant.x + ant.w);
    const encostados = ant.w > 0 && gap > GAP_SOBREPOSTO && gap < GAP_COLADO && !/\s$/.test(ant.raw) && !/^\s/.test(f.raw);
    linha += (encostados ? "" : " ") + f.raw;
  });
  return linha.replace(/\s+/g, " ").trim();
}

function agruparEmBandas(frags) {
  const ordenados = frags.slice().sort((a, b) => b.y - a.y || a.x - b.x);
  const bandas = [];
  ordenados.forEach((f) => {
    const banda = bandas.find((b) => Math.abs(b.y - f.y) <= TOL_Y);
    if (banda) banda.itens.push(f);
    else bandas.push({ y: f.y, itens: [f] });
  });
  return bandas;
}

// Layout de 2 colunas (ex.: Itaú): há datas dd/mm na metade direita. Devolve o x
// do corte entre as colunas, ou null para layout de uma coluna.
function corteDeColunas(bandas, larguraPagina) {
  const xs = [];
  bandas.forEach((b) => b.itens.forEach((it) => { if (/^\d{2}\/\d{2}$/.test(it.s) && it.x > larguraPagina * 0.5) xs.push(it.x); }));
  return xs.length >= MIN_DATAS_DIREITA ? Math.min(...xs) - 10 : null;
}

/**
 * @param {Array<{str: string, transform: number[], width?: number}>} itens fragmentos do pdf.js
 * @param {number} larguraPagina largura da página em pt (viewport scale 1)
 * @returns {string} linhas separadas por "\n" (com "\n" no fim), ou "" sem texto
 */
export function textoDaPagina(itens, larguraPagina) {
  const frags = paraFragmentos(itens || []);
  if (!frags.length) return "";
  const bandas = agruparEmBandas(frags);
  const corte = corteDeColunas(bandas, larguraPagina || 600);

  if (corte == null) {
    return bandas.map((b) => montarLinha(b.itens)).filter(Boolean).map((l) => l + "\n").join("");
  }
  // Emite a COLUNA ESQUERDA inteira (de cima p/ baixo) e depois a DIREITA. Assim
  // cada compra fica seguida da sua própria linha de categoria (Itaú).
  const esquerda = bandas.map((b) => montarLinha(b.itens.filter((it) => it.x < corte))).filter(Boolean);
  const direita = bandas.map((b) => montarLinha(b.itens.filter((it) => it.x >= corte))).filter(Boolean);
  return [...esquerda, ...direita].map((l) => l + "\n").join("");
}
