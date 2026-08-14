export function normalizarCelular(
  input: string
): { ok: true; valor: string } | { ok: false; error: string } {
  if (!input.trim()) {
    return { ok: false, error: 'El número de celular no puede estar vacío.' }
  }

  const limpio = input.replace(/[\s\-().]/g, '')

  let digits: string

  if (limpio.startsWith('+')) {
    if (!limpio.startsWith('+57')) {
      return {
        ok: false,
        error: 'Código de país no válido. Usa un número colombiano (+57).',
      }
    }
    digits = limpio.slice(3)
  } else if (limpio.startsWith('57') && limpio.length === 12) {
    digits = limpio.slice(2)
  } else {
    digits = limpio
  }

  if (!/^\d+$/.test(digits)) {
    return { ok: false, error: 'El número solo debe contener dígitos.' }
  }

  if (digits.length !== 10) {
    return {
      ok: false,
      error: `Número inválido: debe tener 10 dígitos (tiene ${digits.length}).`,
    }
  }

  if (!digits.startsWith('3')) {
    return {
      ok: false,
      error: 'El celular colombiano debe empezar por 3 (ej. 300, 310, 320…).',
    }
  }

  return { ok: true, valor: '+57' + digits }
}
