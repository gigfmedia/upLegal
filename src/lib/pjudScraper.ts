import axios from 'axios';
import * as cheerio from 'cheerio';

export interface PJUDVerificationResult {
  verified: boolean;
  message?: string;
  data?: {
    nombre?: string;
    region?: string;
    estado?: string;
  };
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

    // Format RUT with dots and dash (12.345.678-9)
    const formattedRut = `${cleanRut.slice(0, -7)}.${cleanRut.slice(-7, -4)}.${cleanRut.slice(-4, -1)}-${cleanRut.slice(-1)}`;
    
    // Split full name into parts
    const nameParts = fullName.trim().split(/\s+/);
    if (nameParts.length < 2) {
      return { 
        verified: false, 
        message: 'El nombre completo debe tener al menos 2 palabras' 
      };
    }

    // URL of the Poder Judicial search page
    const searchUrl = 'https://www.pjud.cl/transparencia/busqueda-de-abogados';
    
    // Configure axios to handle cookies and follow redirects
    const client = axios.create({
      withCredentials: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-CL,es-419;q=0.9,es;q=0.8,en;q=0.7',
      }
    });

    // 1. First request to get the search page
    const initialResponse = await client.get(searchUrl);
    const $ = cheerio.load(initialResponse.data);
    
    // 2. Prepare form data for the search
    const formData = new URLSearchParams();
    formData.append('_token', $('input[name="_token"]').val() as string);
    formData.append('rut', formattedRut);
    formData.append('nombres', nameParts[0]);
    formData.append('apellido_paterno', nameParts[1]);
    if (nameParts.length > 2) {
      formData.append('apellido_materno', nameParts[2]);
    }

    // 3. Submit the search form
    const searchResponse = await client.post(searchUrl, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': searchUrl,
        'Origin': 'https://www.pjud.cl',
        'DNT': '1',
      },
      maxRedirects: 5
    });

    // 4. Parse the results
    const result$ = cheerio.load(searchResponse.data);
    const resultTable = result$('.table-responsive table');
    
    // If no results found
    if (resultTable.length === 0) {
      const errorMessage = result$('.alert.alert-danger').text().trim() || 'No se encontró información del abogado en el Poder Judicial';
      return {
        verified: false,
        message: errorMessage
      };
    }

    // Extract data from the result table
    const rows = resultTable.find('tbody tr');
    const results: Array<{nombre: string, rut: string, region: string, estado: string}> = [];
    
    rows.each((i, row) => {
      const cols = $(row).find('td');
      if (cols.length >= 4) {
        results.push({
          nombre: $(cols[0]).text().trim(),
          rut: $(cols[1]).text().trim(),
          region: $(cols[2]).text().trim(),
          estado: $(cols[3]).text().trim()
        });
      }
    });

    // If no valid rows found
    if (results.length === 0) {
      return {
        verified: false,
        message: 'No se encontraron resultados válidos en la búsqueda'
      };
    }

    // Check if any result matches the provided name
    const normalizedInputName = fullName.toLowerCase().replace(/\s+/g, ' ').trim();
    
    for (const result of results) {
      const normalizedResultName = result.nombre.toLowerCase().replace(/\s+/g, ' ').trim();
      
      // Basic name matching (could be improved with more sophisticated matching)
      if (normalizedInputName.includes(normalizedResultName) || 
          normalizedResultName.includes(normalizedInputName)) {
        return {
          verified: true,
          message: 'Abogado verificado exitosamente',
          data: result
        };
      }
    }

    // If we get here, no matching name was found
    return {
      verified: false,
      message: 'Los datos no coinciden con los registros del Poder Judicial',
      data: results[0] // Return the first result for reference
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
