import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {provideNoopAnimations} from '@angular/platform-browser/animations';

import {TenantsComponent} from './tenants.component';

describe('TenantsComponent', () => {
  let component: TenantsComponent;
  let fixture: ComponentFixture<TenantsComponent>;
  let controller: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TenantsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TenantsComponent);
    component = fixture.componentInstance;
    controller = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    controller.expectOne('/api/status').flush({storage: 'SQLITE', writable: true, version: 'test', auth: 'token'});
    controller.expectOne('/api/tenants').flush([
      {id: '1', identifier: 'main', endpoint: 'https://mail.example.com/EWS/Exchange.asmx', user: 'u', secret: 'EWS_PASSWORD', secret_available: false},
    ]);
    fixture.detectChanges();
  });

  afterEach(() => controller.verify());

  it('shows a missing password variable', () => {
    expect(fixture.nativeElement.textContent).toContain('Missing');
    expect(fixture.nativeElement.textContent).toContain('EWS_PASSWORD');
  });

  it('rejects a password in place of a variable name', () => {
    component.create();
    component.form.setValue({identifier: 'x', endpoint: 'https://mail.example.com', user: 'u', secret: 'my password'});
    component.save();
    controller.expectNone({method: 'POST', url: '/api/tenants'});
    expect(component.form.controls.secret.hasError('pattern')).toBeTrue();
  });

  it('shows the result of a connection test', () => {
    component.test(component.tenants[0]);
    controller.expectOne({method: 'POST', url: '/api/tenants/1/test'}).flush({ok: false, error: 'Missing Exchange Credentials!'});
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Missing Exchange Credentials!');
  });
});
