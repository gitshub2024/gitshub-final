import nodemailer, { SendMailOptions } from 'nodemailer';
import {
  EMAIL_HOST,
  EMAIL_PORT,
  EMAIL_USER,
  EMAIL_PASS,
  APP_NAME,
} from '../config/keys';

export const sendEmail = async (
  to: string,
  subject: string,
  msg: string,
  icsFileContent?: string,
) => {
  const transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    secure: EMAIL_PORT === 465, // Secure only for port 465
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });

  const emailOptions = <SendMailOptions>{
    from: `"${APP_NAME}" <${EMAIL_USER}>`,
    to,
    subject,
    html: msg,
  };

  if (icsFileContent)
    emailOptions.icalEvent = {
      content: icsFileContent,
      method: 'request',
    };

  try {
    const info = await transporter.sendMail(emailOptions);
    console.log(`Email sent to ${to}. Message ID: ${info.messageId}`);
    return info.messageId;
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    throw error; // Propagate error to caller
  }
};