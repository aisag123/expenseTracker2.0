import { Injectable, inject, signal } from '@angular/core';
import { ActionResult, LoginInput, RegistrationInput, UserProfile } from '../models/user-profile.model';
import { FirestoreDbService } from './firestore-db.service';

interface StoredAccount extends UserProfile {
  password: string;
}

const ACCOUNT_KEY = 'expense-tracker.account';
const CURRENT_USER_KEY = 'expense-tracker.current-user';

@Injectable({
  providedIn: 'root'
})
export class UserAccountService {
  readonly #firestoreDbService = inject(FirestoreDbService);

  readonly #account = signal<StoredAccount | null>(null);
  readonly #currentUser = signal<UserProfile | null>(null);

  readonly currentUser = this.#currentUser.asReadonly();

  constructor() {
    this.loadFromStorage();
    void this.hydrateAccountForCurrentUser();
  }

  async register(input: RegistrationInput): Promise<ActionResult> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const existingAccount = this.#firestoreDbService.isEnabled()
      ? await this.#firestoreDbService.getUserByEmail(normalizedEmail)
      : this.#account();

    if (existingAccount && existingAccount.email.toLowerCase() === normalizedEmail) {
      return {
        success: false,
        message: 'An account with this email already exists.'
      };
    }

    const account: StoredAccount = {
      name: input.name.trim(),
      email: normalizedEmail,
      password: input.password
    };

    this.#account.set(account);

    if (this.#firestoreDbService.isEnabled()) {
      await this.#firestoreDbService.upsertUser(account);
    } else {
      this.persistAccount(account);
    }

    return {
      success: true,
      message: 'Account created. You can now log in.'
    };
  }

  async login(input: LoginInput): Promise<ActionResult> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const account = this.#firestoreDbService.isEnabled()
      ? await this.#firestoreDbService.getUserByEmail(normalizedEmail)
      : this.#account();

    if (!account) {
      return {
        success: false,
        message: 'No account found. Please sign up first.'
      };
    }

    const emailMatches = account.email === normalizedEmail;
    const passwordMatches = account.password === input.password;

    if (!emailMatches || !passwordMatches) {
      return {
        success: false,
        message: 'Invalid email or password.'
      };
    }

    const user: UserProfile = {
      name: account.name,
      email: account.email
    };

    this.#account.set({
      name: account.name,
      email: account.email,
      password: account.password
    });
    this.#currentUser.set(user);
    this.persistCurrentUser(user);

    return {
      success: true,
      message: 'Logged in successfully.'
    };
  }

  async updateProfile(profile: UserProfile): Promise<ActionResult> {
    const currentUser = this.#currentUser();
    const account = this.#account();

    if (!currentUser || !account) {
      return {
        success: false,
        message: 'Please log in first.'
      };
    }

    const updatedProfile: UserProfile = {
      name: profile.name.trim(),
      email: profile.email.trim().toLowerCase()
    };

    const updatedAccount: StoredAccount = {
      ...account,
      ...updatedProfile
    };

    this.#account.set(updatedAccount);
    this.#currentUser.set(updatedProfile);

    if (this.#firestoreDbService.isEnabled()) {
      await this.#firestoreDbService.replaceUserEmail(currentUser.email, updatedAccount);
    } else {
      this.persistAccount(updatedAccount);
    }

    this.persistCurrentUser(updatedProfile);

    return {
      success: true,
      message: 'Profile updated.'
    };
  }

  logout(): void {
    this.#currentUser.set(null);
    localStorage.removeItem(CURRENT_USER_KEY);
  }

  private loadFromStorage(): void {
    const accountRaw = localStorage.getItem(ACCOUNT_KEY);
    const currentUserRaw = localStorage.getItem(CURRENT_USER_KEY);

    if (accountRaw) {
      const parsed = JSON.parse(accountRaw) as StoredAccount;
      this.#account.set(parsed);
    }

    if (currentUserRaw) {
      const parsed = JSON.parse(currentUserRaw) as UserProfile;
      this.#currentUser.set(parsed);
    }
  }

  private async hydrateAccountForCurrentUser(): Promise<void> {
    if (!this.#firestoreDbService.isEnabled()) {
      return;
    }

    const user = this.#currentUser();

    if (!user) {
      return;
    }

    const account = await this.#firestoreDbService.getUserByEmail(user.email);

    if (!account) {
      return;
    }

    this.#account.set(account);
  }

  private persistAccount(account: StoredAccount): void {
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
  }

  private persistCurrentUser(user: UserProfile): void {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  }
}
