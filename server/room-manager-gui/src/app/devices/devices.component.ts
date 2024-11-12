import { Component } from '@angular/core';
import {MatTableModule} from '@angular/material/table';

export interface PeriodicElement {
  name: string;
  mac: string;
  battery: string;
  last_connection: Date;
}

const ELEMENT_DATA: PeriodicElement[] = [
  {name: "Küche Links", mac: 'ab:as:ae:ad:ad:ad', battery: "4.2 V", last_connection: new Date()},

];
@Component({
  selector: 'app-devices',
  standalone: true,
  imports: [MatTableModule],
  templateUrl: './devices.component.html',
  styleUrl: './devices.component.css'
})
export class DevicesComponent {
  displayedColumns: string[] = ['name', 'mac', 'battery', 'last_connection'];
  dataSource = ELEMENT_DATA;

}
