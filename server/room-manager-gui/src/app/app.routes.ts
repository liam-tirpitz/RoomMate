import { Routes } from '@angular/router';
import {DevicesComponent} from './devices/devices.component';
import {RoomsComponent} from './rooms/rooms.component';
import {DashboardComponent} from './dashboard/dashboard.component';

export const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'rooms', component: RoomsComponent },
  { path: 'devices', component: DevicesComponent },
  // { path: 'calendars', component: HomeComponent },
  // { path: 'people', component: NewsComponent },
  // { path: 'institutes', component: NewsComponent },

];
