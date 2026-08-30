# Frontend Profile Integration Guide

This guide covers the authenticated Profile, Change Password, and Delete Account
flows. All URLs below are relative to the API base URL:

```text
/api/v1
```

Use the existing API client in `src/lib/api/client.js`. It already sends browser
cookies with `credentials: 'include'` and obtains/sends the CSRF token.

Do not store access or refresh tokens in `localStorage`, `sessionStorage`, or
application state. Authentication is handled by HttpOnly cookies.

## Shared request rules

For every `POST`, `PATCH`, or `DELETE` request:

1. Send `credentials: 'include'`.
2. Send JSON with `Content-Type: application/json` unless uploading a file.
3. Send `X-CSRFToken` using the existing API client's CSRF helper.
4. On `401`, clear frontend auth state and redirect to `/login`.

With the existing client, call:

```js
import { apiClient } from '../lib/api/client'
```

The examples below assume that `apiClient` is used.

## 1. Profile view

### Fetch current profile

```http
GET /api/v1/profile/
```

Example:

```js
const profile = await apiClient('/profile/')
```

Response example:

```json
{
  "id": 12,
  "email": "architect@example.com",
  "full_name": "Ayesha Khan",
  "firm_name": "Khan Architecture",
  "country": "Pakistan",
  "job_title": "Principal Architect",
  "phone": "+92-300-0000000",
  "role": "Architect Account",
  "date_joined": "2026-08-29T10:00:00Z"
}
```

### Edit profile

```http
PATCH /api/v1/profile/
```

Allowed editable fields:

```js
{
  full_name,
  firm_name,
  country,
  job_title,
  phone,
}
```

`email`, `role`, `id`, and `date_joined` are read-only. Do not show email as an
editable field in the UI.

Example:

```js
const updatedProfile = await apiClient('/profile/', {
  method: 'PATCH',
  body: {
    full_name: form.fullName,
    firm_name: form.firmName,
    country: form.country,
    job_title: form.jobTitle,
    phone: form.phone,
  },
})
```

After success, replace the profile in React state with `updatedProfile` and show
a success toast.

## 2. Change password with OTP

This is an authenticated **change password** flow. It requires the current
password. It is not a public “forgot password” flow.

### Screen A: request OTP

```http
POST /api/v1/profile/password-change/request/
```

Request body:

```json
{
  "current_password": "CurrentPassword",
  "new_password": "NewStrongPassword"
}
```

Example:

```js
const result = await apiClient('/profile/password-change/request/', {
  method: 'POST',
  body: {
    current_password: form.currentPassword,
    new_password: form.newPassword,
  },
})

sessionStorage.setItem('passwordChangeVerificationId', result.verification_id)
```

Success response: HTTP `202`.

```json
{
  "detail": "A verification code has been sent to your email.",
  "verification_id": "uuid-value",
  "expires_at": "2026-08-29T12:10:00Z"
}
```

Navigate to an OTP screen. Keep only `verification_id` temporarily; never keep
the current or new password after this request succeeds. The OTP expires in 10
minutes.

### Screen B: confirm OTP

```http
POST /api/v1/profile/password-change/confirm/
```

Request body:

```json
{
  "verification_id": "uuid-value",
  "otp": "123456"
}
```

Example:

```js
await apiClient('/profile/password-change/confirm/', {
  method: 'POST',
  body: {
    verification_id: sessionStorage.getItem('passwordChangeVerificationId'),
    otp: form.otp,
  },
})

sessionStorage.removeItem('passwordChangeVerificationId')
clearCurrentUserState()
navigate('/login', { replace: true })
```

Success response: HTTP `200`.

```json
{
  "detail": "Password changed successfully. Please log in again."
}
```

The backend revokes the session and clears cookies. Always redirect to login
after a successful password change.

## 3. Delete account with OTP

Show a clear destructive confirmation modal. Explain that projects, files,
generation history, and account data will be permanently deleted.

### Screen A: request deletion OTP

```http
POST /api/v1/profile/delete-account/request/
```

Request body:

```json
{
  "current_password": "CurrentPassword"
}
```

Example:

```js
const result = await apiClient('/profile/delete-account/request/', {
  method: 'POST',
  body: { current_password: form.currentPassword },
})

sessionStorage.setItem('deleteAccountVerificationId', result.verification_id)
```

Success response: HTTP `202`; then open the OTP confirmation step.

### Screen B: confirm deletion OTP

```http
POST /api/v1/profile/delete-account/confirm/
```

Request body:

```json
{
  "verification_id": "uuid-value",
  "otp": "123456"
}
```

Example:

```js
await apiClient('/profile/delete-account/confirm/', {
  method: 'POST',
  body: {
    verification_id: sessionStorage.getItem('deleteAccountVerificationId'),
    otp: form.otp,
  },
})

sessionStorage.removeItem('deleteAccountVerificationId')
clearCurrentUserState()
navigate('/', { replace: true })
```

Success response: HTTP `204 No Content`. Do not call `response.json()` for this
response. The backend deletes the user, owned projects, database records, and
stored project files, then clears authentication cookies.

## Error handling

Use the error message from `error.message`; the existing `apiClient` already
converts backend JSON errors into safe user messages.

| Status | Meaning | Frontend behavior |
| --- | --- | --- |
| `400` | Invalid input, weak password, invalid/expired/wrong OTP | Show field or form error; keep OTP screen open |
| `401` | Login session is missing/expired | Clear auth state and redirect to `/login` |
| `429` | Too many OTP requests | Disable resend/request button and show retry-later message |
| `500` | Server/email-provider failure | Show generic error and allow retry |

Important OTP behavior:

- OTP is six digits.
- It expires after 10 minutes.
- A new request invalidates the previous OTP for that same action.
- Maximum five incorrect OTP attempts are allowed.
- OTP request endpoints are rate-limited to five requests per hour per user.

## Suggested frontend routes

```text
/profile
/profile/edit
/profile/change-password
/profile/change-password/verify
/profile/delete-account
/profile/delete-account/verify
```

Keep the profile form separate from the password and deletion forms. Never send
password fields in the profile `PATCH` request.

