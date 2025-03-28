import {
  ADMIN_URL,
  APP_NAME,
  ASSET_FOLDER,
  CLIENT_URL,
  EMAIL_VERIFICATION_JWT,
  FEATURE_FLAGS,
} from '../config/keys';
import { NextFunction, Request, Response } from 'express';
import { Document, Types } from 'mongoose';
import { UserModel, MentorModel } from '../Models/User';
import { Waitlist } from '../Models/Waitlist';
import passport from 'passport';
import jwt, { JwtPayload } from 'jsonwebtoken';
import sendVerificationMail from '../utils/sendVerificationMail';
import { sendEmail } from '../service/email-service';
import { makeTemplate } from '../utils/makeTemplate';
import parseFormData from '../utils/parseFormData';
import { SelectOption, UserSchemaType } from '../types';

const googleCallback = async (req: Request, res: Response) => {
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: JSON.stringify(req.query),
  })(req, res);
};

const googleRefreshToken = async (req: Request, res: Response) => {
  passport.authenticate('google', {
    scope: ['profile', 'email', 'https://www.googleapis.com/auth/calendar'],
    state: JSON.stringify({ message: 'getRefreshToken' }),
    accessType: 'offline',
    prompt: 'consent',
  })(req, res);
};

const linkedinCallback = async (req: Request, res: Response) => {
  passport.authenticate('linkedin', {
    state: JSON.stringify(req.query),
  })(req, res);
};

const passportGoogle = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const state = JSON.parse((req.query.state as string) || '{}');
  const page = state?.loginMode === 'true' ? 'login' : 'signup';

  const refreshTokenReq = state.message === 'getRefreshToken';

  passport.authenticate('google', (err, user) => {
    if (refreshTokenReq) {
      if (err) {
        return res.redirect(`${ADMIN_URL}/settings?error=${err}`);
      }

      return res.redirect(`${ADMIN_URL}/settings?success=true`);
    }

    if (err)
      return res.redirect(
        `${CLIENT_URL}/auth?page=${page}&socialAuthFailed=${err}`,
      );

    if (!user)
      return res.redirect(
        `${CLIENT_URL}/auth?page=${page}&socialAuthFailed=Something Went Wrong!`,
      );

    req.logIn(user, (err) => {
      if (err)
        return res.redirect(
          `${CLIENT_URL}/auth?page=${page}&socialAuthFailed=${err}`,
        );

      return next();
    });
  })(req, res, next);
};

const passportLinkedin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const page =
    JSON.parse((req.query.state as string) || '{}')?.loginMode === 'true'
      ? 'login'
      : 'signup';

  passport.authenticate('linkedin', (err, user) => {
    if (err)
      return res.redirect(
        `${CLIENT_URL}/auth?page=${page}7socialAuthFailed=${err}`,
      );

    if (!user)
      return res.redirect(
        `${CLIENT_URL}/auth?page=${page}&socialAuthFailed=Something Went Wrong!`,
      );

    req.logIn(user, (err) => {
      if (err)
        return res.redirect(
          `${CLIENT_URL}/auth?page=${page}&socialAuthFailed=${err}`,
        );

      return next();
    });
  })(req, res, next);
};

const socialAuthCallback = async (req: Request, res: Response) => {
  if (req.user) {
    const user = req.user as UserSchemaType;

    if (user.signup_completed) {
      return res.redirect(`${CLIENT_URL}/dashboard`);
    }

    return res.redirect(`${CLIENT_URL}/registration-form`);
  }

  return res.redirect(
    `${CLIENT_URL}/auth?socialAuthFailed=Something Went Wrong!`,
  );
};

const auth = (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(200).json({
      isLoggedIn: false,
      message: 'User is not logged in.',
      user: {
        name: '',
        image_link: '',
      },
      cookies: undefined,
    });
  }

  return res.status(200).json({
    isLoggedIn: true,
    message: 'User is logged in',
    user: req.user,
    cookies: req.cookies,
  });
};

