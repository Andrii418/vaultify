/**
 * encoding.ts
 * 
 * Narzędzia do konwersji między formatem binarnym (ArrayBuffer),
 * którego wymaga Web Crypto API, a formatem tekstowym Base64URL,
 * który możemy bezpiecznie umieścić w adresie URL i w bazie danych.
 */

/**
 * Konwertuje ArrayBuffer (surowe bajty) na string Base64URL.
 * Używamy Base64URL zamiast zwykłego Base64, ponieważ zwykły Base64
 * zawiera znaki '+', '/', '=' które mają specjalne znaczenie w URL-ach
 * i musiałyby być kodowane (encodeURIComponent), co psuje czytelność linku.
 */
export function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binaryString = "";

  // Konwertujemy każdy bajt na znak, budując surowy string binarny
  for (let i = 0; i < bytes.byteLength; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }

  // btoa() to wbudowana w przeglądarkę funkcja konwersji na Base64
  const base64 = btoa(binaryString);

  // Zamieniamy znaki niebezpieczne dla URL na bezpieczne odpowiedniki:
  // '+' -> '-', '/' -> '_', usuwamy padding '='
  return base64
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Konwertuje string Base64URL z powrotem na ArrayBuffer.
 * To odwrotność funkcji powyżej — potrzebna gdy odbieramy klucz
 * z fragmentu URL i musimy go przekazać z powrotem do Web Crypto API.
 */
export function base64UrlToArrayBuffer(base64Url: string): ArrayBuffer {
  // Przywracamy standardowe znaki Base64
  let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");

  // Przywracamy padding '=', który Base64 wymaga (długość musi być
  // wielokrotnością 4)
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }

  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes.buffer;
}

/**
 * Konwertuje zwykły string tekstowy (np. treść sekretu wpisaną przez
 * użytkownika) na ArrayBuffer bajtów zakodowanych w UTF-8.
 * Web Crypto API nie rozumie stringów — tylko bajty.
 */
export function stringToArrayBuffer(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer as ArrayBuffer;
}

/**
 * Konwertuje ArrayBuffer bajtów UTF-8 z powrotem na czytelny string.
 * Używamy tego po odszyfrowaniu, żeby zamienić surowe bajty
 * z powrotem na tekst, który wyświetlimy użytkownikowi.
 */
export function arrayBufferToString(buffer: ArrayBuffer): string {
  return new TextDecoder().decode(buffer);
}