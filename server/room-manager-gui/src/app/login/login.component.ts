import {Component, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {MatCardModule} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {AuthService} from '../api/auth.service';
import {IServerStatus, StatusService} from '../api/status.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatProgressBarModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {
  token = '';
  error = '';
  busy = false;
  status?: IServerStatus;

  constructor(private auth: AuthService, private statusService: StatusService,
              private router: Router, private route: ActivatedRoute) {}

  ngOnInit() {
    this.statusService.get().subscribe(status => this.status = status);
    // Set by the server when an OIDC sign-in failed or the user is not allowed in
    this.error = this.route.snapshot.queryParamMap.get('error') ?? '';
  }

  // The server's OIDC flow; it returns to returnTo afterwards
  signIn() {
    this.busy = true;
    this.auth.redirect(`/auth/login?returnTo=${encodeURIComponent(this.returnUrl)}`);
  }

  get returnUrl(): string {
    const url = this.route.snapshot.queryParamMap.get('returnUrl');
    return url && url.startsWith('/') && !url.startsWith('/login') ? url : '/';
  }

  submit() {
    const token = this.token.trim();
    if (!token) {
      return;
    }
    this.busy = true;
    this.error = '';
    this.auth.setToken(token);
    this.auth.me().subscribe({
      next: () => {
        this.busy = false;
        this.router.navigateByUrl(this.returnUrl);
      },
      error: (err) => {
        this.busy = false;
        this.auth.setToken(null);
        this.error = err?.status === 401 ? 'The token was rejected.'
          : err?.status === 403 ? 'The management API is disabled on this server (API_TOKEN is not set).'
          : 'The server could not be reached.';
      }
    });
  }
}
