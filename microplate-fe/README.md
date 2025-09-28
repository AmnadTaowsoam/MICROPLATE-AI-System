# HAllytics - Microplate AI Detection Frontend

A modern, premium React frontend application for microplate analysis and AI-powered detection. Built with TypeScript, Tailwind CSS, and React Router.

## 🎯 Overview

HAllytics is an "Analytics-first Hemagglutination Inhibition" platform that provides:

- **AI-powered microplate analysis** with real-time processing
- **Camera capture integration** for direct image acquisition
- **Premium UI/UX** with dark/light theme support
- **Real-time notifications** and system monitoring
- **Comprehensive user management** and authentication
- **Direct microservice communication** without API gateway

## 🚀 Key Features

### 🔐 Authentication & User Management
- **Login/Signup** with email and username
- **Password Reset** via email token
- **Profile Management** with settings page
- **JWT Token** authentication with automatic refresh
- **Route Guards** protecting authenticated pages

### 📸 Image Processing & Camera Integration
- **Image Upload** with drag & drop support
- **Camera Capture** with real-time status monitoring
- **Image Preview** with real-time display
- **Prediction Processing** with progress indicators
- **Vision Capture Service** integration for camera control

### 🎨 Premium UI/UX
- **Dark/Light Theme** toggle with persistent storage
- **Responsive Design** for all screen sizes
- **Premium Styling** with gradients and animations
- **Professional Icons** and branding elements
- **Smooth Transitions** and hover effects

### 📊 Data Management & Visualization
- **Sample Management** with comprehensive tracking
- **Results Display** with detailed statistics
- **Real-time Logs** via WebSocket
- **Data Visualization** with charts and graphs
- **CSV Export** for labware systems

### 🔧 Advanced Technical Features
- **TypeScript** for type safety
- **React Query** for data fetching and caching
- **WebSocket** for real-time updates
- **Form Validation** with error handling
- **Loading States** and error boundaries
- **Direct Service Communication** for optimal performance

## 🛠️ Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Router** for navigation
- **TanStack Query** for data management
- **Heroicons** for icons
- **Zod** for validation
- **React Hook Form** for form handling
- **Nginx** for production serving

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+
- Yarn or npm
- Docker (for containerized deployment)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd microplate-fe
   ```

2. **Install dependencies**
   ```bash
   yarn install
   # or
   npm install
   ```

3. **Environment Configuration**
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
   VITE_VISION_CAPTURE_SERVICE_URL=http://localhost:6406
   VITE_MINIO_BASE_URL=http://localhost:9000
   ```

4. **Start development server**
   ```bash
   yarn dev
   # or
   npm run dev
   ```

5. **Open in browser**
   Navigate to `http://localhost:5173`

### Docker Deployment

1. **Create environment file**
   ```bash
   cp env.example .env
   ```

2. **Configure environment variables** (optional)
   Edit `.env` file to customize service URLs and ports:
   ```env
   # Service URLs
   VITE_AUTH_SERVICE_URL=http://localhost:6401
   VITE_IMAGE_SERVICE_URL=http://localhost:6402
   VITE_VISION_SERVICE_URL=http://localhost:6403
   VITE_RESULTS_SERVICE_URL=http://localhost:6404
   VITE_LABWARE_SERVICE_URL=http://localhost:6405
   VITE_PREDICTION_SERVICE_URL=http://localhost:6406
   VITE_VISION_CAPTURE_SERVICE_URL=http://localhost:6407
   VITE_MINIO_BASE_URL=http://localhost:9000
   
   # Docker Configuration
   FRONTEND_PORT=6410
   ```

3. **Build and run with Docker Compose**
   ```bash
   docker-compose up --build
   ```

4. **Access the application**
   Navigate to `http://localhost:6410` (or custom port from `.env`)

## 🏗️ Project Structure

```
src/
├── components/
│   ├── capture/
│   │   ├── CameraStatus.tsx       # Camera connection status
│   │   ├── ImageCapture.tsx       # Main image capture interface
│   │   ├── ImageUpload.tsx        # Image upload and capture controls
│   │   ├── SampleInformation.tsx  # Sample data input
│   │   ├── PredictionResults.tsx  # Results display
│   │   └── SystemLogs.tsx         # Real-time logs
│   ├── layout/
│   │   ├── Footer.tsx             # Application footer
│   │   └── Navbar.tsx             # Navigation with theme toggle
│   └── ui/
│       ├── Button.tsx             # Reusable button component
│       ├── Card.tsx               # Card container component
│       ├── Input.tsx              # Form input component
│       └── Spinner.tsx            # Loading spinner
├── contexts/
│   └── ThemeContext.tsx           # Global theme management
├── hooks/
│   ├── useCapture.ts              # Camera capture logic
│   ├── useImageUpload.ts          # Image upload management
│   ├── useResults.ts              # Results data management
│   └── useWebSocketLogs.ts        # WebSocket connection
├── pages/
│   ├── AuthPage.tsx               # Login/Signup page
│   ├── CapturePage.tsx            # Main capture interface
│   ├── Results.tsx                # Results display page
│   ├── ProfilePage.tsx            # User profile
│   ├── SettingsPage.tsx           # Application settings
│   ├── NotificationsPage.tsx      # Notifications management
│   └── UserGuidePage.tsx          # User guide and help
├── services/
│   ├── api.ts                     # API client configuration
│   ├── auth.service.ts            # Authentication services
│   ├── capture.service.ts         # Camera capture services
│   ├── image.service.ts           # Image processing services
│   ├── results.service.ts         # Results data services
│   └── notification.service.ts    # Notification management
└── utils/
    ├── mockData.ts                # Mock data for development
    └── debugRuns.ts               # Debug utilities
```

