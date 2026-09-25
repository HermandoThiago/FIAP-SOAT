import { Module } from '@nestjs/common';

// Módulo `catalog` (contextos-delimitados.md §4). Camadas: controllers/ + dto/ → services/ → repositories/, sobre domain/
// (ADR-003). Conteúdo chega com o prompt da frente correspondente.
@Module({})
export class CatalogModule {}
