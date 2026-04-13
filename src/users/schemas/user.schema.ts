import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  username: string;

  @Prop({
    required: false,
    sparse: true,
    unique: true,
    validate: {
      validator: function (v) {
        return v !== 'null';
      },
      message: props => 'Email cannot be the string "null"',
    },
  })
  email?: string;

  @Prop({ required: true })
  password: string;

  @Prop({ default: false })
  isActive: boolean;

  @Prop()
  lastLogin: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Pre-save hook to handle empty or null email values
UserSchema.pre('save', function (next) {
  // If email is empty string or null, remove the field completely
  if (this.email === '' || this.email === null) {
    this.email = undefined;
    // Use delete to completely remove the field from the document
    delete this.email;
  }
  next();
});

// Pre-update hook to handle empty or null email values
UserSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate() as any;

  // Handle $set operator
  if (update && update.$set) {
    if (update.$set.email === '' || update.$set.email === null) {
      delete update.$set.email;
    }
  }

  // Handle direct update
  if (update && (update.email === '' || update.email === null)) {
    delete update.email;
  }

  next();
});
