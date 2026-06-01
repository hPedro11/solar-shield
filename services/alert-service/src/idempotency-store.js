/**
 * idempotency-store.js
 * --------------------------------------------------------------
 * Regra de Negocio 3 (RN3) — Idempotencia.
 * Eventos com mesmo event_id recebidos mais de uma vez devem ser
 * descartados. Cada descarte registra um log de duplicata.
 *
 * Implementacao em memoria (suficiente para o escopo da GS).
 * Em producao real seria Redis SETNX ou tabela com unique index.
 * --------------------------------------------------------------
 */

class IdempotencyStore {
  constructor() {
    this._seen = new Set();      // event_id ja processados
    this._duplicates = [];       // log de duplicatas (event_id + timestamp)
  }

  /**
   * Tenta registrar um event_id como processado.
   * @returns {boolean} true se foi NOVO (deve processar);
   *                    false se ja existia (DUPLICATA — descartar).
   */
  registerIfNew(eventId) {
    if (!eventId) {
      throw new Error('event_id obrigatorio para idempotencia');
    }
    if (this._seen.has(eventId)) {
      this._duplicates.push({
        event_id: eventId,
        detectedAt: new Date().toISOString(),
      });
      console.warn(`[idempotency] DUPLICATA descartada: event_id=${eventId}`);
      return false;
    }
    this._seen.add(eventId);
    return true;
  }

  getDuplicateLog() {
    return [...this._duplicates];
  }

  size() {
    return this._seen.size;
  }

  // util para os testes
  reset() {
    this._seen.clear();
    this._duplicates = [];
  }
}

// Singleton (mesmo store entre consumer e API)
const store = new IdempotencyStore();

module.exports = { IdempotencyStore, store };
