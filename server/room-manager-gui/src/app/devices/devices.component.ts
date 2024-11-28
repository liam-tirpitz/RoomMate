import {Component, OnInit} from '@angular/core';
import {MatTableModule} from '@angular/material/table';
import {RoomService} from '../room.service';
import {DeviceService} from '@app/device.service';
import {IDevice} from '@interfaces/IDevice';

export interface PeriodicElement {
  name: string;
  mac: string;
  battery: string;
  last_connection: Date;
}


@Component({
  selector: 'app-devices',
  standalone: true,
  imports: [MatTableModule],
  templateUrl: './devices.component.html',
  styleUrl: './devices.component.css'
})
export class DevicesComponent implements OnInit{
  displayedColumns: string[] = ['name', 'mac', 'battery', 'last_connection', 'room'];
  devices: IDevice[] = [];

  constructor(private deviceService: DeviceService) {

  }

  ngOnInit() {
    this.deviceService.fetchDevices().subscribe((data: any[])=> {
      this.devices = data;
    })
  }

}
