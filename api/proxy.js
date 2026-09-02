const BACKEND_BASE_URL = 'http://127.0.0.1:8000/api/'

/**
 * Vercel's body parser is OFF for this function, deliberately.
 *
 * The project API sends multipart uploads — a floor plan, a canvas mask, a
 * supporting document — and a parsed body cannot be forwarded as multipart:
 * re-serializing it loses the boundary, so the upstream sees a malformed
 * request. Reading the raw stream forwards every content type byte for byte,
 * JSON included.
 */
export const config = {
  api: {
    bodyParser: false,
  },
}

function readRawBody(request) {
  if (request.method === 'GET' || request.method === 'HEAD') {
    return Promise.resolve(undefined)
  }

  return new Promise((resolve, reject) => {
    const chunks = []
    request.on('data', (chunk) => chunks.push(chunk))
    request.on('end', () => {
      const body = Buffer.concat(chunks)
      resolve(body.length > 0 ? body : undefined)
    })
    request.on('error', reject)
  })
}

function getResponseCookies(upstreamResponse) {
  if (typeof upstreamResponse.headers.getSetCookie === 'function') {
    return upstreamResponse.headers.getSetCookie()
  }

  const cookie = upstreamResponse.headers.get('set-cookie')
  return cookie ? [cookie] : []
}

/**
 * Response headers worth passing back.
 *
 * `content-disposition` matters as much as `content-type`: CSV and ZIP
 * downloads carry their filename in it, and dropping it left the browser
 * naming every deliverable after the proxy route.
 */
const FORWARDED_RESPONSE_HEADERS = [
  'content-type',
  'content-disposition',
  'content-length',
  'cache-control',
  'etag',
  'last-modified',
]

export default async function handler(request, response) {
  const path = Array.isArray(request.query.path)
    ? request.query.path.join('/')
    : request.query.path || ''
  const targetUrl = new URL(path, BACKEND_BASE_URL)

  // Query strings are part of the contract too — `?kind=THREE_D_IMAGE` on the
  // assets endpoint, for one — and are not carried by the rewrite's `path`.
  const queryIndex = request.url.indexOf('?')
  if (queryIndex !== -1) {
    const incoming = new URLSearchParams(request.url.slice(queryIndex + 1))
    incoming.delete('path')
    incoming.forEach((value, key) => targetUrl.searchParams.append(key, value))
  }

  const requestHeaders = {
    accept: request.headers.accept || 'application/json',
    'ngrok-skip-browser-warning': 'true',
  }

  for (const headerName of [
    'content-type',
    'content-length',
    'cookie',
    'origin',
    'referer',
    'x-csrftoken',
  ]) {
    if (request.headers[headerName]) {
      requestHeaders[headerName] = request.headers[headerName]
    }
  }

  let body
  try {
    body = await readRawBody(request)
  } catch {
    response.status(400).json({ detail: 'The request body could not be read.' })
    return
  }

  // `content-length` is recomputed by fetch from the body we actually send.
  delete requestHeaders['content-length']

  let upstreamResponse
  try {
    upstreamResponse = await fetch(targetUrl, {
      method: request.method,
      headers: requestHeaders,
      body,
      redirect: 'manual',
    })
  } catch {
    response.status(502).json({ detail: 'The Kraios API could not be reached.' })
    return
  }

  const responseBody = Buffer.from(await upstreamResponse.arrayBuffer())
  const responseCookies = getResponseCookies(upstreamResponse)

  response.status(upstreamResponse.status)

  for (const headerName of FORWARDED_RESPONSE_HEADERS) {
    const value = upstreamResponse.headers.get(headerName)
    if (value) response.setHeader(headerName, value)
  }

  if (!upstreamResponse.headers.get('content-type')) {
    response.setHeader('content-type', 'application/octet-stream')
  }

  if (responseCookies.length > 0) {
    response.setHeader('set-cookie', responseCookies)
  }

  response.send(responseBody)
}
