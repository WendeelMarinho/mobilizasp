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
  return truncate(JSON.stringify(arr, null, 0));
}

export function formatPosicao(linha: string, data: any) {
  const qtd = Array.isArray(data?.vs) ? data.vs.length : (Array.isArray(data?.l?.[0]?.vs) ? data.l[0].vs.length : 0);
  const head = `Posição da linha ${linha} — veículos: ${qtd}`;
  return head + '\n' + truncate(JSON.stringify(data));
}

export function formatPrevisao(parada: string, linha: string | undefined, data: any) {
  // A API às vezes vem como data.p.l[], às vezes data.l[]
  const linhas = Array.isArray(data?.p?.l) ? data.p.l.length : (Array.isArray(data?.l) ? data.l.length : 0);
  const label = linha ? `parada ${parada} / linha ${linha}` : `parada ${parada}`;
  if (!linhas) {
    return `Previsão para ${label} — nenhuma previsão no momento.\nSe for linha específica, pode não atender esse ponto agora.`;
  }
  return `Previsão para ${label} — linhas no payload: ${linhas}\n${truncate(JSON.stringify(data))}`;
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
