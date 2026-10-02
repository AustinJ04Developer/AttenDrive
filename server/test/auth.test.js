import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema, updateProfileSchema } from '../src/validators/authValidator.js';
import { signToken, verifyToken } from '../src/utils/token.js';

describe('Auth Validation & Token Utilities', () => {
  it('should validate a valid registration payload', () => {
    const valid = {
      name: 'Dr. John Doe',
      email: 'John.Doe@University.edu',
      password: 'password123',
      role: 'coordinator',
      department: 'Computer Science and Engineering',
    };

    const parsed = registerSchema.parse(valid);
    expect(parsed.name).toBe('Dr. John Doe');
    expect(parsed.email).toBe('john.doe@university.edu'); // transformed to lowercase
    expect(parsed.role).toBe('coordinator');
    expect(parsed.department).toBe('Computer Science and Engineering');
  });

  it('should reject registration with invalid email or short password', () => {
    expect(() =>
      registerSchema.parse({
        name: 'John',
        email: 'invalid-email',
        password: '123456',
      })
    ).toThrow();

    expect(() =>
      registerSchema.parse({
        name: 'John',
        email: 'valid@example.com',
        password: '123', // < 6 chars
      })
    ).toThrow();
  });

  it('should validate valid login payload', () => {
    const parsed = loginSchema.parse({
      email: 'User@Example.COM',
      password: 'secretPassword',
    });
    expect(parsed.email).toBe('user@example.com');
  });

  it('should reject login with empty password or bad email', () => {
    expect(() =>
      loginSchema.parse({
        email: 'notanemail',
        password: 'pass',
      })
    ).toThrow();

    expect(() =>
      loginSchema.parse({
        email: 'admin@college.edu',
        password: '',
      })
    ).toThrow();
  });

  it('should sign and correctly verify a JWT token', () => {
    const payload = {
      id: '660000000000000000000099',
      email: 'test@college.edu',
      role: 'admin',
    };

    const token = signToken(payload);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(20);

    const decoded = verifyToken(token);
    expect(decoded.id).toBe(payload.id);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
  });
});
