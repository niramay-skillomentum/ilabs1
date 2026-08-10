const http = require('http');

http.get('http://localhost:3002/api/security/search?q=APPLE', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Security:', data.substring(0, 200)));
});

http.get('http://localhost:3002/api/entity/search?q=SBG', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Entity:', data.substring(0, 200)));
});
