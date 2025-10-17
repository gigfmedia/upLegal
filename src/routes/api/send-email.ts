import { emailTemplates, sendEmail } from '@/lib/email';
import { json } from '@remix-run/node';

export async function action({ request }: { request: Request }) {
  try {
    const { to, template, templateData } = await request.json();
    
    if (!to) {
      return json({ error: 'Email recipient is required' }, { status: 400 });
    }

    // Get the template
    const templateFn = emailTemplates[template as keyof typeof emailTemplates];
    if (!templateFn) {
      return json({ error: 'Invalid template' }, { status: 400 });
    }

    // Generate email content
    const { subject, html } = templateFn(templateData);

    // Send the email
    const result = await sendEmail({
      to,
      subject,
      html,
    });

    return json({ success: true, data: result });
  } catch (error) {
    console.error('Error sending email:', error);
    return json(
      { error: 'Failed to send email', details: error.message },
      { status: 500 }
    );
  }
}
