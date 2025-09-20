import { loadStripe } from '@stripe/stripe-js';

// This is your test publishable API key.
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

export default stripePromise;
