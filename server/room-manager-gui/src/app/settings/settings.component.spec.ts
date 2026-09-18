import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {provideNoopAnimations} from '@angular/platform-browser/animations';

import {SettingsComponent} from './settings.component';

const ORGANIZATION = {
  name: 'Institute', external_identifier: 'ext', soon_threshold_in_min: 15, night_start_hour: 19, night_end_hour: 8,
  timezone: 'Europe/Berlin', low_battery_voltage_cutoff_in_mv: 3100, default_logo: 'logo.png', device_offline_after_min: 120,
};

describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;
  let controller: HttpTestingController;

  function load(writable: boolean) {
    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    controller = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    controller.expectOne('/api/status').flush({storage: writable ? 'SQLITE' : 'FILE', writable, version: 'test', auth: 'token'});
    controller.expectOne('/api/organization').flush(ORGANIZATION);
    controller.expectOne('/api/logos').flush([{name: 'logo.png', width: 229, height: 85, warnings: []}]);
    fixture.detectChanges();
    // the logo preview fetches its image
    controller.match(request => request.url.startsWith('/api/logos/')).forEach(request => request.flush(new Blob()));
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()]
    })
    .compileComponents();
  });

  afterEach(() => controller.verify());

  it('saves the organization with numbers and keeps fields the form does not show', () => {
    load(true);
    component.form.controls.soon_threshold_in_min.setValue('10' as unknown as number);
    component.form.markAsDirty();
    component.save();
    const request = controller.expectOne({method: 'PUT', url: '/api/organization'});
    expect(request.request.body.soon_threshold_in_min).toBe(10);
    expect(request.request.body.external_identifier).toBe('ext');
    request.flush(request.request.body);
  });

  it('disables the form on the read-only backend', () => {
    load(false);
    expect(component.form.disabled).toBeTrue();
  });
});
