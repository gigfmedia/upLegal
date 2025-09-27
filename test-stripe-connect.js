const Stripe = require('stripe');
require('dotenv').config();

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.VITE_STRIPE_SECRET_KEY);

async function testStripeConnect() {
  try {
    console.log('Testing Stripe Connect...');
    
    // Test creating a test account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'CL',
      business_type: 'individual',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: {
        mcc: '8111',
        product_description: 'Servicios legales a través de LegalUp',
      },
    });
    
    console.log('✅ Successfully created Stripe account:');
    console.log('Account ID:', account.id);
    
    // Create an account link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: 'http://localhost:3000/lawyer/profile',
      return_url: 'http://localhost:3000/lawyer/profile',
      type: 'account_onboarding',
    });
    
    console.log('\n✅ Account Link created:');
    console.log('Onboarding URL:', accountLink.url);
    
  } catch (error) {
    console.error('❌ Error testing Stripe Connect:');
    console.error(error);
  }
}

testStripeConnect();
