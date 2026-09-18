import {Component, EventEmitter, Input, OnChanges, OnDestroy, Output} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {DomSanitizer, SafeUrl} from '@angular/platform-browser';

// A plain <img> cannot send the bearer token, so the image is fetched through HttpClient
// (which the auth interceptor handles) and shown from an object URL.
@Component({
  selector: 'app-auth-image',
  standalone: true,
  template: `@if (objectUrl) {<img [src]="objectUrl" [alt]="alt" [class]="imgClass">}`,
  styles: `:host { display: block; } img { display: block; }`
})
export class AuthImageComponent implements OnChanges, OnDestroy {
  @Input({required: true}) src!: string;
  @Input() alt = '';
  @Input() imgClass = '';
  @Output() loaded = new EventEmitter<void>();
  @Output() failed = new EventEmitter<unknown>();
  objectUrl: SafeUrl | null = null;
  private rawUrl: string | null = null;

  constructor(private http: HttpClient, private sanitizer: DomSanitizer) {}

  ngOnChanges() {
    this.revoke();
    if (!this.src) {
      return;
    }
    const requested = this.src;
    this.http.get(requested, {responseType: 'blob'}).subscribe({
      next: blob => {
        if (requested !== this.src) return; // a newer src won the race
        this.rawUrl = URL.createObjectURL(blob);
        this.objectUrl = this.sanitizer.bypassSecurityTrustUrl(this.rawUrl);
        this.loaded.emit();
      },
      error: error => this.failed.emit(error)
    });
  }

  ngOnDestroy() {
    this.revoke();
  }

  private revoke() {
    if (this.rawUrl) {
      URL.revokeObjectURL(this.rawUrl);
      this.rawUrl = null;
    }
    this.objectUrl = null;
  }
}
