import {TestBed} from '@angular/core/testing';
import {HttpClient, provideHttpClient, withInterceptors} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {Router, provideRouter} from '@angular/router';
import {authInterceptor} from './auth.interceptor';
import {AuthService} from '../api/auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ]
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    auth.setToken('secret');
  });

  afterEach(() => {
    auth.setToken(null);
    controller.verify();
  });

  it('adds the bearer token to management API requests', () => {
    http.get('/api/devices').subscribe();
    const request = controller.expectOne('/api/devices');
    expect(request.request.headers.get('Authorization')).toBe('Bearer secret');
    request.flush([]);
  });

  it('leaves device endpoints alone', () => {
    http.get('/data?devid=abc').subscribe();
    const request = controller.expectOne('/data?devid=abc');
    expect(request.request.headers.has('Authorization')).toBeFalse();
    request.flush({});
  });

  it('clears the token and goes to the login page on 401', () => {
    const navigate = spyOn(router, 'navigate');
    http.get('/api/devices').subscribe({error: () => undefined});
    controller.expectOne('/api/devices').flush('Unauthorized', {status: 401, statusText: 'Unauthorized'});
    expect(auth.token).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login'], jasmine.objectContaining({queryParams: jasmine.anything()}));
  });
});
