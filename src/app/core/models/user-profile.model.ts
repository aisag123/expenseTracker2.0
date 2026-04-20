export interface UserProfile {
  name: string;
  email: string;
}

export interface RegistrationInput extends UserProfile {
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ActionResult {
  success: boolean;
  message: string;
}
