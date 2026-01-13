import Razorpay from 'razorpay';

export const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

export const verifyRazorpayConfig = () => {
  console.log('=== Razorpay Configuration ===');
  
  if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID.includes('your_razorpay')) {
    console.log('❌ RAZORPAY_KEY_ID: Not configured');
    return false;
  }
  console.log('✅ RAZORPAY_KEY_ID: Configured');
  
  if (!process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET.includes('your_razorpay')) {
    console.log('❌ RAZORPAY_KEY_SECRET: Not configured');
    return false;
  }
  console.log('✅ RAZORPAY_KEY_SECRET: Configured');
  
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    console.log('⚠️  RAZORPAY_WEBHOOK_SECRET: Not configured');
  } else {
    console.log('✅ RAZORPAY_WEBHOOK_SECRET: Configured');
  }
  
  console.log('==============================');
  return true;
};

verifyRazorpayConfig();