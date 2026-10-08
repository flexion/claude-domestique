'use strict';

function pageCount(total, size) {
  return Math.floor(total / size);
}

function paginate(items, page, size) {
  if (!Number.isInteger(size) || size < 1) {
    throw new RangeError('size must be a positive integer');
  }
  const pages = pageCount(items.length, size);
  if (!Number.isInteger(page) || page < 1 || page > pages) {
    return { items: [], page, pages };
  }
  const start = (page - 1) * size;
  return { items: items.slice(start, start + size), page, pages };
}

module.exports = { pageCount, paginate };
