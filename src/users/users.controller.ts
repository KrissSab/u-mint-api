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
  BadRequestException,
  ConflictException,
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
import { LoginUserDto } from './dto/login-user.dto';
import { WalletLoginDto } from './dto/wallet-login.dto';
import { WalletDto } from '../wallets/dto/wallet.dto';

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
    try {
      // Generate a random username for wallet-based registration if not provided
      if (createUserDto.wallet && !createUserDto.username) {
        const walletAddress = createUserDto.wallet.address;
        // Create a username based on the wallet address (e.g., user_0x1234)
        createUserDto.username = `user_${walletAddress.substring(0, 8)}`;
      }

      // Create the user first
      const newUser = await this.usersService.create(createUserDto);

      // If wallet is provided, link it to the user
      if (createUserDto.wallet) {
        try {
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
        } catch (error) {
          // If wallet linking fails, still return the user but with an error message
          return {
            ...newUser,
            walletError:
              'Failed to link wallet to account, but user was created',
          };
        }
      }

      return newUser;
    } catch (error) {
      // Let NestJS exception filters handle the error
      throw error;
    }
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

  /**
   * Login user with email/username and password
   *
   * Authenticates a user with their email/username and password.
   * Updates the last login timestamp for the user.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginUserDto: LoginUserDto) {
    return this.usersService.login(loginUserDto);
  }

  /**
   * Login user with wallet address and signature
   *
   * Authenticates a user by their wallet address and a signed message.
   * This is for users who have a wallet linked to their account.
   */
  @Post('login/wallet')
  @HttpCode(HttpStatus.OK)
  loginWithWallet(@Body() walletLoginDto: WalletLoginDto) {
    return this.usersService.loginWithWallet(walletLoginDto);
  }

  /**
   * Register a new user with a wallet
   *
   * Creates a new user account with a linked wallet.
   * Generates a random username if none is provided.
   */
  @Post('register/wallet')
  @HttpCode(HttpStatus.CREATED)
  async registerWithWallet(
    @Body() walletData: { wallet: WalletDto; username?: string },
  ) {
    try {
      if (!walletData.wallet || !walletData.wallet.address) {
        throw new BadRequestException('Wallet address is required');
      }

      // Generate a username based on wallet address if not provided
      const username =
        walletData.username ||
        `user_${walletData.wallet.address.substring(0, 8)}`;

      // Create a user DTO with the wallet - explicitly omit email field
      const createUserDto = {
        username,
        password: Math.random().toString(36).substring(2, 15), // Random password
        wallet: walletData.wallet,
      };

      // Create the user
      const newUser = await this.usersService.create(createUserDto);

      // Link the wallet
      await this.walletsService.addWallet({
        userId: newUser._id.toString(),
        type: walletData.wallet.type,
        address: walletData.wallet.address,
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
    } catch (error) {
      console.error('Wallet registration error:', error);

      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new BadRequestException(
        `Failed to register with wallet: ${error.message}`,
      );
    }
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

  /**
   * Update a user's information
   *
   * Updates a user's profile information, such as username, email, or password.
   */
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    if (!id || id === 'undefined') {
      throw new BadRequestException('Valid user ID is required');
    }
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
