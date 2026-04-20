import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UserAccountService } from '../../../core/services/user-account.service';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginPageComponent {
  readonly #formBuilder = inject(FormBuilder);
  readonly #router = inject(Router);
  readonly #userAccountService = inject(UserAccountService);

  readonly feedback = signal<string>('');
  readonly isError = signal(false);

  readonly form = this.#formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.feedback.set('Please enter valid login details.');
      this.isError.set(true);
      return;
    }

    const result = await this.#userAccountService.login(this.form.getRawValue());
    this.feedback.set(result.message);
    this.isError.set(!result.success);

    if (result.success) {
      void this.#router.navigateByUrl('/dashboard');
    }
  }
}
