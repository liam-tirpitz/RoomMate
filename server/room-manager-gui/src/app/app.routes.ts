import {Routes} from '@angular/router';
import {ShellComponent} from './shell/shell.component';
import {LoginComponent} from './login/login.component';
import {DashboardComponent} from './dashboard/dashboard.component';
import {DevicesComponent} from './devices/devices.component';
import {RoomsComponent} from './rooms/rooms.component';
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
      {path: 'rooms', component: RoomsComponent},
    ]
  },
  {path: '**', redirectTo: ''},
];
