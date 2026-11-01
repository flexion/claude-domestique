'use strict';
// Drains a drop in a loop and prints the ids it delivered, for the race test.
const { pickup } = require('../../lib/comm/mail.js');

const [drop, state] = process.argv.slice(2);
const ids = [];
for (;;) {
  const { delivered } = pickup({ drop, state, now: Date.now() });
  if (!delivered.length) break;
  for (const m of delivered) ids.push(m.id);
}
process.stdout.write(JSON.stringify(ids));
