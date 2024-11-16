import { Component } from '@angular/core';
import {RoomComponent} from '../room/room.component';

@Component({
  selector: 'app-rooms',
  standalone: true,
  imports: [
    RoomComponent
  ],
  templateUrl: './rooms.component.html',
  styleUrl: './rooms.component.scss'
})
export class RoomsComponent {

}
