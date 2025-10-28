// src/services/formatters.service.ts

export function formatAjuda() {
  return [
    'Exemplos:',
    '- quando chega 701U-10 no ponto 340015345?',
    '- posição 477P',
    '- linha 701U',
    '- rota Av Paulista 1000 até Terminal Jabaquara'
  ].join('\n');
}

export function truncate(str: string, max = 1200) {
  const s = String(str);
  return s.length > max ? s.slice(0, max) + '…' : s;
}

export function formatLinha(termo: string, data: any) {
  const arr = Array.isArray(data) ? data : [];
  if (!arr.length) return `Nenhuma linha encontrada para "${termo}".`;

  const lines = arr.slice(0, 10).map((l: any) => {
    const lt = l.lt || '';
    const tl = l.tl ? `-${l.tl}` : '';
    const tp = l.tp || '';
    const ts = l.ts || '';
    return `*${lt}${tl}* ${tp} → ${ts}`;
  });

  return `Linhas encontradas para "${termo}":\n\n${lines.join('\n')}`;
}

export function formatPosicao(linha: string, data: any) {
  const qtd = Array.isArray(data?.vs) ? data.vs.length : (Array.isArray(data?.l?.[0]?.vs) ? data.l[0].vs.length : 0);
  
  if (qtd === 0) {
    return `Não há veículos da linha ${linha} em circulação no momento.`;
  }

  const vehicles = Array.isArray(data?.vs) ? data.vs : (Array.isArray(data?.l?.[0]?.vs) ? data.l[0].vs : []);
  const positions = vehicles.map((v: any, idx: number) => {
    const p = v.p || 'N/A';
    const a = v.a ? ' (alerta)' : '';
    return `${idx + 1}. Ônibus ${p}${a}`;
  });

  return `*Linha ${linha}* — ${qtd} veículo(s)\n\n${positions.join('\n')}`;
}

export function formatPrevisao(parada: string, linha: string | undefined, data: any) {
  // A API às vezes vem como data.p.l[], às vezes data.l[]
  const linhas = Array.isArray(data?.p?.l) ? data.p.l : (Array.isArray(data?.l) ? data.l : []);
  
  if (!linhas.length) {
    const label = linha ? `linha ${linha} na parada ${parada}` : `parada ${parada}`;
    return `Não encontrei previsão para ${label} agora.\nSe for linha específica, pode não atender esse ponto.`;
  }

  const previsoes = linhas.map((l: any, idx: number) => {
    const lineCode = l.c || l.lt || 'N/A';
    const dest = l.lt0 || l.lt1 || '';
    const arrivals = Array.isArray(l.vs) ? l.vs : [];
    
    if (arrivals.length === 0) {
      return `${lineCode} ${dest} — sem previsão`;
    }

    const times = arrivals.map((v: any) => {
      const t = v.t || '';
      const p = v.p || '';
      return `chega em ${t}min (veículo ${p})`;
    });

    return `*${lineCode}* ${dest}\n${times.join(', ')}`;
  });

  const header = linha 
    ? `Previsão — Linha ${linha} na parada ${parada}`
    : `Previsão — Parada ${parada}`;

  return `${header}\n\n${previsoes.join('\n\n')}`;
}

/* -------------------------- Google Directions --------------------------- */

export function formatRota(origem: string, destino: string, data: any) {
  const route = data?.routes?.[0];
  const leg = route?.legs?.[0];
  if (!route || !leg) return `Não encontrei rota de ônibus entre "${origem}" e "${destino}".`;

  const dur = leg.duration?.text || '';
  const dist = leg.distance?.text || '';
  const steps = Array.isArray(leg.steps) ? leg.steps : [];

  const linhas = steps
    .filter((s: any) => s?.transit_details)
    .map((s: any) => {
      const td = s.transit_details;
      const headsign = td?.headsign ? ` (${td.headsign})` : '';
      const agency = td?.line?.agencies?.[0]?.name ? ` • ${td.line.agencies[0].name}` : '';
      const num = td?.line?.short_name || td?.line?.name || 'ônibus';
      const dep = td?.departure_stop?.name || '';
      const arr = td?.arrival_stop?.name || '';
      const when = td?.arrival_time?.text ? ` — chega ${td.arrival_time.text}` : '';
      return `• ${num}${headsign}${agency}\n  de: ${dep}\n  até: ${arr}${when}`;
    });

  const header = `Rota (transporte público) — ${dur}, ${dist}\n${origem} → ${destino}`;
  const body = linhas.length ? linhas.join('\n') : '(sem detalhes de ônibus nos passos)';
  return `${header}\n${body}`;
}
