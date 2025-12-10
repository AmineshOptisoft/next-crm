# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/crm-database?retryWrites=true&w=majority

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Application URL (for production, use your Vercel domain)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email Configuration (if using nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@yourapp.com

# NextAuth (if using)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key

# Optional: Node Environment
NODE_ENV=development
