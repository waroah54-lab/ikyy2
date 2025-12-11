const express = require('express');
const serverless = require('serverless-http');
const chalk = require('chalk');
const fs = require('fs');
const cors = require('cors');
const path = require('path');

require("./function.js"); // selevel dengan index.js

const app = express();

app.enable("trust proxy");
app.set("json spaces", 2);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

// static files (tanpa ../)
app.use('/', express.static(path.join(__dirname, 'api-page')));
app.use('/src', express.static(path.join(__dirname, 'src')));

// settings.json (tanpa ../)
const settingsPath = path.join(__dirname, 'src/settings.json');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
global.apikey = settings.apiSettings.apikey;

// JSON response formatter
app.use((req, res, next) => {
  console.log(chalk.bgHex('#FFFF99').hex('#333').bold(` Request Route: ${req.path} `));
  global.totalreq = (global.totalreq || 0) + 1;

  const originalJson = res.json;
  res.json = function (data) {
    if (data && typeof data === 'object') {
      const responseData = {
        status: data.status,
        creator: settings.apiSettings.creator || "Created by IkyyOfficial",
        ...data
      };
      return originalJson.call(this, responseData);
    }
    return originalJson.call(this, data);
  };
  next();
});

// Auto-load API routes
let totalRoutes = 0;
const apiFolder = path.join(__dirname, 'src/api');

if (fs.existsSync(apiFolder)) {
  fs.readdirSync(apiFolder).forEach((subfolder) => {
    const subfolderPath = path.join(apiFolder, subfolder);
    if (fs.statSync(subfolderPath).isDirectory()) {
      fs.readdirSync(subfolderPath).forEach((file) => {
        const filePath = path.join(subfolderPath, file);
        if (path.extname(file) === '.js') {
          require(filePath)(app);
          totalRoutes++;
          console.log(chalk.bgHex('#FFFF99').hex('#333').bold(` Loaded Route: ${file} `));
        }
      });
    }
  });
}

console.log(chalk.bgHex('#90EE90').hex('#333').bold(' Load Complete! ✓ '));
console.log(chalk.bgHex('#90EE90').hex('#333').bold(` Total Routes Loaded: ${totalRoutes} `));

// Home → api-page/index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'api-page/index.html'));
});

// 404 page
app.use((req, res, next) => {
  res.status(404).sendFile(path.join(__dirname, 'api-page/404.html'));
});

// 500 page
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).sendFile(path.join(__dirname, 'api-page/500.html'));
});

// Vercel → tanpa listen()
module.exports = serverless(app);
