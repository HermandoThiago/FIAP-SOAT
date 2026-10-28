import {
  isValidLicensePlate,
  isValidVehicleYear,
  maskLicensePlate,
  maxVehicleYear,
  normalizeLicensePlate,
} from '../../src/modules/customers/domain/validators';

describe('license plate validator', () => {
  it.each(['ABC1234', 'ABC1D23', 'XYZ9Z99'])(
    'should accept %s when it follows the old or Mercosul pattern',
    (plate) => {
      expect(isValidLicensePlate(plate)).toBe(true);
    },
  );

  it.each([
    'AB12345',
    'ABCD123',
    'ABC12D3',
    'ABC123',
    'ABC12345',
    '',
    'abc1d23',
  ])('should reject %p when it does not follow any pattern', (plate) => {
    expect(isValidLicensePlate(plate)).toBe(false);
  });

  it('should uppercase and strip hyphens and spaces when normalizing', () => {
    expect(normalizeLicensePlate(' abc-1d23 ')).toBe('ABC1D23');
  });

  it('should keep only the first four characters when masking', () => {
    expect(maskLicensePlate('ABC1D23')).toBe('ABC1***');
  });
});

describe('vehicle year validator', () => {
  const now = new Date('2026-10-26T12:00:00Z');

  it('should accept the boundaries when year is 1900 or next year', () => {
    expect(isValidVehicleYear(1900, now)).toBe(true);
    expect(isValidVehicleYear(2027, now)).toBe(true);
    expect(maxVehicleYear(now)).toBe(2027);
  });

  it.each([1899, 2028, 2022.5])(
    'should reject %p when it is out of range or not an integer',
    (year) => {
      expect(isValidVehicleYear(year, now)).toBe(false);
    },
  );
});
