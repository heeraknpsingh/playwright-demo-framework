import { envConfig } from "../utils/env.loader";

export interface IUser {
  email: string;
  password: string;
  description: string;
}

export interface ILoginTestData {
  validUser: IUser;
  invalidPasswordUser: IUser;
  invalidEmailUser: IUser;
  emptyCredentialsUser: IUser;
  nonExistentUser: IUser;
  bruteForceAttempts: IUser[];
}

export const loginTestData: ILoginTestData = {
  validUser: {
    email: envConfig.userEmail,
    password: envConfig.userPassword,
    description: "Valid registered user",
  },
  invalidPasswordUser: {
    email: envConfig.userEmail,
    password: "WrongPassword123!",
    description: "Valid email with wrong password",
  },
  invalidEmailUser: {
    email: "notregistered@example.com",
    password: envConfig.userPassword,
    description: "Unregistered email address",
  },
  emptyCredentialsUser: {
    email: "",
    password: "",
    description: "Empty email and password",
  },
  nonExistentUser: {
    email: "does.not.exist@nowhere.com",
    password: "SomePassword1@",
    description: "Completely non-existent account",
  },

  /**
   * Six rapid failed-login attempts with the same registered email but wrong
   * passwords. Used to probe for rate-limiting and account-lockout responses.
   * Attempts use distinct passwords so the server treats each as a genuine failure.
   */
  bruteForceAttempts: Array.from({ length: 6 }, (_, i) => ({
    email: envConfig.userEmail,
    password: `BruteForce_Attempt_${i + 1}!`,
    description: `Brute-force attempt ${i + 1} of 6`,
  })),
};
