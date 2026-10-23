import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  readonly refreshToken: string;
}
