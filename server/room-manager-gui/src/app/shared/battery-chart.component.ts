import {Component, Input} from '@angular/core';
import {IBatterySample} from '@interfaces/IBatterySample';

interface Point {
  x: number;
  y: number;
}

// Voltage over time as a plain SVG line, so no chart library is needed
@Component({
  selector: 'app-battery-chart',
  standalone: true,
  template: `
    @if (samples.length < 2) {
      <p class="muted">Not enough samples yet.</p>
    } @else {
      <svg [attr.viewBox]="'0 0 ' + width + ' ' + height" class="chart" role="img" aria-label="Battery voltage over time">
        @for (tick of yTicks; track tick) {
          <line [attr.x1]="left" [attr.x2]="width - right" [attr.y1]="yFor(tick)" [attr.y2]="yFor(tick)" class="grid"></line>
          <text [attr.x]="left - 6" [attr.y]="yFor(tick) + 4" text-anchor="end" class="label">{{ tick }} mV</text>
        }
        @for (tick of xTicks; track tick.x) {
          <text [attr.x]="tick.x" [attr.y]="height - 6" text-anchor="middle" class="label">{{ tick.label }}</text>
        }
        <line [attr.x1]="left" [attr.x2]="width - right" [attr.y1]="yFor(cutoff)" [attr.y2]="yFor(cutoff)" class="cutoff"></line>
        <polyline [attr.points]="points" class="line"></polyline>
      </svg>
    }
  `,
  styles: `
    .chart { width: 100%; height: auto; max-height: 16rem; }
    .grid { stroke: #e0e0e0; stroke-width: 1; }
    .cutoff { stroke: #a12622; stroke-width: 1; stroke-dasharray: 4 4; }
    .line { fill: none; stroke: #1565c0; stroke-width: 2; }
    .label { font-size: 11px; fill: #607d8b; }
    .muted { color: #607d8b; }
  `
})
export class BatteryChartComponent {
  @Input() samples: IBatterySample[] = [];
  // Drawn as a dashed line so the operator sees how far the battery is from the low-battery screen
  @Input() cutoff = 3100;
  readonly width = 600;
  readonly height = 200;
  readonly left = 56;
  readonly right = 8;
  readonly top = 8;
  readonly bottom = 22;

  private get sorted(): IBatterySample[] {
    return [...this.samples].sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
  }

  private get xRange(): [number, number] {
    const s = this.sorted;
    return [Date.parse(s[0].ts), Date.parse(s[s.length - 1].ts)];
  }

  private get yRange(): [number, number] {
    const values = this.samples.map(s => s.voltage_mv).concat(this.cutoff);
    const min = Math.floor((Math.min(...values) - 50) / 100) * 100;
    const max = Math.ceil((Math.max(...values) + 50) / 100) * 100;
    return [min, max];
  }

  xFor(ts: number): number {
    const [min, max] = this.xRange;
    const span = max - min || 1;
    return this.left + (ts - min) / span * (this.width - this.left - this.right);
  }

  yFor(mv: number): number {
    const [min, max] = this.yRange;
    const span = max - min || 1;
    return this.top + (max - mv) / span * (this.height - this.top - this.bottom);
  }

  get points(): string {
    return this.sorted.map(s => `${this.xFor(Date.parse(s.ts)).toFixed(1)},${this.yFor(s.voltage_mv).toFixed(1)}`).join(' ');
  }

  get yTicks(): number[] {
    const [min, max] = this.yRange;
    const step = max - min > 600 ? 200 : 100;
    const ticks: number[] = [];
    for (let v = min; v <= max; v += step) ticks.push(v);
    return ticks;
  }

  get xTicks(): {x: number, label: string}[] {
    const [min, max] = this.xRange;
    const count = 4;
    const ticks = [];
    for (let i = 0; i <= count; i++) {
      const ts = min + (max - min) * i / count;
      const date = new Date(ts);
      const label = max - min < 2 * 86400 * 1000
        ? date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
        : date.toLocaleDateString([], {day: '2-digit', month: '2-digit'});
      ticks.push({x: this.xFor(ts), label});
    }
    return ticks;
  }
}
