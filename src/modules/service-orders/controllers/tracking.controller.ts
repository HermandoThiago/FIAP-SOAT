import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  AllowTrackingToken,
  CurrentTrackingActor,
  type TrackingActor,
} from '../../identity/auth';
import { TrackingService } from '../services';
import { RejectQuoteDto } from './dtos';

/**
 * Acompanhamento do cliente (ADR-011): aceita o token de acompanhamento (uma OS) ou o login `CUSTOMER`.
 * JWT de equipe recebe 403 (resolvido em `CurrentTrackingActor`).
 */
@ApiTags('Tracking')
@ApiBearerAuth()
@AllowTrackingToken()
@ApiUnauthorizedResponse({ description: 'Credencial inválida ou expirada' })
@ApiForbiddenResponse({
  description: 'Credencial de equipe não acessa /tracking',
})
@Controller('tracking/service-orders')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @ApiOperation({ description: 'Acompanhamento da OS (dados mascarados)' })
  @ApiNotFoundResponse({ description: 'OS inexistente ou de outro cliente' })
  @ApiResponse({ status: 200, description: 'Situação atual da OS' })
  @HttpCode(200)
  @Get(':serviceOrderId')
  async findTracking(
    @CurrentTrackingActor() actor: TrackingActor,
    @Param('serviceOrderId', ParseUUIDPipe) serviceOrderId: string,
  ) {
    return await this.trackingService.findTracking(actor, serviceOrderId);
  }

  @ApiOperation({
    description:
      'Aprova o orçamento (AGUARDANDO_APROVACAO → AGUARDANDO_EXECUCAO)',
  })
  @ApiNotFoundResponse({ description: 'OS inexistente ou de outro cliente' })
  @ApiConflictResponse({ description: 'OS não está aguardando aprovação' })
  @HttpCode(200)
  @Post(':serviceOrderId/quote/approve')
  async approveQuote(
    @CurrentTrackingActor() actor: TrackingActor,
    @Param('serviceOrderId', ParseUUIDPipe) serviceOrderId: string,
  ) {
    return await this.trackingService.approveQuote(actor, serviceOrderId);
  }

  @ApiOperation({
    description:
      'Recusa o orçamento (AGUARDANDO_APROVACAO → ORCAMENTO_RECUSADO)',
  })
  @ApiNotFoundResponse({ description: 'OS inexistente ou de outro cliente' })
  @ApiConflictResponse({ description: 'OS não está aguardando aprovação' })
  @HttpCode(200)
  @Post(':serviceOrderId/quote/reject')
  async rejectQuote(
    @CurrentTrackingActor() actor: TrackingActor,
    @Param('serviceOrderId', ParseUUIDPipe) serviceOrderId: string,
    @Body() payload: RejectQuoteDto,
  ) {
    return await this.trackingService.rejectQuote(
      actor,
      serviceOrderId,
      payload.reason,
    );
  }
}
