import { IsNotEmpty, IsString } from 'class-validator';

export class ChangeNftOwnerDto {
  @IsString()
  @IsNotEmpty()
  newOwnerId: string;
}
