import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from '../../core/services/theme.service';
import { UserAccountService } from '../../core/services/user-account.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark">$</span>
        <div>
          <strong>Expense Tracker</strong>
          <p>Income, expenses, budgets, and insights</p>
        </div>
      </div>

      @if (currentUser()) {
        <nav class="nav-links" aria-label="Primary">
          <a routerLink="/profile" routerLinkActive="active" ariaCurrentWhenActive="page">Profile</a>
          <a routerLink="/transactions" routerLinkActive="active" ariaCurrentWhenActive="page">Transactions</a>
          <a routerLink="/dashboard" routerLinkActive="active" ariaCurrentWhenActive="page">Dashboard</a>
          <button type="button" class="logout-button" (click)="logout()">Logout</button>
        </nav>
      } @else {
        <nav class="nav-links" aria-label="Primary">
          <a routerLink="/login" routerLinkActive="active" ariaCurrentWhenActive="page">Login</a>
          <a routerLink="/signup" routerLinkActive="active" ariaCurrentWhenActive="page">Sign up</a>
        </nav>
      }

      <button
        type="button"
        class="theme-toggle"
        (click)="toggleTheme()"
        [attr.aria-pressed]="isDarkMode()"
      >
        {{ isDarkMode() ? 'Light mode' : 'Dark mode' }}
      </button>
    </header>
  `,
  styleUrl: './navbar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavbarComponent {
  readonly #router = inject(Router);
  readonly #themeService = inject(ThemeService);
  readonly #userAccountService = inject(UserAccountService);

  readonly currentUser = this.#userAccountService.currentUser;
  readonly isDarkMode = this.#themeService.isDarkMode;

  logout(): void {
    this.#userAccountService.logout();
    void this.#router.navigateByUrl('/login');
  }

  toggleTheme(): void {
    this.#themeService.toggle();
  }
}
