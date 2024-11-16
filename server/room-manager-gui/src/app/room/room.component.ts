import { Component } from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatIcon} from '@angular/material/icon';
import {
  CdkDragDrop,
  CdkDrag,
  CdkDropList,
  CdkDropListGroup,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import {MatList, MatListItem} from '@angular/material/list';

@Component({
  selector: 'app-room',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIcon, CdkDropListGroup, CdkDropList, CdkDrag, MatList, MatListItem],
  templateUrl: './room.component.html',
  styleUrl: './room.component.scss'
})

export class RoomComponent {
  devices = ['Dev1'];
  done = ['MeetingRaum Exchange', 'Brush teeth'];

  drop(event: CdkDragDrop<string[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    }
  }


}
