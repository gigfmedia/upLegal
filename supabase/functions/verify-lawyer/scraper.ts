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

    // Split RUT into body and verifier
    const rutBody = cleanRut.slice(0, -1);
    const rutVerifier = cleanRut.slice(-1);

    // Split full name into parts
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

    console.log(`Querying PJUD AJAX API for RUT ${rutBody}-${rutVerifier}...`);

    // Submit the search form
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html, */*; q=0.01',
        'Accept-Language': 'es-CL,es;q=0.9,en-US;q=0.8,en;q=0.7',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        'Origin': 'https://www.pjud.cl',
        'Referer': 'https://www.pjud.cl/transparencia/busqueda-de-abogados',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const resultHtml = await response.text();
    const $ = load(resultHtml);
    
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
    let foundMatch = false;
    let matchData = {};

    rows.each((i, row) => {
      const cols = $(row).find('td');
      
      if (cols.length >= 1) {
        const nombre = $(cols[0]).text().trim();
        const region = cols.length > 2 ? $(cols[2]).text().trim() : '';
        const estado = 'Habilitado'; // Assuming enabled if present

        // Check name match
        const normalizedInputName = fullName.toLowerCase().replace(/\s+/g, ' ').trim();
        const normalizedResultName = nombre.toLowerCase().replace(/\s+/g, ' ').trim();
        
        const inputParts = normalizedInputName.split(' ');
        const resultParts = normalizedResultName.split(' ');
        
        const allPartsMatch = inputParts.every(part => 
          resultParts.some(resPart => resPart.includes(part) || part.includes(resPart))
        );

        if (allPartsMatch) {
          foundMatch = true;
          matchData = {
            nombre: nombre,
            region: region,
            estado: estado
          };
          return false; // break loop
        }
      }
    });

    if (foundMatch) {
        return {
            verified: true,
            message: 'Abogado verificado exitosamente en el Poder Judicial',
            data: matchData
        };
    } else {
        return {
            verified: false,
            message: 'Los datos no coinciden con los registros del Poder Judicial',
            data: { nombre: 'No coincide' } // Return something to indicate mismatch
        };
    }

  } catch (error) {
    console.error('Error scraping Poder Judicial:', error);
    return {
      verified: false,
      message: 'Error al conectar con el Poder Judicial. Por favor, intente nuevamente más tarde.'
    };
  }
}
