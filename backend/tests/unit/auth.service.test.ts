import { AuthService } from '../../src/services/auth.service';
import { UserModel } from '../../src/models/User';
import { RefreshTokenModel } from '../../src/models/RefreshToken';
import * as jwt from '../../src/utils/jwt';

// Mock dependencies
jest.mock('../../src/models/User');
jest.mock('../../src/models/RefreshToken');
jest.mock('../../src/utils/jwt');
jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const mockUserModel = UserModel as jest.Mocked<typeof UserModel>;
const mockRefreshTokenModel = RefreshTokenModel as jest.Mocked<typeof RefreshTokenModel>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'customer' as const,
        is_email_verified: false,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockUserModel.findByEmail.mockResolvedValue(null);
      mockUserModel.create.mockResolvedValue(mockUser);
      mockUserModel.toResponse.mockReturnValue({
        id: 1,
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'customer',
        is_email_verified: false,
        created_at: mockUser.created_at,
      });
      mockJwt.generateAccessToken.mockReturnValue('access-token');
      mockJwt.generateRefreshToken.mockReturnValue('refresh-token');
      mockRefreshTokenModel.createWithToken.mockResolvedValue({} as any);

      const result = await AuthService.register({
        email: 'test@example.com',
        password: 'password123',
        full_name: 'Test User',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(mockUserModel.create).toHaveBeenCalledTimes(1);
    });

    it('should throw error if email already exists', async () => {
      mockUserModel.findByEmail.mockResolvedValue({ id: 1 } as any);

      await expect(
        AuthService.register({
          email: 'existing@example.com',
          password: 'password123',
          full_name: 'Test User',
        })
      ).rejects.toThrow('User with this email already exists');
    });

    it('should throw error for missing fields', async () => {
      await expect(
        AuthService.register({ email: '', password: 'pass123', full_name: 'Test' })
      ).rejects.toThrow('Email, password, and full name are required');
    });

    it('should throw error for invalid email', async () => {
      await expect(
        AuthService.register({ email: 'invalid', password: 'pass123', full_name: 'Test' })
      ).rejects.toThrow('Invalid email format');
    });

    it('should throw error for short password', async () => {
      await expect(
        AuthService.register({ email: 'test@test.com', password: '123', full_name: 'Test' })
      ).rejects.toThrow('Password must be at least 6 characters');
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password_hash: 'hashed-password',
        full_name: 'Test User',
        role: 'customer' as const,
        is_active: true,
        is_email_verified: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockUserModel.findByEmail.mockResolvedValue(mockUser);
      mockUserModel.verifyPassword.mockResolvedValue(true);
      mockUserModel.toResponse.mockReturnValue({
        id: 1,
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'customer',
        is_email_verified: false,
        created_at: mockUser.created_at,
      });
      mockJwt.generateAccessToken.mockReturnValue('access-token');
      mockJwt.generateRefreshToken.mockReturnValue('refresh-token');
      mockRefreshTokenModel.createWithToken.mockResolvedValue({} as any);

      const result = await AuthService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.accessToken).toBe('access-token');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw error for non-existent user', async () => {
      mockUserModel.findByEmail.mockResolvedValue(null);

      await expect(
        AuthService.login({ email: 'nobody@test.com', password: 'pass123' })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw error for wrong password', async () => {
      mockUserModel.findByEmail.mockResolvedValue({
        id: 1,
        email: 'test@test.com',
        password_hash: 'hash',
        is_active: true,
      } as any);
      mockUserModel.verifyPassword.mockResolvedValue(false);

      await expect(
        AuthService.login({ email: 'test@test.com', password: 'wrong' })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw error for inactive user', async () => {
      mockUserModel.findByEmail.mockResolvedValue({
        id: 1,
        email: 'test@test.com',
        password_hash: 'hash',
        is_active: false,
      } as any);

      await expect(
        AuthService.login({ email: 'test@test.com', password: 'pass123' })
      ).rejects.toThrow('Your account has been deactivated');
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      mockRefreshTokenModel.deleteByToken.mockResolvedValue(true);

      await expect(AuthService.logout('valid-token')).resolves.not.toThrow();
      expect(mockRefreshTokenModel.deleteByToken).toHaveBeenCalledWith('valid-token');
    });

    it('should throw error for invalid token', async () => {
      mockRefreshTokenModel.deleteByToken.mockResolvedValue(false);

      await expect(AuthService.logout('invalid-token')).rejects.toThrow('Invalid refresh token');
    });
  });
});