const jwtLogin = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await UserModel.findOne({ email });

  if (!user) {
    return res.status(401).json({
      success: false,
      isLoggedIn: false,
      message: 'Invalid credentials',
    });
  }

  try {
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        isLoggedIn: false,
        message: 'Invalid credentials',
      });
    }
  } catch (err) {
    return res.status(400).json({
      success: false,
      isLoggedIn: false,
      message: err instanceof Error ? err.message : err,
    });
  }

  if (!user.verified) {
    return sendVerificationMail(res, user);
  }

  const token = user.issueToken();

  res.cookie('jwt', token, {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });
  return res.status(200).json({ isLoggedIn: true, user });
};

const jwtSignup = async (req: Request, res: Response) => {
  const { email, password, first_name, last_name, mentor, inviteCode } = req.body;

  if (FEATURE_FLAGS.waitlist) {
    if (!mentor) {
      const invite = await Waitlist.findOne({ inviteCode });
      if (!invite || (invite.email !== email && invite.email !== '*')) {
        return res.status(401).json({ error: 'Invalid or used invite code' });
      }
      if (invite.email === email) {
        await invite.remove();
      }
    }
  }

  if (!/^[A-Za-z0-9._%+-]+@saintgits.org$/i.test(email) && !mentor) {
    return res.status(400).json({ error: 'You must use a Saintgits email address' });
  }

  const user = new UserModel({
    email,
    password,
    first_name,
    last_name,
    is_mentor: mentor,
  });

  const presentUser = await UserModel.findOne({ email });
  if (presentUser) {
    if (presentUser.verified) {
      return res.status(401).json({ isLoggedIn: false, error: { email: 'User already exists.' } });
    }
    return await sendVerificationMail(res, presentUser);
  }

  await user.save();

  // Don’t log in yet; just send verification email
  return await sendVerificationMail(res, user);
};

const changePassword = async (req: Request, res: Response) => {
  const token = req.body?.token;

  try {
    const { user_id } = jwt.verify(
      token,
      EMAIL_VERIFICATION_JWT.secret,
    ) as JwtPayload;

    const user = await UserModel.findOne({
      $and: [{ _id: user_id }, { token }],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        isLoggedIn: false,
        message: 'Invalid credentials',
      });
    }

    const { password, confirmPassword } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: {
          password: 'Password is required.',
        },
      });
    }

    if (!confirmPassword) {
      return res.status(400).json({
        success: false,
        error: {
          confirmPassword: 'Confirm password is required.',
        },
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: {
          confirmPassword: 'Passwords do not match.',
        },
      });
    }

    user.password = password;
    user.token = '';
    await user.save();

    return res.status(200).json({
      success: true,
      isLoggedIn: true,
      message: 'Password changed successfully',
    });
  } catch (err) {
    return res.status(401).json({
      success: false,
      isLoggedIn: false,
      message: 'Invalid token',
    });
  }
};

const verifyEmail = async (req: Request, res: Response) => {
  const token = req.query.token as string;

  try {
    // Verify the JWT token
    const { user_id } = jwt.verify(
      token,
      EMAIL_VERIFICATION_JWT.secret,
    ) as JwtPayload;

    // Find the user by ID and token
    const user = await UserModel.findOne({
      $and: [{ _id: user_id }, { token }],
    });

    // If user doesn’t exist, return invalid token error
    if (!user) {
      return res.status(401).json({
        success: false,
        isLoggedIn: false,
        message: 'Invalid or expired token',
      });
    }

    // If already verified, return success without changes
    if (user.verified === true) {
      const jwtToken = user.issueToken(); // Assuming this method exists
      res.cookie('jwt', jwtToken, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      });
      return res.status(200).json({
        success: true,
        isLoggedIn: true,
        user: user.toObject(),
      });
    }

    // Update user status
    user.verified = true;
    user.signup_completed = true; // Complete signup now
    user.token = undefined; // Clear the verification token
    await user.save();

    // Log the user in by issuing a JWT
    const jwtToken = user.issueToken(); // Assuming this method exists
    res.cookie('jwt', jwtToken, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });

    // Return success response with user data
    return res.status(200).json({
      success: true,
      isLoggedIn: true,
      user: user.toObject(),
    });
  } catch (err) {
    console.error('Email verification failed:', err);
    return res.status(401).json({
      success: false,
      isLoggedIn: false,
      message: 'Invalid or expired token',
    });
  }
};

