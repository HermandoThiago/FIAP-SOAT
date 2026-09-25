import { FixedIdGenerator, UuidV4IdGenerator } from '../../../src/shared/id-generator';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('UuidV4IdGenerator', () => {
  it('should generate a UUID v4 when next is called', () => {
    expect(new UuidV4IdGenerator().next()).toMatch(UUID_V4);
  });

  it('should generate distinct ids when called repeatedly', () => {
    const generator = new UuidV4IdGenerator();
    const ids = new Set(Array.from({ length: 100 }, () => generator.next()));

    expect(ids.size).toBe(100);
  });
});

describe('FixedIdGenerator', () => {
  it('should return the ids in order when next is called', () => {
    const generator = new FixedIdGenerator(['id-1', 'id-2', 'id-3']);

    expect([generator.next(), generator.next(), generator.next()]).toEqual(['id-1', 'id-2', 'id-3']);
  });

  it('should repeat the last id when the queue is exhausted', () => {
    const generator = new FixedIdGenerator(['id-1', 'id-2']);
    generator.next();
    generator.next();

    expect(generator.next()).toBe('id-2');
    expect(generator.next()).toBe('id-2');
  });

  it('should throw when created without ids', () => {
    expect(() => new FixedIdGenerator([])).toThrow('FixedIdGenerator requires at least one id');
  });
});
