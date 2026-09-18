import {IRoom} from '@interfaces/IRoom';
import {MAX_PERSONS, addPerson, createRoomForm, patchRoomForm, roomType, setRoomType, toRoom} from './room-form';

function fillHeader(form: ReturnType<typeof createRoomForm>) {
  form.patchValue({id_string: '200a', name: 'Meeting room', logo: 'logo.png'});
}

describe('room form', () => {
  it('sends only the calendar source of the chosen type', () => {
    const form = createRoomForm();
    fillHeader(form);
    form.patchValue({ews: {email: 'room@example.com', tenant_id: '1'}, ical: {endpoint: 'https://calendar.example.com/room.ics'}});

    const ews = toRoom(form);
    expect(ews.ews_info).toEqual({email: 'room@example.com', tenant_id: '1'});
    expect(ews.ical_info).toBeUndefined();
    expect(ews.persons).toBeUndefined();

    setRoomType(form, 'ical');
    const ical = toRoom(form);
    expect(ical.ical_info).toEqual({endpoint: 'https://calendar.example.com/room.ics'});
    expect(ical.ews_info).toBeUndefined();
    expect(ical.persons).toBeUndefined();
  });

  it('validates only the fields of the chosen type', () => {
    const form = createRoomForm();
    fillHeader(form);
    form.patchValue({ical: {endpoint: 'https://calendar.example.com/room.ics'}});
    expect(form.valid).withContext('Exchange fields are empty').toBeFalse();

    setRoomType(form, 'ical');
    expect(form.valid).withContext('the empty Exchange fields no longer count').toBeTrue();
    expect(form.controls.ews.disabled).toBeTrue();
    expect(form.controls.persons.disabled).toBeTrue();
  });

  it('starts an office with one person and allows at most two', () => {
    const form = createRoomForm();
    setRoomType(form, 'office');
    expect(form.controls.persons.length).toBe(1);

    expect(addPerson(form)).toBeTrue();
    expect(form.controls.persons.length).toBe(MAX_PERSONS);
    expect(addPerson(form)).toBeFalse();
    expect(form.controls.persons.length).toBe(MAX_PERSONS);
  });

  it('marks an office without persons or with too many invalid', () => {
    const form = createRoomForm();
    setRoomType(form, 'office');
    form.controls.persons.clear();
    expect(form.controls.persons.hasError('minPersons')).toBeTrue();

    for (let i = 0; i < 3; i++) addPerson(form);
    form.controls.persons.push(form.controls.persons.at(0));
    expect(form.controls.persons.length).toBe(3);
    expect(form.controls.persons.hasError('maxPersons')).toBeTrue();
  });

  it('turns persons into the API shape', () => {
    const form = createRoomForm();
    fillHeader(form);
    setRoomType(form, 'office');
    form.controls.persons.at(0).patchValue({name: ' Ada ', job: 'Researcher', email: '', ews_email: 'ada@example.com', tenant_id: '2'});

    const room = toRoom(form);
    expect(room.ews_info).toBeUndefined();
    expect(room.persons).toEqual([{
      name: 'Ada', job: 'Researcher', group: '', email: undefined, phone: undefined,
      ews_info: {email: 'ada@example.com', tenant_id: '2'},
    }]);
  });

  it('loads an existing office and keeps an empty room number empty', () => {
    const office: IRoom = {
      id: '3', room_number: null, id_string: '202', name: 'Office', logo: 'logo.png', ews_info: undefined, ical_info: undefined,
      persons: [{name: 'Ada', job: '', group: '', email: undefined, phone: undefined, ews_info: {email: 'ada@example.com', tenant_id: '1'}}],
    };
    const form = createRoomForm();
    patchRoomForm(form, office);

    expect(form.controls.type.value).toBe('office');
    expect(form.valid).toBeTrue();
    expect(toRoom(form).room_number).toBeNull();
    expect(roomType(office)).toBe('office');
  });
});
