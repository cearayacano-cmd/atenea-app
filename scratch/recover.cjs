const fs = require('fs');
const path = require('path');

const transcriptPath = "C:\\Users\\3875129\\.gemini\\antigravity\\brain\\0e837fb3-6e8b-4e52-8bb2-333231cdd51b\\.system_generated\\logs\\transcript.jsonl";
const targetFile = "c:\\Users\\3875129\\.gemini\\antigravity\\scratch\\athenea\\src\\components\\ConfigView2.tsx";

console.log('Reading transcript from:', transcriptPath);
const fileLines = fs.readFileSync(transcriptPath, 'utf8').split('\n');

const stepsToApply = [308, 337, 416, 437, 858, 860, 864, 868, 870, 874, 880, 886, 892, 900, 904, 908, 912, 916];

let configContent = fs.readFileSync(targetFile, 'utf8');

function unescapeString(val) {
  if (typeof val === 'string') {
    if (val.startsWith('"') && val.endsWith('"')) {
      try {
        return JSON.parse(val);
      } catch (e) {
        return val;
      }
    }
  }
  return val;
}

function applyReplacement(target, replacement, stepIndex) {
  target = unescapeString(target);
  replacement = unescapeString(replacement);
  
  if (configContent.includes(target)) {
    configContent = configContent.replace(target, replacement);
    console.log(`-> [Step ${stepIndex}] Successfully replaced exact chunk`);
    return true;
  } else {
    // Try normalized
    const normTarget = target.replace(/\r\n/g, '\n');
    const normConfig = configContent.replace(/\r\n/g, '\n');
    if (normConfig.includes(normTarget)) {
      configContent = normConfig.replace(normTarget, replacement.replace(/\r\n/g, '\n'));
      console.log(`-> [Step ${stepIndex}] Successfully replaced normalized chunk`);
      return true;
    } else {
      console.error(`-> [Step ${stepIndex}] Target not found!`);
      // Print first 50 chars of target for debugging
      console.error(`   Target prefix: ${JSON.stringify(target.substring(0, 80))}`);
      return false;
    }
  }
}

for (const line of fileLines) {
  if (!line.trim()) continue;
  try {
    const step = JSON.parse(line);
    if (stepsToApply.includes(step.step_index) && step.tool_calls && step.tool_calls.length > 0) {
      const tc = step.tool_calls[0];
      const desc = unescapeString(tc.args.Description || tc.args.Instruction || '');
      console.log(`\nProcessing step ${step.step_index}: ${desc}`);
      
      if (tc.name === 'replace_file_content') {
        applyReplacement(tc.args.TargetContent, tc.args.ReplacementContent, step.step_index);
      } else if (tc.name === 'multi_replace_file_content') {
        let chunks = tc.args.ReplacementChunks;
        if (typeof chunks === 'string') {
          chunks = JSON.parse(unescapeString(chunks));
        }
        console.log(`-> Applying ${chunks.length} chunks...`);
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          console.log(`   Applying chunk ${i+1}/${chunks.length}`);
          applyReplacement(chunk.TargetContent, chunk.ReplacementContent, `${step.step_index} (chunk ${i+1})`);
        }
      }
    }
  } catch (err) {
    console.error('Error parsing line:', err.message);
  }
}

fs.writeFileSync(targetFile, configContent, 'utf8');
console.log('\nFinished applying steps!');
