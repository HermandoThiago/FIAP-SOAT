import { PasswordHash } from '../../../../src/modules/identity/domain/password-hash';
import { ValidationError } from '../../../../src/shared/domain/domain-error';
import { SAMPLE_HASH } from '../fakes/builders';

const HASH_2A = '$2a$12$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01234';
const HASH_2Y = '$2y$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01234';

describe('PasswordHash.fromHash', () => {
  it.each([SAMPLE_HASH, HASH_2A, HASH_2Y])('should accept %p when it is a well-formed bcrypt hash', (hash) => {
    expect(PasswordHash.fromHash(hash).value).toBe(hash);
  });

  it.each([
    ['plain-password', 'not a hash'],
    ['', 'empty'],
    ['$2b$12$tooShort', 'too short'],
    [`${SAMPLE_HASH}x`, 'too long'],
    ['$2z$12$oI8woj569c6lcFXlKOZiAu5vcXPafz4jthrlR1DXaJEOhQY0MGdcO', 'unknown bcrypt variant'],
    ['$1$04$oI8woj569c6lcFXlKOZiAu5vcXPafz4jthrlR1DXaJEOhQY0MGdcOxx', 'not bcrypt'],
    ['$2b$4$oI8woj569c6lcFXlKOZiAu5vcXPafz4jthrlR1DXaJEOhQY0MGdcOxx', 'one-digit cost'],
  ])('should reject %p when it is %s', (hash) => {
    expect(() => PasswordHash.fromHash(hash)).toThrow(ValidationError);
  });

  it('should reject a non-string input when the hash is not a string', () => {
    expect(() => PasswordHash.fromHash(123 as unknown as string)).toThrow(ValidationError);
  });

  it('should point to the passwordHash field when the hash is invalid', () => {
    expect(() => PasswordHash.fromHash('nope')).toThrow(
      expect.objectContaining({ field: 'passwordHash' }) as ValidationError,
    );
  });
});

describe('PasswordHash.equals', () => {
  it('should be equal when both hold the same hash', () => {
    expect(PasswordHash.fromHash(SAMPLE_HASH).equals(PasswordHash.fromHash(SAMPLE_HASH))).toBe(true);
  });

  it('should not be equal when the hashes differ', () => {
    expect(PasswordHash.fromHash(SAMPLE_HASH).equals(PasswordHash.fromHash(HASH_2A))).toBe(false);
  });
});
