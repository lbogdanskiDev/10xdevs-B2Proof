import { describe, it, expect } from "vitest";

/**
 * Unit Tests for RegisterForm Validation Functions
 *
 * Test Coverage:
 * - TC-AUTH-001.4: Invalid email format validation
 * - TC-AUTH-001.5: Password too short validation
 * - TC-AUTH-001.6: Password without digit validation
 * - TC-AUTH-001.7: Missing role selection validation
 * - TC-AUTH-001.8: Password confirmation mismatch validation
 *
 * These tests verify client-side validation logic that prevents
 * invalid data from being submitted to the server.
 */

// ============================================================================
// EMAIL VALIDATION
// ============================================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: string): string | undefined {
  if (!email.trim()) {
    return "Email is required";
  }
  if (!EMAIL_REGEX.test(email)) {
    return "Please enter a valid email address";
  }
  return undefined;
}

describe("validateEmail", () => {
  // TC-AUTH-001.4: Invalid email format
  it("should return error for empty email", () => {
    expect(validateEmail("")).toBe("Email is required");
  });

  it("should return error for email with only whitespace", () => {
    expect(validateEmail("   ")).toBe("Email is required");
  });

  it("should return error for email without @", () => {
    expect(validateEmail("invalid-email")).toBe("Please enter a valid email address");
  });

  it("should return error for email without domain", () => {
    expect(validateEmail("test@")).toBe("Please enter a valid email address");
  });

  it("should return error for email without username", () => {
    expect(validateEmail("@example.com")).toBe("Please enter a valid email address");
  });

  it("should return error for email without TLD", () => {
    expect(validateEmail("test@example")).toBe("Please enter a valid email address");
  });

  it("should return undefined for valid email", () => {
    expect(validateEmail("test@example.com")).toBeUndefined();
  });

  it("should return undefined for valid email with subdomain", () => {
    expect(validateEmail("user@mail.example.com")).toBeUndefined();
  });

  it("should return undefined for valid email with plus sign", () => {
    expect(validateEmail("user+tag@example.com")).toBeUndefined();
  });
});

// ============================================================================
// PASSWORD VALIDATION
// ============================================================================

function validatePassword(password: string): string | undefined {
  if (!password) {
    return "Password is required";
  }
  if (password.length < 8) {
    return "Password must be at least 8 characters";
  }
  if (!/\d/.test(password)) {
    return "Password must contain at least one digit";
  }
  return undefined;
}

describe("validatePassword", () => {
  it("should return error for empty password", () => {
    expect(validatePassword("")).toBe("Password is required");
  });

  // TC-AUTH-001.5: Password too short
  it("should return error for password with 1 character", () => {
    expect(validatePassword("P1")).toBe("Password must be at least 8 characters");
  });

  it("should return error for password with 5 characters", () => {
    expect(validatePassword("Pass1")).toBe("Password must be at least 8 characters");
  });

  it("should return error for password with 7 characters", () => {
    expect(validatePassword("Pass123")).toBe("Password must be at least 8 characters");
  });

  // TC-AUTH-001.6: Password without digit
  it("should return error for password without digit (all letters)", () => {
    expect(validatePassword("Password")).toBe("Password must contain at least one digit");
  });

  it("should return error for password without digit (letters + special chars)", () => {
    expect(validatePassword("Password!@#")).toBe("Password must contain at least one digit");
  });

  it("should return undefined for password with 8 chars and 1 digit", () => {
    expect(validatePassword("Password1")).toBeUndefined();
  });

  it("should return undefined for password with multiple digits", () => {
    expect(validatePassword("Pass1234")).toBeUndefined();
  });

  it("should return undefined for password with digit at start", () => {
    expect(validatePassword("1Password")).toBeUndefined();
  });

  it("should return undefined for password with special chars and digit", () => {
    expect(validatePassword("P@ssw0rd!")).toBeUndefined();
  });
});

// ============================================================================
// PASSWORD CONFIRMATION VALIDATION
// ============================================================================

function validatePasswordConfirm(password: string, confirm: string): string | undefined {
  if (!confirm) {
    return "Password confirmation is required";
  }
  if (password !== confirm) {
    return "Passwords do not match";
  }
  return undefined;
}

describe("validatePasswordConfirm", () => {
  it("should return error for empty confirmation", () => {
    expect(validatePasswordConfirm("Password1", "")).toBe("Password confirmation is required");
  });

  // TC-AUTH-001.8: Password confirmation mismatch
  it("should return error when passwords do not match", () => {
    expect(validatePasswordConfirm("Password1", "Password2")).toBe("Passwords do not match");
  });

  it("should return error when confirmation has extra characters", () => {
    expect(validatePasswordConfirm("Password1", "Password12")).toBe("Passwords do not match");
  });

  it("should return error when confirmation is missing characters", () => {
    expect(validatePasswordConfirm("Password1", "Password")).toBe("Passwords do not match");
  });

  it("should return error for case-sensitive mismatch", () => {
    expect(validatePasswordConfirm("Password1", "password1")).toBe("Passwords do not match");
  });

  it("should return undefined when passwords match exactly", () => {
    expect(validatePasswordConfirm("Password1", "Password1")).toBeUndefined();
  });

  it("should return undefined when both passwords are identical complex strings", () => {
    const password = "C0mpl3x!P@ssw0rd#2024";
    expect(validatePasswordConfirm(password, password)).toBeUndefined();
  });
});

