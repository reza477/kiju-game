// Browser-test observation only. Embedded GLB images use same-origin blob URLs.
// Unknown protocols, opaque origins and external blobs remain external requests.
export function classifyCarrierRequest(requestUrl, baseUrl) {
  try {
    const request = new URL(requestUrl), base = new URL(baseUrl);
    if (request.origin !== base.origin || base.origin === 'null') return 'external';
    if (request.protocol === 'blob:') return 'same-origin-blob';
    if (request.protocol === 'http:' || request.protocol === 'https:') return 'same-origin-network';
  } catch {}
  return 'external';
}
