import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { base64ToBytes, base64UrlBytes, base64UrlJson, bytesToBase64, encodeUtf8 } from "./encoding";
import type { Logger } from "./logger";
import type { OidcJwk, SigningMaterial } from "./types";

export async function loadOrCreateSigningKey(path: string, logger: Logger): Promise<SigningMaterial> {
  try {
    const privateKeyPem = await readFile(path, "utf8");
    const privateKey = await importPrivateKey(privateKeyPem);
    const publicJwk = await publicJwkFromPrivateKey(privateKey);
    const keyId = await jwkKeyId(publicJwk);
    return { privateKey, publicJwk: { ...publicJwk, kid: keyId, alg: "RS256", use: "sig" }, keyId };
  } catch {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["sign", "verify"],
    );

    const privateKeyPem = await exportPrivateKeyPem(keyPair.privateKey);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, privateKeyPem, { mode: 0o600 });
    const publicJwk = await exportPublicJwk(keyPair.publicKey);
    const keyId = await jwkKeyId(publicJwk);
    logger.warn("signing_key_created", { path });
    return { privateKey: keyPair.privateKey, publicJwk: { ...publicJwk, kid: keyId, alg: "RS256", use: "sig" }, keyId };
  }
}

export async function signJwt(payload: Record<string, unknown>, signing: SigningMaterial) {
  const header = { alg: "RS256", typ: "JWT", kid: signing.keyId };
  const unsigned = `${base64UrlJson(header)}.${base64UrlJson(payload)}`;
  const signature = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    signing.privateKey,
    encodeUtf8(unsigned),
  );

  return `${unsigned}.${base64UrlBytes(new Uint8Array(signature))}`;
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const binary = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
  return crypto.subtle.importKey(
    "pkcs8",
    base64ToBytes(binary),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    true,
    ["sign"],
  );
}

async function publicJwkFromPrivateKey(privateKey: CryptoKey): Promise<OidcJwk> {
  const privateJwk = await crypto.subtle.exportKey("jwk", privateKey);
  return {
    kty: privateJwk.kty,
    n: privateJwk.n,
    e: privateJwk.e,
  };
}

async function exportPrivateKeyPem(privateKey: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("pkcs8", privateKey);
  const base64 = bytesToBase64(new Uint8Array(exported));
  const wrapped = base64.match(/.{1,64}/g)?.join("\n") ?? base64;
  return `-----BEGIN PRIVATE KEY-----\n${wrapped}\n-----END PRIVATE KEY-----\n`;
}

async function exportPublicJwk(publicKey: CryptoKey): Promise<OidcJwk> {
  const jwk = await crypto.subtle.exportKey("jwk", publicKey);
  return {
    kty: jwk.kty,
    n: jwk.n,
    e: jwk.e,
  };
}

async function jwkKeyId(jwk: OidcJwk): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encodeUtf8(`${jwk.kty}.${jwk.n}.${jwk.e}`));
  return base64UrlBytes(new Uint8Array(digest)).slice(0, 16);
}
