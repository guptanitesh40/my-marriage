/**
 * The API's session cookie. The web app only checks whether it is present,
 * to skip asking the API about visitors who cannot be signed in; it never
 * reads its value — the API alone decides whether a session is valid.
 */
export const SESSION_COOKIE = 'mm_session';
