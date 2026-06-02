import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: Number(process.env.SMTP_PORT) || 1025,
  secure: false,
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
});

export async function sendEmail(to: string, subject: string, html: string) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@humanityorg.foundation',
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('[Email] Failed to send:', err);
  }
}

export function volunteerApprovedEmail(name: string): string {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#f97316;padding:24px;border-radius:8px 8px 0 0">
        <h1 style="color:white;margin:0;font-size:24px">HUManity Foundation</h1>
      </div>
      <div style="background:white;padding:24px;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 8px 8px">
        <h2>Welcome, ${name}! 🎉</h2>
        <p>Your volunteer profile has been approved. You can now log in and start exploring opportunities.</p>
        <a href="${process.env.FRONTEND_URL}/login" style="display:inline-block;background:#f97316;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;margin-top:16px">
          Explore Opportunities
        </a>
        <p style="margin-top:24px;font-size:12px;color:#9ca3af">HUManity Foundation — Humanity Uplifting Mankind</p>
      </div>
    </div>`;
}

export function complianceAlertEmail(cciName: string, itemType: string, dueDate: Date): string {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#f97316;padding:24px;border-radius:8px 8px 0 0">
        <h1 style="color:white;margin:0;font-size:24px">HUManity IOP — Compliance Alert</h1>
      </div>
      <div style="background:white;padding:24px;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 8px 8px">
        <h2 style="color:#dc2626">⚠ Compliance Deadline Approaching</h2>
        <p><strong>CCI:</strong> ${cciName}</p>
        <p><strong>Item:</strong> ${itemType.replace(/_/g, ' ')}</p>
        <p><strong>Due Date:</strong> ${dueDate.toLocaleDateString('en-IN')}</p>
        <a href="${process.env.FRONTEND_URL}/ccis" style="display:inline-block;background:#f97316;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;margin-top:16px">
          View CCI
        </a>
      </div>
    </div>`;
}
