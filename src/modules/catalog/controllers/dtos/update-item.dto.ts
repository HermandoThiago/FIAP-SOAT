import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateItemEstoqueDto } from './create-item.dto';

/**
 * O saldo (`quantidade` e `reservada`) não se edita aqui: só muda por movimentação registrada
 * (`POST /itens/{id}/stock-movements`) ou pelos comandos da OS (ADR-012).
 */
export class UpdateItemDto extends PartialType(
  OmitType(CreateItemEstoqueDto, ['itemEstoqueQuantidade'] as const),
) {}
