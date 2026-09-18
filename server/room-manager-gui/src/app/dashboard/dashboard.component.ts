import {Component, OnInit} from '@angular/core';
import {RouterLink} from '@angular/router';
import {MatCardModule} from '@angular/material/card';
import {MatIconModule} from '@angular/material/icon';
import {MatListModule} from '@angular/material/list';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {DevicesService} from '@app/api/devices.service';
import {DeviceState, IDeviceStatus} from '@interfaces/IDeviceStatus';
import {StatusChipComponent} from '@app/shared/status-chip.component';
import {RelativeTimePipe} from '@app/shared/relative-time.pipe';
import {ErrorMessageComponent} from '@app/shared/error-message.component';

interface Counter {
  label: string;
  icon: string;
  status: DeviceState | 'all';
  value: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, MatCardModule, MatIconModule, MatListModule, MatProgressBarModule, StatusChipComponent, RelativeTimePipe, ErrorMessageComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  devices: IDeviceStatus[] = [];
  loading = true;
  error: unknown;

  constructor(private devicesService: DevicesService) {}

  ngOnInit() {
    this.devicesService.list().subscribe({
      next: devices => {
        this.devices = devices;
        this.loading = false;
      },
      error: error => {
        this.error = error;
        this.loading = false;
      }
    });
  }

  get counters(): Counter[] {
    const count = (status: DeviceState) => this.devices.filter(d => d.status === status).length;
    return [
      {label: 'Devices', icon: 'smartphone', status: 'all', value: this.devices.length},
      {label: 'Unconfigured', icon: 'help', status: 'unconfigured', value: count('unconfigured')},
      {label: 'Low battery', icon: 'battery_alert', status: 'low_battery', value: count('low_battery')},
      {label: 'Offline', icon: 'cloud_off', status: 'offline', value: count('offline')},
    ];
  }

  // Everything that needs a human: unconfigured first, then low battery, then offline
  get attention(): IDeviceStatus[] {
    const order: DeviceState[] = ['unconfigured', 'low_battery', 'offline'];
    return this.devices
      .filter(d => d.status !== 'ok')
      .sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  }

  describe(device: IDeviceStatus): string {
    return device.location || device.room?.name || device.device_id.replace(/(.{2})(?=.)/g, '$1:');
  }
}
