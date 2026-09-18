import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, provideRouter} from '@angular/router';
import {Observable, firstValueFrom} from 'rxjs';
import {authGuard} from './auth.guard';
import {AuthService} from '../api/auth.service';

describe('authGuard', () => {
  let controller: HttpTestingController;
  let auth: AuthService;

  function run(url = '/rooms/4'): Promise<boolean | UrlTree> {
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {url} as RouterStateSnapshot)) as Observable<boolean | UrlTree>;
    return firstValueFrom(result);
  }

  function status(auth: 'token' | 'oidc') {
    controller.expectOne('/api/status').flush({storage: 'SQLITE', writable: true, version: '1', auth});
  }

  beforeEach(() => {
    TestBed.configureTestingModule({providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]});
    controller = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => {
    auth.clear();
    controller.verify();
  });

  it('lets a stored API token through without asking the server', async () => {
    auth.setToken('secret');
    expect(await run()).toBeTrue();
  });

  it('sends a visitor without token to the login page when the server uses tokens', async () => {
    const result = run();
    status('token');
    expect(String(await result)).toBe('/login?returnUrl=%2Frooms%2F4');
  });

  it('asks the server about the OIDC session and remembers the user', async () => {
    const result = run();
    status('oidc');
    controller.expectOne('/api/auth/me').flush({authenticated: true, method: 'oidc', user: {name: 'Ada Lovelace'}});
    expect(await result).toBeTrue();
    expect(auth.user?.name).toBe('Ada Lovelace');
    // Known now, so the next navigation needs no request
    expect(await run('/devices')).toBeTrue();
  });

  it('sends the visitor to the login page when there is no OIDC session', async () => {
    const result = run();
    status('oidc');
    controller.expectOne('/api/auth/me').flush({error: 'Unauthorized'}, {status: 401, statusText: 'Unauthorized'});
    expect(String(await result)).toBe('/login?returnUrl=%2Frooms%2F4');
  });

  it('ends an OIDC session on the server when signing out', async () => {
    const redirect = spyOn(auth, 'redirect');
    const result = run();
    status('oidc');
    controller.expectOne('/api/auth/me').flush({authenticated: true, method: 'oidc', user: {name: 'Ada'}});
    await result;
    expect(auth.logout()).toBeTrue();
    expect(redirect).toHaveBeenCalledWith('/auth/logout');
    expect(auth.user).toBeUndefined();
  });
});
