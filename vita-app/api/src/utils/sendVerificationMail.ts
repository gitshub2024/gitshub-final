import { Response } from 'express';
import { APP_NAME, ASSET_FOLDER, CLIENT_URL } from '../config/keys';
import { sendEmail } from '../service/email-service';
import { makeTemplate } from './makeTemplate';
import { UserSchemaType } from '../types';

const sendVerificationMail = async (res: Response, user: UserSchemaType) => {
  const verificationToken = user.createVerificationToken();
  const verificationUrl = `${CLIENT_URL}/email-verification?token=${verificationToken}`;

  console.log(`Preparing to send verification email to: ${user.email}`);
  console.log(`Verification URL: ${verificationUrl}`);

  try {
    const emailId = await sendEmail(
      user.email,
      'Verify your email',
      makeTemplate('emailVerification.hbs', {
        url: verificationUrl,
        name: user.first_name,
        appName: APP_NAME,
        assetFolder: ASSET_FOLDER,
      }),
    );

    console.log(`Verification email sent successfully to ${user.email}. Email ID: ${emailId}`);

    return res.status(200).json({
      success: true,
      emailId,
    });
  } catch (err) {
    console.error(`Failed to send verification email to ${user.email}:`, err);
    return res.status(500).json({
      success: false,
      error: 'Failed to send verification email. Please try again later.',
    });
  }
};

export default sendVerificationMail;