export type AppConfig = {
  issuer: string;
  keyPath: string;
  clients: ClientConfig[];
  sites: SiteConfig[];
};

export type ClientConfig = {
  id: string;
  secret?: string;
  redirectUris: string[];
};

export type SiteConfig = {
  id: string;
  name: string;
  passwords: string[];
  grants: string[];
};

export type OidcJwk = {
  kty?: string;
  n?: string;
  e?: string;
  kid?: string;
  alg?: string;
  use?: string;
};

export type AuthorizeRequest = {
  clientId: string;
  redirectUri: string;
  responseType: string;
  scope: string;
  state: string | null;
  nonce: string | null;
  siteId: string;
};

export type PendingLogin = {
  request: AuthorizeRequest;
  expiresAt: number;
};

export type AuthCode = {
  request: AuthorizeRequest;
  subject: string;
  email: string;
  grants: string[];
  issuedAt: number;
  expiresAt: number;
};

export type SigningMaterial = {
  privateKey: CryptoKey;
  publicJwk: OidcJwk;
  keyId: string;
};

export type FormFields = {
  get(name: string): unknown;
};
