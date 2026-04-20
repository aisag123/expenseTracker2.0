import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UserAccountService } from '../../core/services/user-account.service';

@Component({
  selector: 'app-signup-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './signup-page.html',
  styleUrl: './signup-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SignupPageComponent {
  readonly #formBuilder = inject(FormBuilder);
  readonly #router = inject(Router);
  readonly #userAccountService = inject(UserAccountService);

  readonly feedback = signal<string>('');
  readonly isError = signal(false);

  readonly form = this.#formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required, Validators.minLength(6)]]
  });

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.feedback.set('Please complete all fields with valid values.');
      this.isError.set(true);
      return;
    }

    const value = this.form.getRawValue();

    if (value.password !== value.confirmPassword) {
      this.feedback.set('Passwords do not match.');
      this.isError.set(true);
      return;
    }

    const result = await this.#userAccountService.register({
      name: value.name,
      email: value.email,
      password: value.password
    });

    this.feedback.set(result.message);
    this.isError.set(!result.success);

    if (result.success) {
      void this.#router.navigateByUrl('/login');
    }
  }
}
