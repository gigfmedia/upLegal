import * as React from 'react';

interface AppointmentConfirmationEmailProps {
  clientName: string;
  lawyerName: string;
  appointmentDate: string;
  appointmentTime: string;
  serviceType: string;
  contactMethod: string;
  duration?: string;
  description?: string;
}

export function AppointmentConfirmationEmail({
  clientName,
  lawyerName,
  appointmentDate,
  appointmentTime,
  serviceType,
  contactMethod,
  duration = '60 minutos',
  description = 'Sin descripción adicional',
}: AppointmentConfirmationEmailProps) {
  const formatContactMethod = (method: string) => {
    switch (method) {
      case 'videollamada':
        return 'Videollamada';
      case 'llamada':
        return 'Llamada telefónica';
      case 'presencial':
        return 'Reunión presencial';
      default:
        return method;
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.emailContainer}>
        <div style={styles.emailPreview}>
          <div style={styles.emailHeader}>
            <div style={styles.logo}>
              <img 
                height="40" 
                src="https://www.legalup.app/logo.png" 
                alt="LegalUp" 
                style={styles.logoImage}
              />
              <span style={styles.logoText}>LegalUp</span>
            </div>
          </div>
          <div style={styles.emailContent}>
            <h1 style={styles.title}>¡Tu cita ha sido agendada con éxito!</h1>
            
            <p style={styles.paragraph}>Hola {clientName},</p>
            
            <p style={styles.paragraph}>
              Gracias por confiar en LegalUp para tus asesorías legales. Tu cita ha sido confirmada con éxito.
            </p>
            
            <div style={styles.appointmentDetails}>
              <div style={styles.detailRow}>
                <div style={styles.detailLabel}>Abogado:</div>
                <div style={styles.detailValue}>{lawyerName}</div>
              </div>
              <div style={styles.detailRow}>
                <div style={styles.detailLabel}>Tipo de servicio:</div>
                <div style={styles.detailValue}>
                  {serviceType === 'legal-advice' && 'Asesoría Legal'}
                  {serviceType === 'document-review' && 'Revisión de Documentos'}
                  {serviceType === 'contract-review' && 'Revisión de Contratos'}
                  {serviceType === 'other' && 'Otro servicio'}
                </div>
              </div>
              <div style={styles.detailRow}>
                <div style={styles.detailLabel}>Fecha:</div>
                <div style={styles.detailValue}>
                  {new Date(appointmentDate).toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
              <div style={styles.detailRow}>
                <div style={styles.detailLabel}>Hora:</div>
                <div style={styles.detailValue}>{appointmentTime}</div>
              </div>
              <div style={styles.detailRow}>
                <div style={styles.detailLabel}>Duración:</div>
                <div style={styles.detailValue}>{duration} minutos</div>
              </div>
              <div style={styles.detailRow}>
                <div style={styles.detailLabel}>Modalidad:</div>
                <div style={styles.detailValue}>
                  {formatContactMethod(contactMethod)}
                </div>
              </div>
              {description && (
                <div style={styles.detailRow}>
                  <div style={styles.detailLabel}>Detalles:</div>
                  <div style={styles.detailValue}>{description}</div>
                </div>
              )}
            </div>
            
            <p style={styles.paragraph}>
              {contactMethod === 'videollamada' 
                ? 'Recibirás un correo con el enlace para unirte a la videollamada 15 minutos antes de la cita.'
                : contactMethod === 'llamada'
                ? 'El abogado te llamará al número proporcionado al momento de la cita.'
                : 'La reunión será en la dirección acordada con el abogado.'}
            </p>
            
            <div style={styles.buttonContainer}>
              <a 
                href="https://app.legalup.app/mis-citas" 
                style={styles.button}
              >
                Ver detalles de la cita
              </a>
            </div>
            
            <p style={styles.paragraph}>
              Si necesitas modificar o cancelar tu cita, por favor hazlo con al menos 24 horas de anticipación.
            </p>
            
            <div style={styles.footer}>
              <p style={styles.footerText}>
                Si tienes alguna pregunta, no dudes en contactarnos en{' '}
                <a 
                  href="mailto:soporte@legalup.app" 
                  style={styles.footerLink}
                >
                  soporte@legalup.app
                </a>
              </p>
            </div>
          </div>
          
          <div style={styles.copyright}>
            <p style={styles.copyrightText}>
              © {new Date().getFullYear()} LegalUp. Todos los derechos reservados.
            </p>
            <p style={styles.copyrightNote}>
              Este es un correo automático, por favor no respondas a este mensaje.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    fontFamily: 'Inter, Arial, sans-serif',
    backgroundColor: '#f1f5f9',
    margin: 0,
    padding: '20px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
  } as const,
  emailContainer: {
    maxWidth: '600px',
    width: '100%',
    backgroundColor: '#f8fafc',
    padding: '20px',
    boxSizing: 'border-box',
  } as const,
  emailPreview: {
    background: '#ffffff',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  } as const,
  emailHeader: {
    textAlign: 'center',
    padding: '30px 20px',
    background: '#ffffff',
  } as const,
  logo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  } as const,
  logoImage: {
    height: '40px',
    width: 'auto',
  } as const,
  logoText: {
    color: '#101820',
    fontSize: '28px',
    fontWeight: 'bold',
  } as const,
  divider: {
    height: '4px',
    background: 'linear-gradient(90deg, #2563eb, #10b981)',
    width: '100px',
    margin: '15px auto',
  } as const,
  emailContent: {
    padding: '30px',
    background: '#ffffff',
  } as const,
  title: {
    color: '#101820',
    margin: '0 0 20px 0',
    fontSize: '22px',
    fontWeight: '600',
  } as const,
  paragraph: {
    color: '#475569',
    lineHeight: 1.6,
    margin: '0 0 20px 0',
    fontSize: '16px',
  } as const,
  appointmentDetails: {
    background: '#f8fafc',
    borderRadius: '8px',
    padding: '20px',
    margin: '25px 0',
    border: '1px solid #e2e8f0',
  } as const,
  detailRow: {
    display: 'flex',
    marginBottom: '10px',
    flexWrap: 'wrap',
  } as const,
  detailLabel: {
    fontWeight: '600',
    color: '#475569',
    width: '120px',
    marginBottom: '5px',
  } as const,
  detailValue: {
    color: '#1e293b',
    flex: 1,
    marginBottom: '5px',
  } as const,
  buttonContainer: {
    textAlign: 'center',
    margin: '30px 0',
  } as const,
  button: {
    display: 'inline-block',
    backgroundColor: '#2563eb',
    color: 'white',
    textDecoration: 'none',
    padding: '12px 25px',
    borderRadius: '6px',
    fontWeight: '500',
    margin: '10px 0',
  } as const,
  footer: {
    borderTop: '1px solid #e2e8f0',
    paddingTop: '20px',
    marginTop: '30px',
  } as const,
  footerText: {
    color: '#64748b',
    fontSize: '13px',
    margin: '0 0 10px 0',
    lineHeight: 1.5,
  } as const,
  footerLink: {
    color: '#2563eb',
    textDecoration: 'none',
  } as const,
  copyright: {
    textAlign: 'center',
    padding: '20px',
    backgroundColor: '#f8fafc',
    borderTop: '1px solid #e2e8f0',
  } as const,
  copyrightText: {
    color: '#94a3b8',
    fontSize: '12px',
    margin: '0 0 5px 0',
  } as const,
  copyrightNote: {
    color: '#cbd5e1',
    fontSize: '11px',
    margin: '0',
  } as const,
};
