/**
 * Numerical helpers for Student's t distribution.
 *
 * The implementation uses the regularized incomplete beta relationship for
 * the cumulative distribution and a bounded binary search for its inverse.
 */

const LANCZOS_COEFFICIENTS = [
  676.5203681218851,
  -1259.1392167224028,
  771.3234287776531,
  -176.6150291621406,
  12.507343278686905,
  -0.13857109526572012,
  9.984369578019572e-6,
  1.5056327351493116e-7,
];

function logGamma(value: number): number {
  if (value < 0.5) {
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * value)) - logGamma(1 - value);
  }

  const shifted = value - 1;
  let series = 0.9999999999998099;
  for (let index = 0; index < LANCZOS_COEFFICIENTS.length; index++) {
    series += LANCZOS_COEFFICIENTS[index] / (shifted + index + 1);
  }
  const t = shifted + LANCZOS_COEFFICIENTS.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (shifted + 0.5) * Math.log(t) - t + Math.log(series);
}

function betaContinuedFraction(a: number, b: number, x: number): number {
  const maxIterations = 200;
  const epsilon = 3e-14;
  const minimum = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  d = Math.abs(d) < minimum ? minimum : d;
  d = 1 / d;
  let result = d;

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    const doubled = iteration * 2;
    let coefficient = iteration * (b - iteration) * x /
      ((qam + doubled) * (a + doubled));
    d = 1 + coefficient * d;
    d = Math.abs(d) < minimum ? minimum : d;
    c = 1 + coefficient / c;
    c = Math.abs(c) < minimum ? minimum : c;
    d = 1 / d;
    result *= d * c;

    coefficient = -(a + iteration) * (qab + iteration) * x /
      ((a + doubled) * (qap + doubled));
    d = 1 + coefficient * d;
    d = Math.abs(d) < minimum ? minimum : d;
    c = 1 + coefficient / c;
    c = Math.abs(c) < minimum ? minimum : c;
    d = 1 / d;
    const delta = d * c;
    result *= delta;
    if (Math.abs(delta - 1) < epsilon) {
      return result;
    }
  }

  throw new Error('Student t calculation did not converge');
}

function regularizedIncompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  const factor = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) +
    a * Math.log(x) + b * Math.log(1 - x)
  );
  if (x < (a + 1) / (a + b + 2)) {
    return factor * betaContinuedFraction(a, b, x) / a;
  }
  return 1 - factor * betaContinuedFraction(b, a, 1 - x) / b;
}

function studentTCdf(value: number, degreesOfFreedom: number): number {
  if (value === 0) return 0.5;
  const x = degreesOfFreedom / (degreesOfFreedom + value * value);
  const tail = 0.5 * regularizedIncompleteBeta(x, degreesOfFreedom / 2, 0.5);
  return value > 0 ? 1 - tail : tail;
}

export function studentTTwoTailedPValue(value: number, degreesOfFreedom: number): number {
  if (!Number.isFinite(degreesOfFreedom) || degreesOfFreedom <= 0) {
    throw new Error('Degrees of freedom must be positive and finite');
  }
  if (Number.isNaN(value)) {
    throw new Error('T statistic must not be NaN');
  }
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, 2 * (1 - studentTCdf(Math.abs(value), degreesOfFreedom))));
}

export function studentTCriticalValue(degreesOfFreedom: number, confidence: number): number {
  if (!Number.isFinite(degreesOfFreedom) || degreesOfFreedom <= 0) {
    throw new Error('Degrees of freedom must be positive and finite');
  }
  if (!Number.isFinite(confidence) || confidence <= 0 || confidence >= 1) {
    throw new Error('Confidence level must be between 0 and 1');
  }

  const target = 0.5 + confidence / 2;
  let lower = 0;
  let upper = 1;
  while (studentTCdf(upper, degreesOfFreedom) < target && upper < 1e12) {
    upper *= 2;
  }
  if (upper >= 1e12 && studentTCdf(upper, degreesOfFreedom) < target) {
    throw new Error('Unable to bracket Student t critical value');
  }

  for (let iteration = 0; iteration < 100; iteration++) {
    const middle = (lower + upper) / 2;
    if (studentTCdf(middle, degreesOfFreedom) < target) {
      lower = middle;
    } else {
      upper = middle;
    }
  }
  return (lower + upper) / 2;
}
