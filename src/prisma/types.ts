import type { Numeric, Varchar } from '@prisma/orm-postgres/target/codec-types';

export const vc = <N extends number>(value: string) => value as Varchar<N>;
export const nm = <P extends number, S extends number | undefined>(
  value: string,
) => value as Numeric<P, S>;
