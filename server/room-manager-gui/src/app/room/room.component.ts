import {Component, Input, OnInit} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatIcon} from '@angular/material/icon';
import {IRoom} from '@interfaces/IRoom'

import {
  CdkDragDrop,
  CdkDrag,
  CdkDropList,
  CdkDropListGroup,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import {MatList, MatListItem} from '@angular/material/list';
import {NgForOf, NgIf} from '@angular/common';


@Component({
  selector: 'app-room',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIcon, CdkDropListGroup, CdkDropList, CdkDrag, MatList, MatListItem, NgIf, NgForOf],
  templateUrl: './room.component.html',
  styleUrl: './room.component.scss'
})

export class RoomComponent implements OnInit{

  @Input() room!: IRoom;


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

  ngOnInit(): void {
  }


}
