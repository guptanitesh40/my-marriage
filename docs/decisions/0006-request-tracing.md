# 0006 — Request tracing

Date: 2026-11-19 · Status: accepted

The owner asked to see how each request travels through the code: which
functions it went through, what each was given and returned, where an error
happened, and the response sent back.

## What it does

Each request (and each worker job) gets a trace. Every call to a method of a
`@Traced()` class, every MongoDB query, the controller (through
`TraceInterceptor`) and the response are recorded as a tree, in the order
they happened, with timings. When the request ends the access log writes
the trace as one entry under the request's line, so concurrent requests
never mix their steps. Example (development):

```
POST /api/v1/weddings → 409 in 31ms  req_…
  ├─ SessionAuthGuard.canActivate([ExecutionContextHost])  4.6ms → true
  │  └─ SessionsService.authenticate([string ×43])  4.5ms → { user: { … } }
  │     ├─ db auth_sessions.findOne { sessionHash: '[REDACTED]' }, {}
  │     └─ db users.findOne { _id: '…' }, {}
  └─ WeddingsController.create({ params: {}, query: {}, body: { … } })  25ms ✗ ConflictException 409
     └─ WeddingsService.create(…)  24ms ✗ ConflictException 409 OWNER_ACTIVE_LIMIT: …
        └─ db wedding_memberships.findOne { userId: '…', role: 'owner', … }
  response { error: { code: 'OWNER_ACTIVE_LIMIT', … }, requestId: 'req_…' }
```

`LOG_TRACE` chooses how much:

| Mode     | Default in  | Logs                                                                                               |
| -------- | ----------- | -------------------------------------------------------------------------------------------------- |
| `full`   | development | every request, with arguments, results, queries and response                                       |
| `errors` | production  | requests that failed (4xx and 5xx) and failed jobs: names, timings, error type and code, no values |
| `off`    | tests       | the one access-log line per request, as before                                                     |

## Decisions

- **No Morgan.** Morgan writes one line per request from the outside
  (method, URL, status, time), which `accessLog` already does. It cannot see
  inside the application, which is what was asked for. No new dependency:
  the tracer is built on `AsyncLocalStorage`, Nest's logger and Mongoose's
  `debug` hook.
- **Opt-in by decorator, not automatic.** `@Traced()` on a class wraps its
  methods. Wrapping every provider automatically would also wrap Nest's and
  libraries' internals. Controllers are not decorated: the interceptor
  records them with the request and the response.
- **Secrets are masked whatever the mode.** Values whose key contains
  `password`, `token`, `secret`, `cookie`, `authorization`, `apikey` or `hash`,
  and email bodies (`html`, `text`, which carry secret links), are logged as
  `[REDACTED]`. A string passed on its own, or returned, may be a raw token,
  a password or its hash, with no key to tell, so only its length is shown
  (`[string ×43]`), except MongoDB IDs. Values are cut short (strings 200
  characters, arrays 10 items, depth 4).
- **No values in production.** `full` logs names and email addresses, which
  are personal data; `errors` logs only the path, so it is safe to leave on.
  `full` can still be turned on in staging to investigate, and should be
  turned off again.
- **Bounded.** A trace holds at most 400 steps; more are counted, not kept.

## Limits

- A query's duration is not known (Mongoose's hook fires when it starts);
  the enclosing function's timing covers it.
- Work started after the response (background tasks) belongs to the trace
  but finishes after it is logged; it shows as "(did not finish)".
