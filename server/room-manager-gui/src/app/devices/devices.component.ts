import {Component, OnInit} from '@angular/core';
import {MatTableModule} from '@angular/material/table';
import {DevicesService} from '@app/api/devices.service';
import {IDevice} from '@interfaces/IDevice';

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

  constructor(private devicesService: DevicesService) {

  }

  ngOnInit() {
    this.devicesService.list().subscribe((data) => {
      this.devices = data;
    })
  }

}
