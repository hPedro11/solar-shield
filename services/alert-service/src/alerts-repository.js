/**
 * alerts-repository.js
 * --------------------------------------------------------------
 * Armazenamento dos alertas processados. Em memoria para a GS.
 * --------------------------------------------------------------
 */

class AlertsRepository {
  constructor() {
    this._alerts = [];
  }

  save(alert) {
    this._alerts.push({
      ...alert,
      storedAt: new Date().toISOString(),
    });
  }

  list({ severity } = {}) {
    if (severity) {
      return this._alerts.filter((a) => a.severity === severity);
    }
    return [...this._alerts];
  }

  count() {
    return this._alerts.length;
  }

  reset() {
    this._alerts = [];
  }
}

const repo = new AlertsRepository();

module.exports = { AlertsRepository, repo };
