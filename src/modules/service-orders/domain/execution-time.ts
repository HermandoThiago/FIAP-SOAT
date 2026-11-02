/** Uma OS finalizada: do início da execução (`EM_EXECUCAO`) até `FINALIZADA`. */
export interface ExecutionSample {
  serviceOrderId: string;
  startedAt: Date;
  completedAt: Date;
}

const MS_PER_MINUTE = 60_000;

const round2 = (value: number) => Math.round(value * 100) / 100;

export function executionMinutes(sample: ExecutionSample): number {
  return (
    (sample.completedAt.getTime() - sample.startedAt.getTime()) / MS_PER_MINUTE
  );
}

/** Média em minutos (2 casas) ou `null` quando não há nenhuma OS finalizada no período. */
export function averageExecutionMinutes(
  samples: ExecutionSample[],
): number | null {
  if (samples.length === 0) return null;

  const total = samples.reduce((sum, s) => sum + executionMinutes(s), 0);
  return round2(total / samples.length);
}

/**
 * Pareia o primeiro `EM_EXECUCAO` com o último `FINALIZADA` de cada OS (o status só avança, então há
 * um de cada). OS sem início registrado ou com datas incoerentes ficam fora da média.
 */
export function buildExecutionSamples(
  starts: { serviceOrderId: string; at: Date }[],
  completions: { serviceOrderId: string; at: Date }[],
): ExecutionSample[] {
  const startedAt = new Map<string, Date>();
  for (const { serviceOrderId, at } of starts) {
    const current = startedAt.get(serviceOrderId);
    if (!current || at < current) startedAt.set(serviceOrderId, at);
  }

  const completedAt = new Map<string, Date>();
  for (const { serviceOrderId, at } of completions) {
    const current = completedAt.get(serviceOrderId);
    if (!current || at > current) completedAt.set(serviceOrderId, at);
  }

  const samples: ExecutionSample[] = [];
  for (const [serviceOrderId, completed] of completedAt) {
    const started = startedAt.get(serviceOrderId);
    if (started && completed >= started) {
      samples.push({
        serviceOrderId,
        startedAt: started,
        completedAt: completed,
      });
    }
  }
  return samples;
}
