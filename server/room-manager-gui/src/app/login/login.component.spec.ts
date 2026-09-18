import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {Router, provideRouter} from '@angular/router';
import {provideNoopAnimations} from '@angular/platform-browser/animations';
import {LoginComponent} from './login.component';
import {AuthService} from '../api/auth.service';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let controller: HttpTestingController;
  let auth: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()]
    }).compileComponents();
    controller = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    controller.expectOne('/api/status').flush({storage: 'SQLITE', writable: true, version: '1', auth: 'token'});
  });

  afterEach(() => {
    auth.setToken(null);
    controller.verify();
  });

  it('drops a rejected token and shows an error', () => {
    fixture.componentInstance.token = 'wrong';
    fixture.componentInstance.submit();
    controller.expectOne('/api/auth/me').flush('Unauthorized', {status: 401, statusText: 'Unauthorized'});
    expect(auth.token).toBeNull();
    expect(fixture.componentInstance.error).toContain('rejected');
  });
});

describe('LoginComponent with OIDC', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let controller: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideRouter([{path: 'login', component: LoginComponent}]), provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()]
    }).compileComponents();
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  async function open(url: string) {
    await TestBed.inject(Router).navigateByUrl(url);
    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    controller.expectOne('/api/status').flush({storage: 'SQLITE', writable: true, version: '1', auth: 'oidc'});
    fixture.detectChanges();
  }

  it('offers only the OIDC sign-in and passes the page to return to', async () => {
    await open('/login?returnUrl=%2Frooms%2F4');
    expect(fixture.nativeElement.querySelector('input[name=token]')).toBeNull();
    const redirect = spyOn(TestBed.inject(AuthService), 'redirect');
    fixture.nativeElement.querySelector('button').click();
    expect(redirect).toHaveBeenCalledWith('/auth/login?returnTo=%2Frooms%2F4');
  });

  it('shows why the server refused the sign-in', async () => {
    await open('/login?error=Ada%20is%20not%20allowed%20to%20manage%20RoomMate.');
    expect(fixture.nativeElement.textContent).toContain('Ada is not allowed to manage RoomMate.');
  });
});
