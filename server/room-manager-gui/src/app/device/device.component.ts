import {Component, Input, OnChanges} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {DatePipe} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {MatCardModule} from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatIconModule} from '@angular/material/icon';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatSnackBar, MatSnackBarModule} from '@angular/material/snack-bar';
import {forkJoin} from 'rxjs';
import {DevicesService} from '@app/api/devices.service';
import {RoomsService, roomLabel} from '@app/api/rooms.service';
import {StatusService} from '@app/api/status.service';
import {OrganizationService} from '@app/api/organization.service';
import {IDeviceStatus} from '@interfaces/IDeviceStatus';
import {IRoom} from '@interfaces/IRoom';
import {IBatterySample} from '@interfaces/IBatterySample';
import {StatusChipComponent} from '@app/shared/status-chip.component';
import {BatteryComponent} from '@app/shared/battery.component';
import {BatteryChartComponent} from '@app/shared/battery-chart.component';
import {RelativeTimePipe} from '@app/shared/relative-time.pipe';
import {ErrorMessageComponent, describeError} from '@app/shared/error-message.component';
import {AuthImageComponent} from '@app/shared/auth-image.component';

@Component({
  selector: 'app-device',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule, MatCardModule, MatButtonModule, MatButtonToggleModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatProgressBarModule, MatSnackBarModule,
    StatusChipComponent, BatteryComponent, BatteryChartComponent, RelativeTimePipe, ErrorMessageComponent, AuthImageComponent],
  templateUrl: './device.component.html',
  styleUrl: './device.component.scss'
})
export class DeviceComponent implements OnChanges {
  // Bound from the route parameter by withComponentInputBinding
  @Input({required: true}) mac!: string;

  device?: IDeviceStatus;
  rooms: IRoom[] = [];
  samples: IBatterySample[] = [];
  cutoff = 3100;
  days = 30;
  location = '';
  roomId: string | null = null;
  writable = false;
  loading = true;
  saving = false;
  error: unknown;
  screenUrl = '';
  screenMissing = false;
  previewLoading = false;

  readonly roomLabel = roomLabel;

  constructor(private devicesService: DevicesService, private roomsService: RoomsService,
              private organizationService: OrganizationService, private statusService: StatusService,
              private router: Router, private snackBar: MatSnackBar) {}

  ngOnChanges() {
    this.load();
  }

  load() {
    this.loading = true;
    this.error = undefined;
    this.statusService.get().subscribe(status => this.writable = status.writable);
    this.organizationService.get().subscribe({
      next: org => this.cutoff = org.low_battery_voltage_cutoff_in_mv,
      error: () => undefined
    });
    forkJoin({device: this.devicesService.get(this.mac), rooms: this.roomsService.list()}).subscribe({
      next: ({device, rooms}) => {
        this.device = device;
        this.rooms = rooms;
        this.location = device.location ?? '';
        this.roomId = device.room?.id ?? (typeof device.room_id === 'string' ? device.room_id : null);
        this.screenUrl = `${this.devicesService.screenUrl(this.mac)}?t=${Date.now()}`;
        this.screenMissing = false;
        this.loading = false;
        this.loadHistory();
      },
      error: error => {
        this.error = error;
        this.loading = false;
      }
    });
  }

  loadHistory() {
    this.devicesService.batteryHistory(this.mac, this.days).subscribe({
      next: samples => this.samples = samples,
      error: () => this.samples = []
    });
  }

  get formattedMac(): string {
    return this.mac.replace(/(.{2})(?=.)/g, '$1:');
  }

  get dirty(): boolean {
    if (!this.device) return false;
    const current = this.device.room?.id ?? (typeof this.device.room_id === 'string' ? this.device.room_id : null);
    return this.location !== (this.device.location ?? '') || (this.roomId ?? null) !== (current ?? null);
  }

  save() {
    this.saving = true;
    this.devicesService.update(this.mac, {location: this.location, room_id: this.roomId}).subscribe({
      next: () => {
        this.saving = false;
        this.snackBar.open('Device saved', undefined, {duration: 3000});
        this.load();
      },
      error: error => {
        this.saving = false;
        this.snackBar.open(describeError(error), 'Dismiss');
      }
    });
  }

  renderPreview() {
    this.previewLoading = true;
    this.screenMissing = false;
    this.screenUrl = this.devicesService.previewUrl(this.mac);
  }

  onScreenLoaded() {
    this.previewLoading = false;
  }

  onScreenError() {
    this.previewLoading = false;
    this.screenMissing = true;
  }

  requestRedraw() {
    this.devicesService.requestRedraw(this.mac).subscribe({
      next: () => this.snackBar.open('The sign redraws on its next wake-up', undefined, {duration: 4000}),
      error: error => this.snackBar.open(describeError(error), 'Dismiss')
    });
  }

  delete() {
    if (!confirm(`Delete device ${this.formattedMac}? It reappears as unconfigured the next time it contacts the server.`)) {
      return;
    }
    this.devicesService.delete(this.mac).subscribe({
      next: () => this.router.navigate(['/devices']),
      error: error => this.snackBar.open(describeError(error), 'Dismiss')
    });
  }
}
