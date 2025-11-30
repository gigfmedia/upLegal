import axios from 'axios';
import * as cheerio from 'cheerio';
import { CookieJar } from 'tough-cookie';
import { promisify } from 'util';

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
    
    // Configure axios
    const client = axios.create({
      withCredentials: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html, */*; q=0.01', // Standard AJAX accept
        'Accept-Language': 'es-CL,es;q=0.9,en-US;q=0.8,en;q=0.7',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest', // Important for AJAX requests
        'Origin': 'https://www.pjud.cl',
        'Referer': 'https://www.pjud.cl/transparencia/busqueda-de-abogados',
      }
    });

    // Prepare form data for the search
    const formData = new URLSearchParams();
    formData.append('dni', rutBody);
    formData.append('digit', rutVerifier);

    // Submit the search form
    console.log(`Querying PJUD AJAX API for RUT ${rutBody}-${rutVerifier}...`);
    const searchResponse = await client.post(searchUrl, formData);

    // Parse the results
    const $ = cheerio.load(searchResponse.data);
    
    // Check for "No results" alert
    // The site returns: <div class="alert alert-warning">No se encontraron registros</div>
    if ($('.alert-warning').length > 0 && $('.alert-warning').text().includes('No se encontraron registros')) {
      return {
        verified: false,
        message: 'No se encontró información del abogado en el Poder Judicial'
      };
    }

    // Check for success table
    // The site returns a table with id "tablaAbogados" or similar structure in the response
    const resultTable = $('table');
    
    if (resultTable.length === 0) {
      // If no table and no warning, something unexpected happened
      console.warn('PJUD Response unexpected:', searchResponse.data.substring(0, 200));
      return {
        verified: false,
        message: 'No se pudo interpretar la respuesta del Poder Judicial (Estructura desconocida)'
      };
    }

    // Extract data from the result table
    const rows = resultTable.find('tbody tr');
    const results: Array<{nombre: string, rut: string, region: string, estado: string}> = [];
    
    rows.each((i, row) => {
      const cols = $(row).find('td');
      
      if (cols.length >= 1) {
        const nombre = $(cols[0]).text().trim();
        // The table from search by RUT doesn't seem to have the RUT column, 
        // but since we searched by RUT, we know it matches.
        // Col 1 seems to be University, Col 2 Region/Country, Col 3 Date.
        
        const region = cols.length > 2 ? $(cols[2]).text().trim() : '';
        
        results.push({
          nombre: nombre,
          rut: rut, // Use the input RUT as it's the one we found
          region: region,
          estado: 'Habilitado' // If it appears here, it's likely enabled. Suspended are usually separate.
        });
      }
    });

    if (results.length === 0) {
       return {
        verified: false,
        message: 'No se encontraron resultados válidos en la tabla'
      };
    }

    // Check if any result matches the provided name
    const normalizedInputName = fullName.toLowerCase().replace(/\s+/g, ' ').trim();
    
    for (const result of results) {
      const normalizedResultName = result.nombre.toLowerCase().replace(/\s+/g, ' ').trim();
      
      // Basic name matching
      const inputParts = normalizedInputName.split(' ');
      const resultParts = normalizedResultName.split(' ');
      
      const allPartsMatch = inputParts.every(part => 
        resultParts.some(resPart => resPart.includes(part) || part.includes(resPart))
      );

      if (allPartsMatch) {
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
