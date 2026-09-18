import {Component, OnInit} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatCardModule} from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatSnackBar, MatSnackBarModule} from '@angular/material/snack-bar';
import {forkJoin} from 'rxjs';
import {OrganizationService} from '@app/api/organization.service';
import {LogosService} from '@app/api/logos.service';
import {StatusService} from '@app/api/status.service';
import {IOrganization} from '@interfaces/IOrganization';
import {ILogo} from '@interfaces/ILogo';
import {ErrorMessageComponent, describeError} from '@app/shared/error-message.component';
import {AuthImageComponent} from '@app/shared/auth-image.component';
import {LogoUploadComponent} from '@app/shared/logo-upload.component';

const HOURS = Array.from({length: 24}, (_, hour) => hour);

function integer(value: number, min: number, max: number) {
  return new FormControl(value, {nonNullable: true, validators: [Validators.required, Validators.min(min), Validators.max(max), Validators.pattern(/^\d+$/)]});
}

// Organization settings (timezone, night hours, thresholds, default logo) and the logos in config/
@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [ReactiveFormsModule, MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatProgressBarModule, MatSnackBarModule, ErrorMessageComponent, AuthImageComponent, LogoUploadComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent implements OnInit {
  readonly hours = HOURS;
  readonly timezones: string[] = Intl.supportedValuesOf('timeZone');
  organization?: IOrganization;
  logos: ILogo[] = [];
  writable = false;
  loading = true;
  saving = false;
  error: unknown;

  readonly form = new FormGroup({
    name: new FormControl('', {nonNullable: true}),
    timezone: new FormControl('Europe/Berlin', {nonNullable: true, validators: Validators.required}),
    night_start_hour: integer(19, 0, 23),
    night_end_hour: integer(8, 0, 23),
    soon_threshold_in_min: integer(15, 0, 24 * 60),
    low_battery_voltage_cutoff_in_mv: integer(3100, 0, 5000),
    device_offline_after_min: integer(120, 1, 7 * 24 * 60),
    default_logo: new FormControl('', {nonNullable: true, validators: Validators.required}),
  });

  constructor(private organizationService: OrganizationService, private logosService: LogosService,
              private statusService: StatusService, private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.error = undefined;
    forkJoin({
      status: this.statusService.get(),
      organization: this.organizationService.get(),
      logos: this.logosService.list(),
    }).subscribe({
      next: ({status, organization, logos}) => {
        this.writable = status.writable;
        this.organization = organization;
        this.logos = logos;
        this.form.reset({...organization, device_offline_after_min: organization.device_offline_after_min ?? 120});
        if (!this.writable) this.form.disable();
        this.loading = false;
      },
      error: error => {
        this.error = error;
        this.loading = false;
      }
    });
  }

  // The server's clock is set to this timezone, so show the current time there as a check
  get localTime(): string {
    try {
      return new Date().toLocaleTimeString([], {timeZone: this.form.controls.timezone.value, hour: '2-digit', minute: '2-digit'});
    } catch {
      return '';
    }
  }

  save() {
    if (this.form.invalid || !this.organization) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    const value = this.form.getRawValue();
    const organization: IOrganization = {
      ...this.organization,
      ...value,
      night_start_hour: Number(value.night_start_hour),
      night_end_hour: Number(value.night_end_hour),
      soon_threshold_in_min: Number(value.soon_threshold_in_min),
      low_battery_voltage_cutoff_in_mv: Number(value.low_battery_voltage_cutoff_in_mv),
      device_offline_after_min: Number(value.device_offline_after_min),
    };
    this.organizationService.update(organization).subscribe({
      next: saved => {
        this.saving = false;
        this.organization = saved;
        this.form.reset({...saved, device_offline_after_min: saved.device_offline_after_min ?? 120});
        this.snackBar.open('Settings saved. Signs pick them up on their next wake-up.', undefined, {duration: 4000});
      },
      error: error => {
        this.saving = false;
        this.snackBar.open(describeError(error), 'Dismiss');
      }
    });
  }

  onLogoUploaded(logo: ILogo) {
    this.logos = [...this.logos.filter(existing => existing.name !== logo.name), logo].sort((a, b) => a.name.localeCompare(b.name));
  }

  // Cache-busted so a replaced logo shows its new content
  logoUrl(logo: ILogo): string {
    return `${this.logosService.url(logo.name)}?w=${logo.width}&h=${logo.height}`;
  }

  deleteLogo(logo: ILogo) {
    if (!confirm(`Delete the logo ${logo.name}?`)) {
      return;
    }
    this.logosService.delete(logo.name).subscribe({
      next: () => this.logos = this.logos.filter(existing => existing.name !== logo.name),
      error: error => this.snackBar.open(describeError(error), 'Dismiss')
    });
  }
}
