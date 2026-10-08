'use strict';

const { pageCount } = require('./paginate');

function summarize(total, size) {
  const pages = pageCount(total, size);
  const noun = pages === 1 ? 'page' : 'pages';
  return `${total} results across ${pages} ${noun}`;
}

module.exports = { summarize };
