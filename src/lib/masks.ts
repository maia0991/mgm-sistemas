export function onlyNumbers(value: string) {
  return value.replace(/\D/g, "");
}

export function maskTelefone(value: string) {
  const v = onlyNumbers(value).slice(0, 11);

  // FIXO
  if (v.length <= 10) {
    if (v.length <= 2) return `(${v}`;

    if (v.length <= 6) {
      return `(${v.slice(0, 2)}) ${v.slice(2)}`;
    }

    return `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
  }

  // CELULAR
  if (v.length <= 2) return `(${v}`;

  if (v.length <= 7) {
    return `(${v.slice(0, 2)}) ${v.slice(2)}`;
  }

  return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
}

export function maskCPF(value: string) {
  const v = onlyNumbers(value).slice(0, 11);

  if (v.length <= 3) return v;

  if (v.length <= 6) {
    return `${v.slice(0, 3)}.${v.slice(3)}`;
  }

  if (v.length <= 9) {
    return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6)}`;
  }

  return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}`;
}

export function maskCNPJ(value: string) {
  const v = onlyNumbers(value).slice(0, 14);

  if (v.length <= 2) return v;

  if (v.length <= 5) {
    return `${v.slice(0, 2)}.${v.slice(2)}`;
  }

  if (v.length <= 8) {
    return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5)}`;
  }

  if (v.length <= 12) {
    return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8)}`;
  }

  return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8, 12)}-${v.slice(12)}`;
}

export function maskCpfCnpj(value: string) {
  const v = onlyNumbers(value);

  if (v.length <= 11) {
    return maskCPF(v);
  }

  return maskCNPJ(v);
}