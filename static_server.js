const express = require('express');
const app = express();
const PORT = 5504;

const options = {
  index: 'index.html',
};

app.use(express.static('dist', options));

app.listen(PORT, () => console.log(`Server listening on port: ${PORT}`));
