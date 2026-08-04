/**
 * shamir.ts
 *
 * Implementacja Shamir's Secret Sharing nad ciałem skończonym
 * GF(256) — dokładnie tym samym ciałem, którego używa AES.
 * Dzieli sekret (np. 32-bajtowy klucz AES) na N "udziałów", z których
 * dowolnych K odtwarza oryginał, a mniej niż K nie ujawnia o nim
 * ABSOLUTNIE NIC — to bezpieczeństwo informacyjno-teoretyczne,
 * nie obliczeniowe (nie da się "złamać" nawet z nieskończoną mocą
 * obliczeniową).
 */

import { arrayBufferToBase64Url, base64UrlToArrayBuffer } from "./encoding";

// Mnożenie w GF(256) z wielomianem redukcyjnym AES (x^8+x^4+x^3+x+1).
function gmul(a: number, b: number): number {
  let p = 0;
  let x = a;
  let y = b;
  for (let i = 0; i < 8; i++) {
    if (y & 1) p ^= x;
    const hiBitSet = x & 0x80;
    x = (x << 1) & 0xff;
    if (hiBitSet) x ^= 0x1b;
    y >>= 1;
  }
  return p;
}

// Potęgowanie w GF(256) przez szybkie podnoszenie do kwadratu.
function gpow(a: number, n: number): number {
  let result = 1;
  let base = a;
  let exp = n;
  while (exp > 0) {
    if (exp & 1) result = gmul(result, base);
    base = gmul(base, base);
    exp >>= 1;
  }
  return result;
}

// Odwrotność multiplikatywna: w GF(256) a^254 = a^-1 (bo a^255 = 1).
function ginv(a: number): number {
  if (a === 0) throw new Error("Nie można odwrócić zera w GF(256).");
  return gpow(a, 254);
}

function gdiv(a: number, b: number): number {
  return gmul(a, ginv(b));
}

// Ewaluacja wielomianu w punkcie x metodą Hornera, w arytmetyce GF(256).
function evalPolynomial(coeffs: number[], x: number): number {
  let result = coeffs[coeffs.length - 1];
  for (let i = coeffs.length - 2; i >= 0; i--) {
    result = gmul(result, x) ^ coeffs[i];
  }
  return result;
}

export interface ShamirShare {
  index: number;
  data: Uint8Array;
}

/**
 * Dzieli sekret (surowe bajty) na `totalShares` udziałów, z których
 * dowolnych `threshold` odtwarza oryginał.
 *
 * Dla KAŻDEGO bajtu sekretu generujemy osobny, losowy wielomian
 * stopnia (threshold-1), którego wyraz wolny = ten bajt sekretu.
 */
export function splitSecretBytes(
  secret: Uint8Array,
  totalShares: number,
  threshold: number
): ShamirShare[] {
  if (threshold < 2 || threshold > totalShares) {
    throw new Error("Nieprawidłowy próg: 2 <= threshold <= totalShares.");
  }
  if (totalShares > 255) {
    throw new Error("Zbyt wiele udziałów (maksymalnie 255).");
  }

  const shares: ShamirShare[] = [];
  for (let i = 1; i <= totalShares; i++) {
    shares.push({ index: i, data: new Uint8Array(secret.length) });
  }

  for (let byteIdx = 0; byteIdx < secret.length; byteIdx++) {
    const coeffs = new Array<number>(threshold);
    coeffs[0] = secret[byteIdx];

    const randomCoeffs = window.crypto.getRandomValues(
      new Uint8Array(threshold - 1)
    );
    for (let k = 1; k < threshold; k++) {
      coeffs[k] = randomCoeffs[k - 1];
    }

    for (const share of shares) {
      share.data[byteIdx] = evalPolynomial(coeffs, share.index);
    }
  }

  return shares;
}

/**
 * Odtwarza oryginalny sekret z podanych udziałów metodą interpolacji
 * Lagrange'a w punkcie x=0, w arytmetyce GF(256).
 */
export function combineSecretBytes(shares: ShamirShare[]): Uint8Array {
  if (shares.length < 2) {
    throw new Error("Potrzeba przynajmniej 2 udziałów do odtworzenia.");
  }

  const length = shares[0].data.length;
  const result = new Uint8Array(length);
  const xs = shares.map((s) => s.index);

  // Współczynniki Lagrange'a L_m(0) liczone RAZ, wspólne dla
  // wszystkich bajtów (bo x-y udziałów są takie same dla każdego bajtu).
  const lagrangeCoeffs = xs.map((xm, m) => {
    let numerator = 1;
    let denominator = 1;
    xs.forEach((xk, k) => {
      if (k === m) return;
      numerator = gmul(numerator, xk);
      denominator = gmul(denominator, xk ^ xm); // odejmowanie w GF(2^n) = XOR
    });
    return gdiv(numerator, denominator);
  });

  for (let byteIdx = 0; byteIdx < length; byteIdx++) {
    let acc = 0;
    shares.forEach((share, m) => {
      acc ^= gmul(share.data[byteIdx], lagrangeCoeffs[m]);
    });
    result[byteIdx] = acc;
  }

  return result;
}

/** Koduje pojedynczy udział do Base64URL: [1 bajt indeksu][dane]. */
export function encodeShare(share: ShamirShare): string {
  const buffer = new Uint8Array(1 + share.data.length);
  buffer[0] = share.index;
  buffer.set(share.data, 1);
  return arrayBufferToBase64Url(buffer.buffer as ArrayBuffer);
}

/** Odwrotność encodeShare — dekoduje udział ze stringa Base64URL. */
export function decodeShare(encoded: string): ShamirShare {
  const buffer = new Uint8Array(base64UrlToArrayBuffer(encoded));
  if (buffer.length < 2) {
    throw new Error("Nieprawidłowy format udziału.");
  }
  return { index: buffer[0], data: buffer.slice(1) };
}