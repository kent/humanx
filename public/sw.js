self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const cacheNames = await self.caches.keys().catch(() => []);
    await Promise.all(cacheNames.map((cacheName) => self.caches.delete(cacheName).catch(() => false)));
    await self.registration.unregister().catch(() => false);
    const clients = await self.clients.matchAll({ includeUncontrolled: true, type: "window" }).catch(() => []);
    await Promise.all(clients.map((client) => client.navigate(getRecoveryUrl(client.url)).catch(() => undefined)));
  })());
});

function getRecoveryUrl(value) {
  try {
    const url = new URL(value);
    if (isLegacyPath(url.pathname) || isLegacyRootHandoff(url) || isLegacyHashHandoff(url)) {
      return `${url.origin}/`;
    }
    return url.href;
  } catch {
    return "/";
  }
}

function isLegacyPath(pathname) {
  return /^\/(?:api\/)?(?:auth-callback|auth_callback|connect-wallet|connect_wallet|log-in-with-x|log_in_with_x|login-with-x|login_with_x|oauth-callback|oauth_callback|sign-in-with-x|sign_in_with_x|signin-with-x|signin_with_x|twitter-auth|twitter_auth|twitter-login|twitter_login|twitter-oauth|twitter_oauth|wallet_auth|world-auth|world_auth|world-id-auth|world_id_auth|world-id-login|world_id_login|world-id-sign-in|world_id_sign_in|world-log-in|world_log_in|world-login|world_login|world-sign-in|world_sign_in|world-signin|world_signin|world-wallet-auth|world_wallet_auth|worldid-auth|worldid_auth|worldid-login|worldid_login|worldid-sign-in|worldid_sign_in|x-auth|x_auth|x-login|x_login|x-oauth|x_oauth)(?:\/|$)/i.test(pathname) ||
    /^\/(?:api\/)?(?:world|world-miniapp)\/(?:auth-callback|auth_callback|connect-wallet|connect_wallet|log-in-with-x|log_in_with_x|login-with-x|login_with_x|oauth-callback|oauth_callback|sign-in-with-x|sign_in_with_x|signin-with-x|signin_with_x|twitter-auth|twitter_auth|twitter-login|twitter_login|twitter-oauth|twitter_oauth|wallet_auth|world-auth|world_auth|world-id-auth|world_id_auth|world-id-login|world_id_login|world-id-sign-in|world_id_sign_in|world-log-in|world_log_in|world-login|world_login|world-sign-in|world_sign_in|world-signin|world_signin|world-wallet-auth|world_wallet_auth|worldid-auth|worldid_auth|worldid-login|worldid_login|worldid-sign-in|worldid_sign_in|x-auth|x_auth|x-login|x_login|x-oauth|x_oauth)(?:\/|$)/i.test(pathname) ||
    /^\/(?:api\/)?(?:auth|authenticate|authentication|authorize|authorization|authjs|callback|complete-auth|complete-siwe|complete-wallet-auth|connect|idkit|idkit-rp|log-in|log_in|login|mini-app|miniapp|minikit|mini-kit|next-auth|nonce|oauth|oauth2|proof-session|rp|rp-signature|session|sign|sign-in|sign_in|signin|signature|siwe|twitter|twitter-auth|verify|wallet|wallet-auth|world|world-app|world-auth|world-id|world-miniapp|world-wallet-auth|worldid|x-auth|x-oauth)(?:\/|$)/i.test(pathname) ||
    /^\/(?:api\/)?world\/(?:auth|authenticate|authentication|authorize|authorization|callback|complete-auth|complete-siwe|complete-wallet-auth|connect|idkit|idkit-rp|log-in|log_in|login|minikit|mini-kit|nonce|oauth|oauth2|rp|rp-signature|session|sign|sign-in|sign_in|signature|siwe|verify|wallet|wallet-auth|world-auth|world-id|worldid)(?:\/|$)/i.test(pathname);
}

function isLegacyRootHandoff(url) {
  if (url.pathname !== "/") return false;
  for (const [key, value] of url.searchParams) {
    if (isLegacyRootKey(key) || isLegacyAuthTriggerKey(key) || isLegacyHandoffValue(value)) return true;
  }
  return false;
}

