import { io } from 'socket.io-client';

async function loadTest() {
  console.log('Setting up test party...');
  

  const setupSocket = io('http://localhost:3000');
  
  await new Promise(resolve => setupSocket.on('connect', resolve));
  

  setupSocket.emit('create-party', {
    nodes: [],
    edges: [],
    nodeID: 0,
    edgeID: 0
  });
  

  const partyID = await new Promise(resolve => {
    setupSocket.once('party-id', (id) => {
      console.log('Created test party:', id);
      resolve(id);
    });
  });
  

  const numClients = 20;
  const operationsPerClient = 10;
  
  console.log(`\nStarting load test: ${numClients} clients, ${operationsPerClient} ops each`);
  
  const clients = [];
  const latencies = [];
  const startTime = Date.now();
  

  for (let i = 0; i < numClients; i++) {
    const socket = io('http://localhost:3000');
    clients.push(socket);
    
    await new Promise(resolve => {
      socket.on('connect', () => {

        socket.emit('join-party', partyID);
        socket.once('join-party-result', (data) => {
          if (data.res === 'joined-party') {
            resolve();
          } else {
            console.error(`Client ${i} failed to join:`, data.res);
            resolve();
          }
        });
      });
    });
  }
  
  console.log(`${clients.length} clients connected and joined party`);
  

  const allOperations = [];
  
  for (let clientIdx = 0; clientIdx < clients.length; clientIdx++) {
    const socket = clients[clientIdx];
    
    for (let opIdx = 0; opIdx < operationsPerClient; opIdx++) {
      const operation = new Promise((resolve) => {
        const opStart = Date.now();
        const nodeId = clientIdx * 1000 + opIdx;
        
        socket.emit('create-node', {
          partyID: partyID,
          x: Math.random() * 500,
          y: Math.random() * 500,
          id: nodeId
        });
        
        const timeout = setTimeout(() => {
          console.error(`Timeout for client ${clientIdx}, op ${opIdx}`);
          resolve();
        }, 5000);
        
        socket.once('node-created', () => {
          clearTimeout(timeout);
          const latency = Date.now() - opStart;
          latencies.push(latency);
          resolve();
        });
      });
      
      allOperations.push(operation);
      

      await new Promise(r => setTimeout(r, 50));
    }
  }
  

  console.log('\nWaiting for all operations to complete...');
  await Promise.all(allOperations);
  
  const totalTime = Date.now() - startTime;
  

  if (latencies.length === 0) {
    console.error('\n NO OPERATIONS COMPLETED - Check your server logs');
    clients.forEach(s => s.close());
    setupSocket.close();
    process.exit(1);
  }
  
  latencies.sort((a, b) => a - b);
  const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const min = latencies[0];
  const max = latencies[latencies.length - 1];
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const p99 = latencies[Math.floor(latencies.length * 0.99)];
  
  console.log('\n=== LOAD TEST RESULTS ===');
  console.log(`Total operations: ${latencies.length}/${numClients * operationsPerClient}`);
  console.log(`Success rate: ${(latencies.length / (numClients * operationsPerClient) * 100).toFixed(1)}%`);
  console.log(`Total time: ${totalTime}ms`);
  console.log(`Operations/sec: ${(latencies.length / (totalTime / 1000)).toFixed(2)}`);
  console.log('\nLatency Statistics:');
  console.log(`  Average: ${avg.toFixed(2)}ms`);
  console.log(`  Min: ${min.toFixed(2)}ms`);
  console.log(`  Max: ${max.toFixed(2)}ms`);
  console.log(`  P50 (median): ${p50.toFixed(2)}ms`);
  console.log(`  P95: ${p95.toFixed(2)}ms`);
  console.log(`  P99: ${p99.toFixed(2)}ms`);
  

  clients.forEach(s => s.close());
  setupSocket.close();
  
  process.exit(0);
}

loadTest().catch(err => {
  console.error('Load test failed:', err);
  process.exit(1);
});