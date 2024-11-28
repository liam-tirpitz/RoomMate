import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {IRoom} from '@interfaces/IRoom'

@Injectable({
  providedIn: 'root'
})
export class RoomService {
  private apiUrl = '/api/rooms';
  constructor(private http: HttpClient) { }

  fetchRooms():Observable<IRoom[]>  {
    return this.http.get<IRoom[]>(this.apiUrl);
  }

  getRoomById(id: number) {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  addRoom(user: any) {
    return this.http.post(this.apiUrl, user);
  }

  updateRoom(id: number, user: any) {
    return this.http.put(`${this.apiUrl}/${id}`, user);
  }

  deleteRoom(id: number) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
