import { Exclude } from 'class-transformer';
import { Veiculo } from '../../../../generated/prisma/client';

export class Vehicle implements Veiculo {
  veiculoId: string;
  usuarioId: string;
  veiculoPlaca: string;
  veiculoChassi: string | null;
  veiculoMarca: string;
  veiculoModelo: string;
  veiculoAnoFabricacao: number;
  veiculoCor: string;
  veiculoKmAtual: number | null;
  veiculoAtivo: boolean;
  veiculoCriadoEm: Date;
  veiculoAtualizadoEm: Date;

  @Exclude()
  veiculoInativadoEm: Date | null;
}
