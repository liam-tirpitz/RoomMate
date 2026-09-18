import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {provideRouter} from '@angular/router';
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
