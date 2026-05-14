import { hashPassword, verifyPassword } from './password';

describe('password helper', () => {
  it('hashes a password and verifies it', async () => {
    const hash = await hashPassword('s3cret!');
    expect(hash).not.toBe('s3cret!');
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
    await expect(verifyPassword('s3cret!', hash)).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('s3cret!');
    await expect(verifyPassword('wrong', hash)).resolves.toBe(false);
  });
});