function isLegacyHashHandoff(url) {
  if (!url.hash) return false;
  let value = url.hash.slice(1);
  try {
    value = decodeURIComponent(value);
  } catch {}
  if (isLegacyHandoffValue(value)) return true;
  const query = value.startsWith("?") ? value.slice(1) : value;
  if (!/(?:^|&)[^/?#&=]{1,80}=/.test(query)) return false;
  const params = new URLSearchParams(query);
  for (const [key, paramValue] of params) {
    if (isLegacyRootKey(key) || isLegacyAuthTriggerKey(key) || isLegacyHandoffValue(paramValue)) return true;
  }
  return false;
}

function isLegacyRootKey(key) {
  return /^(?:callback|callbackUrl|callback_url|continue|continueUrl|continue_url|destination|destinationUrl|goto|next|path|pathname|redirect|redirect_uri|redirectUri|redirectUrl|redirect_url|redirectTo|redirect_to|return_to|returnTo|returnUrl|return_url|state|target|to|url)$/i.test(key);
}

function isLegacyAuthTriggerKey(key) {
  const normalized = key.trim().replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/[_\s]+/g, "-").toLowerCase();
  return /^(?:auth|auth-callback|authenticate|authentication|authorize|authorization|connect-wallet|log-in|login|log-in-with-x|login-with-x|sign|signin|sign-in|sign-in-with-x|signin-with-x|wallet|wallet-auth|world-auth|world-id-auth|world-id-login|world-id-sign-in|world-log-in|world-login|world-sign-in|world-signin|world-wallet-auth|miniapp-wallet-auth|minikit|mini-kit|idkit|verify|world-id|worldid|worldid-auth|worldid-login|worldid-sign-in|oauth|oauth2|oauth-callback|siwe|nonce|signature|rp|rp-signature|proof-session|next-auth|authjs|twitter-auth|twitter-login|twitter-oauth|x-auth|x-login|x-oauth)$/.test(normalized);
}

function isLegacyHandoffValue(value) {
  const normalized = value.trim().replace(/\\/g, "/").replace(/^[./]+/, "").toLowerCase();
  return /^(?:api\/)?(?:auth-callback|auth_callback|connect-wallet|connect_wallet|log-in-with-x|log_in_with_x|login-with-x|login_with_x|oauth-callback|oauth_callback|sign-in-with-x|sign_in_with_x|signin-with-x|signin_with_x|twitter-auth|twitter_auth|twitter-login|twitter_login|twitter-oauth|twitter_oauth|wallet_auth|world-auth|world_auth|world-id-auth|world_id_auth|world-id-login|world_id_login|world-id-sign-in|world_id_sign_in|world-log-in|world_log_in|world-login|world_login|world-sign-in|world_sign_in|world-signin|world_signin|world-wallet-auth|world_wallet_auth|worldid-auth|worldid_auth|worldid-login|worldid_login|worldid-sign-in|worldid_sign_in|x-auth|x_auth|x-login|x_login|x-oauth|x_oauth)(?:\/|$)/.test(normalized) ||
    /^(?:api\/)?(?:world|world-miniapp)\/(?:auth-callback|auth_callback|connect-wallet|connect_wallet|log-in-with-x|log_in_with_x|login-with-x|login_with_x|oauth-callback|oauth_callback|sign-in-with-x|sign_in_with_x|signin-with-x|signin_with_x|twitter-auth|twitter_auth|twitter-login|twitter_login|twitter-oauth|twitter_oauth|wallet_auth|world-auth|world_auth|world-id-auth|world_id_auth|world-id-login|world_id_login|world-id-sign-in|world_id_sign_in|world-log-in|world_log_in|world-login|world_login|world-sign-in|world_sign_in|world-signin|world_signin|world-wallet-auth|world_wallet_auth|worldid-auth|worldid_auth|worldid-login|worldid_login|worldid-sign-in|worldid_sign_in|x-auth|x_auth|x-login|x_login|x-oauth|x_oauth)(?:\/|$)/.test(normalized) ||
    /^(?:api\/)?(?:auth|authenticate|authentication|authorize|authorization|authjs|callback|complete-auth|complete-siwe|complete-wallet-auth|connect|idkit|idkit-rp|log-in|log_in|login|minikit|mini-kit|next-auth|nonce|oauth|oauth2|proof-session|rp|rp-signature|session|sign|sign-in|sign_in|signin|signature|siwe|twitter|twitter-auth|verify|wallet|wallet-auth|world-app|world-auth|world-id|world-miniapp|world-wallet-auth|worldid|x-auth|x-oauth)(?:\/|$)/.test(normalized) ||
    /^(?:api\/)?world\/(?:auth|authenticate|authentication|authorize|authorization|callback|complete-auth|complete-siwe|complete-wallet-auth|connect|idkit|idkit-rp|log-in|log_in|login|minikit|mini-kit|nonce|oauth|oauth2|rp|rp-signature|session|sign|sign-in|sign_in|signature|siwe|verify|wallet|wallet-auth|world-auth|world-id|worldid)(?:\/|$)/.test(normalized) ||
    /^(?:worldapp|worldcoin):/i.test(normalized) ||
    /^(?:x\.com|twitter\.com|api\.twitter\.com|world\.org|worldcoin\.org|auth\.)/i.test(normalized);
}
