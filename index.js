const doctoc = require('doctoc');
const path = require('path');

doctoc.transformAndSave(path.join(__dirname, 'posts'), 'github', 100, 'Índice');
