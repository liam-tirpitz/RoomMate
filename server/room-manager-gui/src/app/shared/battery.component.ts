import {Component, Input} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';

// Battery level as icon plus percentage. Percent comes from the server (IDeviceStatus.battery_percent).
@Component({
  selector: 'app-battery',
  standalone: true,
  imports: [MatIconModule],
  template: `
    @if (percent === null || percent === undefined) {
      <span class="battery unknown"><mat-icon inline>battery_unknown</mat-icon>unknown</span>
    } @else {
      <span class="battery" [class.low]="percent <= 10" [title]="millivolts ? millivolts + ' mV' : ''">
        <mat-icon inline>{{ icon }}</mat-icon>{{ percent }}%
      </span>
    }
  `,
  styles: `
    .battery { display: inline-flex; align-items: center; gap: 0.25rem; white-space: nowrap; }
    .low { color: #a12622; }
    .unknown { color: #607d8b; }
  `
})
export class BatteryComponent {
  @Input() percent: number | null | undefined;
  @Input() millivolts: number | null | undefined;

  get icon(): string {
    const p = this.percent ?? 0;
    if (p >= 95) return 'battery_full';
    if (p >= 80) return 'battery_6_bar';
    if (p >= 65) return 'battery_5_bar';
    if (p >= 50) return 'battery_4_bar';
    if (p >= 35) return 'battery_3_bar';
    if (p >= 20) return 'battery_2_bar';
    if (p > 10) return 'battery_1_bar';
    return 'battery_alert';
  }
}
