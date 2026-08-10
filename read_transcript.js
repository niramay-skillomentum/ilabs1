const fs = require('fs');
const lines = fs.readFileSync('C:/Users/ASHISH/.gemini/antigravity-ide/brain/ccc08f37-564e-4ea0-ac39-fc5997b1d77e/.system_generated/logs/transcript.jsonl', 'utf8').split('\n');
for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const obj = JSON.parse(line);
    if (obj.type === 'USER_INPUT') {
      console.log(`STEP ${obj.step_index}: ${obj.content.substring(0, 200).replace(/\n/g, ' ')}`);
    }
  } catch(e) {}
}
