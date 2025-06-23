# Timetable Scheduler

## Overview
A full-stack web application that provides a user-friendly interface for a C++ timetable scheduler. The system allows users to upload CSV files containing course data and configuration settings, processes them through a greedy scheduling algorithm, and displays the results in an interactive web interface.

## System Architecture

### Backend Architecture
- **Express.js Server**: RESTful API built with Express.js handling file uploads and scheduler integration
- **C++ Integration**: Native C++ binary (`timetable_scheduler_greedy.cpp`) for core scheduling algorithm
- **File Processing**: Multer middleware for handling CSV file uploads with validation
- **Session Management**: Unique session IDs for tracking individual scheduling requests

### Frontend Architecture
- **React SPA**: Modern React application built with TypeScript
- **Component-Based Design**: Modular components for file upload, status tracking, and timetable display
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent design
- **State Management**: React Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing

### Development Setup
- **Build System**: Vite for fast development and optimized production builds
- **TypeScript**: Full TypeScript support across frontend and backend
- **Monorepo Structure**: Shared types and schemas between frontend and backend

## Key Components

### File Upload System
- Drag-and-drop interface for CSV uploads
- File validation (CSV format, size limits)
- Support for dataset.csv (course information) and config.csv (room configuration)
- Example file download functionality

### Scheduler Integration
- C++ binary compilation and execution
- Process spawning for scheduler execution
- Output parsing from CSV to JSON format
- Error handling and timeout management

### Timetable Display
- Interactive grid layout showing time slots vs rooms
- Color-coded subjects for visual distinction
- Filtering capabilities by semester, teacher, and room
- Responsive design for desktop and mobile

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema**: Timetable sessions and slots tables
- **Session Tracking**: Unique session IDs for managing concurrent requests
- **Data Persistence**: Storage of timetable results and metadata

## Data Flow

1. **File Upload**: User uploads dataset.csv and config.csv files
2. **Session Creation**: System generates unique session ID and stores file metadata
3. **Processing**: C++ scheduler binary processes uploaded files
4. **Parsing**: CSV output is parsed into structured JSON format
5. **Storage**: Results are stored in database with session association
6. **Display**: Frontend fetches and renders timetable in interactive grid
7. **Export**: Users can download results as CSV

## External Dependencies

### Production Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Type-safe database ORM
- **express**: Web server framework
- **multer**: File upload middleware
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI component primitives
- **tailwindcss**: Utility-first CSS framework

### Development Dependencies
- **tsx**: TypeScript execution for development
- **esbuild**: Fast JavaScript bundler for production
- **vite**: Frontend build tool and dev server
- **drizzle-kit**: Database migration and introspection tool

## Deployment Strategy

### Environment Setup
- **Node.js 20**: Primary runtime environment
- **PostgreSQL 16**: Database system
- **C++ Compiler**: GCC for building scheduler binary

### Build Process
1. Frontend build with Vite producing optimized static assets
2. Backend build with esbuild creating production-ready server bundle
3. C++ scheduler compilation during deployment

### Production Configuration
- Autoscale deployment target for dynamic scaling
- Port 5000 internal with port 80 external mapping
- Environment variables for database connections

### Development Workflow
- Hot module replacement for frontend development
- TypeScript type checking across entire codebase
- Database schema migrations with Drizzle

## User Preferences
Preferred communication style: Simple, everyday language.

## Changelog
- June 23, 2025. Initial setup