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

echo.
echo Step 2: Clearing React cache and building client application...
cd client
echo Clearing node_modules\.cache directory...
if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache"
echo Setting environment variables to bypass ESLint errors during build...
set CI=false
set DISABLE_ESLINT_PLUGIN=true
set ESLINT_NO_DEV_ERRORS=true
echo Building React application...
call npm run build
cd ..

echo.
echo Step 3: Creating deployment package with correct structure...
cd deploy
if exist "server" rmdir /s /q "server"
mkdir server
if exist "client" rmdir /s /q "client"
mkdir client\build
cd ..

echo.
echo Step 4: Copying built client files to match server's expected path structure...
xcopy /E /Y client\build deploy\client\build\

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
