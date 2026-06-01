function classifyByKp(kpIndex) {
  // Validacao defensiva — Kp valido eh um numero entre 0 e 9
  if (kpIndex === null || kpIndex === undefined || isNaN(Number(kpIndex))) {
    throw new Error('Invalid Kp index: must be a number');
  }
  const kp = Number(kpIndex);

  let severity;
  if (kp <= 4) {
    severity = 'low';
  } else if (kp <= 7) {
    severity = 'moderate';
  } else {
    severity = 'severe';
  }

  return {
    kpIndex: kp,
    severity,
    emergencyNotification: severity === 'severe',
  };
}

function buildAlertFromGstEvent(gstEvent) {
  const eventId = gstEvent.gstID;
  const kpEntries = gstEvent.allKpIndex || [];

  // Se nao tem leituras de Kp, registra como low por defeito (defensivo)
  const maxKp = kpEntries.length
    ? Math.max(...kpEntries.map(e => Number(e.kpIndex)))
    : 0;

  const classification = classifyByKp(maxKp);

  return {
    event_id: eventId,
    source: 'DONKI/GST',
    observedTime: gstEvent.startTime || null,
    ...classification,
    rawLink: gstEvent.link || null,
    ingestedAt: new Date().toISOString(),
  };
}

module.exports = { classifyByKp, buildAlertFromGstEvent };
