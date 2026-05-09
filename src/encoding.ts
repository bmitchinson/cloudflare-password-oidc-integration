const textEncoder = new TextEncoder();

export function encodeUtf8(value: string) {
  return textEncoder.encode(value);
}

export function base64UrlJson(value: unknown) {
  return base64UrlBytes(encodeUtf8(JSON.stringify(value)));
}

export function base64UrlBytes(bytes: Uint8Array) {
  return bytesToBase64(bytes).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function base64ToBytes(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function randomId() {
  return base64UrlBytes(crypto.getRandomValues(new Uint8Array(32)));
}
