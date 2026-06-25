@echo off
echo ===================================================
echo Building ClinicTrust AI for Azure App Service Deployment
echo ===================================================

echo.
@REM echo Step 1: Installing dependencies for server and client...
@REM echo Cleaning npm cache...
@REM call npm cache clean --force
@REM call npm install
@REM cd client
@REM echo Cleaning client npm cache...
@REM call npm cache clean --force
@REM call npm install
@REM cd ..

@REM echo.
@REM echo Step 2: Clearing React cache and building client application...
@REM cd client
@REM echo Clearing node_modules\.cache directory...
@REM if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache"
@REM echo Setting environment variables to bypass ESLint errors during build...
@REM set CI=false
@REM set DISABLE_ESLINT_PLUGIN=true
@REM set ESLINT_NO_DEV_ERRORS=true
@REM echo Building React application...
@REM call npm run build
@REM cd ..

echo.
echo Step 3: Creating deployment package with correct structure...
if exist "deploy" rmdir /s /q "deploy"
mkdir deploy
mkdir deploy\client\build
mkdir deploy\server

echo.
echo Step 4: Copying built client files to match server's expected path structure...
xcopy /E /Y client\build deploy\client\build\
xcopy /E /Y client\build deploy\server\client-build\

echo.
echo Step 5: Copying package.json and installing dependencies...
copy package.json deploy\
cd deploy
echo Installing server dependencies...
call npm install --production
cd ..

echo.
echo Step 6: Copying server files...
xcopy /E /Y server deploy\server\

echo.
echo Step 7: Creating startup files for Azure App Service Linux...

@REM echo Creating package.json with proper start script for Azure...
@REM (
@REM echo {
@REM   echo   "name": "clinictrust-ai",
@REM   echo   "version": "1.0.0",
@REM   echo   "description": "Blockchain-based healthcare platform for secure patient record sharing, AI analytics, and token-based incentives",
@REM   echo   "main": "server.js",
@REM   echo   "engines": {
@REM   echo     "node": "~20"
@REM   echo   },
@REM   echo   "scripts": {
@REM   echo     "start": "node server.js"
@REM   echo   },
@REM   echo   "dependencies": {
@REM   echo     "bcryptjs": "^2.4.3",
@REM   echo     "chalk": "^4.1.2",
@REM   echo     "cors": "^2.8.5",
@REM   echo     "dotenv": "^16.3.1",
@REM   echo     "express": "^4.18.2",
@REM   echo     "express-graphql": "^0.12.0",
@REM   echo     "fabric-network": "^2.2.16",
@REM   echo     "jsonwebtoken": "^9.0.0",
@REM   echo     "mongoose": "^7.0.3",
@REM   echo     "morgan": "^1.10.0",
@REM   echo     "winston": "^3.8.2"
@REM   echo   }
@REM   echo }
@REM ) > deploy\package.json

@REM echo.
@REM echo Step 7: Creating server startup file for Azure...
@REM (
@REM echo // This file is used by Azure App Service to start the application
@REM echo 'use strict';
@REM echo process.env.NODE_ENV = 'production';

@REM echo // Import required modules
@REM echo const express = require('express');
@REM echo const cors = require('cors');
@REM echo const morgan = require('morgan');
@REM echo const path = require('path');
@REM echo const dotenv = require('dotenv');
@REM echo const fs = require('fs');
@REM echo const mongoose = require('mongoose');

@REM echo // Load environment variables
@REM echo dotenv.config();

@REM echo // Log the directory structure for debugging
@REM echo console.log('Current directory:', __dirname);
@REM echo console.log('Files in current directory:', fs.readdirSync(__dirname));
@REM echo console.log('Client build directory exists:', fs.existsSync(path.join(__dirname, 'client/build')));

@REM echo // Initialize express app
@REM echo const app = express();
@REM echo const PORT = process.env.PORT || 8080;

@REM echo // Middleware
@REM echo app.use(cors());
@REM echo app.use(express.json());
@REM echo app.use(morgan('dev'));

@REM echo // Connect to MongoDB
@REM echo if (process.env.MONGO_URI) {
@REM echo   mongoose.connect(process.env.MONGO_URI, {
@REM echo     useNewUrlParser: true,
@REM echo     useUnifiedTopology: true
@REM echo   })
@REM echo   .then(() => console.log('MongoDB Connected'))
@REM echo   .catch(err => {
@REM echo     console.error('MongoDB Connection Error:', err.message);
@REM echo     // Continue even if MongoDB connection fails
@REM echo   });
@REM echo } else {
@REM echo   console.log('MONGO_URI not provided, skipping database connection');
@REM echo }

@REM echo // Serve static files from the React app
@REM echo app.use(express.static(path.join(__dirname, 'client/build')));

@REM echo // API routes can be added here if needed

@REM echo // The "catchall" handler: for any request that doesn't
@REM echo // match one above, send back React's index.html file.
@REM echo app.get('*', (req, res) => {
@REM echo   res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
@REM echo });

@REM echo // Start server
@REM echo app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
@REM ) > deploy\server.js

@REM echo.
@REM echo Step 8: Creating .deployment file for Azure...
@REM (
@REM echo [config]
@REM echo SCM_DO_BUILD_DURING_DEPLOYMENT=true
@REM echo NODE_VERSION=20.x
@REM ) > deploy\.deployment

@REM echo.
@REM echo Step 9: Creating .env file for production...
@REM (
@REM echo NODE_ENV=production
@REM echo PORT=8080
@REM echo WEBSITE_NODE_DEFAULT_VERSION=20.x
@REM ) > deploy\.env

@REM echo.
@REM echo Step 10: Creating deployment package zip file...
@REM cd deploy
@REM if exist "..\clinictrust-ai-azure.zip" del "..\clinictrust-ai-azure.zip"
@REM powershell -Command "Compress-Archive -Path * -DestinationPath '..\clinictrust-ai-azure.zip'"
@REM cd ..

echo.
echo ===================================================
echo Build Complete!
echo ===================================================
echo.
echo Your deployment package is ready at: clinictrust-ai-azure.zip
echo.
echo To deploy to Azure App Service (Linux):
echo 1. Log in to the Azure Portal
echo 2. Navigate to your App Service
echo 3. Go to Deployment Center
echo 4. Choose "Manual Deployment"
echo 5. Upload the clinictrust-ai-azure.zip file
echo.
echo Note: Make sure to configure the following Application Settings in Azure:
echo - WEBSITE_NODE_DEFAULT_VERSION: 20.x
echo - MONGO_URI: Your MongoDB connection string
echo - SCM_DO_BUILD_DURING_DEPLOYMENT: true
echo - Any other environment variables required by your application
echo ===================================================
pause
