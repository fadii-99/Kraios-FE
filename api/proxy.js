const BACKEND_BASE_URL = 'https://bdf7-182-182-224-98.ngrok-free.app/api/'

function getRequestBody(request) {
  if (request.method === 'GET' || request.method === 'HEAD') {
    return undefined
  }

  if (typeof request.body === 'string' || Buffer.isBuffer(request.body)) {
    return request.body
  }

  if (request.body === undefined || request.body === null) {
    return undefined
  }

  return JSON.stringify(request.body)
}

function getResponseCookies(upstreamResponse) {
  if (typeof upstreamResponse.headers.getSetCookie === 'function') {
    return upstreamResponse.headers.getSetCookie()
  }

  const cookie = upstreamResponse.headers.get('set-cookie')
  return cookie ? [cookie] : []
}

export default async function handler(request, response) {
  const path = Array.isArray(request.query.path)
    ? request.query.path.join('/')
    : request.query.path || ''
  const targetUrl = new URL(path, BACKEND_BASE_URL)

  const requestHeaders = {
    accept: request.headers.accept || 'application/json',
    'ngrok-skip-browser-warning': 'true',
  }

  for (const headerName of [
    'content-type',
    'cookie',
    'origin',
    'referer',
    'x-csrftoken',
  ]) {
    if (request.headers[headerName]) {
      requestHeaders[headerName] = request.headers[headerName]
    }
  }

  const upstreamResponse = await fetch(targetUrl, {
    method: request.method,
    headers: requestHeaders,
    body: getRequestBody(request),
    redirect: 'manual',
  })

  const responseBody = Buffer.from(await upstreamResponse.arrayBuffer())
  const responseCookies = getResponseCookies(upstreamResponse)

  response.status(upstreamResponse.status)
  response.setHeader(
    'content-type',
    upstreamResponse.headers.get('content-type') || 'application/octet-stream',
  )

  if (responseCookies.length > 0) {
    response.setHeader('set-cookie', responseCookies)
  }

  response.send(responseBody)
}
