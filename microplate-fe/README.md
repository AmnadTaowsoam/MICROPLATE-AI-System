# Microplate AI Detection - Frontend

A modern, premium React frontend application for microplate analysis and AI-powered detection. Built with TypeScript, Tailwind CSS, and React Router.

## 🚀 Features

### 🔐 Authentication & User Management
- **Login/Signup** with email and username
- **Password Reset** via email token
- **Profile Management** with settings page
- **JWT Token** authentication with automatic refresh
- **Route Guards** protecting authenticated pages

### 🎨 Premium UI/UX
- **Dark/Light Theme** toggle with persistent storage
- **Responsive Design** for all screen sizes
- **Premium Styling** with gradients and animations
- **Professional Icons** and branding elements
- **Smooth Transitions** and hover effects

### 📸 Image Processing
- **Image Upload** with drag & drop support
- **Camera Capture** integration
- **Image Preview** with real-time display
- **Prediction Processing** with progress indicators

### 📊 Data Management
- **Sample Management** with history tracking
- **Results Display** with statistics
- **Real-time Logs** via WebSocket
- **Data Visualization** with charts and graphs

### 🔧 Technical Features
- **TypeScript** for type safety
- **React Query** for data fetching and caching
- **WebSocket** for real-time updates
- **Form Validation** with error handling
- **Loading States** and error boundaries

## 🛠️ Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Router** for navigation
- **TanStack Query** for data management
- **Heroicons** for icons
- **Zod** for validation
- **React Hook Form** for form handling

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd microplate-fe
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   ```
   
   Configure your environment variables:
   ```env
   # Direct service access (no gateway)
   VITE_AUTH_SERVICE_URL=http://localhost:6401
   VITE_IMAGE_SERVICE_URL=http://localhost:6402
   VITE_VISION_SERVICE_URL=http://localhost:6403
   VITE_RESULTS_SERVICE_URL=http://localhost:6404
   VITE_LABWARE_SERVICE_URL=http://localhost:6405
   VITE_PREDICTION_SERVICE_URL=http://localhost:6406
   ```

4. **Start development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open in browser**
   Navigate to `http://localhost:5173`

## 🏗️ Project Structure

```
src/
├── components/
│   ├── capture/
│   │   ├── ImageUpload.tsx      # Image upload and capture
│   │   └── LogsPanel.tsx        # Real-time logs display
│   └── ui/
│       ├── Button.tsx           # Reusable button component
│       ├── Card.tsx             # Card container component
│       ├── Input.tsx            # Form input component
│       └── Navbar.tsx           # Navigation bar with theme toggle
├── hooks/
│   ├── useImageUpload.ts        # Image upload logic
│   ├── useResults.ts            # Results data management
│   └── useWebSocketLogs.ts      # WebSocket connection
├── pages/
│   ├── AuthPage.tsx             # Login/Signup page
│   ├── ProfileSettingsPage.tsx  # User settings and profile
│   ├── ForgotPasswordPage.tsx   # Password reset request
│   ├── ResetPasswordPage.tsx    # Password reset form
│   ├── ResultsPage.tsx          # Results display
│   └── SampleHistoryPage.tsx    # Sample history
├── services/
│   ├── api.ts                   # API client configuration
│   ├── auth.service.ts          # Authentication services
│   ├── image.service.ts         # Image processing services
│   └── results.service.ts       # Results data services
└── App.tsx                      # Main application component
```

## 🎯 Key Components

### Authentication Flow
- **AuthPage**: Combined login/signup with form validation
- **AuthGuard**: Route protection component
- **ProfileSettingsPage**: User profile and theme management

### Image Processing
- **ImageUpload**: Handles file upload, camera capture, and preview
- **LogsPanel**: Real-time WebSocket logs display

### Navigation
- **Navbar**: Premium navigation with theme toggle and user menu
- **AppShell**: Main layout wrapper with header and footer

## 🔧 Configuration

### Environment Variables
```env
# Direct service access (no gateway)
VITE_AUTH_SERVICE_URL=http://localhost:6401    # Auth service
VITE_IMAGE_SERVICE_URL=http://localhost:6402   # Image ingestion service
VITE_VISION_SERVICE_URL=http://localhost:6403  # Vision inference service
VITE_RESULTS_SERVICE_URL=http://localhost:6404 # Results API service
VITE_LABWARE_SERVICE_URL=http://localhost:6405 # Labware interface service
VITE_PREDICTION_SERVICE_URL=http://localhost:6406 # Prediction DB service
```

### Theme Configuration
The app supports light/dark themes with automatic persistence:
- Theme preference stored in `localStorage`
- Automatic sync between components
- Custom event system for real-time updates

## 🚀 Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

## 🎨 Styling

The application uses **Tailwind CSS** with custom configuration:
- **Dark mode** support with `dark:` prefix
- **Custom color palette** for primary colors
- **Responsive design** with mobile-first approach
- **Premium styling** with gradients and shadows

### Custom Classes
- `container-page`: Main content container
- `text-primary-*`: Primary color variations
- `dark:bg-gray-*`: Dark mode background colors

## 🔌 API Integration

### Authentication Endpoints (Auth Service - Port 6401)
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/forgot-password` - Password reset request
- `POST /api/v1/auth/reset-password` - Password reset
- `PUT /api/v1/auth/profile` - Update profile
- `PUT /api/v1/auth/change-password` - Change password

### Image Processing Endpoints
- **Image Service (Port 6402)**: `POST /api/v1/images` - Upload image
- **Vision Service (Port 6403)**: `POST /api/v1/inference/predict` - Run prediction
- **Vision Service (Port 6403)**: `POST /api/v1/capture/snap` - Capture image

### Results Endpoints (Results Service - Port 6404)
- `GET /api/v1/results/samples/{sampleNo}` - Get sample results
- `GET /api/v1/results/health` - Health check

### WebSocket (Results Service - Port 6404)
- `ws://localhost:6404/ws` - Real-time logs stream

## 🧪 Testing

```bash
# Run tests (when implemented)
npm run test
npm run test:coverage
```

## 📱 Browser Support

- **Chrome** 90+
- **Firefox** 88+
- **Safari** 14+
- **Edge** 90+

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation in `/docs` folder

## 🔄 Version History

- **v1.0.0** - Initial release with core features
  - Authentication system
  - Image processing
  - Dark/Light theme
  - Premium UI/UX
  - Real-time logs
  - Responsive design

---

**Built with ❤️ for Microplate AI Detection Platform**