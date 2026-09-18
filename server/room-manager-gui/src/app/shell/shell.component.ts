import {Component, OnInit, ViewChild} from '@angular/core';
import {Router, RouterLink, RouterLinkActive, RouterOutlet} from '@angular/router';
import {MatSidenav, MatSidenavModule} from '@angular/material/sidenav';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatListModule} from '@angular/material/list';
import {BreakpointObserver} from '@angular/cdk/layout';
import {AuthService} from '../api/auth.service';
import {IServerStatus, StatusService} from '../api/status.service';

interface NavEntry {
  path: string;
  label: string;
  icon: string;
}

// Toolbar, navigation and the read-only banner around every page except the login page
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule, MatButtonModule, MatToolbarModule, MatSidenavModule, MatListModule],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss'
})
export class ShellComponent implements OnInit {
  @ViewChild(MatSidenav) sidenav!: MatSidenav;
  isMobile = true;
  status?: IServerStatus;
  readonly entries: NavEntry[] = [
    {path: '/', label: 'Dashboard', icon: 'house'},
    {path: '/devices', label: 'Devices', icon: 'smartphone'},
    {path: '/rooms', label: 'Rooms', icon: 'meeting_room'},
    {path: '/tenants', label: 'Tenants', icon: 'cloud'},
    {path: '/settings', label: 'Settings', icon: 'settings'},
  ];

  constructor(private observer: BreakpointObserver, readonly auth: AuthService,
              private statusService: StatusService, private router: Router) {}

  ngOnInit() {
    this.observer.observe(['(max-width: 800px)']).subscribe(screenSize => this.isMobile = screenSize.matches);
    this.statusService.get().subscribe(status => this.status = status);
  }

  toggleMenu() {
    if (this.isMobile) {
      this.sidenav.toggle();
    } else {
      this.sidenav.open();
    }
  }

  onNavigate() {
    if (this.isMobile) {
      this.sidenav.close();
    }
  }

  get userName(): string | undefined {
    return this.auth.user?.name;
  }

  logout() {
    // An OIDC session is ended by the server, which then shows the login page
    if (!this.auth.logout()) {
      this.router.navigate(['/login']);
    }
  }
}
