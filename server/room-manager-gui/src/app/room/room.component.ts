import {Component, Input, OnChanges} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {ReactiveFormsModule} from '@angular/forms';
import {MatCardModule} from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatIconModule} from '@angular/material/icon';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatSnackBar, MatSnackBarModule} from '@angular/material/snack-bar';
import {forkJoin, of} from 'rxjs';
import {catchError} from 'rxjs/operators';
import {RoomsService} from '@app/api/rooms.service';
import {TenantsService} from '@app/api/tenants.service';
import {LogosService} from '@app/api/logos.service';
import {DevicesService} from '@app/api/devices.service';
import {StatusService} from '@app/api/status.service';
import {IRoom} from '@interfaces/IRoom';
import {IEWSTenant} from '@interfaces/IEWSTenant';
import {ILogo} from '@interfaces/ILogo';
import {IDeviceStatus} from '@interfaces/IDeviceStatus';
import {ErrorMessageComponent, describeError} from '@app/shared/error-message.component';
import {AuthImageComponent} from '@app/shared/auth-image.component';
import {LogoUploadComponent} from '@app/shared/logo-upload.component';
import {StatusChipComponent} from '@app/shared/status-chip.component';
import {MAX_PERSONS, ROOM_TYPES, RoomType, addPerson, createRoomForm, patchRoomForm, setRoomType, toRoom} from './room-form';

// Creates (/rooms/new) or edits (/rooms/:id) a room or office
@Component({
  selector: 'app-room',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, MatCardModule, MatButtonModule, MatButtonToggleModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatProgressBarModule, MatSnackBarModule,
    ErrorMessageComponent, AuthImageComponent, LogoUploadComponent, StatusChipComponent],
  templateUrl: './room.component.html',
  styleUrl: './room.component.scss'
})
export class RoomComponent implements OnChanges {
  // Bound from the route parameter; missing on /rooms/new
  @Input() id?: string;

  readonly form = createRoomForm();
  readonly types = ROOM_TYPES;
  readonly maxPersons = MAX_PERSONS;
  room?: IRoom;
  tenants: IEWSTenant[] = [];
  logos: ILogo[] = [];
  devices: IDeviceStatus[] = [];
  writable = false;
  loading = true;
  saving = false;
  error: unknown;
  previewUrl = '';
  previewLoading = false;
  previewFailed = false;

  constructor(private roomsService: RoomsService, private tenantsService: TenantsService,
              private logosService: LogosService, private devicesService: DevicesService,
              private statusService: StatusService, private router: Router, private snackBar: MatSnackBar) {}

  get isNew(): boolean {
    return !this.id;
  }

  get type(): RoomType {
    return this.form.controls.type.value;
  }

  ngOnChanges() {
    this.load();
  }

  load() {
    this.loading = true;
    this.error = undefined;
    this.previewUrl = '';
    forkJoin({
      status: this.statusService.get(),
      tenants: this.tenantsService.list(),
      logos: this.logosService.list().pipe(catchError(() => of([] as ILogo[]))),
      devices: this.devicesService.list().pipe(catchError(() => of([] as IDeviceStatus[]))),
      room: this.id ? this.roomsService.get(this.id) : of(undefined),
    }).subscribe({
      next: ({status, tenants, logos, devices, room}) => {
        this.writable = status.writable;
        this.tenants = tenants;
        this.logos = logos;
        this.room = room;
        this.devices = room ? devices.filter(device => device.room?.id === room.id) : [];
        if (room) {
          patchRoomForm(this.form, room);
        } else {
          this.form.reset();
          this.form.controls.persons.clear();
          setRoomType(this.form, 'ews');
          this.fillSoleTenant();
          if (logos.length === 1) this.form.controls.logo.setValue(logos[0].name);
        }
        if (!this.writable) this.form.disable();
        this.loading = false;
      },
      error: error => {
        this.error = error;
        this.loading = false;
      }
    });
  }

  changeType(type: RoomType) {
    setRoomType(this.form, type);
    this.fillSoleTenant();
  }

  addPerson() {
    addPerson(this.form);
    this.fillSoleTenant();
  }

  // With a single tenant there is nothing to choose, so empty tenant fields get it
  private fillSoleTenant() {
    const id = this.tenants.length === 1 ? this.tenants[0].id : undefined;
    if (!id) return;
    const fields = [this.form.controls.ews.controls.tenant_id, ...this.form.controls.persons.controls.map(person => person.controls.tenant_id)];
    for (const field of fields) {
      if (!field.value) field.setValue(id);
    }
  }

  removePerson(index: number) {
    this.form.controls.persons.removeAt(index);
    this.form.controls.persons.markAsDirty();
  }

  onLogoUploaded(logo: ILogo) {
    this.logos = [...this.logos.filter(existing => existing.name !== logo.name), logo].sort((a, b) => a.name.localeCompare(b.name));
    this.form.controls.logo.setValue(logo.name);
    this.form.controls.logo.markAsDirty();
  }

  logoWarning(name: string): string {
    return this.logos.find(logo => logo.name === name)?.warnings.join(' ') ?? '';
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Some fields are missing or invalid.', undefined, {duration: 3000});
      setTimeout(() => document.querySelector('app-room .mat-form-field-invalid')?.scrollIntoView({behavior: 'smooth', block: 'center'}));
      return;
    }
    this.saving = true;
    const room = toRoom(this.form);
    const request = this.id ? this.roomsService.update(this.id, room) : this.roomsService.create(room);
    request.subscribe({
      next: saved => {
        this.saving = false;
        this.snackBar.open(this.isNew ? 'Room created' : 'Room saved', undefined, {duration: 3000});
        if (this.isNew) {
          this.router.navigate(['/rooms', saved.id], {replaceUrl: true});
        } else {
          this.room = saved;
          patchRoomForm(this.form, saved);
          this.form.markAsPristine();
          if (this.previewUrl) this.renderPreview();
        }
      },
      error: error => {
        this.saving = false;
        this.snackBar.open(describeError(error), 'Dismiss');
      }
    });
  }

  renderPreview() {
    if (!this.id) return;
    this.previewLoading = true;
    this.previewFailed = false;
    this.previewUrl = this.roomsService.previewUrl(this.id);
  }

  onPreviewLoaded() {
    this.previewLoading = false;
  }

  onPreviewFailed(error: unknown) {
    this.previewLoading = false;
    this.previewFailed = true;
    this.snackBar.open(`Preview failed: ${describeError(error)}`, 'Dismiss');
  }

  delete() {
    if (!this.id || !this.room) return;
    const signs = this.devices.length
      ? ` ${this.devices.length === 1 ? 'One sign shows' : `${this.devices.length} signs show`} it and will switch to the new-device screen.`
      : '';
    if (!confirm(`Delete ${this.room.name}?${signs}`)) {
      return;
    }
    this.roomsService.delete(this.id).subscribe({
      next: () => this.router.navigate(['/rooms']),
      error: error => this.snackBar.open(describeError(error), 'Dismiss')
    });
  }
}
