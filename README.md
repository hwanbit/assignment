# University Assignment Management System

A comprehensive web application for managing university assignments, similar to Microsoft Teams Assignments tab. Built with React, TypeScript, Tailwind CSS, and Supabase.

## Features

### User Management
- **Role-based Authentication**: Professors and Students with different permissions
- **Secure Login/Registration**: Email/password authentication with Supabase Auth
- **Profile Management**: User profiles with role-based access control

### Assignment Management (Professors)
- **Create Assignments**: Rich assignment creation with descriptions, due dates, and file attachments
- **File Attachments**: Support for PDF, Word documents, images, and other file types
- **Assignment Editing**: Full CRUD operations for assignment management
- **Due Date Management**: Automated status tracking (ongoing, overdue)

### Student Features
- **Assignment Dashboard**: View all assignments with filtering options
- **Submission System**: Submit text responses and file uploads
- **Multiple Submissions**: Update submissions before deadline
- **Grade Tracking**: View grades and professor feedback

### Grading System (Professors)
- **Grade Submissions**: Assign points and provide detailed feedback
- **Grade Management**: Update grades and feedback
- **Submission Review**: View all student submissions with timestamps

### Q&A System
- **AI Assistant Integration**: Students can ask questions about assignments
- **LLM Integration**: Ready for local LLM integration (Ollama, etc.)
- **Question Logging**: Track all Q&A interactions

### File Management
- **Secure Upload**: Validated file uploads with size and type restrictions
- **File Download**: Secure file access with signed URLs
- **Storage Management**: Organized file storage in Supabase buckets

### Security & Compliance
- **Row Level Security**: Database-level security policies
- **File Validation**: Prevent malicious file uploads
- **Role-based Access**: Strict permission controls
- **Data Encryption**: Secure data transmission and storage

## Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Authentication, Storage)
- **Icons**: Lucide React
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom design system

## Getting Started

### Prerequisites
- Node.js 18+ 
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone [repository-url]
   cd assignment-management-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new Supabase project
   - Copy the project URL and anon key
   - Create a `.env` file based on `.env.example`

4. **Configure Database**
   - Run the SQL migration in `supabase/migrations/create_schema.sql`
   - This will create all necessary tables, policies, and storage buckets

5. **Start development server**
   ```bash
   npm run dev
   ```

### Database Setup

The application requires the following Supabase setup:

1. **Run Migration**: Execute the SQL file in Supabase SQL editor
2. **Storage Buckets**: Two buckets will be created automatically:
   - `assignment-files`: For assignment attachments
   - `submission-files`: For student submissions
3. **RLS Policies**: Row Level Security is automatically configured

## Usage Guide

### For Professors
1. **Register** with professor role
2. **Create Assignments** with descriptions, due dates, and attachments
3. **View Submissions** from students
4. **Grade Assignments** with points and feedback
5. **Track Student Progress** through the grading dashboard

### For Students
1. **Register** with student role
2. **Browse Assignments** with filtering options
3. **Submit Work** through text or file uploads
4. **Ask Questions** using the AI assistant
5. **View Grades** and feedback from professors

## LLM Integration

The system is designed for easy LLM integration:

1. **API Endpoint**: Create an endpoint for your LLM service
2. **Update Q&A Handler**: Modify `components/assignments/AssignmentDetails.tsx`
3. **Configure Prompt**: Customize the LLM prompt for assignment-specific responses

Example integration points:
- Local Ollama server
- OpenAI API
- Custom LLM deployment

## File Upload Configuration

**Supported File Types**:
- Documents: PDF, Word (.doc, .docx), Text files
- Images: JPG, PNG, GIF
- Archives: ZIP files

**Security Features**:
- File type validation
- File size limits (10MB per file)
- Virus scanning ready
- Secure signed URLs for downloads

## Database Schema

**Core Tables**:
- `users`: User profiles and roles
- `assignments`: Assignment details
- `submissions`: Student submissions
- `grades`: Grading and feedback
- `assignment_files`: File attachments
- `submission_files`: Submission files
- `qa_logs`: Q&A interaction logs

## Security Features

- **Authentication**: Supabase Auth with email/password
- **Authorization**: Role-based access control
- **File Security**: Validated uploads, secure storage
- **Data Protection**: RLS policies, encrypted transmission
- **Input Validation**: XSS and injection prevention

## Development

### Code Structure
```
src/
├── components/          # React components
│   ├── auth/           # Authentication components
│   ├── assignments/    # Assignment management
│   ├── submissions/    # Submission handling
│   ├── grading/        # Grading interface
│   ├── grades/         # Grade display
│   ├── layout/         # Layout components
│   └── ui/             # Reusable UI components
├── contexts/           # React contexts
├── hooks/              # Custom hooks
├── lib/                # Utilities and config
├── types/              # TypeScript type definitions
└── utils/              # Helper functions
```

### Key Features
- **Responsive Design**: Mobile-first approach
- **Type Safety**: Full TypeScript coverage
- **Component Architecture**: Modular, reusable components
- **State Management**: React Context for global state
- **Error Handling**: Comprehensive error boundaries

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check the GitHub Issues
2. Review the documentation
3. Contact the development team

---

**Note**: This system is production-ready but should be reviewed for specific institutional requirements and compliance needs.