# ClinicTrust AI Platform - Frontend

This directory contains the frontend application for the ClinicTrust AI Platform, a comprehensive healthcare solution that combines blockchain technology, AI analytics, and secure data sharing for healthcare providers.

## Overview

The ClinicTrust AI Platform frontend is built with React and Material-UI, providing a modern, responsive user interface for healthcare professionals. The application includes features for patient management, referrals, analytics, and a token economy system.

## Features

- **Authentication System**: Secure login, registration, and password reset functionality
- **Dashboard**: Overview of key metrics, recent activity, and quick actions
- **Patient Management**: Patient listings, detailed patient profiles, and medical records
- **Referral System**: Create and manage patient referrals between healthcare providers
- **Analytics Platform**: AI-powered analytics for patient risk assessment and operational insights
- **Token Economy**: Blockchain-based token system for incentivizing data sharing and platform usage
- **User Profile & Settings**: Profile management and application settings

## Technology Stack

- **React**: Frontend library for building user interfaces
- **React Router**: Navigation and routing
- **Material-UI**: Component library for consistent and responsive design
- **Axios**: HTTP client for API requests
- **Context API**: State management for authentication and other global states

## Project Structure

```
client/
├── public/              # Public assets and HTML template
├── src/                 # Source code
│   ├── components/      # Reusable UI components
│   ├── contexts/        # React context providers
│   ├── layouts/         # Page layout components
│   ├── pages/           # Page components
│   │   ├── analytics/   # Analytics-related pages
│   │   ├── auth/        # Authentication pages
│   │   ├── dashboard/   # Dashboard page
│   │   ├── patients/    # Patient management pages
│   │   ├── profile/     # User profile page
│   │   ├── referrals/   # Referral management pages
│   │   ├── settings/    # Settings page
│   │   └── tokens/      # Token economy pages
│   ├── App.js           # Main application component
│   ├── index.js         # Application entry point
│   ├── theme.js         # Material-UI theme configuration
│   └── index.css        # Global styles
└── package.json         # Dependencies and scripts
```

## Getting Started

### Prerequisites

- Node.js (v14.0.0 or later)
- npm (v6.0.0 or later)

### Installation

1. Navigate to the client directory:
   ```
   cd client
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Building for Production

To create a production build:

```
npm run build
```

This will create an optimized build in the `build` directory.

## Integration with Backend

The frontend application is designed to work with the ClinicTrust AI Platform backend API. The API base URL can be configured in the `AuthContext.js` file.

## Authentication Flow

The application uses JWT (JSON Web Tokens) for authentication. The authentication flow is managed by the `AuthContext` provider, which handles login, registration, token storage, and automatic token refresh.

## Responsive Design

The application is fully responsive and works on desktop, tablet, and mobile devices. The responsive behavior is implemented using Material-UI's Grid system and responsive components.

## Theme Customization

The application theme is defined in `theme.js` and can be customized to match your organization's branding. The theme includes color palette, typography, component styling, and more.

## License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

## Contact

For questions or support, please contact the development team at support@clinictrust.ai
