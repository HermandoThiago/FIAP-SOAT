import { OmitType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { RegisterUserDto } from './register-user.dto';

export class CreateUserDto extends OmitType(RegisterUserDto, [
  'senha',
] as const) {
  @ApiProperty()
  @IsString()
  @MinLength(12, { message: 'A senha deve ter no mínimo 12 caracteres' })
  readonly senhaHash: string;
}
