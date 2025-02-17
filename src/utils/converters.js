export const isPrintableCharacter = (i) => i >= 0x20 && i < 0x7f;

export const hexToU8 = (s) => parseInt(s, 16);
export const binToU8 = (s) => parseInt(s, 2);
export const charToU8 = (c) => c.charCodeAt(0);
export const u8ToChar = (i) => isPrintableCharacter(i) ? String.fromCharCode(i) : '·';
export const u8ToHex = (i) => i.toString(16).padStart(2, "0");
export const u8ToBin = (i) => i.toString(2).padStart(8, "0");
