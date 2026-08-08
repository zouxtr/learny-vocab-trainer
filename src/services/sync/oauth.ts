/**
 * PKCE (RFC 7636) helpers for browser OAuth flows.
 *
 * Used by Dropbox (and reusable by future providers) to authorize a user from
 * a pure client-side app with no server. Implements the "Authorization Code
 * with PKCE" flow: a code challenge is generated locally, exchanged for tokens
 * by the user-agent, and redeemed using the code verifier.
 */

/** Generate a random string of the given length using Web Crypto. */
export async function randomString(length = 64): Promise<string> {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

/** SHA-256 hash of the input, as raw bytes. */
async function sha256(input: string): Promise<ArrayBuffer> {
  const data = new TextEncoder().encode(input);
  return crypto.subtle.digest("SHA-256", data);
}

/** Base64url without padding, as required by the PKCE spec. */
export function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/** Create the S256 code challenge from a verifier. */
export async function createCodeChallenge(verifier: string): Promise<string> {
  return base64UrlEncode(await sha256(verifier));
}

/** Open an OAuth authorize window and wait for the redirect with the code. */
export async function authorizeWithPopup(
  authorizeUrl: (challenge: string) => string,
  verifier: string,
): Promise<string> {
  const challenge = await createCodeChallenge(verifier);
  const url = authorizeUrl(challenge);

  // Popup-based flow: the OAuth server redirects back to the SAME origin the
  // popup was opened from, so we can reach into it and read the `code` query
  // param without a server round-trip.
  return new Promise((resolve, reject) => {
    const width = 600;
    const height = 640;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2.5;

    const popup = window.open(
      url,
      "learny-oauth",
      `width=${width},height=${height},left=${left},top=${top}`,
    );

    if (!popup) {
      reject(new Error("Pop-up blocked — allow pop-ups to connect your account."));
      return;
    }

    const poll = window.setInterval(async () => {
      try {
        if (!popup || popup.closed) {
          window.clearInterval(poll);
          reject(new Error("Authorization was cancelled."));
          return;
        }
        // Same-origin popups permit cross-window reads.
        const href = popup.location.href;
        if (href) {
          const urlObj = new URL(href);
          const code = urlObj.searchParams.get("code");
          if (code) {
            window.clearInterval(poll);
            popup.close();
            resolve(code);
          } else if (urlObj.searchParams.get("error")) {
            window.clearInterval(poll);
            popup.close();
            reject(
              new Error(`Authorization failed: ${urlObj.searchParams.get("error")}`),
            );
          }
        }
      } catch {
        // Cross-origin navigation during OAuth is expected; keep polling.
      }
    }, 300);
  });
}