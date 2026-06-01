const { classifyByKp, buildAlertFromGstEvent } = require('../src/classifier');

describe('RN1 — Classificacao de severidade por indice Kp', () => {

  //  TESTE UNITARIO 1: classificacao "low" 
  test('Kp <= 4 deve classificar como "low" e emergencyNotification = false', () => {
    expect(classifyByKp(0)).toEqual({
      kpIndex: 0, severity: 'low', emergencyNotification: false,
    });
    expect(classifyByKp(4)).toEqual({
      kpIndex: 4, severity: 'low', emergencyNotification: false,
    });
  });

  //  TESTE UNITARIO 2: classificacao "moderate" 
  test('Kp entre 5 e 7 deve classificar como "moderate"', () => {
    expect(classifyByKp(5).severity).toBe('moderate');
    expect(classifyByKp(5).emergencyNotification).toBe(false);
    expect(classifyByKp(7).severity).toBe('moderate');
    expect(classifyByKp(7).emergencyNotification).toBe(false);
  });

  //  TESTE UNITARIO 3: classificacao "severe" + emergencyNotification
  test('Kp >= 8 deve classificar como "severe" e setar emergencyNotification = true', () => {
    expect(classifyByKp(8)).toEqual({
      kpIndex: 8, severity: 'severe', emergencyNotification: true,
    });
    expect(classifyByKp(9)).toEqual({
      kpIndex: 9, severity: 'severe', emergencyNotification: true,
    });
  });

  test('Kp invalido deve lancar erro', () => {
    expect(() => classifyByKp(null)).toThrow();
    expect(() => classifyByKp('abc')).toThrow();
    expect(() => classifyByKp(undefined)).toThrow();
  });

  test('buildAlertFromGstEvent usa o MAIOR Kp do array allKpIndex', () => {
    const gstEvent = {
      gstID: '2024-05-10T17:00:00-GST-001',
      startTime: '2024-05-10T17:00Z',
      allKpIndex: [
        { kpIndex: 4 },
        { kpIndex: 8 },
        { kpIndex: 6 },
      ],
      link: 'https://kauai.ccmc.gsfc.nasa.gov/...',
    };
    const alert = buildAlertFromGstEvent(gstEvent);
    expect(alert.event_id).toBe('2024-05-10T17:00:00-GST-001');
    expect(alert.kpIndex).toBe(8);
    expect(alert.severity).toBe('severe');
    expect(alert.emergencyNotification).toBe(true);
  });
});
