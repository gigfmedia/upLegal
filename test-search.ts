// Test script to verify the search-lawyers API endpoint

async function testSearch() {
  try {
    console.log('Testing search-lawyers API...');
    
    // Test with no filters to get all lawyers
    const response = await fetch('/api/search-lawyers');
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Search results:', JSON.stringify(data, null, 2));
    
    // Check if Gabriela Gómez is in the results
    const gabriela = data.lawyers.find((l: any) => 
      l.first_name === 'Gabriela' && l.last_name === 'Gómez'
    );
    
    if (gabriela) {
      console.log('\nGabriela Gómez found in search results!');
      console.log('Profile:', JSON.stringify(gabriela, null, 2));
    } else {
      console.log('\nGabriela Gómez NOT found in search results');
      console.log('Available lawyers:', data.lawyers.map((l: any) => `${l.first_name} ${l.last_name}`));
    }
    
  } catch (error) {
    console.error('Error testing search:', error);
  }
}

testSearch();
