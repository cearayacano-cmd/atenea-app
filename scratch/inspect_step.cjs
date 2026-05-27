const fs = require('fs');
const transcriptPath = "C:\\Users\\3875129\\.gemini\\antigravity\\brain\\0e837fb3-6e8b-4e52-8bb2-333231cdd51b\\.system_generated\\logs\\transcript.jsonl";
const fileLines = fs.readFileSync(transcriptPath, 'utf8').split('\n');

for (const line of fileLines) {
  if (line.includes('"step_index":858')) {
    const step = JSON.parse(line);
    console.log('Step 858 found!');
    console.log('Tool calls:', JSON.stringify(step.tool_calls, null, 2));
    break;
  }
}
