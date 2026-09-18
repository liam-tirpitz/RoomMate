import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {Router, provideRouter} from '@angular/router';
import {provideNoopAnimations} from '@angular/platform-browser/animations';

import {RoomComponent} from './room.component';

describe('RoomComponent', () => {
  let component: RoomComponent;
  let fixture: ComponentFixture<RoomComponent>;
  let controller: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideNoopAnimations()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RoomComponent);
    component = fixture.componentInstance;
    controller = TestBed.inject(HttpTestingController);
    component.ngOnChanges();
    controller.expectOne('/api/status').flush({storage: 'SQLITE', writable: true, version: 'test', auth: 'token'});
    controller.expectOne('/api/tenants').flush([{id: '1', identifier: 'main', endpoint: 'https://x', user: 'u', secret: 'S'}]);
    controller.expectOne('/api/logos').flush([{name: 'logo.png', width: 200, height: 80, warnings: []}]);
    controller.expectOne('/api/devices').flush([]);
    fixture.detectChanges();
  });

  afterEach(() => controller.verify());

  it('preselects the only tenant and logo for a new room', () => {
    expect(component.isNew).toBeTrue();
    expect(component.form.controls.ews.controls.tenant_id.value).toBe('1');
    expect(component.form.controls.logo.value).toBe('logo.png');
  });

  it('creates an office with only its persons and opens it', () => {
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    component.form.patchValue({id_string: '202', name: 'Office', ews: {email: 'left-over@example.com', tenant_id: '1'}});
    component.changeType('office');
    component.form.controls.persons.at(0).patchValue({name: 'Ada', ews_email: 'ada@example.com', tenant_id: '1'});
    component.save();

    const request = controller.expectOne({method: 'POST', url: '/api/rooms'});
    expect(request.request.body.ews_info).toBeUndefined();
    expect(request.request.body.persons.length).toBe(1);
    request.flush({...request.request.body, id: '5'});
    expect(navigate).toHaveBeenCalledWith(['/rooms', '5'], {replaceUrl: true});
  });

  it('does not send an invalid room', () => {
    component.save();
    controller.expectNone('/api/rooms');
    expect(component.form.controls.name.touched).toBeTrue();
  });
});
