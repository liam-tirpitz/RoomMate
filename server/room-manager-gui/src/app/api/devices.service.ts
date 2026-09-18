import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {IDevice} from '@interfaces/IDevice';
import {IDeviceStatus} from '@interfaces/IDeviceStatus';
import {IBatterySample} from '@interfaces/IBatterySample';

@Injectable({providedIn: 'root'})
export class DevicesService {
  private readonly base = '/api/devices';

  constructor(private http: HttpClient) {}

  list(): Observable<IDeviceStatus[]> {
    return this.http.get<IDeviceStatus[]>(this.base);
  }

  get(mac: string): Observable<IDeviceStatus> {
    return this.http.get<IDeviceStatus>(`${this.base}/${mac}`);
  }

  create(device: Pick<IDevice, 'device_id' | 'location' | 'room_id'>): Observable<IDevice> {
    return this.http.post<IDevice>(this.base, device);
  }

  update(mac: string, patch: Partial<Pick<IDevice, 'location' | 'room_id'>>): Observable<IDevice> {
    return this.http.put<IDevice>(`${this.base}/${mac}`, patch);
  }

  delete(mac: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${mac}`);
  }

  batteryHistory(mac: string, days: number): Observable<IBatterySample[]> {
    return this.http.get<IBatterySample[]>(`${this.base}/${mac}/battery`, {params: {days}});
  }

  requestRedraw(mac: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${mac}/redraw`, {});
  }

  screenUrl(mac: string): string {
    return `${this.base}/${mac}/screen.png`;
  }

  previewUrl(mac: string): string {
    return `${this.base}/${mac}/preview.png?t=${Date.now()}`;
  }
}
