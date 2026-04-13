import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, MongooseError } from 'mongoose';
import * as bcryptjs from 'bcryptjs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateUserDto } from './dto/create-user.dto';
import { RegisterUserDto, VerifyEmailDto } from './dto/register-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserDocument } from './schemas/user.schema';
import {
  Verification,
  VerificationDocument,
} from './schemas/verification.schema';
import { EmailVerificationEvent, UserCreatedEvent } from '../mail/mail.events';
import { LoginUserDto } from './dto/login-user.dto';
import { WalletLoginDto } from './dto/wallet-login.dto';
import { WalletsService } from '../wallets/wallets.service';
import { Wallet } from '../wallets/schemas/wallet.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Verification.name)
    private verificationModel: Model<VerificationDocument>,
    private eventEmitter: EventEmitter2,
    @Inject(forwardRef(() => WalletsService))
    private walletsService: WalletsService,
  ) {}

  // Create user with crypto wallet (no verification needed)
  async create(createUserDto: CreateUserDto) {
    try {
      console.log('createUserDto', createUserDto);
      // Check if username is already taken
      const usernameExists = await this.userModel.findOne({
        username: createUserDto.username,
      });

      if (usernameExists) {
        throw new ConflictException('Username is already taken');
      }

      // Check if email is already taken (only if email is provided and not empty)
      if (createUserDto.email && createUserDto.email.trim() !== '') {
        const emailExists = await this.userModel.findOne({
          email: createUserDto.email,
        });

        if (emailExists) {
          throw new ConflictException('Email is already in use');
        }
      }

      // Check if wallet is provided (for wallet registration)
      const isWalletRegistration =
        createUserDto.wallet && createUserDto.wallet.address;

      // If this is a wallet registration, check if wallet already exists
      if (isWalletRegistration) {
        try {
          const existingWallet = await this.walletsService[
            'walletModel'
          ].findOne({
            address: createUserDto.wallet.address,
          });

          if (existingWallet) {
            throw new ConflictException(
              'This wallet is already registered with another account',
            );
          }
        } catch (error) {
          if (error instanceof ConflictException) {
            throw error;
          }
          // If error is not a ConflictException, continue with user creation
        }
      }

      // Hash password
      const salt = await bcryptjs.genSalt(10);
      const hashedPassword = await bcryptjs.hash(createUserDto.password, salt);

      // Create new user - prepare base user data
      const userData: any = {
        username: createUserDto.username,
        password: hashedPassword,
        isActive: true,
        lastLogin: new Date(),
      };

      // Only add email field if it's provided and not empty
      if (createUserDto.email && createUserDto.email.trim() !== '') {
        userData.email = createUserDto.email.trim();
      }

      // Create and save the user
      const newUser = new this.userModel(userData);
      const savedUser = await newUser.save();

      // Convert to plain object and remove password
      const userObject = savedUser.toObject();
      const { password, ...userResponse } = userObject;

      // Emit event for welcome email (non-blocking)
      if (createUserDto.email && createUserDto.email.trim() !== '') {
        this.eventEmitter.emit(
          'user.created',
          new UserCreatedEvent(createUserDto.email, createUserDto.username),
        );
      }

      return userResponse;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      // Handle MongoDB duplicate key error
      if (error.code === 11000) {
        // Extract the duplicate key field from the error message
        const keyPattern = error.keyPattern;
        const keyValue = error.keyValue;

        if (keyPattern && keyValue) {
          const field = Object.keys(keyPattern)[0];
          const value = keyValue[field];
          throw new ConflictException(`${field} '${value}' is already in use`);
        } else {
          throw new ConflictException('Username or email is already in use');
        }
      }

      console.error('User creation error:', error);
      throw new BadRequestException(error.message || 'Failed to create user');
    }
  }

  // Register user with email verification
  async register(registerUserDto: RegisterUserDto) {
    try {
      // Check if user already exists
      const existingUser = await this.userModel.findOne({
        $or: [
          { email: registerUserDto.email },
          { username: registerUserDto.username },
        ],
      });

      if (existingUser) {
        if (existingUser.email === registerUserDto.email) {
          throw new ConflictException('User with this email already exists');
        } else {
          throw new ConflictException('User with this username already exists');
        }
      }

      // Check if user already has a verification code
      const existingVerification = await this.verificationModel.findOne({
        email: registerUserDto.email,
      });

      if (existingVerification) {
        await this.verificationModel.deleteOne({
          email: registerUserDto.email,
        });
      }

      // Generate verification code
      const verificationCode = this.generateVerificationCode();

      // Create verification document
      const verification = new this.verificationModel({
        email: registerUserDto.email,
        code: verificationCode,
      });

      await verification.save();

      // Emit event to send verification code
      this.eventEmitter.emit(
        'email.verification',
        new EmailVerificationEvent(registerUserDto.email, verificationCode),
      );

      return {
        message: 'Verification code sent to your email',
        email: registerUserDto.email,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      throw new BadRequestException(error.message);
    }
  }

  // Verify email with code
  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    try {
      const { email, code } = verifyEmailDto;

      // Find verification record
      const verification = await this.verificationModel.findOne({ email });

      if (!verification) {
        throw new NotFoundException('Verification record not found');
      }

      if (verification.code !== code) {
        throw new UnauthorizedException('Invalid verification code');
      }

      // Check if this user has already registered
      const existingUser = await this.userModel.findOne({ email });

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // Update verification status
      verification.isVerified = true;
      await verification.save();

      return {
        message: 'Email verified successfully',
        verified: true,
        email,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      throw new BadRequestException(error.message);
    }
  }

  // Complete registration after verification
  async completeRegistration(registerUserDto: RegisterUserDto) {
    // Check if email is verified
    const verification = await this.verificationModel.findOne({
      email: registerUserDto.email,
      isVerified: true,
    });

    if (!verification) {
      throw new UnauthorizedException('Email not verified');
    }

    // Hash password
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(registerUserDto.password, salt);

    // Create user
    const newUser = new this.userModel({
      username: registerUserDto.username,
      email: registerUserDto.email,
      password: hashedPassword,
      isActive: true,
      lastLogin: new Date(),
    });

    const savedUser = await newUser.save();

    // Clean up verification
    await this.verificationModel.deleteOne({ email: registerUserDto.email });

    // Emit event for welcome email
    this.eventEmitter.emit(
      'user.created',
      new UserCreatedEvent(registerUserDto.email, registerUserDto.username),
    );

    // Return user without password
    const userResponse = savedUser.toObject();
    delete userResponse.password;

    return userResponse;
  }

  // Resend verification code
  async resendVerificationCode(email: string) {
    // Check if verification record exists
    const verification = await this.verificationModel.findOne({ email });

    if (!verification) {
      throw new NotFoundException('Verification record not found');
    }

    // Generate new code
    const newCode = this.generateVerificationCode();

    // Update verification record
    verification.code = newCode;
    await verification.save();

    // Emit event to send verification code
    this.eventEmitter.emit(
      'email.verification',
      new EmailVerificationEvent(email, newCode),
    );

    return {
      message: 'Verification code resent',
      email,
    };
  }

  private generateVerificationCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  async findAll() {
    return this.userModel.find().select('-password');
  }

  async findOne(id: string) {
    const user = await this.userModel.findById(id).select('-password');
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByUsername(username: string) {
    const user = await this.userModel.findOne({ username }).select('-password');
    if (!user) {
      throw new NotFoundException(`User with username ${username} not found`);
    }
    return user;
  }

  async findByEmail(email: string) {
    return this.userModel.findOne({ email });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    // Validate the ID
    if (!id) {
      throw new BadRequestException('User ID is required');
    }

    try {
      // If password is being updated, hash it
      if (updateUserDto.password) {
        const salt = await bcryptjs.genSalt(10);
        updateUserDto.password = await bcryptjs.hash(
          updateUserDto.password,
          salt,
        );
      }

      // Check if the user exists first
      const userExists = await this.userModel.findById(id);
      if (!userExists) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      // If email is being updated, check if it's already in use by another user
      if (updateUserDto.email) {
        const emailExists = await this.userModel.findOne({
          email: updateUserDto.email,
          _id: { $ne: id }, // Exclude the current user
        });

        if (emailExists) {
          throw new ConflictException(
            'Email is already in use by another user',
          );
        }
      }

      // Update the user
      const updatedUser = await this.userModel
        .findByIdAndUpdate(id, updateUserDto, { new: true })
        .select('-password');

      return updatedUser;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      if (error.name === 'CastError') {
        throw new BadRequestException(`Invalid user ID format: ${id}`);
      }

      // Handle MongoDB duplicate key error
      if (error.code === 11000) {
        throw new ConflictException('Email or username is already in use');
      }

      throw error;
    }
  }

  async remove(id: string) {
    const deletedUser = await this.userModel.findByIdAndDelete(id);
    if (!deletedUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return { message: 'User deleted successfully' };
  }

  // Login user with email/username and password
  async login(loginUserDto: LoginUserDto) {
    const { email, username, password } = loginUserDto;

    // Validate that either email or username is provided
    if (!email && !username) {
      throw new BadRequestException('Email or username is required');
    }

    // Find user by email or username
    const user = await this.userModel.findOne({
      $or: [{ email: email }, { username: username }],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcryptjs.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login timestamp
    user.lastLogin = new Date();
    await user.save();

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    return {
      message: 'Login successful',
      user: userResponse,
    };
  }

  // Login user with wallet address and signature
  async loginWithWallet(walletLoginDto: WalletLoginDto) {
    const { type, address } = walletLoginDto;

    try {
      // Find the wallet in the database
      const wallet = await this.walletsService.findWalletByAddress(address);

      // Get the associated user
      const user = await this.userModel.findById(wallet.userId);

      if (!user) {
        throw new NotFoundException(
          'User associated with this wallet not found',
        );
      }

      // Update last login timestamp
      user.lastLogin = new Date();
      await user.save();

      // Get all wallets for this user
      const userWallets = await this.walletsService.getWallets(
        user._id.toString(),
      );

      // Return user without password
      const userResponse = user.toObject();
      delete userResponse.password;

      return {
        message: 'Login with wallet successful',
        user: userResponse,
        wallets: userWallets,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new UnauthorizedException('Failed to authenticate with wallet');
    }
  }
}
