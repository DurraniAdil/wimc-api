import nodemailer from 'nodemailer';

const getTransporter = () => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('Gmail configuration missing');
  }
  
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
};

export const checkEmailConfig = () => {
  return !!(
    process.env.GMAIL_USER && 
    process.env.GMAIL_APP_PASSWORD && 
    process.env.FRONTEND_URL
  );
};

export const sendPasswordResetEmail = async (
  toEmail: string,
  resetToken: string
) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  const transporter = getTransporter();

  await transporter.sendMail({
    from: `"WIMC" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: 'Reset your WIMC password',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">Where Is My Café?</h2>
        <p>You requested a password reset. This link expires in 15 minutes.</p>
        <a href="${resetUrl}"
          style="display:inline-block; padding: 12px 24px; background:#f59e0b;
          color:#000; border-radius:8px; text-decoration:none; font-weight:bold;">
          Reset Password
        </a>
        <p style="color:#999; font-size:12px; margin-top:24px;">
          If you didn't request this, ignore this email.
        </p>
      </div>
    `
  });
};

export const sendWelcomeEmail = async (
  toEmail: string,
  name: string
) => {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"WIMC" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: 'Welcome to Where Is My Café?',
    html: `
      <div style="font-family: 'Georgia', serif; max-width: 520px; 
        margin: 0 auto; background: #fafaf8; padding: 40px 32px;">
        <h1 style="color: #f59e0b;">Where Is My Café?</h1>
        <p style="color: #999; font-size: 13px;">
          Aurangabad's own café discovery
        </p>
        <hr style="border:none; border-top:1px solid #e5e5e5; margin:24px 0;" />
        <p style="font-size:17px; color:#1a1a1a;">Hey ${name},</p>
        <p style="font-size:15px; color:#444; line-height:1.8;">
          Welcome to the club.
        </p>
        <p style="font-size:15px; color:#444; line-height:1.8;">
          Somewhere in this city there's a corner table with your name on it — 
          a cup going warm, light coming in just right, and nobody asking you 
          to be productive.
        </p>
        <p style="font-size:15px; color:#444; line-height:1.8;">
          We built WIMC so you can find that place.
        </p>
        <div style="margin:32px 0;">
          <a href="${process.env.FRONTEND_URL}"
            style="display:inline-block; padding:14px 28px; 
            background:#f59e0b; color:#000; border-radius:10px; 
            text-decoration:none; font-weight:bold;">
            Start Exploring
          </a>
        </div>
        <p style="font-size:15px; color:#1a1a1a; font-weight:bold;">
          — The WIMC Team
        </p>
        <hr style="border:none; border-top:1px solid #e5e5e5; margin:32px 0;" />
        <p style="font-size:12px; color:#bbb;">
          You're receiving this because you just created an account at 
          whereismycafe.vercel.app. No newsletters, no spam.
        </p>
      </div>
    `
  });
};
