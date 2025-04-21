const express = require('express');
const app = express();
const PORT = 5504;

const options = {
  index: 'index.html',
};

// Set cross-origin isolation headers for SharedArrayBuffer support
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

app.use(express.static('dist', options));

app.listen(PORT, () => {
  console.log(`Server listening on port: ${PORT}`);
  console.log(`Cross-Origin Isolation enabled for SharedArrayBuffer support`);
});
