import {Component, ElementRef, EventEmitter, Input, Output, ViewChild} from '@angular/core';
import {HttpErrorResponse} from '@angular/common/http';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatSnackBar, MatSnackBarModule} from '@angular/material/snack-bar';
import {LogosService} from '@app/api/logos.service';
import {ILogo} from '@interfaces/ILogo';
import {describeError} from '@app/shared/error-message.component';

// Uploads a PNG or JPEG logo. Asks before replacing a logo with the same name and shows the server's size warnings.
@Component({
  selector: 'app-logo-upload',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatSnackBarModule],
  template: `
    <input #file type="file" accept="image/png,image/jpeg" hidden (change)="onFileSelected()">
    <button mat-stroked-button type="button" (click)="file.click()" [disabled]="disabled || uploading">
      <mat-icon>upload</mat-icon> {{ uploading ? 'Uploading…' : label }}
    </button>
  `
})
export class LogoUploadComponent {
  @Input() label = 'Upload logo';
  @Input() disabled = false;
  @Output() uploaded = new EventEmitter<ILogo>();
  @ViewChild('file') fileInput!: ElementRef<HTMLInputElement>;
  uploading = false;

  constructor(private logosService: LogosService, private snackBar: MatSnackBar) {}

  onFileSelected() {
    const input = this.fileInput.nativeElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) {
      this.upload(file, false);
    }
  }

  private upload(file: File, overwrite: boolean) {
    this.uploading = true;
    this.logosService.upload(file, overwrite).subscribe({
      next: logo => {
        this.uploading = false;
        const message = logo.warnings.length ? `Uploaded ${logo.name}. ${logo.warnings.join(' ')}` : `Uploaded ${logo.name}`;
        this.snackBar.open(message, logo.warnings.length ? 'Dismiss' : undefined, {duration: logo.warnings.length ? undefined : 3000});
        this.uploaded.emit(logo);
      },
      error: error => {
        this.uploading = false;
        if (error instanceof HttpErrorResponse && error.status === 409 && !overwrite
            && confirm(`A logo named like "${file.name}" already exists. Replace it? Rooms using it will show the new one.`)) {
          this.upload(file, true);
        } else if (!(error instanceof HttpErrorResponse && error.status === 409)) {
          this.snackBar.open(describeError(error), 'Dismiss');
        }
      }
    });
  }
}
