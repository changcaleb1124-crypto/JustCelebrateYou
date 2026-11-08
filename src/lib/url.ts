/**
 * Application URL and Base URL resolution utility.
 *
 * Ensures consistent, canonical URL generation across all sharing,
 * contributor invitation, and celebration gifting controls.
 */

export const PRODUCTION_DOMAIN = 'https://justcelebrateyou.com';
export const LOCAL_DEV_FALLBACK = 'http://localhost:3000';

function isLocalhost(urlOrHost: string): boolean {
    return (
        urlOrHost.includes('localhost') ||
        urlOrHost.includes('127.0.0.1') ||
        urlOrHost.includes('0.0.0.0') ||
        urlOrHost.includes('[::1]')
    );
}

function normalizeUrl(url: string): string {
    let normalized = url.trim();
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
        normalized = `https://${normalized}`;
    }
    return normalized.replace(/\/+$/, '');
}

/**
 * Determines whether the current execution is in a production or live cloud environment.
 */
function isProductionEnvironment(): boolean {
    return (
        process.env.NODE_ENV === 'production' ||
        process.env.VERCEL_ENV === 'production' ||
        process.env.VERCEL === '1'
    );
}

/**
 * Resolves the host and protocol from an incoming HTTP Request.
 * Safely handles proxy headers (x-forwarded-host, x-forwarded-port, x-forwarded-proto)
 * and falls back to standard Host headers and req.url.
 */
function extractUrlFromRequest(req: Request): string | null {
    try {
        let host: string | null = null;
        let proto: string | null = null;

        if (req.headers && typeof req.headers.get === 'function') {
            const hostHeader =
                req.headers.get('x-forwarded-host') ||
                req.headers.get('host');

            if (hostHeader) {
                // Header can be comma-separated list of proxies, take the first/original client host
                host = hostHeader.split(',')[0].trim();
            }

            const portHeader = req.headers.get('x-forwarded-port');
            if (host && portHeader && !host.includes(':')) {
                const port = portHeader.split(',')[0].trim();
                if (port !== '80' && port !== '443') {
                    host = `${host}:${port}`;
                }
            }

            const protoHeader = req.headers.get('x-forwarded-proto');
            if (protoHeader) {
                proto = protoHeader.split(',')[0].trim();
            }
        }

        // Fallback to parsing req.url if host was not present in headers
        if (!host && req.url) {
            try {
                const parsedUrl = new URL(req.url);
                host = parsedUrl.host;
                if (!proto && parsedUrl.protocol) {
                    proto = parsedUrl.protocol.replace(':', '');
                }
            } catch {
                // Ignore malformed URL
            }
        }

        if (host) {
            if (!proto) {
                proto = (isLocalhost(host) || host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.'))
                    ? 'http'
                    : 'https';
            }
            return `${proto}://${host}`;
        }
    } catch {
        // Safe fallback on any inspection failure
    }
    return null;
}

/**
 * Resolves the canonical base URL for the application.
 *
 * Rules:
 *
 * In Local Development:
 * 1. Checks incoming Request headers (x-forwarded-host / host, req.url) so dynamic ports
 *    (e.g. localhost:3001) and local network addresses are accurately reflected.
 * 2. Checks browser window origin (window.location.origin) if executed client-side.
 * 3. Checks NEXT_PUBLIC_APP_URL / APP_URL if no request or window context is available.
 * 4. Development fallback: http://localhost:3000.
 *
 * In Production:
 * 1. Checks NEXT_PUBLIC_APP_URL / APP_URL. Any localhost value is strictly rejected and warned.
 * 2. Checks Vercel system variables (VERCEL_PROJECT_PRODUCTION_URL, VERCEL_URL for preview).
 * 3. Checks incoming Request headers for non-localhost hosts if no canonical environment URL is set.
 * 4. Production fallback: ALWAYS https://justcelebrateyou.com (NEVER localhost in production).
 */
export function getBaseUrl(req?: Request): string {
    const isProd = isProductionEnvironment();

    if (!isProd) {
        // --- Local Development Mode ---
        // 1. Incoming request context (accurately reflects active port/host, e.g. localhost:3001)
        if (req) {
            const reqUrl = extractUrlFromRequest(req);
            if (reqUrl) {
                return reqUrl;
            }
        }

        // 2. Browser client-side context
        if (typeof window !== 'undefined' && window.location?.origin) {
            return window.location.origin;
        }

        // 3. Configured environment URL (used for scripts/CLI/workers without req)
        const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
        if (envUrl && envUrl.trim() !== '') {
            return normalizeUrl(envUrl);
        }

        // 4. Default local development fallback
        return LOCAL_DEV_FALLBACK;
    }

    // --- Production Mode ---
    // 1. Explicit configured canonical URL (must not be localhost)
    const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
    if (envUrl && envUrl.trim() !== '') {
        const cleanEnvUrl = normalizeUrl(envUrl);
        if (isLocalhost(cleanEnvUrl)) {
            console.warn(
                `[url] NEXT_PUBLIC_APP_URL is set to localhost (${envUrl}) in production mode. Discarding to prevent invalid public links.`
            );
        } else {
            return cleanEnvUrl;
        }
    }

    // 2. Vercel canonical production project domain
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
        const vercelProd = normalizeUrl(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
        if (!isLocalhost(vercelProd)) {
            return vercelProd;
        }
    }

    // 3. Vercel preview deployment URL (e.g. PR / branch preview)
    if (process.env.VERCEL_URL) {
        const vercelUrl = normalizeUrl(`https://${process.env.VERCEL_URL}`);
        if (!isLocalhost(vercelUrl)) {
            return vercelUrl;
        }
    }

    // 4. Incoming request headers in production (only if non-localhost)
    if (req) {
        const reqUrl = extractUrlFromRequest(req);
        if (reqUrl && !isLocalhost(reqUrl)) {
            return reqUrl;
        }
    }

    // 5. Ultimate production fallback: canonical live domain (never localhost)
    return PRODUCTION_DOMAIN;
}

/**
 * Returns the full contributor invitation URL for a celebration.
 * Invited contributors can view the celebration and record/upload video messages without an account.
 */
export function getInviteUrl(eventId: string, req?: Request): string {
    const base = getBaseUrl(req);
    return `${base}/event/${eventId}`;
}

/**
 * Returns the full gifting / claim URL for a celebration.
 * The recipient can open this URL to claim and save the celebration into their personal account.
 */
export function getClaimUrl(claimToken: string, req?: Request): string {
    const base = getBaseUrl(req);
    return `${base}/claim/${claimToken}`;
}

/**
 * Resilient clipboard copy helper with fallback for environments where
 * the asynchronous Clipboard API might fail or be restricted.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch {
        // Fallback to execCommand below
    }

    try {
        if (typeof document !== 'undefined') {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            textArea.setAttribute('readonly', '');
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            return successful;
        }
    } catch {
        // Ignore fallback failure
    }

    return false;
}

