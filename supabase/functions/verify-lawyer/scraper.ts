import { load } from 'https://deno.land/x/cheerio@1.0.7/mod.ts';

interface VerificationResult {
  verified: boolean;
  message?: string;
  data?: {
    nombre?: string;
    region?: string;
    estado?: string;
  };
}

export async function scrapePoderJudicial(rut: string, fullName: string): Promise<VerificationResult> {
  try {
    // Format RUT (remove dots and dash, keep only numbers and K)
    const cleanRut = rut.replace(/\./g, '').replace(/-/g, '').toUpperCase();
    
    // Validate RUT format
    if (!/^\d{7,8}[0-9K]$/i.test(cleanRut)) {
      return { 
        verified: false, 
        message: 'Formato de RUT inválido. Use el formato 12345678-9' 
      };
    }

    // Split full name into parts
    const nameParts = fullName.trim().split(/\s+/);
    if (nameParts.length < 2) {
      return { 
        verified: false, 
        message: 'El nombre completo debe tener al menos 2 palabras' 
      };
    }

    // URL of the Poder Judicial search page (this is a placeholder URL)
    const searchUrl = 'https://oficinajudicialvirtual.pjud.cl/ovp/consulta_abogados';
    
    // First, get the search page to extract CSRF token and cookies
    const searchPage = await fetch(searchUrl);
    const html = await searchPage.text();
    const $ = load(html);
    
    // Extract CSRF token (this selector needs to be updated based on actual page structure)
    const csrfToken = $('input[name="_csrf"]').val() || '';
    
    // Prepare form data for the search
    const formData = new URLSearchParams();
    formData.append('_csrf', csrfToken);
    formData.append('rut', cleanRut);
    formData.append('nombres', nameParts[0]);
    formData.append('apellidoPaterno', nameParts[1]);
    // Add more fields as needed based on the actual form

    // Submit the search form
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': searchPage.headers.get('set-cookie') || '',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': searchUrl,
      },
      body: formData.toString(),
    });

    const resultHtml = await response.text();
    const result$ = load(resultHtml);
    
    // Parse the result (these selectors need to be updated based on actual page structure)
    const resultTable = result$('table.resultados');
    const rows = resultTable.find('tr');
    
    if (rows.length <= 1) { // Assuming first row is header
      return {
        verified: false,
        message: 'No se encontró información del abogado en el Poder Judicial'
      };
    }

    // Extract data from the result table
    const resultData = {
      nombre: result$('td.nombre').text().trim(),
      region: result$('td.region').text().trim(),
      estado: result$('td.estado').text().trim(),
    };

    // Verify if the name matches (basic check)
    const normalizedInputName = fullName.toLowerCase().replace(/\s+/g, ' ').trim();
    const normalizedResultName = resultData.nombre.toLowerCase().replace(/\s+/g, ' ').trim();
    
    const nameMatch = normalizedInputName.includes(normalizedResultName) || 
                     normalizedResultName.includes(normalizedInputName);

    return {
      verified: nameMatch,
      message: nameMatch 
        ? 'Abogado verificado exitosamente en el Poder Judicial' 
        : 'Los datos no coinciden con los registros del Poder Judicial',
      data: resultData
    };

  } catch (error) {
    console.error('Error scraping Poder Judicial:', error);
    return {
      verified: false,
      message: 'Error al conectar con el Poder Judicial. Por favor, intente nuevamente más tarde.'
    };
  }
}
