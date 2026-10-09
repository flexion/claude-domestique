// Deterministic syscall barriers for the abandoned-lock regression.
const fs = require('fs');
const path = require('path');
  const [role, root, target] = process.argv.slice(2);
  const originalStat = fs.statSync;
  const originalRead = fs.readFileSync;
  const wait = tag => {
    process.send({ tag });
    const marker = path.join(root, `${role}-${tag}`);
    const deadline = Date.now() + 10000;
    while (!fs.existsSync(marker)) {
      if (Date.now() > deadline) throw Error('barrier timeout');
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5);
    }
  };
  fs.statSync = function(file, ...args) {
    const result = originalStat.call(fs, file, ...args);
    if (String(file).endsWith('.checkpoint.lock') && role !== 'C') wait('stat');
    return result;
  };
  fs.readFileSync = function(file, ...args) {
    const result = originalRead.call(fs, file, ...args);
    if (String(file).endsWith('.checkpoint')) wait('read');
    return result;
  };
  let result;
  try {
    result = require(target).processInput({ session_id: 'race', hook_event_name: 'PostToolUse' }, {host:'claude', directory:path.join(root,'data')});
    process.send({done:true, reflection:!!result.hookSpecificOutput?.additionalContext.includes('Briefly recheck'), observation:!!result.hookSpecificOutput});
  } catch(e) { process.send({done:true,error:e.code || e.message}); }
  process.disconnect();
