import {Routes} from '@angular/router';
import {ShellComponent} from './shell/shell.component';
import {LoginComponent} from './login/login.component';
import {DashboardComponent} from './dashboard/dashboard.component';
import {DevicesComponent} from './devices/devices.component';
import {RoomsComponent} from './rooms/rooms.component';
import {DeviceComponent} from './device/device.component';
import {RoomComponent} from './room/room.component';
import {TenantsComponent} from './tenants/tenants.component';
import {SettingsComponent} from './settings/settings.component';
import {authGuard} from './auth/auth.guard';

export const routes: Routes = [
  {path: 'login', component: LoginComponent},
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      {path: '', component: DashboardComponent},
      {path: 'devices', component: DevicesComponent},
      {path: 'devices/:mac', component: DeviceComponent},
      {path: 'rooms', component: RoomsComponent},
      {path: 'rooms/new', component: RoomComponent},
      {path: 'rooms/:id', component: RoomComponent},
      {path: 'tenants', component: TenantsComponent},
      {path: 'settings', component: SettingsComponent},
    ]
  },
  {path: '**', redirectTo: ''},
];
