import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UserAccountService } from '../../../core/services/user-account.service';

@Component({
  selector: 'app-profile-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfilePageComponent {
  readonly #formBuilder = inject(FormBuilder);
  readonly #router = inject(Router);
  readonly #userAccountService = inject(UserAccountService);

  readonly currentUser = this.#userAccountService.currentUser;
  readonly feedback = signal<string>('');
  readonly isError = signal(false);

  readonly form = this.#formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]]
  });

  constructor() {
    effect(() => {
      const user = this.currentUser();

      if (!user) {
        this.form.reset({
          name: '',
          email: ''
        });
        return;
      }

      this.form.setValue(
        {
          name: user.name,
          email: user.email
        },
        { emitEvent: false }
      );
    });
  }

  async save(): Promise<void> {
    if (!this.currentUser()) {
      this.feedback.set('Please log in first.');
      this.isError.set(true);
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.feedback.set('Please correct the highlighted fields.');
      this.isError.set(true);
      return;
    }

    const result = await this.#userAccountService.updateProfile(this.form.getRawValue());
    this.feedback.set(result.message);
    this.isError.set(!result.success);
  }

  logout(): void {
    this.#userAccountService.logout();
    void this.#router.navigateByUrl('/login');
  }
}