const sendMail = async (req: Request, res: Response) => {
  const { email, template } = req.body;

  const user = await UserModel.findOne({ email });

  if (!user) {
    return res.status(400).json({
      message: 'User not found',
    });
  }

  if (template === 'verification') {
    if (user.verified) {
      return res.status(200).json({
        success: false,
        error: 'You are already verified, you can now login!',
      });
    }

    return await sendVerificationMail(res, user);
  }

  if (template === 'reset') {
    const verificationToken = user.createVerificationToken();
    const url = `${CLIENT_URL}/reset-password?token=${verificationToken}`;

    try {
      const emailId = await sendEmail(
        email,
        'Reset Your Password',
        makeTemplate('forgotPassword.hbs', {
          url,
          appName: APP_NAME,
          assetFolder: ASSET_FOLDER,
        }),
      );

      return res.status(200).json({
        success: true,
        emailId,
      });
    } catch (error) {
      return res.status(400).json({
        message: 'Error sending email',
      });
    }
  }

  return res.status(400).json({
    message: 'Invalid template',
  });
};

const logout = (req: Request, res: Response) => {
  req.logout();
  res.clearCookie('jwt');
  req.session.destroy((err) => {
    if (!err) {
      res.status(200).clearCookie('connect.sid', { path: '/' });
      res.json({
        success: true,
      });
    } else {
      console.log(err);
    }
  });
};

const registerUser = async (req: Request, res: Response) => {
  const data = parseFormData(req.body);

  const user = await UserModel.findOne({ email: data.email });
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  user.first_name = data.first_name;
  user.last_name = data.last_name;
  user.interests = data.interests;
  user.avatar = {
    url: req.file?.path || user.avatar?.url,
    filename: req.file?.filename || user.avatar?.filename,
  };
  user.graduation_year = data.graduation_year;
  user.stream = data.stream;

  // Safely handle phoneCode
  if (data.phoneCode && data.phoneCode.value && data.phoneCode.value.phone && data.phone) {
    user.phone = data.phoneCode.value.phone + data.phone;
  } else {
    user.phone = data.phone || ''; // Fallback to just phone or empty string
  }

  user.bio = data.bio;
  user.timezone = data.timezone;

  if (user.is_mentor) {
    const mentor = new MentorModel({
      ...user.toObject(),
      time_slots: data.timeSlots,
      experiences: data.experiences.map((exp: any) => ({
        ...exp,
        _id: new Types.ObjectId(),
      })),
      topics: data.topics?.map((topic: SelectOption) => topic.value),
      expertise: data.expertise?.map((expertise: SelectOption) => expertise.value),
      languages: data.languages?.map((language: SelectOption) => language.value),
      linkedIn: data.linkedin,
      twitter: data.twitter,
      countryCode: data.countryCode,
    });

    await mentor.save();
    user.mentor_information = mentor._id;
  }

  try {
    await user.save();
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid data',
    });
  }

  return res.json({ success: true, user, message: 'Profile saved, please verify your email' });
};

const devLogin = async (req: Request, res: Response) => {
  const mentor_login = req.query.mentor_login === 'true';
  const email = mentor_login ? 'dev@mentor.com' : 'dev@mentee.com';

  const user = await UserModel.findOne({ email });

  if (!user) {
    return res.status(400).json({
      message:
        'Dev users not found, Run `curl -X GET http://localhost:5000/api/seed-data` to seed data!',
    });
  }

  const token = user?.issueToken();

  res.cookie('jwt', token, {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });
  return res.status(200).json({ isLoggedIn: true, user });
};

export default {
  jwtLogin,
  jwtSignup,
  devLogin,
  auth,
  socialAuthCallback,
  passportGoogle,
  passportLinkedin,
  registerUser,
  logout,
  changePassword,
  verifyEmail,
  sendMail,
  googleCallback,
  linkedinCallback,
  googleRefreshToken,
};
