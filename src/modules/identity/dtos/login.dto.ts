import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ required: true })
  @IsEmail()
  @IsNotEmpty()
  readonly email: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  readonly password: string;
}
