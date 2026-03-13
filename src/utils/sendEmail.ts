import sgMail from '@sendgrid/mail';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export const sendPasswordResetEmail = async (
  toEmail: string,
  resetToken: string
) => {
  const frontendUrl = process.env.FRONTEND_URL || 'https://whereismycafe.vercel.app';
  const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

  await sgMail.send({
    to: toEmail,
    from: process.env.SENDGRID_FROM_EMAIL!,
    subject: 'Reset your WIMC password',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
        <h2 style="color: #0b4e9d; margin-bottom: 20px;">Where Is My Café?</h2>
        <p style="color: #333; line-height: 1.6;">You requested a password reset. Click the button below to set a new password. This link expires in 15 minutes.</p>
        <div style="margin: 30px 0;">
          <a href="${resetUrl}"
            style="display:inline-block; padding: 14px 28px; background:#0b4e9d;
            color:#fff; border-radius:8px; text-decoration:none; font-weight:bold; font-size: 14px;">
            Reset Password
          </a>
        </div>
        <p style="color:#666; font-size:12px; margin-top:24px; border-top: 1px solid #eee; padding-top: 16px;">
          If you didn't request this, you can safely ignore this email.
        </p>
        <div style="margin-top: 20px; text-align: center;">
          <img src="${frontendUrl}/media/footer.png" alt="WIMC Footer" style="width: 100%; max-width: 440px; border-radius: 8px;" />
        </div>
      </div>
    `
  });
};
