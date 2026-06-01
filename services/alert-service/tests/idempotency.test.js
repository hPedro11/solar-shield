/**
 * idempotency.test.js — Testes unitarios da RN3
 * --------------------------------------------------------------
 * RN3: Eventos com mesmo event_id recebidos mais de uma vez
 * devem ser descartados. Registrar log de duplicata.
 * --------------------------------------------------------------
 */

const { IdempotencyStore } = require('../src/idempotency-store');

describe('RN3 — Idempotencia por event_id', () => {
  let store;

  beforeEach(() => {
    store = new IdempotencyStore();
  });

  // ------- TESTE UNITARIO 1: 1a ocorrencia eh aceita -------
  test('primeira ocorrencia de um event_id deve ser registrada como NOVA', () => {
    const isNew = store.registerIfNew('GST-001');
    expect(isNew).toBe(true);
    expect(store.size()).toBe(1);
    expect(store.getDuplicateLog()).toHaveLength(0);
  });

  // ------- TESTE UNITARIO 2: 2a ocorrencia eh descartada e logada -------
  test('segunda ocorrencia do mesmo event_id deve ser descartada e logada', () => {
    store.registerIfNew('GST-001');
    const secondCall = store.registerIfNew('GST-001');

    expect(secondCall).toBe(false);
    expect(store.size()).toBe(1); // continua 1, nao duplicou
    const dups = store.getDuplicateLog();
    expect(dups).toHaveLength(1);
    expect(dups[0].event_id).toBe('GST-001');
    expect(dups[0].detectedAt).toBeDefined();
  });

  // ------- TESTE UNITARIO 3: N duplicatas + event_ids diferentes -------
  test('multiplas duplicatas sao todas logadas; event_ids distintos sao independentes', () => {
    store.registerIfNew('GST-A');
    store.registerIfNew('GST-B');

    // 3 duplicatas de GST-A
    store.registerIfNew('GST-A');
    store.registerIfNew('GST-A');
    store.registerIfNew('GST-A');

    expect(store.size()).toBe(2);                  // A e B unicos
    expect(store.getDuplicateLog()).toHaveLength(3); // 3 dups de A
    expect(store.getDuplicateLog().every(d => d.event_id === 'GST-A')).toBe(true);
  });

  test('event_id vazio ou nulo deve lancar erro', () => {
    expect(() => store.registerIfNew(null)).toThrow();
    expect(() => store.registerIfNew('')).toThrow();
    expect(() => store.registerIfNew(undefined)).toThrow();
  });
});
