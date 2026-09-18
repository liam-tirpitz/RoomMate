import {Component, OnInit} from '@angular/core';
import {RoomComponent} from '../room/room.component';
import {IRoom} from '@interfaces/IRoom'
import {RoomsService} from '@app/api/rooms.service';
import {NgForOf} from '@angular/common';

@Component({
  selector: 'app-rooms',
  standalone: true,
  imports: [
    RoomComponent,
    NgForOf
  ],
  templateUrl: './rooms.component.html',
  styleUrl: './rooms.component.scss'
})
export class RoomsComponent implements OnInit {
  rooms: IRoom[] = [];

  constructor(private roomsService: RoomsService) { }

  ngOnInit(): void {
    this.fetchRooms();
  }

  fetchRooms() {
    this.roomsService.list()
      .subscribe(
        (response) => {
          this.rooms = response;
          console.log(this.rooms)
        }
      );
  }


}
