const crypto = require('crypto');

// Generate VAPID keys
function generateVAPIDKeys() {
  const keyPair = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'der' }
  });

  // Convert public key to base64url format
  const publicKeyDer = keyPair.publicKey;
  const publicKeyBase64 = publicKeyDer.toString('base64');
  
  // Remove the DER header for uncompressed point (0x04)
  const publicKeyBytes = Buffer.from(publicKeyBase64, 'base64');
  const publicKeyBytesWithoutHeader = publicKeyBytes.slice(publicKeyBytes[0] === 0x30 ? 26 : 23);
  const publicKeyBase64Url = publicKeyBytesWithoutHeader.toString('base64url');

  // Convert private key to base64url format  
  const privateKeyDer = keyPair.privateKey;
  const privateKeyBytes = Buffer.from(privateKeyDer, 'base64');
  const privateKeyBytesWithoutHeader = privateKeyBytes.slice(privateKeyBytes[0] === 0x30 ? 16 : 13);
  const privateKeyBase64Url = privateKeyBytesWithoutHeader.toString('base64url');

  return {
    publicKey: publicKeyBase64Url,
    privateKey: privateKeyBase64Url
  };
}

const keys = generateVAPIDKeys();
console.log('VAPID Keys Generated:');
console.log('Public Key:', keys.publicKey);
console.log('Private Key:', keys.privateKey);
console.log('\nAdd these to your environment variables:');
console.log(`VITE_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VITE_VAPID_PRIVATE_KEY=${keys.privateKey}`);
