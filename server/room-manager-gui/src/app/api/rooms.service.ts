import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {IRoom} from '@interfaces/IRoom';

@Injectable({providedIn: 'root'})
export class RoomsService {
  private readonly base = '/api/rooms';

  constructor(private http: HttpClient) {}

  list(): Observable<IRoom[]> {
    return this.http.get<IRoom[]>(this.base);
  }

  get(id: string): Observable<IRoom> {
    return this.http.get<IRoom>(`${this.base}/${id}`);
  }

  create(room: IRoom): Observable<IRoom> {
    return this.http.post<IRoom>(this.base, room);
  }

  update(id: string, room: IRoom): Observable<IRoom> {
    return this.http.put<IRoom>(`${this.base}/${id}`, room);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  previewUrl(id: string): string {
    return `${this.base}/${id}/preview.png?t=${Date.now()}`;
  }
}

export function roomLabel(room: Pick<IRoom, 'id_string' | 'name'> | null | undefined): string {
  return room ? `${room.id_string} ${room.name}`.trim() : '';
}