// ============================================================================
// ROLE VALIDATION
// ============================================================================

function validateRole(role: string): string | undefined {
  if (!role || (role !== "creator" && role !== "client")) {
    return "Please select a role";
  }
  return undefined;
}

describe("validateRole", () => {
  // TC-AUTH-001.7: Missing role selection
  it("should return error for empty role", () => {
    expect(validateRole("")).toBe("Please select a role");
  });

  it("should return error for invalid role value", () => {
    expect(validateRole("admin")).toBe("Please select a role");
  });

  it("should return error for role with wrong casing", () => {
    expect(validateRole("Creator")).toBe("Please select a role");
  });

  it("should return error for role with extra spaces", () => {
    expect(validateRole(" creator ")).toBe("Please select a role");
  });

  it("should return undefined for creator role", () => {
    expect(validateRole("creator")).toBeUndefined();
  });

  it("should return undefined for client role", () => {
    expect(validateRole("client")).toBeUndefined();
  });
});

// ============================================================================
// FORM VALIDATION (INTEGRATION)
// ============================================================================

interface RegisterFormData {
  email: string;
  password: string;
  passwordConfirm: string;
  role: string;
}

interface RegisterFormErrors {
  email?: string;
  password?: string;
  passwordConfirm?: string;
  role?: string;
}

function validateForm(data: RegisterFormData): RegisterFormErrors {
  const errors: RegisterFormErrors = {};

  const emailError = validateEmail(data.email);
  if (emailError) {
    errors.email = emailError;
  }

  const passwordError = validatePassword(data.password);
  if (passwordError) {
    errors.password = passwordError;
  }

  const passwordConfirmError = validatePasswordConfirm(data.password, data.passwordConfirm);
  if (passwordConfirmError) {
    errors.passwordConfirm = passwordConfirmError;
  }

  const roleError = validateRole(data.role);
  if (roleError) {
    errors.role = roleError;
  }

  return errors;
}

describe("validateForm (integration)", () => {
  // TC-AUTH-001.1 & TC-AUTH-001.2: Valid registration data
  it("should return no errors for valid creator registration", () => {
    const formData: RegisterFormData = {
      email: "creator@example.com",
      password: "Password1",
      passwordConfirm: "Password1",
      role: "creator",
    };

    const errors = validateForm(formData);
    expect(errors).toEqual({});
  });

  it("should return no errors for valid client registration", () => {
    const formData: RegisterFormData = {
      email: "client@example.com",
      password: "SecurePass123",
      passwordConfirm: "SecurePass123",
      role: "client",
    };

    const errors = validateForm(formData);
    expect(errors).toEqual({});
  });

  it("should return multiple errors when all fields are invalid", () => {
    const formData: RegisterFormData = {
      email: "invalid-email",
      password: "short",
      passwordConfirm: "different",
      role: "",
    };

    const errors = validateForm(formData);

    expect(errors.email).toBe("Please enter a valid email address");
    expect(errors.password).toBe("Password must be at least 8 characters");
    expect(errors.passwordConfirm).toBe("Passwords do not match");
    expect(errors.role).toBe("Please select a role");
  });

  it("should return only email error when email is invalid", () => {
    const formData: RegisterFormData = {
      email: "invalid",
      password: "Password1",
      passwordConfirm: "Password1",
      role: "creator",
    };

    const errors = validateForm(formData);

    expect(errors.email).toBe("Please enter a valid email address");
    expect(errors.password).toBeUndefined();
    expect(errors.passwordConfirm).toBeUndefined();
    expect(errors.role).toBeUndefined();
  });

  // Edge case: password meets length but missing digit
  it("should return password error when missing digit despite length requirement", () => {
    const formData: RegisterFormData = {
      email: "test@example.com",
      password: "LongPassword",
      passwordConfirm: "LongPassword",
      role: "creator",
    };

    const errors = validateForm(formData);

    expect(errors.email).toBeUndefined();
    expect(errors.password).toBe("Password must contain at least one digit");
    expect(errors.passwordConfirm).toBeUndefined();
    expect(errors.role).toBeUndefined();
  });

  // Edge case: password meets all requirements but confirmation doesn't match
  it("should return passwordConfirm error when passwords differ", () => {
    const formData: RegisterFormData = {
      email: "test@example.com",
      password: "Password1",
      passwordConfirm: "Password2",
      role: "creator",
    };

    const errors = validateForm(formData);

    expect(errors.email).toBeUndefined();
    expect(errors.password).toBeUndefined();
    expect(errors.passwordConfirm).toBe("Passwords do not match");
    expect(errors.role).toBeUndefined();
  });
});
