import { Exclude } from 'class-transformer';
import {
  TipoDocumentoUsuario,
  Usuario,
} from '../../../../generated/prisma/client';

/** Cliente da oficina: um `Usuario` com perfil Cliente (sem senha, a menos que ele se cadastre). */
export class Customer implements Usuario {
  usuarioId: string;
  usuarioNome: string;
  usuarioEmail: string;
  usuarioDocumento: string;
  usuarioTipoDocumento: TipoDocumentoUsuario;
  usuarioTelefone: string | null;
  usuarioCriadoEm: Date;

  @Exclude()
  perfilId: string;

  @Exclude()
  usuarioUltimoAcesso: Date | null;

  @Exclude()
  usuarioAtivo: boolean;

  @Exclude()
  usuarioInativadoEm: Date | null;

  @Exclude()
  usuarioAtualizadoEm: Date;
}
