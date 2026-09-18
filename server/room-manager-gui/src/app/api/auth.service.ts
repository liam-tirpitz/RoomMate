import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, of} from 'rxjs';
import {catchError, map, switchMap, tap} from 'rxjs/operators';
import {IAuthInfo} from '@interfaces/IServerStatus';
import {StatusService} from './status.service';

export type {IAuthInfo};

const TOKEN_KEY = 'roommate.api_token';

// Two ways in: the API token (kept in this browser tab) when the server has no OIDC, or an OIDC session,
// which lives in an httpOnly cookie that only the server can read.
@Injectable({providedIn: 'root'})
export class AuthService {
  // The server's answer for an OIDC session, once confirmed
  private session: IAuthInfo | null = null;

  constructor(private http: HttpClient, private statusService: StatusService) {}

  get token(): string | null {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  setToken(token: string | null) {
    try {
      if (token) {
        sessionStorage.setItem(TOKEN_KEY, token);
      } else {
        sessionStorage.removeItem(TOKEN_KEY);
      }
    } catch {
      // Private mode or blocked storage: the user has to log in again after a reload
    }
  }

  // Who is signed in with OIDC, for the toolbar
  get user(): IAuthInfo['user'] {
    return this.session?.user;
  }

  // Whether the user may see the app. With OIDC this asks the server, because the session cookie is not readable here.
  check(): Observable<boolean> {
    if (this.token || this.session) {
      return of(true);
    }
    return this.statusService.get().pipe(
      switchMap(status => status.auth !== 'oidc' ? of(false) : this.me().pipe(
        tap(info => this.session = info.method === 'oidc' ? info : null),
        map(() => true),
        catchError(() => of(false))
      ))
    );
  }

  me(): Observable<IAuthInfo> {
    return this.http.get<IAuthInfo>('/api/auth/me');
  }

  // Forgets the credentials without leaving the page, e.g. after a 401
  clear() {
    this.setToken(null);
    this.session = null;
  }

  // Returns true when the browser is being sent to the server to end the OIDC session
  logout(): boolean {
    const hadSession = !!this.session;
    this.clear();
    if (hadSession) {
      this.redirect('/auth/logout');
    }
    return hadSession;
  }

  // Full page navigations to the server's /auth endpoints; replaced in specs
  redirect(url: string) {
    window.location.assign(url);
  }
}
