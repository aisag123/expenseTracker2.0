import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/navbar/navbar.component';

@Component({
  selector: 'app-root',
  imports: [NavbarComponent, RouterOutlet],
  template: `
    <app-navbar></app-navbar>
    <main class="app-shell">
      <router-outlet></router-outlet>
    </main>
  `,
  styleUrl: './app-shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {}
