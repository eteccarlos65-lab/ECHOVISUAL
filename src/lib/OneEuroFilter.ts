export class OneEuroFilter {
  mincutoff: number;
  beta: number;
  dcutoff: number;
  xPrev: number | null;
  dxPrev: number;
  tPrev: number | null;

  constructor(mincutoff = 1.3, beta = 0.015, dcutoff = 1.0) {
    this.mincutoff = mincutoff;
    this.beta = beta;
    this.dcutoff = dcutoff;
    this.xPrev = null;
    this.dxPrev = 0;
    this.tPrev = null;
  }

  alpha(cutoff: number, te: number) {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / te);
  }

  filter(x: number, tMs: number) {
    if (this.tPrev === null) {
      this.tPrev = tMs;
      this.xPrev = x;
      return x;
    }
    const te = Math.max(0.001, (tMs - this.tPrev) / 1000);
    const dx = (x - (this.xPrev as number)) / te;
    const aD = this.alpha(this.dcutoff, te);
    const dxHat = aD * dx + (1 - aD) * this.dxPrev;
    const cutoff = this.mincutoff + this.beta * Math.abs(dxHat);
    const a = this.alpha(cutoff, te);
    const xHat = a * x + (1 - a) * (this.xPrev as number);
    this.xPrev = xHat;
    this.dxPrev = dxHat;
    this.tPrev = tMs;
    return xHat;
  }
}
