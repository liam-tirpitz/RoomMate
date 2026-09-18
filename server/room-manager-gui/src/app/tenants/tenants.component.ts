import {Component, OnInit} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatTableModule} from '@angular/material/table';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatCardModule} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatSnackBar, MatSnackBarModule} from '@angular/material/snack-bar';
import {IConnectionTest, TenantsService} from '@app/api/tenants.service';
import {StatusService} from '@app/api/status.service';
import {IEWSTenant} from '@interfaces/IEWSTenant';
import {ErrorMessageComponent, describeError} from '@app/shared/error-message.component';

interface TestState {
  running: boolean;
  result?: IConnectionTest;
}

// Exchange tenants: the EWS endpoint and service account the server signs in with.
// The password stays in an environment variable on the server; only its name is stored here.
@Component({
  selector: 'app-tenants',
  standalone: true,
  imports: [ReactiveFormsModule, MatTableModule, MatButtonModule, MatIconModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatProgressBarModule, MatProgressSpinnerModule, MatTooltipModule, MatSnackBarModule, ErrorMessageComponent],
  templateUrl: './tenants.component.html',
  styleUrl: './tenants.component.scss'
})
export class TenantsComponent implements OnInit {
  readonly displayedColumns = ['identifier', 'account', 'secret', 'connection', 'actions'];
  tenants: IEWSTenant[] = [];
  tests: Partial<Record<string, TestState>> = {};
  writable = false;
  loading = true;
  saving = false;
  error: unknown;
  // null: editor closed, '': new tenant, otherwise the id being edited
  editing: string | null = null;

  readonly form = new FormGroup({
    identifier: new FormControl('', {nonNullable: true, validators: Validators.required}),
    endpoint: new FormControl('', {nonNullable: true, validators: [Validators.required, Validators.pattern(/^https?:\/\//)]}),
    user: new FormControl('', {nonNullable: true, validators: Validators.required}),
    secret: new FormControl('', {nonNullable: true, validators: [Validators.required, Validators.pattern(/^[A-Za-z_][A-Za-z0-9_]*$/)]}),
  });

  constructor(private tenantsService: TenantsService, private statusService: StatusService, private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.statusService.get().subscribe(status => this.writable = status.writable);
    this.load();
  }

  load() {
    this.loading = true;
    this.error = undefined;
    this.tenantsService.list().subscribe({
      next: tenants => {
        this.tenants = tenants;
        this.loading = false;
      },
      error: error => {
        this.error = error;
        this.loading = false;
      }
    });
  }

  create() {
    this.editing = '';
    this.form.reset();
  }

  edit(tenant: IEWSTenant) {
    this.editing = tenant.id ?? null;
    this.form.reset({identifier: tenant.identifier, endpoint: tenant.endpoint, user: tenant.user, secret: tenant.secret});
  }

  cancel() {
    this.editing = null;
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    const tenant = this.form.getRawValue();
    const request = this.editing ? this.tenantsService.update(this.editing, tenant) : this.tenantsService.create(tenant);
    request.subscribe({
      next: saved => {
        this.saving = false;
        this.editing = null;
        this.snackBar.open(saved.secret_available ? 'Tenant saved'
          : `Tenant saved. Set the environment variable ${saved.secret} on the server before signs can use it.`,
          saved.secret_available ? undefined : 'Dismiss', {duration: saved.secret_available ? 3000 : undefined});
        if (saved.id) delete this.tests[saved.id];
        this.load();
      },
      error: error => {
        this.saving = false;
        this.snackBar.open(describeError(error), 'Dismiss');
      }
    });
  }

  test(tenant: IEWSTenant) {
    const id = tenant.id!;
    this.tests[id] = {running: true};
    this.tenantsService.test(id).subscribe({
      next: result => this.tests[id] = {running: false, result},
      error: error => this.tests[id] = {running: false, result: {ok: false, error: describeError(error)}}
    });
  }

  delete(tenant: IEWSTenant) {
    if (!confirm(`Delete the tenant ${tenant.identifier}?`)) {
      return;
    }
    this.tenantsService.delete(tenant.id!).subscribe({
      next: () => {
        if (this.editing === tenant.id) this.editing = null;
        this.load();
      },
      error: error => this.snackBar.open(describeError(error), 'Dismiss')
    });
  }
}
