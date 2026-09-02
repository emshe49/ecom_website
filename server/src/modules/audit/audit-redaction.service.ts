import { AUDIT_CONSTANTS, SNAPSHOT_ALLOWLISTS } from './audit.constants.js';

export class AuditRedactionService {
  private static readonly DENYLIST_PATTERNS = [
    /password/i,
    /token/i,
    /secret/i,
    /authorization/i,
    /cookie/i,
    /cvv/i,
    /card/i,
    /apikey/i,
    /privatekey/i,
    /smtppassword/i,
    /credentials/i,
    /session/i,
    /auth/i,
  ];

  /**
   * Recursively sanitizes any object or array by redacting denylisted keys.
   */
  sanitize<T>(value: T, depth = 0): T {
    if (depth > 10 || value === null || value === undefined) {
      return value;
    }

    if (typeof value !== 'object') {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitize(item, depth + 1)) as unknown as T;
    }

    const sanitizedObj: Record<string, any> = {};

    for (const [key, val] of Object.entries(value)) {
      const isSensitive = AuditRedactionService.DENYLIST_PATTERNS.some((pattern) =>
        pattern.test(key)
      );

      if (isSensitive) {
        sanitizedObj[key] = '[REDACTED]';
      } else if (typeof val === 'object' && val !== null) {
        sanitizedObj[key] = this.sanitize(val, depth + 1);
      } else {
        sanitizedObj[key] = val;
      }
    }

    return sanitizedObj as T;
  }

  /**
   * Filters a snapshot (before or after state) according to a strict domain allowlist.
   */
  filterSnapshot(
    snapshot: Record<string, any> | null | undefined,
    domain?: string
  ): Record<string, any> | null {
    if (!snapshot || typeof snapshot !== 'object') {
      return null;
    }

    const allowlist = domain ? SNAPSHOT_ALLOWLISTS[domain] : null;

    let filtered: Record<string, any> = {};

    if (allowlist && allowlist.length > 0) {
      for (const field of allowlist) {
        if (field in snapshot) {
          filtered[field] = snapshot[field];
        }
      }
    } else {
      // Fallback: take safe shallow primitives and strip known internal mongoose keys
      for (const [key, val] of Object.entries(snapshot)) {
        if (
          !key.startsWith('_') &&
          !key.startsWith('$') &&
          key !== '__v' &&
          typeof val !== 'function'
        ) {
          filtered[key] = val;
        }
      }
    }

    // Apply recursive sanitization as defense-in-depth
    return this.sanitize(filtered);
  }

  /**
   * Bounds metadata size to prevent memory or storage exhaustion.
   */
  boundMetadata(metadata: Record<string, any> | null | undefined): Record<string, any> | null {
    if (!metadata || typeof metadata !== 'object') {
      return null;
    }

    const sanitized = this.sanitize(metadata);
    const serialized = JSON.stringify(sanitized);

    if (serialized.length > AUDIT_CONSTANTS.MAX_METADATA_BYTES) {
      return {
        _warning: 'Metadata exceeded maximum allowed size (32KB) and was truncated.',
        summary: Object.keys(sanitized),
      };
    }

    return sanitized;
  }

  /**
   * Normalizes route URL to prevent storing raw query parameters that may contain sensitive tokens.
   */
  normalizeRoute(route?: string | null): string | null {
    if (!route) return null;

    try {
      // If route contains query params, strip them
      const queryIdx = route.indexOf('?');
      if (queryIdx !== -1) {
        return route.substring(0, queryIdx);
      }
      return route;
    } catch {
      return route;
    }
  }

  /**
   * Normalizes and truncates User Agent string.
   */
  sanitizeUserAgent(ua?: string | null): string | null {
    if (!ua) return null;
    return ua.slice(0, AUDIT_CONSTANTS.MAX_USER_AGENT_LENGTH);
  }
}

export const auditRedactionService = new AuditRedactionService();
