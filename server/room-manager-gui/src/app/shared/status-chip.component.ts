import {Component, Input} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {DeviceState} from '@interfaces/IDeviceStatus';

const LABELS: Record<DeviceState, {label: string, icon: string}> = {
  ok: {label: 'OK', icon: 'check_circle'},
  low_battery: {label: 'Low battery', icon: 'battery_alert'},
  offline: {label: 'Offline', icon: 'cloud_off'},
  unconfigured: {label: 'Unconfigured', icon: 'help'},
};

@Component({
  selector: 'app-status-chip',
  standalone: true,
  imports: [MatIconModule],
  template: `<span class="chip" [class]="'chip ' + status"><mat-icon inline>{{ icon }}</mat-icon>{{ label }}</span>`,
  styles: `
    .chip { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.15rem 0.6rem; border-radius: 1rem; font-size: 0.85rem; white-space: nowrap; }
    .ok { background: #e6f4ea; color: #1e6b3a; }
    .low_battery { background: #fdecea; color: #a12622; }
    .offline { background: #eceff1; color: #455a64; }
    .unconfigured { background: #fff4e5; color: #8a5a00; }
  `
})
export class StatusChipComponent {
  @Input({required: true}) status!: DeviceState;

  get label() { return LABELS[this.status]?.label ?? this.status; }
  get icon() { return LABELS[this.status]?.icon ?? 'help'; }
}
