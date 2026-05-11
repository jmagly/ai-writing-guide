// JCS (RFC 8785) canonicalization — TypeScript port of the Go reference at
// agentic-sandbox-conformance/internal/spec/jcs.go.
//
// Sufficient for the AgentCard shape: objects, strings, integers, booleans,
// null, arrays, and JSON numbers without exponential form. Numbers are emitted
// in a form that matches serde_json output for integers and short decimals
// (the only forms `agent_card::sign_agent_card` produces today).

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

const encoder = new TextEncoder();

export function canonicalizeJsonBytes(input: Uint8Array | string): Uint8Array {
  const text = typeof input === 'string' ? input : new TextDecoder('utf-8').decode(input);
  const value = JSON.parse(text) as JsonValue;
  return canonicalizeJson(value);
}

export function canonicalizeJson(value: JsonValue): Uint8Array {
  const chunks: string[] = [];
  writeCanonical(chunks, value);
  return encoder.encode(chunks.join(''));
}

export function canonicalizeJsonString(value: JsonValue): string {
  const chunks: string[] = [];
  writeCanonical(chunks, value);
  return chunks.join('');
}

function writeCanonical(out: string[], value: JsonValue): void {
  if (value === null) {
    out.push('null');
    return;
  }
  if (typeof value === 'boolean') {
    out.push(value ? 'true' : 'false');
    return;
  }
  if (typeof value === 'string') {
    writeCanonicalString(out, value);
    return;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`JCS: non-finite number ${value}`);
    }
    if (Number.isInteger(value)) {
      out.push(value.toString(10));
    } else {
      // Shortest round-trip representation; matches Go strconv -1 precision
      // for the common cases in the AgentCard shape (it has no exotic doubles).
      out.push(String(value));
    }
    return;
  }
  if (Array.isArray(value)) {
    out.push('[');
    for (let i = 0; i < value.length; i++) {
      if (i > 0) out.push(',');
      writeCanonical(out, value[i] as JsonValue);
    }
    out.push(']');
    return;
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value).sort(compareUtf16);
    out.push('{');
    for (let i = 0; i < keys.length; i++) {
      if (i > 0) out.push(',');
      const k = keys[i]!;
      writeCanonicalString(out, k);
      out.push(':');
      writeCanonical(out, (value as Record<string, JsonValue>)[k] as JsonValue);
    }
    out.push('}');
    return;
  }
  throw new Error(`JCS: unsupported type ${typeof value}`);
}

// Strings per RFC 8785 §3.2.2.2 / RFC 8259. Escape " \ and control chars (\u00xx).
// Slash is NOT escaped. Non-ASCII characters are emitted as raw UTF-8.
function writeCanonicalString(out: string[], s: string): void {
  out.push('"');
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    switch (ch) {
      case 0x22: // "
        out.push('\\"');
        break;
      case 0x5c: // \
        out.push('\\\\');
        break;
      case 0x08:
        out.push('\\b');
        break;
      case 0x0c:
        out.push('\\f');
        break;
      case 0x0a:
        out.push('\\n');
        break;
      case 0x0d:
        out.push('\\r');
        break;
      case 0x09:
        out.push('\\t');
        break;
      default:
        if (ch < 0x20) {
          out.push('\\u' + ch.toString(16).padStart(4, '0'));
        } else {
          // Emit raw character; JS strings are already UTF-16 and TextEncoder
          // will produce UTF-8 bytes on encode.
          out.push(s[i]!);
        }
    }
  }
  out.push('"');
}

// Compare two strings by their UTF-16 code-unit sequences (RFC 8785 §3.2.3).
// JS string comparison is already lexicographic over UTF-16 code units, so a
// plain compare suffices.
function compareUtf16(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
