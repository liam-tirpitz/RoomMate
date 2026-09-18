import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {provideRouter} from '@angular/router';
import {provideNoopAnimations} from '@angular/platform-browser/animations';
import {DeviceComponent} from './device.component';

describe('DeviceComponent', () => {
  let fixture: ComponentFixture<DeviceComponent>;
  let controller: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeviceComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideNoopAnimations()]
    }).compileComponents();
    controller = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DeviceComponent);
    fixture.componentInstance.mac = 'aabbccddeeff';
    fixture.componentInstance.ngOnChanges();
    fixture.detectChanges();
  });

  it('loads the device, the rooms and the battery history', () => {
    controller.expectOne('/api/status').flush({storage: 'SQLITE', writable: true, version: '1', auth: 'token'});
    controller.expectOne('/api/organization').flush({low_battery_voltage_cutoff_in_mv: 3200});
    controller.expectOne('/api/devices/aabbccddeeff').flush({
      device_id: 'aabbccddeeff', location: 'Door', room_id: '3', room: {id: '3', name: 'Lab', id_string: '101'},
      last_contact: null, battery_mv: 4000, status: 'ok', battery_percent: 60
    });
    controller.expectOne('/api/rooms').flush([{id: '3', name: 'Lab', id_string: '101', room_number: 101, logo: ''}]);
    controller.expectOne(r => r.url === '/api/devices/aabbccddeeff/battery').flush([]);
    fixture.detectChanges();
    expect(fixture.componentInstance.roomId).toBe('3');
    expect(fixture.componentInstance.cutoff).toBe(3200);
    expect(fixture.componentInstance.dirty).toBeFalse();
    fixture.componentInstance.location = 'Window';
    expect(fixture.componentInstance.dirty).toBeTrue();
  });
});
