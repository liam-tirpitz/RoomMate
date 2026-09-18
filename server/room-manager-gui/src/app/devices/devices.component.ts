import {Component, OnInit} from '@angular/core';
import {RouterLink} from '@angular/router';
import {DatePipe} from '@angular/common';
import {MatTableModule} from '@angular/material/table';
import {MatButtonModule} from '@angular/material/button';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatIconModule} from '@angular/material/icon';
import {MatCardModule} from '@angular/material/card';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {DevicesService} from '@app/api/devices.service';
import {DeviceState, IDeviceStatus} from '@interfaces/IDeviceStatus';
import {StatusChipComponent} from '@app/shared/status-chip.component';
import {BatteryComponent} from '@app/shared/battery.component';
import {RelativeTimePipe} from '@app/shared/relative-time.pipe';
import {ErrorMessageComponent} from '@app/shared/error-message.component';

type Filter = 'all' | DeviceState;

@Component({
  selector: 'app-devices',
  standalone: true,
  imports: [RouterLink, DatePipe, MatTableModule, MatButtonModule, MatButtonToggleModule, MatIconModule, MatCardModule,
    MatProgressBarModule, StatusChipComponent, BatteryComponent, RelativeTimePipe, ErrorMessageComponent],
  templateUrl: './devices.component.html',
  styleUrl: './devices.component.scss'
})
export class DevicesComponent implements OnInit {
  readonly displayedColumns = ['status', 'location', 'mac', 'room', 'battery', 'last_contact'];
  devices: IDeviceStatus[] = [];
  filter: Filter = 'all';
  loading = true;
  error: unknown;

  constructor(private devicesService: DevicesService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.error = undefined;
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

  get unconfigured(): IDeviceStatus[] {
    return this.devices.filter(d => d.status === 'unconfigured');
  }

  get configured(): IDeviceStatus[] {
    return this.devices
      .filter(d => d.status !== 'unconfigured')
      .filter(d => this.filter === 'all' || d.status === this.filter)
      .sort((a, b) => (a.location || '').localeCompare(b.location || ''));
  }

  count(status: DeviceState): number {
    return this.devices.filter(d => d.status === status).length;
  }

  formatMac(mac: string): string {
    return mac.replace(/(.{2})(?=.)/g, '$1:');
  }
}
