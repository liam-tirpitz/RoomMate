import {AbstractControl, FormArray, FormControl, FormGroup, ValidationErrors, Validators} from '@angular/forms';
import {IRoom} from '@interfaces/IRoom';
import {IPerson} from '@interfaces/IPerson';

// A room reads its calendar from exactly one source; an office shows up to two persons
export type RoomType = 'ews' | 'ical' | 'office';
export const MAX_PERSONS = 2;

export const ROOM_TYPES: {value: RoomType, label: string, icon: string, hint: string}[] = [
  {value: 'ews', label: 'Exchange room', icon: 'event', hint: 'Bookings from a room mailbox in Exchange'},
  {value: 'ical', label: 'iCal room', icon: 'calendar_month', hint: 'Bookings from an iCal feed'},
  {value: 'office', label: 'Office', icon: 'badge', hint: 'Up to two people with their Exchange status'},
];

export function roomType(room: Pick<IRoom, 'ews_info' | 'ical_info' | 'persons'>): RoomType {
  if (room.persons) return 'office';
  if (room.ical_info) return 'ical';
  return 'ews';
}

export type PersonForm = FormGroup<{
  name: FormControl<string>;
  job: FormControl<string>;
  group: FormControl<string>;
  email: FormControl<string>;
  phone: FormControl<string>;
  ews_email: FormControl<string>;
  tenant_id: FormControl<string>;
}>;

export type RoomForm = FormGroup<{
  type: FormControl<RoomType>;
  id_string: FormControl<string>;
  name: FormControl<string>;
  room_number: FormControl<number | null>;
  logo: FormControl<string>;
  ews: FormGroup<{email: FormControl<string>, tenant_id: FormControl<string>}>;
  ical: FormGroup<{endpoint: FormControl<string>}>;
  persons: FormArray<PersonForm>;
}>;

function text(value = '', ...validators: ((control: AbstractControl) => ValidationErrors | null)[]) {
  return new FormControl(value, {nonNullable: true, validators});
}

export function personsCount(control: AbstractControl): ValidationErrors | null {
  const count = (control as FormArray).length;
  if (count < 1) return {minPersons: {min: 1, actual: count}};
  if (count > MAX_PERSONS) return {maxPersons: {max: MAX_PERSONS, actual: count}};
  return null;
}

export function createPersonForm(person?: IPerson): PersonForm {
  return new FormGroup({
    name: text(person?.name ?? '', Validators.required),
    job: text(person?.job ?? ''),
    group: text(person?.group ?? ''),
    email: text(person?.email ?? '', Validators.email),
    phone: text(person?.phone ?? ''),
    ews_email: text(person?.ews_info?.email ?? '', Validators.required),
    tenant_id: text(person?.ews_info?.tenant_id ?? '', Validators.required),
  });
}

export function createRoomForm(): RoomForm {
  const form: RoomForm = new FormGroup({
    type: new FormControl<RoomType>('ews', {nonNullable: true}),
    id_string: text('', Validators.required),
    name: text('', Validators.required),
    room_number: new FormControl<number | null>(null, {validators: Validators.pattern(/^-?\d+$/)}),
    logo: text('', Validators.required),
    ews: new FormGroup({email: text('', Validators.required), tenant_id: text('', Validators.required)}),
    ical: new FormGroup({endpoint: text('', Validators.required)}),
    persons: new FormArray<PersonForm>([], {validators: personsCount}),
  });
  setRoomType(form, 'ews');
  return form;
}

// Only the chosen type's controls stay enabled, so the others neither block saving nor end up in the room
export function setRoomType(form: RoomForm, type: RoomType) {
  form.controls.type.setValue(type, {emitEvent: false});
  const sections = {ews: form.controls.ews, ical: form.controls.ical, office: form.controls.persons};
  for (const [name, control] of Object.entries(sections)) {
    if (name === type) {
      control.enable({emitEvent: false});
    } else {
      control.disable({emitEvent: false});
    }
  }
  if (type === 'office' && form.controls.persons.length === 0) {
    form.controls.persons.push(createPersonForm());
  }
  form.updateValueAndValidity();
}

export function addPerson(form: RoomForm): boolean {
  if (form.controls.persons.length >= MAX_PERSONS) return false;
  form.controls.persons.push(createPersonForm());
  return true;
}

export function patchRoomForm(form: RoomForm, room: IRoom) {
  form.patchValue({
    id_string: room.id_string,
    name: room.name,
    room_number: room.room_number ?? null,
    logo: room.logo,
    ews: {email: room.ews_info?.email ?? '', tenant_id: room.ews_info?.tenant_id ?? ''},
    ical: {endpoint: room.ical_info?.endpoint ?? ''},
  });
  form.controls.persons.clear();
  for (const person of room.persons ?? []) {
    form.controls.persons.push(createPersonForm(person));
  }
  setRoomType(form, roomType(room));
}

// The room to send to the API: exactly one calendar source, the others left out
export function toRoom(form: RoomForm): IRoom {
  const value = form.getRawValue();
  const roomNumber = value.room_number === null || String(value.room_number).trim() === '' ? null : Number(value.room_number);
  return {
    id_string: value.id_string.trim(),
    name: value.name.trim(),
    room_number: roomNumber,
    logo: value.logo,
    ews_info: value.type === 'ews' ? {email: value.ews.email.trim(), tenant_id: value.ews.tenant_id} : undefined,
    ical_info: value.type === 'ical' ? {endpoint: value.ical.endpoint.trim()} : undefined,
    persons: value.type === 'office' ? value.persons.map(person => ({
      name: person.name.trim(),
      job: person.job.trim(),
      group: person.group.trim(),
      email: person.email.trim() || undefined,
      phone: person.phone.trim() || undefined,
      ews_info: {email: person.ews_email.trim(), tenant_id: person.tenant_id},
    })) : undefined,
  };
}
