import {Component, OnInit} from '@angular/core';
import {RouterLink} from '@angular/router';
import {MatTableModule} from '@angular/material/table';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {forkJoin, of} from 'rxjs';
import {catchError} from 'rxjs/operators';
import {RoomsService} from '@app/api/rooms.service';
import {DevicesService} from '@app/api/devices.service';
import {TenantsService} from '@app/api/tenants.service';
import {StatusService} from '@app/api/status.service';
import {IRoom} from '@interfaces/IRoom';
import {IDeviceStatus} from '@interfaces/IDeviceStatus';
import {IEWSTenant} from '@interfaces/IEWSTenant';
import {ErrorMessageComponent} from '@app/shared/error-message.component';
import {ROOM_TYPES, roomType} from '@app/room/room-form';

@Component({
  selector: 'app-rooms',
  standalone: true,
  imports: [RouterLink, MatTableModule, MatButtonModule, MatIconModule, MatProgressBarModule, ErrorMessageComponent],
  templateUrl: './rooms.component.html',
  styleUrl: './rooms.component.scss'
})
export class RoomsComponent implements OnInit {
  readonly displayedColumns = ['room', 'type', 'calendar', 'signs'];
  rooms: IRoom[] = [];
  devices: IDeviceStatus[] = [];
  tenants: IEWSTenant[] = [];
  writable = false;
  loading = true;
  error: unknown;

  constructor(private roomsService: RoomsService, private devicesService: DevicesService,
              private tenantsService: TenantsService, private statusService: StatusService) {}

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.loading = true;
    this.error = undefined;
    this.statusService.get().subscribe(status => this.writable = status.writable);
    forkJoin({
      rooms: this.roomsService.list(),
      devices: this.devicesService.list().pipe(catchError(() => of([] as IDeviceStatus[]))),
      tenants: this.tenantsService.list().pipe(catchError(() => of([] as IEWSTenant[]))),
    }).subscribe({
      next: ({rooms, devices, tenants}) => {
        this.rooms = rooms;
        this.devices = devices;
        this.tenants = tenants;
        this.loading = false;
      },
      error: error => {
        this.error = error;
        this.loading = false;
      }
    });
  }

  type(room: IRoom) {
    const type = roomType(room);
    return ROOM_TYPES.find(option => option.value === type)!;
  }

  calendar(room: IRoom): string {
    if (room.persons) return room.persons.map(person => person.name).join(', ');
    if (room.ical_info) return room.ical_info.endpoint;
    if (room.ews_info) return `${room.ews_info.email} (${this.tenantName(room.ews_info.tenant_id)})`;
    return '';
  }

  signs(room: IRoom): number {
    return this.devices.filter(device => device.room?.id === room.id).length;
  }

  private tenantName(id: string): string {
    return this.tenants.find(tenant => tenant.id === id)?.identifier ?? `tenant ${id}`;
  }
}
