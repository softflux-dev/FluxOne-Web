export function success(res, data = null, httpStatus = 200) {
  return res.status(httpStatus).json({ success: true, data, error: null })
}

export function error(res, message = 'Request failed', httpStatus = 400) {
  return res.status(httpStatus).json({ success: false, data: null, error: message })
}

export const fail = error

/**
 * Safe controller catch helper: 4xx keeps err.message; 5xx never leaks DB/stack detail.
 */
export function failFromError(res, err, fallbackMessage = 'Internal server error') {
  const status = Number(err?.status || err?.statusCode || 500)
  if (status >= 500) {
    console.error(err)
    return fail(res, fallbackMessage, status)
  }
  return fail(res, err?.message || fallbackMessage, status)
}
