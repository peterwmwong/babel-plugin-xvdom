module.exports = (t, id) => typeof id === 'string' ? t.identifier(id) : id;