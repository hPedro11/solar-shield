import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '10s',
  thresholds: {
    http_req_failed: ['rate<0.85'],
    http_req_duration: ['p(95)<500'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export default function () {
  const res = http.get(`${BASE_URL}/api/alerts`);

  check(res, {
    'status 200 ou 429 (rate limit esperado)': (r) => r.status === 200 || r.status === 429,
    'resposta < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(0.1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data),
    'k6-result.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data) {
  const m = data.metrics;
  return `
==============================================
 SOLAR SHIELD — k6 Smoke Test (10 VUs / 10s)
==============================================
 Total requests : ${m.http_reqs.values.count}
 Failed         : ${(m.http_req_failed.values.rate * 100).toFixed(2)}%
 Avg duration   : ${m.http_req_duration.values.avg.toFixed(2)} ms
 p(95) duration : ${m.http_req_duration.values['p(95)'].toFixed(2)} ms
==============================================
`;
}
