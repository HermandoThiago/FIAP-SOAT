// TypeScript puro (sem @nestjs/*): ano do veículo entre 1900 e o ano atual + 1 (PRD-001 RN-005).
export const MIN_VEHICLE_YEAR = 1900;

export function maxVehicleYear(now: Date = new Date()): number {
  return now.getUTCFullYear() + 1;
}

export function isValidVehicleYear(
  year: number,
  now: Date = new Date(),
): boolean {
  return (
    Number.isInteger(year) &&
    year >= MIN_VEHICLE_YEAR &&
    year <= maxVehicleYear(now)
  );
}
