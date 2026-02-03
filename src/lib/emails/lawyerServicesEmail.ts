export function getLawyerServicesEmail(lawyerName: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #2563eb;">¡Hola ${lawyerName}!</h1>
      </div>
      
      <p>¡Bienvenido a LegalUp! Notamos que aún no has agregado tus servicios a la plataforma.</p>
      
      <p>Agregar tus servicios es una excelente manera de:</p>
      <ul style="margin: 15px 0; padding-left: 20px;">
        <li>Mostrar tus especialidades legales</li>
        <li>Atraer a más clientes</li>
        <li>Destacar entre otros abogados</li>
      </ul>

      <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Ejemplo de servicio destacado:</h3>
        <p><strong>Nombre del servicio:</strong> Asesoría Laboral Inicial</p>
        <p><strong>Descripción:</strong> Asesoría personalizada sobre temas laborales, incluyendo despidos, finiquitos y derechos del trabajador.</p>
        <p><strong>Duración:</strong> 60 minutos</p>
        <p><strong>Precio:</strong> $50.000 CLP</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://legalup.cl/dashboard/services" 
           style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
          Agregar mis servicios ahora
        </a>
      </div>

      <p>Si necesitas ayuda para configurar tus servicios, no dudes en responder a este correo.</p>
      
      <p>¡Esperamos verte pronto en la plataforma!</p>
      
      <p>Saludos,<br>El equipo de LegalUp</p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
        <p>© ${new Date().getFullYear()} LegalUp. Todos los derechos reservados.</p>
        <p>Si no deseas recibir más correos como este, <a href="https://legalup.cl/preferencias" style="color: #2563eb;">actualiza tus preferencias</a>.</p>
      </div>
    </div>
  `;
}
