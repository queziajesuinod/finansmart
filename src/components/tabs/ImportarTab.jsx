// @ts-nocheck
import { useState, useRef, useEffect } from "react";
import { C, CATEGORIES, todayStr, fmt, genId, tint } from "../../lib/constants";
import { Card, Field, Inp, Sel, Btn, STitle, IcoTxt, MoneyInput } from "../ui";
import { parseFatura, aplicarRegras, merchantKey } from "../../lib/parseFatura";
import { authConfig, aiImportFatura } from "../../lib/api";
import { Trash2, FilePlus, ScrollText, Search, Lightbulb, FileText, Calendar, Users, User, CreditCard, ArrowLeftRight, Sparkles } from "../../lib/icons.jsx";

export default function ImportarTab({ setDespesasMk, year, monthIdx, cartoes, setCartoes, parcelados, setParcelados, categoryRules, setCategoryRules, cardProfiles, setTab }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [items, setItems] = useState([]);
  const [modo, setModo] = useState("pdf");
  const [texto, setTexto] = useState("");
  const [meta, setMeta] = useState({ banco: "", nome: "", limite: "", vencimento: "", mesRef: "" });
  const [totalFatura, setTotalFatura] = useState(null);
  const [aiOn, setAiOn] = useState(false);
  const [loadingIA, setLoadingIA] = useState(false);
  const [autoIA, setAutoIA] = useState(() => { try { return localStorage.getItem("jp:autoIA") !== "0"; } catch { return true; } });
  const ref = useRef();
  const mf = (k) => (e) => setMeta((p) => ({ ...p, [k]: e.target.value }));
  const toggleAutoIA = () => setAutoIA((v) => { const nv = !v; try { localStorage.setItem("jp:autoIA", nv ? "1" : "0"); } catch {} return nv; });

  // Descobre se a leitura com IA está habilitada no servidor (chave configurada).
  useEffect(() => { authConfig().then((cfg) => setAiOn(Boolean(cfg && cfg.aiImport))).catch(() => {}); }, []);

  // Mês/ano de referência para a IA (1-12). Prioriza o campo, senão detecta, senão a tela.
  function refParaIA(txt) {
    let ym = meta.mesRef || detectarMesRef(txt || texto || "", items);
    if (ym && /^\d{4}-\d{2}$/.test(ym)) return { refYear: parseInt(ym.slice(0, 4), 10), refMonth: parseInt(ym.slice(5, 7), 10) };
    return { refYear: year, refMonth: monthIdx + 1 };
  }

  // Reforço: manda o texto já extraído para a IA e reprocessa as compras.
  // txtArg permite passar o texto direto (no disparo automático, o state ainda
  // não atualizou). auto=true muda a mensagem e é usado na reconferência.
  async function lerComIA(txtArg, auto) {
    const txt = (typeof txtArg === "string" && txtArg) ? txtArg : texto;
    if (!txt || txt.trim().length < 20) { setMsg("Não há texto para analisar. Envie um PDF ou cole o texto da fatura primeiro."); return; }
    const { refYear, refMonth } = refParaIA(txt);
    setLoadingIA(true);
    setMsg(auto ? "A leitura ficou incompleta — completando com IA..." : "Analisando a fatura com IA (isso envia o texto ao servidor)...");
    try {
      const r = await aiImportFatura({ texto: txt, refYear, refMonth });
      if (!r || !Array.isArray(r.compras) || !r.compras.length) { setMsg("A IA não encontrou compras neste texto. Confira o texto extraído e tente novamente."); setLoadingIA(false); return; }
      const itens = r.compras.map((c) => ({ ...c, portador: c.portador || "Titular", final: c.final || "" }));
      itens.totalOficial = r.totalOficial || null;
      mostrarResultado(itens, txt, "ia");
      // Dados do cartão que a IA identificou (banco, limite, vencimento) têm
      // prioridade — preenchem mesmo por cima do que o parser local achou.
      if (r.cartao) {
        setMeta((m) => ({
          ...m,
          banco: r.cartao.banco || m.banco,
          nome: r.cartao.nome || m.nome,
          limite: r.cartao.limite ? String(r.cartao.limite) : m.limite,
          vencimento: r.cartao.vencimentoDia ? vencDoDia(r.cartao.vencimentoDia) : m.vencimento,
        }));
      }
    } catch (e) {
      if (e.code === "ai_disabled") setMsg("A leitura com IA não está configurada no servidor.");
      else if (e.status === 429) setMsg("O serviço de IA está no limite de uso agora. Aguarde um minuto e tente de novo.");
      else setMsg("Não consegui ler com IA agora. Você ainda pode revisar/corrigir a lista manualmente. " + (e.message || ""));
    }
    setLoadingIA(false);
  }

  // Data de vencimento sintética a partir do dia (só o dia é usado depois).
  const vencDeProfile = (p) => p.vencimento || (p.vencimentoDia ? `2000-01-${String(p.vencimentoDia).padStart(2, "0")}` : "");

  // Preenche o formulário com um cartão já usado (seleção manual).
  function preencherPerfil(p) {
    if (!p) return;
    const venc = vencDeProfile(p);
    setMeta((m) => ({ ...m, banco: p.banco || m.banco, nome: p.nome || m.nome, limite: p.limite ? String(p.limite) : m.limite, vencimento: venc || m.vencimento }));
  }

  // Detecta o mês de referência da fatura (formato "YYYY-MM" p/ input month).
  // Prioriza a data de VENCIMENTO; senão o mês mais frequente das transações.
  function detectarMesRef(txt, itens) {
    const t = (txt || "").replace(/\s+/g, " ");
    // vencimento dd/mm/aaaa (CAIXA)
    let m = t.match(/vencimento[^0-9]{0,20}(\d{2})\/(\d{2})\/(\d{4})/i);
    if (m) return `${m[3]}-${m[2]}`;
    // vencimento dd MMM aaaa (Nubank: "08 JUL 2026")
    const MES = { jan: "01", fev: "02", mar: "03", abr: "04", mai: "05", jun: "06", jul: "07", ago: "08", set: "09", out: "10", nov: "11", dez: "12" };
    m = t.match(/vencimento[^0-9a-z]{0,20}(\d{1,2})\s+([a-z]{3})[a-z]*\.?\s+(\d{4})/i);
    if (m) { const mm = MES[m[2].toLowerCase().slice(0, 3)]; if (mm) return `${m[3]}-${mm}`; }
    // fallback: mês mais frequente entre as transações lidas
    if (itens && itens.length) {
      const cont = {};
      for (const it of itens) { const ym = String(it.data).slice(0, 7); if (ym) cont[ym] = (cont[ym] || 0) + 1; }
      const top = Object.entries(cont).sort((a, b) => b[1] - a[1])[0];
      if (top) return top[0];
    }
    return "";
  }

  // Reconhece o banco/emissor direto do texto do PDF (sem depender de perfil).
  function detectarBanco(txt) {
    const t = (txt || "").toLowerCase();
    const bancos = [
      ["Nubank", ["nubank", "nu pagamentos", "nupay"]],
      ["CAIXA", ["cartões caixa", "cartão caixa", "cartao caixa", "caixa econ", "caixa"]],
      ["Itaú", ["itaú", "itau", "banco itau"]],
      ["Bradesco", ["bradesco"]],
      ["Santander", ["santander"]],
      ["Banco Inter", ["banco inter"]],
      ["C6 Bank", ["c6 bank", "c6bank", "banco c6"]],
      ["Banco do Brasil", ["banco do brasil", "ourocard"]],
      ["Mercado Pago", ["mercado pago", "mercadopago"]],
      ["PicPay", ["picpay"]],
      ["Will Bank", ["will bank", "willbank"]],
      ["BTG", ["btg pactual"]],
      ["XP", ["banco xp", "xp investimentos"]],
      ["Sicoob", ["sicoob"]],
      ["Sicredi", ["sicredi"]],
      ["Neon", ["banco neon"]],
      ["Original", ["banco original"]],
    ];
    for (const [nome, kws] of bancos) { if (kws.some((k) => t.includes(k))) return nome; }
    return "";
  }

  // Coleta os 4 finais que aparecem no PDF (•••• 4354, (Cartão 1753), final 1796...).
  function detectarFinais(txt, itens) {
    const set = new Set();
    (itens || []).forEach((i) => { if (i.final) set.add(String(i.final)); });
    const t = txt || "";
    for (const m of t.matchAll(/(?:•{2,}|·{2,}|\*{2,}|final|cart[ãa]o)\s*(\d{3,4})\b/gi)) set.add(m[1]);
    return set;
  }

  function acharTotalFatura(txt) {
    const t = txt.replace(/\s+/g, " ");
    // "valor total desta fatura" (CAIXA), "no valor de" (Nubank) e variações.
    const re = /(?:valor total desta fatura|total desta fatura|o total da sua fatura[^0-9]*|esta é a sua fatura[^0-9]*no valor de|no valor de)\D{0,12}(\d{1,3}(?:\.\d{3})*,\d{2})/i;
    const m = t.match(re);
    if (m) return parseFloat(m[1].replace(/\./g, "").replace(",", "."));
    return null;
  }

  // Dia do vencimento (só o dia; ex: "Vencimento: 25/06/2026" → 25).
  function detectarVencDia(txt) {
    const t = txt || "";
    let m = t.match(/vencimento[^0-9]{0,20}(\d{1,2})\/(\d{1,2})\/(\d{2,4})/i);
    if (m) return parseInt(m[1], 10);
    m = t.match(/vencimento[^0-9a-z]{0,20}(\d{1,2})\s+[a-z]{3}/i); // "08 JUL 2026" (Nubank)
    if (m) return parseInt(m[1], 10);
    return null;
  }
  // Limite total de crédito impresso na fatura.
  function detectarLimite(txt) {
    const t = (txt || "").replace(/\s+/g, " ");
    const m = t.match(/limite total de cr[eé]dito[^0-9]{0,12}(\d{1,3}(?:\.\d{3})*,\d{2})/i) ||
              t.match(/limite total[^0-9]{0,12}(\d{1,3}(?:\.\d{3})*,\d{2})/i);
    if (m) return parseFloat(m[1].replace(/\./g, "").replace(",", "."));
    return null;
  }
  // Data sintética a partir do dia (só o dia é usado depois). Jan tem 31 dias → seguro.
  const vencDoDia = (dia) => (dia ? `2000-01-${String(dia).padStart(2, "0")}` : "");
  // Extrai só o dia de uma data "YYYY-MM-DD" (para o campo mostrar apenas o dia).
  const diaDoVenc = (v) => { const m = /^\d{4}-\d{2}-(\d{2})$/.exec(v || ""); return m ? String(parseInt(m[1], 10)) : ""; };
  // Ao digitar o dia (1-31), guarda como data sintética em meta.vencimento.
  const setVencDia = (e) => { const d = parseInt(e.target.value, 10); setMeta((m) => ({ ...m, vencimento: d >= 1 && d <= 31 ? vencDoDia(d) : "" })); };

  function mostrarResultado(parsed, txtCompleto, fonte = "local") {
    const totalOficial = parsed.totalOficial || acharTotalFatura(txtCompleto || "");
    // Aplica as categorias que o usuário já ensinou em importações anteriores.
    const comRegras = aplicarRegras(parsed, categoryRules);
    setItems(comRegras);
    // Detecta o mês de referência da fatura (independe do mês visível na tela).
    const mesRefDet = detectarMesRef(txtCompleto || "", comRegras);
    if (mesRefDet) setMeta((mt) => ({ ...mt, mesRef: mesRefDet }));
    // Autopreenche os dados do cartão: primeiro pelos 4 finais, depois pelo banco/apelido.
    const txtLow = (txtCompleto || "").toLowerCase();
    const finaisDet = detectarFinais(txtCompleto || "", comRegras);
    let prof = (cardProfiles || []).find((p) => p.finais && finaisDet.has(String(p.finais)));
    if (!prof) prof = (cardProfiles || []).find((p) => {
      const b = (p.banco || "").toLowerCase(), n = (p.nome || "").toLowerCase();
      return (b.length >= 4 && txtLow.includes(b)) || (n.length >= 4 && txtLow.includes(n));
    });
    if (prof) {
      const venc = vencDeProfile(prof);
      setMeta((m) => ({ ...m, banco: m.banco || prof.banco, nome: m.nome || prof.nome, limite: m.limite || (prof.limite ? String(prof.limite) : ""), vencimento: m.vencimento || venc }));
    }
    // Sempre tenta preencher o banco pelo texto do PDF (mesmo sem perfil cadastrado).
    const bancoDet = detectarBanco(txtCompleto || "");
    if (bancoDet) setMeta((m) => ({ ...m, banco: m.banco || bancoDet, nome: m.nome || bancoDet }));
    // Limite e dia de vencimento impressos na fatura (preenche se ainda vazio).
    const limDet = detectarLimite(txtCompleto || "");
    const vencDia = detectarVencDia(txtCompleto || "");
    setMeta((m) => ({
      ...m,
      limite: m.limite || (limDet ? String(limDet) : ""),
      vencimento: m.vencimento || vencDoDia(vencDia),
    }));
    const parc = comRegras.filter((i) => i.parcelas > 1).length;
    const somaExtraida = comRegras.reduce((s, i) => s + (parseFloat(i.valor) || 0), 0);
    const aprendidas = comRegras.filter((i) => { const k = merchantKey(i.descricao); return k && categoryRules && categoryRules[k]; }).length;
    setTotalFatura(totalOficial || null);
    const dif = totalOficial ? totalOficial - somaExtraida : 0;
    const bate = !totalOficial || Math.abs(dif) <= 1;
    let aviso = "";
    if (!bate) {
      if (dif > 0) {
        const dicaIA = aiOn ? (fonte === "ia" ? ` Confira/edite a lista antes de salvar.` : ` Para ler as compras que faltaram, toque em "Melhorar leitura com IA".`) : "";
        const prefixo = fonte === "ia" ? "Mesmo com a IA, a" : "A";
        aviso = ` ${prefixo} soma das compras lidas é ${fmt(somaExtraida)}, abaixo do total oficial ${fmt(totalOficial)} (que será usado no app). Diferença de ${fmt(Math.abs(dif))}.${dicaIA}`;
      } else {
        aviso = ` As compras lidas somam ${fmt(somaExtraida)}, mas a fatura informa ${fmt(totalOficial)}. Confira a lista e remova duplicatas antes de salvar.`;
      }
    } else if (fonte === "ia" && totalOficial) {
      aviso = ` A soma agora bate com o total da fatura (${fmt(totalOficial)}).`;
    }
    const aprendidoTxt = aprendidas > 0 ? ` ${aprendidas} categorizada${aprendidas > 1 ? "s" : ""} automaticamente pelo que você já ensinou.` : "";
    const prefixoMsg = fonte === "ia" ? "IA: " : "";
    setMsg(`${prefixoMsg}${comRegras.length} transações encontradas${parc > 0 ? ` (${parc} parcelada${parc > 1 ? "s" : ""})` : ""}. Revise e confirme abaixo.${aprendidoTxt}${aviso}`);

    // Reforço automático: se a leitura LOCAL ficou incompleta (faltou valor) e a
    // IA está ligada, completa sozinha — sem precisar clicar no botão.
    if (fonte === "local" && aiOn && autoIA && totalOficial && dif > 1) {
      lerComIA(txtCompleto, true);
    }
  }

  function processarTexto(txt) {
    if (!txt || txt.trim().length < 10) { setMsg("Cole o texto da fatura primeiro."); return; }
    const parsed = parseFatura(txt, year, monthIdx);
    if (!parsed.length) {
      setMsg("Não encontrei transações no formato esperado. As linhas precisam ter data (dd/mm), descrição e valor (ex: 08/05 UberRides 11,90). Você ainda pode lançar manualmente na aba Lançamentos.");
      setItems([]); return;
    }
    mostrarResultado(parsed, txt);
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]; if (!file) return;
    setItems([]); setMsg("");
    if (file.type && file.type !== "application/pdf") { setMsg("O arquivo precisa ser um PDF."); e.target.value = ""; return; }
    setLoading(true); setMsg("Lendo o PDF no seu dispositivo...");
    try {
      if (!window.pdfjsLib) {
        await new Promise((res, rej) => {
          const s = document.createElement("script");
          s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
          s.onload = res; s.onerror = () => rej(new Error("cdn"));
          document.head.appendChild(s);
        });
        if (window.pdfjsLib) window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      }
      if (!window.pdfjsLib) { setMsg("Não consegui carregar o leitor de PDF (sem internet?). Use a opção \"Colar texto\" abaixo."); setLoading(false); e.target.value = ""; return; }

      const buf = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
      let fullText = "";
      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const vp = page.getViewport({ scale: 1 });
        const W = vp.width || 600;
        const content = await page.getTextContent();
        const frags = content.items
          .filter((it) => it.str && it.str.trim())
          .map((it) => ({ x: it.transform[4], y: it.transform[5], s: it.str.trim() }));
        if (!frags.length) continue;

        frags.sort((a, b) => b.y - a.y || a.x - b.x);
        const bandas = [];
        const TOL = 2.5;
        frags.forEach((frag) => {
          const b = bandas.find((l) => Math.abs(l.y - frag.y) <= TOL);
          if (b) { b.itens.push(frag); }
          else bandas.push({ y: frag.y, itens: [frag] });
        });

        const montar = (arr) => arr.slice().sort((a, b2) => a.x - b2.x).map((o) => o.s).join(" ").replace(/\s{2,}/g, " ").trim();

        // Detecta layout de 2 colunas (ex: Itaú): datas dd/mm na metade direita.
        const reTokenData = /^\d{2}\/\d{2}$/;
        const xDatasDir = [];
        bandas.forEach((b) => b.itens.forEach((it) => { if (reTokenData.test(it.s) && it.x > W * 0.5) xDatasDir.push(it.x); }));
        const duasColunas = xDatasDir.length >= 3;
        const corte = duasColunas ? Math.min.apply(null, xDatasDir) - 10 : null;

        if (duasColunas) {
          // Emite a COLUNA ESQUERDA inteira (de cima p/ baixo) e depois a DIREITA.
          // Assim cada compra fica seguida da sua própria linha de categoria —
          // essencial para faturas onde a categoria vem abaixo (Itaú).
          const esqLinhas = [], dirLinhas = [];
          bandas.forEach((b) => {
            const tE = montar(b.itens.filter((it) => it.x < corte));
            const tD = montar(b.itens.filter((it) => it.x >= corte));
            if (tE) esqLinhas.push(tE);
            if (tD) dirLinhas.push(tD);
          });
          fullText += esqLinhas.join("\n") + "\n" + dirLinhas.join("\n") + "\n";
        } else {
          bandas.forEach((b) => { const t = montar(b.itens); if (t) fullText += t + "\n"; });
        }
      }
      if (!fullText.trim()) { setMsg("O PDF não tem texto selecionável (parece ser uma imagem escaneada). Tente enviar o PDF original gerado pelo app/site do banco, ou digite as compras na opção \"Colar texto\"."); setLoading(false); e.target.value = ""; return; }

      setTexto(fullText);

      const parsed = parseFatura(fullText, year, monthIdx);
      if (!parsed.length) {
        setModo("texto");
        setMsg("Li o texto do PDF, mas não reconheci as compras no formato automático. O texto extraído está logo abaixo — confira, ajuste se precisar e clique em \"Processar texto\".");
        setLoading(false); e.target.value = ""; return;
      }
      mostrarResultado(parsed, fullText);
    } catch (err) {
      setMsg("Não consegui ler este PDF automaticamente. Use a opção \"Colar texto\" abaixo — é rápido e funciona sempre.");
      setModo("texto");
    }
    setLoading(false); e.target.value = "";
  }

  function confirm() {
    const todas = items.map((i) => ({ descricao: i.descricao, valor: parseFloat(i.valor) || 0, data: i.data, categoria: i.categoria, parcelas: i.parcelas, parcelaAtual: i.parcelaAtual, portador: i.portador || "Titular", final: i.final || "", id: genId() }));

    // Dedup por DATA + VALOR contra o que já foi importado antes (reimport da mesma fatura).
    const sig = (c) => `${c.data}|${Math.round((c.valor || 0) * 100)}`;
    const jaImportadas = new Set();
    (cartoes || []).forEach((ct) => (ct.compras || []).forEach((x) => jaImportadas.add(sig(x))));
    const compras = todas.filter((c) => !jaImportadas.has(sig(c)));
    const duplicadas = todas.length - compras.length;

    if (compras.length === 0) {
      setMsg(`Esta fatura já foi importada — todas as ${todas.length} compras já existem (mesma data e valor). Nada foi duplicado.`);
      return;
    }

    const somaCompras = compras.reduce((s, c) => s + c.valor, 0);
    // Se houve dedup, o total oficial não vale mais; usa a soma das compras novas.
    const total = duplicadas > 0 ? somaCompras : ((totalFatura && totalFatura >= somaCompras - 0.01) ? totalFatura : somaCompras);
    const portadores = [...new Set(compras.map((c) => c.portador))];
    // Mês de referência: da fatura (meta.mesRef "YYYY-MM"), NÃO o mês visível na tela.
    const mesRef = meta.mesRef
      ? `${parseInt(meta.mesRef.slice(0, 4), 10)}-${parseInt(meta.mesRef.slice(5, 7), 10) - 1}`
      : `${year}-${monthIdx}`;
    const cartaoId = genId();
    const cartao = {
      id: cartaoId,
      banco: meta.banco.trim() || "Cartão",
      nome: meta.nome.trim() || meta.banco.trim() || "Cartão de Crédito",
      limite: parseFloat((meta.limite || "").replace(",", ".")) || 0,
      vencimentoDia: meta.vencimento ? new Date(meta.vencimento + "T12:00:00").getDate() : null,
      vencimento: meta.vencimento || "",
      mesRef,
      total, somaCompras, compras, portadores,
      criadoEm: new Date().toISOString(),
    };
    setCartoes([...(cartoes || []), cartao]);

    // Cada parcelada vira um PLANO que começa na 1ª parcela (retroagindo
    // parcelaAtual-1 meses). Assim os meses retroativos já entram no cálculo.
    // Como a data de início é a mesma em qualquer fatura do item, dá para
    // deduplicar por comerciante + nº de parcelas + mês de início.
    // Dedup de parcelamentos: por comerciante+parcelas+mês OU por mês+valor da parcela.
    const parcKeys = (p) => [
      `m:${merchantKey(p.descricao)}|${p.totalParcelas}|${String(p.dataCompra).slice(0, 7)}`,
      `v:${String(p.dataCompra).slice(0, 7)}|${Math.round((p.valorParcela || 0) * 100)}`,
    ];
    const existentes = new Set();
    (parcelados || []).forEach((p) => parcKeys(p).forEach((k) => existentes.add(k)));
    const novasParcelas = [];
    let ignoradas = 0;
    compras.filter((c) => c.parcelas > 1 && c.valor > 0).forEach((c) => {
      const dataNaFatura = new Date(c.data + "T12:00:00");
      const dataPrimeira = new Date(dataNaFatura);
      dataPrimeira.setMonth(dataPrimeira.getMonth() - (c.parcelaAtual - 1));
      const nova = {
        id: genId(),
        descricao: c.descricao.replace(/\s*\d{1,2}\/\d{1,2}\s*/g, " ").trim() || c.descricao,
        valorTotal: c.valor * c.parcelas,
        totalParcelas: c.parcelas,
        parcelaAtual: c.parcelaAtual,
        valorParcela: c.valor,
        dataCompra: `${dataPrimeira.getFullYear()}-${String(dataPrimeira.getMonth() + 1).padStart(2, "0")}-${String(dataPrimeira.getDate()).padStart(2, "0")}`,
        categoria: c.categoria,
        origem: `${cartao.nome}${c.portador && c.portador !== "Titular" ? " · " + c.portador : ""}`,
        cartaoId,
      };
      const keys = parcKeys(nova);
      if (keys.some((k) => existentes.has(k))) { ignoradas++; return; } // já preenchido → desconsidera
      keys.forEach((k) => existentes.add(k));
      novasParcelas.push(nova);
    });
    let msgParc = "";
    if (setParcelados && (novasParcelas.length || ignoradas)) {
      if (novasParcelas.length) setParcelados([...(parcelados || []), ...novasParcelas]);
      const partes = [];
      if (novasParcelas.length) partes.push(`${novasParcelas.length} parcelamento${novasParcelas.length > 1 ? "s" : ""} novo${novasParcelas.length > 1 ? "s" : ""} registrado${novasParcelas.length > 1 ? "s" : ""} (meses retroativos incluídos)`);
      if (ignoradas) partes.push(`${ignoradas} já existente${ignoradas > 1 ? "s" : ""} ignorado${ignoradas > 1 ? "s" : ""}`);
      msgParc = ` ${partes.join(" · ")}.`;
    }

    // ── Aprende as categorias: guarda comerciante → categoria escolhida ──
    if (setCategoryRules) {
      const novasRegras = { ...(categoryRules || {}) };
      for (const c of compras) {
        const k = merchantKey(c.descricao);
        if (k) novasRegras[k] = c.categoria;
      }
      setCategoryRules(novasRegras);
    }

    setItems([]); setTexto(""); setMeta({ banco: "", nome: "", limite: "", vencimento: "", mesRef: "" }); setTotalFatura(null);
    const dupTxt = duplicadas > 0 ? ` ${duplicadas} compra${duplicadas > 1 ? "s" : ""} duplicada${duplicadas > 1 ? "s" : ""} (mesma data e valor) ignorada${duplicadas > 1 ? "s" : ""}.` : "";
    setMsg(`Cartão "${cartao.nome}" importado com ${compras.length} compras (${fmt(total)})!${dupTxt}${msgParc} Veja na aba Cartões de Crédito.`);
    if (setTab) setTab("cartoes");
  }

  const somaItens = items.reduce((s, i) => s + (parseFloat(i.valor) || 0), 0);
  const totalItens = (totalFatura && totalFatura >= somaItens - 0.01) ? totalFatura : somaItens;
  const usaTotalOficial = totalItens !== somaItens && Math.abs(totalItens - somaItens) > 0.01;

  return (
    <div>
      <Card style={{ marginBottom: 14 }}>
        <STitle><IcoTxt Icon={FileText} size={15}>Importar fatura / extrato</IcoTxt></STitle>
        <p style={{ fontSize: 12, color: C.subtle, lineHeight: 1.7, marginBottom: 14 }}>O app lê o PDF direto no seu dispositivo, identifica as compras, categoriza e detecta parcelamentos — sem enviar seus dados para fora.</p>

        <div style={{ display: "flex", gap: 6, background: "var(--fill-2)", borderRadius: 10, padding: 4, marginBottom: 14 }}>
          {[{ id: "pdf", label: "Enviar PDF", Icon: FilePlus }, { id: "texto", label: "Colar / editar texto", Icon: ScrollText }].map((t) => (
            <button key={t.id} onClick={() => { setModo(t.id); setMsg(""); }} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, background: modo === t.id ? tint(C.accent, 90) : "transparent", color: modo === t.id ? "#fff" : C.muted }}><t.Icon size={14} /> {t.label}</button>
          ))}
        </div>

        {modo === "pdf" && (
          <>
            <input ref={ref} type="file" accept=".pdf,application/pdf" style={{ display: "none" }} onChange={handleFile} />
            <Btn onClick={() => ref.current?.click()} disabled={loading} style={{ width: "100%" }}>{loading ? "Lendo PDF..." : <IcoTxt Icon={FilePlus}>Selecionar arquivo PDF</IcoTxt>}</Btn>
            <p style={{ fontSize: 11, color: C.muted, marginTop: 10, lineHeight: 1.6, display: "flex", gap: 6, alignItems: "flex-start" }}><Lightbulb size={13} style={{ flexShrink: 0, marginTop: 1 }} /> <span>Funciona melhor com faturas de coluna única (ex: CAIXA, Nubank). Para faturas de layout complexo (ex: Itaú), o app mostra o texto extraído abaixo para você conferir e processar.</span></p>
          </>
        )}

        {modo === "texto" && (
          <>
            <div style={{ background: "rgba(99,102,241,0.06)", border: `1px solid rgba(99,102,241,0.2)`, borderRadius: 9, padding: "11px 13px", marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.indigo, marginBottom: 6 }}>Como copiar o texto da fatura em PDF:</div>
              <ol style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: C.subtle, lineHeight: 1.8 }}>
                <li>Abra o PDF da fatura (no celular ou computador).</li>
                <li>Toque/clique e segure sobre as compras e arraste para selecionar. Ou use "Selecionar tudo" (Ctrl+A / ⌘+A).</li>
                <li>Copie (Ctrl+C / ⌘+C) e cole na caixa abaixo.</li>
                <li>Pode colar a fatura inteira — o app encontra as compras sozinho.</li>
              </ol>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>Ex. de uma linha: <span style={{ color: C.subtle, fontFamily: "monospace" }}>08/05 UberRides 11,90</span></div>
            </div>
            <textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Cole aqui o texto da fatura (ou envie um PDF na aba ao lado e o texto extraído aparecerá aqui para conferência)..." style={{ width: "100%", minHeight: 160, padding: "11px 13px", background: "var(--fill)", border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 12, outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "monospace" }} />
            <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
              <Btn onClick={() => processarTexto(texto)} style={{ flex: 1 }}><IcoTxt Icon={Search}>Processar texto</IcoTxt></Btn>
              {texto && <Btn variant="ghost" onClick={() => { setTexto(""); setMsg(""); }}>Limpar</Btn>}
            </div>
          </>
        )}

        {modo === "pdf" && texto && !loading && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.subtle, display: "inline-flex", alignItems: "center", gap: 6 }}><FileText size={13} /> Texto extraído do PDF</span>
              <button onClick={() => setModo("texto")} style={{ fontSize: 11, color: C.indigo, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Editar texto →</button>
            </div>
            <p style={{ fontSize: 11, color: C.muted, marginBottom: 8, lineHeight: 1.6 }}>Se a leitura ficou incompleta, confira o texto abaixo. Você pode editá-lo (botão acima) e reprocessar, ou corrigir direto na lista de compras.</p>
            <textarea value={texto} onChange={(e) => setTexto(e.target.value)} style={{ width: "100%", minHeight: 100, padding: "10px 12px", background: "var(--fill-2)", border: `1px solid ${C.border}`, borderRadius: 9, color: C.muted, fontSize: 11, outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "monospace" }} />
            <Btn variant="ghost" onClick={() => processarTexto(texto)} style={{ width: "100%", marginTop: 8 }}><IcoTxt Icon={Search}>Reprocessar este texto</IcoTxt></Btn>
          </div>
        )}

        {msg && <div style={{ marginTop: 12, padding: "9px 12px", background: "var(--fill)", borderRadius: 9, fontSize: 12, color: C.subtle, lineHeight: 1.6 }}>{msg}</div>}

        {aiOn && texto && !loading && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
            <Btn variant="ghost" onClick={lerComIA} disabled={loadingIA} style={{ width: "100%" }}>
              <IcoTxt Icon={Sparkles}>{loadingIA ? "Analisando com IA..." : "Melhorar leitura com IA"}</IcoTxt>
            </Btn>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.subtle, marginTop: 10, cursor: "pointer" }}>
              <input type="checkbox" checked={autoIA} onChange={toggleAutoIA} style={{ width: 15, height: 15, accentColor: "var(--accent)", cursor: "pointer" }} />
              Completar automaticamente com IA quando o total não bater
            </label>
            <p style={{ fontSize: 11, color: C.muted, marginTop: 8, lineHeight: 1.6, display: "flex", gap: 6, alignItems: "flex-start" }}>
              <Lightbulb size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>Envia <strong>só o texto</strong> extraído (o PDF não sai do seu aparelho) para uma IA que não guarda seus dados. Faturas grandes são lidas em partes automaticamente.</span>
            </p>
          </div>
        )}
      </Card>

      {items.length > 0 && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <STitle style={{ margin: 0 }}>Dados do cartão</STitle>
            <span style={{ fontSize: 14, fontWeight: 800, color: C.amber }}>{fmt(totalItens)}</span>
          </div>
          {usaTotalOficial && (
            <div style={{ fontSize: 11, color: C.emerald, marginBottom: 12, lineHeight: 1.5 }}>Valor total oficial da fatura (a soma das compras detalhadas é {fmt(somaItens)}; a diferença de {fmt(totalItens - somaItens)} corresponde a compras que o leitor não detalhou, mas o total do cartão está correto).</div>
          )}
          {cardProfiles && cardProfiles.length > 0 && (
            <Field label="Preencher com um cartão já usado" style={{ marginBottom: 10 }}>
              <Sel value="" onChange={(e) => preencherPerfil((cardProfiles || []).find((p) => p.nome === e.target.value))}>
                <option value="">— selecionar —</option>
                {cardProfiles.map((p) => <option key={p.nome} value={p.nome}>{p.nome}{p.banco ? ` · ${p.banco}` : ""}</option>)}
              </Sel>
            </Field>
          )}
          <div style={{ background: "rgba(99,102,241,0.06)", border: `1px solid rgba(99,102,241,0.25)`, borderRadius: 10, padding: "11px 13px", marginBottom: 10 }}>
            <Field label="Mês de referência da fatura">
              <Inp type="month" value={meta.mesRef} onChange={mf("mesRef")} />
            </Field>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>É em qual mês a fatura entra no app — detectado pela data de vencimento do PDF. <strong style={{ color: C.subtle }}>Independe do mês que você está vendo na tela.</strong> Ajuste se precisar.</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 }}>
            <Field label="Banco / Bandeira"><Inp placeholder="Ex: CAIXA, Nubank..." value={meta.banco} onChange={mf("banco")} /></Field>
            <Field label="Nome do cartão (apelido)"><Inp placeholder="Ex: Visa Infinite" value={meta.nome} onChange={mf("nome")} /></Field>
            <Field label="Limite total (R$)"><MoneyInput placeholder="Ex: 12.200,00" value={meta.limite} onChange={mf("limite")} /></Field>
            <Field label="Dia de vencimento (todo mês)"><Inp type="number" min={1} max={31} placeholder="Ex: 25" value={diaDoVenc(meta.vencimento)} onChange={setVencDia} /></Field>
          </div>
          {meta.vencimento && <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><Calendar size={12} /> Vence todo dia {new Date(meta.vencimento + "T12:00:00").getDate()} de cada mês.</div>}
          {(() => { const portadores = [...new Set(items.map((i) => i.portador).filter(Boolean))]; return portadores.length > 1 ? (
            <div style={{ fontSize: 11, color: C.cyan, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><Users size={12} /> {portadores.length} portadores detectados: {portadores.join(", ")}</div>
          ) : null; })()}
          {parseFloat((meta.limite || "").replace(",", ".")) > 0 && (
            <div style={{ background: "rgba(16,185,129,0.06)", border: `1px solid rgba(16,185,129,0.2)`, borderRadius: 9, padding: "10px 13px", marginBottom: 14, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: C.subtle }}>Limite disponível após esta fatura:</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: C.emerald }}>{fmt((parseFloat((meta.limite || "").replace(",", ".")) || 0) - totalItens)}</span>
            </div>
          )}

          <STitle>Revise as compras ({items.length})</STitle>
          {items.map((it, idx) => (
            <div key={idx} style={{ background: "var(--fill-2)", borderRadius: 11, padding: "11px 13px", marginBottom: 8, border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                <Field label="Descrição" style={{ flex: 1, minWidth: 150 }}><Inp value={it.descricao} onChange={(e) => setItems((p) => p.map((x, i) => (i === idx ? { ...x, descricao: e.target.value } : x)))} /></Field>
                <Field label="Valor R$" style={{ width: 100 }}><MoneyInput value={it.valor} onChange={(e) => setItems((p) => p.map((x, i) => (i === idx ? { ...x, valor: e.target.value } : x)))} /></Field>
                <Field label="Data" style={{ width: 130 }}><Inp type="date" value={it.data} onChange={(e) => setItems((p) => p.map((x, i) => (i === idx ? { ...x, data: e.target.value } : x)))} /></Field>
                <Field label="Categoria" style={{ width: 140 }}>
                  <Sel value={it.categoria} onChange={(e) => setItems((p) => p.map((x, i) => (i === idx ? { ...x, categoria: e.target.value } : x)))}>
                    {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                  </Sel>
                </Field>
                <button aria-label="Remover compra" onClick={() => setItems((p) => p.filter((_, i) => i !== idx))} style={{ padding: "9px 10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, color: C.red, cursor: "pointer", display: "inline-flex" }}><Trash2 size={14} /></button>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
                {it.portador && <span style={{ fontSize: 10, color: C.violet, display: "inline-flex", alignItems: "center", gap: 4 }}><User size={11} /> {it.portador}{it.final ? ` (final ${it.final})` : ""}</span>}
                {it.parcelas > 1 && <span style={{ fontSize: 10, color: C.cyan, display: "inline-flex", alignItems: "center", gap: 4 }}><CreditCard size={11} /> Parcelado: {it.parcelaAtual} de {it.parcelas}</span>}
                {it.valor < 0 && <span style={{ fontSize: 10, color: C.emerald, display: "inline-flex", alignItems: "center", gap: 4 }}><ArrowLeftRight size={11} /> Estorno/ajuste</span>}
              </div>
            </div>
          ))}
          <button onClick={() => setItems((p) => [...p, { descricao: "", valor: "", data: todayStr(), categoria: "outros", parcelas: 1, parcelaAtual: 1, portador: "Titular", final: "" }])} style={{ width: "100%", padding: "10px", background: "rgba(99,102,241,0.08)", border: `1px dashed ${C.indigo}`, borderRadius: 9, color: C.indigo, fontSize: 12, fontWeight: 600, cursor: "pointer", marginBottom: 10 }}>+ Adicionar compra manualmente</button>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "rgba(245,158,11,0.06)", borderRadius: 9, marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: C.subtle }}>Soma das compras ({items.length}):</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: C.amber }}>{fmt(totalItens)}</span>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={confirm} style={{ flex: 1 }}>Salvar cartão com {items.length} compras</Btn>
            <Btn variant="ghost" onClick={() => { setItems([]); setMsg(""); }}>Cancelar</Btn>
          </div>
        </Card>
      )}
    </div>
  );
}
