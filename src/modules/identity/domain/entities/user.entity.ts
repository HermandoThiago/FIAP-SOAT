import { Exclude } from 'class-transformer';
import {
  TipoDocumentoUsuario,
  Usuario,
} from '../../../../generated/prisma/client';

export class User implements Usuario {
  usuarioId: string;
  usuarioNome: string;
  usuarioEmail: string;
  usuarioDocumento: string;
  usuarioTipoDocumento: TipoDocumentoUsuario;
  usuarioTelefone: string | null;

  @Exclude()
  perfilId: string;

  @Exclude()
  usuarioUltimoAcesso: Date | null;

  @Exclude()
  usuarioAtivo: boolean;

  @Exclude()
  usuarioInativadoEm: Date | null;

  @Exclude()
  usuarioCriadoEm: Date;

  @Exclude()
  usuarioAtualizadoEm: Date;
}
