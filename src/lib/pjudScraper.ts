import * as cheerio from 'cheerio';

export interface PJUDVerificationResult {
  verified: boolean;
  message?: string;
  data?: {
    nombre?: string;
    region?: string;
    estado?: string;
  };
  error?: string;
}

export async function scrapePoderJudicial(rut: string, fullName: string): Promise<PJUDVerificationResult> {
  try {
    // Validate RUT format (12345678-9 or 12.345.678-9)
    const cleanRut = rut.replace(/\./g, '').replace(/-/g, '').toUpperCase();
    
    if (!/^\d{7,8}[0-9K]$/i.test(cleanRut)) {
      return { 
        verified: false, 
        message: 'Formato de RUT inválido. Use el formato 12345678-9' 
      };
    }

    // Split RUT into body and verifier
    const rutBody = cleanRut.slice(0, -1);
    const rutVerifier = cleanRut.slice(-1);

    // Split full name into parts (still needed for name matching later)
    const nameParts = fullName.trim().split(/\s+/);
    if (nameParts.length < 2) {
      return { 
        verified: false, 
        message: 'El nombre completo debe tener al menos 2 palabras' 
      };
    }

    // URL of the Poder Judicial AJAX search endpoint
    const searchUrl = 'https://www.pjud.cl/ajax/Lawyers/search';
    
    // Prepare form data for the search
    const formData = new URLSearchParams();
    formData.append('dni', rutBody);
    formData.append('digit', rutVerifier);

    // Submit the search form using fetch
    
    let searchResponse: Response;
    let resultHtml: string;
    
    try {
      // Try direct request first
      searchResponse = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Accept': 'text/html, */*; q=0.01',
        },
        body: formData.toString(),
        mode: 'cors',
      });

      if (!searchResponse.ok) {
        throw new Error(`HTTP error! status: ${searchResponse.status}`);
      }

      resultHtml = await searchResponse.text();
    } catch (corsError) {
      console.warn('Direct request failed (likely CORS), trying with proxy...', corsError);
      
      // Fallback: Use CORS proxy
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(searchUrl)}`;
      
      searchResponse = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        body: formData.toString(),
      });

      if (!searchResponse.ok) {
        throw new Error(`HTTP error! status: ${searchResponse.status}`);
      }

      resultHtml = await searchResponse.text();
    }

    // Parse the results
    const $ = cheerio.load(resultHtml);
    
    // Check for "No results" alert
    if ($('.alert-warning').length > 0 && $('.alert-warning').text().includes('No se encontraron registros')) {
      return {
        verified: false,
        message: 'No se encontró información del abogado en el Poder Judicial'
      };
    }

    // Check for success table
    const resultTable = $('table');
    
    if (resultTable.length === 0) {
      console.warn('PJUD Response unexpected:', resultHtml.substring(0, 200));
      return {
        verified: false,
        message: 'No se pudo interpretar la respuesta del Poder Judicial (Estructura desconocida)'
      };
    }

    // Extract data from the result table
    const rows = resultTable.find('tbody tr');
    
    if (rows.length === 0) {
       return {
        verified: false,
        message: 'No se encontraron resultados válidos en la tabla'
      };
    }

    // If we found at least one row, the RUT exists as a lawyer
    const firstRow = rows.first();
    const cols = firstRow.find('td');
    
    const result = {
      nombre: cols.length >= 1 ? cols.eq(0).text().trim() : 'No disponible',
      rut: rut,
      region: cols.length > 2 ? cols.eq(2).text().trim() : '',
      estado: 'Habilitado'
    };

    return {
      verified: true,
      message: 'Abogado verificado exitosamente',
      data: result
    };
    
  } catch (error) {
    console.error('Error en la verificación PJUD:', error);
    return {
      verified: false,
      message: 'Error al conectar con el servicio de verificación',
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}
