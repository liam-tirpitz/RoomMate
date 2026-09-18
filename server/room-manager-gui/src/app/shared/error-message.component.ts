import {Component, Input} from '@angular/core';
import {HttpErrorResponse} from '@angular/common/http';
import {MatIconModule} from '@angular/material/icon';

// Turns an HTTP error into one readable line
export function describeError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error;
    const message = typeof body === 'string' ? body : body?.error ?? body?.message;
    if (error.status === 0) return 'The server could not be reached.';
    if (error.status === 501) return 'This server runs the read-only file backend.';
    return message ? `${message} (${error.status})` : `Request failed (${error.status}).`;
  }
  return String(error);
}

@Component({
  selector: 'app-error-message',
  standalone: true,
  imports: [MatIconModule],
  template: `@if (error) {<p class="error"><mat-icon inline>error</mat-icon> {{ text }}</p>}`,
  styles: `.error { display: flex; align-items: center; gap: 0.5rem; color: #a12622; margin: 0.5rem 0; }`
})
export class ErrorMessageComponent {
  @Input() error: unknown;
  get text() { return describeError(this.error); }
}
