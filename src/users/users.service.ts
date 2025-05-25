import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
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

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Verification.name)
    private verificationModel: Model<VerificationDocument>,
    private eventEmitter: EventEmitter2,
  ) {}

  // Create user with crypto wallet (no verification needed)
  async create(createUserDto: CreateUserDto) {
    // Hash password
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(createUserDto.password, salt);
    let newUser;
    try {
      newUser = new this.userModel({
        username: createUserDto.username,
        email: createUserDto.email,
        password: hashedPassword,
        isActive: true,
        lastLogin: new Date(),
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }

    let savedUser = await newUser.save();
    savedUser = savedUser.toObject();
    const { password, ...userResponse } = savedUser;

    // Emit event for welcome email (non-blocking)
    this.eventEmitter.emit(
      'user.created',
      new UserCreatedEvent(createUserDto.email, createUserDto.username),
    );

    return userResponse;
  }

  // Register user with email verification
  async register(registerUserDto: RegisterUserDto) {
    // Check if user already exists
    const existingUser = await this.userModel.findOne({
      $or: [
        { email: registerUserDto.email },
        { username: registerUserDto.username },
      ],
    });

    if (existingUser) {
      throw new ConflictException(
        'User with this email or username already exists',
      );
    }

    // Check if user already has a verification code
    const existingVerification = await this.verificationModel.findOne({
      email: registerUserDto.email,
    });

    if (existingVerification) {
      await this.verificationModel.deleteOne({ email: registerUserDto.email });
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
  }

  // Verify email with code
  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
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
    // If password is being updated, hash it
    if (updateUserDto.password) {
      const salt = await bcryptjs.genSalt(10);
      updateUserDto.password = await bcryptjs.hash(
        updateUserDto.password,
        salt,
      );
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .select('-password');

    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return updatedUser;
  }

  async remove(id: string) {
    const deletedUser = await this.userModel.findByIdAndDelete(id);
    if (!deletedUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return { message: 'User deleted successfully' };
  }
}
