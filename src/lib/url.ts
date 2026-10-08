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
 * Resolves the canonical base URL for the application.
 *
 * Rules:
 * 1. Checks NEXT_PUBLIC_APP_URL / APP_URL. In production, any localhost value is rejected.
 * 2. Checks incoming Request headers (x-forwarded-host / host, x-forwarded-proto).
 *    In production, any localhost host is rejected.
 * 3. Checks Vercel system variables (VERCEL_PROJECT_PRODUCTION_URL, VERCEL_URL).
 * 4. Production fallback: ALWAYS https://justcelebrateyou.com (NEVER localhost in production).
 * 5. Development fallback: http://localhost:3000.
 */
export function getBaseUrl(req?: Request): string {
    const isProd = isProductionEnvironment();

    // 1. Explicit configured URL
    const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
    if (envUrl && envUrl.trim() !== '') {
        const cleanEnvUrl = normalizeUrl(envUrl);
        // If in production, ensure misconfigured localhost is not used
        if (isProd && isLocalhost(cleanEnvUrl)) {
            console.warn(
                `[url] NEXT_PUBLIC_APP_URL is set to localhost (${envUrl}) in production mode. Discarding to prevent invalid public links.`
            );
        } else {
            return cleanEnvUrl;
        }
    }

    // 2. Incoming request headers (when invoked from route handlers / middleware)
    if (req) {
        try {
            const hostHeader =
                req.headers.get('x-forwarded-host') ||
                req.headers.get('host');

            if (hostHeader) {
                // Header can be comma-separated list of proxies, take the first/original client host
                const host = hostHeader.split(',')[0].trim();
                const protoHeader = req.headers.get('x-forwarded-proto');
                const proto =
                    (protoHeader ? protoHeader.split(',')[0].trim() : null) ||
                    (isLocalhost(host) ? 'http' : 'https');

                if (isProd && isLocalhost(host)) {
                    // Ignore localhost host in production
                } else if (host) {
                    return `${proto}://${host}`;
                }
            }
        } catch {
            // Header read fallback
        }
    }

    // 3. Vercel system variables
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
        return normalizeUrl(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
    }

    if (process.env.VERCEL_URL) {
        const vercelUrl = normalizeUrl(`https://${process.env.VERCEL_URL}`);
        if (!isProd || !isLocalhost(vercelUrl)) {
            return vercelUrl;
        }
    }

    // 4. Production fallback: never generate localhost links in production
    if (isProd) {
        return PRODUCTION_DOMAIN;
    }

    // 5. Local development fallback
    return LOCAL_DEV_FALLBACK;
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

