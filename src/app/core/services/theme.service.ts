import { DOCUMENT } from '@angular/common';
import { computed, effect, inject, Injectable, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const THEME_KEY = 'expense-tracker.theme';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  readonly #document = inject(DOCUMENT);
  readonly #theme = signal<ThemeMode>(this.loadTheme());

  readonly theme = this.#theme.asReadonly();
  readonly isDarkMode = computed(() => this.#theme() === 'dark');

  constructor() {
    effect(() => {
      const currentTheme = this.#theme();
      const rootElement = this.#document.documentElement;

      rootElement.setAttribute('data-theme', currentTheme);
      rootElement.style.colorScheme = currentTheme;
      localStorage.setItem(THEME_KEY, currentTheme);
    });
  }

  toggle(): void {
    this.#theme.update((currentTheme) => (currentTheme === 'light' ? 'dark' : 'light'));
  }

  private loadTheme(): ThemeMode {
    const storedTheme = localStorage.getItem(THEME_KEY);

    return storedTheme === 'dark' ? 'dark' : 'light';
  }
}