import fs from 'fs';
import path from 'path';

const logPath = 'C:\\Users\\3875129\\.gemini\\antigravity\\brain\\a79a106d-9096-4041-9d1f-355f02d65121\\.system_generated\\logs\\transcript.jsonl';

if (fs.existsSync(logPath)) {
  const content = fs.readFileSync(logPath, 'utf-8');
  const lines = content.split('\n');
  console.log("ALL USER INPUTS:");
  for (const line of lines) {
    if (line.trim()) {
      try {
        const obj = JSON.parse(line);
        if (obj.type === 'USER_INPUT') {
          console.log(`Step ${obj.step_index}: ${obj.content}`);
        }
      } catch (e) {}
    }
  }
} else {
  console.log("Log path does not exist");
}
