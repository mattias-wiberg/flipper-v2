// Auth session-cookie helpers for the black-box session-refresh check.
//
// @supabase/ssr stores the session JSON in `sb-<project-ref>-auth-token`,
// base64url-encoded with a `base64-` prefix, and splits it into `.0`, `.1`, ...
// chunks when the URI-encoded value exceeds 3180 characters. These helpers
// decode a browser's real cookies, age the access token, and re-encode the
// same session so the deployed session proxy has to refresh it.
const BASE64_PREFIX = "base64-";
const MAX_CHUNK_SIZE = 3180;
const AUTH_COOKIE_NAME = /^sb-[A-Za-z0-9_-]+-auth-token$/;

function baseCookieName(name) {
  return name.replace(/\.[0-9]+$/, "");
}

function decodeSessionValue(value) {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }
  let json = value;
  if (value.startsWith(BASE64_PREFIX)) {
    try {
      json = Buffer.from(
        value.slice(BASE64_PREFIX.length),
        "base64url",
      ).toString("utf8");
    } catch {
      return null;
    }
  }
  try {
    const session = JSON.parse(json);
    return session && typeof session === "object" ? session : null;
  } catch {
    return null;
  }
}

/**
 * Combine a browser cookie list into `{ name, value, session }` for the auth
 * session, or null when the session is absent or unreadable.
 */
function readSessionCookie(cookies) {
  const isBaseName = (name) => AUTH_COOKIE_NAME.test(name);
  const baseNames = [
    ...new Set(
      cookies.map(({ name }) => baseCookieName(name)).filter(isBaseName),
    ),
  ];
  if (baseNames.length !== 1) {
    return null;
  }
  const name = baseNames[0];
  const values = new Map(cookies.map(({ name: key, value }) => [key, value]));

  let value = values.get(name) ?? "";
  if (!value) {
    const chunks = [];
    for (let index = 0; ; index += 1) {
      const chunk = values.get(`${name}.${index}`);
      if (!chunk) {
        break;
      }
      chunks.push(chunk);
    }
    value = chunks.join("");
  }
  if (!value) {
    return null;
  }

  const session = decodeSessionValue(value);
  return session ? { name, value, session } : null;
}

/**
 * The browser cookie that carries the session's attributes. Any chunk works:
 * @supabase/ssr writes the same attributes on every chunk.
 */
function findSessionCookie(cookies, name) {
  return cookies.find((cookie) => baseCookieName(cookie.name) === name);
}

/**
 * Encode a session back into the cookie name(s) @supabase/ssr reads.
 */
function encodeSessionCookies(name, session, chunkSize = MAX_CHUNK_SIZE) {
  const encoded =
    BASE64_PREFIX +
    Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  let encodedValue = encodeURIComponent(encoded);
  if (encodedValue.length <= chunkSize) {
    return [{ name, value: encoded }];
  }

  const chunks = [];
  while (encodedValue.length > 0) {
    let head = encodedValue.slice(0, chunkSize);
    const lastEscape = head.lastIndexOf("%");
    if (lastEscape > chunkSize - 3) {
      head = head.slice(0, lastEscape);
    }
    let valueHead = "";
    while (head.length > 0) {
      try {
        valueHead = decodeURIComponent(head);
        break;
      } catch {
        if (head.at(-3) === "%" && head.length > 3) {
          head = head.slice(0, -3);
        } else {
          throw new Error("could not split the session cookie");
        }
      }
    }
    chunks.push(valueHead);
    encodedValue = encodedValue.slice(head.length);
  }

  return chunks.map((value, index) => ({ name: `${name}.${index}`, value }));
}

function accessTokenExpiry(session) {
  return typeof session?.expires_at === "number" ? session.expires_at : null;
}

/**
 * Copy of the session whose access token is already past expiry, with the real
 * refresh token intact: the deployed middleware must refresh it.
 */
function ageSession(session, nowMs = Date.now()) {
  return {
    ...session,
    expires_at: Math.floor(nowMs / 1000) - 60,
    expires_in: 0,
  };
}

module.exports = {
  accessTokenExpiry,
  ageSession,
  decodeSessionValue,
  encodeSessionCookies,
  findSessionCookie,
  readSessionCookie,
};
