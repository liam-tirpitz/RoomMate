import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';

export interface IAuthInfo {
  authenticated: boolean;
  method: 'token' | 'oidc';
}

const TOKEN_KEY = 'roommate.api_token';

// Holds the API token for this browser tab. The OIDC session cookie replaces it later.
@Injectable({providedIn: 'root'})
export class AuthService {
  constructor(private http: HttpClient) {}

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

  get isLoggedIn(): boolean {
    return !!this.token;
  }

  me(): Observable<IAuthInfo> {
    return this.http.get<IAuthInfo>('/api/auth/me');
  }

  logout() {
    this.setToken(null);
  }
}
