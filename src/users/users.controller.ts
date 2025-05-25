import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import {
  RegisterUserDto,
  ResendVerificationDto,
  VerifyEmailDto,
} from './dto/register-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { WalletsService } from '../wallets/wallets.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => WalletsService))
    private readonly walletsService: WalletsService,
  ) {}

  /**
   * Create a new user with or without a wallet
   *
   * If wallet details are provided, the user will be created with the wallet linked to their account.
   * If no wallet is provided, the user will be created without any linked wallets.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto) {
    // Create the user first
    const newUser = await this.usersService.create(createUserDto);

    // If wallet is provided, link it to the user
    if (createUserDto.wallet) {
      await this.walletsService.addWallet({
        userId: newUser._id.toString(),
        type: createUserDto.wallet.type,
        address: createUserDto.wallet.address,
      });

      // Get the user's wallets
      const wallets = await this.walletsService.getWallets(
        newUser._id.toString(),
      );

      // Return user with wallets
      return {
        ...newUser,
        wallets,
      };
    }

    return newUser;
  }

  /**
   * Register a new user account with email verification
   *
   * Initiates the registration process by sending a verification code to the user's email.
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() registerUserDto: RegisterUserDto) {
    return this.usersService.register(registerUserDto);
  }

  /**
   * Verify email using the 4-digit verification code
   *
   * Validates the verification code sent to the user's email.
   */
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.usersService.verifyEmail(verifyEmailDto);
  }

  /**
   * Complete registration after email verification
   *
   * Creates the user account after successful email verification.
   */
  @Post('complete-registration')
  @HttpCode(HttpStatus.CREATED)
  completeRegistration(@Body() registerUserDto: RegisterUserDto) {
    return this.usersService.completeRegistration(registerUserDto);
  }

  /**
   * Resend verification code to email
   *
   * Generates a new verification code and sends it to the user's email.
   */
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  resendVerification(@Body() resendVerificationDto: ResendVerificationDto) {
    return this.usersService.resendVerificationCode(
      resendVerificationDto.email,
    );
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Get('username/:username')
  findByUsername(@Param('username') username: string) {
    return this.usersService.findByUsername(username);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
