const crypto = require('crypto');
const fs = require('fs');

async function run() {
  console.log('Testing Agent Creation on K8s API...');
  const API_URL = 'http://localhost:4007';
  const email = `test-${crypto.randomBytes(4).toString('hex')}@example.com`;
  const password = 'Password123!';
  
  // 1. Register
  console.log('1. Registering user...');
  let res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name: 'QR Tester' })
  });
  if (!res.ok) throw new Error(`Register failed: ${await res.text()}`);
  const { accessToken } = await res.json();
  console.log('Logged in.');

  // 2. Create Agent
  console.log('2. Creating Agent...');
  res = await fetch(`${API_URL}/agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
    body: JSON.stringify({
      name: 'Midas QR Agent',
      type: 'general',
      description: 'Testing the K8s orchestration fix for EAFIT challenge',
      network: 'testnet',
      llmProvider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      llmApiKey: 'dummy',
      prompt: 'You are a helpful assistant.',
      organization: { name: 'EAFIT', country: 'CO' },
      service: {}
    })
  });
  if (!res.ok) throw new Error(`Create Agent failed: ${await res.text()}`);
  const { agentId } = await res.json();
  console.log(`Agent Created! ID: ${agentId}`);

  // 3. Wait for QR Code
  console.log('3. Waiting for agent to boot and generate QR Code...');
  for (let i = 0; i < 30; i++) {
    res = await fetch(`${API_URL}/agents/${agentId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const agent = await res.json();
    console.log(`State: ${agent.status}`);
    
    if (agent.qrInvitation) {
      console.log('QR Code generated successfully!');
      fs.writeFileSync('qr_code.txt', agent.qrInvitation);
      
      const base64Data = agent.qrInvitation.replace(/^data:image\/png;base64,/, "");
      fs.writeFileSync('qr_code.png', base64Data, 'base64');
      
      console.log('QR Code saved to qr_code.png');
      process.exit(0);
    }
    
    if (agent.status === 'ERROR') {
      throw new Error('Agent went into ERROR state!');
    }
    
    await new Promise(r => setTimeout(r, 5000));
  }
  
  throw new Error('Timeout waiting for QR Code.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
