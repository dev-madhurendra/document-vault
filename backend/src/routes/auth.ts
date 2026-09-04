import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import { sendOtpEmail } from "../utils/mailer";

interface SignupBody {
  name: string;
  email: string;
  password: string;
}

interface VerifyOtpBody {
  email: string;
  otp: string;
}

interface ResendOtpBody {
  email: string;
}

interface LoginBody {
  email: string;
  password: string;
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function authRoutes(app: FastifyInstance) {
  // 1. SIGNUP: Creates unverified user and emails OTP code
  app.post<{ Body: SignupBody }>(
    "/api/auth/signup",
    async (request: FastifyRequest<{ Body: SignupBody }>, reply: FastifyReply) => {
      const { name, email, password } = request.body || ({} as SignupBody);

      if (!name || !email || !password) {
        return reply.code(400).send({ error: "Name, email and password are all required." });
      }
      if (password.length < 6) {
        return reply.code(400).send({ error: "Password must be at least 6 characters." });
      }

      const formattedEmail = email.toLowerCase().trim();
      const existing = await User.findOne({ email: formattedEmail });

      if (existing) {
        // Auto-verify legacy users created prior to the OTP migration
        if (existing.isVerified === undefined) {
          existing.isVerified = true;
          await existing.save();
        }

        if (existing.isVerified) {
          return reply.code(409).send({ error: "An account with this email already exists." });
        }

        // Overwrite temporary OTP if existing unverified user signs up again
        const passwordHash = await bcrypt.hash(password, 10);
        const otp = generateOtp();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10-min expiry

        existing.name = name;
        existing.passwordHash = passwordHash;
        existing.otp = otp;
        existing.otpExpiresAt = otpExpiresAt;
        await existing.save();

        await sendOtpEmail(formattedEmail, otp);
        return reply.send({ message: "Verification OTP sent to your email." });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const otp = generateOtp();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await User.create({
        name,
        email: formattedEmail,
        passwordHash,
        isVerified: false,
        otp,
        otpExpiresAt,
      });

      await sendOtpEmail(formattedEmail, otp);
      return reply
        .code(201)
        .send({ message: "Signup successful. Please check your email for the OTP code." });
    }
  );

  // 2. VERIFY OTP: Validates code and responds with JWT token
  app.post<{ Body: VerifyOtpBody }>(
    "/api/auth/verify-otp",
    async (request: FastifyRequest<{ Body: VerifyOtpBody }>, reply: FastifyReply) => {
      const { email, otp } = request.body || ({} as VerifyOtpBody);

      if (!email || !otp) {
        return reply.code(400).send({ error: "Email and OTP code are required." });
      }

      const formattedEmail = email.toLowerCase().trim();
      const user = await User.findOne({ email: formattedEmail });

      if (!user) {
        return reply.code(404).send({ error: "User account not found." });
      }

      if (user.isVerified) {
        return reply.code(400).send({ error: "Account is already verified." });
      }

      if (!user.otp || !user.otpExpiresAt || user.otp !== otp) {
        return reply.code(400).send({ error: "Invalid OTP code." });
      }

      if (new Date() > user.otpExpiresAt) {
        return reply.code(400).send({ error: "OTP code has expired. Please request a new code." });
      }

      user.isVerified = true;
      user.otp = undefined;
      user.otpExpiresAt = undefined;
      await user.save();

      const token = app.jwt.sign({ id: user._id.toString(), name: user.name, email: user.email });
      return reply.send({ token, user: { id: user._id, name: user.name, email: user.email } });
    }
  );

  // 3. RESEND OTP: Generates a fresh code
  app.post<{ Body: ResendOtpBody }>(
    "/api/auth/resend-otp",
    async (request: FastifyRequest<{ Body: ResendOtpBody }>, reply: FastifyReply) => {
      const { email } = request.body || ({} as ResendOtpBody);

      if (!email) {
        return reply.code(400).send({ error: "Email is required." });
      }

      const formattedEmail = email.toLowerCase().trim();
      const user = await User.findOne({ email: formattedEmail });

      if (!user) {
        return reply.code(404).send({ error: "User not found." });
      }

      if (user.isVerified) {
        return reply.code(400).send({ error: "Account is already verified." });
      }

      const otp = generateOtp();
      user.otp = otp;
      user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();

      await sendOtpEmail(formattedEmail, otp);
      return reply.send({ message: "A new OTP code has been sent to your email." });
    }
  );

  // 4. LOGIN: Verifies credentials & checks verification status
  app.post<{ Body: LoginBody }>(
    "/api/auth/login",
    async (request: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) => {
      const { email, password } = request.body || ({} as LoginBody);

      if (!email || !password) {
        return reply.code(400).send({ error: "Email and password are required." });
      }

      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        return reply.code(401).send({ error: "Incorrect email or password." });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return reply.code(401).send({ error: "Incorrect email or password." });
      }

      // Auto-verify legacy/existing accounts if isVerified flag wasn't set yet
      if (user.isVerified === undefined) {
        user.isVerified = true;
        await user.save();
      }

      if (!user.isVerified) {
        return reply.code(403).send({ error: "Please verify your email address before logging in." });
      }

      const token = app.jwt.sign({ id: user._id.toString(), name: user.name, email: user.email });
      return reply.send({ token, user: { id: user._id, name: user.name, email: user.email } });
    }
  );
}