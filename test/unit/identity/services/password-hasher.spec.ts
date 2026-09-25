import { PasswordHash } from '../../../../src/modules/identity/domain/password-hash';
import { BCRYPT_COST, PasswordHasher } from '../../../../src/modules/identity/services/password-hasher';

// Custo 4 nos testes (rápido); em produção o padrão é 12 (ADR-004; PRD-005 RN-060).
const TEST_COST = 4;

describe('PasswordHasher', () => {
  const hasher = new PasswordHasher(TEST_COST);

  it('should hash with cost 12 when no cost is given', async () => {
    // Único teste com o custo de produção (~250 ms): prova o padrão do construtor, não só a constante.
    const hash = await new PasswordHasher().hash('correct-password');

    expect(BCRYPT_COST).toBe(12);
    expect(hash.value).toMatch(/^\$2[ab]\$12\$/);
  });

  it('should produce a bcrypt hash different from the plain text when hashing', async () => {
    const hash = await hasher.hash('correct-password');

    expect(hash).toBeInstanceOf(PasswordHash);
    expect(hash.value).not.toBe('correct-password');
    expect(hash.value).toMatch(/^\$2[ab]\$04\$/);
  });

  it('should produce different hashes when the same password is hashed twice', async () => {
    const first = await hasher.hash('correct-password');
    const second = await hasher.hash('correct-password');

    expect(first.value).not.toBe(second.value);
  });

  it('should verify the password when it matches the hash', async () => {
    const hash = await hasher.hash('correct-password');

    await expect(hasher.verify('correct-password', hash)).resolves.toBe(true);
  });

  it('should reject the password when it does not match the hash', async () => {
    const hash = await hasher.hash('correct-password');

    await expect(hasher.verify('wrong-password', hash)).resolves.toBe(false);
  });
});