## 🎯 Key Components

### Authentication Flow
- **AuthPage**: Combined login/signup with form validation
- **AuthGuard**: Route protection component
- **ProfilePage**: User profile and theme management

### Image Processing & Capture
- **ImageUpload**: Handles file upload, camera capture, and preview
- **CameraStatus**: Real-time camera connection monitoring
- **ImageCapture**: Main interface for image acquisition
- **LogsPanel**: Real-time WebSocket logs display

### Navigation & Layout
- **Navbar**: Premium navigation with theme toggle and user menu
- **Footer**: Professional footer with branding
- **ThemeContext**: Global theme management system

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
VITE_VISION_CAPTURE_SERVICE_URL=http://localhost:6407 # Camera capture service
VITE_MINIO_BASE_URL=http://localhost:9000      # MinIO object storage
```

### Theme Configuration
The app supports light/dark themes with automatic persistence:
- Theme preference stored in `localStorage`
- Automatic sync between components
- Custom event system for real-time updates

## 🚀 Available Scripts

```bash
# Development
yarn dev              # Start development server
yarn build            # Build for production
yarn preview          # Preview production build

# Code Quality
yarn lint             # Run ESLint
yarn type-check       # TypeScript type checking

# Docker
docker-compose up     # Start with Docker Compose
docker-compose down   # Stop Docker containers
```

## 🎨 Styling & UI

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
- **Vision Capture Service (Port 6406)**: `POST /api/v1/capture/image` - Capture image

### Results Endpoints (Results Service - Port 6404)
- `GET /api/v1/results/samples/{sampleNo}` - Get sample results
- `GET /api/v1/results/health` - Health check

### Labware Interface Endpoints (Labware Service - Port 6405)
- `POST /api/v1/labware/interface/generate` - Generate CSV interface file
- `GET /api/v1/labware/interface/files` - List interface files

### WebSocket Connections
- **Results Service (Port 6404)**: `ws://localhost:6404/ws` - Real-time logs stream
- **Vision Capture Service (Port 6406)**: `ws://localhost:6406/ws/capture` - Capture status updates

## 📱 Browser Support

- **Chrome** 90+
- **Firefox** 88+
- **Safari** 14+
- **Edge** 90+

## 🐳 Docker Deployment

### Production Build
```bash
# Build the Docker image
docker build -t microplate-frontend .

# Run the container
docker run -p 6410:80 microplate-frontend
```

### Docker Compose
```bash
# Create environment file first
cp env.example .env

# Start all services
docker-compose up -d

# Start with custom profile
docker-compose --profile frontend up -d

# View logs
docker-compose logs -f microplate-frontend

# Stop services
docker-compose down
```

### Environment Configuration
The Docker setup supports runtime environment variable injection:
- Mount `.env` file for configuration
- Nginx serves static files with environment-specific settings
- Health check endpoint for container monitoring

## 🧪 Testing

```bash
# Run tests (when implemented)
yarn test
yarn test:coverage
```

## 🔍 Debugging & Development

### Enhanced Logging
The application includes comprehensive logging for:
- Authentication flow
- API requests and responses
- Camera capture status
- WebSocket connections
- Error handling

### Camera Status Monitoring
- Real-time camera connection status
- Connection health checks
- Error reporting and recovery
- WebSocket-based status updates

### Component Architecture
- Modular component design
- Reusable UI components
- Clear separation of concerns
- Easy testing and maintenance

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
- Check the User Guide in the application
- Review the troubleshooting section

## 🔄 Version History

### v1.0.0 - Current Release
- **Authentication system** with JWT tokens
- **Image processing** with upload and capture
- **Camera integration** with real-time monitoring
- **Dark/Light theme** with persistent storage
- **Premium UI/UX** with professional design
- **Real-time logs** via WebSocket
- **Responsive design** for all devices
- **Direct service communication** for optimal performance
- **Comprehensive user management**
- **CSV export** for labware systems
- **Docker deployment** support

## 🎯 Future Roadmap

- [ ] Enhanced testing suite
- [ ] Performance optimization
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Mobile app development
- [ ] Advanced camera controls
- [ ] Real-time collaboration features

---

**Built with ❤️ for HAllytics - Analytics-first Hemagglutination Inhibition Platform**