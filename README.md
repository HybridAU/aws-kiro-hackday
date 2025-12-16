# Grants Management System

A comprehensive web application for managing grant applications with separate customer and administrative interfaces.

## Features

- **Customer Portal**: Organizations can register, apply for grants, and track application status
- **Admin Portal**: Grant administrators can review applications, conduct assessments, and manage the grant process
- **Security**: Role-based access control, secure authentication, and comprehensive audit logging
- **Communication**: Built-in messaging system between administrators and applicants

## Technology Stack

- **Backend**: Django REST Framework with PostgreSQL
- **Authentication**: JWT-based authentication
- **Containerization**: Docker and Docker Compose
- **Package Management**: UV for Python dependencies

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd grants-management-system
   ```

2. **Set up environment variables**
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your configuration
   ```

3. **Start the application**
   ```bash
   docker-compose up --build
   ```

4. **Access the application**
   - API: http://localhost:8000
   - Admin Panel: http://localhost:8000/admin
   - Database: localhost:5432

## Development

### Backend Development

The backend is built with Django and includes the following apps:
- `accounts`: User management and authentication
- `applications`: Grant application management
- `assessments`: Application review and scoring
- `communications`: Messaging system
- `audit`: Comprehensive logging and tracking

### API Endpoints

- `/api/auth/` - Authentication endpoints
- `/api/applications/` - Grant application management
- `/api/assessments/` - Application assessments
- `/api/communications/` - Messaging system
- `/api/audit/` - Audit logs

### Running Tests

```bash
docker-compose exec api python manage.py test
```

### Database Migrations

```bash
docker-compose exec api python manage.py makemigrations
docker-compose exec api python manage.py migrate
```

### Creating a Superuser

```bash
docker-compose exec api python manage.py createsuperuser
```

## Project Structure

```
grants-management-system/
├── backend/
│   ├── grants_management/     # Django project settings
│   ├── accounts/              # User management app
│   ├── applications/          # Grant applications app
│   ├── assessments/           # Application assessments app
│   ├── communications/        # Messaging app
│   ├── audit/                 # Audit logging app
│   ├── manage.py
│   └── requirements files
├── docker-compose.yml
└── README.md
```

## Security Features

- HTTPS enforcement in production
- Secure password hashing
- JWT-based authentication
- Role-based access control
- Comprehensive audit logging
- Input validation and sanitization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License.