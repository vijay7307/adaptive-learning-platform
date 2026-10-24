import mongoose, { Schema, Document, Model } from 'mongoose'
import bcrypt from 'bcryptjs'

export interface IUser {
  name: string
  email: string
  passwordHash: string
  createdAt: Date
  updatedAt: Date
}

export interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>
}

export type UserDocument = Document<unknown, object, IUser> & IUser & IUserMethods

export interface UserModel extends Model<IUser, object, IUserMethods> {
  hashPassword(password: string): Promise<string>
}

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [60, 'Name cannot exceed 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Please provide a valid email address',
      ],
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false, // Excluded from query results by default for defense in depth
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.passwordHash
        delete ret.__v
        return ret
      },
    },
    toObject: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.passwordHash
        delete ret.__v
        return ret
      },
    },
  }
)

// Static helper to securely hash passwords
userSchema.statics.hashPassword = async function (password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12)
  return bcrypt.hash(password, salt)
}

// Instance method to compare password
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash)
}

export const User = mongoose.model<IUser, UserModel>('User', userSchema)
